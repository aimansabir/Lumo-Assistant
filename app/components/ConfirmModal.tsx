'use client'

import React, { useEffect, useRef, useState } from 'react'
import LoadingButton from './LoadingButton'

interface ConfirmModalProps {
  open: boolean
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  requireTypedConfirmation?: boolean
  requiredText?: string
  loading?: boolean
  onConfirm: () => Promise<void> | void
  onCancel: () => void
}

export default function ConfirmModal({
  open,
  title = 'Confirm',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  requireTypedConfirmation = false,
  requiredText = '',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [typed, setTyped] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) {
      setTyped('')
    } else {
      // focus the input if typed confirmation is required
      if (requireTypedConfirmation && inputRef.current) {
        setTimeout(() => inputRef.current?.focus(), 10)
      }
    }
  }, [open, requireTypedConfirmation])

  if (!open) return null

  const canConfirm = requireTypedConfirmation ? typed.trim() === requiredText : true

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-lg p-6 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          {description && <p className="text-sm text-zinc-400 mt-2">{description}</p>}
        </div>

        {requireTypedConfirmation && (
          <div className="mb-4">
            <label className="text-xs text-zinc-400">Type <span className="font-medium text-zinc-100">{requiredText}</span> to confirm</label>
            <input
              ref={inputRef}
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-md bg-zinc-800 px-4 py-2 font-medium text-zinc-100 hover:bg-zinc-700">{cancelLabel}</button>
          <LoadingButton
            loading={loading}
            disabled={!canConfirm}
            onClick={async () => {
              if (!canConfirm) return
              await onConfirm()
            }}
            className={`${danger ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-indigo-500 hover:bg-indigo-600 text-white'} rounded-md px-4 py-2 font-medium`}
          >
            {confirmLabel}
          </LoadingButton>
        </div>
      </div>
    </div>
  )
}
