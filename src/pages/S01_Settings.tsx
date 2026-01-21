import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { syncApi } from '@/api/services/sync'
import { ApiError } from '@/api/client'

interface Workspace {
  id: string
  name: string
}

export function S01Settings() {
  const navigate = useNavigate()
  const {
    clockifyApiKey,
    workspaceId,
    timezone,
    theme,
    isConfigured,
    setClockifyApiKey,
    setWorkspace,
    setTimezone,
    setTheme,
    setIsConfigured,
    saveSettings,
  } = useSettingsStore()

  const [apiKey, setApiKey] = useState(clockifyApiKey || '')
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(workspaceId || '')

  const handleTestConnection = async () => {
    setTestStatus('testing')
    setErrorMessage('')
    try {
      const result = await syncApi.validateApiKey(apiKey)
      setWorkspaces(result.workspaces)
      // デフォルトでアクティブなワークスペースを選択
      const defaultWs = result.workspaces.find(ws => ws.id === result.user.activeWorkspace)
        || result.workspaces[0]
      if (defaultWs) {
        setSelectedWorkspaceId(defaultWs.id)
        setWorkspace(defaultWs.id, defaultWs.name)
      }
      setClockifyApiKey(apiKey)
      setTestStatus('success')
    } catch (err) {
      setTestStatus('error')
      if (err instanceof ApiError) {
        setErrorMessage(`[${err.status}] ${err.message}`)
      } else {
        setErrorMessage((err as Error).message)
      }
    }
  }

  const handleWorkspaceChange = (wsId: string) => {
    setSelectedWorkspaceId(wsId)
    const ws = workspaces.find(w => w.id === wsId)
    if (ws) {
      setWorkspace(ws.id, ws.name)
    }
  }

  const handleSave = async () => {
    setIsConfigured(true)
    await saveSettings()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Kensan</h1>
          <p className="text-muted-foreground mt-1">自己研鑽プラットフォーム</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>初期設定</CardTitle>
            <CardDescription>
              Clockify APIと連携して時間記録を同期します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Clockify API Key */}
            <div className="space-y-2">
              <Label htmlFor="apiKey">Clockify APIキー</Label>
              <div className="flex gap-2">
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="xxxxxxxxxxxxxxxxxxx"
                />
                <Button
                  onClick={handleTestConnection}
                  disabled={!apiKey || testStatus === 'testing'}
                  variant="outline"
                >
                  {testStatus === 'testing' && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  接続テスト
                </Button>
              </div>
              {testStatus === 'success' && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  接続成功
                </div>
              )}
              {testStatus === 'error' && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {errorMessage || '接続に失敗しました'}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Clockify設定 → API → APIキー から取得できます
              </p>
            </div>

            {/* Workspace Selection */}
            {workspaces.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="workspace">ワークスペース</Label>
                <Select value={selectedWorkspaceId} onValueChange={handleWorkspaceChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="ワークスペースを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces.map((ws) => (
                      <SelectItem key={ws.id} value={ws.id}>
                        {ws.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Timezone */}
            <div className="space-y-2">
              <Label htmlFor="timezone">タイムゾーン</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue placeholder="タイムゾーンを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                  <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Theme */}
            <div className="space-y-2">
              <Label htmlFor="theme">テーマ</Label>
              <Select value={theme} onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}>
                <SelectTrigger>
                  <SelectValue placeholder="テーマを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">システム設定に従う</SelectItem>
                  <SelectItem value="light">ライト</SelectItem>
                  <SelectItem value="dark">ダーク</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full"
              onClick={handleSave}
              disabled={testStatus !== 'success'}
            >
              設定を保存して始める
            </Button>

            {isConfigured && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => navigate('/')}
              >
                キャンセル
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
