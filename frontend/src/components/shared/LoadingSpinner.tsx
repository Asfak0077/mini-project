// Shared — LoadingSpinner (instant render, no fade-in delay)
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="h-12 w-12 rounded-2xl bg-[var(--primary)] flex items-center justify-center text-white font-bold text-lg shadow-lg">
          CR
        </div>
        <div className="absolute inset-0 rounded-2xl border-2 border-[var(--primary)]/30 animate-ping" />
      </div>
      <div className="space-y-1 text-center">
        <p className="text-sm font-semibold text-[var(--text-primary)]">CampusResolve</p>
        <div className="flex items-center gap-1 justify-center">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse"
              style={{ animationDelay: `${i * 0.1}s`, animationDuration: '0.6s' }}
            />
          ))}
        </div>
      </div>
    </div>
  </div>
)

export default LoadingSpinner
