import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

interface Props {
    isEmbedded?: boolean;
}

const RevealMoment: React.FC<Props> = ({ isEmbedded = false }) => {
    useEffect(() => {
        const container = document.getElementById('particles-container');
        if (!container) return;
        container.innerHTML = '';
        
        const particleCount = 50;
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');
            
            // Random properties
            const size = Math.random() * 4 + 1; // 1px to 5px
            const left = Math.random() * 100; // 0% to 100%
            const delay = Math.random() * 8; // 0s to 8s
            const duration = Math.random() * 4 + 6; // 6s to 10s

            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${left}%`;
            particle.style.animationDelay = `${delay}s`;
            particle.style.animationDuration = `${duration}s`;

            container.appendChild(particle);
        }
    }, []);

    return (
        <div className="bg-background text-on-background min-h-screen overflow-hidden flex flex-col items-center justify-center relative font-body-md bg-gradient-radial">
            {/* Minimal nav just for testing */}
            {!isEmbedded && (
                <div className="absolute top-4 left-4 z-50">
                    <Link to="/" className="text-on-surface-variant font-label-caps text-label-caps hover:text-primary">&lt; BACK</Link>
                </div>
            )}

            {/* Particle Container */}
            <div className="absolute inset-0 z-0 pointer-events-none" id="particles-container"></div>
            
            {/* Main Content */}
            <main className="relative z-10 flex flex-col items-center justify-center text-center px-container-padding w-full max-w-[1920px] mx-auto h-full flex-grow">
                {/* Central Branding */}
                <div className="mb-section-gap reveal-text reveal-delay-1 flex flex-col items-center">
                    <h1 className="font-display-lg text-display-lg md:font-display-lg md:text-display-lg text-secondary tracking-tighter" style={{ textShadow: '0 0 20px var(--color-secondary)' }}>
                        花訳 | Hana-Yaku
                    </h1>
                    <div className="h-[1px] w-32 bg-secondary opacity-50 mt-stack-md mx-auto"></div>
                </div>
                
                {/* Commemorative Text */}
                <div className="space-y-stack-md">
                    <p className="font-headline-sm text-headline-sm text-on-surface reveal-text reveal-delay-2 uppercase tracking-wider">
                        20th ANNIVERSARY ESUHAI
                    </p>
                    <p className="font-body-lg text-body-lg text-on-surface-variant reveal-text reveal-delay-2">
                        Kỷ niệm 20 năm thành lập
                    </p>
                    <div className="flex items-center justify-center gap-stack-sm reveal-text reveal-delay-3 mt-stack-lg">
                        <span className="h-[1px] w-12 bg-secondary opacity-30"></span>
                        <p className="font-headline-sm text-headline-sm text-secondary">
                            20周年記念
                        </p>
                        <span className="h-[1px] w-12 bg-secondary opacity-30"></span>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default RevealMoment;
