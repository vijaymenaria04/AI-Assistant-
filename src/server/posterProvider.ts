/** Provider implementation. The caller is responsible for authentication and consent. */
export type PosterReference = { mime: 'image/png' | 'image/jpeg' | 'image/webp'; data: string };
export interface PosterRequest { prompt: string; width: number; height: number; references: PosterReference[] }
const MAX_REFERENCE_BYTES = 3 * 1024 * 1024;

export function validatePosterRequest(body: unknown): PosterRequest {
  const b = body as Partial<PosterRequest> | null;
  if (!b || typeof b.prompt !== 'string' || !b.prompt.trim() || b.prompt.length > 1500) throw new Error('Enter design instructions (maximum 1,500 characters).');
  if (!Number.isInteger(b.width) || !Number.isInteger(b.height) || b.width! < 256 || b.height! < 256 || b.width! > 2048 || b.height! > 2048 || b.width! * b.height! > 4194304) throw new Error('Choose dimensions between 256 and 2048 pixels.');
  if (!Array.isArray(b.references) || b.references.length > 3) throw new Error('Choose at most three reference photos.');
  const references = b.references.map(item => {
    if (!item || !['image/png', 'image/jpeg', 'image/webp'].includes(item.mime) || typeof item.data !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(item.data) || item.data.length > Math.ceil(MAX_REFERENCE_BYTES * 4 / 3) + 4) throw new Error('Invalid reference image.');
    const bytes = Buffer.from(item.data, 'base64');
    const isPng = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isWebp = bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
    if (!bytes.length || bytes.length > MAX_REFERENCE_BYTES || !((item.mime === 'image/png' && isPng) || (item.mime === 'image/jpeg' && isJpeg) || (item.mime === 'image/webp' && isWebp))) throw new Error('Invalid reference image.');
    return { mime: item.mime, data: item.data } as PosterReference;
  });
  return { prompt: b.prompt.trim(), width: b.width!, height: b.height!, references };
}

export async function generatePosterBackground(request: PosterRequest, apiKey: string, fetcher: typeof fetch = fetch): Promise<string> {
  const size = request.width / request.height > 1.2 ? '1536x1024' : request.height / request.width > 1.2 ? '1024x1536' : '1024x1024';
  const prompt = `Create a polished poster background for the following user instructions. Do not render any text, numbers, prices, phone numbers, addresses, logos, labels or watermarks. Leave clear space for exact text and logos to be added afterwards. Do not invent business identities or promotions. User instructions: ${request.prompt}`;
  const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}` };
  let url = 'https://api.openai.com/v1/images/generations';
  let body: BodyInit;
  if (request.references.length) {
    url = 'https://api.openai.com/v1/images/edits';
    const form = new FormData();
    form.append('model', 'gpt-image-1'); form.append('prompt', prompt); form.append('size', size); form.append('quality', 'medium');
    request.references.forEach((image, i) => form.append('image[]', new Blob([new Uint8Array(Buffer.from(image.data, 'base64'))], { type: image.mime }), `reference-${i}.${image.mime === 'image/jpeg' ? 'jpg' : image.mime === 'image/webp' ? 'webp' : 'png'}`));
    body = form;
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({ model: 'gpt-image-1', prompt, size, quality: 'medium', n: 1 });
  }
  const response = await fetcher(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error('Image provider could not generate the design. Please try again.');
  const data = await response.json() as { data?: Array<{ b64_json?: string }> };
  const image = data.data?.[0]?.b64_json;
  if (typeof image !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(image) || image.length > 12_000_000 || !image.startsWith('iVBORw0KGgo')) throw new Error('Image provider returned an invalid image.');
  return `data:image/png;base64,${image}`;
}
