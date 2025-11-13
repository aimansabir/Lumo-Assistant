import { NextResponse } from 'next/server'

const BASE_URL = process.env.NEXT_PUBLIC_ANYTHINGLLM_BASE_URL!
const API_KEY = process.env.ANYTHINGLLM_API_KEY!

export async function GET() {
  console.log('🧪 [TEST] Testing AnythingLLM connection...')
  console.log('🧪 [TEST] Base URL:', BASE_URL)
  console.log('🧪 [TEST] API Key present:', !!API_KEY)
  
  try {
    const url = `${BASE_URL}/workspaces`
    console.log('🧪 [TEST] Fetching from:', url)
    
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    console.log('🧪 [TEST] Response status:', res.status, res.statusText)

    if (!res.ok) {
      const errorText = await res.text()
      console.error('🧪 [TEST] Error response:', errorText)
      return NextResponse.json(
        {
          success: false,
          error: `HTTP ${res.status}: ${errorText}`,
          url,
        },
        { status: res.status }
      )
    }

    const data = await res.json()
    console.log('🧪 [TEST] Response data:', JSON.stringify(data, null, 2))

    return NextResponse.json({
      success: true,
      count: Array.isArray(data) ? data.length : data.workspaces?.length || 0,
      workspaces: Array.isArray(data) ? data : data.workspaces || data.data || [],
      raw: data,
    })
  } catch (error: any) {
    console.error('🧪 [TEST] Fetch error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to connect to AnythingLLM',
        hint: 'Make sure ANYTHINGLLM_API_KEY and NEXT_PUBLIC_ANYTHINGLLM_BASE_URL are set correctly in your .env file',
        url: `${BASE_URL}/workspaces`,
      },
      { status: 500 }
    )
  }
}
