import { GoogleGenAI, Modality } from "@google/genai";
import { ImagePayload } from '../types';

// FIX: Initialize the GoogleGenAI client with the API key from environment variables.
// The API key must be obtained exclusively from the environment variable `process.env.API_KEY`.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export const generateImageWithPrompt = async (
  prompt: string,
  image: ImagePayload
): Promise<string> => {
  try {
    // FIX: Use ai.models.generateContent for image editing with the correct model and parameters.
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: image.base64,
              mimeType: image.mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
          responseModalities: [Modality.IMAGE],
      },
    });

    // FIX: Correctly extract the generated image data from the response.
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
      }
    }
    throw new Error("No image generated in the response.");

  } catch (error) {
    console.error("Error generating content:", error);
    if (error instanceof Error) {
        throw new Error(`Error generating image: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating the image.");
  }
};
