import { GoogleGenAI, Modality, GenerateContentResponse, Part } from "@google/genai";

// Helper to safely extract image data from a Gemini response
const getResponseImage = (response: GenerateContentResponse): { mimeType: string; data: string } | null => {
    if (response.candidates && response.candidates.length > 0) {
        const firstCandidate = response.candidates[0];
        if (firstCandidate.content && firstCandidate.content.parts) {
            for (const part of firstCandidate.content.parts) {
                if (part.inlineData) {
                    return {
                        mimeType: part.inlineData.mimeType,
                        data: part.inlineData.data,
                    };
                }
            }
        }
    }
    return null;
};

// Vercel Edge Functions have a limit of 1MB for the request body.
// This is a workaround to allow larger image uploads.
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
   maxDuration: 60,
};


export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const { type, ...body } = req.body;

        if (type === 'generateMonumentFromPrompt') {
            const { prompt } = body;
            const fullPrompt = `Create a photorealistic 3D render of a monument based on the following description: "${prompt}".

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
            
            const image = getResponseImage(response);
            if (image) {
                return res.status(200).json({ imageUrl: `data:${image.mimeType};base64,${image.data}` });
            } else {
                throw new Error("API did not return an image.");
            }
        }

        if (type === 'generateMonumentFromImage') {
            const { prompt, image } = body;
            const imagePart = { inlineData: { data: image.data, mimeType: image.mimeType } };
            const fullPrompt = `Task: Create a photorealistic 3D render of a monument based on the main subject of the provided image.

Instructions:
1.  **Isolate Subject:** Identify and perfectly isolate the main subject from the input image. Discard the original background entirely.
2.  **Transform into a Monument:** Re-imagine and render the isolated subject as a high-quality, solid monument. The monument should be styled as: "${prompt}".
3.  **Add a Base:** Place the monument on a simple, elegant plinth or base that complements its design (e.g., a square marble block, a cylindrical stone pedestal). The base is essential.
4.  **Material and Texture:** The monument's surface should have realistic textures and lighting appropriate for the specified material. It should look like a solid, three-dimensional object, not a re-colored photo. It should look new and unweathered.
5.  **Lighting:** Use dramatic studio lighting to highlight the monument's form and texture, creating realistic highlights and soft shadows on the object itself.
6.  **Final Output:** The final image must ONLY contain the monument and its base on a plain, neutral, single-color background (like light grey). There should be no background scenery. This output is for later compositing.`;

             const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [imagePart, { text: fullPrompt }] },
                config: { responseModalities: [Modality.IMAGE] },
            });

            const generatedImage = getResponseImage(response);
             if (generatedImage) {
                return res.status(200).json({ imageUrl: `data:${generatedImage.mimeType};base64,${generatedImage.data}` });
            } else {
                throw new Error("API did not return an image.");
            }
        }

        if (type === 'describeScene') {
            const { image } = body;
            const imagePart = { inlineData: { data: image.data, mimeType: image.mimeType } };
            const prompt = "Briefly describe this image for an AI photo editing prompt. Focus on the main environment. For example: 'a sandy beach at sunset' or 'a snowy mountain range'.";
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [imagePart, { text: prompt }] },
            });
            
            return res.status(200).json({ description: response.text.trim() });
        }

        if (type === 'placeMonument') {
             const { sceneSource, scenePrompt, sceneImage, monumentImage, editPrompt } = body;
             
             let sceneImagePart: Part;

             if (sceneSource === 'prompt') {
                 const sceneResponse = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: [{ text: scenePrompt }] },
                    config: { responseModalities: [Modality.IMAGE] },
                });
                const generatedSceneImage = getResponseImage(sceneResponse);
                if (!generatedSceneImage) throw new Error("Failed to generate a scene from prompt.");
                sceneImagePart = { inlineData: { data: generatedSceneImage.data, mimeType: generatedSceneImage.mimeType } };
             } else {
                sceneImagePart = { inlineData: { data: sceneImage.data, mimeType: sceneImage.mimeType } };
             }

            const monumentImagePart = { inlineData: { data: monumentImage.data, mimeType: monumentImage.mimeType } };
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
            
            const finalImage = getResponseImage(finalResponse);
            if (finalImage) {
                return res.status(200).json({ finalImageUrl: `data:${finalImage.mimeType};base64,${finalImage.data}` });
            } else {
                 throw new Error("API did not return the final image.");
            }
        }


        return res.status(400).json({ error: 'Invalid request type' });
    } catch (error: any) {
        console.error('Error in /api/generate:', error);
        res.status(500).json({ error: error.message || 'An internal server error occurred.' });
    }
}
