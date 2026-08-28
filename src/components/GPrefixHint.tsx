'use client'

import { motion, AnimatePresence } from 'framer-motion'

type Hint = { key: string; label: string }

export default function GPrefixHint({
  visible,
  hints,
}: {
  visible: boolean
  hints: Hint[]
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          role="status"
          aria-label="Keyboard shortcut hints"
        >
          <div className="flex items-center gap-1 rounded-xl border bg-card/95 backdrop-blur-lg shadow-lg px-2 py-1.5">
            <span className="text-xs font-medium text-muted-foreground mr-1.5 pl-1">
              Go to:
            </span>
            {hints.map((h) => (
              <span
                key={h.key}
                className="flex items-center gap-1 rounded-md bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5"
              >
                <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/60 px-0.5 font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  {h.key}
                </kbd>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                  {h.label}
                </span>
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
