import type {
  ImageCreatorMode,
  ImageCreatorRatio,
} from '@/lib/image-creator/types';

export const IMAGE_CREATOR_DRAFT_STORAGE_VERSION = 1;
export const IMAGE_CREATOR_DRAFT_STORAGE_KEY = 'jevailab:image-creator:draft';
export const IMAGE_CREATOR_DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const IMAGE_CREATOR_REFERENCE_DB_NAME = 'jevailab-image-creator';
export const IMAGE_CREATOR_REFERENCE_STORE_NAME = 'references';
export const IMAGE_CREATOR_REFERENCE_KEY = 'pending-reference';

const modes: readonly ImageCreatorMode[] = ['1K_SD', '2K_HD'];
const ratios: readonly ImageCreatorRatio[] = [
  'AUTO',
  '9:16',
  '2:3',
  '3:4',
  '1:1',
  '4:3',
  '3:2',
  '16:9',
  '21:9',
];

export type StoredImageCreatorDraft = {
  version: typeof IMAGE_CREATOR_DRAFT_STORAGE_VERSION;
  templateId: string | null;
  prompt: string;
  mode: ImageCreatorMode;
  ratio: ImageCreatorRatio;
  count: number;
  consentAccepted: boolean;
  query: string;
  category: string;
  pendingGenerate: boolean;
  updatedAt: number;
};

export type StoredReferenceFile = {
  name: string;
  type: string;
  size: number;
  lastModified: number;
  blob: Blob;
};

export function parseStoredImageCreatorDraft(
  serialized: string | null,
  now = Date.now()
): StoredImageCreatorDraft | null {
  if (!serialized) return null;

  try {
    const value: unknown = JSON.parse(serialized);
    if (!isRecord(value)) return null;
    if (value.version !== IMAGE_CREATOR_DRAFT_STORAGE_VERSION) return null;
    if (
      typeof value.updatedAt !== 'number' ||
      !Number.isFinite(value.updatedAt) ||
      value.updatedAt > now + 60_000 ||
      now - value.updatedAt > IMAGE_CREATOR_DRAFT_MAX_AGE_MS
    ) {
      return null;
    }
    if (value.templateId !== null && typeof value.templateId !== 'string') {
      return null;
    }
    if (
      typeof value.prompt !== 'string' ||
      value.prompt.length > 1000 ||
      typeof value.mode !== 'string' ||
      !modes.includes(value.mode as ImageCreatorMode) ||
      typeof value.ratio !== 'string' ||
      !ratios.includes(value.ratio as ImageCreatorRatio) ||
      typeof value.count !== 'number' ||
      !Number.isInteger(value.count) ||
      value.count < 1 ||
      value.count > 9 ||
      typeof value.consentAccepted !== 'boolean' ||
      typeof value.query !== 'string' ||
      typeof value.category !== 'string' ||
      typeof value.pendingGenerate !== 'boolean'
    ) {
      return null;
    }

    return {
      version: IMAGE_CREATOR_DRAFT_STORAGE_VERSION,
      templateId: value.templateId,
      prompt: value.prompt,
      mode: value.mode as ImageCreatorMode,
      ratio: value.ratio as ImageCreatorRatio,
      count: value.count,
      consentAccepted: value.consentAccepted,
      query: value.query,
      category: value.category,
      pendingGenerate: value.pendingGenerate,
      updatedAt: value.updatedAt,
    };
  } catch {
    return null;
  }
}

export function loadImageCreatorDraft(): StoredImageCreatorDraft | null {
  if (typeof window === 'undefined') return null;
  return parseStoredImageCreatorDraft(
    window.localStorage.getItem(IMAGE_CREATOR_DRAFT_STORAGE_KEY)
  );
}

export function saveImageCreatorDraft(
  draft: Omit<StoredImageCreatorDraft, 'version' | 'updatedAt'>,
  updatedAt = Date.now()
) {
  if (typeof window === 'undefined') return;
  const value: StoredImageCreatorDraft = {
    ...draft,
    version: IMAGE_CREATOR_DRAFT_STORAGE_VERSION,
    updatedAt,
  };
  try {
    window.localStorage.setItem(
      IMAGE_CREATOR_DRAFT_STORAGE_KEY,
      JSON.stringify(value)
    );
  } catch {
    // Storage can be unavailable in privacy modes. The editor remains usable.
  }
}

export function clearImageCreatorDraft() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(IMAGE_CREATOR_DRAFT_STORAGE_KEY);
  } catch {
    // Nothing else is required when storage is unavailable.
  }
}

export async function saveImageCreatorReference(file: File) {
  if (typeof indexedDB === 'undefined') return;
  const db = await openReferenceDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(
      IMAGE_CREATOR_REFERENCE_STORE_NAME,
      'readwrite'
    );
    transaction.objectStore(IMAGE_CREATOR_REFERENCE_STORE_NAME).put(
      {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        blob: file,
      } satisfies StoredReferenceFile,
      IMAGE_CREATOR_REFERENCE_KEY
    );
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('Unable to save reference image.'));
  });
  db.close();
}

export async function loadImageCreatorReference(): Promise<File | null> {
  if (typeof indexedDB === 'undefined') return null;
  const db = await openReferenceDatabase();
  const value = await new Promise<StoredReferenceFile | undefined>(
    (resolve, reject) => {
      const transaction = db.transaction(
        IMAGE_CREATOR_REFERENCE_STORE_NAME,
        'readonly'
      );
      const request = transaction
        .objectStore(IMAGE_CREATOR_REFERENCE_STORE_NAME)
        .get(IMAGE_CREATOR_REFERENCE_KEY);
      request.onsuccess = () =>
        resolve(request.result as StoredReferenceFile | undefined);
      request.onerror = () =>
        reject(request.error ?? new Error('Unable to load reference image.'));
    }
  );
  db.close();
  if (
    !value ||
    typeof value.name !== 'string' ||
    typeof value.type !== 'string' ||
    typeof value.size !== 'number' ||
    typeof value.lastModified !== 'number' ||
    !(value.blob instanceof Blob)
  ) {
    return null;
  }
  return new File([value.blob], value.name, {
    type: value.type,
    lastModified: value.lastModified,
  });
}

export async function clearImageCreatorReference() {
  if (typeof indexedDB === 'undefined') return;
  const db = await openReferenceDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(
      IMAGE_CREATOR_REFERENCE_STORE_NAME,
      'readwrite'
    );
    transaction
      .objectStore(IMAGE_CREATOR_REFERENCE_STORE_NAME)
      .delete(IMAGE_CREATOR_REFERENCE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(
        transaction.error ?? new Error('Unable to clear reference image.')
      );
  });
  db.close();
}

function openReferenceDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IMAGE_CREATOR_REFERENCE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (
        !request.result.objectStoreNames.contains(
          IMAGE_CREATOR_REFERENCE_STORE_NAME
        )
      ) {
        request.result.createObjectStore(IMAGE_CREATOR_REFERENCE_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Unable to open draft storage.'));
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
