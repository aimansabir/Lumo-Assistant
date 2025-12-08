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
    const { name, level } = await request.json()
    
    if (!name) {
      return NextResponse.json(
        { error: 'Workspace name is required' },
        { status: 400 }
      )
    }

    let normalizedLevel: string | undefined = undefined
    if (level) {
      if (typeof level === 'string') {
        const l = level.toLowerCase()
        if (l === 'o' || l === 'o-level' || l === 'olevel' || l === 'o levels' || l === 'o-levels' || l === 'o levels') {
          normalizedLevel = 'O'
        } else if (l === 'a' || l === 'a-level' || l === 'alevel' || l === 'a levels' || l === 'a-levels') {
          normalizedLevel = 'A'
        }
      }
    }

    // Default to 'O' if not provided
    if (!normalizedLevel) normalizedLevel = 'O'

    // Title Case validation: require each word to start with uppercase, followed by letters
    function isTitleCase(s: string) {
      if (!s || typeof s !== 'string') return false
      const words = s.trim().split(/\s+/)
      if (words.length === 0) return false
      return words.every((w) => /^[A-Z][a-zA-Z]*$/.test(w))
    }

    if (!isTitleCase(name)) {
      return NextResponse.json({ error: 'Subject name must be Title Case, e.g., "Computer Science"' }, { status: 400 })
    }

    // Build the internal workspace name: lumo_{slugified-subject}-{words separated by hyphen}_{LEVEL}
    const slugSubject = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const finalName = `lumo_${slugSubject}_${normalizedLevel}`

    const workspace = await createWorkspace(finalName, normalizedLevel)
    return NextResponse.json({ workspace })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create workspace' },
      { status: 500 }
    )
  }
}
