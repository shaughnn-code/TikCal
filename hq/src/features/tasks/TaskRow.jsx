// One task in the list. Row-level interactions (toggle done, cycle status,
// start focus, delete) happen inline; everything else opens the edit modal.
import { useHQ, taskFocusSeconds } from '../../store.jsx'
import { useTimer } from '../timer/timerState.jsx'
import { Chip, STATUS } from '../../components/ui.jsx'
import { Icon } from '../../components/icons.jsx'
import { fmtDur, isOverdue } from '../../lib/dates.js'
import { fmtDue, NEXT_STATUS } from './taskUtils.js'

export default function TaskRow({ task, onEdit }) {
  const { sessions, setTaskStatus, deleteTask } = useHQ()
  const timer = useTimer()

  const done = task.status === 'done'
  const overdue = !done && isOverdue(task.due)
  const focusSecs = taskFocusSeconds(sessions, task.id)
  const status = STATUS[task.status] || STATUS.todo

  const startFocus = () => {
    timer.start(task.id)
    window.location.hash = '#/focus'
  }

  const remove = () => {
    if (window.confirm(`Delete task "${task.title}"?`)) deleteTask(task.id)
  }

  return (
    <div className={`card group flex items-center gap-3 px-4 py-3 ${done ? 'opacity-50' : ''}`}>
      <button
        onClick={() => setTaskStatus(task.id, done ? 'todo' : 'done')}
        aria-label={done ? 'Mark not done' : 'Mark done'}
        title={done ? 'Mark not done' : 'Mark done'}
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-colors ${
          done
            ? 'border-green bg-green/20 text-green'
            : 'border-mut/50 text-transparent hover:border-green hover:text-green/60'
        }`}
      >
        <Icon name="check" size={11} />
      </button>

      <button
        onClick={() => setTaskStatus(task.id, NEXT_STATUS[task.status] || 'todo')}
        title="Cycle status"
        className="shrink-0"
      >
        <Chip color={status.chip} className="cursor-pointer transition-opacity hover:opacity-75">
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </Chip>
      </button>

      <button
        onClick={onEdit}
        title="Edit task"
        className={`min-w-0 flex-1 truncate text-left text-sm hover:text-gold ${
          done ? 'line-through' : ''
        }`}
      >
        {task.title}
      </button>

      <div className="flex shrink-0 items-center gap-1.5">
        {(task.tags || []).map((tag) => (
          <Chip key={tag}>
            <Icon name="tag" size={10} />
            {tag}
          </Chip>
        ))}

        {task.due && (
          <Chip color={overdue ? 'bg-red/10 text-red' : 'bg-panel2 text-mut'}>
            <Icon name="calendar" size={10} />
            {fmtDue(task.due)}
          </Chip>
        )}

        {focusSecs > 0 && (
          <Chip color="bg-gold/15 text-gold" title="Total focus time">
            <Icon name="timer" size={10} />
            {fmtDur(focusSecs)}
          </Chip>
        )}

        {(task.noteIds || []).length > 0 && (
          <Chip
            className="cursor-pointer transition-opacity hover:opacity-75"
            title="Linked notes"
            onClick={() => (window.location.hash = `#/notes?task=${task.id}`)}
          >
            <Icon name="note" size={10} />
            {task.noteIds.length}
          </Chip>
        )}

        <div className="flex w-0 items-center gap-0.5 overflow-hidden opacity-0 transition-all group-focus-within:w-auto group-focus-within:opacity-100 group-hover:w-auto group-hover:opacity-100">
          <button className="btn-ghost p-1" title="Start focus" onClick={startFocus}>
            <Icon name="play" size={14} />
          </button>
          <button className="btn-ghost p-1 hover:text-red" title="Delete task" onClick={remove}>
            <Icon name="trash" size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
