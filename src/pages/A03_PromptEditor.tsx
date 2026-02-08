import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, FileCode2 } from 'lucide-react'
import { usePromptStore } from '@/stores/usePromptStore'
import { PromptSidebar } from '@/components/prompt/PromptSidebar'
import { PromptEditor } from '@/components/prompt/PromptEditor'
import { VersionHistory } from '@/components/prompt/VersionHistory'
import { VersionDiffDialog } from '@/components/prompt/VersionDiffDialog'
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

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [diffOpen, setDiffOpen] = useState(false)
  const [diffOld, setDiffOld] = useState<AIContextVersion | null>(null)
  const [diffNew, setDiffNew] = useState<AIContextVersion | null>(null)

  useEffect(() => {
    fetchContexts()
  }, [fetchContexts])

  // Auto-select first context when loaded
  useEffect(() => {
    if (contexts.length > 0 && !selectedId) {
      setSelectedId(contexts[0].id)
    }
  }, [contexts, selectedId])

  // Fetch versions when selection changes
  useEffect(() => {
    if (selectedId) {
      fetchVersions(selectedId)
    }
  }, [selectedId, fetchVersions])

  const selectedContext = contexts.find((c) => c.id === selectedId)
  const selectedVersions = selectedId ? (versions[selectedId] ?? []) : []

  const handleSave = async (data: AIContextUpdateInput) => {
    if (!selectedId) return
    await updateContext(selectedId, data)
    await fetchVersions(selectedId)
  }

  const handleRollback = async (versionNumber: number) => {
    if (!selectedId) return
    await rollback(selectedId, versionNumber)
  }

  const handleShowDiff = (v1: AIContextVersion, v2: AIContextVersion) => {
    setDiffOld(v1)
    setDiffNew(v2)
    setDiffOpen(true)
  }

  if (isLoading && contexts.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileCode2 className="h-5 w-5 text-brand" />
        <h1 className="text-xl font-bold">プロンプト管理</h1>
      </div>

      {/* Main Layout */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: Context list */}
        <Card className="lg:col-span-1">
          <CardContent className="p-3">
            <PromptSidebar
              contexts={contexts}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </CardContent>
        </Card>

        {/* Right: Editor + Version History */}
        <div className="space-y-4 lg:col-span-2">
          {selectedContext ? (
            <>
              <Card>
                <CardContent className="p-5">
                  <PromptEditor
                    context={selectedContext}
                    isLoading={isLoading}
                    onSave={handleSave}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <VersionHistory
                    versions={selectedVersions}
                    currentVersionNumber={selectedContext.current_version_number}
                    isLoading={isLoading}
                    onRollback={handleRollback}
                    onShowDiff={handleShowDiff}
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
