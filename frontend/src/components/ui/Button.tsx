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
      'bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white !text-white shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/35 border border-blue-400/20 active:scale-[0.98]',
    secondary:
      'bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700/90 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 shadow-xs hover:shadow-sm active:scale-[0.98]',
    outline:
      'bg-transparent text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100/70 dark:hover:bg-slate-800/70',
    ghost:
      'bg-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60',
    danger:
      'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white !text-white shadow-md shadow-rose-500/25',
    success:
      'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white !text-white shadow-md shadow-emerald-500/20',
    warning:
      'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white !text-white shadow-md shadow-amber-500/20',
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
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''
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
