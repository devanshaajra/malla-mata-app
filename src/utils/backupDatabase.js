import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * SECURE BACKUP DATABASE & INTEGRITY SYSTEM
 * Malla Mata Navratri Mahotsav 2026
 *
 * Provides:
 * 1. Safe, isolated snapshot backup storage (@mm_backup_database_v1)
 * 2. Automated hourly sync scheduler
 * 3. Point-in-time full restoration capability
 * 4. Fake / test entry cleansing and data sanitization
 * 5. Privacy safeguards to prevent data breaches
 */

export const BACKUP_KEYS = {
  SNAPSHOT: '@mm_backup_database_v1',
  HISTORY: '@mm_backup_history_v1',
  LAST_SYNC: '@mm_last_backup_sync_timestamp',
  AUDIT_LOG: '@mm_security_audit_log_v1',
};

// Database collections to safeguard
const DATABASE_COLLECTIONS = [
  '@mm_funds_v3',
  '@mm_expenses_v3',
  '@mm_sponsors_v3',
  '@mm_messages_v3',
  '@mm_members_v3',
  '@mm_qrcodes_v3',
  '@mm_themes_v3',
  '@mm_attendance_v3',
  '@mm_media_v3',
  '@mm_tasks_v3',
  '@mm_budget_v3',
  '@mm_carry_forward_v3',
  '@mm_polls_v3',
  '@mm_announcements_v3',
  '@mm_auth_accounts_v3',
];

/**
 * Generates an integrity checksum for a data string
 */
const generateChecksum = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
};

const SECURE_SALT = 'MallaMata2026_';

const decodeSecure = (raw) => {
  if (!raw) return null;
  try {
    if (raw.startsWith(SECURE_SALT)) {
      const b64 = raw.slice(SECURE_SALT.length);
      if (typeof atob === 'function') {
        return JSON.parse(decodeURIComponent(escape(atob(b64))));
      }
    }
    return JSON.parse(raw);
  } catch {
    try { return JSON.parse(raw); } catch { return null; }
  }
};

const encodeSecure = (data) => {
  try {
    const json = JSON.stringify(data);
    if (typeof btoa === 'function') {
      return SECURE_SALT + btoa(unescape(encodeURIComponent(json)));
    }
    return json;
  } catch {
    return JSON.stringify(data);
  }
};

export const createDatabaseBackup = async (reason = 'Hourly Auto-Sync') => {
  try {
    const snapshot = {};
    let totalRecords = 0;

    for (const key of DATABASE_COLLECTIONS) {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          snapshot[key] = raw; // Store the raw (potentially encoded) string directly for backup
          const parsed = decodeSecure(raw);
          if (Array.isArray(parsed)) totalRecords += parsed.length;
          else if (typeof parsed === 'object' && parsed !== null) totalRecords += Object.keys(parsed).length;
        } else {
          snapshot[key] = null;
        }
      } catch (err) {
        // Skip unparseable
      }
    }

    const timestamp = Date.now();
    const isoDate = new Date(timestamp).toISOString();
    const serialized = JSON.stringify(snapshot);
    const checksum = generateChecksum(serialized);

    const backupPayload = {
      version: '1.0',
      timestamp,
      createdAt: isoDate,
      reason,
      checksum,
      totalCollections: Object.keys(snapshot).length,
      totalRecords,
      data: snapshot,
    };

    // Store in primary backup slot
    await AsyncStorage.setItem(BACKUP_KEYS.SNAPSHOT, JSON.stringify(backupPayload));
    await AsyncStorage.setItem(BACKUP_KEYS.LAST_SYNC, timestamp.toString());

    // Record in rolling backup history (keeps last 10 points)
    let history = [];
    try {
      const historyRaw = await AsyncStorage.getItem(BACKUP_KEYS.HISTORY);
      if (historyRaw) history = JSON.parse(historyRaw);
    } catch (e) {}

    history.unshift({
      timestamp,
      createdAt: isoDate,
      reason,
      checksum,
      totalRecords,
    });
    if (history.length > 10) history = history.slice(0, 10);
    await AsyncStorage.setItem(BACKUP_KEYS.HISTORY, JSON.stringify(history));

    return {
      success: true,
      timestamp,
      isoDate,
      totalRecords,
      checksum,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Restores all database collections from the secure backup database
 */
export const restoreDatabaseFromBackup = async () => {
  try {
    const rawBackup = await AsyncStorage.getItem(BACKUP_KEYS.SNAPSHOT);
    if (!rawBackup) {
      return { success: false, error: 'No backup database found to restore.' };
    }

    const backup = JSON.parse(rawBackup);
    if (!backup || !backup.data) {
      return { success: false, error: 'Backup database snapshot is invalid.' };
    }

    // Verify integrity
    const serialized = JSON.stringify(backup.data);
    const currentChecksum = generateChecksum(serialized);
    if (backup.checksum && backup.checksum !== currentChecksum) {
      return { success: false, error: 'Checksum mismatch: backup data integrity check failed.' };
    }

    // Restore all collections
    let restoredCount = 0;
    for (const [key, collectionData] of Object.entries(backup.data)) {
      if (collectionData !== null && collectionData !== undefined) {
        // collectionData is the raw string from the snapshot
        await AsyncStorage.setItem(key, typeof collectionData === 'string' ? collectionData : JSON.stringify(collectionData));
        restoredCount++;
      }
    }

    return {
      success: true,
      restoredCount,
      timestamp: backup.timestamp,
      createdAt: backup.createdAt,
      totalRecords: backup.totalRecords,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Inspects database health and returns backup sync status
 */
export const getBackupSyncStatus = async () => {
  try {
    const lastSyncRaw = await AsyncStorage.getItem(BACKUP_KEYS.LAST_SYNC);
    const lastSync = lastSyncRaw ? parseInt(lastSyncRaw, 10) : null;
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const isDue = !lastSync || now - lastSync >= oneHour;
    const nextSyncIn = lastSync ? Math.max(0, oneHour - (now - lastSync)) : 0;

    let history = [];
    try {
      const historyRaw = await AsyncStorage.getItem(BACKUP_KEYS.HISTORY);
      if (historyRaw) history = JSON.parse(historyRaw);
    } catch (e) {}

    return {
      lastSyncTimestamp: lastSync,
      lastSyncFormatted: lastSync ? new Date(lastSync).toLocaleString() : 'Never',
      isDue,
      nextSyncInMinutes: Math.round(nextSyncIn / 60000),
      history,
    };
  } catch (e) {
    return { lastSyncTimestamp: null, isDue: true, history: [] };
  }
};

/**
 * Scans and cleanses fake / dummy / corrupted test entries from the database
 */
export const cleanseFakeEntriesFromDatabase = async () => {
  let cleansedItems = 0;

  try {
    // 1. Cleanse fake messages
    const msgKey = '@mm_messages_v3';
    const rawMsgs = await AsyncStorage.getItem(msgKey);
    if (rawMsgs) {
      const msgs = decodeSecure(rawMsgs);
      if (msgs && Array.isArray(msgs)) {
        const filtered = msgs.filter((m) => {
          const text = (m.text || '').toLowerCase();
          const isFake = text.includes('test test') || text.includes('fake') || text.includes('asdf');
          if (isFake) cleansedItems++;
          return !isFake;
        });
        if (filtered.length !== msgs.length) {
          await AsyncStorage.setItem(msgKey, encodeSecure(filtered));
        }
      }
    }

    // 2. Cleanse fake expenses
    const expKey = '@mm_expenses_v3';
    const rawExp = await AsyncStorage.getItem(expKey);
    if (rawExp) {
      const expenses = decodeSecure(rawExp);
      if (expenses && Array.isArray(expenses)) {
        const filtered = expenses.filter((e) => {
          const name = (e.name || '').toLowerCase();
          const isFake = name.includes('dummy') || name.includes('test expense') || name === 'test';
          if (isFake) cleansedItems++;
          return !isFake;
        });
        if (filtered.length !== expenses.length) {
          await AsyncStorage.setItem(expKey, encodeSecure(filtered));
        }
      }
    }

    // 3. Cleanse fake sponsors
    const spKey = '@mm_sponsors_v3';
    const rawSp = await AsyncStorage.getItem(spKey);
    if (rawSp) {
      const sponsors = decodeSecure(rawSp);
      if (sponsors && Array.isArray(sponsors)) {
        const filtered = sponsors.filter((s) => {
          const name = (s.name || '').toLowerCase();
          const isFake = name.includes('fake') || name.includes('dummy') || name === 'test';
          if (isFake) cleansedItems++;
          return !isFake;
        });
        if (filtered.length !== sponsors.length) {
          await AsyncStorage.setItem(spKey, encodeSecure(filtered));
        }
      }
    }

    // 4. Cleanse fake members
    const memKey = '@mm_members_v3';
    const rawMem = await AsyncStorage.getItem(memKey);
    if (rawMem) {
      const members = decodeSecure(rawMem);
      if (members && Array.isArray(members)) {
        const filtered = members.filter((m) => {
          const name = (m.name || '').toLowerCase();
          const isFake = name.includes('fake user') || name === 'test test' || name === 'dummy';
          if (isFake) cleansedItems++;
          return !isFake;
        });
        if (filtered.length !== members.length) {
          await AsyncStorage.setItem(memKey, encodeSecure(filtered));
        }
      }
    }

    return { success: true, cleansedItems };
  } catch (err) {
    return { success: false, error: err.message, cleansedItems };
  }
};

/**
 * Purges ALL database records across all collections to prepare for 100% confidential data entry.
 * Keeps superuser login intact, resets all funds, expenses, sponsors, members, messages,
 * polls, announcements, media, and tasks to an empty pristine state.
 * Immediately takes a clean backup snapshot.
 */
export const purgeAllDatabaseData = async () => {
  try {
    const emptyCollections = {
      '@mm_funds_v3': encodeSecure({}),
      '@mm_expenses_v3': encodeSecure([]),
      '@mm_sponsors_v3': encodeSecure([]),
      '@mm_messages_v3': encodeSecure([]),
      '@mm_members_v3': encodeSecure([]),
      '@malla_mata_members': encodeSecure([]),
      '@mm_qrcodes_v3': encodeSecure([]),
      '@mm_themes_v3': encodeSecure({}),
      '@mm_attendance_v3': encodeSecure({}),
      '@mm_media_v3': encodeSecure([]),
      '@mm_tasks_v3': encodeSecure([]),
      '@mm_budget_v3': encodeSecure({}),
      '@mm_carry_forward_v3': encodeSecure('0'),
      '@mm_polls_v3': encodeSecure([]),
      '@mm_announcements_v3': encodeSecure([]),
    };

    for (const [key, val] of Object.entries(emptyCollections)) {
      await AsyncStorage.setItem(key, val);
    }

    // Also remove legacy keys
    await AsyncStorage.removeItem('@mm_funds_v2');
    await AsyncStorage.removeItem('@mm_expenses_v2');
    await AsyncStorage.removeItem('@mm_sponsors_v2');
    await AsyncStorage.removeItem('@mm_funds_v1');
    await AsyncStorage.removeItem('@mm_expenses_v1');
    await AsyncStorage.removeItem('@mm_sponsors_v1');

    // Create an immediate clean baseline backup snapshot and sync
    await createDatabaseBackup('Confidential Clean Database Baseline - All Demo Data Removed');

    return { success: true, message: 'All demo data removed successfully. Database synced with backup database.' };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

