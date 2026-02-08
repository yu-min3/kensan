import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Save, Loader2, ChevronDown, Eye, Pencil, AlertTriangle } from 'lucide-react'
import type { AIContext, AIContextUpdateInput } from '@/api/services/prompts'
import { usePromptStore } from '@/stores/usePromptStore'

interface PromptEditorProps {
  context: AIContext
  isLoading: boolean
  onSave: (data: AIContextUpdateInput) => Promise<void>
}

function detectVariables(prompt: string): string[] {
  const matches = prompt.match(/\{(\w+)\}/g)
  if (!matches) return []
  return [...new Set(matches.map((m) => m.slice(1, -1)))]
}

export function PromptEditor({ context, isLoading, onSave }: PromptEditorProps) {
  const [systemPrompt, setSystemPrompt] = useState(context.system_prompt)
  const [allowedTools, setAllowedTools] = useState(context.allowed_tools.join(', '))
  const [maxTurns, setMaxTurns] = useState(context.max_turns)
  const [temperature, setTemperature] = useState(context.temperature)
  const [changelog, setChangelog] = useState('')
  const [saving, setSaving] = useState(false)
  const [variableTableOpen, setVariableTableOpen] = useState(false)

  const metadata = usePromptStore((s) => s.metadata)
  const fetchMetadata = usePromptStore((s) => s.fetchMetadata)

  useEffect(() => {
    fetchMetadata()
  }, [fetchMetadata])

  useEffect(() => {
    setSystemPrompt(context.system_prompt)
    setAllowedTools(context.allowed_tools.join(', '))
    setMaxTurns(context.max_turns)
    setTemperature(context.temperature)
    setChangelog('')
  }, [context.id])

  const usedVariables = detectVariables(systemPrompt)
  const variableMap = new Map(
    metadata?.variables.map((v) => [v.name, v]) ?? [],
  )
  const toolMap = new Map(
    metadata?.tools.map((t) => [t.name, t]) ?? [],
  )

  const parsedTools = allowedTools
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)

  const hasChanges =
    systemPrompt !== context.system_prompt ||
    allowedTools !== context.allowed_tools.join(', ') ||
    maxTurns !== context.max_turns ||
    temperature !== context.temperature

  const handleSave = async () => {
    setSaving(true)
    try {
      const toolsArray = parsedTools
      const data: AIContextUpdateInput = { changelog: changelog || undefined }
      if (systemPrompt !== context.system_prompt) data.system_prompt = systemPrompt
      if (JSON.stringify(toolsArray) !== JSON.stringify(context.allowed_tools))
        data.allowed_tools = toolsArray
      if (maxTurns !== context.max_turns) data.max_turns = maxTurns
      if (temperature !== context.temperature) data.temperature = temperature

      await onSave(data)
      setChangelog('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold">{context.name}</h2>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{context.situation}</Badge>
            {context.current_version_number && (
              <span>v{context.current_version_number}</span>
            )}
          </div>
        </div>

        {/* System Prompt */}
        <div className="space-y-2">
          <Label htmlFor="system-prompt">システムプロンプト</Label>
          <Textarea
            id="system-prompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="min-h-[300px] font-mono text-xs leading-relaxed"
            placeholder="システムプロンプトを入力..."
          />
          <div className="text-xs text-muted-foreground">
            {systemPrompt.length} 文字
          </div>
        </div>

        {/* Variables */}
        <div className="space-y-2">
          <Label>使用中の変数</Label>
          <p className="text-xs text-muted-foreground">
            会話開始時にプロンプトに自動展開されるデータ
          </p>
          {usedVariables.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {usedVariables.map((v) => {
                const meta = variableMap.get(v)
                const isKnown = !!meta
                return (
                  <Tooltip key={v}>
                    <TooltipTrigger asChild>
                      <Badge
                        variant={isKnown ? 'secondary' : 'destructive'}
                        className="cursor-help text-xs"
                      >
                        {`{${v}}`}
                      </Badge>
                    </TooltipTrigger>
                    {meta && (
                      <TooltipContent
                        side="bottom"
                        className="max-w-xs space-y-1 bg-popover text-popover-foreground"
                      >
                        <p className="font-medium">{meta.description}</p>
                        <p className="text-muted-foreground whitespace-pre-wrap">
                          例: {meta.example}
                        </p>
                        {meta.excludes_tools.length > 0 && (
                          <p className="text-muted-foreground">
                            除外ツール: {meta.excludes_tools.join(', ')}
                          </p>
                        )}
                      </TooltipContent>
                    )}
                  </Tooltip>
                )
              })}
            </div>
          )}

          {/* Collapsible variable reference table */}
          {metadata && (
            <Collapsible open={variableTableOpen} onOpenChange={setVariableTableOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground">
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${variableTableOpen ? 'rotate-180' : ''}`}
                  />
                  利用可能な変数一覧
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 rounded-md border text-xs">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-1.5 text-left font-medium">変数</th>
                        <th className="px-3 py-1.5 text-left font-medium">説明</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metadata.variables.map((v) => (
                        <tr key={v.name} className="border-b last:border-0">
                          <td className="whitespace-nowrap px-3 py-1.5 font-mono text-brand">
                            {`{${v.name}}`}
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {v.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        {/* Parameters */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="max-turns">Max Turns</Label>
            <Input
              id="max-turns"
              type="number"
              min={1}
              max={50}
              value={maxTurns}
              onChange={(e) => setMaxTurns(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="temperature">Temperature</Label>
            <Input
              id="temperature"
              type="number"
              min={0}
              max={2}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Allowed Tools */}
        <div className="space-y-2">
          <Label htmlFor="allowed-tools">Allowed Tools (カンマ区切り)</Label>
          <p className="text-xs text-muted-foreground">
            会話中にAIが呼び出せるアクション
          </p>
          <Textarea
            id="allowed-tools"
            value={allowedTools}
            onChange={(e) => setAllowedTools(e.target.value)}
            className="min-h-[60px] font-mono text-xs"
            placeholder="get_goals_and_milestones, get_tasks, ..."
          />
          {parsedTools.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {parsedTools.map((name) => {
                const meta = toolMap.get(name)
                const isKnown = !!meta
                return (
                  <Tooltip key={name}>
                    <TooltipTrigger asChild>
                      <Badge
                        variant={isKnown ? 'outline' : 'destructive'}
                        className="cursor-help gap-1 text-xs"
                      >
                        {isKnown ? (
                          meta.readonly ? (
                            <Eye className="h-3 w-3" />
                          ) : (
                            <Pencil className="h-3 w-3" />
                          )
                        ) : (
                          <AlertTriangle className="h-3 w-3" />
                        )}
                        {name}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="max-w-xs bg-popover text-popover-foreground"
                    >
                      {isKnown ? (
                        <p>{meta.description}</p>
                      ) : (
                        <p className="text-destructive">不明なツール名です</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          )}
        </div>

        {/* Changelog + Save */}
        {hasChanges && (
          <div className="space-y-3 rounded-lg border border-brand/30 bg-brand/5 p-4">
            <div className="space-y-2">
              <Label htmlFor="changelog">変更内容メモ</Label>
              <Input
                id="changelog"
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                placeholder="変更内容を簡単に記述..."
              />
            </div>
            <Button onClick={handleSave} disabled={saving || isLoading} className="w-full">
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              保存してバージョン作成
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
