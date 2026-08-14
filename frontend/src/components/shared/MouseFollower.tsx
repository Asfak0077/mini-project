import React, { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion'

const MouseFollower = () => {
    const [isVisible, setIsVisible] = useState(false)
    const [isHovering, setIsHovering] = useState(false)
    const [isPressed, setIsPressed] = useState(false)

    // Core coordinates
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)

    // Spring physics for Core (Sharp)
    const coreXSpring = useSpring(mouseX, { damping: 25, stiffness: 400 })
    const coreYSpring = useSpring(mouseY, { damping: 25, stiffness: 400 })

    // Spring physics for Aura/Reticle (Fluid trail)
    const auraXSpring = useSpring(mouseX, { damping: 40, stiffness: 200 })
    const auraYSpring = useSpring(mouseY, { damping: 40, stiffness: 200 })

    useEffect(() => {
        let currentHovering = false
        const handleMouseMove = (e: MouseEvent) => {
            mouseX.set(e.clientX)
            mouseY.set(e.clientY)
            setIsVisible(true)

            // Detect hover on interactive elements only when changed
            const target = e.target as HTMLElement
            const isClickable = !!target.closest('button, a, .clickable, input, select, textarea, [role="button"]')
            if (isClickable !== currentHovering) {
                currentHovering = isClickable
                setIsHovering(isClickable)
            }
        }

        const handleMouseDown = () => setIsPressed(true)
        const handleMouseUp = () => setIsPressed(false)
        const handleMouseLeave = () => setIsVisible(false)

        window.addEventListener('mousemove', handleMouseMove, { passive: true })
        window.addEventListener('mousedown', handleMouseDown, { passive: true })
        window.addEventListener('mouseup', handleMouseUp, { passive: true })
        document.addEventListener('mouseleave', handleMouseLeave, { passive: true })

        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mousedown', handleMouseDown)
            window.removeEventListener('mouseup', handleMouseUp)
            document.removeEventListener('mouseleave', handleMouseLeave)
        }
    }, [mouseX, mouseY])

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
                    {/* Parallax Aura / Secondary Glow */}
                    <motion.div
                        className="absolute left-0 top-0 h-16 w-16 -ml-8 -mt-8 rounded-full bg-indigo-500/[0.03] blur-2xl"
                        style={{
                            x: auraXSpring,
                            y: auraYSpring,
                            scale: isHovering ? 2 : 1,
                        }}
                    />

                    {/* Tactical Ring / Reticle */}
                    <motion.div
                        className="absolute left-0 top-0 h-10 w-10 -ml-5 -mt-5 rounded-full border border-indigo-500/20 backdrop-blur-[1px]"
                        style={{
                            x: auraXSpring,
                            y: auraYSpring,
                            scale: isHovering ? 1.5 : isPressed ? 0.8 : 1,
                        }}
                        transition={{
                            scale: { type: 'spring', damping: 20, stiffness: 300 }
                        }}
                    >
                        {/* Rotating Inset segments */}
                        <motion.div
                            className="absolute inset-0 border-t border-indigo-500/60 rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        />
                        <motion.div
                            className="absolute inset-1 border-b border-indigo-400/30 rounded-full"
                            animate={{ rotate: -360 }}
                            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                        />
                    </motion.div>

                    {/* Precision Core Dot */}
                    <motion.div
                        className="absolute left-0 top-0 h-1.5 w-1.5 -ml-[3px] -mt-[3px] rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.9)]"
                        style={{
                            x: coreXSpring,
                            y: coreYSpring,
                            scale: isHovering ? 0.4 : isPressed ? 2 : 1,
                        }}
                    >
                        {/* Core Glow Pulse */}
                        <motion.div
                            animate={{ scale: [1, 2, 1], opacity: [0.2, 0.4, 0.2] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute inset-[-6px] rounded-full bg-indigo-500 blur-md -z-10"
                        />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

export default React.memo(MouseFollower)
