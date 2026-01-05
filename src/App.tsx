import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { S01Settings } from '@/pages/S01_Settings'
import { S02Dashboard } from '@/pages/S02_Dashboard'
import { M01Morning } from '@/pages/M01_Morning'
import { E01Evening } from '@/pages/E01_Evening'
import { L01LearningRecordList } from '@/pages/L01_LearningRecordList'
import { L02LearningRecordEdit } from '@/pages/L02_LearningRecordEdit'
import { D01DiaryList } from '@/pages/D01_DiaryList'
import { D02DiaryEdit } from '@/pages/D02_DiaryEdit'
import { T01TaskManagement } from '@/pages/T01_TaskManagement'
import { R01RoutineTaskManagement } from '@/pages/R01_RoutineTaskManagement'
import { A01AnalyticsReport } from '@/pages/A01_AnalyticsReport'
import { A02AIReview } from '@/pages/A02_AIReview'
import { useSettingsStore } from '@/stores/useSettingsStore'

function App() {
  const { isConfigured } = useSettingsStore()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/settings" element={<S01Settings />} />
        <Route
          path="/"
          element={
            isConfigured ? (
              <Layout />
            ) : (
              <Navigate to="/settings" replace />
            )
          }
        >
          <Route index element={<S02Dashboard />} />
          <Route path="morning" element={<M01Morning />} />
          <Route path="evening" element={<E01Evening />} />
          <Route path="learning-records" element={<L01LearningRecordList />} />
          <Route path="learning-records/new" element={<L02LearningRecordEdit />} />
          <Route path="learning-records/:id" element={<L02LearningRecordEdit />} />
          <Route path="diary" element={<D01DiaryList />} />
          <Route path="diary/new" element={<D02DiaryEdit />} />
          <Route path="diary/:id" element={<D02DiaryEdit />} />
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
