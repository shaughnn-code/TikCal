// Focus screen: the pomodoro timer that runs against a task, with notes
// attachable mid-session. All timing lives in the engine (timerState.jsx);
// this file only renders and dispatches.
import { useMemo, useState } from 'react'
import { useHQ, taskFocusSeconds } from '../../store.jsx'
import { useTimer } from './timerState.jsx'
import { Icon } from '../../components/icons.jsx'
import { Chip, Field, STATUS } from '../../components/ui.jsx'
import { fmtClock, fmtDue, fmtDur, ymd, todayYmd } from '../../lib/dates.js'

// ---------------------------------------------------------------------------
// Dial

const DIAL_SIZE = 240
const DIAL_STROKE = 10
const DIAL_R = (DIAL_SIZE - DIAL_STROKE) / 2
const DIAL_C = 2 * Math.PI * DIAL_R

function Dial({ phase, paused, remainingMs, totalMs, idleMin }) {
  const idle = phase === 'idle'
  const progress = idle || !totalMs ? 0 : Math.min(1, Math.max(0, 1 - remainingMs / totalMs))
  const stroke = phase === 'break' ? 'stroke-green' : phase === 'focus' ? 'stroke-gold' : 'stroke-mut/40'
  const clockMs = idle ? idleMin * 60000 : remainingMs
  const label = idle ? 'ready' : phase === 'break' ? 'break' : paused ? 'paused' : 'focusing'

  return (
    <div className="relative mx-auto" style={{ width: DIAL_SIZE, height: DIAL_SIZE }}>
      <svg width={DIAL_SIZE} height={DIAL_SIZE} viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`} className="-rotate-90">
        <circle
          cx={DIAL_SIZE / 2}
          cy={DIAL_SIZE / 2}
          r={DIAL_R}
          fill="none"
          strokeWidth={DIAL_STROKE}
          className="stroke-panel2"
        />
        <circle
          cx={DIAL_SIZE / 2}
          cy={DIAL_SIZE / 2}
          r={DIAL_R}
          fill="none"
          strokeWidth={DIAL_STROKE}
          strokeLinecap="round"
          strokeDasharray={DIAL_C}
          strokeDashoffset={DIAL_C * progress}
          className={stroke}
          style={{ transition: 'stroke-dashoffset 300ms linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <div className="font-mono text-5xl tabular-nums">{fmtClock(clockMs)}</div>
        <div className="label">{label}</div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Idle: task picker + duration config + start

function readTaskFromHash() {
  const q = window.location.hash.split('?')[1]
  if (!q) return null
  return new URLSearchParams(q).get('task')
}

function clampInt(value, min, max, fallback) {
  const n = Math.round(Number(value))
  if (Number.isNaN(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function IdleSetup() {
  const { tasks } = useHQ()
  const { cfg, setCfg, start } = useTimer()
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(() => {
    const id = readTaskFromHash()
    return id && tasks.some((t) => t.id === id && t.status !== 'done') ? id : null
  })

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tasks
      .filter((t) => t.status !== 'done')
      .filter((t) => !q || t.title.toLowerCase().includes(q))
  }, [tasks, query])

  const rowClass = (active) =>
    `flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
      active ? 'border-gold/60 bg-panel2' : 'border-transparent hover:bg-panel2/60'
    }`

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <span className="label block">Focus on</span>
        <input
          className="input"
          placeholder="Search tasks…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
          <button className={rowClass(selectedId === null)} onClick={() => setSelectedId(null)}>
            <span
              className={`h-3.5 w-3.5 shrink-0 rounded-full border ${
                selectedId === null ? 'border-gold bg-gold/60' : 'border-mut/50'
              }`}
            />
            <span className="text-mut">No task — just focus</span>
          </button>
          {candidates.map((t) => (
            <button key={t.id} className={rowClass(selectedId === t.id)} onClick={() => setSelectedId(t.id)}>
              <span
                className={`h-3.5 w-3.5 shrink-0 rounded-full border ${
                  selectedId === t.id ? 'border-gold bg-gold/60' : 'border-mut/50'
                }`}
              />
              <span className="min-w-0 flex-1 truncate">{t.title}</span>
              {t.due && <Chip>{fmtDue(t.due)}</Chip>}
            </button>
          ))}
          {candidates.length === 0 && (
            <div className="px-3 py-2 text-sm text-mut">No open tasks match.</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Focus (min)">
          <input
            className="input"
            type="number"
            min={1}
            max={120}
            value={cfg.focusMin}
            onChange={(e) => setCfg({ focusMin: clampInt(e.target.value, 1, 120, cfg.focusMin) })}
          />
        </Field>
        <Field label="Break (min)">
          <input
            className="input"
            type="number"
            min={0}
            max={60}
            value={cfg.breakMin}
            onChange={(e) => setCfg({ breakMin: clampInt(e.target.value, 0, 60, cfg.breakMin) })}
          />
        </Field>
      </div>

      <div className="flex justify-center">
        <button className="btn-gold px-6 py-2.5 text-base" onClick={() => start(selectedId)}>
          <Icon name="play" />
          Start focus
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Focus: running task + controls + notes panel

function RunningTask({ task }) {
  const { sessions } = useHQ()
  const logged = taskFocusSeconds(sessions, task.id)
  const status = STATUS[task.status] || STATUS.todo
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-center">
      <span className="text-lg font-semibold">{task.title}</span>
      <Chip color={status.chip}>{status.label}</Chip>
      {logged > 0 && (
        <Chip>
          <Icon name="timer" size={12} className="text-gold" />
          {fmtDur(logged)} focused
        </Chip>
      )}
    </div>
  )
}

function NotesPanel({ task }) {
  const { notes, createNote, attachNote, detachNote } = useHQ()
  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  const noteIds = task.noteIds || []
  const attached = noteIds.map((id) => notes.find((n) => n.id === id)).filter(Boolean)
  const attachable = notes.filter((n) => !noteIds.includes(n.id))

  async function saveNew() {
    const body = draft.trim()
    if (!body || saving) return
    setSaving(true)
    try {
      const note = await createNote(body)
      await attachNote(task.id, note.id)
      setDraft('')
      setComposing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card space-y-3 p-4">
      <div className="label">Notes for this task</div>

      {attached.length === 0 && !composing && (
        <div className="text-sm text-mut">No notes attached yet.</div>
      )}
      {attached.map((n) => (
        <div key={n.id} className="flex items-center gap-2">
          <Icon name="note" size={16} className="shrink-0 text-mut" />
          <span className="min-w-0 flex-1 truncate text-sm">{n.title || 'Untitled'}</span>
          <button
            className="btn-ghost px-2 py-1 text-xs"
            onClick={() => {
              window.location.hash = `#/notes?note=${n.id}`
            }}
          >
            open
          </button>
          <button
            className="btn-ghost p-1"
            aria-label="Detach note"
            onClick={() => {
              if (window.confirm(`Detach “${n.title || 'Untitled'}” from this task?`)) {
                detachNote(task.id, n.id).catch(() => {})
              }
            }}
          >
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}

      {composing ? (
        <div className="space-y-2">
          <textarea
            className="input"
            rows={4}
            autoFocus
            placeholder="# Note title …markdown"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex gap-2">
            <button className="btn-gold" onClick={saveNew} disabled={!draft.trim() || saving}>
              Save
            </button>
            <button
              className="btn-ghost"
              onClick={() => {
                setComposing(false)
                setDraft('')
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-ghost" onClick={() => setComposing(true)}>
            <Icon name="plus" size={14} />
            New note
          </button>
          {attachable.length > 0 && (
            <select
              className="input w-auto flex-1"
              value=""
              onChange={(e) => {
                if (e.target.value) attachNote(task.id, e.target.value).catch(() => {})
              }}
            >
              <option value="">Attach existing…</option>
              {attachable.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title || 'Untitled'}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  )
}

function FocusControls({ task }) {
  const { setTaskStatus } = useHQ()
  const { paused, pause, resume, finish, cancel } = useTimer()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {paused ? (
          <button className="btn" onClick={resume}>
            <Icon name="play" size={14} />
            Resume
          </button>
        ) : (
          <button className="btn" onClick={pause}>
            <Icon name="pause" size={14} />
            Pause
          </button>
        )}
        <button className="btn-gold" onClick={finish}>
          <Icon name="stop" size={14} />
          Finish
        </button>
        <button
          className="btn-ghost"
          onClick={() => {
            if (window.confirm('Discard this session? Nothing will be logged.')) cancel()
          }}
        >
          Discard
        </button>
      </div>

      {task && (
        <>
          <NotesPanel task={task} />
          <div className="flex justify-center">
            <button
              className="btn-ghost"
              onClick={() => {
                setTaskStatus(task.id, 'done').catch(() => {})
                finish()
              }}
            >
              <Icon name="check" size={14} />
              Mark task done
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Today strip

function TodayStrip() {
  const { sessions, tasks } = useHQ()
  const today = todayYmd()
  const todays = sessions
    .filter((s) => ymd(new Date(s.startedAt)) === today)
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
  const total = todays.reduce((sum, s) => sum + (s.seconds || 0), 0)

  const time = (iso) =>
    new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-baseline justify-between">
        <span className="label">Today</span>
        {todays.length > 0 && (
          <span className="font-mono text-xs text-mut">
            {todays.length} session{todays.length === 1 ? '' : 's'} · {fmtDur(total)}
          </span>
        )}
      </div>
      {todays.length === 0 ? (
        <div className="text-sm text-mut">No focus sessions yet today.</div>
      ) : (
        <div className="space-y-1.5">
          {todays.map((s) => {
            const task = s.taskId ? tasks.find((t) => t.id === s.taskId) : null
            return (
              <div key={s.id} className="flex items-center gap-2.5 text-sm">
                <Icon name="timer" size={14} className="shrink-0 text-gold" />
                <span className="font-mono text-xs tabular-nums text-mut">
                  {time(s.startedAt)}–{time(s.endedAt)}
                </span>
                <span className="font-mono text-xs text-fg/80">{fmtDur(s.seconds || 0)}</span>
                <span className="min-w-0 flex-1 truncate text-mut">
                  {task ? task.title : s.taskId ? 'Deleted task' : 'No task'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Screen

export default function TimerView() {
  const { tasks } = useHQ()
  const timer = useTimer()
  const task = timer.taskId ? tasks.find((t) => t.id === timer.taskId) : null

  return (
    <div className="mx-auto max-w-xl space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Focus</h1>
        <p className="label mt-1">one thing at a time</p>
      </header>

      <Dial
        phase={timer.phase}
        paused={timer.paused}
        remainingMs={timer.remainingMs}
        totalMs={timer.totalMs}
        idleMin={timer.cfg.focusMin}
      />

      {timer.phase === 'idle' && <IdleSetup />}

      {timer.phase === 'focus' && (
        <div className="space-y-4">
          {task && <RunningTask task={task} />}
          <FocusControls task={task} />
        </div>
      )}

      {timer.phase === 'break' && (
        <div className="flex justify-center">
          <button className="btn" onClick={timer.skipBreak}>
            <Icon name="arrowR" size={14} />
            Skip break
          </button>
        </div>
      )}

      <TodayStrip />
    </div>
  )
}
