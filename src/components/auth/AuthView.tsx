'use client'

import { useState } from 'react'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, FileSearch, Brain, Bell } from 'lucide-react'

const features = [
  {
    icon: FileSearch,
    title: 'Document Tracking',
    description: 'Monitor policy documents across all Ugandan government departments in real time.',
  },
  {
    icon: Brain,
    title: 'AI-Powered Analysis',
    description: 'Automatically detect, classify, and assess the impact of policy changes.',
  },
  {
    icon: Bell,
    title: 'Smart Alerts',
    description: 'Get notified about changes that matter to your organization instantly.',
  },
]

export default function AuthView() {
  const [isLogin, setIsLogin] = useState(true)

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden bg-gradient-to-br from-background via-background to-accent">
      {/* Subtle grid pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Floating decorative shapes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/[0.07] blur-3xl dark:bg-primary/[0.05]" />
        <div className="absolute top-1/3 -left-16 w-72 h-72 rounded-full bg-primary/[0.05] blur-3xl dark:bg-primary/[0.04]" />
        <div className="absolute -bottom-32 right-1/4 w-80 h-80 rounded-full bg-teal-500/[0.06] blur-3xl dark:bg-teal-500/[0.04]" />
        <div className="absolute top-1/4 right-1/3 w-4 h-4 rounded-sm bg-primary/20 rotate-12 dark:bg-primary/10" />
        <div className="absolute bottom-1/4 left-1/4 w-3 h-3 rounded-full bg-primary/15 dark:bg-primary/10" />
        <div className="absolute top-2/3 right-1/5 w-5 h-5 rounded-sm bg-teal-500/15 -rotate-6 dark:bg-teal-500/10" />
      </div>

      {/* Left branded panel - desktop only */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] relative z-10 flex-col justify-center p-12 xl:p-16">
        <div className="space-y-10">
          {/* Logo & Tagline */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <ShieldCheck className="w-7 h-7 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-foreground">
                PolicyPulse
              </span>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-sm">
              Uganda&apos;s Policy Intelligence Platform
            </p>
          </div>

          {/* Divider */}
          <div className="w-16 h-px bg-primary/30" />

          {/* Feature bullets */}
          <div className="space-y-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="flex gap-4"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + index * 0.1 }}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - form area */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12">
        <div className="w-full max-w-[420px]">
          {/* Mobile-only compact header */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight">PolicyPulse</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Uganda&apos;s Policy Intelligence Platform
            </p>
          </div>

          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.25 }}
              >
                <LoginForm onSwitchToRegister={() => setIsLogin(false)} />
              </motion.div>
            ) : (
              <motion.div
                key="register"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.25 }}
              >
                <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
