// Notes: two-pane markdown notes with task links.
// Left pane = searchable note list; right pane = editor/preview for the open
// note plus the "Linked tasks" panel (the task <-> note connection).
//
// Deep links (other screens land here):
//   #/notes?note=<id>  -> open that note
//   #/notes?task=<id>  -> filter list to that task's notes (dismissible chip)
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useHQ } from '../../store.jsx'
import { Icon } from '../../components/icons.jsx'
import { Chip, EmptyState, STATUS } from '../../components/ui.jsx'
import { renderMarkdown } from '../../lib/markdown.js'

const SAVE_DEBOUNCE_MS = 800

function parseNotesHash() {
  const h = window.location.hash || ''
  if (!h.startsWith('#/notes')) return {}
  const q = h.indexOf('?')
  if (q === -1) return {}
  const params = new URLSearchParams(h.slice(q + 1))
  return { note: params.get('note'), task: params.get('task') }
}

function shortDate(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const opts =
    d.getFullYear() === new Date().getFullYear()
      ? { month: 'short', day: 'numeric' }
      : { month: 'short', day: 'numeric', year: 'numeric' }
  return d.toLocaleDateString(undefined, opts)
}

export default function NotesView() {
  const store = useHQ()
  const { notes, tasks } = store

  // Store actions in a ref so long-lived callbacks never go stale
  // (the store's action identities change whenever tasks/events do).
  const storeRef = useRef(store)
  storeRef.current = store

  const [selectedId, setSelectedId] = useState(null)
  const [mode, setMode] = useState('preview') // 'edit' | 'preview'
  const [bodyStatus, setBodyStatus] = useState('idle') // idle | loading | ready | error
  const [draft, setDraft] = useState('')
  const [saveStatus, setSaveStatus] = useState('saved') // saved | saving | unsaved
  const [search, setSearch] = useState('')
  const [taskFilterId, setTaskFilterId] = useState(null)
  const [focusTick, setFocusTick] = useState(0)

  const selectedIdRef = useRef(null)
  const draftRef = useRef('')
  const dirtyRef = useRef(false)
  const timerRef = useRef(null)
  const loadSeqRef = useRef(0)
  const taskFilterRef = useRef(null)
  taskFilterRef.current = taskFilterId
  const textareaRef = useRef(null)

  const setHash = useCallback((noteId) => {
    const parts = []
    if (taskFilterRef.current) parts.push(`task=${encodeURIComponent(taskFilterRef.current)}`)
    if (noteId) parts.push(`note=${encodeURIComponent(noteId)}`)
    const next = parts.length ? `#/notes?${parts.join('&')}` : '#/notes'
    if (window.location.hash !== next) history.replaceState(null, '', next)
  }, [])

  // Save the pending draft right now (debounce cancelled). Used before any
  // note/mode switch so edits are never lost.
  const flushSave = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (!dirtyRef.current || !selectedIdRef.current) return
    const id = selectedIdRef.current
    const body = draftRef.current
    dirtyRef.current = false
    setSaveStatus('saving')
    try {
      await storeRef.current.saveNote(id, body)
      if (!dirtyRef.current) setSaveStatus('saved')
    } catch {
      if (selectedIdRef.current === id) {
        dirtyRef.current = true
        setSaveStatus('unsaved')
      }
    }
  }, [])

  const scheduleSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      flushSave()
    }, SAVE_DEBOUNCE_MS)
  }, [flushSave])

  // Open a note: flush any pending edits, then fetch its body.
  const openNote = useCallback(
    async (id, { edit = false, updateHash = true } = {}) => {
      if (!id) return
      if (selectedIdRef.current === id && bodyStatusRefCurrent() !== 'error') {
        if (edit) {
          setMode('edit')
          setFocusTick((t) => t + 1)
        }
        return
      }
      await flushSave()
      const seq = ++loadSeqRef.current
      selectedIdRef.current = id
      setSelectedId(id)
      setBodyStatus('loading')
      dirtyRef.current = false
      setSaveStatus('saved')
      if (updateHash) setHash(id)
      try {
        const n = await storeRef.current.fetchNoteBody(id)
        if (loadSeqRef.current !== seq) return
        draftRef.current = n.body || ''
        setDraft(n.body || '')
        setBodyStatus('ready')
        if (edit) {
          setMode('edit')
          setFocusTick((t) => t + 1)
        }
      } catch {
        if (loadSeqRef.current !== seq) return
        setBodyStatus('error')
      }
    },
    [flushSave, setHash]
  )

  // bodyStatus via ref-free read (only used inside openNote above).
  const bodyStatusStateRef = useRef('idle')
  bodyStatusStateRef.current = bodyStatus
  function bodyStatusRefCurrent() {
    return bodyStatusStateRef.current
  }

  const openNoteRef = useRef(openNote)
  openNoteRef.current = openNote

  // Hash integration: on mount and on every hashchange.
  useEffect(() => {
    const apply = () => {
      const { note, task } = parseNotesHash()
      taskFilterRef.current = task || null
      setTaskFilterId(task || null)
      if (note) openNoteRef.current(note, { updateHash: false })
    }
    apply()
    window.addEventListener('hashchange', apply)
    return () => window.removeEventListener('hashchange', apply)
  }, [])

  // Flush pending edits if the user navigates away from the Notes screen.
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (dirtyRef.current && selectedIdRef.current) {
        storeRef.current.saveNote(selectedIdRef.current, draftRef.current).catch(() => {})
      }
    },
    []
  )

  // Focus the textarea after switching into edit mode (e.g. new note).
  useEffect(() => {
    if (focusTick > 0 && mode === 'edit') textareaRef.current?.focus()
  }, [focusTick, mode])

  const handleNew = async () => {
    await flushSave()
    let n
    try {
      n = await storeRef.current.createNote('# New note\n\n')
    } catch {
      return
    }
    loadSeqRef.current++
    selectedIdRef.current = n.id
    setSelectedId(n.id)
    draftRef.current = n.body ?? '# New note\n\n'
    setDraft(draftRef.current)
    setBodyStatus('ready')
    dirtyRef.current = false
    setSaveStatus('saved')
    setMode('edit')
    setHash(n.id)
    setFocusTick((t) => t + 1)
  }

  const handleDelete = async () => {
    const id = selectedIdRef.current
    if (!id) return
    if (!window.confirm('Delete this note? This cannot be undone.')) return
    if (timerRef.current) clearTimeout(timerRef.current)
    dirtyRef.current = false
    loadSeqRef.current++
    try {
      await storeRef.current.deleteNote(id)
    } catch {
      return
    }
    selectedIdRef.current = null
    setSelectedId(null)
    setDraft('')
    draftRef.current = ''
    setBodyStatus('idle')
    setSaveStatus('saved')
    setHash(null)
  }

  const handleModeChange = (next) => {
    if (next === mode) return
    flushSave() // never lose edits when switching modes
    setMode(next)
  }

  const onDraftChange = (e) => {
    const v = e.target.value
    draftRef.current = v
    setDraft(v)
    dirtyRef.current = true
    setSaveStatus('unsaved')
    scheduleSave()
  }

  const onEditorKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault()
      flushSave()
    }
  }

  const clearTaskFilter = () => {
    taskFilterRef.current = null
    setTaskFilterId(null)
    history.replaceState(null, '', '#/notes')
  }

  // ----- derived list -----
  const filterTask = taskFilterId ? tasks.find((t) => t.id === taskFilterId) : null
  const visibleNotes = useMemo(() => {
    let list = notes
    if (taskFilterId) {
      const ids = filterTask?.noteIds || []
      list = list.filter((n) => ids.includes(n.id))
    }
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (n) =>
          (n.title || '').toLowerCase().includes(q) || (n.excerpt || '').toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  }, [notes, taskFilterId, filterTask, search])

  const linkCounts = useMemo(() => {
    const counts = {}
    for (const t of tasks) {
      for (const id of t.noteIds || []) counts[id] = (counts[id] || 0) + 1
    }
    return counts
  }, [tasks])

  const selectedNote = notes.find((n) => n.id === selectedId) || null
  const linkedTasks = selectedId ? tasks.filter((t) => (t.noteIds || []).includes(selectedId)) : []
  const attachableTasks = selectedId
    ? tasks.filter((t) => !(t.noteIds || []).includes(selectedId))
    : []

  return (
    <div className="flex h-full">
      {/* ----- left pane: note list ----- */}
      <div className="flex w-72 shrink-0 flex-col border-r border-line">
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <h1 className="text-lg font-semibold">Notes</h1>
          <button className="btn-gold" onClick={handleNew}>
            <Icon name="plus" size={14} />
            New
          </button>
        </div>
        <div className="px-4 pb-2">
          <input
            className="input"
            placeholder="Search notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {taskFilterId && (
          <div className="px-4 pb-2">
            <Chip color="bg-gold/15 text-gold" className="max-w-full">
              <Icon name="link" size={11} />
              <span className="truncate">notes for: {filterTask ? filterTask.title : 'task'}</span>
              <button
                onClick={clearTaskFilter}
                aria-label="Clear task filter"
                className="hover:text-fg"
              >
                <Icon name="x" size={11} />
              </button>
            </Chip>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto pb-4">
          {visibleNotes.length === 0 ? (
            notes.length > 0 && (
              <div className="px-4 py-6 text-center text-xs text-mut">no matching notes</div>
            )
          ) : (
            <ul>
              {visibleNotes.map((n) => {
                const active = n.id === selectedId
                const count = linkCounts[n.id] || 0
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => openNote(n.id)}
                      className={`w-full border-l-2 px-4 py-2.5 text-left transition-colors ${
                        active
                          ? 'border-gold bg-panel2'
                          : 'border-transparent hover:bg-panel2/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-sm font-medium">
                          {n.title || 'Untitled'}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-mut">
                          {shortDate(n.updatedAt)}
                        </span>
                      </div>
                      {n.excerpt && (
                        <div className="mt-0.5 line-clamp-2 text-xs text-mut">{n.excerpt}</div>
                      )}
                      {count > 0 && (
                        <Chip className="mt-1">
                          <Icon name="link" size={11} />
                          {count}
                        </Chip>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ----- right pane: open note ----- */}
      <div className="flex min-w-0 flex-1 flex-col">
        {notes.length === 0 ? (
          <EmptyState
            icon="note"
            title="No notes yet"
            hint="Capture thinking in markdown, then attach notes to tasks. Hit “+ New” to start."
          />
        ) : !selectedId ? (
          <div className="flex h-full items-center justify-center p-6 text-sm text-mut">
            Select a note — or create one.
          </div>
        ) : (
          <>
            {/* toolbar */}
            <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
              <div className="flex overflow-hidden rounded-lg border border-line">
                {['edit', 'preview'].map((m) => (
                  <button
                    key={m}
                    onClick={() => handleModeChange(m)}
                    className={`px-3 py-1 text-sm capitalize transition-colors ${
                      mode === m ? 'bg-panel2 text-gold' : 'text-mut hover:text-fg'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <span className="label">
                {saveStatus === 'saving' ? 'saving…' : saveStatus}
              </span>
              <div className="min-w-0 flex-1 truncate text-right text-xs text-mut">
                {selectedNote?.title}
              </div>
              <button
                className="btn-ghost text-mut hover:text-red"
                onClick={handleDelete}
                aria-label="Delete note"
              >
                <Icon name="trash" size={16} />
              </button>
            </div>

            {/* linked tasks panel */}
            <div className="px-4 pt-3">
              <div className="card p-3">
                <div className="label mb-2">Linked tasks</div>
                {linkedTasks.length === 0 ? (
                  <div className="mb-2 text-xs text-mut">
                    No linked tasks — attach this note to a task below, or from the Focus screen.
                  </div>
                ) : (
                  <ul className="mb-2 space-y-1">
                    {linkedTasks.map((t) => (
                      <li key={t.id} className="flex items-center gap-2 text-sm">
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            (STATUS[t.status] || STATUS.todo).dot
                          }`}
                        />
                        <span
                          className={`min-w-0 flex-1 truncate ${
                            t.status === 'done' ? 'text-mut line-through' : ''
                          }`}
                        >
                          {t.title}
                        </span>
                        <button
                          className="btn-ghost p-0.5"
                          onClick={() => storeRef.current.detachNote(t.id, selectedId)}
                          aria-label={`Detach from ${t.title}`}
                        >
                          <Icon name="x" size={13} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {attachableTasks.length > 0 && (
                  <select
                    className="input"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) storeRef.current.attachNote(e.target.value, selectedId)
                    }}
                  >
                    <option value="">attach to task…</option>
                    {attachableTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* body */}
            {bodyStatus === 'loading' ? (
              <div className="p-6 font-mono text-sm text-mut">loading…</div>
            ) : bodyStatus === 'error' ? (
              <div className="p-6 text-sm text-red">
                Couldn't load this note.{' '}
                <button
                  className="underline underline-offset-2"
                  onClick={() => openNote(selectedId)}
                >
                  Retry
                </button>
              </div>
            ) : mode === 'edit' ? (
              <div className="mt-3 flex min-h-0 flex-1 flex-col">
                <textarea
                  ref={textareaRef}
                  className="h-full w-full flex-1 resize-none bg-ink p-4 font-mono text-sm text-fg outline-none"
                  value={draft}
                  onChange={onDraftChange}
                  onKeyDown={onEditorKeyDown}
                  spellCheck={false}
                  placeholder="Write markdown…"
                />
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                <div
                  className="md-body mx-auto max-w-2xl"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(draft) }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
