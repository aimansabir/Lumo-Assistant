import { NextResponse } from 'next/server'

export async function POST() {
  // clear cookie by sending short-lived cookie
  const secureFlag = process.env.NODE_ENV === 'production' ? 'Secure' : ''
  const cookieStr = `admin_token=deleted; HttpOnly; Path=/; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict; ${secureFlag}`
  return NextResponse.json({ ok: true }, { status: 200, headers: { 'Set-Cookie': cookieStr } })
}
