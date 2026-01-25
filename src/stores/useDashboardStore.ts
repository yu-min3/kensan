import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TodayFocus, PinnedReminder, StickyNote, StickyNoteColor, StreakData } from '@/types'

interface DashboardState {
  // 今日のフォーカス
  todayFocus: TodayFocus | null

  // ピン留め
  pinnedReminders: PinnedReminder[]

  // 付箋
  stickyNotes: StickyNote[]

  // ストリーク (モックデータ)
  streaks: StreakData[]

  // 今日のフォーカス操作
  setTodayFocus: (text: string, taskId?: string) => void
  completeTodayFocus: () => void
  clearTodayFocus: () => void

  // ピン留め操作
  addPinnedReminder: (text: string, deadline?: string) => void
  updatePinnedReminder: (id: string, updates: Partial<Pick<PinnedReminder, 'text' | 'deadline' | 'completed'>>) => void
  deletePinnedReminder: (id: string) => void
  togglePinnedReminder: (id: string) => void
  reorderPinnedReminders: (ids: string[]) => void

  // 付箋操作
  addStickyNote: (content: string, color?: StickyNoteColor) => void
  updateStickyNote: (id: string, updates: Partial<Pick<StickyNote, 'content' | 'color'>>) => void
  deleteStickyNote: (id: string) => void
  reorderStickyNotes: (ids: string[]) => void
}

const generateId = () => crypto.randomUUID()

// モックストリークデータ
const initialStreaks: StreakData[] = [
  { type: 'learning', label: '学習', currentStreak: 12, longestStreak: 30 },
]

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      todayFocus: null,
      pinnedReminders: [],
      stickyNotes: [],
      streaks: initialStreaks,

      // 今日のフォーカス
      setTodayFocus: (text, taskId) => {
        const current = get().todayFocus
        if (current) {
          // 既存のフォーカスを更新
          set({
            todayFocus: {
              ...current,
              text,
              taskId,
            },
          })
        } else {
          // 新規作成
          set({
            todayFocus: {
              id: generateId(),
              text,
              taskId,
              createdAt: new Date(),
            },
          })
        }
      },

      completeTodayFocus: () => {
        const current = get().todayFocus
        if (current && !current.completedAt) {
          set({
            todayFocus: {
              ...current,
              completedAt: new Date(),
            },
          })
        }
      },

      clearTodayFocus: () => {
        set({ todayFocus: null })
      },

      // ピン留め
      addPinnedReminder: (text, deadline) => {
        const reminders = get().pinnedReminders
        const maxOrder = reminders.length > 0
          ? Math.max(...reminders.map((r) => r.sortOrder))
          : 0

        set({
          pinnedReminders: [
            ...reminders,
            {
              id: generateId(),
              text,
              deadline,
              completed: false,
              sortOrder: maxOrder + 1,
              createdAt: new Date(),
            },
          ],
        })
      },

      updatePinnedReminder: (id, updates) => {
        set({
          pinnedReminders: get().pinnedReminders.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        })
      },

      deletePinnedReminder: (id) => {
        set({
          pinnedReminders: get().pinnedReminders.filter((r) => r.id !== id),
        })
      },

      togglePinnedReminder: (id) => {
        set({
          pinnedReminders: get().pinnedReminders.map((r) =>
            r.id === id ? { ...r, completed: !r.completed } : r
          ),
        })
      },

      reorderPinnedReminders: (ids) => {
        const reminders = get().pinnedReminders
        const reordered = ids.map((id, index) => {
          const reminder = reminders.find((r) => r.id === id)
          if (!reminder) return null
          return { ...reminder, sortOrder: index }
        }).filter((r): r is PinnedReminder => r !== null)

        set({ pinnedReminders: reordered })
      },

      // 付箋
      addStickyNote: (content, color = 'yellow') => {
        const notes = get().stickyNotes
        const maxOrder = notes.length > 0
          ? Math.max(...notes.map((n) => n.sortOrder))
          : 0

        set({
          stickyNotes: [
            ...notes,
            {
              id: generateId(),
              content,
              color,
              sortOrder: maxOrder + 1,
              createdAt: new Date(),
            },
          ],
        })
      },

      updateStickyNote: (id, updates) => {
        set({
          stickyNotes: get().stickyNotes.map((n) =>
            n.id === id ? { ...n, ...updates } : n
          ),
        })
      },

      deleteStickyNote: (id) => {
        set({
          stickyNotes: get().stickyNotes.filter((n) => n.id !== id),
        })
      },

      reorderStickyNotes: (ids) => {
        const notes = get().stickyNotes
        const reordered = ids.map((id, index) => {
          const note = notes.find((n) => n.id === id)
          if (!note) return null
          return { ...note, sortOrder: index }
        }).filter((n): n is StickyNote => n !== null)

        set({ stickyNotes: reordered })
      },
    }),
    {
      name: 'kensan-dashboard',
      partialize: (state) => ({
        todayFocus: state.todayFocus,
        pinnedReminders: state.pinnedReminders,
        stickyNotes: state.stickyNotes,
      }),
    }
  )
)
