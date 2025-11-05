import React, { useState, useCallback, useEffect } from 'react';
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
    const [apiKeyConfirmed, setApiKeyConfirmed] = useState<boolean>(false);
    
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
    
    const getGenAI = useCallback(() => {
        if (!apiKeyConfirmed || !apiKey) {
            setApiKeyConfirmed(false);
            throw new Error("API Key not provided. Please enter your API key to continue.");
        }
        return new GoogleGenAI({ apiKey });
    }, [apiKey, apiKeyConfirmed]);

    const handleError = (err: unknown) => {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        // If the error is about an invalid key, force the user back to the selection screen.
        if (errorMessage.includes("API key not valid") || errorMessage.includes("API key is invalid") || errorMessage.includes("permission denied")) {
            setError("Your API key appears to be invalid. Please enter a valid key to continue.");
            setApiKeyConfirmed(false);
        } else if (errorMessage.includes("quota")){
            setError("You've exceeded your API quota. Please check your billing details or use a different key.");
        } else {
            setError(errorMessage);
        }
        console.error(err);
    }

    const handleApiKeySubmit = () => {
        if (apiKey.trim()) {
            setApiKeyConfirmed(true);
            setError(null);
        } else {
            setError("Please enter a valid API key.");
        }
    };

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
        if (!monumentPrompt) {
            setError('Please enter a prompt for the monument.');
            return;
        }
        setIsLoading(true);
        setLoadingMessage('Generating your monument...');
        setError(null);
        try {
            const ai = getGenAI();

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
            handleError(err);
        } finally {
            setIsLoading(false);
        }
    }, [monumentPrompt, getGenAI]);

    const handleGenerateMonumentFromImage = useCallback(async () => {
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
            const ai = getGenAI();
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
            handleError(err);
        } finally {
            setIsLoading(false);
        }
    }, [monumentFile, monumentPrompt, getGenAI]);

    const handleSceneUpload = useCallback(async (file: File) => {
        setSceneFile(file);
        setIsGeneratingPrompt(true);
        setEditPrompt('Generating scene description...');
        setError(null);
        try {
            const ai = getGenAI();
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
            handleError(err);
            setEditPrompt('Add the monument to the scene, making it look natural');
        } finally {
            setIsGeneratingPrompt(false);
        }
    }, [getGenAI]);

    const handlePlaceMonument = useCallback(async () => {
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
            const ai = getGenAI();
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
5.  **Output:** The final image must preserve the quality and dimensions of the original scene.`;

            const response = await ai.models.generateContent({
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

            const finalImageUrl = getImageUrlFromResponse(response);

            if (finalImageUrl) {
                setFinalImage(finalImageUrl);
                setStep('SHARE');
            } else {
                throw new Error("Failed to generate the final image.");
            }

        } catch (err) {
            handleError(err);
        } finally {
            setIsLoading(false);
        }
    }, [getGenAI, generatedMonument, sceneFile, sceneSource, scenePrompt, editPrompt]);
    
    // API Key entry screen
    if (!apiKeyConfirmed) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-4">
                <div className="w-full max-w-md bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">
                    <div className="flex items-center gap-3 mb-6">
                        <svg className="w-8 h-8 text-cyan-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 21 8-8 1.5 1.5 8-8"/><path d="M7 3h14v14"/><path d="m22 2-2.5 2.5"/><path d="m19 5-2.5 2.5"/><path d="m16 8-2.5 2.5"/></svg>
                        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">Monument Mixer AI</h1>
                    </div>
                    <h2 className="text-lg font-semibold text-slate-200 mb-2">Enter Your API Key</h2>
                    <p className="text-slate-400 text-sm mb-6">
                        To use this application, you need a Google AI API key. Your key is only used for this session and is not stored.
                    </p>
                    <div className="flex flex-col gap-4">
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter your Google AI API Key"
                            className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 px-4 text-slate-300 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                            onKeyDown={(e) => e.key === 'Enter' && handleApiKeySubmit()}
                        />
                        <button
                            onClick={handleApiKeySubmit}
                            className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!apiKey.trim()}
                        >
                            Continue
                        </button>
                    </div>
                    {error && <p className="text-red-400 text-sm mt-4 text-center">{error}</p>}
                </div>
            </div>
        );
    }
    
    // Main Application
    return (
        <>
            {isLoading && <Loader message={loadingMessage} />}
            <Header />
            <main className="container mx-auto p-4 sm:p-8">
                {/* Step 1: Create Monument */}
                {step === 'CREATE_MONUMENT' && (
                    <section>
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold text-slate-100">Step 1: Create Your Monument</h2>
                            <p className="text-slate-400 mt-2">Design a unique monument either from your imagination or an existing image.</p>
                        </div>

                        <div className="max-w-4xl mx-auto bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-lg border border-slate-700">
                            <div className="flex border-b border-slate-700 mb-6">
                                <button onClick={() => changeMonumentSource('prompt')} className={`py-2 px-4 font-semibold transition-colors ${monumentSource === 'prompt' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-white'}`}>
                                    From Prompt
                                </button>
                                <button onClick={() => changeMonumentSource('upload')} className={`py-2 px-4 font-semibold transition-colors ${monumentSource === 'upload' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-white'}`}>
                                    From Image
                                </button>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8 items-start">
                                <div>
                                    {monumentSource === 'prompt' ? (
                                        <div className="space-y-4">
                                            <label htmlFor="monumentPrompt" className="block font-semibold text-slate-300">Describe your monument:</label>
                                            <textarea
                                                id="monumentPrompt"
                                                value={monumentPrompt}
                                                onChange={(e) => setMonumentPrompt(e.target.value)}
                                                rows={4}
                                                placeholder="e.g., A majestic crystal obelisk monument, futuristic, glowing"
                                                className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 px-4 text-slate-300 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                                            />
                                            <button onClick={handleGenerateMonument} className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2.5 px-4 rounded-md transition-colors disabled:opacity-50" disabled={isLoading || !monumentPrompt}>
                                                Generate Monument
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <ImageUploader id="monument-uploader" label="Upload an image" onImageUpload={setMonumentFile} />
                                             <label htmlFor="monumentStylePrompt" className="block font-semibold text-slate-300 pt-2">Describe the monument's style:</label>
                                             <textarea
                                                id="monumentStylePrompt"
                                                value={monumentPrompt}
                                                onChange={(e) => setMonumentPrompt(e.target.value)}
                                                rows={3}
                                                placeholder="e.g., A grand, majestic monument made of polished bronze."
                                                className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 px-4 text-slate-300 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                                            />
                                            <button onClick={handleGenerateMonumentFromImage} className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2.5 px-4 rounded-md transition-colors disabled:opacity-50" disabled={isLoading || !monumentFile || !monumentPrompt}>
                                                Generate from Image
                                            </button>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex flex-col items-center justify-center bg-slate-900/50 rounded-lg p-4 h-full min-h-[200px]">
                                    {generatedMonument ? (
                                        <img src={generatedMonument} alt="Generated Monument" className="max-w-full max-h-80 rounded-md object-contain" />
                                    ) : (
                                        <div className="text-center text-slate-500">
                                            <svg className="w-16 h-16 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m2 21 8-8 1.5 1.5 8-8"/><path d="M7 3h14v14"/><path d="m22 2-2.5 2.5"/><path d="m19 5-2.5 2.5"/><path d="m16 8-2.5 2.5"/></svg>
                                            <p className="mt-2">Your monument will appear here.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {error && <p className="text-red-400 text-sm mt-4 text-center">{error}</p>}
                            
                            <div className="mt-8 text-center">
                                <button
                                    onClick={() => setStep('PLACE_IN_SCENE')}
                                    disabled={!generatedMonument || isLoading}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                                >
                                    Next: Place in Scene &rarr;
                                </button>
                            </div>
                        </div>
                    </section>
                )}
                {/* Step 2: Place in Scene */}
                {step === 'PLACE_IN_SCENE' && (
                    <section>
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold text-slate-100">Step 2: Place in a Scene</h2>
                            <p className="text-slate-400 mt-2">Put your monument into a new environment, either from a prompt or an uploaded image.</p>
                        </div>

                        <div className="grid lg:grid-cols-3 gap-8 items-start">
                            <div className="lg:col-span-1 space-y-4">
                                <h3 className="text-lg font-semibold text-slate-200">Your Monument</h3>
                                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                                    <img src={generatedMonument!} alt="Your Monument" className="w-full rounded-md object-contain" />
                                </div>
                                 <button onClick={() => setStep('CREATE_MONUMENT')} className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">&larr; Back to Monument Creation</button>
                            </div>

                            <div className="lg:col-span-2 bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-lg border border-slate-700">
                                 <div className="flex border-b border-slate-700 mb-6">
                                    <button onClick={() => changeSceneSource('upload')} className={`py-2 px-4 font-semibold transition-colors ${sceneSource === 'upload' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-white'}`}>
                                        Upload Scene
                                    </button>
                                    <button onClick={() => changeSceneSource('prompt')} className={`py-2 px-4 font-semibold transition-colors ${sceneSource === 'prompt' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-white'}`}>
                                        Generate Scene
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {sceneSource === 'upload' ? (
                                        <div>
                                            <label className="block font-semibold text-slate-300 mb-2">Upload your scene:</label>
                                            <ImageUploader id="scene-uploader" label="Upload a background image" onImageUpload={handleSceneUpload} />
                                        </div>
                                    ) : (
                                        <div>
                                            <label htmlFor="scenePrompt" className="block font-semibold text-slate-300 mb-2">Describe the scene to generate:</label>
                                            <textarea
                                                id="scenePrompt"
                                                value={scenePrompt}
                                                onChange={(e) => setScenePrompt(e.target.value)}
                                                rows={3}
                                                placeholder="e.g., A beautiful sunny park with green grass and trees, photorealistic."
                                                className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 px-4 text-slate-300 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label htmlFor="editPrompt" className="block font-semibold text-slate-300 mb-2">Placement Instructions:</label>
                                         <textarea
                                            id="editPrompt"
                                            value={editPrompt}
                                            onChange={(e) => setEditPrompt(e.target.value)}
                                            rows={3}
                                            placeholder="e.g., Place the monument in the center of the scene, making it look natural"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 px-4 text-slate-300 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                                            disabled={isGeneratingPrompt}
                                        />
                                    </div>
                                     {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}

                                     <button
                                        onClick={handlePlaceMonument}
                                        disabled={isLoading || isGeneratingPrompt || (sceneSource === 'upload' && !sceneFile) || (sceneSource === 'prompt' && !scenePrompt) || !editPrompt}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                                    >
                                        Place Monument & Create Final Image
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                )}
                {/* Step 3: Share */}
                {step === 'SHARE' && (
                    <section>
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold text-slate-100">Your Creation is Ready!</h2>
                            <p className="text-slate-400 mt-2">Download your masterpiece, share it with the world, and start a new creation.</p>
                        </div>

                        <div className="max-w-4xl mx-auto">
                            {finalImage && (
                                <div className="bg-slate-800 rounded-2xl p-4 sm:p-6 shadow-lg border border-slate-700">
                                    <img src={finalImage} alt="Final generated image" className="w-full rounded-lg" />
                                </div>
                            )}

                            <div className="mt-6 flex flex-wrap justify-center gap-4">
                                <a
                                    href={finalImage!}
                                    download="monument-creation.png"
                                    className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-6 rounded-md transition-colors inline-flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" /><path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" /></svg>
                                    Download
                                </a>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(window.location.href);
                                        setIsLinkCopied(true);
                                        setTimeout(() => setIsLinkCopied(false), 2000);
                                    }}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md transition-colors inline-flex items-center gap-2"
                                >
                                    {isLinkCopied ? (
                                        <>
                                        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.052-.143Z" clipRule="evenodd" /></svg>
                                        Copied!
                                        </>
                                    ) : (
                                        <>
                                        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M7.217 10.877a9.25 9.25 0 0 0-2.315-.316.75.75 0 0 0-.742.668 12.25 12.25 0 0 0-.44 2.223.75.75 0 0 0 .741.832 9.223 9.223 0 0 0 2.316.316.75.75 0 0 0 .742-.668 12.21 12.21 0 0 0 .44-2.223.75.75 0 0 0-.741-.832ZM12.783 9.123a.75.75 0 0 0-.742.668 12.21 12.21 0 0 0 .44 2.223.75.75 0 0 0 .741.832 9.223 9.223 0 0 0 2.316.316.75.75 0 0 0 .742-.668 12.25 12.25 0 0 0-.44-2.223.75.75 0 0 0-.741-.832 9.25 9.25 0 0 0-2.315-.316Z" /><path fillRule="evenodd" d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM8.283 6.033a.75.75 0 0 0-1.066-1.066L3.75 8.434a.75.75 0 0 0 0 1.06l3.467 3.467a.75.75 0 0 0 1.066-1.066L5.88 9.5h8.24a.75.75 0 0 0 0-1.5H5.88l2.403-2.404Z" clipRule="evenodd" /></svg>
                                        Share
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setStep('CREATE_MONUMENT');
                                        setGeneratedMonument(null);
                                        setFinalImage(null);
                                        setSceneFile(null);
                                        setError(null);
                                    }}
                                    className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-md transition-colors inline-flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201-4.42 5.5 5.5 0 0 1 10.89 2.01a.75.75 0 0 1-1.445.385a4 4 0 0 0-8.316-1.44a4 4 0 0 0 1.51 6.887a.75.75 0 0 1 .53 1.282A5.503 5.503 0 0 1 15.312 11.424ZM4.688 8.576a5.5 5.5 0 0 1 9.201 4.42a5.5 5.5 0 0 1-10.89-2.01a.75.75 0 0 1 1.445-.385a4 4 0 0 0 8.316 1.44a4 4 0 0 0-1.51-6.887a.75.75 0 0 1-.53-1.282A5.503 5.503 0 0 1 4.688 8.576Z" clipRule="evenodd" /></svg>
                                    Start Over
                                </button>
                            </div>

                            <CommentSection />
                        </div>
                    </section>
                )}
            </main>
        </>
    );
};

export default App;
