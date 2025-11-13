import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

// GET - Load messages for a session or subject
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const subjectId = searchParams.get('subjectId')

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('messages')
      .select('*')
      .eq('user_id', user.id)

    // If sessionId is provided, fetch messages for that session
    if (sessionId) {
      query = query.eq('session_id', sessionId)
    } else if (subjectId) {
      // Otherwise, fetch messages for the subject (backward compatibility)
      query = query.eq('subject_id', subjectId)
    } else {
      return NextResponse.json(
        { error: 'sessionId or subjectId is required' },
        { status: 400 }
      )
    }

    const { data: messages, error } = await query.order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching messages:', error)
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    return NextResponse.json({ messages: messages || [] })
  } catch (error: any) {
    console.error('Error in GET /api/messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Save a message
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { sessionId, subjectId, role, content } = body

    if (!role || !content) {
      return NextResponse.json(
        { error: 'role and content are required' },
        { status: 400 }
      )
    }

    if (!sessionId && !subjectId) {
      return NextResponse.json(
        { error: 'sessionId or subjectId is required' },
        { status: 400 }
      )
    }

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // If sessionId is provided, use it; otherwise use subjectId (backward compatibility)
    const messageData: any = {
      user_id: user.id,
      role: role,
      content: content,
    }

    if (sessionId) {
      messageData.session_id = sessionId
      // Get subject_id from session
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('subject_id')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single()
      
      if (session) {
        messageData.subject_id = session.subject_id
      }
    } else {
      messageData.subject_id = subjectId
    }

    // Insert message
    const { data: message, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single()

    if (error) {
      console.error('Error saving message:', error)
      return NextResponse.json(
        { error: 'Failed to save message' },
        { status: 500 }
      )
    }

    // Update session's updated_at timestamp if sessionId exists
    if (sessionId) {
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionId)
        .eq('user_id', user.id)

      // Auto-update session title from first user message if title is "New Chat"
      if (role === 'user') {
        const { data: session } = await supabase
          .from('chat_sessions')
          .select('title')
          .eq('id', sessionId)
          .single()

        if (session && (session.title === 'New Chat' || !session.title)) {
          // Use first 50 characters of first message as title
          const title = content.substring(0, 50).trim()
          await supabase
            .from('chat_sessions')
            .update({ title: title || 'New Chat' })
            .eq('id', sessionId)
            .eq('user_id', user.id)
        }
      }
    }

    return NextResponse.json({ message })
  } catch (error: any) {
    console.error('Error in POST /api/messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

