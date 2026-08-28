'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAppStore, type ViewType } from '@/lib/store'

interface ShortcutEntry {
  keys: string
  label: string
  description: string
}

const G_SHORTCUTS: Record<string, ViewType> = {
  d: 'dashboard',
  p: 'policies',
  o: 'documents',
  c: 'comparisons',
  a: 'alerts',
  n: 'notifications',
  u: 'profile',
}

const G_HINTS: { key: string; label: string }[] = [
  { key: 'd', label: 'Dashboard' },
  { key: 'p', label: 'Policies' },
  { key: 'o', label: 'Documents' },
  { key: 'c', label: 'Comparisons' },
  { key: 'a', label: 'Alerts' },
  { key: 'n', label: 'Notifications' },
  { key: 'u', label: 'Profile' },
]

const ALL_SHORTCUTS: ShortcutEntry[] = [
  { keys: 'g d', label: 'Dashboard', description: 'Go to Dashboard' },
  { keys: 'g p', label: 'Policies', description: 'Go to Policies' },
  { keys: 'g o', label: 'Documents', description: 'Go to Documents' },
  { keys: 'g c', label: 'Comparisons', description: 'Go to Comparisons' },
  { keys: 'g a', label: 'Alerts', description: 'Go to Alerts' },
  { keys: 'g n', label: 'Notifications', description: 'Go to Notifications' },
  { keys: 'g u', label: 'Profile', description: 'Go to Profile' },
  { keys: '?', label: 'Command Palette', description: 'Open command palette & shortcuts help' },
  { keys: 'Ctrl+K', label: 'Command Palette', description: 'Toggle command palette' },
]

function isInputElement(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false
  const tag = el.tagName.toLowerCase()
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    el.isContentEditable
  )
}

export function useKeyboardShortcuts() {
  const setView = useAppStore((s) => s.setView)
  const [gHintVisible, setGHintVisible] = useState(false)
  const gTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearGTimer = useCallback(() => {
    if (gTimerRef.current) {
      clearTimeout(gTimerRef.current)
      gTimerRef.current = null
    }
  }, [])

  const dismissGHint = useCallback(() => {
    clearGTimer()
    setGHintVisible(false)
  }, [clearGTimer])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore events when typing in inputs
      if (isInputElement(e.target)) return

      // Ignore modifier combos (except for ? which has none)
      if (e.ctrlKey || e.metaKey || e.altKey) return

      const key = e.key.toLowerCase()

      // ? key → open command palette
      if (key === '?') {
        e.preventDefault()
        dismissGHint()
        window.dispatchEvent(new CustomEvent('open-command-palette'))
        window.dispatchEvent(new CustomEvent('open-keyboard-shortcuts-help'))
        return
      }

      // 'g' prefix logic
      if (key === 'g') {
        e.preventDefault()
        dismissGHint()
        setGHintVisible(true)
        gTimerRef.current = setTimeout(() => {
          setGHintVisible(false)
          gTimerRef.current = null
        }, 500)
        return
      }

      // If g hint is visible, check for second key
      if (gHintVisible && G_SHORTCUTS[key]) {
        e.preventDefault()
        dismissGHint()
        setView(G_SHORTCUTS[key])
        return
      }

      // Any other key while g hint is visible → dismiss
      if (gHintVisible) {
        dismissGHint()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      dismissGHint()
    }
  }, [setView, gHintVisible, dismissGHint])

  // Render the floating g-hint
  return { gHintVisible, hints: G_HINTS, allShortcuts: ALL_SHORTCUTS }
}

export type { ShortcutEntry }
