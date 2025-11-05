import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import ImageUploader from './components/ImageUploader';
import Loader from './components/Loader';
import CommentSection from './components/CommentSection';

// Helper to convert File to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

type Step = 'CREATE_MONUMENT' | 'PLACE_IN_SCENE' | 'SHARE';

const App: React.FC = () => {
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
    
    const handleError = (err: unknown) => {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        if (errorMessage.includes("quota")){
            setError("You've exceeded your API quota. Please check your billing details or redeploy with a new key.");
        } else {
            setError(errorMessage);
        }
        console.error(err);
    }

    // Generic function to call our secure backend
    const callGenerateApi = async (body: object): Promise<any> => {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Request failed with status ${response.status}`);
        }

        return response.json();
    };

    const changeMonumentSource = (source: 'prompt' | 'upload') => {
        setGeneratedMonument(null);
        setMonumentFile(null);
        setMonumentSource(source);
        setError(null);
        if (source === 'upload') {
            setMonumentPrompt('A grand, majestic monument made of polished bronze.');
        } else {
            setMonumentPrompt('A majestic crystal obelisk monument, futuristic, glowing');
        }
    };

    const changeSceneSource = (source: 'prompt' | 'upload') => {
        setSceneFile(null);
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
            const { imageUrl } = await callGenerateApi({
                type: 'generateMonumentFromPrompt',
                prompt: monumentPrompt,
            });

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
    }, [monumentPrompt]);

    const handleGenerateMonumentFromImage = useCallback(async () => {
        if (!monumentFile || !monumentPrompt) {
            setError('Please upload an image and provide a style prompt.');
            return;
        }

        setIsLoading(true);
        setLoadingMessage('Creating your monument from the image...');
        setError(null);

        try {
            const imageBase64 = await fileToBase64(monumentFile);
            const { imageUrl } = await callGenerateApi({
                type: 'generateMonumentFromImage',
                prompt: monumentPrompt,
                image: {
                    data: imageBase64,
                    mimeType: monumentFile.type,
                },
            });

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
    }, [monumentFile, monumentPrompt]);

    const handleSceneUpload = useCallback(async (file: File) => {
        setSceneFile(file);
        setIsGeneratingPrompt(true);
        setEditPrompt('Generating scene description...');
        setError(null);
        try {
            const imageBase64 = await fileToBase64(file);
            const { description } = await callGenerateApi({
                type: 'describeScene',
                image: {
                    data: imageBase64,
                    mimeType: file.type,
                },
            });
            
            setEditPrompt(`Add the monument to ${description}, making it look natural`);

        } catch (err) {
            console.error("Failed to generate scene description:", err);
            handleError(err);
            setEditPrompt('Add the monument to the scene, making it look natural');
        } finally {
            setIsGeneratingPrompt(false);
        }
    }, []);

    const handlePlaceMonument = useCallback(async () => {
        if (!generatedMonument) {
            setError('No monument has been created.');
            return;
        }
        if ((sceneSource === 'upload' && !sceneFile) || (sceneSource === 'prompt' && !scenePrompt) || !editPrompt) {
             setError('Please provide all required inputs for the scene.');
            return;
        }
        
        setIsLoading(true);
        setError(null);
        
        try {
            const monumentBase64 = generatedMonument.split(',')[1];
            let sceneDataBase64;
            let sceneMimeType;

            if (sceneSource === 'upload' && sceneFile) {
                setLoadingMessage('Placing monument in your scene...');
                sceneDataBase64 = await fileToBase64(sceneFile);
                sceneMimeType = sceneFile.type;
            } else { // sceneSource === 'prompt'
                setLoadingMessage('Generating scene and placing monument...');
            }

            const { finalImageUrl } = await callGenerateApi({
                type: 'placeMonument',
                sceneSource,
                scenePrompt: sceneSource === 'prompt' ? scenePrompt : undefined,
                sceneImage: sceneSource === 'upload' ? { data: sceneDataBase64, mimeType: sceneMimeType } : undefined,
                monumentImage: { data: monumentBase64, mimeType: 'image/png' },
                editPrompt,
            });
            

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
    }, [generatedMonument, sceneFile, sceneSource, scenePrompt, editPrompt]);
    
    // Main Application
    return (
        <>
            {isLoading && <Loader message={loadingMessage} />}
            <Header />
            <main className="container mx-auto p-4 sm:p-8">
                {error && (
                    <div className="max-w-4xl mx-auto bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg mb-6 text-center">
                        <p>{error}</p>
                    </div>
                 )}
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
