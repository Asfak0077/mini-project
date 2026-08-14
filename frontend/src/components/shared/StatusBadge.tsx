// Shared — StatusBadge (delegates to DS)
import React from 'react'
import { DSStatusBadge } from '../ds/Display'

interface StatusBadgeProps {
  status: string
  className?: string
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => (
  <DSStatusBadge status={status} className={className} />
)

export default StatusBadge
