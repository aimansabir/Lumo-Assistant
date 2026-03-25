import { NextResponse } from 'next/server'
import { updateWorkspaceEmbeddings, deleteSystemDocument } from '@/app/lib/anythingllm'
import { isRequestAdmin } from '@/app/lib/admin-auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!isRequestAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { slug } = await params
    const { docLocation } = await request.json()

    if (!slug) {
      return NextResponse.json({ error: 'Workspace slug is required' }, { status: 400 })
    }
    
    if (!docLocation) {
      return NextResponse.json({ error: 'docLocation is required' }, { status: 400 })
    }

    // 1. Remove from workspace embeddings
    const unEmbedSuccess = await updateWorkspaceEmbeddings(slug, [], [docLocation])
    
    if (!unEmbedSuccess) {
      return NextResponse.json({ error: 'Failed to remove document from workspace embeddings' }, { status: 500 })
    }

    // 2. Delete the actual document from storage to prevent orphaned files
    const systemDeleteSuccess = await deleteSystemDocument(docLocation)
    
    return NextResponse.json({ 
      success: true, 
      unEmbedded: true, 
      systemDeleted: systemDeleteSuccess 
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete document' },
      { status: 500 }
    )
  }
}
