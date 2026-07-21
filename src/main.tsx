import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { migrateToEventScoped, migrateToSeries } from './lib/migrate'

migrateToEventScoped()   // one-time, idempotent, never throws — moves script into event-scoped keys
migrateToSeries()        // one-time, idempotent — seeds proyaku_series=[] (doc 30); touches nothing else

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
