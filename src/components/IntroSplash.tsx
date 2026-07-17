import React, { useEffect, useState } from 'react';

const IntroSplash: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onComplete, 1000); // Wait for fade out animation
        }, 2000); // Show logo for 2 seconds
        
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black transition-opacity duration-1000 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <img 
                src="/esuhai-logo.png" 
                alt="Esuhai Logo" 
                className="w-40 h-40 animate-spin" 
                style={{ animationDuration: '3s', animationTimingFunction: 'linear' }}
            />
        </div>
    );
};

export default IntroSplash;
