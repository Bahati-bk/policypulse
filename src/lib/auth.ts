import bcrypt from 'bcryptjs'
import { db } from './db'
import { NextRequest, NextResponse } from 'next/server'

export interface SessionUser {
  id: string
  email: string
  name: string | null
  role: string
}

const SESSION_COOKIE = 'pp_session'

export function createSessionToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url')
  return payload
}

export function verifySessionToken(token: string): { userId: string } | null {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64url').toString())
    if (payload.exp && Date.now() > payload.exp) return null
    return { userId: payload.userId }
  } catch {
    return null
  }
}

export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) return null
  const session = verifySessionToken(token)
  if (!session) return null
  const user = await db.user.findUnique({ where: { id: session.userId } })
  if (!user || !user.passwordHash) return null
  return { id: user.id, email: user.email, name: user.name, role: user.role }
}

export function setSessionCookie(res: NextResponse, userId: string) {
  res.cookies.set(SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  })
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
}

export { bcrypt }
