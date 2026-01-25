import { TodayFocusCard } from './TodayFocusCard'
import { PinnedRemindersCard } from './PinnedRemindersCard'
import { StickyNotesArea } from './StickyNotesArea'
import { StreakDisplay } from './StreakDisplay'

export function DailyDashboard() {
  return (
    <div className="space-y-4">
      {/* 今日のフォーカス（幅いっぱい） */}
      <TodayFocusCard />

      {/* 2カラムレイアウト */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 左カラム: ピン留め + ストリーク */}
        <div className="space-y-4">
          <PinnedRemindersCard />
          <div className="px-1">
            <StreakDisplay />
          </div>
        </div>

        {/* 右カラム: 付箋 */}
        <div>
          <StickyNotesArea />
        </div>
      </div>
    </div>
  )
}
