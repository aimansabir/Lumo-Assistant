import { NextRequest, NextResponse } from 'next/server'
import { getWorkspaceDocuments } from '@/app/lib/anythingllm'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug
    const documents = await getWorkspaceDocuments(slug)
    
    return NextResponse.json({ documents })
  } catch (error: any) {
    console.error('Error fetching workspace documents:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}
