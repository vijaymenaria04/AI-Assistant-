import { BUSINESSES } from '../types/database';
import type { PosterDesign } from './posterStore';

function image(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve,reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('Could not read an image.')); img.src = src; });
}
function lines(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const result: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      if (line && ctx.measureText(`${line} ${word}`).width > width) { result.push(line); line = word; }
      else line = line ? `${line} ${word}` : word;
    }
    result.push(line);
  }
  return result;
}
export async function renderPoster(design: PosterDesign): Promise<HTMLCanvasElement> {
  if (document.fonts?.ready) await document.fonts.ready;
  if (!Number.isInteger(design.width) || !Number.isInteger(design.height) || design.width < 256 || design.height < 256 || design.width > 2048 || design.height > 2048 || design.width * design.height > 4194304) throw new Error('Invalid poster dimensions.');
  const canvas = document.createElement('canvas'); canvas.width = design.width; canvas.height = design.height;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas is not supported on this device.');
  const bg = await image(design.background);
  const scale = (design.backgroundFit === 'contain' ? Math.min : Math.max)(canvas.width / bg.width, canvas.height / bg.height);
  ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bg, (canvas.width - bg.width * scale) / 2, (canvas.height - bg.height * scale) / 2, bg.width * scale, bg.height * scale);
  // User-entered text is rendered as a separate layer; no generated prices or contact details are inserted.
  const padding = Math.round(canvas.width * .07);
  const titleSize = Math.max(18, Math.min(canvas.width * .075, canvas.height * .055));
  const detailSize = Math.max(14, titleSize * .48);
  const brand = design.workspace === 'personal' ? design.customName.trim() : BUSINESSES[design.workspace].name;
  ctx.font = `700 ${titleSize}px "Noto Sans Devanagari", sans-serif`;
  const headlineLines = lines(ctx, design.headline.trim(), canvas.width - padding * 2);
  ctx.font = `600 ${detailSize}px "Noto Sans Devanagari", sans-serif`;
  const detailLines = lines(ctx, design.details.trim(), canvas.width - padding * 2);
  const brandSize = detailSize * 1.1;
  const textHeight = (brand ? brandSize * 1.5 : 0) + (design.headline.trim() ? headlineLines.length * titleSize * 1.22 : 0) + (design.details.trim() ? detailLines.length * detailSize * 1.4 : 0);
  const boxHeight = textHeight + padding * .7;
  // Reserve a separate area for an uploaded logo so it never covers the supplied details.
  const logoScale = Math.max(.1, Math.min(.3, Number.isFinite(design.logoScale) ? design.logoScale! : .18));
  const logoSpace = design.logo ? Math.min(canvas.width, canvas.height) * logoScale + padding * .5 : 0;
  const minY = padding + logoSpace;
  if (boxHeight + minY + padding > canvas.height) throw new Error('Text is too long for the selected size.');
  const y = design.layout === 'top' ? minY : design.layout === 'center' ? Math.max(minY, (canvas.height - boxHeight) / 2) : Math.max(minY, canvas.height - boxHeight - padding);
  ctx.save();
  ctx.fillStyle = /^#[0-9a-f]{6}$/i.test(design.panelColor || '') ? design.panelColor! : '#000000';
  ctx.globalAlpha = Math.max(0, Math.min(1, Number.isFinite(design.panelOpacity) ? design.panelOpacity! : .58));
  ctx.fillRect(0, y - padding * .35, canvas.width, boxHeight + padding * .3);
  ctx.restore();
  ctx.fillStyle = design.textColor; ctx.textBaseline = 'top'; let cursor = y;
  if (brand) { ctx.font = `700 ${brandSize}px "Noto Sans Devanagari", sans-serif`; ctx.fillText(brand, padding, cursor, canvas.width - padding * 2); cursor += brandSize * 1.5; }
  if (design.headline.trim()) { ctx.font = `700 ${titleSize}px "Noto Sans Devanagari", sans-serif`; for (const line of headlineLines) { ctx.fillText(line, padding, cursor, canvas.width - padding * 2); cursor += titleSize * 1.22; } }
  if (design.details.trim()) { ctx.font = `600 ${detailSize}px "Noto Sans Devanagari", sans-serif`; for (const line of detailLines) { ctx.fillText(line, padding, cursor, canvas.width - padding * 2); cursor += detailSize * 1.4; } }
  if (design.logo) { const logo = await image(design.logo); const max = Math.min(canvas.width, canvas.height) * logoScale; const r = Math.min(max / logo.width, max / logo.height); const x = design.logoPosition === 'left' ? padding : canvas.width - padding - logo.width * r; ctx.drawImage(logo, x, padding, logo.width * r, logo.height * r); }
  return canvas;
}
export function posterBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not create poster image.')), 'image/png'));
}
