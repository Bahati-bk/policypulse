'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, ShieldCheck, Heart, Keyboard, Globe } from 'lucide-react'

export default function AppFooter() {
  return (
    <motion.footer
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="mt-auto border-t-0 bg-gradient-to-t from-muted/20 to-transparent"
      role="contentinfo"
    >
      {/* Gradient separator line above footer */}
      <div className="h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="px-4 lg:px-6 py-3">
        {/* Disclaimer bar */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/5 border border-amber-500/10 mb-3">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500/80 animate-[dot-pulse_1.5s_ease-in-out_infinite]" />
          <p className="text-[11px] text-amber-700 dark:text-amber-400/80 leading-relaxed">
            <span className="font-medium">Disclaimer:</span> Informational summary only. This does not constitute legal advice. Always consult a qualified legal professional.
          </p>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary/60" />
              <span className="font-medium">{'© '}{new Date().getFullYear()} PolicyPulse</span>
            </div>
            <span className="text-border">·</span>
            <div className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              <span>Uganda</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.dispatchEvent(new Event('open-keyboard-shortcuts-help'))}
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <Keyboard className="h-3 w-3" />
              <span>Shortcuts</span>
            </button>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1">
              Built with <Heart className="h-3 w-3 text-rose-400" /> for Uganda
            </span>
            <span className="text-border">·</span>
            <span className="text-muted-foreground/60">v1.3.0</span>
          </div>
        </div>
      </div>
    </motion.footer>
  )
}
