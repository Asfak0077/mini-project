import { useMemo } from 'react'
import { Variants } from 'framer-motion'

/** Instant form visibility — no mount fade or slide delays */
const useFormAnimation = () => {
  return useMemo<Variants>(
    () => ({
      hidden: { opacity: 1, y: 0 },
      visible: { opacity: 1, y: 0, transition: { duration: 0 } }
    }),
    []
  )
}

export default useFormAnimation
