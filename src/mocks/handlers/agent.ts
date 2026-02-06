import { http, HttpResponse } from 'msw'
import { tasks, goals, milestones, timeEntries, weeklySummary, generateId } from '../data'

const BASE_URL = 'http://localhost:8089/api/v1'

function sseEvent(event: string, data: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Mock conversation history data
const mockConversations = [
  {
    id: 'conv-001',
    lastMessage: '今日の予定立てて',
    lastMessageAt: '2026-01-31T09:00:00.000Z',
    messageCount: 4,
  },
  {
    id: 'conv-002',
    lastMessage: 'タスクの進捗を確認して',
    lastMessageAt: '2026-01-30T14:30:00.000Z',
    messageCount: 2,
  },
  {
    id: 'conv-003',
    lastMessage: '週次振り返りレビューを生成して',
    lastMessageAt: '2026-01-27T18:00:00.000Z',
    messageCount: 6,
  },
]

const mockConversationMessages: Record<string, Array<{ id: string; role: string; content: string; situation: string; toolCalls: unknown[]; createdAt: string }>> = {
  'conv-001': [
    { id: 'msg-1-user', role: 'user', content: '今日の予定立てて', situation: 'chat', toolCalls: [], createdAt: '2026-01-31T09:00:00.000Z' },
    { id: 'msg-1-assistant', role: 'assistant', content: 'タスクを確認して、今日のスケジュールを提案しますね。\n\n以下のスケジュールを提案します：\n- 09:00-11:00 ICA試験勉強 - Traffic Management\n- 11:30-13:30 Kensan開発 - コンポーネント実装\n- 14:00-15:00 Istio記事執筆', situation: 'chat', toolCalls: [], createdAt: '2026-01-31T09:00:05.000Z' },
    { id: 'msg-2-user', role: 'user', content: 'ありがとう、実行して', situation: 'chat', toolCalls: [], createdAt: '2026-01-31T09:01:00.000Z' },
    { id: 'msg-2-assistant', role: 'assistant', content: '3件のタイムブロックを作成しました。', situation: 'chat', toolCalls: [], createdAt: '2026-01-31T09:01:05.000Z' },
  ],
  'conv-002': [
    { id: 'msg-3-user', role: 'user', content: 'タスクの進捗を確認して', situation: 'chat', toolCalls: [], createdAt: '2026-01-30T14:30:00.000Z' },
    { id: 'msg-3-assistant', role: 'assistant', content: '未完了タスクが5件あります：\n\n- ICA試験勉強 - Traffic Management\n- ICA試験勉強 - Security\n- Kensan開発 - コンポーネント実装\n- Istio記事執筆\n- 技術書読書', situation: 'chat', toolCalls: [], createdAt: '2026-01-30T14:30:05.000Z' },
  ],
  'conv-003': [
    { id: 'msg-4-user', role: 'user', content: '週次振り返りレビューを生成して', situation: 'weekly', toolCalls: [], createdAt: '2026-01-27T18:00:00.000Z' },
    { id: 'msg-4-assistant', role: 'assistant', content: '振り返りレビューを生成します。データを分析中...\n\n全体として計画の72%を達成。前半は順調だったが後半に失速。', situation: 'weekly', toolCalls: [], createdAt: '2026-01-27T18:00:10.000Z' },
  ],
}

export const agentHandlers = [
  // POST /agent/stream - SSE streaming endpoint
  http.post(`${BASE_URL}/agent/stream`, async ({ request }) => {
    const body = (await request.json()) as {
      message: string
      conversation_id?: string
      situation?: string
    }
    const message = body.message.toLowerCase()
    const conversationId = body.conversation_id || generateId('conv')

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        // ==========================================
        // Situation-specific handlers
        // ==========================================
        if (body.situation === 'planning') {
          // AI Planning - generate structured plan from mock data
          controller.enqueue(encoder.encode(sseEvent('text', { content: 'タスクと行動パターンを分析しています...\n\n' })))
          await delay(500)

          // Get actionable (leaf-level) incomplete tasks
          const leafTasks = tasks.filter(t =>
            !t.completed && !tasks.some(child => child.parentTaskId === t.id)
          )

          // Build proposed blocks from top tasks
          const blockSlots = [
            { start: '09:00', end: '11:00' },
            { start: '11:30', end: '13:30' },
            { start: '14:00', end: '15:00' },
            { start: '15:30', end: '16:30' },
          ]
          const proposedBlocks = leafTasks.slice(0, blockSlots.length).map((task, i) => {
            const ms = task.milestoneId ? milestones.find(m => m.id === task.milestoneId) : undefined
            const goal = ms ? goals.find(g => g.id === ms.goalId) : undefined
            return {
              taskId: task.id,
              taskName: task.name,
              goalId: goal?.id || null,
              goalName: goal?.name || '',
              goalColor: goal?.color || '',
              startTime: blockSlots[i].start,
              endTime: blockSlots[i].end,
              reason: ms ? `${ms.name}（期限: ${ms.targetDate || '未設定'}）` : '日常タスク',
            }
          })

          // Build task priorities
          const taskPriorities = leafTasks.slice(0, 5).map((task, i) => {
            const ms = task.milestoneId ? milestones.find(m => m.id === task.milestoneId) : undefined
            let reason = '優先度中'
            if (ms?.targetDate) {
              const daysLeft = Math.ceil((new Date(ms.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              reason = `${ms.name}の期限まで残り${daysLeft}日`
            }
            return {
              taskId: task.id,
              taskName: task.name,
              suggestedAction: (i < 3 ? 'today' : 'defer') as 'today' | 'defer' | 'split',
              reason,
            }
          })

          const planningJson = {
            insights: [
              {
                category: 'productivity',
                title: '午前の生産性が高い傾向',
                description: '過去の記録から、9:00-12:00の集中度が最も高い傾向にあります。重要タスクを午前に配置しました。',
              },
              {
                category: 'goal',
                title: 'ICA試験が近づいています',
                description: 'Traffic Managementの進捗は順調。Securityセクションへの着手を推奨します。',
              },
            ],
            proposedBlocks,
            taskPriorities,
            alerts: [
              {
                type: 'goal_stalled',
                message: 'アウトプット目標: 今月のブログ投稿がまだ0件です。Istio記事の着手を推奨します。',
              },
            ],
          }

          controller.enqueue(
            encoder.encode(
              sseEvent('text', {
                content: '```json\n' + JSON.stringify(planningJson, null, 2) + '\n```',
              })
            )
          )
        } else if (
          message.includes('タスク') &&
          (message.includes('見せて') || message.includes('確認') || message.includes('一覧'))
        ) {
          // Read-only: show tasks
          controller.enqueue(encoder.encode(sseEvent('text', { content: 'タスクを確認しますね。' })))
          await delay(300)

          const incompleteTasks = tasks.filter((t) => !t.completed).slice(0, 5)
          controller.enqueue(
            encoder.encode(
              sseEvent('tool_call', {
                id: 'tc_1',
                name: 'get_tasks',
                input: { completed: false },
              })
            )
          )
          await delay(500)

          controller.enqueue(
            encoder.encode(
              sseEvent('tool_result', {
                id: 'tc_1',
                name: 'get_tasks',
                result: incompleteTasks.map((t) => ({
                  id: t.id,
                  name: t.name,
                })),
              })
            )
          )
          await delay(300)

          const taskList = incompleteTasks.map((t) => `- ${t.name}`).join('\n')
          controller.enqueue(
            encoder.encode(
              sseEvent('text', {
                content: `未完了タスクが${incompleteTasks.length}件あります：\n\n${taskList}`,
              })
            )
          )
        } else if (
          message.includes('予定') &&
          (message.includes('立てて') || message.includes('作って') || message.includes('計画'))
        ) {
          // Write: propose time blocks
          controller.enqueue(
            encoder.encode(
              sseEvent('text', { content: 'タスクを確認して、今日のスケジュールを提案しますね。' })
            )
          )
          await delay(300)

          controller.enqueue(
            encoder.encode(
              sseEvent('tool_call', {
                id: 'tc_1',
                name: 'get_tasks',
                input: { completed: false },
              })
            )
          )
          await delay(500)

          const incompleteTasks = tasks.filter((t) => !t.completed).slice(0, 3)
          controller.enqueue(
            encoder.encode(
              sseEvent('tool_result', {
                id: 'tc_1',
                name: 'get_tasks',
                result: incompleteTasks.map((t) => ({ id: t.id, name: t.name })),
              })
            )
          )
          await delay(300)

          controller.enqueue(
            encoder.encode(sseEvent('text', { content: '以下のスケジュールを提案します：' }))
          )
          await delay(200)

          const actions = incompleteTasks.map((t, i) => ({
            id: `a${i + 1}`,
            type: 'create_time_block',
            description: `${9 + i * 2}:00-${10 + i * 2}:00 ${t.name}`,
            input: {
              date: new Date().toISOString().split('T')[0],
              startTime: `${String(9 + i * 2).padStart(2, '0')}:00`,
              endTime: `${String(10 + i * 2).padStart(2, '0')}:00`,
              taskId: t.id,
              title: t.name,
            },
          }))

          controller.enqueue(encoder.encode(sseEvent('action_proposal', { actions })))
        } else if (
          message.includes('レビュー') &&
          (message.includes('生成') || message.includes('振り返り'))
        ) {
          // Weekly review generation - built from actual mock data
          controller.enqueue(
            encoder.encode(sseEvent('text', { content: '振り返りレビューを生成します。データを分析中...\n\n' }))
          )
          await delay(500)

          // Build task evaluations from actually worked tasks (via timeEntries)
          const workedTaskMap = new Map<string, string>()
          for (const te of timeEntries) {
            if (!te.taskId) continue
            const task = tasks.find(t => t.id === te.taskId)
            if (!task) continue
            const parentId = task.parentTaskId || task.id
            const parent = task.parentTaskId ? tasks.find(t => t.id === task.parentTaskId) : task
            if (parent && !workedTaskMap.has(parentId)) {
              workedTaskMap.set(parentId, parent.name)
            }
          }

          const taskEvaluations = [...workedTaskMap.entries()].map(([id, name]) => {
            const subtasks = tasks.filter(t => t.parentTaskId === id)
            const completed = subtasks.filter(t => t.completed).length
            const total = subtasks.length
            if (total > 0) {
              const ratio = completed / total
              return {
                taskName: name,
                status: ratio >= 0.5 ? 'good' : 'partial',
                comment: `サブタスク${completed}/${total}完了。${ratio >= 0.5 ? '順調に進行中。' : '進捗の加速が必要。'}`,
              }
            }
            return { taskName: name, status: 'partial', comment: '今週取り組んだ。引き続き進行中。' }
          })

          // Time evaluations from weeklySummary (actual learning time data)
          const timeEvaluations = weeklySummary.byGoal.map(g => {
            const targetMinutes = Math.round(g.minutes * 1.15)
            return {
              goalName: g.name,
              goalColor: g.color,
              actualMinutes: g.minutes,
              targetMinutes,
              comment: g.minutes >= targetMinutes * 0.9
                ? '目標を概ね達成。良いペース。'
                : `目標の${Math.round((g.minutes / targetMinutes) * 100)}%。改善の余地あり。`,
            }
          })

          const totalWeekHours = Math.floor(weeklySummary.totalMinutes / 60)
          const achieveRate = Math.round(
            (weeklySummary.plannedVsActual.actual / weeklySummary.plannedVsActual.planned) * 100
          )
          const workedNames = [...workedTaskMap.values()]

          const reviewJson = {
            weekStart: weeklySummary.weekStart,
            weekEnd: weeklySummary.weekEnd,
            taskEvaluations,
            timeEvaluations,
            learningSummary: `今週は合計${totalWeekHours}時間の学習を実施。${workedNames.join('、')}に取り組んだ。${weeklySummary.byGoal[0]?.name}を中心に学習を進め、着実に理解を深めている。`,
            goodPoints: [
              `総学習時間${totalWeekHours}時間を達成`,
              `${weeklySummary.completedTasks}件のタスクを完了`,
              weeklySummary.byGoal[0] ? `${weeklySummary.byGoal[0].name}に${Math.floor(weeklySummary.byGoal[0].minutes / 60)}時間を確保` : '',
            ].filter(Boolean),
            improvementPoints: [
              weeklySummary.plannedVsActual.actual < weeklySummary.plannedVsActual.planned
                ? `計画${Math.floor(weeklySummary.plannedVsActual.planned / 60)}hに対し実績${Math.floor(weeklySummary.plannedVsActual.actual / 60)}h（達成率${achieveRate}%）`
                : null,
              'アウトプット目標の時間確保が課題',
            ].filter(Boolean) as string[],
            advice: [
              '午前中に最も集中力の高いタスクを配置すると効果的',
              '短い時間でもブログの下書きに着手するとモメンタムが生まれる',
              '週後半の学習時間確保のため、木曜に軽めのタスクを配置する',
            ],
            summary: `全体として計画の${achieveRate}%を達成。${weeklySummary.byGoal[0]?.name}の学習が順調に進む一方、アウトプット時間の確保が課題。`,
          }

          controller.enqueue(
            encoder.encode(
              sseEvent('text', {
                content: '```json\n' + JSON.stringify(reviewJson, null, 2) + '\n```',
              })
            )
          )
        } else {
          // General chat
          controller.enqueue(
            encoder.encode(
              sseEvent('text', {
                content: `了解しました。「${body.message}」についてお手伝いします。\n\n現在の状況を確認しました。何か具体的に操作したいことがあれば教えてください。`,
              })
            )
          )
        }

        await delay(200)
        controller.enqueue(
          encoder.encode(
            sseEvent('done', {
              conversation_id: conversationId,
              tokens: { input: 500, output: 200 },
            })
          )
        )

        controller.close()
      },
    })

    return new HttpResponse(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    })
  }),

  // POST /agent/approve - Execute approved actions
  http.post(`${BASE_URL}/agent/approve`, async ({ request }) => {
    const body = (await request.json()) as {
      conversation_id: string
      action_ids: string[]
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        for (const actionId of body.action_ids) {
          controller.enqueue(
            encoder.encode(
              sseEvent('tool_call', {
                id: `tc_${actionId}`,
                name: 'create_time_block',
                input: {},
              })
            )
          )
          await delay(300)

          const newBlock = {
            id: generateId('tb'),
            title: `提案されたブロック ${actionId}`,
          }
          controller.enqueue(
            encoder.encode(
              sseEvent('tool_result', {
                id: `tc_${actionId}`,
                name: 'create_time_block',
                result: newBlock,
              })
            )
          )
          await delay(200)
        }

        controller.enqueue(
          encoder.encode(
            sseEvent('text', {
              content: `${body.action_ids.length}件のタイムブロックを作成しました。`,
            })
          )
        )
        controller.enqueue(
          encoder.encode(
            sseEvent('done', {
              conversation_id: body.conversation_id,
              tokens: { input: 100, output: 50 },
            })
          )
        )
        controller.close()
      },
    })

    return new HttpResponse(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    })
  }),

  // GET /conversations - List past conversations
  http.get(`${BASE_URL}/conversations`, () => {
    return HttpResponse.json({ conversations: mockConversations })
  }),

  // GET /conversations/:id - Get conversation messages
  http.get(`${BASE_URL}/conversations/:id`, ({ params }) => {
    const id = params.id as string
    const messages = mockConversationMessages[id]
    if (!messages) {
      return new HttpResponse(null, { status: 404 })
    }
    return HttpResponse.json({ messages })
  }),
]
