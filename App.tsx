import React, { useState, useCallback } from 'react';
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import Header from './components/Header';
import ImageUploader from './components/ImageUploader';
import Loader from './components/Loader';
import CommentSection from './components/CommentSection';

// Helper to convert File to a format suitable for the Gemini API
const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

// Helper to convert a data URL (base64) string to a File object
const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error("Invalid data URL");
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
}

// Helper to safely extract image URL from a Gemini response
const getImageUrlFromResponse = (response: GenerateContentResponse): string | null => {
    if (response.candidates && response.candidates.length > 0) {
        const firstCandidate = response.candidates[0];
        if (firstCandidate.content && firstCandidate.content.parts) {
            for (const part of firstCandidate.content.parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
    }
    return null;
};

type Step = 'CREATE_MONUMENT' | 'PLACE_IN_SCENE' | 'SHARE';

const App: React.FC = () => {
    const [apiKey, setApiKey] = useState<string>('');
    const [step, setStep] = useState<Step>('CREATE_MONUMENT');
    const [monumentSource, setMonumentSource] = useState<'prompt' | 'upload'>('prompt');
    const [monumentPrompt, setMonumentPrompt] = useState<string>('A majestic crystal obelisk monument, futuristic, glowing');
    const [monumentFile, setMonumentFile] = useState<File | null>(null);
    const [generatedMonument, setGeneratedMonument] = useState<string | null>(null);

    const [sceneSource, setSceneSource] = useState<'prompt' | 'upload'>('upload');
    const [scenePrompt, setScenePrompt] = useState<string>('A beautiful sunny park with green grass and trees, photorealistic.');
    const [sceneFile, setSceneFile] = useState<File | null>(null);
    const [editPrompt, setEditPrompt] = useState<string>('Add the monument to the center of the park, making it look natural');
    
    const [finalImage, setFinalImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [isGeneratingPrompt, setIsGeneratingPrompt] = useState<boolean>(false);
    const [isLinkCopied, setIsLinkCopied] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const isApiKeyMissing = !apiKey;

    const changeMonumentSource = (source: 'prompt' | 'upload') => {
        setGeneratedMonument(null); // Reset on tab switch
        setMonumentFile(null);      // Reset on tab switch
        setMonumentSource(source);
        setError(null);
        if (source === 'upload') {
            setMonumentPrompt('A grand, majestic monument made of polished bronze.');
        } else {
            setMonumentPrompt('A majestic crystal obelisk monument, futuristic, glowing');
        }
    };

    const changeSceneSource = (source: 'prompt' | 'upload') => {
        setSceneFile(null); // Reset file on tab switch
        setError(null);
        setSceneSource(source);
        if (source === 'prompt') {
            setEditPrompt('Place the monument in the generated scene, ensuring it looks natural and well-integrated.');
        } else {
            setEditPrompt('Place the monument in the center of the scene, making it look natural');
        }
    };

    const handleGenerateMonument = useCallback(async () => {
        if (!apiKey) {
             setError("API key is not configured. Please enter it above.");
             return;
        }
        if (!monumentPrompt) {
            setError('Please enter a prompt for the monument.');
            return;
        }
        setIsLoading(true);
        setLoadingMessage('Generating your monument...');
        setError(null);
        try {
            const ai = new GoogleGenAI({ apiKey });

            const fullPrompt = `Create a photorealistic 3D render of a monument based on the following description: "${monumentPrompt}".

Key requirements:
1.  **Object:** The monument should be a high-quality, solid, three-dimensional object.
2.  **Base:** It MUST be placed on a simple, elegant plinth or base that complements its design.
3.  **Appearance:** The monument should look new and unweathered, with realistic textures and materials.
4.  **Lighting:** Use studio lighting to give it a sense of depth and form.
5.  **Background:** The final image must ONLY contain the monument and its base on a plain, neutral, single-color background (e.g., light grey), with no scenery. This is for later compositing.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: fullPrompt }] },
                config: { responseModalities: [Modality.IMAGE] },
            });
            
            const imageUrl = getImageUrlFromResponse(response);

            if (imageUrl) {
                setGeneratedMonument(imageUrl);
            } else {
                throw new Error("No image was generated.");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [monumentPrompt, apiKey]);

    const handleGenerateMonumentFromImage = useCallback(async () => {
        if (!apiKey) {
             setError("API key is not configured. Please enter it above.");
             return;
        }
        if (!monumentFile) {
            setError('Please upload an image to generate a monument from.');
            return;
        }
        if (!monumentPrompt) {
            setError('Please enter a prompt to guide the monument generation.');
            return;
        }

        setIsLoading(true);
        setLoadingMessage('Creating your monument from the image...');
        setError(null);

        try {
            const ai = new GoogleGenAI({ apiKey });
            const imagePart = await fileToGenerativePart(monumentFile);
            
            const fullPrompt = `Task: Create a photorealistic 3D render of a monument based on the main subject of the provided image.

Instructions:
1.  **Isolate Subject:** Identify and perfectly isolate the main subject from the input image. Discard the original background entirely.
2.  **Transform into a Monument:** Re-imagine and render the isolated subject as a high-quality, solid monument. The monument should be styled as: "${monumentPrompt}".
3.  **Add a Base:** Place the monument on a simple, elegant plinth or base that complements its design (e.g., a square marble block, a cylindrical stone pedestal). The base is essential.
4.  **Material and Texture:** The monument's surface should have realistic textures and lighting appropriate for the specified material. It should look like a solid, three-dimensional object, not a re-colored photo. It should look new and unweathered.
5.  **Lighting:** Use dramatic studio lighting to highlight the monument's form and texture, creating realistic highlights and soft shadows on the object itself.
6.  **Final Output:** The final image must ONLY contain the monument and its base on a plain, neutral, single-color background (like light grey). There should be no background scenery. This output is for later compositing.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        imagePart,
                        { text: fullPrompt },
                    ],
                },
                config: { responseModalities: [Modality.IMAGE] },
            });

            const imageUrl = getImageUrlFromResponse(response);

            if (imageUrl) {
                setGeneratedMonument(imageUrl);
            } else {
                throw new Error("No image was generated from the provided image.");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [monumentFile, monumentPrompt, apiKey]);

    const handleSceneUpload = async (file: File) => {
        setSceneFile(file);
         if (!apiKey) {
             setError("API key is not configured. Please enter it above.");
             return;
        }
        setIsGeneratingPrompt(true);
        setEditPrompt('Generating scene description...');
        try {
            const ai = new GoogleGenAI({ apiKey });
            const imagePart = await fileToGenerativePart(file);
            const prompt = "Briefly describe this image for an AI photo editing prompt. Focus on the main environment. For example: 'a sandy beach at sunset' or 'a snowy mountain range'.";
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [imagePart, { text: prompt }] },
            });
            
            const description = response.text.trim();
            setEditPrompt(`Add the monument to ${description}, making it look natural`);

        } catch (err) {
            console.error("Failed to generate scene description:", err);
            setError("Could not generate a description for the scene. Please write one manually.");
            setEditPrompt('Add the monument to the scene, making it look natural');
        } finally {
            setIsGeneratingPrompt(false);
        }
    };

    const handlePlaceMonument = useCallback(async () => {
        if (!apiKey) {
             setError("API key is not configured. Please enter it above.");
             return;
        }
        if (!generatedMonument) {
            setError('No monument has been created.');
            return;
        }
        if (sceneSource === 'upload' && !sceneFile) {
            setError('Please upload a scene image.');
            return;
        }
        if (sceneSource === 'prompt' && !scenePrompt) {
            setError('Please enter a prompt for the scene.');
            return;
        }
        if (!editPrompt) {
            setError('Please provide editing instructions.');
            return;
        }
        
        setIsLoading(true);
        setError(null);
        
        try {
            const ai = new GoogleGenAI({ apiKey });
            let sceneToUseFile: File;

            if (sceneSource === 'prompt') {
                setLoadingMessage('Generating scene from prompt...');
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: [{ text: scenePrompt }] },
                    config: { responseModalities: [Modality.IMAGE] },
                });

                const sceneImageUrl = getImageUrlFromResponse(response);

                if (!sceneImageUrl) {
                    throw new Error("Failed to generate a scene from the prompt.");
                }

                sceneToUseFile = dataURLtoFile(sceneImageUrl, 'scene.png');
            } else {
                // sceneFile is guaranteed to be non-null by the initial checks
                sceneToUseFile = sceneFile!;
            }

            setLoadingMessage('Placing monument in scene...');
            
            const monumentFile = dataURLtoFile(generatedMonument, 'monument.png');
            const sceneImagePart = await fileToGenerativePart(sceneToUseFile);
            const monumentImagePart = await fileToGenerativePart(monumentFile);

            const finalEditPrompt = `Task: Photorealistically integrate the monument from the second image into the scene from the first image.

Instructions:
1.  **Scene Analysis:** Analyze the first image (the scene) to understand its lighting, perspective, and overall style.
2.  **Object Integration:** Use the second image as a reference for the monument.
3.  **Placement:** Follow this instruction for placement: "${editPrompt}".
4.  **Realism:**
    *   **Scale & Perspective:** Adjust the monument's size and perspective to fit realistically within the scene. It should look like it belongs there, not like a sticker.
    *   **Lighting & Shadows:** The monument must be lit according to the scene's light sources. It must cast realistic shadows on the ground and surrounding objects that match the direction and softness of existing shadows in the scene.
    *   **Color & Style:** The monument's colors and textures should be integrated with the scene's color grading and atmosphere.
5.  **Output:** The final image must preserve the original framing and aspect ratio of the scene without any cropping. The integration should be seamless.`;

            const finalResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        sceneImagePart,
                        monumentImagePart,
                        { text: finalEditPrompt },
                    ],
                },
                config: { responseModalities: [Modality.IMAGE] },
            });

            const finalImageUrl = getImageUrlFromResponse(finalResponse);

            if (finalImageUrl) {
                setFinalImage(finalImageUrl);
            } else {
                throw new Error("Image editing failed.");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [generatedMonument, sceneFile, sceneSource, scenePrompt, editPrompt, apiKey]);
    
    const reset = () => {
        setStep('CREATE_MONUMENT');
        setMonumentSource('prompt');
        setMonumentPrompt('A majestic crystal obelisk monument, futuristic, glowing');
        setMonumentFile(null);
        setGeneratedMonument(null);
        setSceneFile(null);
        setSceneSource('upload');
        setScenePrompt('A beautiful sunny park with green grass and trees, photorealistic.');
        setEditPrompt('Add the monument to the center of the park, making it look natural');
        setFinalImage(null);
        setError(null);
    };

    const renderStep = () => {
        switch (step) {
            case 'CREATE_MONUMENT':
                return (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-center text-slate-200">Step 1: Create Your Monument</h2>
                        {!generatedMonument && (
                            <div className="flex justify-center bg-slate-800 p-1 rounded-lg max-w-sm mx-auto">
                                <button onClick={() => changeMonumentSource('prompt')} className={`w-1/2 py-2 rounded-md transition-colors ${monumentSource === 'prompt' ? 'bg-cyan-500 text-white' : 'hover:bg-slate-700'}`}>From Prompt</button>
                                <button onClick={() => changeMonumentSource('upload')} className={`w-1/2 py-2 rounded-md transition-colors ${monumentSource === 'upload' ? 'bg-cyan-500 text-white' : 'hover:bg-slate-700'}`}>Upload Image</button>
                            </div>
                        )}
                        
                        {monumentSource === 'prompt' && (
                            generatedMonument ? (
                                <div className="space-y-4 animate-fade-in">
                                    <h3 className="font-semibold text-slate-400 text-center">Your Generated Monument</h3>
                                    <img src={generatedMonument} alt="Generated Monument" className="rounded-lg w-full max-w-md mx-auto object-contain bg-slate-800" />
                                    <textarea
                                        value={monumentPrompt}
                                        onChange={(e) => setMonumentPrompt(e.target.value)}
                                        placeholder="e.g., A giant statue of a cat playing a banjo"
                                        className="w-full h-24 bg-slate-800 border border-slate-700 rounded-md p-3 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                                    />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button disabled={isApiKeyMissing} onClick={handleGenerateMonument} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-md transition-colors text-lg disabled:bg-slate-600 disabled:cursor-not-allowed">
                                            Re-generate
                                        </button>
                                        <button onClick={() => setStep('PLACE_IN_SCENE')} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-md transition-colors text-lg">
                                            Looks Good, Continue
                                        </button>
                                    </div>
                                    <div className="text-center pt-2">
                                        <button onClick={() => { setGeneratedMonument(null); changeMonumentSource('prompt'); }} className="text-sm text-slate-400 hover:text-white transition">
                                            Start Over
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <textarea
                                        value={monumentPrompt}
                                        onChange={(e) => setMonumentPrompt(e.target.value)}
                                        placeholder="e.g., A giant statue of a cat playing a banjo"
                                        className="w-full h-24 bg-slate-800 border border-slate-700 rounded-md p-3 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                                    />
                                    <button disabled={isApiKeyMissing} onClick={handleGenerateMonument} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-md transition-colors text-lg disabled:bg-slate-600 disabled:cursor-not-allowed">
                                        Generate Monument
                                    </button>
                                </div>
                            )
                        )}

                        {monumentSource === 'upload' && (
                             generatedMonument && monumentFile ? (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                        <div>
                                            <h3 className="font-semibold text-slate-400 text-center mb-2">Original</h3>
                                            <img src={URL.createObjectURL(monumentFile)} alt="Original Upload" className="rounded-lg w-full object-contain bg-slate-800 max-h-64" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-400 text-center mb-2">Generated Monument</h3>
                                            <img src={generatedMonument} alt="Generated Monument" className="rounded-lg w-full object-contain bg-slate-800 max-h-64" />
                                        </div>
                                    </div>
                                     <textarea
                                        value={monumentPrompt}
                                        onChange={(e) => setMonumentPrompt(e.target.value)}
                                        placeholder="e.g., A giant marble statue"
                                        className="w-full h-24 bg-slate-800 border border-slate-700 rounded-md p-3 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                                    />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button disabled={isApiKeyMissing} onClick={handleGenerateMonumentFromImage} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-md transition-colors text-lg disabled:bg-slate-600 disabled:cursor-not-allowed">
                                            Re-generate
                                        </button>
                                        <button onClick={() => setStep('PLACE_IN_SCENE')} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-md transition-colors text-lg">
                                            Looks Good, Continue
                                        </button>
                                    </div>
                                    <div className="text-center pt-2">
                                        <button onClick={() => { setGeneratedMonument(null); setMonumentFile(null); }} className="text-sm text-slate-400 hover:text-white transition">
                                            Start Over with a new image
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <ImageUploader 
                                        onImageUpload={setMonumentFile} 
                                        label="Upload an image of an object or person" 
                                        id="monument-upload" 
                                    />
                                    <textarea
                                        value={monumentPrompt}
                                        onChange={(e) => setMonumentPrompt(e.target.value)}
                                        placeholder="e.g., A giant marble statue"
                                        className="w-full h-24 bg-slate-800 border border-slate-700 rounded-md p-3 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                                    />
                                    <button 
                                        disabled={!monumentFile || isApiKeyMissing} 
                                        onClick={handleGenerateMonumentFromImage} 
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-md transition-colors text-lg disabled:bg-slate-600 disabled:cursor-not-allowed"
                                    >
                                        Generate Monument from Image
                                    </button>
                                </div>
                            )
                        )}
                    </div>
                );
            case 'PLACE_IN_SCENE':
                return (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-center text-slate-200">Step 2: Place in Scene</h2>
                        {finalImage ? (
                            <div className="space-y-4 animate-fade-in">
                                <h3 className="font-semibold text-slate-400 text-center">Your Final Image</h3>
                                <img src={finalImage} alt="Final composition" className="rounded-lg w-full max-w-xl mx-auto object-contain bg-slate-800" />
                                <textarea
                                    value={editPrompt}
                                    onChange={(e) => setEditPrompt(e.target.value)}
                                    placeholder="e.g., Make it smaller and place it on the right"
                                    className="w-full h-24 bg-slate-800 border border-slate-700 rounded-md p-3 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <button disabled={isApiKeyMissing} onClick={handlePlaceMonument} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-md transition-colors text-lg disabled:bg-slate-600 disabled:cursor-not-allowed">
                                        Re-generate
                                    </button>
                                    <button onClick={() => setStep('SHARE')} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-md transition-colors text-lg">
                                        Looks Good, Continue
                                    </button>
                                </div>
                                <div className="text-center pt-2">
                                    <button onClick={() => setFinalImage(null)} className="text-sm text-slate-400 hover:text-white transition">
                                        Change Scene
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="grid md:grid-cols-2 gap-6 items-start">
                                   <div className="space-y-2">
                                        <h3 className="font-semibold text-slate-400">Your Monument:</h3>
                                        {generatedMonument && <img src={generatedMonument} alt="Monument" className="rounded-lg w-full object-contain max-h-64 bg-slate-800" />}
                                   </div>
                                   <div className="space-y-4">
                                        <div className="flex justify-center bg-slate-800 p-1 rounded-lg">
                                            <button onClick={() => changeSceneSource('upload')} className={`w-1/2 py-2 rounded-md transition-colors ${sceneSource === 'upload' ? 'bg-cyan-500 text-white' : 'hover:bg-slate-700'}`}>Upload Scene</button>
                                            <button onClick={() => changeSceneSource('prompt')} className={`w-1/2 py-2 rounded-md transition-colors ${sceneSource === 'prompt' ? 'bg-cyan-500 text-white' : 'hover:bg-slate-700'}`}>From Prompt</button>
                                        </div>
                                        
                                        {sceneSource === 'upload' ? (
                                            <ImageUploader onImageUpload={handleSceneUpload} label="Upload a scene image" id="scene-upload"/>
                                        ) : (
                                            <textarea
                                                value={scenePrompt}
                                                onChange={(e) => setScenePrompt(e.target.value)}
                                                placeholder="e.g., A futuristic city skyline at night"
                                                className="w-full h-24 bg-slate-800 border border-slate-700 rounded-md p-3 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                                            />
                                        )}
                                        
                                        <textarea
                                            value={editPrompt}
                                            onChange={(e) => setEditPrompt(e.target.value)}
                                            placeholder="Instructions for placing the monument..."
                                            className="w-full h-24 bg-slate-800 border border-slate-700 rounded-md p-3 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition disabled:opacity-50"
                                            disabled={sceneSource === 'upload' && isGeneratingPrompt}
                                        />
                                   </div>
                                </div>
                                <button 
                                    disabled={!editPrompt || (sceneSource === 'upload' && (!sceneFile || isGeneratingPrompt)) || (sceneSource === 'prompt' && !scenePrompt) || isApiKeyMissing} 
                                    onClick={handlePlaceMonument} 
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-md transition-colors text-lg disabled:bg-slate-600 disabled:cursor-not-allowed"
                                >
                                     {isGeneratingPrompt ? 'Analyzing Scene...' : 'Create Final Image'}
                                </button>
                            </>
                        )}
                    </div>
                );
            case 'SHARE':
                const appUrl = window.location.href;
                const shareText = "Check out the monument I created with Monument Mixer AI! #MonumentMixer #AIArt";

                const handleDownload = () => {
                    if (!finalImage) return;
                    const link = document.createElement('a');
                    link.href = finalImage;
                    link.download = 'monument-masterpiece.png';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                };

                const handleCopyLink = () => {
                    if (!finalImage) return;
                    navigator.clipboard.writeText(finalImage).then(() => {
                        setIsLinkCopied(true);
                        setTimeout(() => setIsLinkCopied(false), 2500);
                    }).catch(err => {
                        console.error("Failed to copy image link", err);
                        alert("Could not copy image link. Please try downloading instead.");
                    });
                };

                const handleInstagramShare = () => {
                    alert("To share on Instagram, please download the image first, then upload it from your device.");
                };

                return (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-center text-slate-200">Your Masterpiece is Ready!</h2>
                        {finalImage && <img src={finalImage} alt="Final creation" className="rounded-lg w-full max-w-2xl mx-auto shadow-2xl shadow-cyan-500/10" />}
                        
                        <div className="border-t border-slate-700 pt-6 space-y-4">
                            <h3 className="text-lg font-semibold text-center text-slate-300">Share Your Creation</h3>
                            <div className="flex flex-wrap justify-center gap-3">
                                <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(appUrl)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                                    <span>Twitter</span>
                                </a>
                                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(appUrl)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                                     <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4z"></path></svg>
                                    <span>Facebook</span>
                                </a>
                                 <a href={`https://www.reddit.com/submit?url=${encodeURIComponent(appUrl)}&title=${encodeURIComponent("My AI Creation from Monument Mixer")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.5,11.85a1.2,1.2,0,0,0-1.12-1,1.17,1.17,0,0,0-.3.05,6.3,6.3,0,0,0-5-3.21,1.19,1.19,0,0,0-1,.08,1.2,1.2,0,0,0-.73,1.06v.2a12.89,12.89,0,0,0-4.64,0v-.2a1.2,1.2,0,0,0-.73-1.06,1.18,1.18,0,0,0-1-.08,6.3,6.3,0,0,0-5,3.21,1.19,1.19,0,0,0-.3-.05,1.2,1.2,0,0,0-1.12,1,1.18,1.18,0,0,0,.6,1,10.19,10.19,0,0,0,0,4.68,1.18,1.18,0,0,0-.6,1,1.2,1.2,0,0,0,1.12,1,1.17,1.17,0,0,0,.3-.05,6.3,6.3,0,0,0,5,3.21,1.19,1.19,0,0,0,1-.08,1.2,1.2,0,0,0,.73-1.06v-.2a12.89,12.89,0,0,0,4.64,0v.2a1.2,1.2,0,0,0,.73,1.06,1.18,1.18,0,0,0,1,.08,6.3,6.3,0,0,0,5-3.21,1.19,1.19,0,0,0,.3.05,1.2,1.2,0,0,0,1.12-1,1.18,1.18,0,0,0-.6-1,10.19,10.19,0,0,0,0-4.68A1.18,1.18,0,0,0,22.5,11.85ZM8.73,15.1a1.68,1.68,0,0,1-2.13,0,1.19,1.19,0,0,1,0-1.72,1.68,1.68,0,0,1,2.13,0,1.19,1.19,0,0,1,0,1.72Zm6.53,0a1.68,1.68,0,0,1-2.13,0,1.19,1.19,0,0,1,0-1.72,1.68,1.68,0,0,1,2.13,0,1.19,1.19,0,0,1,0,1.72Zm17,9.11a3,3,0,0,1-4.83,1.08,1.2,1.2,0,0,1-1.33,0A3,3,0,0,1,7,9.11a1.2,1.2,0,0,1,2.06-.71,1.22,1.22,0,0,1,.29.89,1.53,1.53,0,0,0,3.06,0,1.22,1.22,0,0,1,.29-.89A1.2,1.2,0,0,1,17,9.11Z"/></svg>
                                    <span>Reddit</span>
                                </a>
                                <button onClick={handleInstagramShare} className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.011 3.584-.069 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.85-.07c-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.85s.012-3.584.07-4.85c.149-3.227 1.664-4.771 4.919-4.919C8.416 2.175 8.796 2.163 12 2.163m0-1.623C8.74 0 8.333.011 7.053.072 2.695.272.273 2.69.073 7.052.012 8.333 0 8.74 0 12s.012 3.667.072 4.947c.2 4.358 2.618 6.78 6.98 6.98C8.333 23.988 8.74 24 12 24s3.667-.012 4.947-.072c4.358-.2 6.78-2.618 6.98-6.98C23.988 15.667 24 15.26 24 12s-.012-3.667-.072-4.947c-.2-4.358-2.618-6.78-6.98-6.98C15.667.012 15.26 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.88 1.44 1.44 0 000-2.88z"></path></svg>
                                    <span>Instagram</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-center gap-4 pt-4">
                            <button onClick={handleDownload} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-md transition-colors text-lg">
                                Download
                            </button>
                             <button onClick={handleCopyLink} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-md transition-colors text-lg">
                                {isLinkCopied ? 'Copied!' : 'Copy Image Link'}
                            </button>
                        </div>
                        <div className="text-center pt-2">
                            <button onClick={reset} className="text-sm text-slate-400 hover:text-white transition">
                                ✨ Create Another Masterpiece
                            </button>
                        </div>
                        <CommentSection />
                    </div>
                );
        }
    };
    
    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col">
            <Header />
            <main className="flex-grow container mx-auto p-4 sm:p-8 flex items-center justify-center">
                <div className="w-full max-w-2xl bg-slate-800/50 rounded-2xl shadow-2xl shadow-cyan-500/10 p-6 sm:p-8 border border-slate-700">
                    {isLoading && <Loader message={loadingMessage} />}
                    
                    <div className="space-y-4 mb-6">
                         <label htmlFor="api-key-input" className="block text-sm font-medium text-slate-400">
                           Google AI API Key
                        </label>
                        <input
                            id="api-key-input"
                            type="password"
                            value={apiKey}
                            onChange={(e) => {
                                setApiKey(e.target.value);
                                setError(null); // Clear errors when user types
                            }}
                            placeholder="Enter your API key here"
                            className="w-full bg-slate-900 border border-slate-700 rounded-md p-3 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                        />
                         {isApiKeyMissing && !error && (
                            <p className="text-xs text-slate-500">
                                Your API key is stored only in your browser and is required to use the app.
                            </p>
                        )}
                    </div>
                    
                    {error && <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-md mb-4">{error}</div>}

                    <div className="border-t border-slate-700 pt-6">
                        {renderStep()}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;