'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Sparkles, RefreshCw, AlertTriangle, TrendingUp, TrendingDown, Minus,
  CheckCircle2, Clock, AlertCircle, ChevronRight, ArrowRight, Shield,
  Target, Lightbulb, Calendar, Zap, BookOpen, Loader2, Brain, GitCompare,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { safeArray } from '@/lib/safe-array'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }

const severityColors: Record<string, string> = {
  LOW: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 border-red-200 dark:border-red-800',
}

const severityIcons: Record<string, React.ReactNode> = {
  LOW: <CheckCircle2 className="h-4 w-4" />,
  MEDIUM: <AlertCircle className="h-4 w-4" />,
  HIGH: <AlertTriangle className="h-4 w-4" />,
  CRITICAL: <AlertTriangle className="h-4 w-4" />,
}

const directionIcons: Record<string, React.ReactNode> = {
  INCREASING: <TrendingUp className="h-4 w-4 text-emerald-500" />,
  DECREASING: <TrendingDown className="h-4 w-4 text-red-500" />,
  STABLE: <Minus className="h-4 w-4 text-slate-400" />,
}

const complianceStatusStyles: Record<string, string> = {
  COMPLIANT: 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800',
  ACTION_NEEDED: 'border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800',
  AT_RISK: 'border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800',
}

const complianceStatusIcons: Record<string, React.ReactNode> = {
  COMPLIANT: <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
  ACTION_NEEDED: <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
  AT_RISK: <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />,
}

interface PolicyAnalysis {
  relevanceScore: number
  relevanceLevel: string
  summary: string
  keyImpacts: Array<{ area: string; description: string; severity: string; actionRequired: boolean }>
  complianceSteps: string[]
  risks: string[]
  opportunities: string[]
}

export default function AIInsightsView() {
  const queryClient = useQueryClient()
  const user = useAppStore(s => s.user)
  const { setView } = useAppStore()
  const [selectedPolicyAnalysis, setSelectedPolicyAnalysis] = useState<PolicyAnalysis | null>(null)
  const [analyzingPolicyId, setAnalyzingPolicyId] = useState<string | null>(null)
  const [comparePolicyId1, setComparePolicyId1] = useState('')
  const [comparePolicyId2, setComparePolicyId2] = useState('')
  const [compareResult, setCompareResult] = useState<Record<string, unknown> | null>(null)
  const [isComparing, setIsComparing] = useState(false)

  const { data: policiesData } = useQuery({
    queryKey: ['policies-list'],
    queryFn: () => fetch('/api/policies').then(r => r.json()),
    enabled: !!user,
  })
  const policies = safeArray<Record<string, unknown>>(policiesData)

  const { data: insightsData, isLoading: insightsLoading, error: insightsError, refetch } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: () => fetch('/api/ai/insights', { method: 'POST' }).then(r => {
      if (!r.ok) throw new Error('Failed to generate insights')
      return r.json()
    }),
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  })

  const policyAnalysisMutation = useMutation({
    mutationFn: async (policyId: string) => {
      const res = await fetch('/api/ai/policy-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyId }),
      })
      if (!res.ok) throw new Error('Analysis failed')
      return res.json()
    },
    onSuccess: (data) => {
      setSelectedPolicyAnalysis(data)
      setAnalyzingPolicyId(null)
    },
    onError: () => {
      toast.error('Policy analysis failed. Please try again.')
      setAnalyzingPolicyId(null)
    },
  })

  const handleCompare = async () => {
    if (!comparePolicyId1 || !comparePolicyId2) {
      toast.error('Please select two policies to compare')
      return
    }
    setIsComparing(true)
    try {
      const res = await fetch('/api/ai/compare-policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyId1: comparePolicyId1, policyId2: comparePolicyId2 }),
      })
      if (!res.ok) throw new Error('Comparison failed')
      const data = await res.json()
      setCompareResult(data)
    } catch {
      toast.error('Policy comparison failed. Please try again.')
    } finally {
      setIsComparing(false)
    }
  }

  const handleRefresh = useCallback(() => {
    refetch()
    setSelectedPolicyAnalysis(null)
    setCompareResult(null)
  }, [refetch])

  const priorityAlerts = safeArray<Record<string, unknown>>(insightsData?.priorityAlerts)
  const recommendations = safeArray<Record<string, unknown>>(insightsData?.policyRecommendations)
  const complianceChecklist = safeArray<Record<string, unknown>>(insightsData?.complianceChecklist)
  const trends = safeArray<Record<string, unknown>>(insightsData?.trends)
  const deadlines = safeArray<Record<string, unknown>>(insightsData?.upcomingDeadlines)

  const activePolicy = selectedPolicyAnalysis ? policies.find(p => p.id === analyzingPolicyId) : null

  if (insightsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72 mt-2" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            AI Insights
          </h1>
          <p className="text-muted-foreground text-sm">
            {insightsData?.greeting || 'Personalized policy intelligence powered by AI'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={insightsLoading}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${insightsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Badge variant="secondary" className="gap-1.5">
            <Sparkles className="h-3 w-3" /> Deepseek AI
          </Badge>
        </div>
      </motion.div>

      {insightsError && (
        <motion.div variants={item}>
          <Card className="border-destructive/50">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-sm font-medium">Failed to generate insights</p>
              <p className="text-xs text-muted-foreground mt-1">Check your connection and try again</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" /> Retry
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Priority Alerts */}
      {priorityAlerts.length > 0 && (
        <motion.div variants={item}>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Priority Alerts
            <Badge variant="destructive" className="text-[10px] px-1.5">{priorityAlerts.length}</Badge>
          </h2>
          <div className="grid gap-3">
            {priorityAlerts.map((alert, i) => {
              const severity = (alert.severity as string) || 'MEDIUM'
              return (
                <Card key={i} className={`border ${severityColors[severity]} || 'border-border'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{severityIcons[severity]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">{alert.title as string}</span>
                          <Badge variant="outline" className="text-[10px] shrink-0">{severity}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{alert.description as string}</p>
                        {(alert.policyId as string) && (
                          <button
                            onClick={() => policyAnalysisMutation.mutate(alert.policyId as string)}
                            className="flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                          >
                            <Shield className="h-3 w-3" /> Analyze relevance
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Main Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Policy Recommendations */}
        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Policy Recommendations
              </CardTitle>
              <CardDescription>Policies most relevant to your profile</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-80 overflow-y-auto scrollbar-thin space-y-2">
                {recommendations.length === 0 && !insightsLoading && (
                  <p className="text-sm text-muted-foreground text-center py-4">No recommendations yet</p>
                )}
                {recommendations.map((rec, i) => {
                  const score = rec.relevanceScore as number
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border/60 hover:border-primary/30 hover:bg-primary/[0.02] transition-colors cursor-pointer group"
                      onClick={() => {
                        if (rec.policyId) policyAnalysisMutation.mutate(rec.policyId as string)
                      }}
                    >
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-sm font-bold ${
                          score >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' :
                          score >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {score}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {rec.policyTitle as string}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{rec.reason as string}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0 mt-1" />
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Compliance Checklist */}
        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Compliance Status
              </CardTitle>
              <CardDescription>Your compliance posture across policy areas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-80 overflow-y-auto scrollbar-thin space-y-2">
                {complianceChecklist.length === 0 && !insightsLoading && (
                  <p className="text-sm text-muted-foreground text-center py-4">No compliance data yet</p>
                )}
                {complianceChecklist.map((item, i) => {
                  const status = (item.status as string) || 'ACTION_NEEDED'
                  return (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border ${complianceStatusStyles[status] || ''}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {complianceStatusIcons[status]}
                        <span className="text-sm font-medium">{item.area as string}</span>
                        <Badge variant="outline" className="text-[10px] ml-auto">{status.replace(/_/g, ' ')}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground ml-6">{item.details as string}</p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Trends & Deadlines Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Trends */}
        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Policy Trends
              </CardTitle>
              <CardDescription>Emerging trends in Ugandan policy landscape</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {trends.length === 0 && !insightsLoading && (
                  <p className="text-sm text-muted-foreground text-center py-4">No trends detected yet</p>
                )}
                {trends.map((trend, i) => {
                  const direction = (trend.direction as string) || 'STABLE'
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      {directionIcons[direction]}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{trend.topic as string}</span>
                          <Badge variant="outline" className="text-[10px]">{direction}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{trend.summary as string}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming Deadlines */}
        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Upcoming Deadlines
              </CardTitle>
              <CardDescription>Important dates and compliance deadlines</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {deadlines.length === 0 && !insightsLoading && (
                  <p className="text-sm text-muted-foreground text-center py-4">No upcoming deadlines</p>
                )}
                {deadlines.map((dl, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <Calendar className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{dl.title as string}</p>
                      <p className="text-xs text-muted-foreground">{dl.date as string}</p>
                      {(dl.relatedPolicy as string) && (
                        <p className="text-xs text-primary mt-0.5">{dl.relatedPolicy as string}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Separator className="my-2" />

      {/* AI Tools Section */}
      <motion.div variants={item}>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Analysis Tools
        </h2>
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Policy Relevance Analyzer */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-teal-500" />
                Policy Relevance Analyzer
              </CardTitle>
              <CardDescription>Select a policy to get a personalized relevance analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={analyzingPolicyId || ''}
                onValueChange={(v) => {
                  setAnalyzingPolicyId(v)
                  setSelectedPolicyAnalysis(null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a policy to analyze" />
                </SelectTrigger>
                <SelectContent>
                  {policies.map(p => (
                    <SelectItem key={p.id as string} value={p.id as string}>
                      {p.title as string}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {analyzingPolicyId && !selectedPolicyAnalysis && (
                <Button
                  onClick={() => policyAnalysisMutation.mutate(analyzingPolicyId)}
                  disabled={policyAnalysisMutation.isPending}
                  className="w-full"
                >
                  {policyAnalysisMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>
                  ) : (
                    <><Brain className="mr-2 h-4 w-4" /> Analyze Relevance</>
                  )}
                </Button>
              )}

              <AnimatePresence>
                {selectedPolicyAnalysis && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    {/* Relevance Score */}
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Relevance Score</span>
                        <Badge className={
                          selectedPolicyAnalysis.relevanceLevel === 'CRITICAL' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400' :
                          selectedPolicyAnalysis.relevanceLevel === 'HIGH' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400' :
                          selectedPolicyAnalysis.relevanceLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' :
                          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400'
                        }>
                          {selectedPolicyAnalysis.relevanceLevel}
                        </Badge>
                      </div>
                      <Progress value={selectedPolicyAnalysis.relevanceScore} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-2">{selectedPolicyAnalysis.summary}</p>
                    </div>

                    {/* Key Impacts */}
                    {selectedPolicyAnalysis.keyImpacts?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Key Impacts</h4>
                        <div className="space-y-2">
                          {selectedPolicyAnalysis.keyImpacts.map((impact, i) => (
                            <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-muted/30">
                              {severityIcons[impact.severity] || severityIcons.MEDIUM}
                              <div className="flex-1">
                                <p className="text-xs font-medium">{impact.area}</p>
                                <p className="text-xs text-muted-foreground">{impact.description}</p>
                              </div>
                              {impact.actionRequired && (
                                <Badge variant="outline" className="text-[9px]">Action</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Compliance Steps */}
                    {selectedPolicyAnalysis.complianceSteps?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Compliance Steps</h4>
                        <ol className="space-y-1">
                          {selectedPolicyAnalysis.complianceSteps.map((step, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs">
                              <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                {i + 1}
                              </span>
                              <span className="text-muted-foreground pt-0.5">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Risks & Opportunities */}
                    <div className="grid grid-cols-2 gap-3">
                      {selectedPolicyAnalysis.risks?.length > 0 && (
                        <div className="p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
                          <h4 className="text-xs font-semibold text-red-700 dark:text-red-400 mb-2">Risks</h4>
                          <ul className="space-y-1">
                            {selectedPolicyAnalysis.risks.slice(0, 3).map((risk, i) => (
                              <li key={i} className="text-[11px] text-red-600 dark:text-red-300 flex items-start gap-1">
                                <span className="mt-1">&bull;</span>{risk}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {selectedPolicyAnalysis.opportunities?.length > 0 && (
                        <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20">
                          <h4 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2">Opportunities</h4>
                          <ul className="space-y-1">
                            {selectedPolicyAnalysis.opportunities.slice(0, 3).map((opp, i) => (
                              <li key={i} className="text-[11px] text-emerald-600 dark:text-emerald-300 flex items-start gap-1">
                                <span className="mt-1">&bull;</span>{opp}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Policy Comparison Tool */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <GitCompare className="h-4 w-4 text-teal-500" />
                AI Policy Comparison
              </CardTitle>
              <CardDescription>Compare two policies and find overlaps, conflicts, and combined impact</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Select value={comparePolicyId1} onValueChange={setComparePolicyId1}>
                  <SelectTrigger><SelectValue placeholder="Policy 1" /></SelectTrigger>
                  <SelectContent>
                    {policies.map(p => (
                      <SelectItem key={p.id as string} value={p.id as string}>{p.title as string}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={comparePolicyId2} onValueChange={setComparePolicyId2}>
                  <SelectTrigger><SelectValue placeholder="Policy 2" /></SelectTrigger>
                  <SelectContent>
                    {policies.map(p => (
                      <SelectItem key={p.id as string} value={p.id as string}>{p.title as string}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleCompare}
                disabled={isComparing || !comparePolicyId1 || !comparePolicyId2}
                className="w-full"
              >
                {isComparing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Comparing...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Compare Policies</>
                )}
              </Button>

              <AnimatePresence>
                {compareResult && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 overflow-hidden"
                  >
                    {/* Relationship */}
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{(compareResult.relationship as string) || 'N/A'}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{compareResult.summary as string}</p>
                    </div>

                    {/* Overlaps */}
                    {Array.isArray(compareResult.overlaps) && (compareResult.overlaps as Array<Record<string, unknown>>).length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Overlaps & Conflicts</h4>
                        <div className="space-y-2">
                          {(compareResult.overlaps as Array<Record<string, unknown>>).slice(0, 4).map((overlap, i) => (
                            <div key={i} className={`p-2 rounded-md border ${overlap.conflict ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20' : 'border-border bg-muted/30'}`}>
                              <p className="text-xs font-medium flex items-center gap-1.5">
                                {overlap.conflict ? <AlertTriangle className="h-3 w-3 text-red-500" /> : <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                                {overlap.topic as string}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">{overlap.notes as string}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Combined Impact */}
                    {compareResult.combinedImpact && (
                      <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                        <h4 className="text-xs font-semibold text-primary mb-1">Combined Impact</h4>
                        <p className="text-xs text-muted-foreground">{compareResult.combinedImpact as string}</p>
                      </div>
                    )}

                    {/* Recommendations */}
                    {Array.isArray(compareResult.recommendations) && (compareResult.recommendations as string[]).length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Recommendations</h4>
                        <ul className="space-y-1">
                          {(compareResult.recommendations as string[]).map((rec, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs">
                              <Lightbulb className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                              <span className="text-muted-foreground">{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </motion.div>
  )
}
