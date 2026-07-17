import React from 'react';
import RevealMoment from './RevealMoment';
import MainLayout from '../components/MainLayout';

const Home: React.FC = () => {
    return (
        <div className="w-full h-screen overflow-y-auto overflow-x-hidden snap-y snap-mandatory scroll-smooth bg-background">
            {/* 1st Section: Reveal Moment */}
            <section className="w-full h-screen snap-start relative shrink-0">
                <RevealMoment isEmbedded={true} />
                <div className="absolute bottom-8 w-full flex flex-col items-center z-50 text-secondary animate-bounce pointer-events-none">
                    <span className="font-label-caps text-label-caps opacity-70 mb-2 tracking-widest">SCROLL TO ENTER</span>
                    <span className="material-symbols-outlined text-3xl">keyboard_arrow_down</span>
                </div>
            </section>
            
            {/* 2nd Section: Main Application Layout */}
            <section className="w-full h-screen snap-start bg-background shrink-0">
                <MainLayout />
            </section>
        </div>
    );
};

export default Home;
