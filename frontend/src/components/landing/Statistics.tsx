import { motion } from 'framer-motion'
import CountUp from 'react-countup'
import { Users, FileText, CheckCircle2, Building2, GraduationCap, Clock } from 'lucide-react'
import { Card } from '../ui/Card'

const STATS_DATA = [
  { label: 'Total Students', value: 2500, suffix: '+', icon: Users, color: 'text-blue-600 dark:text-blue-400' },
  { label: 'Complaints Submitted', value: 1250, suffix: '+', icon: FileText, color: 'text-cyan-600 dark:text-cyan-400' },
  { label: 'Resolution Rate', value: 98, suffix: '%', icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400' },
  { label: 'Departments', value: 12, suffix: '', icon: Building2, color: 'text-purple-600 dark:text-purple-400' },
  { label: 'Faculty Members', value: 150, suffix: '+', icon: GraduationCap, color: 'text-amber-600 dark:text-amber-400' },
  { label: 'Average Resolution Time', isText: true, textValue: '< 24h', icon: Clock, color: 'text-rose-600 dark:text-rose-400' }
]

const Statistics = () => {
  return (
    <section className="py-12 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
          {STATS_DATA.map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
              >
                <Card hoverEffect={true} className="p-5 text-center flex flex-col items-center justify-between h-full">
                  <div className="p-2.5 rounded-2xl bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/20 mb-3">
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  
                  <div className={`text-2xl sm:text-3xl font-black tracking-tight ${stat.color} mb-1 font-mono`}>
                    {stat.isText ? (
                      stat.textValue
                    ) : (
                      <>
                        <CountUp end={stat.value || 0} duration={2.5} enableScrollSpy scrollSpyOnce />
                        <span>{stat.suffix}</span>
                      </>
                    )}
                  </div>

                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    {stat.label}
                  </p>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default Statistics
