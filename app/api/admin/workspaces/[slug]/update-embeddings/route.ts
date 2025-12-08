import { NextResponse } from 'next/server'
import { updateWorkspaceEmbeddings } from '@/app/lib/anythingllm'
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
    const { adds, deletes } = await request.json()

    if (!slug) {
      return NextResponse.json(
        { error: 'Workspace slug is required' },
        { status: 400 }
      )
    }

    const success = await updateWorkspaceEmbeddings(slug, adds, deletes)
    return NextResponse.json({ success })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update embeddings' },
      { status: 500 }
    )
  }
}
