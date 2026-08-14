/** Enterprise micro-interaction timings — max 500ms, pages render instantly */
export const MOTION = {
  button: { duration: 0.15, ease: 'easeOut' as const },
  card: { duration: 0.2, ease: 'easeOut' as const },
  hover: { duration: 0.15, ease: 'easeOut' as const },
  modal: { duration: 0.2, ease: 'easeOut' as const },
  dropdown: { duration: 0.15, ease: 'easeOut' as const },
  page: { duration: 0.25, ease: 'easeOut' as const },
} as const

export const hoverLift = { y: -2, transition: MOTION.hover }
