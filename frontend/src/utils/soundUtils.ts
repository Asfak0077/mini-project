/**
 * Sound Utility for CampusResolve
 * Web Audio API synthesizer for startup sound effects.
 *
 * IMPORTANT: AudioContext creation requires a prior user gesture (click/keypress/etc.)
 * per browser autoplay policies. Never call this on automatic page-load events.
 */

export const playStartupSound = () => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext

    if (!AudioContextClass) return

    const ctx = new AudioContextClass()

    // If the context is suspended (no user gesture has occurred yet), silently bail out.
    // Do not call resume() without a user gesture — it will be blocked by the browser.
    if (ctx.state === 'suspended') {
      ctx.close().catch(() => {})
      return
    }

    const now = ctx.currentTime
    // Pleasant SaaS startup chord (C5, E5, G5, C6)
    const notes = [523.25, 659.25, 783.99, 1046.5]

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + i * 0.07)

      // Envelope: quick attack, smooth exponential decay
      gain.gain.setValueAtTime(0.001, now + i * 0.07)
      gain.gain.exponentialRampToValueAtTime(0.08, now + i * 0.07 + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.07 + 0.6)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now + i * 0.07)
      osc.stop(now + i * 0.07 + 0.65)
    })

    // Close the context after the chord finishes to free resources
    setTimeout(() => ctx.close().catch(() => {}), 1500)
  } catch {
    // Silently ignore — AudioContext not available or blocked by browser policy
  }
}
