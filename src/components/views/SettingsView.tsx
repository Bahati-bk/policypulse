'use client'

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Palette,
  Bell,
  Database,
  Info,
  Sun,
  Moon,
  Monitor,
  Download,
  Trash2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Clock,
} from 'lucide-react'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }

// --- Types ---

type AccentColor = 'emerald' | 'teal' | 'amber' | 'rose' | 'slate'
type FontSize = 'small' | 'medium' | 'large'

interface AppearanceSettings {
  accent: AccentColor
  fontSize: FontSize
  compact: boolean
}

interface NotificationSettings {
  delivery: 'in-app' | 'email' | 'both'
  notifyNewAlerts: boolean
  notifyComparisonComplete: boolean
  notifyMention: boolean
  quietStart: string
  quietEnd: string
  quietEnabled: boolean
}

// --- Accent color config ---

const ACCENT_COLORS: { value: AccentColor; label: string; color: string; ring: string }[] = [
  { value: 'emerald', label: 'Emerald', color: 'bg-emerald-500', ring: 'ring-emerald-500' },
  { value: 'teal', label: 'Teal', color: 'bg-teal-500', ring: 'ring-teal-500' },
  { value: 'amber', label: 'Amber', color: 'bg-amber-500', ring: 'ring-amber-500' },
  { value: 'rose', label: 'Rose', color: 'bg-rose-500', ring: 'ring-rose-500' },
  { value: 'slate', label: 'Slate', color: 'bg-slate-500', ring: 'ring-slate-500' },
]

const FONT_SIZES: { value: FontSize; label: string; size: string }[] = [
  { value: 'small', label: 'Small', size: '14px' },
  { value: 'medium', label: 'Medium', size: '16px' },
  { value: 'large', label: 'Large', size: '18px' },
]

// --- Helpers ---

function getFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore storage errors
  }
}

// --- Theme icon component ---

function ThemeIcon({ theme }: { theme: string }) {
  if (theme === 'dark') return <Moon className="h-4 w-4" />
  if (theme === 'light') return <Sun className="h-4 w-4" />
  return <Monitor className="h-4 w-4" />
}

// --- Main Component ---

export default function SettingsView() {
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  // Lazy initializers for localStorage defaults
  const defaultAppearance: AppearanceSettings = { accent: 'emerald', fontSize: 'medium', compact: false }
  const defaultNotifications: NotificationSettings = {
    delivery: 'in-app',
    notifyNewAlerts: true,
    notifyComparisonComplete: true,
    notifyMention: false,
    quietStart: '22:00',
    quietEnd: '08:00',
    quietEnabled: false,
  }

  // Appearance state
  const [accent, setAccent] = useState<AccentColor>(() => getFromStorage('policypulse-accent', defaultAppearance).accent)
  const [fontSize, setFontSize] = useState<FontSize>(() => getFromStorage('policypulse-accent', defaultAppearance).fontSize)
  const [compact, setCompact] = useState(() => getFromStorage('policypulse-accent', defaultAppearance).compact)

  // Notification state
  const [notifDelivery, setNotifDelivery] = useState<'in-app' | 'email' | 'both'>(() => getFromStorage('policypulse-notification-settings', defaultNotifications).delivery)
  const [notifyNewAlerts, setNotifyNewAlerts] = useState(() => getFromStorage('policypulse-notification-settings', defaultNotifications).notifyNewAlerts)
  const [notifyComparison, setNotifyComparison] = useState(() => getFromStorage('policypulse-notification-settings', defaultNotifications).notifyComparisonComplete)
  const [notifyMention, setNotifyMention] = useState(() => getFromStorage('policypulse-notification-settings', defaultNotifications).notifyMention)
  const [quietEnabled, setQuietEnabled] = useState(() => getFromStorage('policypulse-notification-settings', defaultNotifications).quietEnabled)
  const [quietStart, setQuietStart] = useState(() => getFromStorage('policypulse-notification-settings', defaultNotifications).quietStart)
  const [quietEnd, setQuietEnd] = useState(() => getFromStorage('policypulse-notification-settings', defaultNotifications).quietEnd)

  // Persist appearance settings
  useEffect(() => {
    if (!mounted) return
    const settings: AppearanceSettings = { accent, fontSize, compact }
    saveToStorage('policypulse-accent', settings)
  }, [accent, fontSize, compact, mounted])

  // Apply font size to root
  useEffect(() => {
    if (!mounted) return
    const sizeMap: Record<FontSize, string> = { small: '14px', medium: '16px', large: '18px' }
    document.documentElement.style.setProperty('--settings-font-size', sizeMap[fontSize])
  }, [fontSize, mounted])

  // Persist notification settings
  useEffect(() => {
    if (!mounted) return
    const settings: NotificationSettings = {
      delivery: notifDelivery,
      notifyNewAlerts,
      notifyComparisonComplete: notifyComparison,
      notifyMention,
      quietStart,
      quietEnd,
      quietEnabled,
    }
    saveToStorage('policypulse-notification-settings', settings)
  }, [notifDelivery, notifyNewAlerts, notifyComparison, notifyMention, quietStart, quietEnd, quietEnabled, mounted])

  // --- Export data handler ---
  const handleExportData = useCallback(async () => {
    try {
      const [profileRes, notifsRes, subsRes] = await Promise.allSettled([
        fetch('/api/profile').then(r => r.json()),
        fetch('/api/notifications').then(r => r.json()),
        fetch('/api/subscriptions').then(r => r.json()),
      ])

      const data = {
        exportedAt: new Date().toISOString(),
        profile: profileRes.status === 'fulfilled' ? profileRes.value : null,
        notifications: notifsRes.status === 'fulfilled' ? notifsRes.value : null,
        subscriptions: subsRes.status === 'fulfilled' ? subsRes.value : null,
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `policypulse-export-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Data exported successfully')
    } catch {
      toast.error('Failed to export data')
    }
  }, [])

  // --- Clear activity history ---
  const handleClearHistory = useCallback(() => {
    try {
      localStorage.removeItem('pp-recent-views')
      toast.success('Activity history cleared')
    } catch {
      toast.error('Failed to clear history')
    }
  }, [])

  // --- Live preview font size ---
  const previewFontSize = FONT_SIZES.find(f => f.value === fontSize)?.size || '16px'

  if (!mounted) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your preferences, notifications, and account</p>
      </div>

      <motion.div variants={item}>
        <Tabs defaultValue="appearance" className="space-y-6">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="appearance" className="gap-1.5">
              <Palette className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Appearance</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5">
              <Bell className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="data" className="gap-1.5">
              <Database className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Data & Privacy</span>
            </TabsTrigger>
            <TabsTrigger value="about" className="gap-1.5">
              <Info className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">About</span>
            </TabsTrigger>
          </TabsList>

          {/* ==================== APPEARANCE TAB ==================== */}
          <TabsContent value="appearance" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Theme */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sun className="h-4 w-4 text-primary" />
                      Theme
                    </CardTitle>
                    <CardDescription>Choose your preferred color scheme</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      {(['light', 'dark', 'system'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTheme(t)}
                          className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-md ${
                            theme === t
                              ? 'border-primary bg-primary/5 shadow-sm'
                              : 'border-border hover:border-primary/40'
                          }`}
                        >
                          <div className={`rounded-md p-2 ${theme === t ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            <ThemeIcon theme={t} />
                          </div>
                          <span className="text-sm font-medium capitalize">{t}</span>
                          {theme === t && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                              Active
                            </Badge>
                          )}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Accent Color */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Accent Color
                    </CardTitle>
                    <CardDescription>Select the primary accent color used throughout the app</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      {ACCENT_COLORS.map((c) => (
                        <button
                          key={c.value}
                          onClick={() => setAccent(c.value)}
                          className={`flex items-center gap-2.5 rounded-lg border-2 px-4 py-2.5 transition-all duration-200 hover:shadow-md ${
                            accent === c.value
                              ? 'border-primary shadow-sm'
                              : 'border-border hover:border-primary/40'
                          }`}
                        >
                          <span className={`h-5 w-5 rounded-full ${c.color} ring-2 ring-offset-2 ring-offset-background ${accent === c.value ? c.ring : 'ring-transparent'}`} />
                          <span className="text-sm font-medium">{c.label}</span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Font Size */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-primary" />
                      Font Size
                    </CardTitle>
                    <CardDescription>Adjust the base font size for readability</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      {FONT_SIZES.map((f) => (
                        <button
                          key={f.value}
                          onClick={() => setFontSize(f.value)}
                          className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all duration-200 hover:shadow-md ${
                            fontSize === f.value
                              ? 'border-primary bg-primary/5 shadow-sm'
                              : 'border-border hover:border-primary/40'
                          }`}
                        >
                          <span className="text-muted-foreground" style={{ fontSize: f.size }}>Aa</span>
                          <span className="text-sm font-medium">{f.label}</span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Compact Mode */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Palette className="h-4 w-4 text-primary" />
                      Compact Mode
                    </CardTitle>
                    <CardDescription>Reduce padding and spacing for a denser layout</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="compact-toggle" className="text-sm font-medium">Enable compact mode</Label>
                        <p className="text-xs text-muted-foreground">Reduces spacing between elements for more content on screen</p>
                      </div>
                      <Switch
                        id="compact-toggle"
                        checked={compact}
                        onCheckedChange={setCompact}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Live Preview Card */}
              <div>
                <Card className="sticky top-6">
                  <CardHeader>
                    <CardTitle className="text-base">Live Preview</CardTitle>
                    <CardDescription>See how your settings look</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="rounded-lg border p-4 space-y-3 transition-all duration-300"
                      style={{ fontSize: previewFontSize }}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${ACCENT_COLORS.find(c => c.value === accent)?.color || 'bg-emerald-500'}`} />
                        <span className="font-semibold">Policy Update</span>
                        <Badge variant="outline" className={`text-[10px] ml-auto ${compact ? 'px-1 py-0' : ''}`}>New</Badge>
                      </div>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        The National Environment Management Authority has issued new guidelines for environmental impact assessments.
                      </p>
                      <div className={`flex items-center gap-2 text-xs text-muted-foreground ${compact ? '-mt-1' : ''}`}>
                        <Clock className="h-3 w-3" />
                        <span>2 hours ago</span>
                      </div>
                      <Separator />
                      <div className="flex gap-2">
                        <Button size={compact ? 'sm' : 'default'} variant="outline" className="flex-1">View Details</Button>
                        <Button size={compact ? 'sm' : 'default'} className="flex-1">Take Action</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ==================== NOTIFICATIONS TAB ==================== */}
          <TabsContent value="notifications" className="space-y-6">
            <div className="max-w-2xl space-y-6">
              {/* Delivery Preference */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" />
                    Delivery Method
                  </CardTitle>
                  <CardDescription>Choose how you want to receive notifications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { value: 'in-app' as const, label: 'In-App', desc: 'Browser notifications only' },
                      { value: 'email' as const, label: 'Email', desc: 'Email notifications only' },
                      { value: 'both' as const, label: 'Both', desc: 'In-app and email' },
                    ]).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setNotifDelivery(opt.value)}
                        className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-md ${
                          notifDelivery === opt.value
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-border hover:border-primary/40'
                        }`}
                      >
                        <span className="text-sm font-medium">{opt.label}</span>
                        <span className="text-[11px] text-muted-foreground text-center">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Notification Toggles */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" />
                    Notification Types
                  </CardTitle>
                  <CardDescription>Control which notifications you receive</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="notif-alerts" className="text-sm font-medium">New alerts</Label>
                      <p className="text-xs text-muted-foreground">Get notified when new policy alerts are published</p>
                    </div>
                    <Switch id="notif-alerts" checked={notifyNewAlerts} onCheckedChange={setNotifyNewAlerts} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="notif-comparison" className="text-sm font-medium">Comparison complete</Label>
                      <p className="text-xs text-muted-foreground">Get notified when document comparisons finish processing</p>
                    </div>
                    <Switch id="notif-comparison" checked={notifyComparison} onCheckedChange={setNotifyComparison} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="notif-mention" className="text-sm font-medium">Mentions</Label>
                      <p className="text-xs text-muted-foreground">Get notified when someone mentions you</p>
                    </div>
                    <Switch id="notif-mention" checked={notifyMention} onCheckedChange={setNotifyMention} />
                  </div>
                </CardContent>
              </Card>

              {/* Quiet Hours */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Quiet Hours
                  </CardTitle>
                  <CardDescription>Silence notifications during specific hours</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="quiet-toggle" className="text-sm font-medium">Enable quiet hours</Label>
                      <p className="text-xs text-muted-foreground">Suppress all notifications during the configured time window</p>
                    </div>
                    <Switch id="quiet-toggle" checked={quietEnabled} onCheckedChange={setQuietEnabled} />
                  </div>

                  {quietEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3 pt-2"
                    >
                      <Separator />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Start time</Label>
                          <Select value={quietStart} onValueChange={setQuietStart}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {generateTimeOptions().map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">End time</Label>
                          <Select value={quietEnd} onValueChange={setQuietEnd}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {generateTimeOptions().map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ==================== DATA & PRIVACY TAB ==================== */}
          <TabsContent value="data" className="space-y-6">
            <div className="max-w-2xl space-y-6">
              {/* Export Data */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Download className="h-4 w-4 text-primary" />
                    Export Your Data
                  </CardTitle>
                  <CardDescription>Download a copy of your profile, notifications, and subscriptions</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleExportData} variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export as JSON
                  </Button>
                </CardContent>
              </Card>

              {/* Clear Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trash2 className="h-4 w-4 text-amber-500" />
                    Clear Activity History
                  </CardTitle>
                  <CardDescription>Remove locally stored recent views and browsing history</CardDescription>
                </CardHeader>
                <CardContent>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="gap-2 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10">
                        <Trash2 className="h-4 w-4" />
                        Clear History
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear activity history?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove your recently viewed items and browsing history. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearHistory} className="bg-amber-600 hover:bg-amber-700 text-white">
                          Clear History
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>

              {/* Account Deletion (Danger Zone) */}
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Danger Zone
                  </CardTitle>
                  <CardDescription>Irreversible and destructive actions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                    <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Delete Account</p>
                      <p className="text-xs text-muted-foreground">
                        Permanently delete your account and all associated data. This includes your profile,
                        subscriptions, notification history, and any documents you have uploaded.
                        This action is irreversible.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        To delete your account, please contact your system administrator.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ==================== ABOUT TAB ==================== */}
          <TabsContent value="about" className="space-y-6">
            <div className="max-w-2xl space-y-6">
              {/* App Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" />
                    Application Info
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-sm shadow-primary/25">
                        <ShieldCheck className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">PolicyPulse</h3>
                        <p className="text-sm text-muted-foreground">Legal & Policy Change Intelligence Platform</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Version</p>
                        <p className="font-medium">v1.3.0</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Build</p>
                        <p className="font-medium font-mono text-xs">2025.07.13-production</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Framework</p>
                        <p className="font-medium">Next.js 16</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Jurisdiction</p>
                        <p className="font-medium">Uganda 🇺🇬</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Links */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-primary" />
                    Resources
                  </CardTitle>
                  <CardDescription>Helpful links and resources</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {[
                      { label: 'Documentation', href: '#', desc: 'User guides and API documentation' },
                      { label: 'Support', href: '#', desc: 'Get help from our team' },
                      { label: 'Privacy Policy', href: '#', desc: 'How we handle your data' },
                    ].map((link) => (
                      <a
                        key={link.label}
                        href={link.href}
                        className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-accent/80 transition-colors group"
                      >
                        <div>
                          <p className="text-sm font-medium group-hover:text-primary transition-colors">{link.label}</p>
                          <p className="text-xs text-muted-foreground">{link.desc}</p>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Credits */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Credits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <p>PolicyPulse is built for legal professionals, policy analysts, and government stakeholders in Uganda.</p>
                    <Separator />
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="font-medium text-foreground mb-1">Frontend</p>
                        <p>Next.js 16, React, TypeScript</p>
                        <p>Tailwind CSS 4, shadcn/ui</p>
                        <p>Framer Motion, TanStack Query</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground mb-1">Backend</p>
                        <p>Next.js API Routes</p>
                        <p>Prisma ORM, SQLite</p>
                        <p>NextAuth.js, Zod</p>
                      </div>
                    </div>
                    <Separator />
                    <p className="text-xs">© {new Date().getFullYear()} PolicyPulse Uganda. All rights reserved.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}

// --- Time options generator ---

function generateTimeOptions(): string[] {
  const times: string[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hh = h.toString().padStart(2, '0')
      const mm = m.toString().padStart(2, '0')
      times.push(`${hh}:${mm}`)
    }
  }
  return times
}
