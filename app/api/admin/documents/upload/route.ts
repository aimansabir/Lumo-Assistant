import { NextResponse } from 'next/server'
import { uploadDocument } from '@/app/lib/anythingllm'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    const result = await uploadDocument(formData)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload document' },
      { status: 500 }
    )
  }
}
