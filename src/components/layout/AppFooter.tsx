'use client'

import { AlertTriangle } from 'lucide-react'

export default function AppFooter() {
  return (
    <footer className="mt-auto border-t border-border/50 bg-background/50 backdrop-blur-sm" role="contentinfo">
      <div className="px-4 lg:px-6 py-3 flex items-center gap-2 text-xs text-muted-foreground">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
        <p>Informational summary only. This does not constitute legal advice.</p>
      </div>
    </footer>
  )
}
