// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { renderPoster } from '../src/services/posterCanvas';
import type { PosterDesign } from '../src/services/posterStore';
import { BUSINESSES } from '../src/types/database';

const design: PosterDesign = { id:'', workspace:'paan-bai', customName:'', instructions:'', headline:'Supplied headline', details:'Supplied details', width:1200, height:630, textColor:'#ffffff', layout:'top', background:'background', logo:'logo', references:[], thumbnail:'', updatedAt:'', backgroundFit:'contain', logoPosition:'left', logoScale:.18, panelColor:'#551122', panelOpacity:.7 };
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('renders only the selected business and supplied text, with a separate logo area and editable image fit', async () => {
  vi.stubGlobal('Image', class { width=100; height=100; onload?: () => void; set src(_value: string) { queueMicrotask(() => this.onload?.()); } });
  const drawImage = vi.fn(); const fillText = vi.fn(); const fillRect = vi.fn();
  const ctx = { drawImage, fillText, fillRect, save:vi.fn(), restore:vi.fn(), measureText: (text:string) => ({ width:text.length*10 }), font:'', fillStyle:'', globalAlpha:1, textBaseline:'' };
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
  const canvas = await renderPoster(design);
  expect([canvas.width,canvas.height]).toEqual([1200,630]);
  expect(drawImage.mock.calls[0].slice(1)).toEqual([285,0,630,630]);
  expect(fillText.mock.calls.map(x => x[0])).toEqual([BUSINESSES['paan-bai'].name,'Supplied headline','Supplied details']);
  expect(fillText.mock.calls[0][2]).toBeGreaterThan(630 * .18);
  const logo = drawImage.mock.calls[1]; expect(logo[1]).toBe(84);
});

it('rejects text that cannot fit rather than silently clipping details', async () => {
  vi.stubGlobal('Image', class { width=100; height=100; onload?: () => void; set src(_value: string) { queueMicrotask(() => this.onload?.()); } });
  const ctx = { drawImage:vi.fn(), fillText:vi.fn(), fillRect:vi.fn(), save:vi.fn(), restore:vi.fn(), measureText: (_:string) => ({ width:10000 }), font:'', fillStyle:'', globalAlpha:1, textBaseline:'' };
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
  await expect(renderPoster({ ...design, width:256, height:256, details: 'word '.repeat(100) })).rejects.toThrow('Text is too long');
});
