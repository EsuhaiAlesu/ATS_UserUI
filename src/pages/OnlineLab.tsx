// src/pages/OnlineLab.tsx
//
// Hidden debug bench for the ONLINE lane (standalone route /online-lab, NOT linked in any navbar).
// It now renders the shared OnlinePanel through the facade — identical behavior, zero orchestration
// here. Kept so pipeline issues can be isolated from UI-integration issues.

import React from 'react'
import { OnlinePanel } from '../lib/lanes/online'

const OnlineLab: React.FC = () => (
  <div style={{ maxWidth: 960, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif', color: '#e2e8f0' }}>
    <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Online Lane — Dev Bench</h1>
    <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>
      Bàn thử nghiệm luồng ONLINE (Esuhai Realtime Translation). Mọi lệnh gọi qua <code>/online-api</code>. Trang nội bộ, không có trên menu.
    </p>
    <OnlinePanel />
  </div>
)

export default OnlineLab
