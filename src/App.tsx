import React, { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AudioRouting from './pages/AudioRouting'
import RevealMoment from './pages/RevealMoment'
import BilingualStream from './pages/BilingualStream'
import VoiceStudio from './pages/VoiceStudio'
import GlossaryEditor from './pages/GlossaryEditor'
import ScriptPrep from './pages/ScriptPrep'
import PrepDesk from './pages/PrepDesk'
import Settings from './pages/Settings'
import IncidentReport from './pages/IncidentReport'
import SchedulePlanner from './pages/SchedulePlanner'
import SpeakerMemory from './pages/SpeakerMemory'
import DocumentsLibrary from './pages/DocumentsLibrary'
import OperatorLayout from './components/OperatorLayout'
import SplashScreen from './components/SplashScreen'
import Toaster from './components/Toaster'
import ErrorBoundary from './components/ErrorBoundary'
import { LiveSessionProvider } from './lib/LiveSessionContext'
import { ActiveEventProvider } from './lib/ActiveEventContext'

const App: React.FC = () => {
  // The ESUHAI intro splash only plays on the home page ("/"), then redirects into the
  // dashboard. Windows opened straight to a sub-route (e.g. the /stream language pop-outs)
  // skip the splash and show content immediately.
  const [splashState, setSplashState] = useState<'animating' | 'fading' | 'done'>(
    () => (window.location.pathname === '/' ? 'animating' : 'done')
  );

  return (
    <LiveSessionProvider>
      <ActiveEventProvider>
      <Toaster />
      <div className="bg-background min-h-screen">
        {splashState !== 'done' && <SplashScreen onStateChange={setSplashState} />}
        {splashState !== 'animating' && (
          <ErrorBoundary>
          <Routes>
            {/* "/" is the ceremonial splash entry → the dashboard is the single home. */}
            <Route path="/" element={<Navigate to="/prep" replace />} />

            {/* Operator surfaces share ONE nav shell (rail + safety block). */}
            <Route element={<OperatorLayout />}>
              <Route path="/prep" element={<PrepDesk />} />
              <Route path="/script" element={<ScriptPrep />} />
              <Route path="/glossary" element={<GlossaryEditor />} />
              <Route path="/voices" element={<VoiceStudio />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/report" element={<IncidentReport />} />
              <Route path="/schedule" element={<SchedulePlanner />} />
              <Route path="/speakers" element={<SpeakerMemory />} />
              <Route path="/documents" element={<DocumentsLibrary />} />
              {/* Dịch hội nghị — TRONG shell: giữ headbar + pill "Dịch hội nghị" sáng; thanh điều khiển
                  riêng của bàn điều khiển đóng vai side menu (OperatorLayout ẩn sidebar shell cho menu ops). */}
              <Route path="/audio" element={<AudioRouting />} />
            </Route>

            {/* Audience / ceremonial surfaces are full-screen — no operator chrome. */}
            <Route path="/reveal" element={<RevealMoment />} />
            <Route path="/stream" element={<BilingualStream />} />

            <Route path="*" element={<Navigate to="/prep" replace />} />
          </Routes>
          </ErrorBoundary>
        )}
      </div>
      </ActiveEventProvider>
    </LiveSessionProvider>
  )
}

export default App
