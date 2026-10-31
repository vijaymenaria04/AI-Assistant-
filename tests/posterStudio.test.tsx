// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { validatePosterRequest, generatePosterBackground } from '../src/server/posterProvider';
import { deletePoster, listPosters, savePoster, PosterDesign } from '../src/services/posterStore';
import { PosterStudioView } from '../src/views/PosterStudioView';
import { i18n } from '../src/services/i18n';

const make = (id: string, workspace: PosterDesign['workspace']): PosterDesign => ({ id, workspace, customName: '', instructions: 'Design background', headline: 'Test', details: '', width: 1080, height: 1080, textColor: '#ffffff', layout: 'bottom', background: 'data:image/png;base64,iVBORw0KGgo=', logo: '', references: [], thumbnail: '', updatedAt: '2030-01-01' });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); i18n.setLanguage('en'); });

describe('poster studio', () => {
  it('validates dimensions, prompt and actual uploaded image signatures', () => {
    expect(() => validatePosterRequest({ prompt: ' ', width: 1080, height: 1080, references: [] })).toThrow();
    expect(() => validatePosterRequest({ prompt: 'festival', width: 99999, height: 500, references: [] })).toThrow();
    expect(() => validatePosterRequest({ prompt: 'festival', width: 1080, height: 1080, references: [{ mime: 'image/png', data: 'dGVzdA==' }] })).toThrow();
    const valid = validatePosterRequest({ prompt: 'festival', width: 1080, height: 1920, references: [] });
    expect(valid.prompt).toBe('festival');
  });
  it('uses the real image API and does not fabricate success from provider failures', async () => {
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ b64_json: 'iVBORw0KGgo=' }] }), { status: 200 }));
    const request = validatePosterRequest({ prompt: 'festive', width: 1080, height: 1920, references: [] });
    expect(await generatePosterBackground(request, 'test-key', mock as typeof fetch)).toMatch(/^data:image\/png;base64,/);
    const [url, init] = mock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/images/generations');
    expect(init.headers.Authorization).toBe('Bearer test-key');
    expect(JSON.parse(init.body).size).toBe('1024x1536');
    const failed = vi.fn().mockResolvedValue(new Response('{}', { status: 502 }));
    await expect(generatePosterBackground(request, 'test-key', failed as typeof fetch)).rejects.toThrow();
    const empty = vi.fn().mockResolvedValue(new Response('{"data":[]}', { status: 200 }));
    await expect(generatePosterBackground(request, 'test-key', empty as typeof fetch)).rejects.toThrow();
  });
  it('keeps saved designs separate and refuses cross-workspace deletion', async () => {
    await savePoster(make('poster-jain', 'jain-sweets')); await savePoster(make('poster-paan', 'paan-bai'));
    expect((await listPosters('jain-sweets')).map(x => x.id)).toEqual(['poster-jain']);
    expect((await listPosters('paan-bai')).map(x => x.id)).toEqual(['poster-paan']);
    await expect(savePoster(make('poster-jain', 'paan-bai'))).rejects.toThrow();
    expect((await listPosters('jain-sweets'))[0].workspace).toBe('jain-sweets');
    await deletePoster('poster-jain', 'paan-bai');
    expect((await listPosters('jain-sweets'))).toHaveLength(1);
    await deletePoster('poster-jain', 'jain-sweets');
    expect((await listPosters('jain-sweets'))).toHaveLength(0);
  });
  it('shows a real generation failure with retry and no fake preview', async () => {
    i18n.setLanguage('en'); vi.spyOn(window,'confirm').mockReturnValue(true);
    vi.spyOn(window,'fetch').mockResolvedValue(new Response(JSON.stringify({error:'Poster generation is not configured. No image was generated.'}), {status:503, headers:{'Content-Type':'application/json'}}));
    render(<PosterStudioView currentBusinessId="kesarwadi" />);
    fireEvent.change(screen.getByLabelText('Design instructions'), { target: { value: 'Festival sweets' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate background' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Poster generation is not configured');
    expect(screen.queryByAltText('Poster preview')).toBeNull();
    expect(screen.getByRole('button', { name: 'Generate background' })).toBeTruthy();
    await waitFor(() => expect(screen.getByText('No saved designs for this workspace.')).toBeTruthy());
  });
  it('uses the edit endpoint with references and never supplies an invented identity', async () => {
    const png = 'iVBORw0KGgo=';
    const request = validatePosterRequest({ prompt: 'festival style', width: 1200, height: 630, references: [{ mime: 'image/png', data: png }] });
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ b64_json: png }] }), { status: 200 }));
    await generatePosterBackground(request, 'test-key', fetcher as typeof fetch);
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/images/edits');
    expect(init.body.get('model')).toBe('gpt-image-1');
    expect(init.body.getAll('image[]')).toHaveLength(1);
    expect(init.body.get('prompt')).toContain('Do not render any text');
    expect(init.body.get('prompt')).toContain('Do not invent business identities or promotions');
  });
  it('does not claim success if a provider image cannot be decoded', async () => {
    i18n.setLanguage('en'); vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({image:'data:image/png;base64,iVBORw0KGgo='}), { status:200 }));
    vi.stubGlobal('Image', class { onerror?: () => void; set src(_value: string) { queueMicrotask(() => this.onerror?.()); } });
    render(<PosterStudioView currentBusinessId="jain-sweets" />);
    fireEvent.change(screen.getByLabelText('Design instructions'), { target: { value: 'Festival' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate background' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Could not open the image');
    expect(screen.queryByText(/Background generated/)).toBeNull();
    expect(screen.queryByAltText('Poster preview')).toBeNull();
    expect(screen.getByRole('button', { name: 'Generate background' })).toBeTruthy();
  });
  it('disables workspace changes while uploaded files are being read', async () => {
    let finish: (() => void) | undefined;
    vi.stubGlobal('FileReader', class { result = 'data:image/png;base64,iVBORw0KGgo='; onload?: () => void; readAsDataURL() { finish = () => this.onload?.(); } });
    vi.stubGlobal('Image', class { naturalWidth=1; naturalHeight=1; onload?: () => void; set src(_value: string) { queueMicrotask(() => this.onload?.()); } });
    render(<PosterStudioView currentBusinessId="jain-sweets" />);
    const workspace = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
    const input = screen.getByLabelText('Upload business logo');
    fireEvent.change(input, { target: { files: [new File(['image'], 'logo.png', {type:'image/png'})] } });
    expect(workspace.closest('fieldset')?.disabled).toBe(true);
    finish?.();
    await waitFor(() => expect(workspace.closest('fieldset')?.disabled).toBe(false));
    expect(screen.getByAltText('Selected logo')).toBeTruthy();
    vi.spyOn(window,'confirm').mockReturnValue(true);
    fireEvent.change(workspace, { target: { value: 'paan-bai' } });
    expect(screen.queryByAltText('Selected logo')).toBeNull();
  });

});
