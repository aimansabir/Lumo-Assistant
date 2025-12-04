'use client'

import { X, AlertCircle } from 'lucide-react'
import { useEffect } from 'react'

interface ErrorCardProps {
  message: string
  onDismiss?: () => void
  autoDismiss?: boolean
}

export default function ErrorCard({
  message,
  onDismiss,
  autoDismiss = true,
}: ErrorCardProps) {
  useEffect(() => {
    if (onDismiss && autoDismiss) {
      const timer = setTimeout(() => {
        onDismiss()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [onDismiss, autoDismiss])

  return (
    <div
      className="group relative animate-in slide-in-from-top-2 fade-in rounded-lg border border-red-900 bg-red-950/50 backdrop-blur-sm p-4 shadow-lg"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500">
            <AlertCircle className="h-5 w-5 text-white" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-200">
            Error
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-red-300">
            {message}
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 rounded-md p-1 text-red-400 transition-colors hover:bg-red-900/40"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

