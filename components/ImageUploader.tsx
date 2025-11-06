import React, { useRef, useState } from 'react';
import { ImagePreviewModal } from './ImagePreviewModal';

interface UploadedImage {
  base64: string;
  mimeType: string;
  name: string;
}

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  uploadedImage: UploadedImage | null;
  setUploadedImage: (image: UploadedImage | null) => void;
  disabled: boolean;
}

const UploadIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const ViewIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);


export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, uploadedImage, setUploadedImage, disabled }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageUpload(file);
    }
  };

  const handleClearImage = () => {
    setUploadedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
        onImageUpload(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };
  
  const imageUrl = uploadedImage ? `data:${uploadedImage.mimeType};base64,${uploadedImage.base64}` : '';

  return (
    <>
      <div className="flex flex-col">
        <label className="mb-2 font-semibold text-gray-300">
          Upload an image for inspiration
        </label>
        {uploadedImage ? (
          <div className="relative group bg-gray-700 rounded-lg">
            <img
              src={imageUrl}
              alt="Preview"
              className="w-full h-48 object-contain rounded-lg"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex items-center justify-center space-x-4">
              <button
                  onClick={() => setIsPreviewOpen(true)}
                  disabled={disabled}
                  className="opacity-0 group-hover:opacity-100 bg-cyan-600 text-white rounded-full p-2 hover:bg-cyan-500 transition-opacity disabled:opacity-50"
                  aria-label="Preview image"
              >
                  <ViewIcon className="h-6 w-6" />
              </button>
              <button
                  onClick={handleClearImage}
                  disabled={disabled}
                  className="opacity-0 group-hover:opacity-100 bg-red-600 text-white rounded-full p-2 hover:bg-red-500 transition-opacity disabled:opacity-50"
                  aria-label="Remove image"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        ) : (
          <div 
            onClick={() => !disabled && fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-600 rounded-lg transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-700/50'}`}>
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <UploadIcon className="w-10 h-10 mb-3 text-gray-400" />
              <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
            </div>
            <input ref={fileInputRef} id="dropzone-file" type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={disabled} />
          </div>
        )}
      </div>
      {isPreviewOpen && uploadedImage && (
        <ImagePreviewModal src={imageUrl} onClose={() => setIsPreviewOpen(false)} />
      )}
    </>
  );
};
