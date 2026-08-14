import { Link } from 'react-router-dom'
import AppShell from '../components/ds/AppShell'
import ComplaintHistory from '../components/student/ComplaintHistory'
import { FilePlus } from 'lucide-react'
import { Button } from '../components/ui/Button'

const ComplaintHistoryPage = () => {
  return (
    <AppShell>
      <div className="space-y-5 pb-8">
        {/* Page Header with Action Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-[800] text-[var(--text-primary)] tracking-tight">
              Complaint History
            </h1>
            <p className="text-[13.5px] text-[var(--text-secondary)] mt-1 font-medium">
              Monitor real-time progress, lifecycle timelines, and administrative remarks.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>SLA Engine Active</span>
            </div>

            <Link to="/student">
              <Button
                variant="primary"
                size="md"
                icon={<FilePlus className="w-4 h-4" />}
                className="shadow-sm"
              >
                Lodge Grievance
              </Button>
            </Link>
          </div>
        </div>

        {/* Complaint History Content */}
        <ComplaintHistory />
      </div>
    </AppShell>
  )
}

export default ComplaintHistoryPage
