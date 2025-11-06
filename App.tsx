import React, { useState, useCallback } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { Spinner } from './components/Spinner';
import { generateImageWithPrompt } from './services/geminiService';
import { fileToImagePayload } from './utils/fileUtils';
import { ImageFile, ImagePayload } from './types';

function App() {
  const [prompt, setPrompt] = useState<string>('');
  const [imageFile, setImageFile] = useState<ImageFile | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelect = (file: File | null) => {
    if (imageFile) {
      URL.revokeObjectURL(imageFile.previewUrl);
    }

    if (file) {
      setImageFile({
        file,
        previewUrl: URL.createObjectURL(file),
      });
    } else {
      setImageFile(null);
    }
    setGeneratedImageUrl(null); // Clear previous result when image changes
  };

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!prompt || !imageFile) {
      setError('Please provide a prompt and an image.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImageUrl(null);

    try {
      const imagePayload: ImagePayload = await fileToImagePayload(imageFile.file);
      const resultUrl = await generateImageWithPrompt(prompt, imagePayload);
      setGeneratedImageUrl(resultUrl);
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('An unknown error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [prompt, imageFile]);

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-purple-400">AI Image Editor</h1>
          <p className="text-gray-400 mt-2">Upload an image and tell the AI how to change it.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">
              Your prompt
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., 'add a cat wearing a party hat'"
              className="w-full h-24 p-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Upload image
            </label>
            <ImageUploader 
              onImageSelect={handleImageSelect} 
              imagePreviewUrl={imageFile?.previewUrl || null} 
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading || !prompt || !imageFile}
            className="w-full flex justify-center items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            {isLoading ? <><Spinner /> Generating...</> : 'Generate Image'}
          </button>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-900/50 border border-red-700 text-red-300 rounded-lg">
            <p><strong>Error:</strong> {error}</p>
          </div>
        )}

        {generatedImageUrl && (
          <div className="mt-8">
            <h2 className="text-2xl font-semibold text-center mb-4">Result</h2>
            <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
              <img src={generatedImageUrl} alt="Generated" className="w-full h-auto object-contain" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
