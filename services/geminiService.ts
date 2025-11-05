
import { ImagePayload } from '../types';

export async function generateMonumentImage(
  prompt: string,
  image: ImagePayload | null
): Promise<string> {
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, image }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Use the error message from the backend, or a default
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }

    if (!data.imageUrl) {
        throw new Error("No image URL found in the server response.");
    }

    return data.imageUrl;

  } catch (error) {
    console.error("Error calling generation service:", error);
    // Re-throw the error to be caught by the UI component
    throw error;
  }
}
