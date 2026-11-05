// 모든 데이터는 기기 안에만 저장한다 (localStorage + IndexedDB). 외부 전송 없음.

const LS = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
};

export const KEYS = { draft: 'cw.draft.v1', history: 'cw.history.v1', settings: 'cw.settings.v1' };

export const draftStore = {
  load: () => LS.get(KEYS.draft, null),
  save: (d) => LS.set(KEYS.draft, d),
};

export const DEFAULT_SETTINGS = { fontMode: 'embedded', nameplateWidth: 55, jpgScale: 2.5 };
export const settingsStore = {
  load: () => ({ ...DEFAULT_SETTINGS, ...LS.get(KEYS.settings, {}) }),
  save: (s) => LS.set(KEYS.settings, s),
};

/**
 * 작성 이력. 지금은 localStorage 어댑터 하나.
 * 클라우드 동기화(Google Drive 등)를 붙일 때는 같은 인터페이스(list/add/remove)의
 * 어댑터를 만들어 historyStore를 교체하거나 감싸면 된다.
 */
const MAX_HISTORY = 300;
export const historyStore = {
  list: () => LS.get(KEYS.history, []),
  add(entry) {
    const list = historyStore.list();
    const item = { id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, savedAt: new Date().toISOString(), ...entry };
    const next = [item, ...list].slice(0, MAX_HISTORY);
    LS.set(KEYS.history, next);
    return item;
  },
  remove(id) {
    LS.set(KEYS.history, historyStore.list().filter((h) => h.id !== id));
  },
};

// ── 도장 이미지: IndexedDB (용량이 커서 localStorage 대신) ──
const DB_NAME = 'contract-app';
const STORE = 'stamps';
let dbPromise;
function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}
function tx(mode, fn) {
  return db().then(
    (d) =>
      new Promise((resolve, reject) => {
        const t = d.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        t.oncomplete = () => resolve(req?.result);
        t.onerror = () => reject(t.error);
      })
  );
}
export const STAMP_KEYS = ['seal', 'nameplate', 'ganin'];
export const stampStore = {
  async loadAll() {
    const out = {};
    for (const k of STAMP_KEYS) {
      try {
        out[k] = (await tx('readonly', (s) => s.get(k))) || null;
      } catch {
        out[k] = null;
      }
    }
    return out;
  },
  save: (key, value) => tx('readwrite', (s) => s.put(value, key)),
  remove: (key) => tx('readwrite', (s) => s.delete(key)),
};

/** 브라우저가 저장공간을 임의로 비우지 않도록 요청 (지원 시) */
export function requestPersistence() {
  try {
    navigator.storage?.persist?.();
  } catch {
    /* noop */
  }
}
