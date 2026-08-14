import React from 'react'
import { useThemeStore } from '../../store/themeStore'

const AmbientBackground: React.FC = () => {
  const isDarkMode = useThemeStore((state) => state.isDarkMode)

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {/* Light Mode Soft Radial Lighting */}
      {!isDarkMode && (
        <>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `
                radial-gradient(circle at 10% 0%, rgba(37,99,235,0.025), transparent 28%),
                radial-gradient(circle at 90% 10%, rgba(16,185,129,0.025), transparent 28%),
                radial-gradient(circle at 50% 80%, rgba(77,124,95,0.02), transparent 35%)
              `,
            }}
          />
        </>
      )}

      {/* Dark Mode Subtle Ambient Glow */}
      {isDarkMode && (
        <>
          <div
            style={{
              position: 'absolute',
              top: '-10%',
              left: '5%',
              width: '45vw',
              height: '45vw',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.06) 0%, transparent 60%)',
              filter: 'blur(90px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '30%',
              right: '5%',
              width: '40vw',
              height: '40vw',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(52, 211, 153, 0.05) 0%, transparent 60%)',
              filter: 'blur(90px)',
            }}
          />
        </>
      )}
    </div>
  )
}

export default AmbientBackground
