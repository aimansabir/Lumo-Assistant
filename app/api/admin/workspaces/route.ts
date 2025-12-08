import { NextResponse } from 'next/server'
import { createWorkspace, fetchWorkspaces } from '@/app/lib/anythingllm'
import { isRequestAdmin } from '@/app/lib/admin-auth'

export async function GET(request: Request) {
  try {
    if (!isRequestAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const workspaces = await fetchWorkspaces()
    return NextResponse.json({ workspaces })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch workspaces' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  if (!isRequestAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { name } = await request.json()
    
    if (!name) {
      return NextResponse.json(
        { error: 'Workspace name is required' },
        { status: 400 }
      )
    }

    const workspace = await createWorkspace(name)
    return NextResponse.json({ workspace })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create workspace' },
      { status: 500 }
    )
  }
}
