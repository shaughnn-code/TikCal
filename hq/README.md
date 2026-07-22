# HQ

Your personal headquarters: tasks, calendar, kanban board, focus timer and
markdown notes — one app, fully local, no accounts, no external services.

## Run it

```sh
cd hq
npm install        # first time only
npm run build      # first time, and after pulling changes
npm start          # → http://localhost:5317
```

That's it. `npm start` runs a single dependency-free Node server (`server.mjs`)
that serves the built app and the data API. Keep it running; open
http://localhost:5317 in your browser.

## Your data

Everything lives in `hq/data/` as plain files you can read, edit and back up:

- `data/tasks.json` — tasks
- `data/events.json` — calendar events
- `data/sessions.json` — logged focus sessions
- `data/notes/*.md` — notes, one markdown file each

**Backup = copy the `data/` folder.** Writes are atomic (temp file + rename),
so a crash can't corrupt them. The folder is gitignored — your data never
leaves your machine.

## How the pieces connect

- A task with a due date appears on the **calendar** automatically.
- The **board** is the same tasks viewed by status — dragging a card updates
  the task everywhere.
- The **focus timer** runs against a task; completed sessions are logged on the
  task and appear as gold blocks on the calendar.
- **Notes** attach to tasks (from the note, the task, or mid-focus-session);
  backlinks show on both sides.
- A calendar event can be converted to a task in one click.

## Development

```sh
npm start          # API server on :5317 (leave running)
npm run dev        # Vite dev server on :5199, proxies /api → :5317
npm test           # unit tests (node --test) for src/lib
```

## Timer behavior worth knowing

The active timer is persisted in `localStorage`: reload the page mid-session
and it keeps counting; if a session completes while the app is closed, it is
logged on next launch. "Finish" ends a focus block early and logs the time
actually focused (sessions under 5 seconds are discarded).
