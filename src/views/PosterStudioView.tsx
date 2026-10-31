import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Mic, Save, Share2, Sparkles, Trash2 } from 'lucide-react';
import { BUSINESSES, BusinessId } from '../types/database';
import { useTranslation, translateText } from '../services/i18n';
import { voice } from '../services/voice';
import { deletePoster, listPosters, PosterDesign, savePoster } from '../services/posterStore';
import { posterBlob, renderPoster } from '../services/posterCanvas';
import type { PosterReference } from '../server/posterProvider';

type Props = { currentBusinessId: BusinessId };
const field = 'w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100';
const primary = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs disabled:opacity-50';
const secondary = 'inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold text-xs disabled:opacity-50';
const presets: Record<string, [number, number]> = { instagram: [1080,1080], story: [1080,1920], whatsapp: [1080,1920], facebook: [1200,630], flex: [1800,900], custom: [1080,1080] };
const blank = (workspace: BusinessId): PosterDesign => ({ id: '', workspace, customName: '', instructions: '', headline: '', details: '', width: 1080, height: 1080, textColor: '#ffffff', layout: 'bottom', panelColor: '#000000', panelOpacity: .58, backgroundFit: 'cover', logoPosition: 'right', logoScale: .18, background: '', logo: '', references: [], thumbnail: '', updatedAt: '' });

async function loadFile(file: File): Promise<{ mime: PosterReference['mime']; data: string; url: string }> {
  if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024 || file.size === 0) throw new Error('Choose a PNG, JPG or WebP image up to 3 MB.');
  const url = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error('Could not read the image.')); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(file); });
  await verifyImage(url);
  return { mime: file.type as PosterReference['mime'], data: url.split(',')[1], url };
}
async function verifyImage(src: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => img.naturalWidth && img.naturalHeight && img.naturalWidth * img.naturalHeight <= 40_000_000 ? resolve() : reject(new Error('Image is invalid or too large to open.'));
    img.onerror = () => reject(new Error('Could not open the image. Please choose another or retry.'));
    img.src = src;
  });
}
export const PosterStudioView: React.FC<Props> = ({ currentBusinessId }) => {
  const { lang } = useTranslation(); const hi = lang === 'hi'; const t = (en: string, hindi: string) => hi ? hindi : en;
  const [design, setDesign] = useState<PosterDesign>(() => blank(currentBusinessId));
  const [preset, setPreset] = useState('instagram');
  const [gallery, setGallery] = useState<PosterDesign[]>([]);
  const [galleryStatus, setGalleryStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [preview, setPreview] = useState('');
  const [error, setError] = useState(''); const [previewError, setPreviewError] = useState(''); const [message, setMessage] = useState('');
  const [rendering, setRendering] = useState(false); const [uploading, setUploading] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState<'hi-IN' | 'en-IN'>(() => hi ? 'hi-IN' : 'en-IN');
  const draftEpoch = useRef(0); const uploadLock = useRef(false);
  const [busy, setBusy] = useState(false); const lock = useRef(false);
  const ownVoice = useRef(false); const [listening, setListening] = useState(false);
  const workspaceRef = useRef(design.workspace); workspaceRef.current = design.workspace;
  const loadGallery = useCallback(async (workspace: BusinessId) => {
    if (workspaceRef.current === workspace) setGalleryStatus('loading');
    try { const results = await listPosters(workspace); if (workspaceRef.current === workspace) { setGallery(results); setGalleryStatus('ready'); } }
    catch { if (workspaceRef.current === workspace) setGalleryStatus('error'); }
  }, [lang]);
  useEffect(() => { setGallery([]); void loadGallery(design.workspace); }, [design.workspace, loadGallery]);
  useEffect(() => {
    let alive = true;
    setPreview(''); setPreviewError('');
    if (!design.background) { setRendering(false); return; }
    setRendering(true);
    renderPoster(design).then(canvas => { if (alive) { setPreview(canvas.toDataURL('image/png')); setRendering(false); } }).catch(() => { if (alive) { setPreviewError(t('Could not render this design. Check the images, text and dimensions.', 'डिज़ाइन नहीं बना। तस्वीरें, टेक्स्ट और साइज़ जाँचें।')); setRendering(false); } });
    return () => { alive = false; };
  }, [design.background, design.logo, design.workspace, design.customName, design.headline, design.details, design.width, design.height, design.textColor, design.layout, design.panelColor, design.panelOpacity, design.backgroundFit, design.logoPosition, design.logoScale, lang]);
  useEffect(() => {
    const unsubscribe = voice.subscribe(state => {
      if (!ownVoice.current) return;
      setListening(state.isListening);
      if (state.error) { setError(state.error); ownVoice.current = false; }
      if (!state.isListening && state.transcript) { const text = voice.takeTranscript(); ownVoice.current = false; setDesign(d => ({ ...d, instructions: `${d.instructions}${d.instructions ? ' ' : ''}${text}`.slice(0, 1500) })); }
    });
    return () => { unsubscribe(); if (ownVoice.current) { ownVoice.current = false; voice.stopListening(); voice.takeTranscript(); } };
  }, []);
  const update = <K extends keyof PosterDesign>(key: K, value: PosterDesign[K]) => setDesign(d => ({ ...d, [key]: value }));
  const switchWorkspace = (workspace: BusinessId) => {
    if ((design.background || design.instructions || design.headline || design.logo) && !window.confirm(t('Discard the current unsaved draft and switch workspace?', 'मौजूदा बिना सहेजा डिज़ाइन हटाकर कार्यक्षेत्र बदलें?'))) return;
    draftEpoch.current++;
    if (ownVoice.current) { ownVoice.current = false; voice.stopListening(); voice.takeTranscript(); setListening(false); }
    setDesign(blank(workspace)); setPreset('instagram'); setPreview(''); setPreviewError(''); setError(''); setMessage('');
  };
  const addFiles = async (files: FileList | null, kind: 'reference' | 'logo' | 'background') => {
    if (!files?.length || lock.current || uploadLock.current) return;
    const epoch = draftEpoch.current;
    const workspace = design.workspace;
    uploadLock.current = true; setUploading(true); setError(''); setMessage('');
    try {
      if (kind === 'reference' && design.references.length + files.length > 3) throw new Error(t('Choose at most three reference images.', 'अधिकतम तीन रेफ़रेंस तस्वीरें चुनें।'));
      const images = await Promise.all(Array.from(files).map(loadFile));
      if (epoch !== draftEpoch.current || workspace !== workspaceRef.current) return;
      if (kind === 'logo') update('logo', images[0].url);
      else if (kind === 'background') { update('background', images[0].url); setMessage(t('Your photo is ready to edit.', 'आपकी फोटो एडिट करने के लिए तैयार है।')); }
      else setDesign(d => d.workspace === workspace ? { ...d, references: [...d.references, ...images.map(({ mime, data }) => ({ mime, data }))] } : d);
    } catch (e) { if (epoch === draftEpoch.current) setError(e instanceof Error ? e.message : 'Could not read image.'); }
    finally { uploadLock.current = false; setUploading(false); }
  };
  const generate = async () => {
    if (lock.current) return;
    if (!design.instructions.trim()) { setError(t('Please enter design instructions.', 'डिज़ाइन निर्देश लिखें।')); return; }
    if (design.workspace === 'personal' && !design.customName.trim()) { setError(t('Enter the personal or custom name to use.', 'व्यक्तिगत या कस्टम नाम लिखें।')); return; }
    if (!Number.isInteger(design.width) || !Number.isInteger(design.height) || design.width < 256 || design.height < 256 || design.width > 2048 || design.height > 2048 || design.width * design.height > 4194304) { setError(t('Choose dimensions from 256 to 2048 pixels.', 'साइज़ 256 से 2048 पिक्सेल के बीच रखें।')); return; }
    if (!window.confirm(t('Send your instructions and reference photos to the image provider to generate a background?', 'बैकग्राउंड बनाने के लिए निर्देश और रेफ़रेंस तस्वीरें AI सेवा को भेजें?'))) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/poster/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: design.instructions, width: design.width, height: design.height, references: design.references }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.image !== 'string' || !/^data:image\/png;base64,/.test(data.image)) throw new Error(typeof data.error === 'string' ? data.error : 'Could not generate the background.');
      // Decode before reporting success; a PNG signature alone does not prove a usable image.
      await verifyImage(data.image);
      setDesign(d => ({ ...d, background: data.image })); setMessage(t('Background generated. Review it and all details before saving or sharing.', 'बैकग्राउंड बना। सहेजने या शेयर करने से पहले सभी विवरण जाँचें।'));
    } catch (e) { setError(e instanceof Error ? e.message : t('Generation failed. Please retry.', 'डिज़ाइन नहीं बना। फिर कोशिश करें।')); }
    finally { lock.current = false; setBusy(false); }
  };
  const save = async () => {
    if (lock.current || !design.background || !preview) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try {
      await document.fonts.ready;
      const full = await renderPoster(design);
      const thumb = document.createElement('canvas'); const scale = Math.min(1, 320 / Math.max(full.width, full.height)); thumb.width = Math.round(full.width * scale); thumb.height = Math.round(full.height * scale); const context = thumb.getContext('2d'); if (!context) throw new Error('Preview unavailable.'); context.drawImage(full, 0, 0, thumb.width, thumb.height);
      const next = { ...design, id: design.id || crypto.randomUUID(), thumbnail: thumb.toDataURL('image/jpeg', .8), updatedAt: new Date().toISOString() };
      await savePoster(next); const verified = await listPosters(next.workspace); if (!verified.some(item => item.id === next.id)) throw new Error('Could not verify the saved design.');
      setDesign(next); setGallery(verified); setGalleryStatus('ready'); setMessage(t('Saved in this workspace on this device.', 'डिज़ाइन इस डिवाइस पर कार्यक्षेत्र में सहेजा गया।'));
    } catch (e) { setError(e instanceof Error ? e.message : t('Could not save design.', 'डिज़ाइन सहेजा नहीं गया।')); }
    finally { lock.current = false; setBusy(false); }
  };
  const exportDesign = async (item: PosterDesign, share: boolean) => {
    try {
      await document.fonts.ready; const blob = await posterBlob(await renderPoster(item));
      const file = new File([blob], 'GopalAI-poster.png', { type: 'image/png' });
      if (share) {
        if (!navigator.share || !navigator.canShare?.({ files: [file] })) throw new Error(t('Sharing files is not supported here. Download instead.', 'यहाँ फ़ाइल शेयर उपलब्ध नहीं है। डाउनलोड करें।'));
        await navigator.share({ files: [file], title: 'GopalAI poster' });
      } else { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'GopalAI-poster.png'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    } catch (e) { if ((e as Error)?.name !== 'AbortError') setError(e instanceof Error ? e.message : 'Export failed.'); }
  };
  const remove = async (item: PosterDesign) => {
    if (!window.confirm(t('Delete this saved design?', 'यह सहेजा डिज़ाइन हटाएँ?'))) return;
    try { await deletePoster(item.id, design.workspace); await loadGallery(design.workspace); if (item.id === design.id) setDesign(d => ({ ...d, id: '' })); }
    catch { setError(t('Could not delete the design.', 'डिज़ाइन हटाया नहीं गया।')); }
  };
  const startVoice = () => {
    setError(''); if (listening) { voice.stopListening(); return; }
    voice.takeTranscript(); ownVoice.current = true; voice.startListening(voiceLanguage);
  };
  return <div className="max-w-5xl mx-auto p-4 pb-28 space-y-4">
    <header><div className="flex items-center gap-2 text-amber-700 dark:text-amber-400"><Sparkles size={20} /><h1 className="text-xl font-extrabold">{t('AI Poster & Banner Studio', 'AI पोस्टर और बैनर स्टूडियो')}</h1></div><p className="text-xs text-slate-500 mt-1">{t('Create a background with AI, then add your exact business details.', 'AI से बैकग्राउंड बनाएं और अपने सही व्यवसाय विवरण जोड़ें।')}</p></header>
    <fieldset disabled={busy || uploading} className="space-y-4 min-w-0">
    <div className="p-4 rounded-2xl border border-slate-200 dark:border-amber-500/25 bg-white/90 dark:bg-slate-900 space-y-4">
      <label className="block text-xs font-semibold space-y-1"><span>{t('Workspace', 'कार्यक्षेत्र')}</span><select className={field} value={design.workspace} disabled={busy} onChange={e => switchWorkspace(e.target.value as BusinessId)}>{Object.values(BUSINESSES).map(b => <option key={b.id} value={b.id}>{b.id === 'personal' ? t('Personal / Custom', 'व्यक्तिगत / कस्टम') : translateText(b.name)}</option>)}</select></label>
      {design.workspace === 'personal' && <label className="block text-xs font-semibold space-y-1"><span>{t('Personal / custom name', 'व्यक्तिगत / कस्टम नाम')}</span><input className={field} maxLength={70} value={design.customName} onChange={e => update('customName', e.target.value)} /></label>}
      <label className="block text-xs font-semibold space-y-1"><span>{t('Design instructions', 'डिज़ाइन निर्देश')}</span><textarea className={field} rows={3} maxLength={1500} value={design.instructions} onChange={e => update('instructions', e.target.value)} placeholder={t('Describe the style, festival or promotion', 'स्टाइल, त्योहार या प्रचार का वर्णन करें')} /></label>
      <div className="flex flex-wrap gap-2 items-center"><label className="text-xs font-semibold">{t('Voice language', 'वॉइस भाषा')} <select className={field} value={voiceLanguage} disabled={listening} onChange={e => setVoiceLanguage(e.target.value as 'hi-IN' | 'en-IN')}><option value="hi-IN">{t('Hindi / Hinglish', 'हिन्दी / हिंग्लिश')}</option><option value="en-IN">{t('English', 'अंग्रेज़ी')}</option></select></label><button className={secondary} onClick={startVoice} disabled={busy}><Mic size={15} />{listening ? t('Stop listening', 'सुनना बंद करें') : t('Voice instructions', 'वॉइस निर्देश')}</button></div>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block text-xs font-semibold space-y-1"><span>{t('Reference photos (up to 3)', 'रेफ़रेंस फ़ोटो (अधिकतम 3)')}</span><input className="block w-full text-xs" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={e => { void addFiles(e.target.files,'reference'); e.target.value=''; }} disabled={busy} /></label>
        <label className="block text-xs font-semibold space-y-1"><span>{t('Take reference photo', 'रेफ़रेंस फ़ोटो लें')}</span><input className="block w-full text-xs" type="file" accept="image/png,image/jpeg,image/webp" capture="environment" onChange={e => { void addFiles(e.target.files,'reference'); e.target.value=''; }} disabled={busy} /></label>
        <label className="block text-xs font-semibold space-y-1"><span>{t('Use your own photo as background', 'अपनी फोटो को बैकग्राउंड बनाएं')}</span><input className="block w-full text-xs" type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { void addFiles(e.target.files,'background'); e.target.value=''; }} disabled={busy} /></label>
        <label className="block text-xs font-semibold space-y-1"><span>{t('Upload business logo', 'व्यवसाय का लोगो अपलोड करें')}</span><input className="block w-full text-xs" type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { void addFiles(e.target.files,'logo'); e.target.value=''; }} disabled={busy} /></label>
        <label className="block text-xs font-semibold space-y-1"><span>{t('Take a logo photo', 'लोगो की फोटो लें')}</span><input className="block w-full text-xs" type="file" accept="image/png,image/jpeg,image/webp" capture="environment" onChange={e => { void addFiles(e.target.files,'logo'); e.target.value=''; }} disabled={busy} /></label>
        <label className="block text-xs font-semibold space-y-1"><span>{t('Format', 'फ़ॉर्मेट')}</span><select className={field} value={preset} onChange={e => { setPreset(e.target.value); const [width,height] = presets[e.target.value]; setDesign(d => ({ ...d, width, height })); }}><option value="instagram">Instagram post</option><option value="story">Instagram story</option><option value="whatsapp">WhatsApp status</option><option value="facebook">Facebook post</option><option value="flex">Flex banner</option><option value="custom">{t('Custom size', 'कस्टम साइज़')}</option></select></label>
      </div>
      <div className="flex flex-wrap gap-2">{design.references.map((r,i) => <div key={i} className="relative"><img src={`data:${r.mime};base64,${r.data}`} alt={`${t('Reference', 'रेफ़रेंस')} ${i+1}`} className="w-14 h-14 object-cover rounded-lg" /><button className="absolute right-0 top-0 bg-slate-950 text-white rounded-full px-1" aria-label={`${t('Remove reference', 'रेफ़रेंस हटाएँ')} ${i+1}`} onClick={() => update('references',design.references.filter((_,index) => index !== i))}>×</button></div>)}{design.logo && <div className="relative"><img src={design.logo} alt={t('Selected logo','चुना लोगो')} className="w-14 h-14 object-contain rounded-lg bg-white"/><button className="absolute right-0 top-0 bg-slate-950 text-white rounded-full px-1" aria-label={t('Remove logo','लोगो हटाएँ')} onClick={() => update('logo','')}>×</button></div>}</div>
      {preset === 'custom' && <div className="grid grid-cols-2 gap-2"><label className="text-xs">{t('Width (px)', 'चौड़ाई (px)')}<input type="number" min="256" max="2048" className={field} value={design.width} onChange={e => update('width',Number(e.target.value))}/></label><label className="text-xs">{t('Height (px)', 'ऊँचाई (px)')}<input type="number" min="256" max="2048" className={field} value={design.height} onChange={e => update('height',Number(e.target.value))}/></label></div>}
      <p className="text-xs text-slate-500">{t('Instructions and reference photos are sent to the image provider only after confirmation. Your uploaded logo and exact details are added locally. Check that they match this workspace and review the background for unwanted text, logos, prices or contact details before publishing.', 'पुष्टि के बाद ही निर्देश और रेफ़रेंस AI सेवा को भेजे जाएंगे। आपका लोगो और सही विवरण डिवाइस पर जोड़े जाते हैं। जाँचें कि वे इस कार्यक्षेत्र के हैं, और शेयर करने से पहले बैकग्राउंड में गलत टेक्स्ट, लोगो, कीमत या संपर्क विवरण जाँचें।')}</p>
      <button className={primary} onClick={generate} disabled={busy}><Sparkles size={16}/>{busy ? t('Working…', 'काम चल रहा है…') : design.background ? t('Regenerate background', 'बैकग्राउंड फिर बनाएं') : t('Generate background', 'बैकग्राउंड बनाएं')}</button>
      {error && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400 break-words">{error}</p>}{message && <p role="status" className="text-xs text-emerald-700 dark:text-emerald-400">{message}</p>}
    </div>
    {design.background && <section className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900 space-y-3">
      <h2 className="font-bold text-sm">{t('Edit & preview', 'बदलें और देखें')}</h2>
      <p className="text-xs text-slate-500">{t('Only enter prices, contact information and offers you want to publish. Verify the preview before sharing.', 'केवल सही कीमत, फ़ोन और ऑफ़र लिखें। शेयर करने से पहले प्रीव्यू जाँचें।')}</p>
      <label className="block text-xs font-semibold space-y-1"><span>{t('Headline', 'मुख्य टेक्स्ट')}</span><input className={field} maxLength={100} value={design.headline} onChange={e => update('headline',e.target.value)} /></label>
      <label className="block text-xs font-semibold space-y-1"><span>{t('Details', 'विवरण')}</span><textarea className={field} rows={3} maxLength={300} value={design.details} onChange={e => update('details',e.target.value)} /></label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <label className="text-xs">{t('Text colour', 'टेक्स्ट रंग')} <input type="color" value={design.textColor} onChange={e => update('textColor',e.target.value)} /></label>
        <label className="text-xs">{t('Text panel colour', 'टेक्स्ट पैनल रंग')} <input type="color" value={design.panelColor ?? '#000000'} onChange={e => update('panelColor',e.target.value)} /></label>
        <label className="text-xs">{t('Panel opacity', 'पैनल की गहराई')} <input aria-label={t('Panel opacity', 'पैनल की गहराई')} type="range" min="0" max="100" value={Math.round((design.panelOpacity ?? .58) * 100)} onChange={e => update('panelOpacity',Number(e.target.value)/100)} /></label>
        <label className="text-xs">{t('Text layout', 'टेक्स्ट लेआउट')} <select className={field} value={design.layout} onChange={e => update('layout',e.target.value as PosterDesign['layout'])}><option value="top">{t('Top', 'ऊपर')}</option><option value="center">{t('Centre', 'बीच')}</option><option value="bottom">{t('Bottom', 'नीचे')}</option></select></label>
        <label className="text-xs">{t('Background fit', 'बैकग्राउंड फिट')} <select className={field} value={design.backgroundFit ?? 'cover'} onChange={e => update('backgroundFit',e.target.value as 'cover' | 'contain')}><option value="cover">{t('Fill and crop', 'भरें और काटें')}</option><option value="contain">{t('Show whole image', 'पूरी तस्वीर दिखाएं')}</option></select></label>
        {design.logo && <><label className="text-xs">{t('Logo position', 'लोगो की जगह')} <select className={field} value={design.logoPosition ?? 'right'} onChange={e => update('logoPosition',e.target.value as 'left' | 'right')}><option value="left">{t('Top left', 'ऊपर बाएँ')}</option><option value="right">{t('Top right', 'ऊपर दाएँ')}</option></select></label><label className="text-xs">{t('Logo size', 'लोगो का आकार')} <input aria-label={t('Logo size', 'लोगो का आकार')} type="range" min="10" max="30" value={Math.round((design.logoScale ?? .18) * 100)} onChange={e => update('logoScale',Number(e.target.value)/100)} /></label></>}
      </div>
      {previewError && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{previewError}</p>}
      {rendering && <p role="status" className="text-xs text-slate-500">{t('Updating preview…', 'प्रीव्यू अपडेट हो रहा है…')}</p>}
      {preview && <img src={preview} className="block w-full max-w-md mx-auto rounded-xl border border-slate-200 dark:border-slate-700" alt={t('Poster preview', 'पोस्टर प्रीव्यू')}/>}
      <div className="flex flex-wrap gap-2"><button className={primary} onClick={save} disabled={busy || !preview}><Save size={15}/>{t('Save design', 'डिज़ाइन सहेजें')}</button><button className={secondary} onClick={() => exportDesign(design,false)} disabled={busy || !preview}><Download size={15}/>{t('Download', 'डाउनलोड')}</button><button className={secondary} onClick={() => exportDesign(design,true)} disabled={busy || !preview}><Share2 size={15}/>{t('Share', 'शेयर')}</button></div>
    </section>}
    <section className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900 space-y-3"><h2 className="font-bold text-sm">{t('Saved designs', 'सहेजे डिज़ाइन')}</h2>{galleryStatus === 'loading' ? <p role="status" className="text-xs text-slate-500">{t('Loading saved designs…', 'सहेजे डिज़ाइन लोड हो रहे हैं…')}</p> : galleryStatus === 'error' ? <div role="alert" className="space-y-2 text-xs text-rose-600 dark:text-rose-400"><p>{t('Could not load saved designs.', 'सहेजे डिज़ाइन लोड नहीं हुए।')}</p><button className={secondary} onClick={() => loadGallery(design.workspace)}>{t('Retry gallery', 'गैलरी फिर खोलें')}</button></div> : gallery.length === 0 ? <p className="text-xs text-slate-500">{t('No saved designs for this workspace.', 'इस कार्यक्षेत्र में कोई सहेजा डिज़ाइन नहीं है।')}</p> : <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{gallery.map(item => <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-2 space-y-2" key={item.id}><img src={item.thumbnail} alt={t('Saved poster','सहेजा पोस्टर')} className="w-full h-28 object-contain rounded-lg bg-slate-100 dark:bg-slate-950"/><button className={secondary} onClick={() => { if ((design.background || design.instructions || design.headline || design.logo) && !window.confirm(t('Replace the current draft?', 'मौजूदा ड्राफ़्ट बदलें?'))) return; draftEpoch.current++; if (ownVoice.current) { ownVoice.current = false; voice.stopListening(); voice.takeTranscript(); setListening(false); } setDesign(item); setPreset('custom'); setError(''); setMessage(''); }}>{t('Edit', 'बदलें')}</button><div className="flex gap-2 flex-wrap"><button className={secondary} aria-label={t('Download saved design','सहेजा डिज़ाइन डाउनलोड')} onClick={() => exportDesign(item,false)}><Download size={14}/></button><button className={secondary} aria-label={t('Share saved design','सहेजा डिज़ाइन शेयर')} onClick={() => exportDesign(item,true)}><Share2 size={14}/></button><button className={secondary} aria-label={t('Delete saved design','सहेजा डिज़ाइन हटाएं')} onClick={() => remove(item)}><Trash2 size={14}/></button></div></div>)}</div>}</section>
  </fieldset></div>;
};
