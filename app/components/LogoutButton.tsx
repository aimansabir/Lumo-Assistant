'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import LoadingButton from './LoadingButton'
import { useState } from 'react'

export default function LogoutButton() {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
    setLoggingOut(false)
  }

  return (
    <LoadingButton loading={loggingOut} onClick={handleLogout} className="rounded-md bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700">
      Sign Out
    </LoadingButton>
  )
}

