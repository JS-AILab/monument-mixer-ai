
import React, { useState, useCallback } from 'react';
import { generateMonumentImage } from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';
import { ImageFile } from './types';
import { ImageUploader } from './components/ImageUploader';
import { Spinner } from './components/Spinner';
import { ImageIcon, SparklesIcon } from './components/icons';

const App: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [imageFile, setImageFile] = useState<ImageFile | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelect = useCallback((file: File | null) => {
    if (file) {
      setImageFile({
        file: file,
        previewUrl: URL.createObjectURL(file),
      });
    } else {
      if (imageFile?.previewUrl) {
        URL.revokeObjectURL(imageFile.previewUrl);
      }
      setImageFile(null);
    }
  }, [imageFile]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt to describe the monument.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImageUrl(null);

    try {
      let imagePayload = null;
      if (imageFile) {
        const base64 = await fileToBase64(imageFile.file);
        imagePayload = {
          base64: base64,
          mimeType: imageFile.file.type,
        };
      }
      const imageUrl = await generateMonumentImage(prompt, imagePayload);
      setGeneratedImageUrl(imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 lg:p-8 font-sans">
      <header className="w-full max-w-5xl text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          AI Monument Generator
        </h1>
        <p className="mt-2 text-lg text-gray-400">
          Craft majestic monuments from your imagination.
        </p>
      </header>

      <main className="w-full max-w-5xl flex flex-col lg:flex-row gap-8">
        {/* Controls Panel */}
        <div className="lg:w-1/2 bg-gray-800/50 p-6 rounded-2xl border border-gray-700 backdrop-blur-sm">
          <div className="space-y-6">
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">
                1. Describe your monument
              </label>
              <textarea
                id="prompt"
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors placeholder-gray-500"
                placeholder="e.g., A colossal obsidian monument to the stars, with glowing constellations carved into its surface"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                2. (Optional) Add a reference image
              </label>
              <ImageUploader onImageSelect={handleImageSelect} imagePreviewUrl={imageFile?.previewUrl ?? null} />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isLoading || !prompt}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-500/50"
            >
              {isLoading ? (
                <>
                  <Spinner />
                  Generating...
                </>
              ) : (
                <>
                  <SparklesIcon />
                  Generate Monument
                </>
              )}
            </button>
          </div>
        </div>

        {/* Output Panel */}
        <div className="lg:w-1/2 h-96 lg:h-auto bg-gray-800/50 rounded-2xl border border-gray-700 flex items-center justify-center p-4 relative overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm flex flex-col items-center justify-center z-10">
              <Spinner />
              <p className="mt-4 text-gray-300">Building your vision...</p>
            </div>
          )}
          {error && (
            <div className="text-center text-red-400 px-4">
              <h3 className="font-bold mb-2">Generation Failed</h3>
              <p className="text-sm">{error}</p>
            </div>
          )}
          {!isLoading && !error && generatedImageUrl && (
            <img 
              src={generatedImageUrl} 
              alt="Generated Monument" 
              className="w-full h-full object-contain rounded-lg animate-fade-in"
              style={{ animation: 'fadeIn 0.5s ease-in-out' }}
            />
          )}
          {!isLoading && !error && !generatedImageUrl && (
            <div className="text-center text-gray-500">
              <ImageIcon className="mx-auto h-16 w-16" />
              <p className="mt-4 font-medium">Your generated monument will appear here</p>
            </div>
          )}
        </div>
      </main>
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

export default App;
