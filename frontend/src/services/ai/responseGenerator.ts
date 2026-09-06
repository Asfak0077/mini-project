/**
 * CampusResolve Voice AI Agent — Response Generator & Voice Formatter
 * Normalizes chat responses into concise, spoken text and appends safety disclaimers.
 */

export class ResponseGenerator {
  public static readonly AI_SAFETY_DISCLAIMER =
    'AI-generated insight based on available complaint data. This is a recommendation, not a confirmed fact.'

  /**
   * Convert verbose chat markdown responses into concise, voice-friendly spoken text.
   */
  public static toSpokenText(text: string): string {
    if (!text) return "I'm here to assist you."

    let spoken = text
      // Replace markdown links with link text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove bold and italics
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      // Remove headers
      .replace(/^#{1,6}\s+/gm, '')
      // Remove emojis or special symbols
      .replace(/[\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      .trim()

    // If text contains technical tables or long bullet lists, formulate a concise voice summary
    if (spoken.includes('|') || (spoken.match(/\n/g) || []).length > 6) {
      const sentences = spoken.split(/[.!?]\s+/)
      spoken = sentences.slice(0, 3).join('. ') + '.'
    }

    return spoken
  }

  /**
   * Enforces disclaimer for any analytical or predictive AI content.
   */
  public static ensurePredictionDisclaimer(text: string): string {
    if (text.includes('recommendation, not a confirmed fact') || text.includes('not a confirmed fact')) {
      return text
    }
    return `${text}\n\n*${this.AI_SAFETY_DISCLAIMER}*`
  }
}
