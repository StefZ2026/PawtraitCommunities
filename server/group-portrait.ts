// Group portrait generation — multi-pet support
// Uses Replicate FLUX.2 Max (primary) + Gemini (fallback)
// Ported from Pawtrait Pros

import Replicate from "replicate";

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

const FLUX_GROUP_PREFIX = `Multiple reference photos are provided. Each photo shows a different animal. Depict ALL of these exact animals together in one scene. For EACH animal, preserve its exact face, markings, coloring, ear shape, eye color, fur texture, and body proportions as seen in its reference photo. Position them so each is clearly visible. Place all of these animals together in the following scene:\n\n`;

function extractReplicateUrl(output: unknown): string | null {
  if (typeof output === "string") return output;
  if (Array.isArray(output) && output.length > 0) {
    if (typeof output[0] === "string") return output[0];
    if (output[0]?.url) return output[0].url;
  }
  if (output && typeof output === "object" && "url" in output) return (output as any).url;
  return null;
}

export function isGroupPortraitConfigured(): boolean {
  return !!REPLICATE_TOKEN || !!GEMINI_KEY;
}

/**
 * Generate a group portrait with multiple pets in one scene.
 * @param prompt - The style/scene prompt
 * @param sourceImageUrls - Array of pet photo URLs (2-5 pets)
 * @returns URL of the generated image
 */
export async function generateGroupPortrait(
  prompt: string,
  sourceImageUrls: string[]
): Promise<string> {
  if (!sourceImageUrls || sourceImageUrls.length < 2) {
    throw new Error("Group portraits require at least 2 source images");
  }

  // Try FLUX.2 Max on Replicate first
  if (REPLICATE_TOKEN) {
    try {
      const replicate = new Replicate({ auth: REPLICATE_TOKEN });
      const input: Record<string, any> = {
        prompt: FLUX_GROUP_PREFIX + prompt,
        aspect_ratio: "1:1",
      };
      sourceImageUrls.forEach((img, i) => {
        const key = i === 0 ? "input_image" : `input_image_${i + 1}`;
        input[key] = img;
      });

      const output = await replicate.run("black-forest-labs/flux-2-max", { input });
      const outputUrl = extractReplicateUrl(output);
      if (outputUrl) {
        console.log("[group-portrait] FLUX.2 Max succeeded");
        return outputUrl;
      }
      throw new Error("FLUX.2 Max returned no output");
    } catch (fluxErr: any) {
      console.error("[group-portrait] FLUX.2 Max failed:", fluxErr.message);
    }
  }

  // Gemini fallback
  if (GEMINI_KEY) {
    try {
      const { GoogleGenAI, Modality } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });

      const geminiPrefix = `MULTIPLE REFERENCE PHOTOS ATTACHED — DEPICT ALL OF THESE EXACT ANIMALS TOGETHER IN ONE SCENE.

RULES:
1. DEPICT ALL ANIMALS — every reference photo is a different animal. ALL must appear.
2. PHOTO OVERRIDES TEXT — depict what you SEE in each photo.
3. EXACT COLORS AND PATTERNS — reproduce exact coat colors, markings, proportions.
4. PRESERVE UNIQUE FEATURES — exact ear shape, muzzle, eye color, fur texture.
5. DIFFERENTIATE CLEARLY — position them so each is fully visible.
6. PHOTOREALISTIC ANIMALS — animals look real, style applies to scene/costumes/background.
7. NATURAL INTERACTION — animals appear together naturally as companions.

Now apply this artistic style to ALL animals together:

`;

      const parts: any[] = [{ text: geminiPrefix + prompt }];
      for (const url of sourceImageUrls) {
        const imgRes = await fetch(url);
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        parts.push({ inlineData: { mimeType: imgRes.headers.get("content-type") || "image/jpeg", data: buffer.toString("base64") } });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: [{ role: "user", parts }],
        config: { responseModalities: [Modality.TEXT, Modality.IMAGE] },
      });

      const candidates = (response as any)?.candidates;
      if (candidates?.[0]?.content?.parts) {
        for (const part of candidates[0].content.parts) {
          if (part.inlineData?.data) {
            const mime = part.inlineData.mimeType || "image/png";
            console.log("[group-portrait] Gemini succeeded");
            return `data:${mime};base64,${part.inlineData.data}`;
          }
        }
      }
      throw new Error("Gemini returned no image");
    } catch (geminiErr: any) {
      console.error("[group-portrait] Gemini failed:", geminiErr.message);
    }
  }

  throw new Error("No group portrait engine available — need REPLICATE_API_TOKEN or GEMINI_API_KEY");
}
