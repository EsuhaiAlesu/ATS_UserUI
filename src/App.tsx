import React, { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AudioRouting from './pages/AudioRouting'
import RevealMoment from './pages/RevealMoment'
import BilingualStream from './pages/BilingualStream'
import AudienceWall from './pages/AudienceWall'
import WallMockup from './pages/WallMockup'
import VoiceStudio from './pages/VoiceStudio'
import GlossaryEditor from './pages/GlossaryEditor'
import ScriptPrep from './pages/ScriptPrep'
import PrepDesk from './pages/PrepDesk'
import Settings from './pages/Settings'
import IncidentReport from './pages/IncidentReport'
import SchedulePlanner from './pages/SchedulePlanner'
import SpeakerMemory from './pages/SpeakerMemory'
import DocumentsLibrary from './pages/DocumentsLibrary'
import ProgramTimeline from './pages/ProgramTimeline'
import OnlineLab from './pages/OnlineLab'
import OperatorLayout from './components/OperatorLayout'
import SplashScreen from './components/SplashScreen'
import Toaster from './components/Toaster'
import ErrorBoundary from './components/ErrorBoundary'
import { LiveSessionProvider } from './lib/LiveSessionContext'
import { ActiveEventProvider } from './lib/ActiveEventContext'
import { ConferenceModeProvider } from './lib/ConferenceModeContext'

const App: React.FC = () => {
  // The ESUHAI intro splash only plays on the home page ("/"), then redirects into the
  // dashboard. Windows opened straight to a sub-route (e.g. the /stream language pop-outs)
  // skip the splash and show content immediately.
  const [splashState, setSplashState] = useState<'animating' | 'fading' | 'done'>(
    () => (window.location.pathname === '/' ? 'animating' : 'done')
  );

  return (
    <LiveSessionProvider>
      <ConferenceModeProvider>
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
              <Route path="/program" element={<ProgramTimeline />} />
              {/* Dịch hội nghị — TRONG shell: giữ headbar + pill "Dịch hội nghị" sáng; thanh điều khiển
                  riêng của bàn điều khiển đóng vai side menu (OperatorLayout ẩn sidebar shell cho menu ops).
                  Route = /console (tên "/audio" nói về thiết bị âm thanh, không phải bàn điều khiển). */}
              <Route path="/console" element={<AudioRouting />} />
            </Route>

            {/* /audio là tên cũ → giữ redirect cho bookmark & cửa sổ đã mở. */}
            <Route path="/audio" element={<Navigate to="/console" replace />} />

            {/* Audience / ceremonial surfaces are full-screen — no operator chrome. */}
            <Route path="/reveal" element={<RevealMoment />} />
            <Route path="/stream" element={<BilingualStream />} />
            {/* ONLINE audience wall — detachable subtitle window(s), one per direction (TASK 7). */}
            <Route path="/wall" element={<AudienceWall />} />
            {/* Màn tượng trưng — cả hội trường thu nhỏ đúng tỉ lệ trên MỘT màn, để canh cỡ chữ trước buổi lễ. */}
            <Route path="/wall-mockup" element={<WallMockup />} />

            {/* ONLINE lane dev bench (docs/ONLINE-LANE-CONTRACT.md) — standalone, NO navbar link. */}
            <Route path="/online-lab" element={<OnlineLab />} />

            <Route path="*" element={<Navigate to="/prep" replace />} />
          </Routes>
          </ErrorBoundary>
        )}
      </div>
      </ActiveEventProvider>
      </ConferenceModeProvider>
    </LiveSessionProvider>
  )
}

export default App
