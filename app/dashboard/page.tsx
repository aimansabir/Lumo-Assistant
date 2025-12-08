'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import Link from 'next/link'
import {
  BookOpen,
  LogOut,
  MessageSquare,
  Sparkles,
  Loader2,
} from 'lucide-react'
import LogoutButton from '@/app/components/LogoutButton'
import { parseWorkspaceName, getSubjectIcon, getSubjectDescription } from '@/app/lib/subject-utils'

interface Subject {
  id: string
  name: string
  icon: React.ReactNode
  description: string
  baseSubject: string
  messageCount?: number
  lastMessage?: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [subjectsWithStats, setSubjectsWithStats] = useState<Subject[]>([])
  const [subjectsLoading, setSubjectsLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
      } else {
        setUser(user)
        loadSubjects()
        setLoading(false)
      }
    }

    checkUser()
  }, [router])

  const loadSubjects = async () => {
    try {
      setSubjectsLoading(true)
      
      // Fetch workspaces from AnythingLLM
      const workspacesResponse = await fetch('/api/workspaces')
      const workspacesData = await workspacesResponse.json()

      if (!workspacesResponse.ok || !Array.isArray(workspacesData)) {
        console.error('Failed to fetch workspaces:', workspacesData)
        setSubjectsLoading(false)
        return
      }

      // Filter workspaces that start with 'alphachat_' or 'lumo_'
      const appWorkspaces = workspacesData.filter((ws: any) =>
        ws.name && (ws.name.startsWith('alphachat_') || ws.name.startsWith('lumo_'))
      )

      // Parse workspaces into subjects
      const parsedSubjects: Subject[] = appWorkspaces
        .map((ws: any) => {
          const parsed = parseWorkspaceName(ws.name)
          if (!parsed) return null

          return {
            id: parsed.id,
            name: parsed.name,
            icon: getSubjectIcon(parsed.baseSubject, 'large'),
            description: getSubjectDescription(parsed.baseSubject),
            baseSubject: parsed.baseSubject,
          }
        })
        .filter((s: Subject | null): s is Subject => s !== null)

      // Load stats for subjects
      await loadDashboardStats(parsedSubjects)
    } catch (error) {
      console.error('Error loading subjects:', error)
    } finally {
      setSubjectsLoading(false)
    }
  }

  const loadDashboardStats = async (subjects: Subject[]) => {
    try {
      const response = await fetch('/api/dashboard/stats')
      const data = await response.json()

      if (response.ok && data.stats) {
        // Update subjects with real stats
        const updatedSubjects = subjects.map((subject) => {
          const stats = data.stats[subject.id]
          if (stats) {
            return {
              ...subject,
              messageCount: stats.count,
              lastMessage: stats.lastMessageTime || undefined,
            }
          }
          return subject
        })

        setSubjectsWithStats(updatedSubjects)
      } else {
        // If no stats, just set the subjects without stats
        setSubjectsWithStats(subjects)
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
      // Set subjects without stats on error
      setSubjectsWithStats(subjects)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent text-zinc-100">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-800 border-t-zinc-100"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-lg bg-zinc-100 p-2">
              <Sparkles className="h-6 w-6 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-100">
                LumoAI
              </h1>
              <p className="text-xs text-zinc-400">
                AI-Powered Learning Assistant
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-zinc-100">
                {user?.email}
              </p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <h2 className="mb-3 text-4xl font-bold text-zinc-100">
            Welcome back
          </h2>
          <p className="text-lg text-zinc-400">
            Select a subject to start chatting with your AI assistant
          </p>
        </div>


        {/* Subjects Grid */}
        <div>
          <h3 className="mb-6 text-2xl font-semibold text-zinc-100">
            Your Subjects
          </h3>
          {subjectsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                <p className="text-sm text-zinc-400">Loading subjects...</p>
              </div>
            </div>
          ) : subjectsWithStats.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-12 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-zinc-500" />
              <h4 className="mt-4 text-lg font-semibold text-zinc-100">
                No subjects found
              </h4>
              <p className="mt-2 text-sm text-zinc-400">
                Create workspaces starting with 'lumo_' in AnythingLLM to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {subjectsWithStats.map((subject, index) => (
              <Link
                key={subject.id}
                href={`/chat/${subject.id}`}
                className="group relative animate-in fade-in slide-in-from-bottom-4 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-6 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-800/50 hover:shadow-xl"
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                <div className="relative">
                  {/* Icon */}
                  <div className="mb-4 inline-flex items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 transition-transform duration-300 group-hover:scale-110 group-hover:border-zinc-600">
                    <div className="text-zinc-100">
                      {subject.icon}
                    </div>
                  </div>

                  {/* Content */}
                  <h4 className="mb-2 text-xl font-bold text-zinc-100">
                    {subject.name}
                  </h4>
                  <p className="mb-4 text-sm leading-relaxed text-zinc-400">
                    {subject.description}
                  </p>

                  {/* Stats */}
                  {subject.messageCount && subject.messageCount > 0 && (
                    <div className="mb-4 flex items-center gap-4 text-xs text-zinc-500">
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {subject.messageCount} messages
                      </span>
                      {subject.lastMessage && (
                        <span>{subject.lastMessage}</span>
                      )}
                    </div>
                  )}

                  {/* Arrow */}
                  <div className="flex items-center gap-2 text-sm font-medium text-zinc-100 transition-transform duration-300 group-hover:translate-x-1">
                    Start Chatting
                    <span className="text-lg">→</span>
                  </div>
                </div>
              </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
