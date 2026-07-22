// The task list — the app's home screen. Quick add on top, then tasks grouped
// by due-date bucket; done tasks fold away behind a toggle.
import { useMemo, useState } from 'react'
import { useHQ } from '../../store.jsx'
import { EmptyState } from '../../components/ui.jsx'
import { Icon } from '../../components/icons.jsx'
import { todayYmd } from '../../lib/dates.js'
import { parseTags } from './taskUtils.js'
import TaskRow from './TaskRow.jsx'
import TaskEditModal from './TaskEditModal.jsx'

function QuickAdd() {
  const { addTask } = useHQ()
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [tags, setTags] = useState('')

  const submit = async () => {
    const t = title.trim()
    if (!t) return
    await addTask({ title: t, due: due || null, tags: parseTags(tags) })
    setTitle('')
    setDue('')
    setTags('')
  }

  return (
    <div className="card mb-6 flex items-center gap-2 p-3">
      <input
        className="input flex-1"
        placeholder="Add a task…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <input
        type="date"
        className="input w-40"
        title="Due date (optional)"
        value={due}
        onChange={(e) => setDue(e.target.value)}
      />
      <input
        className="input w-40"
        placeholder="tags, comma, sep"
        title="Tags (optional)"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <button className="btn-gold" onClick={submit} disabled={!title.trim()}>
        <Icon name="plus" size={14} />
        Add
      </button>
    </div>
  )
}

function Section({ label, tasks, onEdit }) {
  if (tasks.length === 0) return null
  return (
    <div className="mb-6">
      <div className="label mb-2">
        {label} · {tasks.length}
      </div>
      <div className="flex flex-col gap-1.5">
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} onEdit={() => onEdit(t.id)} />
        ))}
      </div>
    </div>
  )
}

const byDue = (a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : a.createdAt < b.createdAt ? -1 : 1)
const byCreated = (a, b) => (a.createdAt < b.createdAt ? -1 : 1)

export default function TasksView() {
  const { tasks } = useHQ()
  const [showDone, setShowDone] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const today = todayYmd()
  const groups = useMemo(() => {
    const open = tasks.filter((t) => t.status !== 'done')
    return {
      overdue: open.filter((t) => t.due && t.due < today).sort(byDue),
      today: open.filter((t) => t.due === today).sort(byCreated),
      upcoming: open.filter((t) => t.due && t.due > today).sort(byDue),
      someday: open.filter((t) => !t.due).sort(byCreated),
      done: tasks
        .filter((t) => t.status === 'done')
        .sort((a, b) => ((a.completedAt || '') > (b.completedAt || '') ? -1 : 1)),
    }
  }, [tasks, today])

  const openCount = tasks.length - groups.done.length
  const editingTask = tasks.find((t) => t.id === editingId)

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-5 flex items-baseline justify-between">
        <h1 className="text-xl font-bold tracking-tight">Tasks</h1>
        <span className="label">
          {openCount} open
        </span>
      </div>

      <QuickAdd />

      {tasks.length === 0 ? (
        <EmptyState
          icon="list"
          title="No tasks yet"
          hint="Add your first task above — give it a due date to see it land in Today or Upcoming."
        />
      ) : (
        <>
          <Section label="Overdue" tasks={groups.overdue} onEdit={setEditingId} />
          <Section label="Today" tasks={groups.today} onEdit={setEditingId} />
          <Section label="Upcoming" tasks={groups.upcoming} onEdit={setEditingId} />
          <Section label="Someday" tasks={groups.someday} onEdit={setEditingId} />

          {groups.done.length > 0 && (
            <div className="mb-6">
              <button
                className="label mb-2 flex items-center gap-1 transition-colors hover:text-fg"
                onClick={() => setShowDone((v) => !v)}
              >
                <Icon name="chevR" size={12} className={showDone ? 'rotate-90' : ''} />
                Done · {groups.done.length}
              </button>
              {showDone && (
                <div className="flex flex-col gap-1.5">
                  {groups.done.map((t) => (
                    <TaskRow key={t.id} task={t} onEdit={() => setEditingId(t.id)} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {editingTask && (
        <TaskEditModal key={editingTask.id} task={editingTask} onClose={() => setEditingId(null)} />
      )}
    </div>
  )
}
