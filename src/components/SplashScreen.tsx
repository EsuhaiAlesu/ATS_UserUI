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
        <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-radial transition-opacity duration-1000 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
            <div className="flex flex-col items-center justify-center animate-splash-content">
                <img src={logoEsuhaiSmall} alt="ESUHAI Logo" className="w-16 md:w-20 mb-4 object-contain drop-shadow-xl" />
                <h1
                    className="font-brand text-4xl md:text-6xl text-primary font-bold mb-3 tracking-[0.2em] text-center"
                    style={{ textShadow: '0 0 25px rgba(232, 184, 75, 0.5)' }}
                >
                    ESUHAI
                </h1>
                <p
                    className="font-slogan text-sm md:text-base uppercase text-center text-on-surface"
                    style={{ opacity: 0.85, letterSpacing: '0.5em' }}
                >
                    Success in Shigoto
                </p>
            </div>
        </div>
    );
};

export default SplashScreen;
