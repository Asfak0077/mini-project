// Design System — Enterprise Data Table
import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, FileDown } from 'lucide-react'
import { DSInput } from './Inputs'

export interface Column<T> {
  header: string
  accessorKey?: keyof T
  cell?: (item: T) => React.ReactNode
  sortable?: boolean
  width?: string
}

interface DSTableProps<T> {
  data: T[]
  columns: Column<T>[]
  title?: string
  subtitle?: string
  searchable?: boolean
  searchPlaceholder?: string
  searchKeys?: (keyof T)[]
  pagination?: boolean
  pageSize?: number
  exportable?: boolean
  exportFilename?: string
  onRowClick?: (item: T) => void
  emptyMessage?: string
  className?: string
}

export function DSTable<T extends Record<string, any>>({
  data,
  columns,
  title,
  subtitle,
  searchable = false,
  searchPlaceholder = 'Search...',
  searchKeys,
  pagination = false,
  pageSize = 10,
  exportable = false,
  exportFilename = 'export.csv',
  onRowClick,
  emptyMessage = 'No data available.',
  className = ''
}: DSTableProps<T>) {
  const [search, setSearch] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: keyof T, direction: 'asc' | 'desc' } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  // 1. Filter
  const filteredData = useMemo(() => {
    if (!search || !searchKeys || searchKeys.length === 0) return data
    const query = search.toLowerCase()
    return data.filter(item => 
      searchKeys.some(key => {
        const val = item[key]
        return val ? String(val).toLowerCase().includes(query) : false
      })
    )
  }, [data, search, searchKeys])

  // 2. Sort
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key]
      const bVal = b[sortConfig.key]
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredData, sortConfig])

  // 3. Paginate
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData
    const start = (currentPage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, pagination, currentPage, pageSize])

  const totalPages = Math.ceil(sortedData.length / pageSize)

  const handleSort = (key: keyof T) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const exportCSV = () => {
    const headers = columns.map(c => c.header).join(',')
    const rows = sortedData.map(item => {
      return columns.map(col => {
        if (col.accessorKey) return `"${String(item[col.accessorKey]).replace(/"/g, '""')}"`
        return '""'
      }).join(',')
    })
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', exportFilename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className={`bg-[var(--card)] border border-[var(--border)] rounded-[24px] shadow-lg overflow-hidden flex flex-col ${className}`}>
      
      {/* Table Header Controls */}
      {(title || subtitle || searchable || exportable) && (
        <div className="p-6 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            {title && <h3 className="text-lg font-bold text-[var(--text-heading)]">{title}</h3>}
            {subtitle && <p className="text-sm text-[var(--text-muted)]">{subtitle}</p>}
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {searchable && (
              <div className="w-full sm:w-64">
                <DSInput
                  label={searchPlaceholder}
                  icon={<Search className="w-4 h-4" />}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setCurrentPage(1)
                  }}
                  containerClassName="!space-y-0"
                />
              </div>
            )}
            {exportable && (
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 h-[56px] bg-[var(--surface-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl text-[14px] font-medium text-[var(--text-primary)] transition-colors"
              >
                <FileDown className="w-4 h-4" />
                Export CSV
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th 
                  key={i} 
                  className={`
                    p-4 bg-[var(--surface-secondary)] border-b border-[var(--border)]
                    text-xs font-bold text-[var(--text-heading)] uppercase tracking-wider
                    ${col.sortable ? 'cursor-pointer hover:bg-[var(--surface-hover)] transition-colors select-none' : ''}
                  `}
                  style={{ width: col.width }}
                  onClick={() => {
                    if (col.sortable && col.accessorKey) handleSort(col.accessorKey)
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && col.accessorKey && (
                      <span className="text-[var(--text-muted)] flex flex-col -space-y-1">
                        <ChevronUp className={`w-3 h-3 ${sortConfig?.key === col.accessorKey && sortConfig.direction === 'asc' ? 'text-[var(--primary)]' : ''}`} />
                        <ChevronDown className={`w-3 h-3 ${sortConfig?.key === col.accessorKey && sortConfig.direction === 'desc' ? 'text-[var(--primary)]' : ''}`} />
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {paginatedData.length > 0 ? (
                paginatedData.map((row, rowIndex) => (
                  <motion.tr
                    key={rowIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`
                      border-b border-[var(--divider)] last:border-0
                      transition-colors duration-150
                      ${onRowClick ? 'cursor-pointer hover:bg-[var(--surface-hover)]' : 'hover:bg-[var(--surface-hover)]/50'}
                    `}
                    onClick={() => onRowClick && onRowClick(row)}
                  >
                    {columns.map((col, colIndex) => (
                      <td key={colIndex} className="p-4 text-sm text-[var(--text-body)]">
                        {col.cell ? col.cell(row) : col.accessorKey ? String(row[col.accessorKey]) : null}
                      </td>
                    ))}
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="p-8 text-center text-[var(--text-muted)] text-sm">
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination && totalPages > 1 && (
        <div className="p-4 border-t border-[var(--border)] flex items-center justify-between bg-[var(--surface-secondary)]/50">
          <p className="text-sm text-[var(--text-muted)]">
            Showing <span className="font-semibold text-[var(--text-heading)]">{Math.min((currentPage - 1) * pageSize + 1, sortedData.length)}</span> to{' '}
            <span className="font-semibold text-[var(--text-heading)]">{Math.min(currentPage * pageSize, sortedData.length)}</span> of{' '}
            <span className="font-semibold text-[var(--text-heading)]">{sortedData.length}</span> results
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-[var(--border)] bg-white dark:bg-[var(--card)] disabled:opacity-50 hover:bg-[var(--surface-hover)] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-[var(--border)] bg-white dark:bg-[var(--card)] disabled:opacity-50 hover:bg-[var(--surface-hover)] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
