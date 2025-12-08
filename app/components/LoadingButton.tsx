"use client"

import React from 'react'
import { RefreshCw } from 'lucide-react'

type LoadingButtonProps = (React.ButtonHTMLAttributes<HTMLButtonElement> | React.LabelHTMLAttributes<HTMLLabelElement>) & {
  loading?: boolean
  as?: keyof any
  htmlFor?: string
}

export default function LoadingButton({ loading, children, className = '', as, htmlFor, ...props }: LoadingButtonProps) {
  const Element: any = as || 'button'
  const isDisabled = (props as any).disabled || !!loading

  return (
    <Element
      {...props}
      {...(htmlFor ? { htmlFor } : {})}
      disabled={Element === 'button' ? isDisabled : undefined}
      className={`${className} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''} inline-flex items-center justify-center`}
    >
      {loading ? (
        <>
          <RefreshCw className="animate-spin -ml-1 mr-2 h-4 w-4" />
          <span>{children}</span>
        </>
      ) : (
        <>{children}</>
      )}
    </Element>
  )
}
