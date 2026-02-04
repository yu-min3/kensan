import { NavLink } from 'react-router-dom'
import {
  CalendarDays,
  StickyNote,
  FolderKanban,
  BarChart3,
  Activity,
  Sun,
  Moon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  badge?: string
}

interface NavSection {
  label?: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    items: [
      { to: '/', icon: CalendarDays, label: 'デイリー' },
    ],
  },
  {
    label: '記録・管理',
    items: [
      { to: '/notes', icon: StickyNote, label: 'ノート' },
      { to: '/tasks', icon: FolderKanban, label: 'タスク管理' },
      { to: '/analytics', icon: BarChart3, label: '分析・レポート' },
    ],
  },
  {
    label: 'AI',
    items: [
      { to: '/briefing', icon: Sun, label: 'ブリーフィング' },
      { to: '/reflection', icon: Moon, label: '振り返り' },
      { to: '/interactions', icon: Activity, label: 'AI Explorer' },
    ],
  },
]

function NavItemLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors relative',
          isActive
            ? 'bg-brand/15 dark:bg-brand/20 text-brand dark:text-brand font-medium before:absolute before:left-0 before:top-1 before:bottom-1 before:w-1 before:bg-brand/60 before:rounded-full'
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
  )
}

export function Sidebar() {
  return (
    <aside className="w-60 border-r bg-muted/40 h-full">
      <nav className="flex flex-col gap-4 p-4">
        {navSections.map((section, i) => (
          <div key={i} className="flex flex-col gap-1">
            {section.label && (
              <span className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                {section.label}
              </span>
            )}
            {section.items.map((item) => (
              <NavItemLink key={item.to} item={item} />
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}
