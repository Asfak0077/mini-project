/******** Tailwind Config — CampusResolve Premium Minimalist Theme ********/
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#F4F5F7',
          content: '#F8F9FB',
          surface: '#FFFFFF',
          text: {
            primary: '#111827',
            secondary: '#64748B',
            muted: '#94A3B8',
          },
          accent: {
            DEFAULT: '#2563EB',
            light: '#EFF6FF',
          },
          border: 'rgba(15,23,42,0.08)',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          dark: {
            primary: '#080D18',
            content: '#0F172A',
            surface: '#111827',
            border: '#1E293B',
            text: '#F8FAFC',
            accent: '#60A5FA',
          }
        }
      },
      fontFamily: {
        display: ['"Inter"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 8px 30px rgba(15,23,42,0.04)',
        'soft-hover': '0 12px 40px rgba(15,23,42,0.08)',
        'modal': '0 24px 80px rgba(15,23,42,0.18)',
        'accent': '0 8px 20px rgba(37,99,235,0.16)',
      },
      animation: {
        'slide-up': 'slideUp 0.22s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        }
      },
    }
  },
  plugins: []
}
