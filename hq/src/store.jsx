// Central data store. Single source of truth for tasks, events, sessions and
// note metadata. Every feature reads and writes through useHQ() — that is what
// keeps the calendar, board, timer and notes showing the same data.
//
// Shapes:
//   task    { id, title, status: 'todo'|'doing'|'done', due: 'YYYY-MM-DD'|null,
//             tags: string[], noteIds: string[], createdAt, completedAt|null }
//   event   { id, title, date: 'YYYY-MM-DD', start: 'HH:MM'|null, end: 'HH:MM'|null,
//             taskId: string|null, createdAt }
//   session { id, taskId: string|null, startedAt: ISO, endedAt: ISO, seconds, createdAt }
//   note    { id, title, excerpt, updatedAt }   (body fetched on demand)
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { api } from './api.js'

const Ctx = createContext(null)

export function StoreProvider({ children }) {
  const [tasks, setTasks] = useState([])
  const [events, setEvents] = useState([])
  const [sessions, setSessions] = useState([])
  const [notes, setNotes] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const [t, e, s, n] = await Promise.all([
        api.get('/api/tasks'),
        api.get('/api/events'),
        api.get('/api/sessions'),
        api.get('/api/notes'),
      ])
      setTasks(t)
      setEvents(e)
      setSessions(s)
      setNotes(n)
      setError(null)
      setLoaded(true)
    } catch (err) {
      setError(err.message)
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const wrap = useCallback(
    (fn) =>
      async (...args) => {
        try {
          return await fn(...args)
        } catch (err) {
          setError(err.message)
          throw err
        }
      },
    []
  )

  const actions = useMemo(() => {
    const updateTask = wrap(async (id, patch) => {
      const t = await api.patch(`/api/tasks/${id}`, patch)
      setTasks((prev) => prev.map((x) => (x.id === id ? t : x)))
      return t
    })

    return {
      refresh,

      addTask: wrap(async ({ title, due = null, tags = [] }) => {
        const t = await api.post('/api/tasks', {
          title,
          status: 'todo',
          due,
          tags,
          noteIds: [],
          completedAt: null,
        })
        setTasks((prev) => [...prev, t])
        return t
      }),

      updateTask,

      // Status changes flow through here so completedAt stays coherent
      // (used by list, board and calendar strike-through alike).
      setTaskStatus: wrap(async (id, status) => {
        return updateTask(id, {
          status,
          completedAt: status === 'done' ? new Date().toISOString() : null,
        })
      }),

      deleteTask: wrap(async (id) => {
        await api.del(`/api/tasks/${id}`)
        setTasks((prev) => prev.filter((x) => x.id !== id))
        // Events converted from this task keep existing but drop the link.
        const linked = events.filter((e) => e.taskId === id)
        for (const e of linked) {
          const patched = await api.patch(`/api/events/${e.id}`, { taskId: null })
          setEvents((prev) => prev.map((x) => (x.id === e.id ? patched : x)))
        }
      }),

      addEvent: wrap(async ({ title, date, start = null, end = null, taskId = null }) => {
        const e = await api.post('/api/events', { title, date, start, end, taskId })
        setEvents((prev) => [...prev, e])
        return e
      }),

      updateEvent: wrap(async (id, patch) => {
        const e = await api.patch(`/api/events/${id}`, patch)
        setEvents((prev) => prev.map((x) => (x.id === id ? e : x)))
        return e
      }),

      deleteEvent: wrap(async (id) => {
        await api.del(`/api/events/${id}`)
        setEvents((prev) => prev.filter((x) => x.id !== id))
      }),

      // Connection: calendar event -> task ("make this actionable").
      taskFromEvent: wrap(async (event) => {
        const t = await api.post('/api/tasks', {
          title: event.title,
          status: 'todo',
          due: event.date,
          tags: [],
          noteIds: [],
          completedAt: null,
        })
        setTasks((prev) => [...prev, t])
        const e = await api.patch(`/api/events/${event.id}`, { taskId: t.id })
        setEvents((prev) => prev.map((x) => (x.id === event.id ? e : x)))
        return t
      }),

      // Connection: completed focus session -> permanent log (calendar + task totals).
      logSession: wrap(async ({ taskId = null, startedAt, endedAt, seconds }) => {
        const s = await api.post('/api/sessions', { taskId, startedAt, endedAt, seconds })
        setSessions((prev) => [...prev, s])
        return s
      }),

      createNote: wrap(async (body) => {
        const n = await api.post('/api/notes', { body })
        setNotes((prev) => [n, ...prev])
        return n
      }),

      saveNote: wrap(async (id, body) => {
        const n = await api.put(`/api/notes/${id}`, { body })
        setNotes((prev) => prev.map((x) => (x.id === id ? n : x)))
        return n
      }),

      deleteNote: wrap(async (id) => {
        await api.del(`/api/notes/${id}`)
        setNotes((prev) => prev.filter((x) => x.id !== id))
        for (const t of tasks.filter((t) => (t.noteIds || []).includes(id))) {
          await updateTask(t.id, { noteIds: t.noteIds.filter((n) => n !== id) })
        }
      }),

      fetchNoteBody: wrap((id) => api.get(`/api/notes/${id}`)),

      // Connection: note <-> task, from either side.
      attachNote: wrap(async (taskId, noteId) => {
        const t = tasks.find((x) => x.id === taskId)
        if (!t || (t.noteIds || []).includes(noteId)) return t
        return updateTask(taskId, { noteIds: [...(t.noteIds || []), noteId] })
      }),

      detachNote: wrap(async (taskId, noteId) => {
        const t = tasks.find((x) => x.id === taskId)
        if (!t) return
        return updateTask(taskId, { noteIds: (t.noteIds || []).filter((n) => n !== noteId) })
      }),
    }
  }, [wrap, refresh, tasks, events])

  const value = useMemo(
    () => ({ tasks, events, sessions, notes, loaded, error, ...actions }),
    [tasks, events, sessions, notes, loaded, error, actions]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useHQ() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useHQ must be used inside <StoreProvider>')
  return ctx
}

// Total focused seconds logged against a task.
export function taskFocusSeconds(sessions, taskId) {
  return sessions.filter((s) => s.taskId === taskId).reduce((sum, s) => sum + (s.seconds || 0), 0)
}
