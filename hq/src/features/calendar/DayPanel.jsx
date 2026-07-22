// Day drill-down: everything on one date — events, due tasks, focus sessions —
// plus quick-add inputs so the day is editable without leaving the panel.
import { useState } from 'react'
import { useHQ } from '../../store.jsx'
import { Modal, Chip } from '../../components/ui.jsx'
import { Icon } from '../../components/icons.jsx'
import { parseYmd, fmtTime, fmtDur } from '../../lib/dates.js'
import { dayItems } from './calendarLib.js'

function Section({ label, children }) {
  return (
    <div>
      <div className="label mb-1.5">{label}</div>
      {children}
    </div>
  )
}

export default function DayPanel({ dateYmd, onClose, onEditEvent }) {
  const store = useHQ()
  const { tasks, deleteEvent, taskFromEvent, setTaskStatus, addEvent, addTask } = store
  const [eventTitle, setEventTitle] = useState('')
  const [taskTitle, setTaskTitle] = useState('')

  const { events, tasks: dueTasks, sessions } = dayItems(store, dateYmd)
  const taskTitleOf = (id) => tasks.find((t) => t.id === id)?.title || null

  const title = parseYmd(dateYmd).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const quickEvent = async (e) => {
    e.preventDefault()
    if (!eventTitle.trim()) return
    await addEvent({ title: eventTitle.trim(), date: dateYmd })
    setEventTitle('')
  }

  const quickTask = async (e) => {
    e.preventDefault()
    if (!taskTitle.trim()) return
    await addTask({ title: taskTitle.trim(), due: dateYmd })
    setTaskTitle('')
  }

  return (
    <Modal title={title} onClose={onClose} wide>
      <div className="space-y-4">
        <Section label="Events">
          {events.length === 0 && <div className="text-sm text-mut/70">No events.</div>}
          <div className="space-y-1">
            {events.map((e) => (
              <div key={e.id} className="flex items-center gap-2 rounded-lg px-1 py-0.5 hover:bg-panel2/50">
                <span className="w-24 shrink-0 font-mono text-[11px] text-blue">
                  {e.start ? `${e.start}${e.end ? `–${e.end}` : ''}` : 'all day'}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{e.title}</span>
                {e.taskId ? (
                  <Chip color="bg-green/15 text-green" title="Linked task">
                    <Icon name="link" size={11} />
                    task ✓
                  </Chip>
                ) : (
                  <button className="btn-ghost text-xs" onClick={() => taskFromEvent(e)}>
                    <Icon name="arrowR" size={12} />
                    Make task
                  </button>
                )}
                <button className="btn-ghost p-1" aria-label="Edit event" onClick={() => onEditEvent(e)}>
                  <Icon name="pencil" size={14} />
                </button>
                <button
                  className="btn-ghost p-1 hover:text-red"
                  aria-label="Delete event"
                  onClick={() => window.confirm(`Delete event "${e.title}"?`) && deleteEvent(e.id)}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ))}
          </div>
        </Section>

        <Section label="Due tasks">
          {dueTasks.length === 0 && <div className="text-sm text-mut/70">No tasks due.</div>}
          <div className="space-y-1">
            {dueTasks.map((t) => (
              <label
                key={t.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-0.5 hover:bg-panel2/50"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-gold"
                  checked={t.status === 'done'}
                  onChange={(e) => setTaskStatus(t.id, e.target.checked ? 'done' : 'todo')}
                />
                <span
                  className={`min-w-0 flex-1 truncate text-sm ${
                    t.status === 'done' ? 'text-mut line-through' : ''
                  }`}
                >
                  {t.title}
                </span>
              </label>
            ))}
          </div>
        </Section>

        <Section label="Focus sessions">
          {sessions.length === 0 && <div className="text-sm text-mut/70">No focus logged.</div>}
          <div className="space-y-1">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-lg px-1 py-0.5">
                <Icon name="timer" size={14} className="shrink-0 text-gold" />
                <span className="font-mono text-[11px] text-mut">
                  {fmtTime(new Date(s.startedAt))}–{fmtTime(new Date(s.endedAt))}
                </span>
                <span className="font-mono text-[11px] text-gold">{fmtDur(s.seconds)}</span>
                {s.taskId && (
                  <span className="min-w-0 flex-1 truncate text-sm text-mut">{taskTitleOf(s.taskId)}</span>
                )}
              </div>
            ))}
          </div>
        </Section>

        <div className="grid grid-cols-2 gap-3 border-t border-line pt-4">
          <form onSubmit={quickEvent}>
            <input
              className="input"
              placeholder="+ Add event…"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
            />
          </form>
          <form onSubmit={quickTask}>
            <input
              className="input"
              placeholder="+ Add task due this day…"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
            />
          </form>
        </div>
      </div>
    </Modal>
  )
}
