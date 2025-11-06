import { GoogleGenAI, Modality } from "@google/genai";
import { Part } from "@google/genai";

interface ImagePart {
  data: string;
  mimeType: string;
}

// Function to generate a monument using Gemini
export const generateMonument = async (prompt: string, image: ImagePart | null): Promise<string | null> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-2.5-flash-image';
  
  const parts: Part[] = [];
  let finalPrompt: string;

  if (image) {
    parts.push({
      inlineData: {
        data: image.data,
        mimeType: image.mimeType,
      },
    });
  }

  if (prompt && image) {
    finalPrompt = `Create a photorealistic monument of ${prompt}, stylistically inspired by the provided image.`;
  } else if (prompt) {
    finalPrompt = `A photorealistic, majestic, and grand monument of ${prompt}.`;
  } else if (image) {
    finalPrompt = `Transform the subject of this image into a majestic stone monument.`;
  } else {
    throw new Error('A prompt or an image is required.');
  }
  
  parts.push({ text: finalPrompt });

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    return null;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to generate image. The model may have refused the request due to safety policies or other issues.");
  }
};
