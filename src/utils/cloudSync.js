import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SYNC_TOPIC = 'https://ntfy.sh/malla_mata_navratri_2026_sync_live';
const CLIENT_ID_KEY = '@mm_device_client_id_v1';

let cachedClientId = null;

export const getClientId = async () => {
  if (cachedClientId) return cachedClientId;
  try {
    let id = await AsyncStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = `client_${Platform.OS}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      await AsyncStorage.setItem(CLIENT_ID_KEY, id);
    }
    cachedClientId = id;
    return id;
  } catch (e) {
    cachedClientId = `client_${Date.now()}_temp`;
    return cachedClientId;
  }
};

/**
 * Broadcast an update to all connected platforms (Android, iOS, Web)
 * Low payload, battery-efficient, fire-and-forget
 */
export const broadcastSync = async (key) => {
  try {
    const senderId = await getClientId();
    // Privacy safeguard: only send opaque synchronization ping, never send confidential user data
    const payload = JSON.stringify({
      key,
      senderId,
      timestamp: Date.now(),
    });

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 4000) : null;

    fetch(SYNC_TOPIC, {
      method: 'POST',
      body: payload,
      headers: {
        'Title': `SYNC_${key}`,
        'Priority': 'low',
        'Tags': 'arrows_counterclockwise',
      },
      signal: controller ? controller.signal : undefined,
    })
      .then(() => {
        if (timeoutId) clearTimeout(timeoutId);
      })
      .catch(() => {});
  } catch (err) {
    // Non-blocking
  }
};

/**
 * Subscribe to real-time events across devices
 * Uses EventSource (SSE) when available, and fallback periodic poll
 */
export const subscribeToSync = (onUpdate) => {
  let eventSource = null;
  let pollInterval = null;
  let isClosed = false;

  const handleRawMessage = async (msgString) => {
    try {
      if (!msgString) return;
      const myId = await getClientId();
      const parsed = JSON.parse(msgString);
      if (parsed && parsed.senderId && parsed.senderId === myId) {
        // Ignore echo from self
        return;
      }
      if (parsed && parsed.key) {
        onUpdate(parsed.key, parsed.data);
      }
    } catch (e) {
      // Ignored for malformed ping
    }
  };

  // 1. If EventSource is available in environment (Browsers, Web, Safari iOS)
  if (typeof window !== 'undefined' && typeof window.EventSource !== 'undefined') {
    try {
      eventSource = new window.EventSource(`${SYNC_TOPIC}/sse`);
      eventSource.onmessage = (event) => {
        if (isClosed) return;
        try {
          const envelope = JSON.parse(event.data);
          if (envelope.event === 'message' && envelope.message) {
            handleRawMessage(envelope.message);
          }
        } catch (e) {}
      };
      eventSource.onerror = () => {
        // Will auto reconnect in browser
      };
    } catch (err) {
      console.warn('EventSource initialization note:', err);
    }
  }

  // 2. Fallback periodic check every 12 seconds (battery & data friendly)
  // Queries recent 30 seconds of events
  let lastCheckedTime = Math.floor(Date.now() / 1000) - 60;
  const pollRecent = async () => {
    if (isClosed) return;
    try {
      const nowSec = Math.floor(Date.now() / 1000);
      const url = `${SYNC_TOPIC}/json?poll=1&since=${lastCheckedTime}`;
      lastCheckedTime = nowSec;

      const resp = await fetch(url);
      if (!resp.ok) return;
      const text = await resp.text();
      const lines = text.trim().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const item = JSON.parse(line);
          if (item.event === 'message' && item.message) {
            await handleRawMessage(item.message);
          }
        } catch (e) {}
      }
    } catch (e) {}
  };

  // Run initial poll once after 1s
  const initTimer = setTimeout(pollRecent, 1000);

  // Periodic poll every 12 seconds
  pollInterval = setInterval(pollRecent, 12000);

  return () => {
    isClosed = true;
    clearTimeout(initTimer);
    if (pollInterval) clearInterval(pollInterval);
    if (eventSource) {
      try {
        eventSource.close();
      } catch (e) {}
    }
  };
};
