import React, { useState, useEffect } from 'react';
import logoEsuhaiSmall from '../assets/logo_esuhai_small@2x.png';

interface Props {
    onStateChange?: (state: 'animating' | 'fading' | 'done') => void;
}

const SplashScreen: React.FC<Props> = ({ onStateChange }) => {
    const [isFadingOut, setIsFadingOut] = useState(false);

    useEffect(() => {
        // Logo animation takes 2.5s. Start fading out the background at 2.5s.
        const fadeOutTimer = setTimeout(() => {
            setIsFadingOut(true);
            onStateChange?.('fading');
        }, 2500);

        // Completely done after 3.5s
        const hideTimer = setTimeout(() => {
            onStateChange?.('done');
        }, 3500);

        return () => {
            clearTimeout(fadeOutTimer);
            clearTimeout(hideTimer);
        };
    }, [onStateChange]);

    return (
        <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-radial ceremonial-bg transition-opacity duration-1000 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
            <div className="flex flex-col items-center justify-center animate-splash-content">
                <img src={logoEsuhaiSmall} alt="ESUHAI" className="w-16 md:w-20 mb-5 object-contain" style={{ filter: 'drop-shadow(0 0 18px rgba(232,184,75,0.35))' }} />
                <h1
                    className="font-brand text-4xl md:text-6xl text-secondary font-bold tracking-[0.22em] text-center"
                    style={{ textShadow: '0 0 28px rgba(232, 184, 75, 0.45)' }}
                >
                    ESUHAI
                </h1>
                <div className="my-4 h-px w-40 md:w-56 bg-gradient-to-r from-transparent via-secondary to-transparent opacity-70"></div>
                <p className="font-slogan text-xs md:text-sm uppercase text-center text-on-surface-variant" style={{ letterSpacing: '0.42em' }}>
                    Success in Shigoto
                </p>
                <div className="mt-9 flex flex-col items-center gap-1.5">
                    <span className="font-label-caps text-label-caps tracking-[0.3em] text-secondary uppercase">PROYAKU · Phiên dịch VI ⇄ JA</span>
                    <span className="jp-text text-xs text-on-surface-variant tracking-widest opacity-70">20周年 · 2006 – 2026</span>
                </div>
            </div>
        </div>
    );
};

export default SplashScreen;
