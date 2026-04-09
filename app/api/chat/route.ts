import { NextResponse } from 'next/server'

const BASE_URL = process.env.NEXT_PUBLIC_ANYTHINGLLM_BASE_URL!
const API_KEY = process.env.ANYTHINGLLM_API_KEY!

export async function POST(request: Request) {
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
    const body = await request.json()
    const { workspaceId, message, history = [], threadId } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Workspace ID is required' },
        { status: 400 }
      )
    }

    // Prepare chat payload for AnythingLLM
    // AnythingLLM chat endpoint expects: { message, mode, history?, threadId? }
    // Use the same BASE_URL pattern as workspaces endpoint
    const payload: any = {
      message,
      mode: 'query', // 'query' or 'chat' depending on use-case
    }

    // Add threadId if provided (for thread-based conversations)
    if (threadId) {
      payload.threadId = threadId
    }

    // Add history if provided
    if (history && history.length > 0) {
      payload.history = history.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      }))
    }

    // Fetch workspace details to get slug (needed for some endpoint formats)
    let workspaceSlug: string | null = null
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
        const workspace = workspaces.find((w: any) => String(w.id) === String(workspaceId))
        if (workspace) {
          workspaceSlug = workspace.slug || workspace.name?.toLowerCase()
        }
      }
    } catch (err) {
      console.warn('⚠️ [API] Could not fetch workspace details for slug:', err)
    }

    // Try multiple endpoint formats
    const endpointFormats: string[] = []
    
    // 1. If we have both slug and threadId, prioritize the v1 API for threads
    if (workspaceSlug && threadId) {
      endpointFormats.push(`/v1/workspace/${workspaceSlug}/thread/${threadId}/chat`)
    }
    
    // 2. Legacy fallback formats
    endpointFormats.push(`/workspaces/${workspaceId}/chat`) // Standard format with ID
    if (workspaceSlug) {
      endpointFormats.push(
        `/workspace/${workspaceSlug}/chat`,  // Singular with slug
        `/workspaces/${workspaceSlug}/chat`   // Plural with slug
      )
    }

    let res: Response | null = null
    let rawResponseText = ''
    let triedUrl = ''
    let lastError: any = null

    // Try each endpoint format until one works
    for (const endpoint of endpointFormats) {
      const chatUrl = `${BASE_URL}${endpoint}`
      triedUrl = chatUrl

      try {
        res = await fetch(chatUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        // Read the response as text first to see what we're getting
        rawResponseText = await res.text()

        // If we got HTML, try next endpoint
        if (rawResponseText.trim().startsWith('<!DOCTYPE') || rawResponseText.trim().startsWith('<html')) {
          console.warn(`⚠️ [API] Endpoint ${endpoint} returned HTML, trying next format...`)
          continue
        }

        // If we got a valid JSON response (even if error), use this endpoint
        if (res.ok) {
          break
        }

        // For non-HTML errors, try to parse as JSON
        try {
          JSON.parse(rawResponseText)
          // If it parses as JSON, this is likely the right endpoint but with an error
          break
        } catch {
          // Not JSON, try next endpoint
          console.warn(`⚠️ [API] Endpoint ${endpoint} returned non-JSON error, trying next format...`)
          lastError = { status: res.status, text: rawResponseText.substring(0, 200) }
          continue
        }
      } catch (error: any) {
        console.warn(`⚠️ [API] Endpoint ${endpoint} failed:`, error.message)
        lastError = error
        continue
      }
    }

    // If all endpoints returned HTML or failed
    if (!res || (rawResponseText.trim().startsWith('<!DOCTYPE') || rawResponseText.trim().startsWith('<html'))) {
      console.error('❌ [API] All endpoint formats returned HTML or failed')
      return NextResponse.json(
        { 
          error: 'AnythingLLM returned HTML instead of JSON',
          hint: 'All endpoint formats returned HTML (likely 404 pages). The chat endpoint might not exist or use a different path structure.',
          triedUrls: endpointFormats.map(e => `${BASE_URL}${e}`),
          baseUrl: BASE_URL,
          workspaceId: workspaceId,
          workspaceSlug: workspaceSlug,
          possibleIssues: [
            'The chat endpoint path might be different in your AnythingLLM version',
            'Check AnythingLLM API documentation for the correct chat endpoint',
            'The endpoint might require different authentication or headers'
          ]
        },
        { status: 500 }
      )
    }

    if (!res.ok) {
      console.error('❌ [API] Chat error response:', rawResponseText.substring(0, 500))
      
      // Try to parse as JSON error
      try {
        const errorData = JSON.parse(rawResponseText)
        return NextResponse.json(
          { 
            error: errorData.error || errorData.message || `Failed to get response: ${res.status}`,
            details: errorData
          },
          { status: res.status }
        )
      } catch {
        return NextResponse.json(
          { 
            error: `Failed to get response: ${res.status} ${res.statusText}`,
            details: rawResponseText.substring(0, 200)
          },
          { status: res.status }
        )
      }
    }

    // Check content type
    const contentType = res.headers.get('content-type') || ''
    console.log('📥 [API] Response content-type:', contentType)
    console.log('📥 [API] Raw response snippet:', rawResponseText.substring(0, 1000))
    
    // Try to parse as JSON (rawResponseText was already read above)
    let data: any
    try {
      data = JSON.parse(rawResponseText)
      console.log('✅ [API] Successfully parsed JSON response')
    } catch (parseError) {
      console.error('❌ [API] Failed to parse as JSON. Content-Type:', contentType)
      console.error('❌ [API] Response body (first 1000 chars):', rawResponseText.substring(0, 1000))
      
      // If content-type says JSON but parsing failed, it's a real error
      if (contentType.includes('application/json')) {
        return NextResponse.json(
          { 
            error: 'Invalid JSON response from AnythingLLM',
            contentType: contentType,
            preview: rawResponseText.substring(0, 200),
            hint: 'The response might be malformed'
          },
          { status: 500 }
        )
      }
      
      // If not JSON content-type, return error
      return NextResponse.json(
        { 
          error: 'Server returned non-JSON response',
          contentType: contentType,
          preview: rawResponseText.substring(0, 200),
          hint: 'Check AnythingLLM API documentation for the correct chat endpoint format'
        },
        { status: 500 }
      )
    }

    // Handle different response formats from AnythingLLM
    let extractedResponse = ''
    if (typeof data === 'string') {
      // If data is a string, try to parse it as JSON first
      try {
        const parsed = JSON.parse(data)
        if (parsed.textResponse) {
          extractedResponse = parsed.textResponse
        } else if (parsed.response) {
          extractedResponse = parsed.response
        } else {
          extractedResponse = data
        }
      } catch {
        extractedResponse = data
      }
    } else if (data.textResponse) {
      // AnythingLLM textResponse format (most common)
      extractedResponse = data.textResponse
    } else if (data.response) {
      extractedResponse = data.response
    } else if (data.text) {
      extractedResponse = data.text
    } else if (data.message) {
      extractedResponse = data.message
    } else if (data.answer) {
      extractedResponse = data.answer
    } else if (data.content) {
      extractedResponse = data.content
    } else {
      // If it's an object but no known field, stringify it
      extractedResponse = JSON.stringify(data)
    }
    
    // Extract sources from the response
    const sources = data.sources || data.references || []


    return NextResponse.json({
      response: extractedResponse,
      sources: sources,
    })
  } catch (error: any) {
    console.error('❌ [API] Chat error:', error)
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    })
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to send chat message',
        type: error.name || 'UnknownError'
      },
      { status: 500 }
    )
  }
}

