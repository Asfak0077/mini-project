import React from 'react'
import { Complaint } from '../../types/domain'
import { BarChartCard, DonutChartCard, CHART_COLORS } from '../ds/Charts'

interface AnalyticsChartsProps {
  complaints: Complaint[]
}

const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ complaints }) => {
  const byDepartment = Object.values(
    complaints.reduce<Record<string, { department: string; count: number }>>((acc, item) => {
      acc[item.department] = acc[item.department] ?? { department: item.department, count: 0 }
      acc[item.department].count += 1
      return acc
    }, {})
  )

  const byStatus = Object.values(
    complaints.reduce<Record<string, { name: string; value: number }>>((acc, item) => {
      acc[item.status] = acc[item.status] ?? { name: item.status, value: 0 }
      acc[item.status].value += 1
      return acc
    }, {})
  )

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <BarChartCard
        title="Department Workload"
        subtitle="Grievance distribution per branch"
        data={byDepartment}
        xKey="department"
        bars={[{ key: 'count', color: CHART_COLORS.blue, name: 'Complaints' }]}
      />
      
      <DonutChartCard
        title="Status Breakdown"
        subtitle="Resolution lifecycle stages"
        data={byStatus}
        dataKey="value"
        nameKey="name"
      />
    </section>
  )
}

export default AnalyticsCharts
