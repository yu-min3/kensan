import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, FileCode2, GitCompare, ArrowRight } from 'lucide-react'
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
    selectedComparison,
    isLoading: comparisonLoading,
    fetchComparisons,
    selectComparison,
    createAndSelect,
  } = useChallengeStore()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [diffOpen, setDiffOpen] = useState(false)
  const [diffOld, setDiffOld] = useState<AIContextVersion | null>(null)
  const [diffNew, setDiffNew] = useState<AIContextVersion | null>(null)
  const [activeTab, setActiveTab] = useState('editor')
  const [savedBanner, setSavedBanner] = useState<{ contextId: string; oldVersion: number; newVersion: number } | null>(null)
  const [compareSubTab, setCompareSubTab] = useState<'versions' | 'comparisons'>('versions')

  const { getLastSeen, markSeen, hasUnseen, initializeIfNeeded } = useVersionSeen()

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

  // Fetch comparisons when switching to challenge tab
  useEffect(() => {
    if (activeTab === 'challenge') {
      fetchComparisons()
      if (selectedId) {
        fetchVersions(selectedId)
      }
    }
  }, [activeTab, fetchComparisons, selectedId, fetchVersions])

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
            {(activeCount > 0 || unseenContextIds.size > 0) && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-[10px]">
                {activeCount + unseenContextIds.size}
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
                      {activeCount > 0 && (
                        <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 px-1 text-[9px]">
                          {activeCount}
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

            {/* Right: Comparison detail */}
            <div className="lg:col-span-2" data-guide="challenge-detail">
              <ChallengeDetail />
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
