import React from 'react';
import { Loader } from './Loader';

interface ImageDisplayProps {
  isLoading: boolean;
  generatedImage: string | null;
  error: string | null;
}

const ImageIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
);

const ErrorIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

export const ImageDisplay: React.FC<ImageDisplayProps> = ({ isLoading, generatedImage, error }) => {

  const renderContent = () => {
    if (isLoading) {
      return <Loader />;
    }
    if (error) {
      return (
         <div className="p-4 text-center text-red-300">
          <ErrorIcon className="mx-auto h-16 w-16 text-red-400" />
          <p className="mt-4 font-semibold">Generation Failed</p>
          <p className="mt-2 text-sm text-gray-400">{error}</p>
        </div>
      );
    }
    if (generatedImage) {
      return (
        <img
          src={generatedImage}
          alt="Generated Monument"
          className="w-full h-full object-contain transition-opacity duration-500 animate-fade-in"
        />
      );
    }
    return (
      <div className="text-center text-gray-400 p-4">
          <ImageIcon className="mx-auto h-16 w-16 text-gray-500" />
          <p className="mt-4 font-semibold">Your generated monument will appear here.</p>
          <p className="mt-1 text-sm text-gray-500">Describe your idea or upload an image to begin.</p>
      </div>
    );
  };
  
  return (
    <div className="w-full aspect-square bg-gray-700/50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-600 relative overflow-hidden">
      {renderContent()}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
};
