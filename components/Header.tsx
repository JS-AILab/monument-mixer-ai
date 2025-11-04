
import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="py-4 px-4 sm:px-8 bg-slate-900/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-10">
            <div className="container mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <svg className="w-8 h-8 text-cyan-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m2 21 8-8 1.5 1.5 8-8"/>
                        <path d="M7 3h14v14"/>
                        <path d="m22 2-2.5 2.5"/>
                        <path d="m19 5-2.5 2.5"/>
                        <path d="m16 8-2.5 2.5"/>
                    </svg>
                     <h1 className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">
                        Monument Mixer AI
                    </h1>
                </div>
            </div>
        </header>
    );
};

export default Header;
