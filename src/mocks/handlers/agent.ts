import { http, HttpResponse } from 'msw'
import { tasks } from '../data'
import { generateId } from '../data'

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
    { id: 'msg-1-assistant', role: 'assistant', content: 'タスクを確認して、今日のスケジュールを提案しますね。\n\n以下のスケジュールを提案します：\n- 09:00-11:00 CKA模擬試験\n- 11:00-12:00 Ciliumハンズオン\n- 14:00-16:00 ブログ記事執筆', situation: 'chat', toolCalls: [], createdAt: '2026-01-31T09:00:05.000Z' },
    { id: 'msg-2-user', role: 'user', content: 'ありがとう、実行して', situation: 'chat', toolCalls: [], createdAt: '2026-01-31T09:01:00.000Z' },
    { id: 'msg-2-assistant', role: 'assistant', content: '3件のタイムブロックを作成しました。', situation: 'chat', toolCalls: [], createdAt: '2026-01-31T09:01:05.000Z' },
  ],
  'conv-002': [
    { id: 'msg-3-user', role: 'user', content: 'タスクの進捗を確認して', situation: 'chat', toolCalls: [], createdAt: '2026-01-30T14:30:00.000Z' },
    { id: 'msg-3-assistant', role: 'assistant', content: '未完了タスクが5件あります：\n\n- CKA模擬試験\n- Ciliumハンズオン Lab 4\n- ブログ記事下書き\n- Prometheus設定\n- 英語学習', situation: 'chat', toolCalls: [], createdAt: '2026-01-30T14:30:05.000Z' },
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
        if (
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
          // Weekly review generation
          controller.enqueue(
            encoder.encode(sseEvent('text', { content: '振り返りレビューを生成します。データを分析中...\n\n' }))
          )
          await delay(500)

          const reviewJson = {
            weekStart: '2026-01-27',
            weekEnd: '2026-01-31',
            taskEvaluations: [
              { taskName: 'CKA模擬試験', status: 'good', comment: '計画通り3回完了。正答率78%→85%に改善。' },
              { taskName: 'Ciliumハンズオン', status: 'partial', comment: 'Lab 3まで完了。Lab 4-5は未着手。' },
              { taskName: 'ブログ記事執筆', status: 'missed', comment: '着手できず。来週に持ち越し。' },
            ],
            timeEvaluations: [
              { goalName: 'Golden Kubestronaut', goalColor: '#0EA5E9', actualMinutes: 720, targetMinutes: 900, comment: '月〜水に集中できた。木金が手薄。' },
              { goalName: 'OSS活動', goalColor: '#10B981', actualMinutes: 300, targetMinutes: 300, comment: '目標通り。PR 2件マージ。' },
              { goalName: 'アウトプット', goalColor: '#F59E0B', actualMinutes: 60, targetMinutes: 180, comment: 'ブログ未着手のため大幅に不足。' },
            ],
            learningSummary: '今週はKubernetesのネットワーキング層を中心に学習。CiliumのeBPFベースのデータプレーンの仕組みと、従来のiptablesベースとの違いを理解した。CKA試験ではNetworkPolicy問題の正答率が特に改善。',
            goodPoints: [
              'CKA模擬試験のスコアが着実に向上（78%→85%）',
              'OSS活動でPR 2件マージ達成',
              '月〜水の午前中に集中学習の習慣が定着',
            ],
            improvementPoints: [
              '木金の集中時間が確保できていない',
              'Ciliumハンズオンが中断したまま',
              'ブログ執筆に全く着手できなかった',
            ],
            advice: [
              '木金の午前にタイムブロックを固定して集中時間を確保する',
              'Ciliumは1日30分の短い単位に分割して毎日少しずつ進める',
              'ブログは下書きだけでも火曜に着手し、木曜に仕上げるサイクルを試す',
            ],
            summary: '全体として計画の72%を達成。前半は順調だったが後半に失速。',
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
