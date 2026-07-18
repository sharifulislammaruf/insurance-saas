'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  Users,
  Target,
  CheckSquare,
  LogOut,
  Activity,
  AlertCircle,
  Moon,
  Sun
} from 'lucide-react'
import { useTheme } from '@/app/context/ThemeContext'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Claims', href: '/dashboard/claims', icon: AlertCircle },
  { name: 'Policies', href: '/dashboard/policies', icon: FileText },
  { name: 'Clients', href: '/dashboard/clients', icon: Users },
  { name: 'Leads', href: '/dashboard/leads', icon: Target },
  { name: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare },
]

export default function Sidebar({ onSignOut }: { onSignOut: () => void }) {
  const pathname = usePathname() || ''
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-colors duration-300">
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center h-16 flex-shrink-0 px-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Activity className="h-8 w-8 text-blue-500" />
            <span className="text-gray-900 dark:text-white font-bold text-lg">InsureHub</span>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/dashboard' && pathname?.startsWith(item.href))
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
                    ${isActive 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }
                  `}
                >
                  <item.icon className={`
                    mr-3 h-5 w-5 flex-shrink-0
                    ${isActive ? 'text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}
                  `} />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
        
        <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="mr-3 h-5 w-5 text-yellow-400" />
                Light Mode
              </>
            ) : (
              <>
                <Moon className="mr-3 h-5 w-5 text-gray-400" />
                Dark Mode
              </>
            )}
          </button>
          
          {/* Sign Out */}
          <button
            onClick={onSignOut}
            className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5 text-gray-400 dark:text-gray-500" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}