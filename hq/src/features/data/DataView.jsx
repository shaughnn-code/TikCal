// Data screen — only mounted in the browser-storage builds (PWA / demo),
// where window.__HQ_BACKUP__ exists. Lets you keep the data as one JSON file
// in local or cloud file storage, and restore from it.
import { useRef, useState } from 'react'
import { useHQ } from '../../store.jsx'
import { Icon } from '../../components/icons.jsx'
import { Field } from '../../components/ui.jsx'

const backup = () => window.__HQ_BACKUP__

async function saveSnapshot(text) {
  const filename = `hq-data-${new Date().toISOString().slice(0, 10)}.json`
  // Chrome/Edge/Android: real "save to…" picker (works into synced cloud folders).
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'HQ backup', accept: { 'application/json': ['.json'] } }],
      })
      const w = await handle.createWritable()
      await w.write(text)
      await w.close()
      return 'saved'
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelled'
      // fall through to download
    }
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return 'downloaded'
}

export default function DataView() {
  const { refresh } = useHQ()
  const fileRef = useRef(null)
  const [status, setStatus] = useState(null) // {kind:'ok'|'err', msg}
  const b = backup()

  if (!b) {
    return (
      <div className="p-6 text-sm text-mut">
        This build stores data in <code>hq/data/</code> on disk — back up by copying that folder.
      </div>
    )
  }

  const counts = b.counts()

  async function onExport() {
    try {
      const result = await saveSnapshot(b.snapshot())
      if (result !== 'cancelled') setStatus({ kind: 'ok', msg: `Backup ${result}.` })
    } catch (e) {
      setStatus({ kind: 'err', msg: `Export failed: ${e.message}` })
    }
  }

  async function onImportFile(file) {
    if (!file) return
    try {
      const text = await file.text()
      if (!window.confirm('Replace everything in this app with the contents of this backup?')) return
      b.restore(text)
      await refresh()
      setStatus({ kind: 'ok', msg: 'Backup restored.' })
    } catch (e) {
      setStatus({ kind: 'err', msg: `Import failed: ${e.message}` })
    }
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold tracking-tight">Data</h1>
        <div className="label mt-1">one file, yours to keep</div>
      </div>

      <div className="card mb-4 p-4">
        <div className="label mb-2">Stored here: {b.storageKind}</div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-sm text-fg/90">
          <span>{counts.tasks} tasks</span>
          <span>{counts.events} events</span>
          <span>{counts.sessions} sessions</span>
          <span>{counts.notes} notes</span>
        </div>
      </div>

      <div className="card mb-4 space-y-3 p-4">
        <Field label="Back up">
          <p className="mb-2 text-sm text-mut">
            Exports everything as one readable JSON file. Save it anywhere — a folder on this
            device, or a synced one (iCloud, Google Drive, Dropbox) to keep a cloud copy.
          </p>
          <button className="btn-gold" onClick={onExport}>
            <Icon name="download" size={14} />
            Export backup
          </button>
        </Field>
      </div>

      <div className="card space-y-3 p-4">
        <Field label="Restore">
          <p className="mb-2 text-sm text-mut">
            Imports a backup file and replaces what's here. Use it to move between devices or
            roll back to a saved copy.
          </p>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={14} />
            Import backup…
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              onImportFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </Field>
      </div>

      {status && (
        <div
          className={`mt-4 rounded-lg border px-4 py-2 text-sm ${
            status.kind === 'ok' ? 'border-green/50 bg-green/10 text-green' : 'border-red/50 bg-red/10 text-red'
          }`}
        >
          {status.msg}
        </div>
      )}
    </div>
  )
}
