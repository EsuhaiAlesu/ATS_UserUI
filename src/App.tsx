import React, { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import AudioRouting from './pages/AudioRouting'
import RevealMoment from './pages/RevealMoment'
import BilingualStream from './pages/BilingualStream'
import VoiceStudio from './pages/VoiceStudio'
import GlossaryEditor from './pages/GlossaryEditor'
import Home from './pages/Home'
import SplashScreen from './components/SplashScreen'
import { LiveSessionProvider } from './lib/LiveSessionContext'

const App: React.FC = () => {
  // The ESUHAI intro splash only plays on the home page. Windows opened straight
  // to a sub-route (e.g. the /stream language pop-outs) skip it and show content
  // immediately.
  const [splashState, setSplashState] = useState<'animating' | 'fading' | 'done'>(
    () => (window.location.pathname === '/' ? 'animating' : 'done')
  );

  return (
    <LiveSessionProvider>
      <div className="bg-background min-h-screen">
        {splashState !== 'done' && <SplashScreen onStateChange={setSplashState} />}
        {splashState !== 'animating' && (
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/audio" element={<AudioRouting />} />
            <Route path="/reveal" element={<RevealMoment />} />
            <Route path="/stream" element={<BilingualStream />} />
            <Route path="/voices" element={<VoiceStudio />} />
            <Route path="/glossary" element={<GlossaryEditor />} />
          </Routes>
        )}
      </div>
    </LiveSessionProvider>
  )
}

export default App
