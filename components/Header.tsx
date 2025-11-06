import React from 'react';

const LandmarkIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path fillRule="evenodd" d="M4.5 2.25a.75.75 0 000 1.5v16.5a.75.75 0 001.5 0v-1.875a.75.75 0 011.5 0v1.875a.75.75 0 001.5 0V3.75a.75.75 0 000-1.5h-4.5z" clipRule="evenodd" />
    <path d="M10.125 2.25a.75.75 0 000 1.5v16.5a.75.75 0 001.5 0v-1.875a.75.75 0 011.5 0v1.875a.75.75 0 001.5 0V3.75a.75.75 0 000-1.5h-4.5zM15.75 3a.75.75 0 01.75.75v16.5a.75.75 0 01-1.5 0V3.75a.75.75 0 01.75-.75zM19.5 3a.75.75 0 01.75.75v16.5a.75.75 0 01-1.5 0V3.75a.75.75 0 01.75-.75z" />
  </svg>
);


export const Header: React.FC = () => {
  return (
    <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4 flex items-center justify-center">
        <LandmarkIcon className="h-8 w-8 text-cyan-400 mr-3" />
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          AI Monument Generator
        </h1>
      </div>
    </header>
  );
};
