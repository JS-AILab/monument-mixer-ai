import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { PromptInput } from './components/PromptInput';
import { ImageUploader } from './components/ImageUploader';
import { ImageDisplay } from './components/ImageDisplay';
import { generateMonument } from './services/geminiService';

interface UploadedImage {
  base64: string;
  mimeType: string;
  name: string;
}

const App: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageUpload = async (file: File) => {
    try {
      setError(null);
      const base64 = await fileToBase64(file);
      setUploadedImage({ base64, mimeType: file.type, name: file.name });
    } catch (err) {
      console.error('Error converting file to base64:', err);
      setError('Failed to process the image. Please try another one.');
    }
  };
  
  const handleGenerate = useCallback(async () => {
    if (!prompt && !uploadedImage) {
      setError('Please provide a prompt or upload an image.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const imagePart = uploadedImage ? { data: uploadedImage.base64, mimeType: uploadedImage.mimeType } : null;
      const resultBase64 = await generateMonument(prompt, imagePart);
      if (resultBase64) {
        setGeneratedImage(`data:image/png;base64,${resultBase64}`);
      } else {
        throw new Error('The API did not return an image.');
      }
    } catch (err: any) {
      console.error('Error generating monument:', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [prompt, uploadedImage]);

  const canGenerate = (prompt.trim() !== '' || uploadedImage !== null) && !isLoading;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-sans">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Input Section */}
          <div className="flex flex-col space-y-6 bg-gray-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-cyan-400">1. Describe Your Vision</h2>
            <PromptInput
              prompt={prompt}
              setPrompt={setPrompt}
              onSubmit={handleGenerate}
              disabled={isLoading}
            />
            <div className="relative flex items-center">
              <span className="flex-shrink text-gray-400 px-4">OR</span>
              <div className="flex-grow border-t border-gray-600"></div>
            </div>
            <ImageUploader
              onImageUpload={handleImageUpload}
              uploadedImage={uploadedImage}
              setUploadedImage={setUploadedImage}
              disabled={isLoading}
            />
             <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-lg transition-all duration-300 ease-in-out
                ${canGenerate
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                  : 'bg-gray-600 cursor-not-allowed text-gray-400'
                }`}
            >
              {isLoading ? 'Creating...' : 'Generate Monument'}
            </button>
          </div>

          {/* Output Section */}
          <div className="flex flex-col bg-gray-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-cyan-400 mb-6">2. Behold Your Creation</h2>
            <ImageDisplay
              isLoading={isLoading}
              generatedImage={generatedImage}
              error={error}
            />
          </div>
        </div>
      </main>
      <footer className="text-center p-4 text-gray-500 text-sm">
        <p>Powered by Google Gemini. Designed by a World-Class Frontend Engineer.</p>
      </footer>
    </div>
  );
};

export default App;
