'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldCheck } from 'lucide-react'

const registerSchema = z.object({
  email: z.string().email('Enter a valid email'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
})

type RegisterData = z.infer<typeof registerSchema>

interface RegisterFormProps {
  onSwitchToLogin?: () => void
}

export default function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const [loading, setLoading] = useState(false)
  const setUser = useAppStore(s => s.setUser)
  const queryClient = useQueryClient()

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
  })

  async function onSubmit(data: RegisterData) {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!res.ok) {
        const fieldErrors = result.error
        if (typeof fieldErrors === 'object' && fieldErrors !== null) {
          const first = Object.values(fieldErrors)[0]
          if (Array.isArray(first)) throw new Error(first[0])
        }
        throw new Error('Registration failed')
      }
      setUser(result)
      queryClient.clear()
      toast.success('Account created!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <Card className="border-border/50 shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>Join PolicyPulse to track policy changes</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="John Doe" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-email">Email</Label>
              <Input id="reg-email" type="email" placeholder="you@example.com" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-phone">Phone (optional)</Label>
              <Input id="reg-phone" placeholder="+256 700 000 000" {...register('phone')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password">Password</Label>
              <Input id="reg-password" type="password" placeholder="Min 6 characters" {...register('password')} />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
            {onSwitchToLogin && (
              <div className="text-center">
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
                  onClick={onSwitchToLogin}
                >
                  Already have an account? Sign in
                </button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}