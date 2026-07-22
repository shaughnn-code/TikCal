// Edit modal for a single task: fields, status, and note attachments.
// Field edits are local until Save; note attach/detach applies immediately
// (it goes through the store so both sides stay in sync).
import { useState } from 'react'
import { useHQ } from '../../store.jsx'
import { Modal, Field, STATUS } from '../../components/ui.jsx'
import { Icon } from '../../components/icons.jsx'
import { parseTags } from './taskUtils.js'

export default function TaskEditModal({ task, onClose }) {
  const { notes, updateTask, deleteTask, attachNote, detachNote } = useHQ()
  const [title, setTitle] = useState(task.title)
  const [due, setDue] = useState(task.due || '')
  const [tags, setTags] = useState((task.tags || []).join(', '))
  const [status, setStatus] = useState(task.status)

  const noteIds = task.noteIds || []
  const attached = noteIds.map((id) => notes.find((n) => n.id === id) || { id, title: '(missing note)' })
  const unattached = notes.filter((n) => !noteIds.includes(n.id))

  const save = async () => {
    const t = title.trim()
    if (!t) return
    await updateTask(task.id, {
      title: t,
      due: due || null,
      tags: parseTags(tags),
      status,
      completedAt: status === 'done' ? task.completedAt || new Date().toISOString() : null,
    })
    onClose()
  }

  const remove = async () => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return
    await deleteTask(task.id)
    onClose()
  }

  return (
    <Modal title="Edit task" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Field label="Title">
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            autoFocus
          />
        </Field>

        <Field label="Due">
          <div className="flex items-center gap-1.5">
            <input type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} />
            {due && (
              <button className="btn-ghost p-1.5" title="Clear due date" onClick={() => setDue('')}>
                <Icon name="x" size={14} />
              </button>
            )}
          </div>
        </Field>

        <Field label="Tags (comma-separated)">
          <input
            className="input"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="work, deep"
          />
        </Field>

        <div>
          <span className="label mb-1 block">Status</span>
          <div className="flex gap-1.5">
            {Object.entries(STATUS).map(([key, s]) => (
              <button
                key={key}
                onClick={() => setStatus(key)}
                className={`btn ${status === key ? 'border-gold/60 bg-gold/10 text-fg' : 'text-mut'}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label mb-1 block">Notes</span>
          {attached.length === 0 && <div className="text-xs text-mut">No notes attached.</div>}
          <div className="flex flex-col gap-1">
            {attached.map((n) => (
              <div key={n.id} className="flex items-center gap-2 rounded-lg bg-panel2 px-2.5 py-1.5 text-sm">
                <Icon name="note" size={13} className="shrink-0 text-mut" />
                <span className="min-w-0 flex-1 truncate">{n.title}</span>
                <a
                  href={`#/notes?note=${n.id}`}
                  className="font-mono text-[11px] text-blue hover:underline"
                >
                  open
                </a>
                <button
                  className="btn-ghost p-0.5"
                  title="Detach note"
                  onClick={() => detachNote(task.id, n.id)}
                >
                  <Icon name="x" size={12} />
                </button>
              </div>
            ))}
          </div>
          {unattached.length > 0 && (
            <select
              className="input mt-1.5"
              value=""
              onChange={(e) => e.target.value && attachNote(task.id, e.target.value)}
            >
              <option value="">Attach a note…</option>
              {unattached.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-line pt-3">
          <button className="btn-ghost text-red hover:text-red" onClick={remove}>
            <Icon name="trash" size={14} />
            Delete
          </button>
          <div className="flex gap-2">
            <button className="btn" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-gold" onClick={save} disabled={!title.trim()}>
              Save
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
