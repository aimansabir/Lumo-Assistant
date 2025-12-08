import { NextResponse } from 'next/server'
import { sign } from '@/app/lib/admin-auth'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { id, password } = body || {}

    const envId = process.env.ADMIN_ID
    const envPw = process.env.ADMIN_PASSWORD

    if (!envId || !envPw) {
      return NextResponse.json({ message: 'Admin credentials not configured on server' }, { status: 500 })
    }

    if (id !== envId || password !== envPw) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 })
    }

    const token = sign({ sub: id }, 60 * 60 * 24 * 7) // 7 days

    const secureFlag = process.env.NODE_ENV === 'production' ? 'Secure' : ''
    const cookieStr = `admin_token=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Strict; ${secureFlag}`

    return NextResponse.json({ ok: true }, { status: 200, headers: { 'Set-Cookie': cookieStr } })
  } catch (err: any) {
    console.error('Login error', err)
    return NextResponse.json({ message: 'Login failed' }, { status: 500 })
  }
}
