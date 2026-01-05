import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export function S01Settings() {
  const navigate = useNavigate()
  const {
    clockifyApiKey,
    workspaceName,
    timezone,
    theme,
    isConfigured,
    setClockifyApiKey,
    setWorkspace,
    setTimezone,
    setTheme,
    setIsConfigured,
  } = useSettingsStore()

  const [apiKey, setApiKey] = useState(clockifyApiKey || '')
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')

  const handleTestConnection = async () => {
    setTestStatus('testing')
    // モック: 2秒後に成功
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setTestStatus('success')
    setClockifyApiKey(apiKey)
    setWorkspace('ws-12345', 'Personal Workspace')
  }

  const handleSave = () => {
    setIsConfigured(true)
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
                  接続成功: {workspaceName}
                </div>
              )}
              {testStatus === 'error' && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  接続に失敗しました
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Clockify設定 → API → APIキー から取得できます
              </p>
            </div>

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
