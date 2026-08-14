import React from 'react'

interface ChatMessageContentProps {
  content: string
  isUser?: boolean
}

/**
 * Format inline markdown tokens:
 * - **bold**
 * - *italic*
 * - `code`
 */
const formatInlineText = (text: string, isUser = false): React.ReactNode[] => {
  // Regex to split by bold (**...**), inline code (`...`), or italic (*...*)
  const tokens = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g)

  return tokens.map((token, index) => {
    if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
      return (
        <strong
          key={index}
          className={isUser ? 'font-bold text-white' : 'font-semibold text-[var(--text-primary)]'}
        >
          {token.slice(2, -2)}
        </strong>
      )
    }
    if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
      return (
        <code
          key={index}
          className={`px-1.5 py-0.5 rounded text-[12px] font-mono font-semibold ${
            isUser
              ? 'bg-white/20 text-white'
              : 'bg-[var(--surface-secondary)] text-[var(--accent)] border border-[var(--border)]'
          }`}
        >
          {token.slice(1, -1)}
        </code>
      )
    }
    if (token.startsWith('*') && token.endsWith('*') && token.length >= 2) {
      return (
        <em key={index} className="italic">
          {token.slice(1, -1)}
        </em>
      )
    }
    return <span key={index}>{token}</span>
  })
}

/**
 * Helper to render Status or Priority badges
 */
const renderStatusBadge = (status: string) => {
  const s = status.trim().toLowerCase()
  let color = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
  if (s.includes('resolved') || s.includes('closed') || s.includes('approved')) {
    color = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
  } else if (s.includes('progress') || s.includes('review') || s.includes('investigating')) {
    color = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
  } else if (s.includes('urgent') || s.includes('critical') || s.includes('escalated') || s.includes('rejected')) {
    color = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
  }

  return (
    <span
      className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full border ${color}`}
    >
      {status.trim()}
    </span>
  )
}

/**
 * Render structured complaint preview card inside chat
 */
const renderComplaintCard = (lines: string[], cardKey: number) => {
  let title = ''
  let status = ''
  let department = ''
  let assignedTo = ''
  let lastUpdated = ''
  let resolutionNotes = ''
  const extraFields: { label: string; value: string }[] = []

  lines.forEach((line) => {
    const clean = line.replace(/^[📋🏷️🏫👤📅✅⏳📌\s\-\*]+/, '').trim()
    const colonIdx = clean.indexOf(':')
    if (colonIdx > -1) {
      const rawKey = clean.slice(0, colonIdx).replace(/\*\*/g, '').trim().toLowerCase()
      const rawVal = clean.slice(colonIdx + 1).replace(/\*\*/g, '').trim()

      if (rawKey.includes('title')) title = rawVal
      else if (rawKey.includes('status')) status = rawVal
      else if (rawKey.includes('department')) department = rawVal
      else if (rawKey.includes('assigned')) assignedTo = rawVal
      else if (rawKey.includes('updated') || rawKey.includes('date')) lastUpdated = rawVal
      else if (rawKey.includes('resolution') || rawKey.includes('note')) resolutionNotes = rawVal
      else extraFields.push({ label: clean.slice(0, colonIdx).replace(/\*\*/g, '').trim(), value: rawVal })
    }
  })

  return (
    <div
      key={`complaint-card-${cardKey}`}
      className="my-2.5 p-3 sm:p-3.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] space-y-2 text-left shadow-2xs"
    >
      {/* Title & Status Badge */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-[14px] font-semibold text-[var(--text-primary)] leading-snug">
          {title || 'Complaint Details'}
        </h4>
        {status && renderStatusBadge(status)}
      </div>

      {/* Grid of Key-Values */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 pt-1 text-[13px]">
        {department && (
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
              Department
            </span>
            <span className="text-[13px] font-medium text-[var(--text-primary)]">{department}</span>
          </div>
        )}
        {assignedTo && (
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
              Assigned To
            </span>
            <span className="text-[13px] font-medium text-[var(--text-primary)]">{assignedTo}</span>
          </div>
        )}
        {lastUpdated && (
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
              Last Updated
            </span>
            <span className="text-[13px] font-medium text-[var(--text-primary)]">{lastUpdated}</span>
          </div>
        )}
        {extraFields.map((f, i) => (
          <div key={i}>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
              {f.label}
            </span>
            <span className="text-[13px] font-medium text-[var(--text-primary)]">{f.value}</span>
          </div>
        ))}
      </div>

      {/* Resolution Notes */}
      {resolutionNotes && (
        <div className="pt-1.5 border-t border-[var(--border)] text-[13px] text-[var(--text-secondary)] leading-relaxed">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-0.5">
            Resolution Notes
          </span>
          <p className="text-[13px] text-[var(--text-primary)]">{resolutionNotes}</p>
        </div>
      )}
    </div>
  )
}

export const ChatMessageContent: React.FC<ChatMessageContentProps> = ({ content, isUser = false }) => {
  if (!content) return null

  // If user message, render clean formatted text
  if (isUser) {
    const lines = content.split('\n')
    return (
      <div className="text-[13px] sm:text-[14px] font-medium leading-[1.5] space-y-1 text-white">
        {lines.map((line, idx) => (
          <p key={idx} className="break-words">
            {formatInlineText(line, true)}
          </p>
        ))}
      </div>
    )
  }

  // Check if response contains a multi-line structured complaint info block
  const rawLines = content.split('\n')
  const isComplaintBlock =
    rawLines.filter((l) => /📋|🏷️|🏫|👤|Status:|Department:|Assigned To:/i.test(l)).length >= 2

  // Parse markdown blocks (headings, lists, code blocks, cards, paragraphs)
  const elements: React.ReactNode[] = []
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null
  let complaintBuffer: string[] = []
  let inCodeBlock = false
  let codeBuffer: string[] = []

  const flushList = () => {
    if (currentList) {
      const ListTag = currentList.type
      elements.push(
        <ListTag
          key={`list-${elements.length}`}
          className={`space-y-1 my-1.5 pl-4 text-[13px] sm:text-[14px] font-normal leading-[1.6] text-[var(--text-primary)] ${
            currentList.type === 'ul' ? 'list-disc' : 'list-decimal'
          }`}
        >
          {currentList.items.map((item, idx) => (
            <li key={idx} className="break-words">
              {formatInlineText(item)}
            </li>
          ))}
        </ListTag>
      )
      currentList = null
    }
  }

  const flushComplaintBuffer = () => {
    if (complaintBuffer.length > 0) {
      elements.push(renderComplaintCard(complaintBuffer, elements.length))
      complaintBuffer = []
    }
  }

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i]
    const trimmed = line.trim()

    // Handle Code Block delimiters
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        elements.push(
          <pre
            key={`code-${elements.length}`}
            className="p-2.5 my-2 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] font-mono text-[12px] sm:text-[12.5px] text-[var(--text-primary)] overflow-x-auto"
          >
            <code>{codeBuffer.join('\n')}</code>
          </pre>
        )
        codeBuffer = []
        inCodeBlock = false
      } else {
        flushList()
        flushComplaintBuffer()
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeBuffer.push(line)
      continue
    }

    // Check if line belongs to structured complaint card
    if (
      isComplaintBlock &&
      /^[📋🏷️🏫👤📅✅⏳📌\s\-\*]*(Title|Status|Department|Assigned|Last Updated|Resolution Notes|Category)/i.test(
        trimmed
      )
    ) {
      flushList()
      complaintBuffer.push(trimmed)
      continue
    } else if (complaintBuffer.length > 0) {
      flushComplaintBuffer()
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      flushList()
      elements.push(
        <h4
          key={`h4-${elements.length}`}
          className="text-[13.5px] sm:text-[14px] font-semibold text-[var(--text-primary)] mt-2 mb-0.5 leading-snug"
        >
          {formatInlineText(trimmed.slice(4))}
        </h4>
      )
      continue
    }

    if (trimmed.startsWith('## ')) {
      flushList()
      elements.push(
        <h3
          key={`h3-${elements.length}`}
          className="text-[14.5px] sm:text-[15px] font-semibold text-[var(--text-primary)] mt-2.5 mb-1 leading-snug"
        >
          {formatInlineText(trimmed.slice(3))}
        </h3>
      )
      continue
    }

    if (trimmed.startsWith('# ')) {
      flushList()
      elements.push(
        <h2
          key={`h2-${elements.length}`}
          className="text-[15px] sm:text-[16px] font-semibold text-[var(--text-primary)] mt-2.5 mb-1 leading-tight"
        >
          {formatInlineText(trimmed.slice(2))}
        </h2>
      )
      continue
    }

    // Unordered List (- or *)
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/)
    if (bulletMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList()
        currentList = { type: 'ul', items: [] }
      }
      currentList.items.push(bulletMatch[1])
      continue
    }

    // Ordered List (1. 2. etc.)
    const numberMatch = trimmed.match(/^\d+\.\s+(.*)$/)
    if (numberMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList()
        currentList = { type: 'ol', items: [] }
      }
      currentList.items.push(numberMatch[1])
      continue
    }

    // Empty line / paragraph break
    if (!trimmed) {
      flushList()
      continue
    }

    // Standard Paragraph
    flushList()
    elements.push(
      <p
        key={`p-${elements.length}`}
        className="text-[13px] sm:text-[14px] font-normal leading-[1.6] text-[var(--text-primary)] my-1 break-words"
      >
        {formatInlineText(trimmed)}
      </p>
    )
  }

  flushList()
  flushComplaintBuffer()

  return <div className="space-y-1 break-words">{elements}</div>
}

export default ChatMessageContent
