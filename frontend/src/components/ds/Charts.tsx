// Design System — Enterprise Charts (Recharts Wrappers)
import React from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

/* ── Colors ─────────────────────────────────────────────────── */
export const CHART_COLORS = {
  blue: '#2563EB',
  indigo: '#4F46E5',
  emerald: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444',
  cyan: '#06B6D4',
  violet: '#8B5CF6',
  slate: '#64748B'
}

export const PIE_COLORS = [
  CHART_COLORS.blue,
  CHART_COLORS.emerald,
  CHART_COLORS.amber,
  CHART_COLORS.red,
  CHART_COLORS.violet,
  CHART_COLORS.cyan
]

/* ── Tooltip Style ───────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] p-3 rounded-xl shadow-lg">
        <p className="text-[var(--text-heading)] font-semibold text-sm mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-2 text-sm">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-[var(--text-muted)] capitalize">{entry.name}:</span>
            <span className="text-[var(--text-heading)] font-semibold">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

/* ── Area Chart Card ─────────────────────────────────────────── */
interface ChartProps {
  data: any[]
  title?: string
  subtitle?: string
  height?: number
  className?: string
}

interface AreaChartCardProps extends ChartProps {
  xKey: string
  areas: { key: string; color: string; name?: string }[]
}

export const AreaChartCard: React.FC<AreaChartCardProps> = ({ data, title, subtitle, height = 300, className = '', xKey, areas }) => {
  return (
    <div className={`bg-[var(--card)] border border-[var(--border)] rounded-[24px] p-6 shadow-lg hover:shadow-xl transition-shadow ${className}`}>
      {(title || subtitle) && (
        <div className="mb-6">
          {title && <h3 className="text-lg font-bold text-[var(--text-heading)]">{title}</h3>}
          {subtitle && <p className="text-sm text-[var(--text-muted)]">{subtitle}</p>}
        </div>
      )}
      <div style={{ height, width: '100%' }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              {areas.map((area) => (
                <linearGradient key={area.key} id={`color${area.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={area.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={area.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--divider)" />
            <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '4 4' }} />
            {areas.map((area) => (
              <Area 
                key={area.key}
                type="monotone" 
                dataKey={area.key} 
                name={area.name || area.key}
                stroke={area.color} 
                strokeWidth={3}
                fillOpacity={1} 
                fill={`url(#color${area.key})`} 
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* ── Bar Chart Card ──────────────────────────────────────────── */
interface BarChartCardProps extends ChartProps {
  xKey: string
  bars: { key: string; color: string; name?: string }[]
}

export const BarChartCard: React.FC<BarChartCardProps> = ({ data, title, subtitle, height = 300, className = '', xKey, bars }) => {
  return (
    <div className={`bg-[var(--card)] border border-[var(--border)] rounded-[24px] p-6 shadow-lg hover:shadow-xl transition-shadow ${className}`}>
      {(title || subtitle) && (
        <div className="mb-6">
          {title && <h3 className="text-lg font-bold text-[var(--text-heading)]">{title}</h3>}
          {subtitle && <p className="text-sm text-[var(--text-muted)]">{subtitle}</p>}
        </div>
      )}
      <div style={{ height, width: '100%' }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--divider)" />
            <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface-secondary)', opacity: 0.5 }} />
            <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
            {bars.map((bar) => (
              <Bar 
                key={bar.key} 
                dataKey={bar.key} 
                name={bar.name || bar.key}
                fill={bar.color} 
                radius={[4, 4, 0, 0]} 
                maxBarSize={50}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* ── Donut Chart Card ────────────────────────────────────────── */
interface DonutChartCardProps extends ChartProps {
  dataKey: string
  nameKey: string
}

export const DonutChartCard: React.FC<DonutChartCardProps> = ({ data, title, subtitle, height = 300, className = '', dataKey, nameKey }) => {
  return (
    <div className={`bg-[var(--card)] border border-[var(--border)] rounded-[24px] p-6 shadow-lg hover:shadow-xl transition-shadow flex flex-col ${className}`}>
      {(title || subtitle) && (
        <div className="mb-2">
          {title && <h3 className="text-lg font-bold text-[var(--text-heading)]">{title}</h3>}
          {subtitle && <p className="text-sm text-[var(--text-muted)]">{subtitle}</p>}
        </div>
      )}
      <div className="flex-1 min-h-[250px]" style={{ height, width: '100%' }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={110}
              paddingAngle={2}
              dataKey={dataKey}
              nameKey={nameKey}
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* ── Line Chart Card ─────────────────────────────────────────── */
interface LineChartCardProps extends ChartProps {
  xKey: string
  lines: { key: string; color: string; name?: string }[]
}

export const LineChartCard: React.FC<LineChartCardProps> = ({ data, title, subtitle, height = 300, className = '', xKey, lines }) => {
  return (
    <div className={`bg-[var(--card)] border border-[var(--border)] rounded-[24px] p-6 shadow-lg hover:shadow-xl transition-shadow ${className}`}>
      {(title || subtitle) && (
        <div className="mb-6">
          {title && <h3 className="text-lg font-bold text-[var(--text-heading)]">{title}</h3>}
          {subtitle && <p className="text-sm text-[var(--text-muted)]">{subtitle}</p>}
        </div>
      )}
      <div style={{ height, width: '100%' }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--divider)" />
            <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
            {lines.map((line) => (
              <Line 
                key={line.key}
                type="monotone" 
                dataKey={line.key} 
                name={line.name || line.key}
                stroke={line.color} 
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
