// UI Primitive — Premium Minimalist Button
import React from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
  fullWidth?: boolean
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  iconRight,
  fullWidth = false,
  className = '',
  disabled = false,
  type = 'button',
  onClick,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-bold tracking-tight transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none whitespace-nowrap'

  const variants = {
    primary:
      'bg-[#111827] dark:bg-white text-white dark:text-[#111827] hover:bg-[#2563EB] dark:hover:bg-blue-500 dark:hover:text-white shadow-sm hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98]',
    secondary:
      'bg-white dark:bg-[#151D2A] hover:bg-slate-50 dark:hover:bg-slate-800 text-[var(--text-primary)] border border-[var(--border)] shadow-[var(--shadow-sm)]',
    outline:
      'bg-transparent text-[var(--text-primary)] border border-[var(--border-strong)] hover:bg-[var(--surface-hover)]',
    ghost:
      'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]',
    danger:
      'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-red-500/25',
    success:
      'bg-[#4D7C5F] hover:bg-[#3d634c] text-white shadow-sm hover:shadow-emerald-500/20',
    warning:
      'bg-amber-500 hover:bg-amber-600 text-white shadow-sm',
  }

  const sizes = {
    sm: 'h-9 px-4 text-xs gap-2 rounded-xl',
    md: 'h-10 sm:h-11 px-5 text-[13.5px] gap-2 rounded-xl',
    lg: 'h-12 px-6 text-[14px] gap-2.5 rounded-2xl',
  }

  return (
    <motion.button
      whileHover={disabled || isLoading ? undefined : { y: -2 }}
      whileTap={disabled || isLoading ? undefined : { scale: 0.98 }}
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${base} ${variants[variant]} ${sizes[size]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : icon ? (
        <span className="shrink-0 flex items-center justify-center">{icon}</span>
      ) : null}
      <span className="shrink-0">{children}</span>
      {!isLoading && iconRight && <span className="shrink-0 flex items-center justify-center">{iconRight}</span>}
    </motion.button>
  )
}
