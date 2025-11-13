import { NextResponse, NextRequest } from 'next/server'

const BASE_URL = process.env.NEXT_PUBLIC_ANYTHINGLLM_BASE_URL!
const API_KEY = process.env.ANYTHINGLLM_API_KEY!

export async function GET(request: NextRequest) {
  // Validate environment variables
  if (!BASE_URL) {
    console.error('❌ [API] NEXT_PUBLIC_ANYTHINGLLM_BASE_URL is not set!')
    return NextResponse.json(
      { 
        error: 'Server configuration error: NEXT_PUBLIC_ANYTHINGLLM_BASE_URL is not set',
        hint: 'Please add NEXT_PUBLIC_ANYTHINGLLM_BASE_URL to your .env.local file'
      },
      { status: 500 }
    )
  }

  // Check if BASE_URL is pointing to Next.js server (common mistake)
  if (BASE_URL.includes('localhost:3000') || BASE_URL.includes('127.0.0.1:3000')) {
    console.error('❌ [API] BASE_URL is pointing to Next.js server instead of AnythingLLM!')
    return NextResponse.json(
      { 
        error: 'Configuration error: NEXT_PUBLIC_ANYTHINGLLM_BASE_URL is pointing to your Next.js server (localhost:3000)',
        hint: 'AnythingLLM runs on a different port (usually 3001) or different URL. Update NEXT_PUBLIC_ANYTHINGLLM_BASE_URL to point to your AnythingLLM server, not your Next.js server.',
        currentValue: BASE_URL,
        examples: [
          'http://localhost:3001 (if AnythingLLM is running locally on port 3001)',
          'https://your-anythingllm-instance.com (if using cloud instance)',
        ]
      },
      { status: 500 }
    )
  }

  if (!API_KEY) {
    console.error('❌ [API] ANYTHINGLLM_API_KEY is not set!')
    return NextResponse.json(
      { 
        error: 'Server configuration error: ANYTHINGLLM_API_KEY is not set',
        hint: 'Please add ANYTHINGLLM_API_KEY to your .env.local file'
      },
      { status: 500 }
    )
  }
  
  try {
    // Get query parameter from URL
    const { searchParams } = new URL(request.url)
    const nameFilter = searchParams.get('name')

    const url = `${BASE_URL}/workspaces`

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('❌ [API] AnythingLLM API error:', text.substring(0, 500))
      
      // Check if it's HTML
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        return NextResponse.json(
          { 
            error: `AnythingLLM returned HTML instead of JSON. Check if the base URL is correct: ${BASE_URL}`,
            hint: 'The endpoint might be wrong or the server is returning an error page'
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { 
          error: `Failed to fetch workspaces: ${res.status} ${res.statusText}`,
          details: text.substring(0, 200)
        },
        { status: 500 }
      )
    }

    // Check content type
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      const text = await res.text()
      console.error('❌ [API] Response is not JSON:', text.substring(0, 500))
      return NextResponse.json(
        { 
          error: `Server returned ${contentType} instead of JSON`,
          details: text.substring(0, 200)
        },
        { status: 500 }
      )
    }

    const data = await res.json()
    
    // Handle different response formats - AnythingLLM returns { workspaces: [...] }
    let workspaces: any[] = []
    if (Array.isArray(data)) {
      workspaces = data
    } else if (data.workspaces && Array.isArray(data.workspaces)) {
      workspaces = data.workspaces
    } else if (data.data && Array.isArray(data.data)) {
      workspaces = data.data
    } else {
      console.error('❌ [API] Invalid response format:', typeof data, Object.keys(data))
      return NextResponse.json(
        { 
          error: 'Invalid response format from AnythingLLM',
          received: typeof data,
          keys: Object.keys(data),
          hint: 'Expected array or object with workspaces/data property'
        },
        { status: 500 }
      )
    }
    
    // If name filter is provided, find matching workspace
    if (nameFilter) {
      const match = workspaces.find((w: any) =>
        w.name && w.name.toLowerCase() === nameFilter.toLowerCase()
      )
      
      if (!match) {
        return NextResponse.json(
          { 
            error: `Workspace "${nameFilter}" not found`,
            available: workspaces.map((w: any) => w.name || w.id)
          },
          { status: 404 }
        )
      }
      
      return NextResponse.json(match)
    }

    // Return all workspaces
    return NextResponse.json(workspaces)
  } catch (err: any) {
    console.error('❌ [API] Server error:', err)
    console.error('Error name:', err.name)
    console.error('Error message:', err.message)
    console.error('Error stack:', err.stack)
    
    // Provide more specific error messages
    let errorMessage = 'Internal server error'
    if (err.message.includes('fetch failed')) {
      errorMessage = `Failed to connect to AnythingLLM at ${BASE_URL}. Check if the server is running and the URL is correct.`
    } else if (err.message) {
      errorMessage = err.message
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        type: err.name || 'UnknownError',
        hint: 'Check your terminal/server logs for more details'
      },
      { status: 500 }
    )
  }
}

