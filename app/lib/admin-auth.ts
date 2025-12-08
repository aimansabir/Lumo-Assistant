import crypto from 'crypto'

const ADMIN_SECRET = process.env.ADMIN_JWT_SECRET || process.env.SECRET || 'dev-secret'

function base64UrlEncode(str: string) {
  return Buffer.from(str).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function base64UrlDecode(str: string) {
  // padding
  let s = str.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  return Buffer.from(s, 'base64').toString()
}

export function sign(payload: Record<string, any>, expiresInSeconds = 60 * 60 * 24) {
  // simple signed token: base64(header).base64(payload).signature
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const body = { ...payload, iat: now, exp: now + expiresInSeconds }

  const headerB64 = base64UrlEncode(JSON.stringify(header))
  const payloadB64 = base64UrlEncode(JSON.stringify(body))
  const data = `${headerB64}.${payloadB64}`
  const sig = crypto.createHmac('sha256', ADMIN_SECRET).update(data).digest('hex')
  return `${data}.${sig}`
}

export function verify(token: string) {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, payload, sig] = parts
  const data = `${header}.${payload}`
  const expected = crypto.createHmac('sha256', ADMIN_SECRET).update(data).digest('hex')
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null

  try {
    const payloadStr = base64UrlDecode(payload)
    const payloadObj = JSON.parse(payloadStr)
    const now = Math.floor(Date.now() / 1000)
    if (payloadObj.exp && payloadObj.exp < now) return null
    return payloadObj
  } catch (e) {
    return null
  }
}

export function parseCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null
  const cookies = cookieHeader.split(';').map(c => c.trim())
  for (const cookie of cookies) {
    const [k, ...v] = cookie.split('=')
    if (k === name) return v.join('=')
  }
  return null
}

export function getTokenFromRequest(req: Request) {
  const cookieHeader = req.headers.get('cookie')
  return parseCookieValue(cookieHeader, 'admin_token')
}

export function isRequestAdmin(req: Request) {
  const token = getTokenFromRequest(req)
  if (!token) return false
  return !!verify(token)
}
