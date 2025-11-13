'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import Link from 'next/link'
import ErrorCard from '@/app/components/ErrorCard'
import { LogIn, Mail, Lock, Sparkles } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white dark:bg-black">
      <div className="relative w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-xl dark:border-gray-800 dark:bg-black">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-black p-3 dark:bg-white">
              <Sparkles className="h-6 w-6 text-white dark:text-black" />
            </div>
            <h1 className="mb-2 text-3xl font-bold text-black dark:text-white">
              Welcome Back
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Sign in to continue to your dashboard
            </p>
          </div>

          {/* Error Card */}
          {error && (
            <div className="mb-6 animate-in slide-in-from-top-2">
              <ErrorCard message={error} onDismiss={() => setError(null)} />
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="flex items-center gap-2 text-sm font-medium text-black dark:text-white"
              >
                <Mail className="h-4 w-4" />
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-black transition-all focus:border-black focus:outline-none focus:ring-2 focus:ring-black/20 dark:border-gray-700 dark:bg-black dark:text-white dark:focus:border-white dark:focus:ring-white/20"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="flex items-center gap-2 text-sm font-medium text-black dark:text-white"
              >
                <Lock className="h-4 w-4" />
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-black transition-all focus:border-black focus:outline-none focus:ring-2 focus:ring-black/20 dark:border-gray-700 dark:bg-black dark:text-white dark:focus:border-white dark:focus:ring-white/20"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full rounded-lg bg-black px-4 py-3 font-semibold text-white shadow-lg transition-all hover:bg-gray-900 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-100"
            >
              <span className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-black dark:border-t-transparent"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?{' '}
            <Link
              href="/auth/signup"
              className="font-semibold text-black transition-colors hover:text-gray-700 dark:text-white dark:hover:text-gray-300"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

