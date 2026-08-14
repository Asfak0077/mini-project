import { motion } from 'framer-motion'

const About = () => {
  return (
    <section className="py-24 relative z-10 transition-colors duration-500">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="p-10 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-md shadow-xl dark:shadow-2xl relative overflow-hidden group transition-colors duration-500"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-slate-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:to-indigo-200 relative z-10 transition-colors duration-500">
            About CampusResolve
          </h2>
          
          <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-light relative z-10 transition-colors duration-500">
            CampusResolve is a smart campus management platform developed using the MERN Stack to digitize and modernize complaint handling and feedback systems in educational institutions.
          </p>
          
          <div className="mt-8 flex justify-center gap-4 flex-wrap relative z-10">
            {['MongoDB', 'Express.js', 'React.js', 'Node.js', 'TailwindCSS'].map((tech) => (
              <span key={tech} className="px-4 py-2 rounded-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-medium text-indigo-600 dark:text-indigo-300 backdrop-blur-sm transition-colors duration-500 hover:bg-slate-100 dark:hover:bg-white/10">
                {tech}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default About
