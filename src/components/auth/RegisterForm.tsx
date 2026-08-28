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
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const registerSchema = z.object({
  email: z.string().email('Enter a valid email'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  organization: z.string().optional(),
  jobTitle: z.string().optional(),
  phone: z.string().optional(),
  termsAccepted: z.boolean().refine(val => val === true, 'You must accept the terms of service'),
})

type RegisterData = z.infer<typeof registerSchema>

interface RegisterFormProps {
  onSwitchToLogin?: () => void
}

function getPasswordStrength(password: string) {
  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 10) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return score // 0-5
}

function PasswordStrengthBar({ password }: { password: string }) {
  const strength = getPasswordStrength(password)
  if (!password) return null

  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent']
  const colors = [
    'bg-red-500',
    'bg-red-500',
    'bg-amber-500',
    'bg-amber-400',
    'bg-emerald-500',
    'bg-emerald-400',
  ]
  const bgColors = [
    'bg-red-500/20',
    'bg-red-500/20',
    'bg-amber-500/20',
    'bg-amber-400/20',
    'bg-emerald-500/20',
    'bg-emerald-400/20',
  ]

  return (
    <div className="space-y-1.5 animate-fade-in-up">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-all duration-300',
              i <= strength ? colors[strength] : 'bg-muted'
            )}
          />
        ))}
      </div>
      <p className={cn('text-[11px] font-medium transition-colors',
        strength <= 1 ? 'text-red-500' :
        strength <= 3 ? 'text-amber-500' :
        'text-emerald-500'
      )}>
        {labels[strength]}
      </p>
    </div>
  )
}

export default function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const [loading, setLoading] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [passwordValue, setPasswordValue] = useState('')
  const setUser = useAppStore(s => s.setUser)
  const queryClient = useQueryClient()

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterData>({    resolver: zodResolver(registerSchema),
    defaultValues: { termsAccepted: false },
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
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
                  className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                />
                {errors.name && (
                  <p className="text-xs text-destructive mt-1.5 animate-fade-in-up">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-email" className="text-sm font-medium">Email</Label>
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="you@example.com"
                  {...register('email')}
                  className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                />
                {errors.email && (
                  <p className="text-xs text-destructive mt-1.5 animate-fade-in-up">{errors.email.message}</p>
                )}
              </div>

              {/* Organization and Job Title - side by side on larger screens */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="org" className="text-sm font-medium">
                    Organization <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="org"
                    placeholder="Ministry of Justice"
                    {...register('organization')}
                    className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job-title" className="text-sm font-medium">
                    Job Title <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="job-title"
                    placeholder="Policy Analyst"
                    {...register('jobTitle')}
                    className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-phone" className="text-sm font-medium">
                  Phone <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="reg-phone"
                  placeholder="+256 700 000 000"
                  {...register('phone')}
                  className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password" className="text-sm font-medium">Password</Label>
                <Input
                  id="reg-password"
                  type="password"
                  placeholder="Min 6 characters"
                  {...register('password', {
                    onChange: (e) => setPasswordValue(e.target.value),
                  })}
                  className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                />
                <PasswordStrengthBar password={passwordValue} />
                {errors.password && (
                  <p className="text-xs text-destructive mt-1.5 animate-fade-in-up">{errors.password.message}</p>
                )}
              </div>

              {/* Terms of service checkbox */}
              <div className="space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer group">
                  <Checkbox
                    checked={termsAccepted}
                    onCheckedChange={(checked) => {
                      setTermsAccepted(checked === true)
                    }}
                    className="h-4 w-4 mt-0.5"
                    {...register('termsAccepted')}
                  />
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors leading-relaxed select-none">
                    I agree to the{' '}
                    <a href="#" className="text-primary hover:underline underline-offset-2">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="#" className="text-primary hover:underline underline-offset-2">
                      Privacy Policy
                    </a>
                  </span>
                </label>
                {errors.termsAccepted && (
                  <p className="text-xs text-destructive ml-6.5 animate-fade-in-up">{errors.termsAccepted.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className={cn(
                  'w-full h-11 text-sm font-semibold transition-all duration-300',
                  loading
                    ? 'bg-primary/90 shadow-none cursor-wait'
                    : 'hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.01] active:scale-[0.99]'
                )}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <span>Create Account</span>
                )}
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
    </motion.div>
  )
}
