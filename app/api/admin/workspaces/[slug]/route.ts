import { NextRequest, NextResponse } from 'next/server'
import { isRequestAdmin } from '@/app/lib/admin-auth'
import { deleteWorkspace, getWorkspace } from '@/app/lib/anythingllm'
import { createClient } from '@/app/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: any }
) {
  if (!isRequestAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const resolvedParams = await params
    const slug = resolvedParams.slug
    // Find workspace by slug to get underlying id
    const workspace = await getWorkspace(slug)
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Delete at AnythingLLM
    await deleteWorkspace(slug)

    // Remove any associated messages / sessions in Supabase (soft cleanup)
    try {
      const supabase = await createClient()
      await supabase.from('messages').delete().eq('subject_id', workspace.id)
      await supabase.from('chat_sessions').delete().eq('subject_id', workspace.id)
    } catch (cleanupError) {
      // Continue even if DB cleanup fails; don't block deletion
      console.warn('Failed to clean up database after workspace delete:', cleanupError)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting workspace:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete workspace' }, { status: 500 })
  }
}
