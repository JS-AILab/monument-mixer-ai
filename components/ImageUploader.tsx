
import React, { useState, useRef } from 'react';

interface ImageUploaderProps {
    onImageUpload: (file: File) => void;
    label: string;
    id: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, label, id }) => {
    const [preview, setPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onImageUpload(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        const file = event.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            onImageUpload(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
    };
    
    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    return (
        <div 
            className="w-full p-4 border-2 border-dashed border-slate-600 rounded-lg text-center cursor-pointer hover:border-cyan-400 transition-colors duration-300 bg-slate-800/50"
            onClick={triggerFileSelect}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >
            <input
                type="file"
                id={id}
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
            />
            {preview ? (
                <img src={preview} alt="Preview" className="mx-auto max-h-64 rounded-md object-contain" />
            ) : (
                <div className="flex flex-col items-center justify-center py-8">
                    <svg className="w-12 h-12 text-slate-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <p className="text-slate-400">{label}</p>
                    <p className="text-xs text-slate-500">Drag & drop or click to upload</p>
                </div>
            )}
        </div>
    );
};

export default ImageUploader;
