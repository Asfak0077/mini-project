import { ButtonHTMLAttributes } from 'react'
import { clsx } from 'clsx'

type AnimatedButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger'
}

const styles: Record<NonNullable<AnimatedButtonProps['variant']>, string> = {
  primary: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90',
  secondary: 'bg-white/10 text-[var(--pk-text-primary)] border border-white/10 hover:bg-white/20',
  danger: 'bg-rose-600 text-white hover:bg-rose-500'
}

const AnimatedButton = ({ className, variant = 'primary', ...props }: AnimatedButtonProps) => {
  return (
    <button
      className={clsx('rounded-xl px-4 py-2 font-medium transition active:scale-[0.98] hover:scale-[1.02] disabled:opacity-60', styles[variant], className)}
      {...props}
    />
  )
}

export default AnimatedButton
