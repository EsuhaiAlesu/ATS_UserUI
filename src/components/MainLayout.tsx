import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AudioRouting from '../pages/AudioRouting';
import BilingualStream from '../pages/BilingualStream';
import { isSessionActive, useLiveSession } from '../lib/LiveSessionContext';

const MainLayout: React.FC = () => {
    const session = useLiveSession();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'audio' | 'stream'>('audio');
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme === 'dark') {
            setIsDarkMode(true);
            document.documentElement.classList.add('dark');
        } else {
            setIsDarkMode(false);
            document.documentElement.classList.remove('dark');
        }
    }, []);

    const toggleTheme = () => {
        if (isDarkMode) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            setIsDarkMode(false);
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            setIsDarkMode(true);
        }
    };

    const handleTabChange = (tab: 'audio' | 'stream') => {
        if (tab === activeTab) return;
        setIsTransitioning(true);
        setTimeout(() => {
            setActiveTab(tab);
            setIsTransitioning(false);
        }, 300); // 300ms transition
    };

    return (
        <div className="bg-background text-on-background flex flex-col font-body-md overflow-x-hidden relative w-full h-screen">
            {/* TopAppBar (Navbar) */}
            <header className="bg-surface dark:bg-surface border-b border-outline-variant dark:border-outline-variant flex justify-between items-center w-full px-container-padding h-20 z-50 shrink-0">
                <div className="flex items-center gap-gutter">
                    <span className="font-bold text-2xl tracking-tighter text-secondary dark:text-secondary">Agent Translator — 花訳</span>
                    <nav className="hidden md:flex gap-6 ml-8">
                        <button className="font-label-caps text-label-caps text-on-surface-variant dark:text-on-surface-variant hover:opacity-80 transition-opacity uppercase">LIVE FEED</button>
                        <button 
                            onClick={() => handleTabChange('audio')}
                            className={`font-label-caps text-label-caps uppercase transition-transform duration-200 ${activeTab === 'audio' ? 'text-secondary dark:text-secondary border-b-2 border-secondary pb-1 scale-95' : 'text-on-surface-variant dark:text-on-surface-variant hover:opacity-80'}`}
                        >
                            AUDIO ROUTING
                        </button>
                        <button
                            onClick={() => navigate('/stream')}
                            className="font-label-caps text-label-caps uppercase transition-transform duration-200 text-on-surface-variant dark:text-on-surface-variant hover:opacity-80"
                        >
                            STREAM
                        </button>
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 font-label-caps text-label-caps text-primary dark:text-primary hover:opacity-80 transition-opacity border border-outline-variant px-4 py-2 rounded-DEFAULT">
                        <span className={`w-2 h-2 rounded-full ${session.backendOnline ? (isSessionActive(session.status) ? 'bg-secondary listening-pulse' : 'bg-secondary') : 'bg-error'}`}></span>
                        {session.backendOnline ? (isSessionActive(session.status) ? 'LIVE' : 'ONLINE') : 'OFFLINE'}
                    </button>
                    <button onClick={toggleTheme} className="material-symbols-outlined text-primary cursor-pointer hover:opacity-80 focus:outline-none transition-transform active:scale-90">
                        {isDarkMode ? 'light_mode' : 'dark_mode'}
                    </button>
                    <span className="material-symbols-outlined text-primary cursor-pointer hover:opacity-80">settings</span>
                    <span className="material-symbols-outlined text-primary cursor-pointer hover:opacity-80">account_circle</span>
                </div>
            </header>

            {/* Content Area with Fade Transition */}
            <div className={`flex-1 flex overflow-hidden transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
                {activeTab === 'audio' ? <AudioRouting /> : <BilingualStream isEmbedded={true} />}
            </div>
        </div>
    );
};

export default MainLayout;
