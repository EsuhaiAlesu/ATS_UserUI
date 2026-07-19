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
import OperatorLayout from './components/OperatorLayout'
import SplashScreen from './components/SplashScreen'
import Toaster from './components/Toaster'
import { LiveSessionProvider } from './lib/LiveSessionContext'

const App: React.FC = () => {
  // The ESUHAI intro splash only plays on the home page ("/"), then redirects into the
  // dashboard. Windows opened straight to a sub-route (e.g. the /stream language pop-outs)
  // skip the splash and show content immediately.
  const [splashState, setSplashState] = useState<'animating' | 'fading' | 'done'>(
    () => (window.location.pathname === '/' ? 'animating' : 'done')
  );

  return (
    <LiveSessionProvider>
      <Toaster />
      <div className="bg-background min-h-screen">
        {splashState !== 'done' && <SplashScreen onStateChange={setSplashState} />}
        {splashState !== 'animating' && (
          <Routes>
            {/* "/" is the ceremonial splash entry → the dashboard is the single home. */}
            <Route path="/" element={<Navigate to="/prep" replace />} />

            {/* Operator surfaces share ONE nav shell (rail + safety block). */}
            <Route element={<OperatorLayout />}>
              <Route path="/prep" element={<PrepDesk />} />
              <Route path="/audio" element={<AudioRouting />} />
              <Route path="/script" element={<ScriptPrep />} />
              <Route path="/glossary" element={<GlossaryEditor />} />
              <Route path="/voices" element={<VoiceStudio />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/report" element={<IncidentReport />} />
            </Route>

            {/* Audience / ceremonial surfaces are full-screen — no operator chrome. */}
            <Route path="/reveal" element={<RevealMoment />} />
            <Route path="/stream" element={<BilingualStream />} />

            <Route path="*" element={<Navigate to="/prep" replace />} />
          </Routes>
        )}
      </div>
    </LiveSessionProvider>
  )
}

export default App
