// Demo entry: the full HQ app with the Node server swapped for browser
// storage. Used only for the hosted artifact build — the real app talks to
// server.mjs and keeps data in plain files.
import './shim.js'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '../src/App.jsx'
import '../src/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
