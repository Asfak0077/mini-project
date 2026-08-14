import React from 'react'
import { Complaint, ComplaintStatus, Teacher } from '../../types/domain'
import { DSTable, Column } from '../ds/Table'
import { DSStatusBadge } from '../ds/Display'
import { DSSelect } from '../ds/Inputs'
import { SecondaryButton } from '../ds/Buttons'
import { CheckCircle2 } from 'lucide-react'
import ComplaintIdBadge from '../shared/ComplaintIdBadge'

interface ComplaintTableProps {
  complaints: Complaint[]
  teachers: Teacher[]
  onAssign: (complaintId: string, teacherId: string) => void
  onStatusChange: (complaintId: string, status: ComplaintStatus) => void
}

const ComplaintTable: React.FC<ComplaintTableProps> = ({ complaints, teachers, onAssign, onStatusChange }) => {
  const columns: Column<Complaint>[] = [
    {
      header: 'Complaint ID',
      accessorKey: 'complaintId',
      sortable: true,
      width: '120px',
      cell: (item) => (
        <ComplaintIdBadge complaintId={item.complaintId} id={item.id} size="sm" />
      )
    },
    {
      header: 'Student',
      accessorKey: 'studentName',
      sortable: true,
      cell: (item) => (
        <div className="flex flex-col">
          <span className="font-bold text-[var(--text-heading)]">{item.studentName || 'Student'}</span>
          <span className="text-[11px] text-[var(--text-muted)] font-mono">{item.studentId || item.studentEmail}</span>
        </div>
      )
    },
    {
      header: 'Dept',
      accessorKey: 'department',
      sortable: true,
      cell: (item) => (
        <span className="inline-flex items-center rounded-xl bg-[var(--primary-subtle)] px-2.5 py-1 text-[11px] font-bold text-[var(--primary)] border border-[var(--primary-border)]">
          {item.department}
        </span>
      )
    },
    {
      header: 'Category',
      accessorKey: 'category',
      sortable: true,
      cell: (item) => <span className="font-semibold text-[13px]">{item.category}</span>
    },
    {
      header: 'Priority',
      accessorKey: 'priority',
      sortable: true,
      cell: (item) => {
        const p = item.priority || 'low'
        const classMap: Record<string, string> = {
          high: 'bg-[var(--danger-subtle)] text-[var(--danger)] border-[var(--danger)]/30',
          Urgent: 'bg-[var(--danger-subtle)] text-[var(--danger)] border-[var(--danger)]/30',
          medium: 'bg-[var(--warning-subtle)] text-[var(--warning)] border-[var(--warning)]/30',
          low: 'bg-[var(--success-subtle)] text-[var(--success)] border-[var(--success)]/30'
        }
        const classes = classMap[p] || 'bg-[var(--surface-secondary)] text-[var(--text-muted)]'
        return (
          <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border ${classes}`}>
            {p}
          </span>
        )
      }
    },
    {
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      cell: (item) => <DSStatusBadge status={item.status} />
    },
    {
      header: 'Assigned Faculty',
      accessorKey: 'assignedTeacherId',
      width: '240px',
      cell: (item) => (
        <DSSelect
          label=""
          value={item.assignedTeacherId || ''}
          onChange={(e) => onAssign(item.id, e.target.value)}
          className="!h-[40px] text-xs"
        >
          <option value="">Unassigned (Select)</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name} ({teacher.department})
            </option>
          ))}
        </DSSelect>
      )
    },
    {
      header: 'Actions',
      cell: (item) => (
        <div className="flex gap-2">
          {item.status !== 'Resolved' ? (
            <button
              onClick={() => onStatusChange(item.id, 'Resolved')}
              className="px-3 py-1.5 rounded-xl bg-[var(--success-subtle)] text-[var(--success)] hover:bg-[var(--success)] hover:text-white transition-all border border-[var(--success)]/30 text-xs font-bold flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-[var(--success)] bg-[var(--success-subtle)] px-2.5 py-1 rounded-xl border border-[var(--success)]/30">
              <CheckCircle2 className="h-3.5 w-3.5" /> Done
            </div>
          )}
        </div>
      )
    }
  ]

  return (
    <DSTable
      data={complaints}
      columns={columns}
      title="Grievance Backlog"
      subtitle="Manage assignments and status updates"
      searchable
      searchPlaceholder="Search complaints..."
      searchKeys={['studentName', 'department', 'category', 'status', 'priority']}
      pagination
      pageSize={10}
      exportable
      exportFilename="complaints.csv"
    />
  )
}

export default ComplaintTable
