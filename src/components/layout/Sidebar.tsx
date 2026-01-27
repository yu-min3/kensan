import { NavLink } from 'react-router-dom'
import {
  CalendarDays,
  StickyNote,
  FolderKanban,
  BarChart3,
  Bot,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  badge?: string
}

const navItems: NavItem[] = [
  { to: '/', icon: CalendarDays, label: 'デイリー' },
  { to: '/notes', icon: StickyNote, label: 'ノート' },
  { to: '/tasks', icon: FolderKanban, label: 'タスク管理' },
  { to: '/analytics', icon: BarChart3, label: '分析・レポート' },
  { to: '/ai-review', icon: Bot, label: 'AI振り返り', badge: 'Phase 2' },
]

export function Sidebar() {
  return (
    <aside className="w-60 border-r bg-muted/40 h-full">
      <nav className="flex flex-col gap-1 p-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors relative',
                isActive
                  ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-900 dark:text-sky-100 font-medium before:absolute before:left-0 before:top-1 before:bottom-1 before:w-1 before:bg-sky-300 before:rounded-full'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <item.icon className="h-4 w-4" />
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted-foreground/20 text-muted-foreground">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
