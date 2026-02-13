import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, FileCode2, GitCompare, ArrowRight, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { usePromptStore } from '@/stores/usePromptStore'
import { useChallengeStore } from '@/stores/useChallengeStore'
import { useVersionSeen } from '@/hooks/useVersionSeen'
import { PromptSidebar } from '@/components/prompt/PromptSidebar'
import { PromptEditor } from '@/components/prompt/PromptEditor'
import { VersionHistory } from '@/components/prompt/VersionHistory'
import { VersionDiffDialog } from '@/components/prompt/VersionDiffDialog'
import { ChallengeList } from '@/components/prompt/ChallengeList'
import { ChallengeDetail } from '@/components/prompt/ChallengeDetail'
import { ExperimentDetail } from '@/components/prompt/ExperimentDetail'
import { PageGuide } from '@/components/guide/PageGuide'
import type { AIContextVersion, AIContextUpdateInput } from '@/api/services/prompts'

export function A03PromptEditor() {
  const {
    contexts,
    versions,
    isLoading,
    fetchContexts,
    updateContext,
    fetchVersions,
    rollback,
  } = usePromptStore()

  const {
    comparisons,
    experiments,
    selectedComparison,
    selectedExperiment,
    isLoading: comparisonLoading,
    isOptimizing,
    fetchComparisons,
    fetchExperiments,
    selectComparison,
    selectExperiment,
    createAndSelect,
    runOptimization,
  } = useChallengeStore()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [diffOpen, setDiffOpen] = useState(false)
  const [diffOld, setDiffOld] = useState<AIContextVersion | null>(null)
  const [diffNew, setDiffNew] = useState<AIContextVersion | null>(null)
  const [activeTab, setActiveTab] = useState('editor')
  const [savedBanner, setSavedBanner] = useState<{ contextId: string; oldVersion: number; newVersion: number } | null>(null)
  const [compareSubTab, setCompareSubTab] = useState<'versions' | 'comparisons'>('versions')
  const [optimizeElapsed, setOptimizeElapsed] = useState(0)
  const optimizeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Elapsed timer for optimization
  useEffect(() => {
    if (isOptimizing) {
      setOptimizeElapsed(0)
      optimizeTimerRef.current = setInterval(() => setOptimizeElapsed((s) => s + 1), 1000)
    } else {
      if (optimizeTimerRef.current) {
        clearInterval(optimizeTimerRef.current)
        optimizeTimerRef.current = null
      }
    }
    return () => {
      if (optimizeTimerRef.current) clearInterval(optimizeTimerRef.current)
    }
  }, [isOptimizing])

  const { getLastSeen, markSeen, markUnseen, hasUnseen, initializeIfNeeded } = useVersionSeen()

  useEffect(() => {
    fetchContexts()
  }, [fetchContexts])

  // Auto-select first context when loaded
  useEffect(() => {
    if (contexts.length > 0 && !selectedId) {
      setSelectedId(contexts[0].id)
    }
  }, [contexts, selectedId])

  // Initialize version seen tracking when contexts load
  useEffect(() => {
    if (contexts.length > 0) {
      initializeIfNeeded(contexts)
    }
  }, [contexts, initializeIfNeeded])

  // Fetch versions when selection changes
  useEffect(() => {
    if (selectedId) {
      fetchVersions(selectedId)
    }
  }, [selectedId, fetchVersions])

  // Fetch comparisons + experiments when switching to challenge tab
  useEffect(() => {
    if (activeTab === 'challenge') {
      fetchComparisons()
      fetchExperiments()
      if (selectedId) {
        fetchVersions(selectedId)
      }
    }
  }, [activeTab, fetchComparisons, fetchExperiments, selectedId, fetchVersions])

  const selectedContext = contexts.find((c) => c.id === selectedId)
  const selectedVersions = selectedId ? (versions[selectedId] ?? []) : []

  // Mark versions as seen when viewing the versions sub-tab
  useEffect(() => {
    if (activeTab === 'challenge' && compareSubTab === 'versions' && selectedContext?.current_version_number != null && selectedId) {
      markSeen(selectedId, selectedContext.current_version_number)
    }
  }, [activeTab, compareSubTab, selectedId, selectedContext?.current_version_number, markSeen])

  const unseenContextIds = useMemo(
    () => new Set(contexts.filter((ctx) => hasUnseen(ctx.id, ctx.current_version_number)).map((ctx) => ctx.id)),
    [contexts, hasUnseen],
  )

  const handleSave = async (data: AIContextUpdateInput) => {
    if (!selectedId) return
    const oldVersionNumber = selectedContext?.current_version_number ?? 0
    await updateContext(selectedId, data)
    await fetchVersions(selectedId)
    // Show compare banner
    const newVersionNumber = oldVersionNumber + 1
    setSavedBanner({ contextId: selectedId, oldVersion: oldVersionNumber, newVersion: newVersionNumber })
    // Mark as seen since the user just created this version
    markSeen(selectedId, newVersionNumber)
  }

  const handleCompareFromBanner = useCallback(async () => {
    if (!savedBanner) return
    await createAndSelect(savedBanner.contextId, savedBanner.oldVersion, savedBanner.newVersion)
    setSavedBanner(null)
    setActiveTab('challenge')
  }, [savedBanner, createAndSelect])

  const handleCompareVersions = useCallback(async (contextId: string, versionA: number, versionB: number) => {
    await createAndSelect(contextId, versionA, versionB)
    setActiveTab('challenge')
  }, [createAndSelect])

  const handleRollback = async (versionNumber: number) => {
    if (!selectedId) return
    await rollback(selectedId, versionNumber)
  }

  const handleShowDiff = (v1: AIContextVersion, v2: AIContextVersion) => {
    setDiffOld(v1)
    setDiffNew(v2)
    setDiffOpen(true)
  }

  const activeCount = comparisons.filter((c) => c.status === 'active').length
  const pendingExperimentCount = experiments.filter((e) => e.status === 'pending_review' || e.status === 'in_challenge').length

  if (isLoading && contexts.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageGuide pageId="prompts" />

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <FileCode2 className="h-5 w-5 text-brand" />
          <h1 className="text-xl font-bold">プロンプト管理</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          AIエージェントの振る舞いを制御するシステムプロンプトの管理画面です。
          コンテキストを選択 → プロンプトを編集 → 変更メモを入力して保存。
          変更は自動でバージョン管理され、履歴の確認とロールバックが可能です。
          persona は全エージェント共通設定として自動適用されます。
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-guide="prompt-tabs">
          <TabsTrigger value="editor">プロンプト編集</TabsTrigger>
          <TabsTrigger value="challenge" className="gap-1.5" data-guide="prompt-tab-challenge">
            比較
            {(activeCount + pendingExperimentCount > 0 || unseenContextIds.size > 0) && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-[10px]">
                {activeCount + pendingExperimentCount + unseenContextIds.size}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Editor Tab */}
        <TabsContent value="editor">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Left: Context list */}
            <Card data-guide="prompt-sidebar" className="lg:col-span-1 lg:self-start">
              <CardContent className="p-3">
                <PromptSidebar
                  contexts={contexts}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  unseenContextIds={unseenContextIds}
                />
              </CardContent>
            </Card>

            {/* Right: Editor + Version History */}
            <div className="space-y-4 lg:col-span-2">
              {selectedContext ? (
                <>
                  {/* Save → Compare banner */}
                  {savedBanner && savedBanner.contextId === selectedId && (
                    <div className="flex items-center justify-between rounded-lg border border-blue-300 bg-blue-50 px-4 py-3 dark:border-blue-700 dark:bg-blue-950/50">
                      <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-300">
                        <GitCompare className="h-4 w-4 shrink-0" />
                        <span>
                          v{savedBanner.oldVersion} → v{savedBanner.newVersion} を保存しました。比較しますか？
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => setSavedBanner(null)}
                        >
                          閉じる
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-blue-700 hover:text-blue-900 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-200 dark:hover:bg-blue-900"
                          onClick={handleCompareFromBanner}
                        >
                          比較する
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <Card data-guide="prompt-editor">
                    <CardContent className="p-5">
                      <PromptEditor
                        context={selectedContext}
                        isLoading={isLoading}
                        onSave={handleSave}
                      />
                    </CardContent>
                  </Card>

                </>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center py-20">
                    <p className="text-sm text-muted-foreground">
                      左のリストからコンテキストを選択してください
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Challenge Tab */}
        <TabsContent value="challenge">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Left: Internal tabs (Versions / Comparisons) */}
            <Card className="lg:col-span-1">
              <CardContent className="p-3">
                <Tabs value={compareSubTab} onValueChange={(v) => setCompareSubTab(v as 'versions' | 'comparisons')}>
                  <TabsList className="w-full">
                    <TabsTrigger value="versions" className="flex-1 gap-1">
                      バージョン
                      {unseenContextIds.size > 0 && (
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="comparisons" className="flex-1 gap-1">
                      比較一覧
                      {(activeCount + pendingExperimentCount) > 0 && (
                        <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 px-1 text-[9px]">
                          {activeCount + pendingExperimentCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="versions" className="mt-3">
                    <div>
                      <Select value={selectedId ?? ''} onValueChange={setSelectedId}>
                        <SelectTrigger className="mb-3 h-8 text-xs">
                          <span className="truncate">
                            {selectedContext
                              ? `${selectedContext.name}${selectedContext.current_version_number ? ` v${selectedContext.current_version_number}` : ''}`
                              : 'コンテキストを選択'}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {contexts.map((ctx) => (
                            <SelectItem key={ctx.id} value={ctx.id} className="text-xs">
                              {ctx.name}{ctx.current_version_number ? ` v${ctx.current_version_number}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedContext ? (
                        <VersionHistory
                          versions={selectedVersions}
                          currentVersionNumber={selectedContext.current_version_number}
                          isLoading={isLoading}
                          onRollback={handleRollback}
                          onShowDiff={handleShowDiff}
                          lastSeenVersion={getLastSeen(selectedContext.id)}
                          onCompare={selectedId ? (versionNumber) => {
                            const currentVN = selectedContext.current_version_number
                            if (currentVN != null) {
                              handleCompareVersions(selectedId, versionNumber, currentVN)
                            }
                          } : undefined}
                        />
                      ) : (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                          コンテキストを選択してください
                        </p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="comparisons" className="mt-3">
                    <div className="mb-3 space-y-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1.5"
                        disabled={isOptimizing}
                        onClick={async () => {
                          const result = await runOptimization(true)
                          if (result) {
                            if (result.experiments_created > 0) {
                              for (const ctxId of result.optimized_context_ids) {
                                markUnseen(ctxId)
                              }
                              toast.success(`${result.experiments_created}件のチャレンジを生成しました`)
                            } else {
                              toast.info('改善が必要なコンテキストはありませんでした')
                            }
                          }
                        }}
                      >
                        {isOptimizing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Wand2 className="h-3.5 w-3.5" />
                        )}
                        {isOptimizing
                          ? `実行中... (${optimizeElapsed}秒)`
                          : 'AI最適化を実行'}
                      </Button>
                      <p className="text-center text-[10px] text-muted-foreground">
                        {isOptimizing
                          ? 'コンテキストの評価・改善プロンプト生成中です'
                          : 'コンテキスト数に応じて1〜2分程度かかります'}
                      </p>
                    </div>
                    {/* Experiment list (AI optimization) */}
                    {experiments.length > 0 && (
                      <div className="mb-3 space-y-1">
                        <h3 className="px-3 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          AI最適化
                        </h3>
                        {experiments.map((exp) => {
                          const isSelected = selectedExperiment?.id === exp.id
                          const statusLabel = exp.status === 'pending_review' ? 'レビュー待ち'
                            : exp.status === 'in_challenge' ? '評価中'
                            : exp.status === 'promoted' ? '採用済み' : '却下'
                          const statusClass = exp.status === 'pending_review'
                            ? 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30'
                            : exp.status === 'in_challenge'
                            ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30'
                            : exp.status === 'promoted'
                            ? 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30'
                            : 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30'
                          return (
                            <button
                              key={exp.id}
                              onClick={() => selectExperiment(exp.id)}
                              className={`flex w-full flex-col gap-1.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                                isSelected
                                  ? 'bg-brand/15 text-brand font-medium'
                                  : 'text-foreground hover:bg-muted'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Wand2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                                <span className="truncate font-medium">{exp.control_name}</span>
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${statusClass}`}>
                                  {statusLabel}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {exp.situation} — {new Date(exp.created_at).toLocaleDateString('ja-JP')}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {/* Comparison list (version A/B) */}
                    {comparisonLoading && comparisons.length === 0 ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <ChallengeList
                        challenges={comparisons}
                        selectedId={selectedComparison?.id ?? null}
                        onSelect={selectComparison}
                      />
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Right: Detail panel */}
            <div className="lg:col-span-2" data-guide="challenge-detail">
              {selectedExperiment ? <ExperimentDetail /> : <ChallengeDetail />}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Diff Dialog */}
      <VersionDiffDialog
        open={diffOpen}
        onOpenChange={setDiffOpen}
        oldVersion={diffOld}
        newVersion={diffNew}
      />
    </div>
  )
}
