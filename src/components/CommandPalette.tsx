'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  ScrollText,
  FileText,
  GitCompareArrows,
  Bell,
  User,
  Tags,
  ClipboardList,
  Search,
  Inbox,
  Users,
} from 'lucide-react'
import { useAppStore, type ViewType } from '@/lib/store'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'

interface NavItem {
  view: ViewType
  label: string
  icon: React.ElementType
  adminOnly?: boolean
}

interface FetchedDocument {
  id: string
  title: string
  version?: string | null
  processingStatus?: string | null
}

interface FetchedPolicy {
  id: string
  title: string
  type?: string | null
}

const NAV_ITEMS: NavItem[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'policies', label: 'Policies', icon: ScrollText },
  { view: 'documents', label: 'Documents', icon: FileText },
  { view: 'comparisons', label: 'Comparisons', icon: GitCompareArrows },
  { view: 'alerts', label: 'Alerts', icon: Bell },
  { view: 'notifications', label: 'Notifications', icon: Inbox },
  { view: 'profile', label: 'Profile', icon: User },
  { view: 'categories', label: 'Categories', icon: Tags, adminOnly: true },
  { view: 'audit-log', label: 'Audit Log', icon: ClipboardList, adminOnly: true },
  { view: 'users', label: 'Users', icon: Users, adminOnly: true },
]

const VIEW_LABELS: Record<ViewType, string> = {
  dashboard: 'Dashboard',
  policies: 'Policies',
  documents: 'Documents',
  comparisons: 'Comparisons',
  alerts: 'Alerts',
  notifications: 'Notifications',
  profile: 'Profile',
  categories: 'Categories',
  'audit-log': 'Audit Log',
  users: 'Users',
  auth: 'Auth',
}

const STORAGE_KEY = 'pp-recent-views'

function getRecentViews(): ViewType[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? (JSON.parse(stored) as ViewType[]) : []
  } catch {
    return []
  }
}

function saveRecentView(view: ViewType) {
  try {
    const recent = getRecentViews().filter((v) => v !== view)
    const updated = [view, ...recent].slice(0, 3)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    return updated
  } catch {
    return []
  }
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [allDocuments, setAllDocuments] = useState<FetchedDocument[]>([])
  const [allPolicies, setAllPolicies] = useState<FetchedPolicy[]>([])
  const [recentViews, setRecentViews] = useState<ViewType[]>([])
  const [isLoadingData, setIsLoadingData] = useState(false)
  const dataFetchedRef = useRef(false)

  const { setView, user, currentView } = useAppStore()

  const isAdmin = user?.role === 'ADMIN'

  // Track recent views when currentView changes
  useEffect(() => {
    if (currentView === 'auth' || !user) return
    const updated = saveRecentView(currentView)
    setRecentViews(updated)
  }, [currentView, user])

  // Load recent views on mount
  useEffect(() => {
    setRecentViews(getRecentViews())
  }, [])

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Listen for 'open-command-palette' custom event
  useEffect(() => {
    const handleOpen = () => setOpen(true)
    window.addEventListener('open-command-palette', handleOpen)
    return () => window.removeEventListener('open-command-palette', handleOpen)
  }, [])

  // Fetch documents and policies once when palette first opens
  const fetchData = useCallback(async () => {
    if (dataFetchedRef.current) return
    setIsLoadingData(true)
    try {
      const [docRes, polRes] = await Promise.all([
        fetch('/api/documents').then((r) => (r.ok ? r.json() : [])),
        fetch('/api/policies').then((r) => (r.ok ? r.json() : [])),
      ])
      setAllDocuments(Array.isArray(docRes) ? docRes : [])
      setAllPolicies(Array.isArray(polRes) ? polRes : [])
      dataFetchedRef.current = true
    } catch {
      setAllDocuments([])
      setAllPolicies([])
    } finally {
      setIsLoadingData(false)
    }
  }, [])

  // Fetch data when dialog opens
  useEffect(() => {
    if (open && user) {
      fetchData()
      setRecentViews(getRecentViews())
    }
    if (open) {
      setSearch('')
    }
  }, [open, user, fetchData])

  // Filter documents and policies based on search
  const query = search.toLowerCase().trim()
  const filteredDocuments = query
    ? allDocuments
        .filter(
          (d) =>
            d.title?.toLowerCase().includes(query) ||
            d.version?.toLowerCase().includes(query),
        )
        .slice(0, 5)
    : []

  const filteredPolicies = query
    ? allPolicies
        .filter(
          (p) =>
            p.title?.toLowerCase().includes(query) ||
            p.type?.toLowerCase().includes(query),
        )
        .slice(0, 5)
    : []

  const hasSearchResults =
    query.length > 0 && (filteredDocuments.length > 0 || filteredPolicies.length > 0)
  const hasRecent = recentViews.length > 0 && query.length === 0

  const handleNavSelect = useCallback(
    (view: ViewType) => {
      setView(view)
      setOpen(false)
    },
    [setView],
  )

  const handleDocSelect = useCallback(() => {
    setView('documents')
    setOpen(false)
  }, [setView])

  const handlePolSelect = useCallback(() => {
    setView('policies')
    setOpen(false)
  }, [setView])

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || isAdmin,
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogHeader className="sr-only">
        <DialogTitle>Command Palette</DialogTitle>
        <DialogDescription>
          Search for views, documents, and policies
        </DialogDescription>
      </DialogHeader>
      <DialogContent
        className="overflow-hidden p-0 max-w-lg"
        showCloseButton={false}
      >
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
            <CommandInput
              placeholder="Search views, documents, policies..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="max-h-80">
              <CommandEmpty>
                {isLoadingData ? (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                    >
                      <Search className="size-4" />
                    </motion.div>
                    <span>Loading...</span>
                  </div>
                ) : (
                  'No results found.'
                )}
              </CommandEmpty>

              {/* Recent Views — only when no search query */}
              {hasRecent && (
                <>
                  <CommandGroup heading="Recent">
                    {recentViews.map((view) => {
                      const item = NAV_ITEMS.find((n) => n.view === view)
                      if (!item) return null
                      const Icon = item.icon
                      return (
                        <CommandItem
                          key={`recent-${view}`}
                          value={`recent-${view}`}
                          onSelect={() => handleNavSelect(view)}
                        >
                          <Icon className="size-4 text-emerald-600 dark:text-emerald-400" />
                          <span>{VIEW_LABELS[view]}</span>
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              {/* Navigation */}
              <CommandGroup heading="Navigation">
                {visibleNavItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <CommandItem
                      key={item.view}
                      value={`nav-${item.label.toLowerCase()}`}
                      onSelect={() => handleNavSelect(item.view)}
                    >
                      <Icon className="size-4 text-emerald-600 dark:text-emerald-400" />
                      <span>{item.label}</span>
                      {item.adminOnly && (
                        <CommandShortcut className="text-amber-600 dark:text-amber-400">
                          Admin
                        </CommandShortcut>
                      )}
                    </CommandItem>
                  )
                })}
              </CommandGroup>

              {/* Search Results — Documents */}
              {filteredDocuments.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Documents">
                    {filteredDocuments.map((doc) => (
                      <CommandItem
                        key={`doc-${doc.id}`}
                        value={`doc-${doc.title}`}
                        onSelect={handleDocSelect}
                      >
                        <FileText className="size-4 text-teal-600 dark:text-teal-400" />
                        <span className="truncate">{doc.title}</span>
                        {doc.version && (
                          <CommandShortcut>v{doc.version}</CommandShortcut>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {/* Search Results — Policies */}
              {filteredPolicies.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Policies">
                    {filteredPolicies.map((pol) => (
                      <CommandItem
                        key={`pol-${pol.id}`}
                        value={`pol-${pol.title}`}
                        onSelect={handlePolSelect}
                      >
                        <ScrollText className="size-4 text-teal-600 dark:text-teal-400" />
                        <span className="truncate">{pol.title}</span>
                        {pol.type && (
                          <CommandShortcut>{pol.type}</CommandShortcut>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>

            {/* Footer with keyboard hints */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.2 }}
              className="border-t px-3 py-2 flex items-center gap-4 text-xs text-muted-foreground overflow-x-auto"
            >
              <span className="flex items-center gap-1 shrink-0">
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted/50 px-1.5 font-mono text-[10px] font-medium">
                  {typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl+'}K
                </kbd>
                <span>Toggle</span>
              </span>
              <span className="flex items-center gap-1 shrink-0">
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted/50 px-1.5 font-mono text-[10px] font-medium">
                  ↑↓
                </kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1 shrink-0">
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted/50 px-1.5 font-mono text-[10px] font-medium">
                  ↵
                </kbd>
                <span>Select</span>
              </span>
              <span className="flex items-center gap-1 shrink-0">
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted/50 px-1.5 font-mono text-[10px] font-medium">
                  esc
                </kbd>
                <span>Close</span>
              </span>
            </motion.div>
          </Command>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
