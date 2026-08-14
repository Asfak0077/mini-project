import { useEffect, useRef } from 'react'
import { useThemeStore } from '../../store/themeStore'

const GalaxyBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { isDarkMode } = useThemeStore()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let particles: Array<{
      x: number
      y: number
      radius: number
      vx: number
      vy: number
      alpha: number
      life: number
    }> = []

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const initParticles = () => {
      particles = []
      // Fewer particles in light mode for a cleaner look
      const density = isDarkMode ? 10000 : 20000 
      const numParticles = Math.floor((window.innerWidth * window.innerHeight) / density)
      for (let i = 0; i < numParticles; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: isDarkMode ? (Math.random() * 1.5 + 0.5) : (Math.random() * 2 + 1),
          vx: (Math.random() - 0.5) * (isDarkMode ? 0.2 : 0.4),
          vy: (Math.random() - 0.5) * (isDarkMode ? 0.2 : 0.4),
          alpha: Math.random() * 0.5 + 0.1,
          life: Math.random()
        })
      }
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Draw background gradient based on theme
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      if (isDarkMode) {
        gradient.addColorStop(0, '#020617')   // slate-950
        gradient.addColorStop(0.5, '#0C1A3D') // deep navy
        gradient.addColorStop(1, '#040D26')   // darker navy
      } else {
        gradient.addColorStop(0, '#EFF6FF') // blue-50
        gradient.addColorStop(0.5, '#F8FAFC') // slate-50
        gradient.addColorStop(1, '#F0F9FF') // sky-50
      }
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw floating glowing blobs
      const time = Date.now() * 0.0005
      
      const drawBlob = (x: number, y: number, r: number, colorDark: string, colorLight: string) => {
        ctx.beginPath()
        const rad = ctx.createRadialGradient(x, y, 0, x, y, r)
        rad.addColorStop(0, isDarkMode ? colorDark : colorLight)
        rad.addColorStop(1, 'transparent')
        ctx.fillStyle = rad
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }

      // Animated glowing blobs - adjust colors based on theme
      // Blue blob — top left
      drawBlob(
        canvas.width * 0.2 + Math.sin(time) * 100,
        canvas.height * 0.3 + Math.cos(time * 0.8) * 100,
        440,
        'rgba(37, 99, 235, 0.18)',  // dark: royal blue
        'rgba(37, 99, 235, 0.08)'   // light: royal blue
      )

      // Cyan blob — bottom right
      drawBlob(
        canvas.width * 0.8 + Math.cos(time * 1.2) * 150,
        canvas.height * 0.7 + Math.sin(time * 0.9) * 150,
        520,
        'rgba(6, 182, 212, 0.14)',  // dark: cyan
        'rgba(6, 182, 212, 0.07)'   // light: cyan
      )

      // Emerald blob — center bottom
      drawBlob(
        canvas.width * 0.5 + Math.sin(time * 0.5) * 200,
        canvas.height * 0.8 + Math.cos(time * 0.7) * 100,
        360,
        'rgba(16, 185, 129, 0.09)',  // dark: emerald
        'rgba(16, 185, 129, 0.05)'   // light: emerald
      )

      // Draw and update particles
      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        p.life += 0.01

        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        const pulseAlpha = p.alpha + Math.sin(p.life) * 0.2

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        // In light mode, particles are subtle blue/slate dots. In dark mode, white stars.
        ctx.fillStyle = isDarkMode 
          ? `rgba(255, 255, 255, ${Math.max(0.1, pulseAlpha)})`
          : `rgba(100, 116, 139, ${Math.max(0.05, pulseAlpha * 0.5)})`
        ctx.fill()
        
        // Add glow to larger particles only in dark mode
        if (isDarkMode && p.radius > 1.2) {
          ctx.shadowBlur = 10
          ctx.shadowColor = 'rgba(255, 255, 255, 0.8)'
        } else {
          ctx.shadowBlur = 0
        }
      })
    }

    window.addEventListener('resize', () => {
      resize()
      initParticles()
      draw()
    })
    
    resize()
    initParticles()
    draw()

    return () => {
      window.removeEventListener('resize', resize)
    }
  }, [isDarkMode]) // Re-run effect when theme changes

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10 pointer-events-none transition-opacity duration-500"
    />
  )
}

export default GalaxyBackground
