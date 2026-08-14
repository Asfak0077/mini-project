import { motion } from 'framer-motion'
import { Quote, Star, MessageSquare } from 'lucide-react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { UserAvatar } from '../ui/Avatar'

const TESTIMONIALS = [
  {
    quote: 'Complaint tracking and issue resolution became 10x faster. We can track our ticket progress in real-time without visiting office desks.',
    author: 'Karthik Raja',
    role: 'CSE Student Assembly Lead',
    rating: 5
  },
  {
    quote: 'The automated department routing and escalation SLA system improved faculty response times significantly. Transparent feedback for everyone.',
    author: 'Dr. Rajesh Kumar',
    role: 'Faculty Coordination Head',
    rating: 5
  }
]

const Testimonials = () => {
  return (
    <section className="py-16 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <Badge variant="primary" icon={<MessageSquare className="w-3.5 h-3.5 text-blue-500" />}>
            Community Endorsements
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Campus Voices & Impact
          </h2>
          <p className="text-sm sm:text-base font-semibold text-slate-500 dark:text-slate-400">
            Trusted by CampusResolve students, faculty, and campus administrators.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {TESTIMONIALS.map((item, index) => (
            <motion.div
              key={item.author}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
            >
              <Card hoverEffect={true} className="p-8 relative flex flex-col justify-between h-full group">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(item.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400" />
                      ))}
                    </div>
                    <Quote className="w-8 h-8 text-blue-500/20 group-hover:text-blue-500/40 transition-colors" />
                  </div>

                  <p className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200 leading-relaxed italic">
                    &ldquo;{item.quote}&rdquo;
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center gap-4">
                  <UserAvatar name={item.author} size="md" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {item.author}
                    </h4>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {item.role}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Testimonials
