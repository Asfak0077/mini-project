import React, { createContext, useContext, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
    id: string
    type: ToastType
    message: string
}

interface ToastContextType {
    showToast: (type: ToastType, message: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export const useToast = () => {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([])

    const showToast = useCallback((type: ToastType, message: string) => {
        const id = Date.now().toString() + Math.random()
        const toast: Toast = { id, type, message }

        setToasts((prev) => [...prev, toast])

        // Auto-dismiss after 4 seconds
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id))
        }, 4000)
    }, [])

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }

    const getToastStyles = (type: ToastType) => {
        switch (type) {
            case 'success':
                return 'bg-[var(--success-subtle)] border-[var(--success)]/30 text-[var(--success)] shadow-[var(--shadow-md)]'
            case 'error':
                return 'bg-[var(--danger-subtle)] border-[var(--danger)]/30 text-[var(--danger)] shadow-[var(--shadow-md)]'
            case 'warning':
                return 'bg-[var(--warning-subtle)] border-[var(--warning)]/30 text-[var(--warning)] shadow-[var(--shadow-md)]'
            case 'info':
                return 'bg-[var(--info-subtle)] border-[var(--info)]/30 text-[var(--info)] shadow-[var(--shadow-md)]'
            default:
                return 'bg-[var(--surface-secondary)] border-[var(--border)] text-[var(--text-primary)] shadow-[var(--shadow-md)]'
        }
    }

    const getIcon = (type: ToastType) => {
        switch (type) {
            case 'success':
                return '✓'
            case 'error':
                return '✕'
            case 'warning':
                return '⚠'
            case 'info':
                return 'ℹ'
            default:
                return '•'
        }
    }

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}

            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2" style={{ maxWidth: '400px' }}>
                <AnimatePresence>
                    {toasts.map((toast) => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, x: 100, scale: 0.8 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 100, scale: 0.8 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md ${getToastStyles(toast.type)} min-w-[280px]`}
                        >
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-current bg-opacity-10 flex items-center justify-center text-[10px] font-bold">
                                {getIcon(toast.type)}
                            </div>
                            <p className="flex-1 text-sm font-semibold">{toast.message}</p>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="flex-shrink-0 w-6 h-6 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer"
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    )
}
