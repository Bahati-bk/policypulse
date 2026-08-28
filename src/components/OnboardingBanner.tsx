'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'

const STORAGE_KEY = 'pp-onboarding-dismissed'

const tips = [
  { title: 'Welcome to PolicyPulse!' },
  { title: 'Upload policy documents to get started', desc: 'Go to Documents to upload PDF, DOCX, or TXT files for analysis.' },
  { title: 'Compare document versions', desc: 'Use Comparisons to detect changes between old and new policy versions.' },
  { title: 'AI-powered impact analysis', desc: 'Each comparison automatically generates severity assessments and action items.' },
  { title: 'Stay informed with alerts', desc: 'Get notified about policy changes that affect your organization.' },
]

function getInitialShowState(): boolean {
  if (typeof window === 'undefined') return false
  return !localStorage.getItem(STORAGE_KEY)
}

export default function OnboardingBanner() {
  const [showBanner, setShowBanner] = useState(getInitialShowState)
  const [dismissed, setDismissed] = useState(false)
  const [step, setStep] = useState(0)
  const user = useAppStore(s => s.user)
  const setView = useAppStore(s => s.setView)

  const visible = showBanner && !!user && !dismissed

  function handleDismiss() {
    setDismissed(true)
    setShowBanner(false)
    localStorage.setItem(STORAGE_KEY, '1')
  }

  function next() {
    if (step < tips.length - 1) {
      setStep(step + 1)
    } else {
      handleDismiss()
    }
  }

  function handleAction() {
    if (step === 1) setView('documents')
    else if (step === 2) setView('comparisons')
    else if (step === 3) setView('comparisons')
    else if (step === 4) setView('alerts')
    handleDismiss()
  }

  if (!visible) return null

  const tip = tips[step]
  const isLast = step === tips.length - 1

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.98 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="mb-6 relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/[0.07] via-primary/[0.04] to-teal-500/[0.06]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">{tip.title}</h3>
                {tip.desc && (
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{tip.desc}</p>
                )}
                <div className="flex items-center gap-1.5 mt-3">
                  {tips.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === step ? 'w-6 bg-primary' : i < step ? 'w-1.5 bg-primary/40' : 'w-1.5 bg-primary/15'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 rounded-lg hover:bg-accent/60"
              onClick={handleDismiss}
              aria-label="Dismiss onboarding"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-primary/10">
            {step > 0 ? (
              <button onClick={() => setStep(step - 1)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                ← Back
              </button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              {step > 0 && step <= 4 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 gap-1"
                  onClick={handleAction}
                >
                  Try it <ArrowRight className="h-3 w-3" />
                </Button>
              )}
              <Button
                size="sm"
                className="text-xs h-7 gap-1"
                onClick={next}
              >
                {isLast ? 'Get Started' : 'Next'} {!isLast && <ArrowRight className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
