import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { BriefingLayout } from '@/components/briefing/BriefingLayout'
import { ActualVsPlannedCard } from '@/components/briefing/cards/ActualVsPlannedCard'
import { CompletedTasksCard } from '@/components/briefing/cards/CompletedTasksCard'
import { AiInsightCard } from '@/components/briefing/cards/AiInsightCard'
import { TomorrowFocusCard } from '@/components/briefing/cards/TomorrowFocusCard'
import { TimeblockProposalCard } from '@/components/briefing/cards/TimeblockProposalCard'
import type { BriefingData } from '@/hooks/useBriefingData'

function EveningCards({ data }: { data: BriefingData }) {
  return (
    <div className="space-y-4">
      {/* 2-column grid for data cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium">実績 vs 計画</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ActualVsPlannedCard data={data.actualVsPlanned} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium">今日の完了タスク</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <CompletedTasksCard tasks={data.completedTasks} />
          </CardContent>
        </Card>
      </div>

      {/* Full-width AI insight + learning diary */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium">振り返り・学習日記</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <AiInsightCard mode="evening" />
        </CardContent>
      </Card>

      {/* 2-column grid for tomorrow planning */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium">明日のタスク提案</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <TomorrowFocusCard tasks={data.tomorrowFocusTasks} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium">明日のタイムブロック提案</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <TimeblockProposalCard />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function B02Reflection() {
  return (
    <BriefingLayout
      mode="evening"
      renderCards={(data) => <EveningCards data={data} />}
    />
  )
}
