
import { GoogleGenAI, Modality, Part } from "@google/genai";
import { ImagePayload } from '../types';

export async function generateMonumentImage(
  prompt: string,
  image: ImagePayload | null
): Promise<string> {
  // It's recommended to initialize the AI client just before the call 
  // to ensure it uses the most up-to-date API key.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  const parts: Part[] = [{ text: prompt }];

  if (image) {
    parts.unshift({
      inlineData: {
        data: image.base64,
        mimeType: image.mimeType,
      },
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: parts,
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        const mimeType = part.inlineData.mimeType;
        return `data:${mimeType};base64,${base64ImageBytes}`;
      }
    }
    
    throw new Error("No image data found in the API response.");

  } catch (error) {
    console.error("Error generating image with Gemini:", error);
    throw new Error("Failed to generate image. Please check your prompt or API key and try again.");
  }
}
