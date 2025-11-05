
import React, { useRef, useCallback } from 'react';
import { UploadIcon, XCircleIcon } from './icons';

interface ImageUploaderProps {
  onImageSelect: (file: File | null) => void;
  imagePreviewUrl: string | null;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect, imagePreviewUrl }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    onImageSelect(file || null);
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageSelect(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleContainerClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/png, image/jpeg, image/webp"
      />
      <div
        onClick={handleContainerClick}
        className="w-full h-48 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-purple-500 hover:bg-gray-800/50 transition-colors relative"
      >
        {imagePreviewUrl ? (
          <>
            <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover rounded-lg" />
            <button
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 bg-gray-900/70 rounded-full text-gray-300 hover:text-white transition-colors"
              aria-label="Remove image"
            >
              <XCircleIcon className="w-6 h-6" />
            </button>
          </>
        ) : (
          <div className="text-center text-gray-500">
            <UploadIcon className="mx-auto h-8 w-8" />
            <p className="mt-2 text-sm">Click to upload or drag & drop</p>
            <p className="text-xs">PNG, JPG, WEBP</p>
          </div>
        )}
      </div>
    </div>
  );
};
