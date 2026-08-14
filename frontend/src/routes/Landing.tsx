import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Hero from '../components/landing/Hero'
import Statistics from '../components/landing/Statistics'
import Features from '../components/landing/Features'
import { HowItWorks, WhyChooseUs, FAQ } from '../components/landing/AdditionalSections'
import { useAuthStore } from '../store/authStore'
import ThemeToggle from '../components/shared/ThemeToggle'
import AmbientBackground from '../components/shared/AmbientBackground'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ArrowRight, LogIn } from 'lucide-react'

const LandingPage = () => {
  const role = useAuthStore((state) => state.role)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return (
    <div className="min-h-screen relative bg-[var(--background)] text-[var(--text-primary)] overflow-x-hidden font-sans transition-colors duration-300">
      
      {/* Global Background Ambient Animation */}
      <AmbientBackground />

      {/* Top Header / Actions Bar */}
      <header className="relative z-50 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md ring-1 ring-white/20 bg-gradient-to-br from-blue-600 to-indigo-600">
            CR
          </div>
          <span className="text-lg font-black text-[var(--text-primary)] tracking-tighter">
            CampusResolve
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/login">
            <Button size="sm" icon={<LogIn className="w-4 h-4" />}>
              Portal Login
            </Button>
          </Link>
        </div>
      </header>

      {/* 3. Professional Page Flow:
          Hero Section
          ↓
          Statistics Section
          ↓
          Core Features
          ↓
          How It Works
          ↓
          Why Choose CampusResolve (Workflow & Benefits)
          ↓
          Platform Screenshots Preview
          ↓
          Testimonials
          ↓
          FAQ
          ↓
          Footer
      */}
      <main className="relative z-10 space-y-4">
        
        {/* 1. Hero Section */}
        <Hero />

        {/* 2. Statistics Section */}
        <Statistics />

        {/* 3. Core Features */}
        <Features />

        {/* 4. How It Works */}
        <HowItWorks />

        {/* 5. Why Choose CampusResolve & Workflow & Benefits */}
        <WhyChooseUs />

        {/* Call to Action Banner */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card hoverEffect={false} className="p-8 sm:p-10 text-center bg-gradient-to-br from-blue-600 via-sky-600 to-cyan-600 text-white shadow-2xl overflow-hidden relative border-none">
              <div className="relative z-10 space-y-4 max-w-xl mx-auto">
                <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {isAuthenticated ? 'Ready To Continue Your Session?' : 'Ready To Experience CampusResolve?'}
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-blue-100 leading-relaxed">
                  Log in using your registered credentials to access instant complaint lodging, real-time tracking, and faculty responses.
                </p>
                <div className="pt-2">
                  <Link to={role === 'admin' ? '/admin' : role === 'teacher' ? '/teacher' : role === 'student' ? '/student' : '/login'}>
                    <Button variant="secondary" size="lg" icon={<ArrowRight className="w-5 h-5 text-blue-600" />}>
                      {isAuthenticated ? 'Go To Dashboard' : 'Launch Portal Now'}
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </motion.div>
        </section>

        {/* Frequently Asked Questions */}
        <FAQ />
      </main>
    </div>
  )
}

export default LandingPage
