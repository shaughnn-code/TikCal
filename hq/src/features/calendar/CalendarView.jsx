// Calendar: month + week views over events, due tasks and focus sessions.
// Tasks with a due date are calendar items automatically — same store, no sync.
import { useState } from 'react'
import { useHQ } from '../../store.jsx'
import { Icon } from '../../components/icons.jsx'
import { STATUS } from '../../components/ui.jsx'
import {
  ymd,
  todayYmd,
  addDays,
  monthGrid,
  weekDays,
  WEEKDAY_LABELS,
  monthLabel,
  fmtTime,
  fmtDur,
} from '../../lib/dates.js'
import { dayItems, timedStack, weekRangeLabel } from './calendarLib.js'
import DayPanel from './DayPanel.jsx'
import EventModal from './EventModal.jsx'

const CHIP = 'block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px]'

function EventChip({ event }) {
  return (
    <span className={`${CHIP} bg-blue/15 text-blue`}>
      {event.start && <span className="font-mono">{event.start} </span>}
      {event.title}
    </span>
  )
}

function TaskChip({ task }) {
  const done = task.status === 'done'
  const s = STATUS[task.status] || STATUS.todo
  return (
    <span className={`${CHIP} ${s.chip} ${done ? 'opacity-50 line-through' : ''}`}>{task.title}</span>
  )
}

function SessionChip({ session, taskTitle }) {
  return (
    <span className={`${CHIP} bg-gold/15 text-gold`}>
      <Icon name="timer" size={11} className="mr-1 align-[-1px]" />
      <span className="font-mono">{fmtDur(session.seconds)}</span>
      {taskTitle && <span> · {taskTitle}</span>}
    </span>
  )
}

const MAX_MONTH_CHIPS = 3

function MonthCell({ date, monthIndex, store, onOpen }) {
  const d = ymd(date)
  const outside = date.getMonth() !== monthIndex
  const isToday = d === todayYmd()
  const { events, tasks, sessions } = dayItems(store, d)
  const chips = [
    ...events.map((e) => <EventChip key={`e${e.id}`} event={e} />),
    ...tasks.map((t) => <TaskChip key={`t${t.id}`} task={t} />),
    ...sessions.map((s) => (
      <SessionChip
        key={`s${s.id}`}
        session={s}
        taskTitle={store.tasks.find((t) => t.id === s.taskId)?.title || null}
      />
    )),
  ]
  const extra = chips.length - MAX_MONTH_CHIPS

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(d)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen(d)}
      className={`min-h-[6.5rem] cursor-pointer border border-line p-1.5 transition-colors hover:bg-panel2/40 ${
        outside ? 'bg-ink text-mut/40' : 'bg-panel/30'
      }`}
    >
      <div className="mb-1 flex justify-end">
        {isToday ? (
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gold font-mono text-[11px] font-semibold text-ink">
            {date.getDate()}
          </span>
        ) : (
          <span className="font-mono text-[11px]">{date.getDate()}</span>
        )}
      </div>
      <div className={`space-y-0.5 ${outside ? 'opacity-50' : ''}`}>
        {chips.slice(0, MAX_MONTH_CHIPS)}
        {extra > 0 && <span className={`${CHIP} text-mut`}>+{extra} more</span>}
      </div>
    </div>
  )
}

function MonthView({ anchor, store, onOpen }) {
  const days = monthGrid(anchor.getFullYear(), anchor.getMonth())
  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-line">
        {WEEKDAY_LABELS.map((l) => (
          <div key={l} className="label px-2 py-1.5">
            {l}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((date) => (
          <MonthCell
            key={ymd(date)}
            date={date}
            monthIndex={anchor.getMonth()}
            store={store}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  )
}

function WeekView({ anchor, store, onOpen }) {
  const days = weekDays(anchor)
  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-7">
        {days.map((date, i) => {
          const d = ymd(date)
          const isToday = d === todayYmd()
          const { events, tasks, sessions } = dayItems(store, d)
          const stack = timedStack(events, sessions)
          return (
            <div key={d} className="min-h-[24rem] border-r border-line last:border-r-0">
              <button
                className={`w-full border-b border-line px-2 py-2 text-left transition-colors hover:bg-panel2/40 ${
                  isToday ? 'bg-gold/10' : ''
                }`}
                onClick={() => onOpen(d)}
              >
                <span className="label">{WEEKDAY_LABELS[i]}</span>{' '}
                <span className={`font-mono text-sm ${isToday ? 'font-semibold text-gold' : 'text-fg'}`}>
                  {date.getDate()}
                </span>
              </button>
              <div className="space-y-1 p-1.5">
                {tasks.length > 0 && (
                  <div className="space-y-0.5 border-b border-line/60 pb-1.5">
                    {tasks.map((t) => (
                      <button key={t.id} className="block w-full" onClick={() => onOpen(d)}>
                        <TaskChip task={t} />
                      </button>
                    ))}
                  </div>
                )}
                {stack.map(({ kind, item }) =>
                  kind === 'event' ? (
                    <button key={`e${item.id}`} className="block w-full" onClick={() => onOpen(d)}>
                      <EventChip event={item} />
                    </button>
                  ) : (
                    <button key={`s${item.id}`} className="block w-full" onClick={() => onOpen(d)}>
                      <span className={`${CHIP} bg-gold/15 text-gold`}>
                        <Icon name="timer" size={11} className="mr-1 align-[-1px]" />
                        <span className="font-mono">
                          {fmtTime(new Date(item.startedAt))} · {fmtDur(item.seconds)}
                        </span>
                      </span>
                    </button>
                  )
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function CalendarView() {
  const store = useHQ()
  const [view, setView] = useState('month')
  const [anchor, setAnchor] = useState(() => new Date())
  const [selected, setSelected] = useState(todayYmd())
  const [panelYmd, setPanelYmd] = useState(null)
  const [modal, setModal] = useState(null) // { event } | { date }

  const openDay = (d) => {
    setSelected(d)
    setPanelYmd(d)
  }

  const move = (dir) => {
    setAnchor((a) =>
      view === 'month' ? new Date(a.getFullYear(), a.getMonth() + dir, 1) : addDays(a, dir * 7)
    )
  }

  const title =
    view === 'month'
      ? monthLabel(anchor.getFullYear(), anchor.getMonth())
      : weekRangeLabel(weekDays(anchor))

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="mr-2 text-xl font-bold">{title}</h1>
        <button className="btn-ghost p-1.5" aria-label="Previous" onClick={() => move(-1)}>
          <Icon name="chevL" />
        </button>
        <button className="btn-ghost" onClick={() => setAnchor(new Date())}>
          Today
        </button>
        <button className="btn-ghost p-1.5" aria-label="Next" onClick={() => move(1)}>
          <Icon name="chevR" />
        </button>
        <div className="ml-auto flex items-center gap-1">
          <div className="flex items-center gap-0.5 rounded-lg border border-line p-0.5">
            {['month', 'week'].map((v) => (
              <button
                key={v}
                className={`btn-ghost ${view === v ? 'bg-panel2 text-gold' : ''}`}
                onClick={() => setView(v)}
              >
                {v === 'month' ? 'Month' : 'Week'}
              </button>
            ))}
          </div>
          <button className="btn-gold ml-2" onClick={() => setModal({ date: selected })}>
            <Icon name="plus" size={14} />
            Event
          </button>
        </div>
      </div>

      {view === 'month' ? (
        <MonthView anchor={anchor} store={store} onOpen={openDay} />
      ) : (
        <WeekView anchor={anchor} store={store} onOpen={openDay} />
      )}

      {panelYmd && !modal && (
        <DayPanel
          dateYmd={panelYmd}
          onClose={() => setPanelYmd(null)}
          onEditEvent={(e) => setModal({ event: e })}
        />
      )}
      {modal && (
        <EventModal
          event={modal.event || null}
          defaultDate={modal.date || selected}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
