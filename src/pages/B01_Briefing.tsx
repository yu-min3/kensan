import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { BriefingLayout } from '@/components/briefing/BriefingLayout'
import { YesterdaySummaryCard } from '@/components/briefing/cards/YesterdaySummaryCard'
import { TodayFocusCard } from '@/components/briefing/cards/TodayFocusCard'
import { TimeblockProposalCard } from '@/components/briefing/cards/TimeblockProposalCard'
import { CarryoverTasksCard } from '@/components/briefing/cards/CarryoverTasksCard'
import { AiInsightCard } from '@/components/briefing/cards/AiInsightCard'
import type { BriefingData } from '@/hooks/useBriefingData'

function MorningCards({ data }: { data: BriefingData }) {
  return (
    <div className="space-y-4">
      {/* 2-column grid for data cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium">昨日の実績</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <YesterdaySummaryCard entries={data.yesterdayEntries} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium">今日のフォーカス</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <TodayFocusCard tasks={data.todayFocusTasks} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium">タイムブロック提案</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <TimeblockProposalCard />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium">持ち越しタスク</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <CarryoverTasksCard tasks={data.carryoverTasks} />
          </CardContent>
        </Card>
      </div>

      {/* Full-width AI insight card */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium">AIインサイト</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <AiInsightCard mode="morning" />
        </CardContent>
      </Card>
    </div>
  )
}

export function B01Briefing() {
  return (
    <BriefingLayout
      mode="morning"
      renderCards={(data) => <MorningCards data={data} />}
    />
  )
}
