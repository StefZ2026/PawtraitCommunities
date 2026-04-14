// Portrait generation engine — fal.ai Nano Banana 2 at 4K, with fallbacks
// Same APIs as Pros, written fresh for Communities

import Replicate from "replicate";
import { GoogleGenAI, Modality } from "@google/genai";

const FAL_KEY = process.env.FAL_KEY;
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const replicate = REPLICATE_API_TOKEN ? new Replicate({ auth: REPLICATE_API_TOKEN }) : null;
const genai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

export interface GenerateOptions {
  resolution?: string;
  aspectRatio?: string;
}

export async function generatePortrait(
  prompt: string,
  sourceImageUrl?: string,
  options: GenerateOptions = {}
): Promise<string> {
  const { resolution = "4K", aspectRatio = "1:1" } = options;

  // Try fal.ai first
  if (FAL_KEY && sourceImageUrl) {
    try {
      const result = await falGenerate(prompt, sourceImageUrl, resolution, aspectRatio);
      if (result) return result;
    } catch (err: any) {
      console.error("[portrait-engine] fal.ai failed:", err.message);
    }
  }

  // Fallback: Replicate FLUX Kontext
  if (replicate && sourceImageUrl) {
    try {
      const result = await replicateGenerate(prompt, sourceImageUrl);
      if (result) return result;
    } catch (err: any) {
      console.error("[portrait-engine] Replicate failed:", err.message);
    }
  }

  // Fallback: Gemini
  if (genai) {
    try {
      const result = await geminiGenerate(prompt, sourceImageUrl);
      if (result) return result;
    } catch (err: any) {
      console.error("[portrait-engine] Gemini failed:", err.message);
    }
  }

  throw new Error("All portrait generation engines failed");
}

async function falGenerate(prompt: string, imageUrl: string, resolution: string, aspectRatio: string): Promise<string | null> {
  // Queue-based fal.ai request
  const queueRes = await fetch("https://queue.fal.run/fal-ai/nano-banana-2", {
    method: "POST",
    headers: {
      Authorization: `Key ${FAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_url: imageUrl,
      resolution,
      aspect_ratio: aspectRatio,
    }),
  });

  if (!queueRes.ok) {
    const text = await queueRes.text();
    throw new Error(`fal.ai queue failed: ${queueRes.status} ${text}`);
  }

  const queueData = await queueRes.json();
  const requestId = queueData.request_id;
  if (!requestId) throw new Error("No request_id from fal.ai");

  // Poll for result
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));

    const statusRes = await fetch(`https://queue.fal.run/fal-ai/nano-banana-2/requests/${requestId}/status`, {
      headers: { Authorization: `Key ${FAL_KEY}` },
    });

    if (!statusRes.ok) continue;
    const statusData = await statusRes.json();

    if (statusData.status === "COMPLETED") {
      const resultRes = await fetch(`https://queue.fal.run/fal-ai/nano-banana-2/requests/${requestId}`, {
        headers: { Authorization: `Key ${FAL_KEY}` },
      });
      if (!resultRes.ok) throw new Error("Failed to fetch fal.ai result");
      const resultData = await resultRes.json();
      const imageUrl = resultData?.images?.[0]?.url || resultData?.output?.images?.[0]?.url;
      if (imageUrl) return imageUrl;
      throw new Error("No image URL in fal.ai response");
    }

    if (statusData.status === "FAILED") {
      throw new Error(`fal.ai generation failed: ${statusData.error || "unknown"}`);
    }
  }

  throw new Error("fal.ai generation timed out");
}

async function replicateGenerate(prompt: string, imageUrl: string): Promise<string | null> {
  if (!replicate) return null;

  const output = await replicate.run("black-forest-labs/flux-kontext-pro", {
    input: {
      prompt,
      input_image: imageUrl,
      aspect_ratio: "1:1",
    },
  });

  if (typeof output === "string") return output;
  if (Array.isArray(output) && output.length > 0) return String(output[0]);
  return null;
}

async function geminiGenerate(prompt: string, imageUrl?: string): Promise<string | null> {
  if (!genai) return null;

  const contents: any[] = [];
  if (imageUrl) {
    const imgRes = await fetch(imageUrl);
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
    contents.push({
      inlineData: { mimeType: "image/jpeg", data: imgBuffer.toString("base64") },
    });
  }
  contents.push({ text: prompt });

  const response = await genai.models.generateContent({
    model: "gemini-2.0-flash-exp",
    contents: [{ role: "user", parts: contents }],
    config: { responseModalities: [Modality.TEXT, Modality.IMAGE] },
  });

  const parts = response.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if ((part as any).inlineData?.data) {
      const base64 = (part as any).inlineData.data;
      return `data:image/png;base64,${base64}`;
    }
  }

  return null;
}
