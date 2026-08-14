import { motion } from 'framer-motion'
import {
  FileText,
  Activity,
  GitPullRequest,
  ShieldCheck,
  MessageSquare,
  BarChart3,
  ArrowRight
} from 'lucide-react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

const FEATURES = [
  {
    title: 'Complaint Management',
    description: 'Structured complaint submission with auto-category classification, multi-file attachments, and priority tagging.',
    icon: FileText,
    color: 'from-blue-600 to-cyan-500',
    iconColor: 'text-blue-500'
  },
  {
    title: 'Real-Time Tracking',
    description: 'Instant status timeline updates (Submitted, Assigned, In Progress, Resolved, Escalated) via live WebSockets.',
    icon: Activity,
    color: 'from-cyan-500 to-sky-500',
    iconColor: 'text-cyan-500'
  },
  {
    title: 'Department Assignment',
    description: 'Smart automated routing to specific CSE, ECE, MECH, EEE, AIDS, and IT faculty members based on complaint category.',
    icon: GitPullRequest,
    color: 'from-emerald-500 to-teal-500',
    iconColor: 'text-emerald-500'
  },
  {
    title: 'Secure Authentication',
    description: 'Enterprise security powered by JWT RS256 token rotation, password hashing, and Google Identity OAuth 2.0.',
    icon: ShieldCheck,
    color: 'from-purple-500 to-indigo-500',
    iconColor: 'text-purple-500'
  },
  {
    title: 'Feedback System',
    description: 'Star ratings and qualitative feedback collection post-resolution to continuously monitor service quality.',
    icon: MessageSquare,
    color: 'from-amber-500 to-orange-500',
    iconColor: 'text-amber-500'
  },
  {
    title: 'Analytics Dashboard',
    description: 'Comprehensive administrative metrics, SLA tracking graphs, sentiment analysis, and workload breakdown.',
    icon: BarChart3,
    color: 'from-rose-500 to-pink-500',
    iconColor: 'text-rose-500'
  }
]

const Features = () => {
  return (
    <section id="features" className="py-16 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <Badge variant="primary" icon={<Activity className="w-3.5 h-3.5 text-blue-500" />}>
            Core Capabilities
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Built For Seamless Campus Operations
          </h2>
          <p className="text-sm sm:text-base font-semibold text-slate-500 dark:text-slate-400">
            Engineered to replace manual physical paperwork with an automated, transparent, and responsive digital ecosystem.
          </p>
        </div>

        {/* 6 Feature Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
              >
                <Card hoverEffect={true} className="flex flex-col justify-between h-full group">
                  <div className="space-y-4">
                    {/* Large Colorful Icon Container */}
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white shadow-lg shadow-blue-500/10 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                      <Icon className="w-7 h-7" />
                    </div>

                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                      {feature.title}
                    </h3>

                    <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-200/60 dark:border-slate-800/60">
                    <Button variant="ghost" size="sm" icon={<ArrowRight className="w-4 h-4 text-blue-500 group-hover:translate-x-1 transition-transform" />}>
                      Learn More
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>

      </div>
    </section>
  )
}

export default Features
