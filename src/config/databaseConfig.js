/**
 * CLOUD DATABASE CONFIGURATION
 * Malla Mata Navratri Mahotsav 2026
 *
 * Configures the Firebase Realtime Database backend for real-time
 * synchronization between Android APK, iOS, and Web deployment.
 */

// Default Firebase Realtime Database URL
// Can be customized dynamically in ProfileScreen or via AsyncStorage
export const DEFAULT_FIREBASE_DB_URL = 'https://malla-mata-2026-default-rtdb.firebaseio.com';

// Local storage key for custom user-configured Firebase Database URL
export const DB_STORAGE_KEYS = {
  CUSTOM_FIREBASE_URL: '@mm_custom_firebase_url_v1',
  LAST_CLOUD_FETCH: '@mm_last_cloud_fetch_timestamp',
  LAST_CLOUD_PUSH: '@mm_last_cloud_push_timestamp',
  CLOUD_DB_HEALTH: '@mm_cloud_db_health_status',
};

// Database collections mapped to Firebase paths
export const DB_COLLECTIONS = {
  FUNDS: 'funds',
  EXPENSES: 'expenses',
  SPONSORS: 'sponsors',
  MESSAGES: 'messages',
  MEMBERS: 'members',
  QR_CODES: 'qrCodes',
  THEMES: 'themes',
  ATTENDANCE: 'attendance',
  MEDIA: 'media',
  TASKS: 'tasks',
  POLLS: 'polls',
  ANNOUNCEMENTS: 'announcements',
  CARRY_FORWARD: 'carryForward',
  USERS: 'users',
};

// Step-by-step setup instructions for the user
export const FIREBASE_SETUP_GUIDE = [
  {
    step: 1,
    title: 'Create Free Firebase Project',
    desc: 'Go to console.firebase.google.com and click "Add project". Name it e.g. "malla-mata-2026".',
  },
  {
    step: 2,
    title: 'Create Realtime Database',
    desc: 'In left sidebar, click "Build" → "Realtime Database" → "Create Database". Select region and choose "Start in test mode".',
  },
  {
    step: 3,
    title: 'Verify Rules (Test Mode)',
    desc: 'In the Rules tab, ensure rules allow read and write: { "rules": { ".read": true, ".write": true } } and click Publish.',
  },
  {
    step: 4,
    title: 'Copy & Paste Database URL',
    desc: 'Copy the URL displayed at the top (e.g. https://your-project-default-rtdb.firebaseio.com) and paste it below.',
  },
];
