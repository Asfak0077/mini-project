/**
 * CampusResolve Voice AI Agent — Complaint Extraction Service
 * Parses spoken grievances, extracts entities, and identifies missing fields.
 */

import { StructuredComplaint } from '../chatbotService'

export class ComplaintExtractionService {
  private static readonly KNOWN_LOCATIONS = [
    'Seminar Hall', 'Computer Lab 3', 'Computer Lab 1', 'Computer Lab 2',
    'Hostel Block B', 'Hostel Block A', 'Hostel Mess', 'Central Library',
    'Mechanical Workshop', 'Auditorium', 'Canteen', 'First Floor', 'Second Floor'
  ]

  public static extractFromVoice(text: string, currentDraft: StructuredComplaint | null = null): {
    draft: StructuredComplaint
    missingField: 'location' | 'description' | null
  } {
    const raw = text.trim()
    const lower = raw.toLowerCase()

    let category = currentDraft?.category || 'Infrastructure'
    if (/exam|marks|attendance|grade|syllabus|faculty|class/i.test(lower)) {
      category = 'Academic'
    } else if (/hostel|room|mess|geyser|bed|warden/i.test(lower)) {
      category = 'Hostel'
    } else if (/bus|route|transport|driver/i.test(lower)) {
      category = 'Transport'
    }

    let priority: 'low' | 'medium' | 'high' | 'Urgent' = currentDraft?.priority || 'medium'
    if (/urgent|emergency|fire|leak|sparking|danger/i.test(lower)) {
      priority = 'Urgent'
    } else if (/not working|broken|flickering|delay/i.test(lower)) {
      priority = 'medium'
    }

    // Extract location
    let location = currentDraft?.location || ''
    for (const loc of this.KNOWN_LOCATIONS) {
      if (lower.includes(loc.toLowerCase())) {
        location = loc
        break
      }
    }

    // If user explicitly stated room/lab/block
    if (!location) {
      const roomMatch = raw.match(/(?:room|lab|block|hall|ground|floor)\s+[A-Za-z0-9]+/i)
      if (roomMatch) {
        location = roomMatch[0]
      }
    }

    const title = currentDraft?.title || (raw.length > 50 ? `${raw.slice(0, 47)}...` : raw)
    const description = currentDraft?.description ? `${currentDraft.description} ${raw}` : raw

    const isComplete = Boolean(location && description.length >= 5)

    return {
      draft: {
        title,
        category,
        department: currentDraft?.department || 'CSE',
        location,
        priority,
        description,
        isComplete
      },
      missingField: !location ? 'location' : null
    }
  }
}
