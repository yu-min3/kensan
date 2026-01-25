import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { LoginPage } from '@/pages/LoginPage'
import { S01Settings } from '@/pages/S01_Settings'
import { S02Dashboard } from '@/pages/S02_Dashboard'
import { DailyPage } from '@/pages/DailyPage'
import { N01NoteList } from '@/pages/N01_NoteList'
import { N02NoteEdit } from '@/pages/N02_NoteEdit'
import { T01TaskManagement } from '@/pages/T01_TaskManagement'
import { R01RoutineTaskManagement } from '@/pages/R01_RoutineTaskManagement'
import { A01AnalyticsReport } from '@/pages/A01_AnalyticsReport'
import { A02AIReview } from '@/pages/A02_AIReview'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useInitializeData } from '@/hooks/useInitializeData'
import { useTheme } from '@/hooks/useTheme'

function App() {
  // テーマをDOMに適用（アプリ起動時に実行）
  useTheme()
  const { isAuthenticated } = useAuthStore()
  const { isConfigured } = useSettingsStore()
  const { initialized, isLoading } = useInitializeData()

  // 未認証の場合はデータ初期化をスキップ
  const shouldShowLoading = isAuthenticated && (!initialized || isLoading)

  if (shouldShowLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* 認証前のルート */}
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
          }
        />

        {/* 設定画面（認証後、初期設定前） */}
        <Route
          path="/settings"
          element={
            isAuthenticated ? <S01Settings /> : <Navigate to="/login" replace />
          }
        />

        {/* メインアプリ（認証後、初期設定後） */}
        <Route
          path="/"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : !isConfigured ? (
              <Navigate to="/settings" replace />
            ) : (
              <Layout />
            )
          }
        >
          <Route index element={<S02Dashboard />} />
          <Route path="daily" element={<DailyPage />} />
          {/* 後方互換のため旧ルートもリダイレクト */}
          <Route path="morning" element={<Navigate to="/daily" replace />} />
          <Route path="evening" element={<Navigate to="/daily" replace />} />
          <Route path="notes" element={<N01NoteList />} />
          <Route path="notes/new" element={<N02NoteEdit />} />
          <Route path="notes/:id" element={<N02NoteEdit />} />
          <Route path="tasks" element={<T01TaskManagement />} />
          <Route path="routines" element={<R01RoutineTaskManagement />} />
          <Route path="analytics" element={<A01AnalyticsReport />} />
          <Route path="ai-review" element={<A02AIReview />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
