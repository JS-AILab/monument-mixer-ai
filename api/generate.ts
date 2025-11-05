import { GoogleGenAI, Modality, Part } from "@google/genai";

// By defining the type here instead of importing from a shared file,
// we ensure this API route is completely decoupled from the frontend code.
interface ImagePayload {
  base64: string;
  mimeType: string;
}

// This config is required for Vercel to correctly handle the streaming response
export const config = {
  runtime: 'edge',
};

// This function will be deployed as a Vercel Serverless Function
export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { prompt, image } = (await req.json()) as { prompt: string; image: ImagePayload | null };

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // IMPORTANT: Access the API key securely from environment variables.
    // This key is NOT exposed to the browser.
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API_KEY environment variable not set.");
    }
    const ai = new GoogleGenAI({ apiKey });

    const parts: Part[] = [{ text: prompt }];

    if (image) {
      parts.unshift({
        inlineData: {
          data: image.base64,
          mimeType: image.mimeType,
        },
      });
    }

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
        const imageUrl = `data:${mimeType};base64,${base64ImageBytes}`;
        return new Response(JSON.stringify({ imageUrl }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    throw new Error("No image data found in the API response.");

  } catch (error) {
    console.error("Error in /api/generate:", error);
    const errorMessage = error instanceof Error ? error.message : "An internal server error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
