import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

// GET - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get message counts and last messages per subject
    const { data: messages, error } = await supabase
      .from('messages')
      .select('subject_id, role, content, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching dashboard stats:', error)
      return NextResponse.json(
        { error: 'Failed to fetch stats' },
        { status: 500 }
      )
    }

    // Group by subject
    const subjectStats: Record<
      string,
      { count: number; lastMessage: string | null; lastMessageTime: Date | null }
    > = {}

    messages?.forEach((msg) => {
      const subjectId = msg.subject_id
      if (!subjectStats[subjectId]) {
        subjectStats[subjectId] = {
          count: 0,
          lastMessage: null,
          lastMessageTime: null,
        }
      }
      subjectStats[subjectId].count++

      // Track the most recent message
      const msgTime = new Date(msg.created_at)
      if (
        !subjectStats[subjectId].lastMessageTime ||
        msgTime > subjectStats[subjectId].lastMessageTime
      ) {
        subjectStats[subjectId].lastMessageTime = msgTime
        subjectStats[subjectId].lastMessage = msg.content.substring(0, 100)
      }
    })

    // Format last message times
    const formattedStats: Record<
      string,
      { count: number; lastMessage: string | null; lastMessageTime: string | null }
    > = {}

    Object.keys(subjectStats).forEach((subjectId) => {
      const stats = subjectStats[subjectId]
      formattedStats[subjectId] = {
        count: stats.count,
        lastMessage: stats.lastMessage,
        lastMessageTime: stats.lastMessageTime
          ? formatTimeAgo(stats.lastMessageTime)
          : null,
      }
    })

    return NextResponse.json({ stats: formattedStats })
  } catch (error: any) {
    console.error('Error in GET /api/dashboard/stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}

