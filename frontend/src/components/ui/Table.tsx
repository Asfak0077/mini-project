import React from 'react'

export interface TableProps {
  children: React.ReactNode
  className?: string
}

export const TableContainer: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = ''
}) => (
  <div className={`rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl shadow-blue-500/5 overflow-hidden ${className}`}>
    <div className="overflow-x-auto">{children}</div>
  </div>
)

export const Table: React.FC<TableProps> = ({ children, className = '' }) => (
  <table className={`w-full text-left border-collapse ${className}`}>{children}</table>
)

export const TableHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-10">
    {children}
  </thead>
)

export const TableBody: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-sm font-semibold">{children}</tbody>
)

export const TableRow: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({
  children,
  className = '',
  onClick
}) => (
  <tr
    onClick={onClick}
    className={`hover:bg-blue-500/5 dark:hover:bg-blue-400/5 transition-colors duration-150 ${
      onClick ? 'cursor-pointer' : ''
    } ${className}`}
  >
    {children}
  </tr>
)

export const TableHead: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = ''
}) => (
  <th className={`px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ${className}`}>
    {children}
  </th>
)

export const TableCell: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = ''
}) => <td className={`px-5 py-4 text-slate-700 dark:text-slate-200 ${className}`}>{children}</td>
