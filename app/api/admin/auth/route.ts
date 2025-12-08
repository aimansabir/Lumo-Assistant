import { NextResponse } from 'next/server'
import { verify, getTokenFromRequest } from '@/app/lib/admin-auth'

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req)
    if (!token) return NextResponse.json({ auth: false }, { status: 401 })

    const payload = verify(token)
    if (!payload) return NextResponse.json({ auth: false }, { status: 401 })

    return NextResponse.json({ auth: true, id: payload.sub }, { status: 200 })
  } catch (err) {
    console.error('Auth check failed', err)
    return NextResponse.json({ auth: false }, { status: 401 })
  }
}
