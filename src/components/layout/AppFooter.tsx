'use client'

import { AlertTriangle, ShieldCheck, Heart } from 'lucide-react'

export default function AppFooter() {
  return (
    <footer className="mt-auto border-t border-border/50 bg-muted/30 backdrop-blur-sm py-3" role="contentinfo">
      <div className="px-4 lg:px-6 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <p>Informational summary only. This does not constitute legal advice.</p>
        </div>
        <p className="text-center flex items-center gap-1.5">
          <ShieldCheck className="h-3 w-3 text-primary/60" />
          {'© '}{new Date().getFullYear()} PolicyPulse
        </p>
        <p className="flex items-center gap-1 text-muted-foreground/60">
          Built with <Heart className="h-3 w-3 text-rose-400" /> for Uganda
          <span className="mx-1.5 text-border">|</span>
          v1.1.0
        </p>
      </div>
    </footer>
  )
}
