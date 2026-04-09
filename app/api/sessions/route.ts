import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

// GET - List all chat sessions for a subject
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get('subjectId')

    if (!subjectId) {
      return NextResponse.json(
        { error: 'subjectId is required' },
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

    // Fetch chat sessions for this subject and user
    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('subject_id', subjectId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching chat sessions:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      return NextResponse.json(
        { 
          error: 'Failed to fetch chat sessions',
          details: error.message,
          hint: 'Make sure the chat_sessions table exists. Run the migration: 002_create_chat_sessions_table.sql'
        },
        { status: 500 }
      )
    }

    // Filter out sessions that have no messages (empty chats)
    const sessionsWithMessages = await Promise.all(
      (sessions || []).map(async (session) => {
        const { data: messages, error: msgError } = await supabase
          .from('messages')
          .select('id')
          .eq('session_id', session.id)
          .limit(1)

        // Only include sessions that have at least one message
        if (!msgError && messages && messages.length > 0) {
          return session
        }
        return null
      })
    )

    // Filter out null values (sessions with no messages)
    const validSessions = sessionsWithMessages.filter((s): s is typeof sessions[0] => s !== null)

    return NextResponse.json({ sessions: validSessions })
  } catch (error: any) {
    console.error('Error in GET /api/sessions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new chat session
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { subjectId, title } = body

    if (!subjectId) {
      return NextResponse.json(
        { error: 'subjectId is required' },
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

    // Get workspace ID from subjectId (workspace name)
    const BASE_URL = process.env.NEXT_PUBLIC_ANYTHINGLLM_BASE_URL
    const API_KEY = process.env.ANYTHINGLLM_API_KEY
    let workspaceId: string | null = null
    let threadId: string | null = null

    // Fetch workspace by name to get workspace ID
    if (BASE_URL && API_KEY) {
      try {
        const workspaceRes = await fetch(`${BASE_URL}/workspaces`, {
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
          },
        })

        if (workspaceRes.ok) {
          const workspaceData = await workspaceRes.json()
          const workspaces = Array.isArray(workspaceData) ? workspaceData : (workspaceData.workspaces || [])
          const workspace = workspaces.find((w: any) => w.name === subjectId || w.slug === subjectId)
          
          if (workspace) {
            workspaceId = workspace.id
            
            // Create a new thread in AnythingLLM v1 API
            try {
              const newThreadUrl = `${BASE_URL}/v1/workspace/${workspace.slug}/thread/new`
              
              const threadRes = await fetch(newThreadUrl, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  name: title || 'New Chat',
                }),
              })

              const rawThreadText = await threadRes.text()

              if (threadRes.ok) {
                // Check if the response looks like HTML (404/500 pages)
                if (rawThreadText.trim().startsWith('<!DOCTYPE') || rawThreadText.trim().startsWith('<html')) {
                  console.warn('⚠️ Thread creation returned HTML. Endpoint might be wrong or unsupported.')
                } else {
                  try {
                    const threadData = JSON.parse(rawThreadText)
                    // v1 API returns: { thread: { id, slug, ... }, message: null }
                    if (threadData.thread && threadData.thread.slug) {
                      threadId = threadData.thread.slug // We store the slug to use in the URL later
                    }
                  } catch (e) {
                    console.warn('⚠️ Failed to parse thread creation response as JSON:', e)
                  }
                }
              } else {
                console.warn('⚠️ Could not create v1 thread, status:', threadRes.status, 'Response:', rawThreadText.substring(0, 100))
              }
            } catch (threadError) {
              console.warn('⚠️ Could not create thread:', threadError)
            }
          } else {
            console.warn('⚠️ Workspace not found for subjectId:', subjectId)
          }
        }
      } catch (workspaceError) {
        console.warn('⚠️ Could not fetch workspace, continuing without thread:', workspaceError)
      }
    } else {
      console.warn('⚠️ AnythingLLM not configured, skipping thread creation')
    }

    // Create new chat session
    // Build insert data - only include thread_id if column exists
    const insertData: any = {
      user_id: user.id,
      subject_id: subjectId,
      title: title || 'New Chat',
    }
    
    // Only add thread_id if it's not null (and column exists)
    // If column doesn't exist, Supabase will ignore it or we'll handle the error
    if (threadId) {
      insertData.thread_id = threadId
    }
    
    const { data: session, error } = await supabase
      .from('chat_sessions')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('❌ Error creating chat session:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      
      // If error is about thread_id column not existing, try without it
      if (error.message && error.message.includes('thread_id')) {
        try {
          const { data: sessionWithoutThread, error: retryError } = await supabase
            .from('chat_sessions')
            .insert({
              user_id: user.id,
              subject_id: subjectId,
              title: title || 'New Chat',
            })
            .select()
            .single()
          
          if (retryError) {
            return NextResponse.json(
              { 
                error: 'Failed to create chat session',
                details: retryError.message,
                hint: 'Make sure the chat_sessions table exists. Run the migration: 002_create_chat_sessions_table.sql. If you want thread support, also run: 004_add_thread_id_to_sessions.sql'
              },
              { status: 500 }
            )
          }
          
          return NextResponse.json({ session: sessionWithoutThread })
        } catch (retryErr) {
          return NextResponse.json(
            { 
              error: 'Failed to create chat session',
              details: error.message,
              hint: 'Make sure the chat_sessions table exists. Run the migration: 002_create_chat_sessions_table.sql'
            },
            { status: 500 }
          )
        }
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to create chat session',
          details: error.message,
          hint: 'Make sure the chat_sessions table exists. Run the migration: 002_create_chat_sessions_table.sql. If you want thread support, also run: 004_add_thread_id_to_sessions.sql'
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ session })
  } catch (error: any) {
    console.error('Error in POST /api/sessions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

