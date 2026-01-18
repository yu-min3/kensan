import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/useAuthStore'
import { Loader2, AlertCircle } from 'lucide-react'

type Mode = 'login' | 'register'

export function LoginPage() {
  const navigate = useNavigate()
  const { login, register, isLoading, error, clearError } = useAuthStore()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, password, name)
      }
      navigate('/')
    } catch {
      // Error is already set in the store
    }
  }

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    clearError()
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Kensan</h1>
          <p className="text-muted-foreground mt-1">自己研鑽プラットフォーム</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{mode === 'login' ? 'ログイン' : 'アカウント登録'}</CardTitle>
            <CardDescription>
              {mode === 'login'
                ? 'メールアドレスとパスワードでログイン'
                : '新しいアカウントを作成します'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div className="space-y-2">
                  <Label htmlFor="name">名前</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="山田 太郎"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">パスワード</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  required
                  minLength={8}
                />
                {mode === 'register' && (
                  <p className="text-xs text-muted-foreground">
                    8文字以上で入力してください
                  </p>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {mode === 'login' ? 'ログイン' : '登録'}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              <span className="text-muted-foreground">
                {mode === 'login' ? 'アカウントをお持ちでない方は' : 'すでにアカウントをお持ちの方は'}
              </span>
              <button
                type="button"
                onClick={toggleMode}
                className="ml-1 text-primary hover:underline"
              >
                {mode === 'login' ? '新規登録' : 'ログイン'}
              </button>
            </div>

            {/* デモ用: MSWモード時のヒント */}
            {import.meta.env.DEV && (
              <div className="mt-6 p-3 bg-muted rounded-lg text-xs text-muted-foreground">
                <p className="font-medium mb-1">開発モード</p>
                <p>任意のメールアドレスとパスワードでログインできます</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
