import { useEffect, useState } from 'react'
import { StoreProvider, useHQ } from './store.jsx'
import { TimerProvider, useTimer } from './features/timer/timerState.jsx'
import { Icon } from './components/icons.jsx'
import { fmtClock } from './lib/dates.js'
import TasksView from './features/tasks/TasksView.jsx'
import KanbanView from './features/kanban/KanbanView.jsx'
import CalendarView from './features/calendar/CalendarView.jsx'
import TimerView from './features/timer/TimerView.jsx'
import NotesView from './features/notes/NotesView.jsx'

const NAV = [
  { hash: '#/tasks', label: 'Tasks', icon: 'list', View: TasksView },
  { hash: '#/board', label: 'Board', icon: 'board', View: KanbanView },
  { hash: '#/calendar', label: 'Calendar', icon: 'calendar', View: CalendarView },
  { hash: '#/focus', label: 'Focus', icon: 'timer', View: TimerView },
  { hash: '#/notes', label: 'Notes', icon: 'note', View: NotesView },
]

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash || '#/tasks')
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || '#/tasks')
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash.split('?')[0]
}

// Sidebar badge: the running timer follows you to every screen.
function TimerBadge() {
  const timer = useTimer()
  const { tasks } = useHQ()
  if (timer.phase === 'idle') return null
  const task = tasks.find((t) => t.id === timer.taskId)
  return (
    <a
      href="#/focus"
      className={`card mx-3 mb-3 block border px-3 py-2 ${
        timer.phase === 'focus' ? 'border-gold/50' : 'border-green/50'
      }`}
    >
      <div className="label">{timer.phase === 'focus' ? (timer.paused ? 'paused' : 'focusing') : 'break'}</div>
      <div className="font-mono text-lg tabular-nums text-fg">{fmtClock(timer.remainingMs)}</div>
      {task && <div className="truncate text-xs text-mut">{task.title}</div>}
    </a>
  )
}

function Shell() {
  const route = useHashRoute()
  const { loaded, error, refresh } = useHQ()
  const current = NAV.find((n) => n.hash === route) || NAV[0]
  const View = current.View

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-52 shrink-0 flex-col border-r border-line bg-panel/50">
        <div className="px-5 pb-4 pt-5">
          <a href="#/tasks" className="text-2xl font-bold tracking-tight">
            HQ<span className="text-gold">.</span>
          </a>
        </div>
        <nav className="flex flex-col gap-0.5 px-3">
          {NAV.map((n) => (
            <a
              key={n.hash}
              href={n.hash}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                current.hash === n.hash ? 'bg-panel2 text-gold' : 'text-mut hover:bg-panel2/60 hover:text-fg'
              }`}
            >
              <Icon name={n.icon} />
              {n.label}
            </a>
          ))}
        </nav>
        <div className="mt-auto">
          <TimerBadge />
          <div className="border-t border-line px-5 py-3 font-mono text-[10px] text-mut/70">
            local · data/ · yours
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        {error && (
          <div className="m-4 flex items-center justify-between rounded-lg border border-red/50 bg-red/10 px-4 py-2 text-sm text-red">
            <span>{error}</span>
            <button className="btn-ghost" onClick={refresh}>
              Retry
            </button>
          </div>
        )}
        {loaded ? (
          <View />
        ) : (
          <div className="flex h-full items-center justify-center font-mono text-sm text-mut">loading…</div>
        )}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <TimerProvider>
        <Shell />
      </TimerProvider>
    </StoreProvider>
  )
}
