import { Settings, Bell, Sun, Moon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useSettingsStore } from '@/stores/useSettingsStore'

export function Header() {
  const { userName, theme, setTheme } = useSettingsStore()

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  return (
    <header className="h-14 border-b bg-background px-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary">Kensan</span>
          <span className="text-sm text-muted-foreground">研鑽</span>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>

        <Link to="/settings">
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </Link>

        <div className="flex items-center gap-2 ml-2 pl-2 border-l">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
            {userName.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium">{userName}</span>
        </div>
      </div>
    </header>
  )
}
