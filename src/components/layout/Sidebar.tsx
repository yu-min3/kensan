import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Sun,
  Moon,
  BookOpen,
  BookMarked,
  FolderKanban,
  RotateCcw,
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
  { to: '/', icon: LayoutDashboard, label: 'ダッシュボード' },
  { to: '/morning', icon: Sun, label: '朝の画面' },
  { to: '/evening', icon: Moon, label: '夜の画面' },
  { to: '/learning-records', icon: BookOpen, label: '学習記録' },
  { to: '/diary', icon: BookMarked, label: '日記', badge: 'Phase 2' },
  { to: '/tasks', icon: FolderKanban, label: 'タスク管理' },
  { to: '/routines', icon: RotateCcw, label: '定期タスク' },
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
                  ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-900 dark:text-sky-100 font-medium before:absolute before:left-0 before:top-1 before:bottom-1 before:w-1 before:bg-sky-500 before:rounded-full'
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
