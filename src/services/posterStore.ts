import type { BusinessId } from '../types/database';
import type { PosterReference } from '../server/posterProvider';

export interface PosterDesign {
  id: string;
  workspace: BusinessId;
  customName: string;
  instructions: string;
  headline: string;
  details: string;
  width: number;
  height: number;
  textColor: string;
  layout: 'top' | 'center' | 'bottom';
  panelColor?: string;
  panelOpacity?: number;
  backgroundFit?: 'cover' | 'contain';
  logoPosition?: 'left' | 'right';
  logoScale?: number;
  background: string;
  logo: string;
  references: PosterReference[];
  thumbnail: string;
  updatedAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('GopalAI_Poster_Studio', 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('designs')) req.result.createObjectStore('designs', { keyPath: 'id' }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Could not open design gallery.'));
    req.onblocked = () => reject(new Error('Design gallery is blocked by another tab.'));
  });
}

async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore, done: (value: T) => void) => void): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    let value: T;
    const tx = db.transaction('designs', mode);
    tx.oncomplete = () => { db.close(); resolve(value); };
    tx.onerror = () => { db.close(); reject(tx.error || new Error('Gallery operation failed.')); };
    tx.onabort = () => { db.close(); reject(tx.error || new Error('Gallery operation was cancelled.')); };
    try { action(tx.objectStore('designs'), result => { value = result; }); } catch (error) { db.close(); reject(error); }
  });
}
export async function listPosters(workspace: BusinessId): Promise<PosterDesign[]> {
  const all = await transaction<PosterDesign[]>('readonly', (store, done) => { const req = store.getAll(); req.onsuccess = () => done(req.result); });
  return all.filter(x => x.workspace === workspace).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function savePoster(design: PosterDesign): Promise<void> {
  await transaction<void>('readwrite', (store, done) => {
    const existing = store.get(design.id);
    existing.onsuccess = () => {
      if (existing.result && existing.result.workspace !== design.workspace) { store.transaction.abort(); return; }
      const req = store.put(design); req.onsuccess = () => done();
    };
  });
}
export async function deletePoster(id: string, workspace: BusinessId): Promise<void> {
  await transaction<void>('readwrite', (store, done) => {
    const req = store.get(id);
    req.onsuccess = () => {
      if (!req.result || req.result.workspace !== workspace) { done(); return; }
      const del = store.delete(id); del.onsuccess = () => done();
    };
  });
}
