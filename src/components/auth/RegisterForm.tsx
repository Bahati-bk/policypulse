'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

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
    <Card className="border-border/30 bg-card/80 backdrop-blur-xl shadow-xl shadow-black/[0.04] dark:shadow-black/[0.2]">
      <CardHeader className="space-y-1.5 pb-6">
        <CardTitle className="text-2xl font-bold tracking-tight">Create Account</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Join PolicyPulse to track policy changes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
            <Input
              id="name"
              placeholder="John Doe"
              {...register('name')}
              className="h-11"
            />
            {errors.name && (
              <p className="text-xs text-destructive mt-1.5">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-email" className="text-sm font-medium">Email</Label>
            <Input
              id="reg-email"
              type="email"
              placeholder="you@example.com"
              {...register('email')}
              className="h-11"
            />
            {errors.email && (
              <p className="text-xs text-destructive mt-1.5">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-phone" className="text-sm font-medium">
              Phone <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="reg-phone"
              placeholder="+256 700 000 000"
              {...register('phone')}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-password" className="text-sm font-medium">Password</Label>
            <Input
              id="reg-password"
              type="password"
              placeholder="Min 6 characters"
              {...register('password')}
              className="h-11"
            />
            {errors.password && (
              <p className="text-xs text-destructive mt-1.5">{errors.password.message}</p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full h-11 text-sm font-semibold transition-shadow hover:shadow-md hover:shadow-primary/20"
            disabled={loading}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
          {onSwitchToLogin && (
            <div className="text-center pt-1">
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline transition-colors"
                onClick={onSwitchToLogin}
              >
                Already have an account? Sign in
              </button>
            </div>
          )}
        </form>

        {/* Divider */}
        <div className="relative pt-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/50" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-transparent px-3 text-xs text-muted-foreground uppercase tracking-wider">
              Demo
            </span>
          </div>
        </div>

        {/* Demo hint */}
        <div className="rounded-lg border border-border/40 bg-muted/50 p-4 border-l-2 border-l-primary">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground/80">Tip:</span>{' '}
            Use demo credentials{' '}
            <span className="font-mono text-foreground/70">admin@policypulse.ug / password123</span>{' '}
            to explore all features.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
