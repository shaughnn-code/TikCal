// Kanban board — the task list viewed by status. Cards are the same tasks the
// list/calendar show; dragging a card just calls setTaskStatus, so the change
// is visible everywhere in the app.
import { useEffect, useRef, useState } from 'react'
import { useHQ, taskFocusSeconds } from '../../store.jsx'
import { useTimer } from '../timer/timerState.jsx'
import { Icon } from '../../components/icons.jsx'
import { Chip, STATUS } from '../../components/ui.jsx'
import { fmtDur, isOverdue } from '../../lib/dates.js'

const COLUMNS = ['todo', 'doing', 'done']

function Card({ task, sessions, onMove, onDelete, onFocus }) {
  const done = task.status === 'done'
  const col = COLUMNS.indexOf(task.status)
  const focusSec = taskFocusSeconds(sessions, task.id)
  const overdue = isOverdue(task.due)

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      className="card group cursor-grab p-3 active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`min-w-0 text-sm font-medium ${done ? 'text-mut line-through' : ''}`}>
          {task.title}
        </div>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            className="btn-ghost p-1"
            title="Move left"
            aria-label="Move left"
            disabled={col === 0}
            onClick={() => onMove(task, COLUMNS[col - 1])}
          >
            <Icon name="chevL" size={14} />
          </button>
          <button
            className="btn-ghost p-1"
            title="Move right"
            aria-label="Move right"
            disabled={col === COLUMNS.length - 1}
            onClick={() => onMove(task, COLUMNS[col + 1])}
          >
            <Icon name="chevR" size={14} />
          </button>
          {!done && (
            <button
              className="btn-ghost p-1"
              title="Start focus"
              aria-label="Start focus"
              onClick={() => onFocus(task)}
            >
              <Icon name="play" size={14} />
            </button>
          )}
          <button
            className="btn-ghost p-1"
            title="Delete"
            aria-label="Delete"
            onClick={() => {
              if (window.confirm(`Delete "${task.title}"?`)) onDelete(task.id)
            }}
          >
            <Icon name="trash" size={14} />
          </button>
        </div>
      </div>

      {(task.due || (task.tags || []).length > 0 || focusSec > 0 || (task.noteIds || []).length > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {task.due && (
            <Chip color={overdue && !done ? 'bg-red/15 text-red' : 'bg-panel2 text-mut'}>
              <Icon name="calendar" size={11} />
              {task.due}
            </Chip>
          )}
          {(task.tags || []).map((tag) => (
            <Chip key={tag}>
              <Icon name="tag" size={11} />
              {tag}
            </Chip>
          ))}
          {focusSec > 0 && (
            <Chip color="bg-gold/15 text-gold">
              <Icon name="timer" size={11} />
              {fmtDur(focusSec)}
            </Chip>
          )}
          {(task.noteIds || []).length > 0 && (
            <Chip>
              <Icon name="note" size={11} />
              {task.noteIds.length}
            </Chip>
          )}
        </div>
      )}
    </div>
  )
}

function QuickAdd({ status, addTask, setTaskStatus }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  async function submit() {
    const t = title.trim()
    if (!t) return
    try {
      const task = await addTask({ title: t })
      if (status !== 'todo') await setTaskStatus(task.id, status)
      setTitle('')
      inputRef.current?.focus()
    } catch {
      // store surfaces the error banner; keep the typed title so nothing is lost
    }
  }

  if (!open) {
    return (
      <button className="btn-ghost w-full justify-start" onClick={() => setOpen(true)}>
        <Icon name="plus" size={14} />
        Add
      </button>
    )
  }

  return (
    <input
      ref={inputRef}
      className="input"
      placeholder="Task title…"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') submit()
        if (e.key === 'Escape') {
          setTitle('')
          setOpen(false)
        }
      }}
      onBlur={() => {
        if (!title.trim()) setOpen(false)
      }}
    />
  )
}

function Column({ status, tasks, sessions, over, setOver, actions }) {
  const meta = STATUS[status]
  const { setTaskStatus, deleteTask, addTask, startFocus } = actions

  return (
    <div
      className={`flex min-h-0 flex-col rounded-xl border bg-panel/40 transition-colors ${
        over ? 'border-gold/40 ring-1 ring-gold/40' : 'border-line'
      }`}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setOver(status)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOver(null)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setOver(null)
        const id = e.dataTransfer.getData('text/plain')
        if (id) actions.onDropId(id, status)
      }}
    >
      <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
        <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
        <span className="label text-fg/80">{meta.label}</span>
        <span className="ml-auto font-mono text-[11px] text-mut">{tasks.length}</span>
      </div>

      <div className="flex max-h-[calc(100vh-14rem)] flex-col gap-2 overflow-y-auto p-2">
        {tasks.length === 0 ? (
          <div className="label py-6 text-center opacity-60">no cards</div>
        ) : (
          tasks.map((t) => (
            <Card
              key={t.id}
              task={t}
              sessions={sessions}
              onMove={(task, next) => setTaskStatus(task.id, next)}
              onDelete={deleteTask}
              onFocus={startFocus}
            />
          ))
        )}
      </div>

      <div className="border-t border-line p-2">
        <QuickAdd status={status} addTask={addTask} setTaskStatus={setTaskStatus} />
      </div>
    </div>
  )
}

export default function KanbanView() {
  const { tasks, sessions, addTask, setTaskStatus, deleteTask } = useHQ()
  const timer = useTimer()
  const [over, setOver] = useState(null)

  const actions = {
    addTask,
    setTaskStatus,
    deleteTask,
    startFocus: (task) => {
      timer.start(task.id)
      window.location.hash = '#/focus'
    },
    // Only move real tasks, and only when the column actually changes.
    onDropId: (id, status) => {
      const task = tasks.find((t) => t.id === id)
      if (task && task.status !== status) setTaskStatus(id, status)
    },
  }

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold tracking-tight">Board</h1>
        <div className="label mt-1">drag cards between columns</div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {COLUMNS.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={tasks.filter((t) => t.status === status)}
            sessions={sessions}
            over={over === status}
            setOver={setOver}
            actions={actions}
          />
        ))}
      </div>
    </div>
  )
}
