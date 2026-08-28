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

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginData = z.infer<typeof loginSchema>

interface LoginFormProps {
  onSwitchToRegister?: () => void
}

export default function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const setUser = useAppStore(s => s.setUser)
  const queryClient = useQueryClient()

  const { register, handleSubmit, formState: { errors } } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginData) {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Login failed')
      queryClient.clear()
      setUser(result)
      useAppStore.getState().setView('dashboard')
      toast.success('Welcome back!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed')
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
            <CardTitle className="text-2xl font-bold tracking-tight">Sign In</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Enter your credentials to access PolicyPulse
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@organization.com"
                  autoComplete="email"
                  autoFocus
                  {...register('email')}
                  className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                />
                {errors.email && (
                  <p className="text-xs text-destructive mt-1.5 animate-fade-in-up">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  {...register('password')}
                  className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                />
                {errors.password && (
                  <p className="text-xs text-destructive mt-1.5 animate-fade-in-up">{errors.password.message}</p>
                )}
              </div>

              {/* Remember me + Forgot password row */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <Checkbox
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors select-none">
                    Remember me
                  </span>
                </label>
                <a
                  href="#"
                  className="text-sm text-primary/80 hover:text-primary transition-colors hover:underline underline-offset-2"
                >
                  Forgot password?
                </a>
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
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </Button>
              {onSwitchToRegister && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline transition-colors"
                    onClick={onSwitchToRegister}
                  >
                    Don&apos;t have an account? Create one
                  </button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
    </motion.div>
  )
}
