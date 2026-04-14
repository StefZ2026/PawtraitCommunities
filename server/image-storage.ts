// Supabase Storage — upload images and fetch as buffers

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function isDataUri(value: string): boolean {
  return typeof value === "string" && value.startsWith("data:");
}

export async function uploadToStorage(base64DataUri: string, bucket: string, filename: string): Promise<string> {
  const match = base64DataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid data URI");

  const contentType = match[1];
  const buffer = Buffer.from(match[2], "base64");

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${filename}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: buffer,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Storage upload failed: ${res.status} ${text}`);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filename}`;
}

export async function fetchImageAsBuffer(urlOrDataUri: string): Promise<Buffer> {
  if (isDataUri(urlOrDataUri)) {
    const match = urlOrDataUri.match(/^data:[^;]+;base64,(.+)$/);
    if (!match) throw new Error("Invalid data URI");
    return Buffer.from(match[1], "base64");
  }

  const res = await fetch(urlOrDataUri);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
