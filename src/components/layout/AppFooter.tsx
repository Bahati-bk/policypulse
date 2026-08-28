'use client'

import { AlertTriangle } from 'lucide-react'

export default function AppFooter() {
  return (
    <footer className="mt-auto border-t border-border/50 bg-background/50 backdrop-blur-sm py-4" role="contentinfo">
      <div className="px-4 lg:px-6 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <p>Informational summary only. This does not constitute legal advice.</p>
        </div>
        <p className="text-center">
          © 2024 PolicyPulse. Built for Uganda&apos;s legal community.
        </p>
        <p className="text-muted-foreground/70">
          v1.0.0 · Open Source
        </p>
      </div>
    </footer>
  )
}
