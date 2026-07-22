// Create/edit modal for calendar events. Title + date required; times optional.
import { useState } from 'react'
import { useHQ } from '../../store.jsx'
import { Modal, Field } from '../../components/ui.jsx'
import { Icon } from '../../components/icons.jsx'

export default function EventModal({ event = null, defaultDate, onClose }) {
  const { addEvent, updateEvent, deleteEvent } = useHQ()
  const [title, setTitle] = useState(event?.title || '')
  const [date, setDate] = useState(event?.date || defaultDate || '')
  const [start, setStart] = useState(event?.start || '')
  const [end, setEnd] = useState(event?.end || '')
  const valid = title.trim().length > 0 && date.length > 0

  const save = async (e) => {
    e.preventDefault()
    if (!valid) return
    const payload = { title: title.trim(), date, start: start || null, end: end || null }
    if (event) await updateEvent(event.id, payload)
    else await addEvent(payload)
    onClose()
  }

  const remove = async () => {
    if (!window.confirm(`Delete event "${event.title}"?`)) return
    await deleteEvent(event.id)
    onClose()
  }

  return (
    <Modal title={event ? 'Edit event' : 'New event'} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <Field label="Title">
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            autoFocus
          />
        </Field>
        <Field label="Date">
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start (optional)">
            <input className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="End (optional)">
            <input className="input" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <div className="flex items-center justify-between pt-1">
          {event ? (
            <button type="button" className="btn-ghost text-red" onClick={remove}>
              <Icon name="trash" size={14} />
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-gold" disabled={!valid}>
              Save
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
