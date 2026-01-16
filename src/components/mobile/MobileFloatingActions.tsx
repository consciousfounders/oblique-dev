import { useState } from 'react'
import { Plus, X, User, Briefcase, ListTodo, Phone } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useMobileDetect } from '@/lib/hooks/useMobileDetect'

interface FloatingAction {
  icon: React.ReactNode
  label: string
  onClick: () => void
  color: string
}

export function MobileFloatingActions() {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()
  const { isMobile } = useMobileDetect()

  if (!isMobile) {
    return null
  }

  const actions: FloatingAction[] = [
    {
      icon: <User className="w-5 h-5" />,
      label: 'New Contact',
      onClick: () => {
        navigate('/contacts/new')
        setIsOpen(false)
      },
      color: 'bg-blue-500',
    },
    {
      icon: <Briefcase className="w-5 h-5" />,
      label: 'New Deal',
      onClick: () => {
        navigate('/deals/new')
        setIsOpen(false)
      },
      color: 'bg-green-500',
    },
    {
      icon: <ListTodo className="w-5 h-5" />,
      label: 'New Task',
      onClick: () => {
        navigate('/tasks/new')
        setIsOpen(false)
      },
      color: 'bg-purple-500',
    },
    {
      icon: <Phone className="w-5 h-5" />,
      label: 'Log Call',
      onClick: () => {
        navigate('/activities/new?type=call')
        setIsOpen(false)
      },
      color: 'bg-amber-500',
    },
  ]

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* FAB Container - positioned above bottom nav */}
      <div className="fixed bottom-20 right-4 z-50 md:hidden flex flex-col-reverse items-end gap-3">
        {/* Action buttons */}
        {isOpen &&
          actions.map((action, index) => (
            <div
              key={action.label}
              className="flex items-center gap-3 animate-in slide-in-from-bottom-2 fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <span className="bg-background px-3 py-1.5 rounded-lg shadow-lg text-sm font-medium">
                {action.label}
              </span>
              <button
                onClick={action.onClick}
                className={cn(
                  'w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white',
                  action.color
                )}
              >
                {action.icon}
              </button>
            </div>
          ))}

        {/* Main FAB */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-all',
            isOpen ? 'bg-gray-700 rotate-45' : 'bg-primary'
          )}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </button>
      </div>
    </>
  )
}
