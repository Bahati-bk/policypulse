import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { bcrypt, setSessionCookie } from '@/lib/auth'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(2).optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { email, name, password, phone } = parsed.data

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: { email: ['Email already registered'] } }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await db.user.create({
      data: { email, name, passwordHash, phone, role: 'USER' },
    })

    await db.userProfile.create({
      data: { userId: user.id },
    })

    const res = NextResponse.json({ id: user.id, email: user.email, name: user.name, role: user.role })
    setSessionCookie(res, user.id)
    return res
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
