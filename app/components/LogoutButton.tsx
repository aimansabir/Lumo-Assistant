"use client"

import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import LoadingButton from './LoadingButton'
import { useState } from 'react'
import { LogOut } from 'lucide-react'
import ConfirmModal from './ConfirmModal'

type LogoutButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  iconOnly?: boolean
  title?: string
}


export default function LogoutButton({ iconOnly = false, title = 'Sign Out', ...props }: LogoutButtonProps) {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
    setLoggingOut(false)
  }

  return (
    <>
      <LoadingButton
        loading={loggingOut}
        onClick={() => setConfirmOpen(true)}
        className={`${iconOnly ? 'rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100' : 'rounded-md bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700'}`} 
        title={title}
        {...props}
      >
        {iconOnly ? <LogOut className="h-4 w-4" /> : 'Sign Out'}
      </LoadingButton>

      <ConfirmModal
        open={confirmOpen}
        title={iconOnly ? 'Log out' : 'Sign Out'}
        description={iconOnly ? 'Are you sure you want to log out?' : 'Are you sure you want to sign out? You will be redirected to the login page.'}
        confirmLabel={iconOnly ? 'Log out' : 'Sign Out'}
        danger
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          setConfirmOpen(false)
          await handleLogout()
        }}
      />
    </>
  )
}

