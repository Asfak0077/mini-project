// Design System — Button components
import React from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning'

interface BtnProps {
  children: React.ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
  fullWidth?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  className?: string
  id?: string
}

const sizeMap: Record<ButtonSize, string> = {
  xs: 'h-8 px-3 text-xs gap-1.5 rounded-lg font-medium',
  sm: 'h-9 px-4 text-xs gap-2 rounded-xl font-medium',
  md: 'h-10 sm:h-11 px-5 text-[13.5px] gap-2 rounded-xl font-semibold',
  lg: 'h-12 px-6 text-sm gap-2.5 rounded-2xl font-semibold',
}

const variantMap: Record<ButtonVariant, string> = {
  primary:   'bg-[#111827] text-white hover:bg-[#2563EB] active:bg-[#1D4ED8] dark:bg-[#F8FAFC] dark:text-[#0F172A] dark:hover:bg-[#60A5FA] shadow-[var(--shadow-sm)] border border-transparent',
  secondary: 'bg-white dark:bg-[#0F172A] hover:bg-[#F8FAFC] dark:hover:bg-slate-800 text-[var(--text-primary)] border border-[rgba(15,23,42,0.07)] dark:border-[rgba(255,255,255,0.08)] shadow-[var(--shadow-sm)]',
  outline:   'bg-transparent text-[var(--primary)] border border-[var(--primary-border)] hover:bg-[var(--primary-soft)]',
  ghost:     'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]',
  danger:    'bg-[#EF4444] hover:bg-rose-700 active:bg-rose-800 text-white shadow-[var(--shadow-sm)] border border-transparent',
  success:   'bg-[#10B981] hover:bg-emerald-700 text-white shadow-[var(--shadow-sm)] border border-transparent',
  warning:   'bg-[#F59E0B] hover:bg-amber-700 text-white shadow-[var(--shadow-sm)] border border-transparent',
}

const baseClass = 'inline-flex items-center justify-center transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none whitespace-nowrap'

export const PrimaryButton: React.FC<BtnProps> = (props) => <Btn {...props} variant="primary" />
export const SecondaryButton: React.FC<BtnProps> = (props) => <Btn {...props} variant="secondary" />
export const DangerButton: React.FC<BtnProps> = (props) => <Btn {...props} variant="danger" />
export const SuccessButton: React.FC<BtnProps> = (props) => <Btn {...props} variant="success" />
export const GhostButton: React.FC<BtnProps> = (props) => <Btn {...props} variant="ghost" />
export const OutlineButton: React.FC<BtnProps> = (props) => <Btn {...props} variant="outline" />

export const Btn: React.FC<BtnProps> = ({
  children, variant = 'primary', size = 'md', isLoading = false,
  icon, iconRight, fullWidth = false, disabled = false,
  type = 'button', onClick, className = '', id
}) => (
  <motion.button
    whileHover={disabled || isLoading ? undefined : { y: -1, transition: { duration: 0.15 } }}
    whileTap={disabled || isLoading ? undefined : { scale: 0.97 }}
    type={type}
    disabled={disabled || isLoading}
    onClick={onClick}
    id={id}
    className={`${baseClass} ${variantMap[variant]} ${sizeMap[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
  >
    {isLoading ? (
      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
    ) : icon ? (
      <span className="shrink-0">{icon}</span>
    ) : null}
    <span>{children}</span>
    {!isLoading && iconRight && <span className="shrink-0">{iconRight}</span>}
  </motion.button>
)

export default Btn
