'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  LayoutDashboard,
  ScrollText,
  FileText,
  GitCompareArrows,
  Bell,
  Inbox,
  User,
  Command,
  Keyboard,
} from 'lucide-react'
import type { ShortcutEntry } from '@/hooks/useKeyboardShortcuts'

const SHORTCUTS: (ShortcutEntry & { icon: React.ElementType })[] = [
  { keys: 'g d', label: 'Dashboard', description: 'Go to Dashboard', icon: LayoutDashboard },
  { keys: 'g p', label: 'Policies', description: 'Go to Policies', icon: ScrollText },
  { keys: 'g o', label: 'Documents', description: 'Go to Documents', icon: FileText },
  { keys: 'g c', label: 'Comparisons', description: 'Go to Comparisons', icon: GitCompareArrows },
  { keys: 'g a', label: 'Alerts', description: 'Go to Alerts', icon: Bell },
  { keys: 'g n', label: 'Notifications', description: 'Go to Notifications', icon: Inbox },
  { keys: 'g u', label: 'Profile', description: 'Go to Profile', icon: User },
  { keys: '?', label: 'Command Palette', description: 'Open command palette & shortcuts', icon: Command },
  { keys: 'Ctrl+K', label: 'Command Palette', description: 'Toggle command palette', icon: Keyboard },
]

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="pointer-events-none inline-flex h-6 min-w-6 select-none items-center justify-center gap-0.5 rounded border border-border bg-muted/60 px-1.5 font-mono text-[11px] font-medium text-muted-foreground">
      {children}
    </kbd>
  )
}

function KeyCombo({ shortcut }: { shortcut: string }) {
  const parts = shortcut.split(' ')
  return (
    <span className="flex items-center gap-1">
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-muted-foreground/50 text-[10px]">then</span>}
          <Kbd>{part}</Kbd>
        </span>
      ))}
    </span>
  )
}

export default function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false)

  const handleClose = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen)
  }, [])

  useEffect(() => {
    const handleOpen = () => setOpen(true)
    window.addEventListener('open-keyboard-shortcuts-help', handleOpen)
    return () => window.removeEventListener('open-keyboard-shortcuts-help', handleOpen)
  }, [])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogHeader className="sr-only">
        <DialogTitle>Keyboard Shortcuts</DialogTitle>
        <DialogDescription>View all available keyboard shortcuts</DialogDescription>
      </DialogHeader>
      <DialogContent className="sm:max-w-md">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center justify-center size-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
              <Keyboard className="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Keyboard Shortcuts</h2>
              <p className="text-sm text-muted-foreground">
                Navigate faster with vim-style <Kbd>g</Kbd> prefixes
              </p>
            </div>
          </div>

          {/* Navigation Shortcuts */}
          <div className="mb-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2 px-1">
              Navigation
            </h3>
            <div className="rounded-lg border bg-muted/20 divide-y">
              {SHORTCUTS.filter((s) => !s.keys.startsWith('?') && s.keys !== 'Ctrl+K').map((s) => {
                const Icon = s.icon
                return (
                  <div
                    key={s.keys}
                    className="flex items-center justify-between px-3 py-2.5 gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-sm font-medium truncate">{s.label}</span>
                    </div>
                    <KeyCombo shortcut={s.keys} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Other Shortcuts */}
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2 px-1">
              General
            </h3>
            <div className="rounded-lg border bg-muted/20 divide-y">
              {SHORTCUTS.filter((s) => s.keys.startsWith('?') || s.keys === 'Ctrl+K').map((s) => {
                const Icon = s.icon
                return (
                  <div
                    key={s.keys}
                    className="flex items-center justify-between px-3 py-2.5 gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="size-4 text-teal-600 dark:text-teal-400 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-sm font-medium">{s.label}</span>
                        <p className="text-xs text-muted-foreground truncate">{s.description}</p>
                      </div>
                    </div>
                    <KeyCombo shortcut={s.keys} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Footer tip */}
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground px-1">
            <Kbd>g</Kbd>
            <span>
              prefix times out after 500ms. Shortcuts are disabled when typing in
              input fields.
            </span>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
