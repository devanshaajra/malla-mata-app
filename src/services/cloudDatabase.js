import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_FIREBASE_DB_URL,
  DB_STORAGE_KEYS,
  DB_COLLECTIONS,
} from '../config/databaseConfig';

/**
 * Universal Cloud Database Service
 * Provides real-time read, write, sync, and streaming
 * between Web, Android APK, and iOS via Firebase Realtime Database REST API.
 */

const TIMEOUT_MS = 8000;
let cachedActiveUrl = null;

// Normalize Firebase URL: removes trailing slash and .json
export const normalizeDatabaseUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return DEFAULT_FIREBASE_DB_URL;
  let clean = rawUrl.trim();
  if (clean.endsWith('/')) clean = clean.slice(0, -1);
  if (clean.endsWith('.json')) clean = clean.slice(0, -5);
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = `https://${clean}`;
  }
  return clean;
};

const CANDIDATE_URLS = [
  'https://malla-mata-2026-default-rtdb.firebaseio.com',
  'https://malla-mata-2026-default-rtdb.asia-southeast1.firebasedatabase.app',
  'https://malla-mata-2026-default-rtdb.europe-west1.firebasedatabase.app',
];

// Retrieve currently active Firebase URL (checks AsyncStorage first, then resolves active candidate)
export const getActiveDatabaseUrl = async () => {
  if (cachedActiveUrl) return cachedActiveUrl;
  try {
    const customUrl = await AsyncStorage.getItem(DB_STORAGE_KEYS.CUSTOM_FIREBASE_URL);
    if (customUrl && customUrl.trim()) {
      cachedActiveUrl = normalizeDatabaseUrl(customUrl);
      return cachedActiveUrl;
    }
  } catch (e) {
    // Fallback to default
  }

  // Auto-detect active regional database if created in Singapore / Asia or US
  cachedActiveUrl = DEFAULT_FIREBASE_DB_URL;
  return cachedActiveUrl;
};

// Probe all common candidate locations to find the active database for project malla-mata-2026
export const detectActiveFirebaseUrl = async () => {
  for (const candidate of CANDIDATE_URLS) {
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 2500) : null;
      const res = await fetch(`${candidate}/malla_mata_2026.json`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller ? controller.signal : undefined,
      });
      if (timeoutId) clearTimeout(timeoutId);
      if (res.status !== 404) {
        cachedActiveUrl = candidate;
        await AsyncStorage.setItem(DB_STORAGE_KEYS.CUSTOM_FIREBASE_URL, candidate);
        return candidate;
      }
    } catch (e) {}
  }
  return DEFAULT_FIREBASE_DB_URL;
};

// Update active Firebase URL and save to AsyncStorage
export const setActiveDatabaseUrl = async (newUrl) => {
  const normalized = normalizeDatabaseUrl(newUrl);
  cachedActiveUrl = normalized;
  try {
    await AsyncStorage.setItem(DB_STORAGE_KEYS.CUSTOM_FIREBASE_URL, normalized);
    return { success: true, url: normalized };
  } catch (e) {
    return { success: false, error: e.message, url: normalized };
  }
};

// Test connectivity to a Firebase Realtime Database URL
export const testDatabaseConnection = async (testUrl) => {
  const url = normalizeDatabaseUrl(testUrl || await getActiveDatabaseUrl());
  const probeUrl = `${url}/malla_mata_2026/health.json`;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 6000) : null;

  try {
    // Probe read or write
    const res = await fetch(probeUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller ? controller.signal : undefined,
    });
    if (timeoutId) clearTimeout(timeoutId);

    if (res.ok) {
      return { success: true, status: res.status, url };
    }
    // 401: database exists but permissions require rule adjustment
    if (res.status === 401) {
      return {
        success: false,
        status: 401,
        url,
        error: 'Permission Denied: In Firebase console > Realtime Database > Rules, set ".read": true, ".write": true for test mode.',
      };
    }
    if (res.status === 404 && (!testUrl || testUrl === DEFAULT_FIREBASE_DB_URL)) {
      const detected = await detectActiveFirebaseUrl();
      if (detected && detected !== url) {
        return await testDatabaseConnection(detected);
      }
      return {
        success: false,
        status: 404,
        url,
        error: 'Database not created yet: In Firebase console > Databases and storage > Realtime Database, click "Create Database".',
      };
    }
    return { success: false, status: res.status, url, error: `HTTP ${res.status}: ${res.statusText}` };
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    return { success: false, url, error: err.message || 'Connection timed out or network error' };
  }
};

/**
 * Fetch a single collection from Firebase
 * e.g. collectionKey = 'expenses' -> GET ${url}/malla_mata_2026/expenses.json
 */
export const fetchCollectionFromCloud = async (collectionKey) => {
  const baseUrl = await getActiveDatabaseUrl();
  const endpoint = `${baseUrl}/malla_mata_2026/${collectionKey}.json`;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null;

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller ? controller.signal : undefined,
    });
    if (timeoutId) clearTimeout(timeoutId);

    if (!res.ok) {
      return { success: false, status: res.status, data: null };
    }
    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    return { success: false, error: err.message, data: null };
  }
};

/**
 * Fetch ALL database collections in ONE network call!
 * GET ${url}/malla_mata_2026.json
 */
export const fetchAllFromCloud = async () => {
  const baseUrl = await getActiveDatabaseUrl();
  const endpoint = `${baseUrl}/malla_mata_2026.json`;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null;

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller ? controller.signal : undefined,
    });
    if (timeoutId) clearTimeout(timeoutId);

    if (!res.ok) {
      return { success: false, status: res.status, data: null, url: baseUrl };
    }
    const data = await res.json();
    const timestamp = Date.now();
    try {
      await AsyncStorage.setItem(DB_STORAGE_KEYS.LAST_CLOUD_FETCH, timestamp.toString());
    } catch (e) {}

    return { success: true, data, timestamp, url: baseUrl };
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    return { success: false, error: err.message, data: null, url: baseUrl };
  }
};

/**
 * Save / Update a single collection to Firebase
 * PUT ${url}/malla_mata_2026/${collectionKey}.json
 */
export const saveCollectionToCloud = async (collectionKey, data) => {
  const baseUrl = await getActiveDatabaseUrl();
  const endpoint = `${baseUrl}/malla_mata_2026/${collectionKey}.json`;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null;

  try {
    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data === undefined ? null : data),
      signal: controller ? controller.signal : undefined,
    });
    if (timeoutId) clearTimeout(timeoutId);

    if (!res.ok) {
      return { success: false, status: res.status };
    }
    try {
      await AsyncStorage.setItem(DB_STORAGE_KEYS.LAST_CLOUD_PUSH, Date.now().toString());
    } catch (e) {}
    return { success: true };
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    return { success: false, error: err.message };
  }
};

/**
 * Push entire database snapshot to Firebase
 * PUT ${url}/malla_mata_2026.json
 */
export const saveFullSnapshotToCloud = async (fullSnapshot) => {
  const baseUrl = await getActiveDatabaseUrl();
  const endpoint = `${baseUrl}/malla_mata_2026.json`;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null;

  try {
    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fullSnapshot),
      signal: controller ? controller.signal : undefined,
    });
    if (timeoutId) clearTimeout(timeoutId);

    if (!res.ok) {
      return { success: false, status: res.status };
    }
    const timestamp = Date.now();
    try {
      await AsyncStorage.setItem(DB_STORAGE_KEYS.LAST_CLOUD_PUSH, timestamp.toString());
    } catch (e) {}
    return { success: true, timestamp };
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    return { success: false, error: err.message };
  }
};

/**
 * Subscribe to real-time events from Firebase Realtime Database
 * Uses Server-Sent Events (SSE) when available, along with periodic poll fallback
 */
export const subscribeToCloudDatabase = (onUpdate) => {
  let eventSource = null;
  let pollInterval = null;
  let isClosed = false;

  const initStream = async () => {
    const baseUrl = await getActiveDatabaseUrl();

    // 1. SSE Stream on Web / Browsers
    if (typeof window !== 'undefined' && typeof window.EventSource !== 'undefined') {
      try {
        const streamUrl = `${baseUrl}/malla_mata_2026.json`;
        eventSource = new window.EventSource(streamUrl);

        eventSource.addEventListener('put', (event) => {
          if (isClosed) return;
          try {
            const parsed = JSON.parse(event.data);
            if (parsed && typeof onUpdate === 'function') {
              onUpdate(parsed.path, parsed.data);
            }
          } catch (e) {}
        });

        eventSource.addEventListener('patch', (event) => {
          if (isClosed) return;
          try {
            const parsed = JSON.parse(event.data);
            if (parsed && typeof onUpdate === 'function') {
              onUpdate(parsed.path, parsed.data);
            }
          } catch (e) {}
        });

        eventSource.onerror = () => {
          // EventSource will auto-reconnect
        };
      } catch (err) {
        // SSE not supported or blocked
      }
    }

    // 2. Background polling fallback every 15s to ensure continuous sync
    pollInterval = setInterval(async () => {
      if (isClosed) return;
      try {
        const result = await fetchAllFromCloud();
        if (result.success && result.data && typeof onUpdate === 'function') {
          onUpdate('/', result.data);
        }
      } catch (e) {}
    }, 15000);
  };

  initStream();

  return () => {
    isClosed = true;
    if (pollInterval) clearInterval(pollInterval);
    if (eventSource) {
      try {
        eventSource.close();
      } catch (e) {}
    }
  };
};
