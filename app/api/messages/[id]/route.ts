import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

// DELETE - Delete a message
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const messageId = id

    if (!messageId) {
      console.error('❌ [API] Message ID is missing')
      return NextResponse.json(
        { error: 'Message ID is required' },
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

    // Delete message (RLS will ensure user can only delete their own messages)
    const { data, error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('user_id', user.id) // Extra safety check
      .select()

    if (error) {
      console.error('❌ [API] Error deleting message:', error)
      return NextResponse.json(
        { error: 'Failed to delete message', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, deleted: data })
  } catch (error: any) {
    console.error('Error in DELETE /api/messages/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

