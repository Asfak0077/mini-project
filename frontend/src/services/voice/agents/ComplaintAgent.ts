/**
 * CampusResolve Voice-First Multi-Turn AI Agent — Complaint Agent
 * 
 * Manages the entire CREATE_COMPLAINT multi-turn workflow:
 * - Smart Slot Filling (extracts description, location, category, priority from single utterances)
 * - Remembers previous answers during the active workflow
 * - Expected Input System (strictly maps answers to expected slot: LOCATION, DESCRIPTION, CONFIRMATION)
 * - Confirmation & cancellation handling
 * - Pause and resume capabilities
 */

import {
  ActiveWorkflow,
  ComplaintDraftData,
  ExpectedInputType,
  AgentResponse
} from '../workflowTypes'

const KNOWN_LOCATIONS = [
  'computer lab 3', 'computer lab 2', 'computer lab 1', 'computer lab',
  'lab 3', 'lab 2', 'lab 1', 'lab',
  'seminar hall', 'auditorium', 'central library', 'library', 'canteen', 'cafeteria',
  'block a', 'block b', 'block c', 'block d', 'tech block', 'mechanical block', 'civil block',
  'admin block', 'administrative block',
  'boys hostel', 'girls hostel', 'hostel block a', 'hostel block b', 'hostel mess', 'mess',
  'room 101', 'room 102', 'room 103', 'room 201', 'room 202', 'room 203', 'room 301', 'room 302',
  'first floor', 'second floor', 'third floor', 'ground floor', 'fourth floor',
  'parking', 'sports complex', 'gym', 'washroom', 'restroom'
]

const CATEGORY_MAP: Record<string, string[]> = {
  'Infrastructure': ['fan', 'light', 'tube light', 'ac', 'air conditioner', 'projector', 'bench', 'desk', 'chair', 'board', 'blackboard', 'whiteboard', 'door', 'window', 'lift', 'elevator', 'switch', 'socket'],
  'Water & Sanitation': ['water', 'tap', 'leak', 'leaking', 'toilet', 'washroom', 'flush', 'pipeline', 'drainage', 'drinking water', 'purifier', 'filter'],
  'IT & Network': ['wifi', 'wi-fi', 'internet', 'network', 'lan', 'ethernet', 'computer', 'pc', 'monitor', 'keyboard', 'mouse', 'printer', 'software'],
  'Hostel & Mess': ['hostel', 'mess', 'food', 'bed', 'mattress', 'curtain', 'warden', 'geyser', 'laundry', 'room cleaning'],
  'Academics': ['exam', 'marks', 'attendance', 'lecture', 'faculty', 'professor', 'timetable', 'class', 'syllabus', 'assignment', 'grade'],
  'Transport': ['bus', 'van', 'transport', 'driver', 'bus stop', 'route']
}

export class ComplaintAgent {
  /**
   * Start complaint creation workflow
   */
  public startComplaintWorkflow(initialUtterance?: string): AgentResponse {
    const workflowId = `wf-complaint-${Date.now()}`
    let draft: ComplaintDraftData = {
      title: null,
      description: null,
      category: 'Infrastructure',
      location: null,
      priority: 'medium'
    }

    if (initialUtterance && initialUtterance.trim()) {
      const extracted = this.extractComplaintData(initialUtterance)
      draft = { ...draft, ...extracted }
    }

    const missingFields = this.getMissingFields(draft)

    // If already has enough information (both description and location provided up-front)
    if (missingFields.length === 0) {
      return this.requestConfirmation(draft, workflowId)
    }

    // Ask for the first missing field
    const nextQ = this.askNextQuestion(missingFields, draft)

    const activeWorkflow: ActiveWorkflow = {
      id: workflowId,
      type: 'CREATE_COMPLAINT',
      status: 'COLLECTING_INFORMATION',
      currentStep: nextQ.currentStep,
      expectedInput: nextQ.expectedInput,
      collectedData: draft,
      missingFields,
      lastQuestion: nextQ.question,
      conversationContext: [
        { role: 'user', text: initialUtterance || 'Create a complaint', timestamp: Date.now() },
        { role: 'agent', text: nextQ.question, timestamp: Date.now() }
      ],
      startedAt: Date.now(),
      updatedAt: Date.now()
    }

    return {
      workflow: 'CREATE_COMPLAINT',
      workflowStatus: 'COLLECTING_INFORMATION',
      currentStep: nextQ.currentStep,
      expectedInput: nextQ.expectedInput,
      extractedData: draft,
      missingFields,
      screenResponse: nextQ.question,
      voiceResponse: nextQ.voiceQuestion,
      shouldListenAgain: true,
      requiresConfirmation: false,
      complaintDraft: draft,
      action: {
        type: 'NONE',
        payload: { activeWorkflow }
      },
      quickActions: nextQ.expectedInput === 'LOCATION'
        ? ['Computer Lab 3', 'Seminar Hall', 'Hostel Block B', 'Cancel']
        : ['The fan is not working', 'Projector flickering', 'AC not cooling', 'Cancel']
    }
  }

  /**
   * Handle subsequent user input within an active CREATE_COMPLAINT workflow
   */
  public async handleWorkflowInput(
    userInput: string,
    activeWorkflow: ActiveWorkflow
  ): Promise<AgentResponse> {
    const raw = userInput.trim()
    const lower = raw.toLowerCase()
    let draft: ComplaintDraftData = { ...(activeWorkflow.collectedData as ComplaintDraftData) }

    // ── 1. Check for Cancellation ───────────────────────────────────────────
    if (/^(cancel|stop|nevermind|never mind|abort|exit|close|don'?t do that|forget it)$/i.test(lower)) {
      return this.cancelWorkflow(activeWorkflow)
    }

    // ── 2. Check for Confirmation when Awaiting Confirmation ────────────────
    if (activeWorkflow.status === 'AWAITING_CONFIRMATION' || activeWorkflow.expectedInput === 'CONFIRMATION') {
      if (/^(yes|yeah|yep|sure|confirm|submit|create it|go ahead|proceed|do it|that'?s correct|correct|absolutely)$/i.test(lower)) {
        return this.submitComplaint(draft, activeWorkflow)
      } else if (/^(no|nope|cancel|don'?t|stop|edit|change)$/i.test(lower)) {
        if (/edit|change/i.test(lower)) {
          return {
            workflow: 'CREATE_COMPLAINT',
            workflowStatus: 'COLLECTING_INFORMATION',
            currentStep: 'EDITING',
            expectedInput: 'DESCRIPTION',
            extractedData: draft,
            missingFields: ['description'],
            screenResponse: 'What details would you like to change?',
            voiceResponse: 'What details would you like to change?',
            shouldListenAgain: true,
            requiresConfirmation: false,
            complaintDraft: draft
          }
        }
        return this.cancelWorkflow(activeWorkflow)
      }
    }

    // ── 3. Parse based on Expected Input ────────────────────────────────────
    switch (activeWorkflow.expectedInput) {
      case 'DESCRIPTION': {
        draft.description = raw
        if (!draft.title) {
          draft.title = raw.length > 50 ? raw.slice(0, 47) + '...' : raw
        }
        // Auto-detect category from description
        const detectedCat = this.detectCategory(raw)
        if (detectedCat) draft.category = detectedCat
        // Check if user also gave location in this utterance
        const loc = this.extractLocation(raw)
        if (loc) draft.location = loc
        break
      }

      case 'LOCATION': {
        // Any short or direct location answer
        const cleanLoc = this.cleanLocationAnswer(raw)
        draft.location = cleanLoc
        break
      }

      case 'CATEGORY': {
        const cat = this.detectCategory(raw)
        if (cat) draft.category = cat
        else draft.category = raw
        break
      }

      case 'PRIORITY': {
        if (/urgent|critical|emergency|high/i.test(lower)) draft.priority = 'high'
        else if (/low|minor/i.test(lower)) draft.priority = 'low'
        else draft.priority = 'medium'
        break
      }

      default: {
        // General slot filling
        const extracted = this.extractComplaintData(raw)
        draft = { ...draft, ...extracted }
        break
      }
    }

    // ── 4. Re-evaluate missing fields ───────────────────────────────────────
    const missingFields = this.getMissingFields(draft)

    // Update conversation context
    const updatedContext = [
      ...activeWorkflow.conversationContext,
      { role: 'user' as const, text: raw, timestamp: Date.now() }
    ]

    // If all required fields are collected → Prepare Review / Confirmation
    if (missingFields.length === 0) {
      return this.requestConfirmation(draft, activeWorkflow.id, updatedContext)
    }

    // Next missing field question
    const nextQ = this.askNextQuestion(missingFields, draft)
    updatedContext.push({ role: 'agent', text: nextQ.question, timestamp: Date.now() })

    const updatedWorkflow: ActiveWorkflow = {
      ...activeWorkflow,
      status: 'COLLECTING_INFORMATION',
      currentStep: nextQ.currentStep,
      expectedInput: nextQ.expectedInput,
      collectedData: draft,
      missingFields,
      lastQuestion: nextQ.question,
      conversationContext: updatedContext,
      updatedAt: Date.now()
    }

    return {
      workflow: 'CREATE_COMPLAINT',
      workflowStatus: 'COLLECTING_INFORMATION',
      currentStep: nextQ.currentStep,
      expectedInput: nextQ.expectedInput,
      extractedData: draft,
      missingFields,
      screenResponse: nextQ.question,
      voiceResponse: nextQ.voiceQuestion,
      shouldListenAgain: true,
      requiresConfirmation: false,
      complaintDraft: draft,
      action: {
        type: 'NONE',
        payload: { activeWorkflow: updatedWorkflow }
      },
      quickActions: nextQ.expectedInput === 'LOCATION'
        ? ['Computer Lab 3', 'Seminar Hall', 'Hostel Block B', 'Cancel']
        : ['Only one fan', 'Multiple fans affected', 'Cancel']
    }
  }

  /**
   * Extract slots (description, location, category, priority) from natural language
   */
  public extractComplaintData(text: string): Partial<ComplaintDraftData> {
    const lower = text.toLowerCase()
    const result: Partial<ComplaintDraftData> = {}

    // 1. Location
    const loc = this.extractLocation(text)
    if (loc) result.location = loc

    // 2. Category
    const cat = this.detectCategory(text)
    if (cat) result.category = cat

    // 3. Priority
    if (/\b(urgent|asap|emergency|critical|immediately)\b/i.test(lower)) {
      result.priority = 'high'
    } else if (/\b(low priority|not urgent|minor)\b/i.test(lower)) {
      result.priority = 'low'
    }

    // 4. Description
    const isPureCommand = /^(create a complaint|create complaint|new complaint|report an issue|file a complaint|register complaint|lodge a complaint|i want to report a problem|help me create a complaint|a complaint|complaint|issue|problem)$/i.test(text.trim())
    if (isPureCommand) {
      return result
    }

    let desc = text
      .replace(/^(please|can you|help me|i want to|i need to|create a complaint about|lodge a complaint for|report an issue with|report a problem with|report a|report an|report)\s+/i, '')
      .trim()
    if (desc && !/^(a complaint|complaint|an issue|issue|problem)$/i.test(desc)) {
      result.description = desc
      result.title = desc.length > 50 ? desc.slice(0, 47) + '...' : desc
    }

    return result
  }

  /**
   * Determine missing mandatory fields
   */
  public getMissingFields(data: ComplaintDraftData): string[] {
    const missing: string[] = []
    if (!data.description || data.description.trim().length < 3) {
      missing.push('description')
    }
    if (!data.location || data.location.trim().length < 2) {
      missing.push('location')
    }
    return missing
  }

  /**
   * Generate next question for missing field
   */
  public askNextQuestion(
    missingFields: string[],
    draft: ComplaintDraftData
  ): { question: string; voiceQuestion: string; expectedInput: ExpectedInputType; currentStep: string } {
    const nextField = missingFields[0]

    if (nextField === 'description') {
      return {
        question: 'Sure. Please tell me what the problem is.',
        voiceQuestion: 'Sure. Please tell me what the problem is.',
        expectedInput: 'DESCRIPTION',
        currentStep: 'AWAITING_DESCRIPTION'
      }
    }

    if (nextField === 'location') {
      let subject = draft.description ? draft.description.replace(/^(the|a|an)\s+/i, '') : 'issue'
      subject = subject.replace(/\s+(is|are)?\s*(not working|broken|flickering|leaking|damaged|faulty|jammed).*$/i, '').trim()
      if (!subject) subject = 'issue'
      const voiceQ = `Got it. Where is the ${subject} located?`
      return {
        question: `Where is the **${subject}** located? (e.g. Computer Lab 3, Seminar Hall)`,
        voiceQuestion: voiceQ,
        expectedInput: 'LOCATION',
        currentStep: 'AWAITING_LOCATION'
      }
    }

    return {
      question: 'Is there any other detail you would like to add?',
      voiceQuestion: 'Is there any other detail you would like to add?',
      expectedInput: 'GENERAL',
      currentStep: 'AWAITING_OPTIONAL_DETAILS'
    }
  }

  /**
   * Prepare confirmation prompt when all mandatory details are ready
   */
  public requestConfirmation(
    draft: ComplaintDraftData,
    workflowId: string,
    existingContext: Array<{ role: 'user' | 'agent'; text: string; timestamp: number }> = []
  ): AgentResponse {
    const desc = draft.description || 'Reported issue'
    const loc = draft.location || 'Campus premises'
    const cat = draft.category || 'Infrastructure'

    const voicePrompt = `I have prepared a complaint about ${desc} in ${loc}. The category is ${cat}. Would you like me to submit it?`
    const screenPrompt = `### 📋 Complaint Review\n- **Issue:** ${desc}\n- **Location:** ${loc}\n- **Category:** ${cat}\n- **Priority:** ${draft.priority || 'Medium'}\n\nWould you like me to submit this complaint?`

    const activeWorkflow: ActiveWorkflow = {
      id: workflowId,
      type: 'CREATE_COMPLAINT',
      status: 'AWAITING_CONFIRMATION',
      currentStep: 'AWAITING_CONFIRMATION',
      expectedInput: 'CONFIRMATION',
      collectedData: draft,
      missingFields: [],
      lastQuestion: screenPrompt,
      conversationContext: [
        ...existingContext,
        { role: 'agent', text: screenPrompt, timestamp: Date.now() }
      ],
      startedAt: Date.now(),
      updatedAt: Date.now()
    }

    return {
      workflow: 'CREATE_COMPLAINT',
      workflowStatus: 'AWAITING_CONFIRMATION',
      currentStep: 'AWAITING_CONFIRMATION',
      expectedInput: 'CONFIRMATION',
      extractedData: draft,
      missingFields: [],
      screenResponse: screenPrompt,
      voiceResponse: voicePrompt,
      shouldListenAgain: true,
      requiresConfirmation: true,
      complaintDraft: draft,
      action: {
        type: 'NONE',
        payload: { activeWorkflow }
      },
      quickActions: ['Yes, Submit', 'Edit Details', 'Cancel']
    }
  }

  /**
   * Execute complaint creation
   */
  public submitComplaint(draft: ComplaintDraftData, activeWorkflow: ActiveWorkflow): AgentResponse {
    return {
      workflow: 'CREATE_COMPLAINT',
      workflowStatus: 'COMPLETED',
      currentStep: 'COMPLETED',
      expectedInput: null,
      extractedData: draft,
      missingFields: [],
      screenResponse: `✅ **Complaint Created Successfully!**\n\nYour complaint has been submitted. Our campus maintenance team will review it shortly.`,
      voiceResponse: `Your complaint has been submitted successfully. Is there anything else I can help you with?`,
      shouldListenAgain: true,
      requiresConfirmation: false,
      complaintDraft: draft,
      action: {
        type: 'CREATE_COMPLAINT',
        payload: draft
      },
      quickActions: ['Show my pending complaints', 'Track status', 'Done']
    }
  }

  /**
   * Cancel the workflow
   */
  public cancelWorkflow(activeWorkflow?: ActiveWorkflow): AgentResponse {
    return {
      workflow: 'CREATE_COMPLAINT',
      workflowStatus: 'CANCELLED',
      currentStep: 'CANCELLED',
      expectedInput: null,
      extractedData: {},
      missingFields: [],
      screenResponse: 'Complaint creation has been cancelled. How else can I help you?',
      voiceResponse: 'Okay, I cancelled the complaint creation. How else can I help you?',
      shouldListenAgain: true,
      requiresConfirmation: false,
      complaintDraft: null,
      action: {
        type: 'NONE',
        payload: { clearWorkflow: true }
      },
      quickActions: ['Help me create a complaint', 'Show my pending complaints', 'Campus FAQs']
    }
  }

  /**
   * Pause workflow
   */
  public pauseWorkflow(activeWorkflow: ActiveWorkflow): ActiveWorkflow {
    return {
      ...activeWorkflow,
      status: 'PAUSED',
      updatedAt: Date.now()
    }
  }

  /**
   * Resume paused workflow
   */
  public resumeWorkflow(pausedWorkflow: ActiveWorkflow): AgentResponse {
    const draft = pausedWorkflow.collectedData as ComplaintDraftData
    const missing = this.getMissingFields(draft)

    if (missing.length === 0) {
      return this.requestConfirmation(draft, pausedWorkflow.id, pausedWorkflow.conversationContext)
    }

    const nextQ = this.askNextQuestion(missing, draft)
    return {
      workflow: 'CREATE_COMPLAINT',
      workflowStatus: 'COLLECTING_INFORMATION',
      currentStep: nextQ.currentStep,
      expectedInput: nextQ.expectedInput,
      extractedData: draft,
      missingFields: missing,
      screenResponse: `Resuming your complaint. ${nextQ.question}`,
      voiceResponse: `Sure, continuing your complaint. ${nextQ.voiceQuestion}`,
      shouldListenAgain: true,
      requiresConfirmation: false,
      complaintDraft: draft,
      quickActions: ['Seminar Hall', 'Computer Lab 3', 'Cancel']
    }
  }

  // ── Helper Extraction Methods ─────────────────────────────────────────────
  private extractLocation(text: string): string | null {
    const lower = text.toLowerCase().trim()
    for (const loc of KNOWN_LOCATIONS) {
      if (lower.includes(loc)) {
        // Return title-cased or matched
        return loc.replace(/\b\w/g, c => c.toUpperCase())
      }
    }
    // Check for "in [Location]" or "at [Location]"
    const match = text.match(/\b(?:in|at|near|outside)\s+([A-Za-z0-9\s]{2,25})/i)
    if (match && match[1]) {
      const candidate = match[1].trim()
      if (!/^(the|a|my|our|this|that)$/i.test(candidate)) {
        return candidate
      }
    }
    return null
  }

  private cleanLocationAnswer(raw: string): string {
    let clean = raw.trim()
    clean = clean.replace(/^(it is in|it's in|located in|at|in|near)\s+/i, '').trim()
    clean = clean.replace(/[.!?]+$/, '')
    return clean.charAt(0).toUpperCase() + clean.slice(1)
  }

  private detectCategory(text: string): string | null {
    const lower = text.toLowerCase()
    for (const [cat, keywords] of Object.entries(CATEGORY_MAP)) {
      for (const kw of keywords) {
        if (lower.includes(kw)) {
          return cat
        }
      }
    }
    return null
  }
}

export const complaintAgent = new ComplaintAgent()
