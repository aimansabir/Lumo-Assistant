import { NextResponse } from 'next/server'

export async function GET() {
  const BASE_URL = process.env.NEXT_PUBLIC_ANYTHINGLLM_BASE_URL
  const API_KEY = process.env.ANYTHINGLLM_API_KEY

  return NextResponse.json({
    baseUrl: BASE_URL || 'NOT SET',
    baseUrlType: typeof BASE_URL,
    apiKeyPresent: !!API_KEY,
    apiKeyLength: API_KEY ? API_KEY.length : 0,
    fullUrl: BASE_URL ? `${BASE_URL}/workspaces` : 'N/A',
    envCheck: {
      hasNextPublicBaseUrl: !!process.env.NEXT_PUBLIC_ANYTHINGLLM_BASE_URL,
      hasApiKey: !!process.env.ANYTHINGLLM_API_KEY,
    },
  })
}






