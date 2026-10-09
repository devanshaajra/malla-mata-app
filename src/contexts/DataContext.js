import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME_DAYS, AARTI_DATES, DEFAULT_ADMIN_CONTROLS } from '../utils/constants';
import { broadcastSync, subscribeToSync } from '../utils/cloudSync';
import {
  createDatabaseBackup,
  restoreDatabaseFromBackup,
  getBackupSyncStatus,
  cleanseFakeEntriesFromDatabase,
  purgeAllDatabaseData,
} from '../utils/backupDatabase';

const DataContext = createContext(null);

const KEYS = {
  FUNDS: '@mm_funds_v3',
  EXPENSES: '@mm_expenses_v3',
  SPONSORS: '@mm_sponsors_v3',
  MESSAGES: '@mm_messages_v3',
  MEMBERS: '@mm_members_v3',
  QR_CODES: '@mm_qrcodes_v3',
  THEMES: '@mm_themes_v3',
  ATTENDANCE: '@mm_attendance_v3',
  MEDIA: '@mm_media_v3',
  TASKS: '@mm_tasks_v3',
  BUDGET: '@mm_budget_v3',
  CARRY_FORWARD: '@mm_carry_forward_v3',
  POLLS: '@mm_polls_v3',
  ANNOUNCEMENTS: '@mm_announcements_v3',
};

// ── Secure Data Encoding Layer ──
// Obfuscates data before writing to AsyncStorage to protect confidential information
const SECURE_SALT = 'MallaMata2026_';

const encodeSecure = (data) => {
  try {
    const json = JSON.stringify(data);
    // Base64-encode with salt prefix for obfuscation
    if (typeof btoa === 'function') {
      return SECURE_SALT + btoa(unescape(encodeURIComponent(json)));
    }
    // Node/RN fallback: store as-is with marker
    return json;
  } catch {
    return JSON.stringify(data);
  }
};

const decodeSecure = (raw) => {
  if (!raw) return null;
  try {
    // Check if data was encoded with our secure layer
    if (raw.startsWith(SECURE_SALT)) {
      const b64 = raw.slice(SECURE_SALT.length);
      if (typeof atob === 'function') {
        return JSON.parse(decodeURIComponent(escape(atob(b64))));
      }
    }
    // Fallback: try plain JSON parse (for backward compatibility with existing data)
    return JSON.parse(raw);
  } catch {
    try { return JSON.parse(raw); } catch { return null; }
  }
};

// Empty defaults — user adds their own confidential data
const EMPTY_FUNDS = {};
const EMPTY_EXPENSES = [];
const EMPTY_SPONSORS = [];
const EMPTY_MEMBERS = [];
const EMPTY_THEMES = {};
const EMPTY_MEDIA = [];
const EMPTY_MESSAGES = [];
const EMPTY_TASKS = [];
const EMPTY_POLLS = [];
const EMPTY_ANNOUNCEMENTS = [];

export function DataProvider({ children }) {
  const [funds, setFunds] = useState({});
  const [expenses, setExpenses] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [qrCodes, setQrCodes] = useState([]);
  const [themes, setThemes] = useState({});
  const [attendance, setAttendance] = useState({});
  const [media, setMedia] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [polls, setPolls] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [carryForwardBalance, setCarryForwardBalance] = useState('0');
  const [loaded, setLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState({
    lastSynced: new Date().toISOString(),
    isSyncing: false,
    platform: 'Android • iOS • Web',
  });

  const [backupStatus, setBackupStatus] = useState(null);

  useEffect(() => {
    loadAll();

    // 1. Cross-platform real-time sync listener for Web & Multi-Tab sessions
    let bc = null;
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      try {
        bc = new BroadcastChannel('malla_mata_cross_platform_sync');
        bc.onmessage = (event) => {
          if (event.data?.action === 'SYNC_ALL') {
            loadAll();
          }
        };
      } catch (e) {}
    }

    // 2. Real-Time Cloud Sync across Android APK, iOS and Web Custom Domain
    const unsubscribeCloud = subscribeToSync(async (incomingKey, incomingData) => {
      if (!incomingKey || incomingData === undefined) return;
      try {
        await AsyncStorage.setItem(incomingKey, encodeSecure(incomingData));
        if (incomingKey === KEYS.MEMBERS) {
          await AsyncStorage.setItem('@malla_mata_members', encodeSecure(incomingData));
        }

        if (incomingKey === KEYS.FUNDS) setFunds(incomingData);
        else if (incomingKey === KEYS.EXPENSES) setExpenses(incomingData);
        else if (incomingKey === KEYS.SPONSORS) setSponsors(incomingData);
        else if (incomingKey === KEYS.MEMBERS) setMembers(incomingData);
        else if (incomingKey === KEYS.THEMES) setThemes(incomingData);
        else if (incomingKey === KEYS.ATTENDANCE) setAttendance(incomingData);
        else if (incomingKey === KEYS.MEDIA) setMedia(incomingData);
        else if (incomingKey === KEYS.TASKS) setTasks(incomingData);
        else if (incomingKey === KEYS.POLLS) setPolls(incomingData);
        else if (incomingKey === KEYS.ANNOUNCEMENTS) setAnnouncements(incomingData);
        else if (incomingKey === KEYS.CARRY_FORWARD) setCarryForwardBalance(incomingData);

        setSyncStatus(prev => ({
          ...prev,
          lastSynced: new Date().toISOString(),
          cloudActive: true,
        }));
      } catch (err) {
        console.warn('Real-time sync apply error:', err);
      }
    });

    // 3. Hourly Database Backup Synchronization System & Integrity Protection
    let backupTimer = null;
    let handleFocusOrVisibility = null;

    const initBackupSystem = async () => {
      try {
        // One-time automatic purge migration for confidential database mode
        const CONFIDENTIAL_DB_INITIALIZED_KEY = '@mm_confidential_db_initialized_v4';
        const wasInitialized = await AsyncStorage.getItem(CONFIDENTIAL_DB_INITIALIZED_KEY);
        if (!wasInitialized) {
          await purgeAllDatabaseData();
          await AsyncStorage.setItem(CONFIDENTIAL_DB_INITIALIZED_KEY, 'true');
        }

        await cleanseFakeEntriesFromDatabase();

        const status = await getBackupSyncStatus();
        setBackupStatus(status);
        if (status.isDue) {
          await createDatabaseBackup('Automated Hourly Startup Sync');
          const updatedStatus = await getBackupSyncStatus();
          setBackupStatus(updatedStatus);
        }

        // Schedule automated sync every 1 hour (3,600,000 ms)
        backupTimer = setInterval(async () => {
          await createDatabaseBackup('Automated Scheduled Hourly Sync');
          const st = await getBackupSyncStatus();
          setBackupStatus(st);
        }, 60 * 60 * 1000);

        // Web & App Foreground resume check: if tab was inactive and 1 hour passed, sync immediately
        handleFocusOrVisibility = async () => {
          try {
            const st = await getBackupSyncStatus();
            if (st.isDue) {
              await createDatabaseBackup('Automated Hourly Resumed Sync');
              const refreshed = await getBackupSyncStatus();
              setBackupStatus(refreshed);
            } else {
              setBackupStatus(st);
            }
          } catch (e) {}
        };

        if (typeof window !== 'undefined') {
          window.addEventListener('focus', handleFocusOrVisibility);
          if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', handleFocusOrVisibility);
          }
        }
      } catch (e) {
        console.warn('Backup system initialization:', e);
      }
    };

    initBackupSystem();

    return () => {
      if (bc) { try { bc.close(); } catch (e) {} }
      if (unsubscribeCloud) unsubscribeCloud();
      if (backupTimer) clearInterval(backupTimer);
      if (typeof window !== 'undefined' && handleFocusOrVisibility) {
        window.removeEventListener('focus', handleFocusOrVisibility);
        if (typeof document !== 'undefined') {
          document.removeEventListener('visibilitychange', handleFocusOrVisibility);
        }
      }
    };
  }, []);

  const loadAll = async () => {
    try {
      const keys = Object.values(KEYS);
      const results = await AsyncStorage.multiGet(keys);
      const map = {};
      results.forEach(([k, v]) => {
        try {
          map[k] = v ? decodeSecure(v) : null;
        } catch (err) {
          console.warn(`Safe recovery: error parsing ${k}`, err);
          map[k] = null;
        }
      });

      // Chat retention: auto delete older than 21 days
      const rawMessages = map[KEYS.MESSAGES] || EMPTY_MESSAGES;
      const now = Date.now();
      const MAX_RETENTION_MS = 21 * 24 * 60 * 60 * 1000;
      const DISPLAY_RETENTION_MS = 15 * 24 * 60 * 60 * 1000;

      const nonExpired = rawMessages.filter(m => (now - new Date(m.timestamp).getTime()) <= MAX_RETENTION_MS);
      if (nonExpired.length !== rawMessages.length) {
        await persist(KEYS.MESSAGES, nonExpired);
      }
      const activeMsgs = nonExpired.filter(m => (now - new Date(m.timestamp).getTime()) <= DISPLAY_RETENTION_MS);

      setFunds(map[KEYS.FUNDS] || EMPTY_FUNDS);
      setExpenses(map[KEYS.EXPENSES] || EMPTY_EXPENSES);
      setSponsors(map[KEYS.SPONSORS] || EMPTY_SPONSORS);
      setMessages(activeMsgs);
      setMembers(map[KEYS.MEMBERS] || EMPTY_MEMBERS);
      setQrCodes(map[KEYS.QR_CODES] || []);
      setThemes(map[KEYS.THEMES] || EMPTY_THEMES);
      setAttendance(map[KEYS.ATTENDANCE] || {});
      setMedia(map[KEYS.MEDIA] || EMPTY_MEDIA);
      setTasks(map[KEYS.TASKS] || EMPTY_TASKS);
      setPolls(map[KEYS.POLLS] || EMPTY_POLLS);
      setAnnouncements(map[KEYS.ANNOUNCEMENTS] || EMPTY_ANNOUNCEMENTS);
      setCarryForwardBalance(map[KEYS.CARRY_FORWARD] || '0');
    } catch (e) {
      console.error('Data load error:', e);
    } finally {
      setLoaded(true);
    }
  };

  const persist = async (key, data) => {
    try {
      await AsyncStorage.setItem(key, encodeSecure(data));
      if (key === KEYS.MEMBERS) {
        await AsyncStorage.setItem('@malla_mata_members', encodeSecure(data));
      }
      setSyncStatus(prev => ({ ...prev, lastSynced: new Date().toISOString(), cloudActive: true }));
      if (typeof window !== 'undefined' && window.BroadcastChannel) {
        try {
          const bc = new BroadcastChannel('malla_mata_cross_platform_sync');
          bc.postMessage({ action: 'SYNC_ALL', key, timestamp: Date.now() });
          bc.close();
        } catch (e) {}
      }
      // Broadcast to cloud channel so Android APK, iOS and Web sync instantly
      broadcastSync(key, data);
    } catch (e) {
      console.error('Persist error:', e);
    }
  };

  const triggerSync = async () => {
    setSyncStatus(prev => ({ ...prev, isSyncing: true }));
    await loadAll();
    setTimeout(() => {
      setSyncStatus({
        lastSynced: new Date().toISOString(),
        isSyncing: false,
        platform: 'Android • iOS • Web',
      });
    }, 400);
    return { success: true };
  };

  // ── Fund Operations (Record / Update / Reset / Clear) ──
  const saveFund = async (houseId, data) => {
    const updated = {
      ...funds,
      [houseId]: {
        ...funds[houseId],
        ...data,
        updatedAt: new Date().toISOString(),
      },
    };
    setFunds(updated);
    await persist(KEYS.FUNDS, updated);
  };

  const resetFund = async (houseId) => {
    const updated = { ...funds };
    delete updated[houseId];
    setFunds(updated);
    await persist(KEYS.FUNDS, updated);
  };

  const getFund = (houseId) => funds[houseId] || null;

  // ── Expense Operations (Full CRUD) ──
  const addExpense = async (expense) => {
    const newExpense = {
      ...expense,
      id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [newExpense, ...expenses];
    setExpenses(updated);
    await persist(KEYS.EXPENSES, updated);
    return newExpense;
  };

  const updateExpense = async (id, updatedData) => {
    const updated = expenses.map(e => (e.id === id ? { ...e, ...updatedData, updatedAt: new Date().toISOString() } : e));
    setExpenses(updated);
    await persist(KEYS.EXPENSES, updated);
  };

  const deleteExpense = async (id) => {
    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);
    await persist(KEYS.EXPENSES, updated);
  };

  // ── Sponsor Operations (Full CRUD) ──
  const addSponsor = async (sponsor) => {
    const newSponsor = {
      ...sponsor,
      id: `sp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [newSponsor, ...sponsors];
    setSponsors(updated);
    await persist(KEYS.SPONSORS, updated);
    return newSponsor;
  };

  const updateSponsor = async (id, updatedData) => {
    const updated = sponsors.map(s => (s.id === id ? { ...s, ...updatedData, updatedAt: new Date().toISOString() } : s));
    setSponsors(updated);
    await persist(KEYS.SPONSORS, updated);
  };

  const deleteSponsor = async (id) => {
    const updated = sponsors.filter(s => s.id !== id);
    setSponsors(updated);
    await persist(KEYS.SPONSORS, updated);
  };

  // ── Chat Operations ──
  const sendMessage = async (msg) => {
    const newMsg = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
    };
    const updated = [...messages, newMsg];
    setMessages(updated);
    await persist(KEYS.MESSAGES, updated);
  };

  const deleteMessage = async (id) => {
    const updated = messages.filter(m => m.id !== id);
    setMessages(updated);
    await persist(KEYS.MESSAGES, updated);
  };

  // ── Member Operations (Full CRUD with Designations) ──
  const setMembersList = async (list) => {
    setMembers(list);
    await persist(KEYS.MEMBERS, list);
  };

  const addMember = async (member) => {
    const newMember = {
      ...member,
      id: `mem-${Date.now()}`,
      designation: member.designation || member.role || 'Member',
    };
    const updated = [...members, newMember];
    setMembers(updated);
    await persist(KEYS.MEMBERS, updated);
    return newMember;
  };

  const updateMember = async (id, data) => {
    const updated = members.map(m => (m.id === id ? { ...m, ...data, designation: data.designation || m.designation } : m));
    setMembers(updated);
    await persist(KEYS.MEMBERS, updated);
  };

  const deleteMember = async (id) => {
    const updated = members.filter(m => m.id !== id);
    setMembers(updated);
    await persist(KEYS.MEMBERS, updated);
  };

  const promoteMemberToAdmin = async (id, adminControls, designation) => {
    const updated = members.map(m => {
      if (m.id === id) {
        return {
          ...m,
          role: 'Admin',
          designation: designation || m.designation || 'Committee Admin',
          adminControls: { ...DEFAULT_ADMIN_CONTROLS, ...adminControls },
          isPromotedAdmin: true,
          promotedAt: new Date().toISOString(),
        };
      }
      return m;
    });
    setMembers(updated);
    await persist(KEYS.MEMBERS, updated);
  };

  const updateMemberAdminControls = async (id, adminControls) => {
    const updated = members.map(m => {
      if (m.id === id) {
        return {
          ...m,
          adminControls: { ...(m.adminControls || DEFAULT_ADMIN_CONTROLS), ...adminControls },
        };
      }
      return m;
    });
    setMembers(updated);
    await persist(KEYS.MEMBERS, updated);
  };

  const demoteMemberToResident = async (id) => {
    const updated = members.map(m => {
      if (m.id === id) {
        return {
          ...m,
          role: 'Member',
          designation: 'Resident Member',
          adminControls: null,
          isPromotedAdmin: false,
        };
      }
      return m;
    });
    setMembers(updated);
    await persist(KEYS.MEMBERS, updated);
  };

  // ── QR Code Operations ──
  const saveQRCode = async (qr) => {
    const existing = qrCodes.findIndex(q => q.adminId === qr.adminId);
    let updated;
    if (existing >= 0) {
      updated = [...qrCodes];
      updated[existing] = { ...updated[existing], ...qr, updatedAt: new Date().toISOString() };
    } else {
      updated = [...qrCodes, { ...qr, id: `qr-${Date.now()}`, createdAt: new Date().toISOString() }];
    }
    setQrCodes(updated);
    await persist(KEYS.QR_CODES, updated);
  };

  const deleteQRCode = async (adminId) => {
    const updated = qrCodes.filter(q => q.adminId !== adminId);
    setQrCodes(updated);
    await persist(KEYS.QR_CODES, updated);
  };

  // ── Theme Operations (with Photo/Video Delete) ──
  const saveTheme = async (day, data) => {
    const updated = {
      ...themes,
      [day]: { ...themes[day], ...data, updatedAt: new Date().toISOString() },
    };
    setThemes(updated);
    await persist(KEYS.THEMES, updated);
  };

  const deleteThemeOutput = async (day, outputId) => {
    const dayTheme = themes[day] || {};
    const updatedOutputs = (dayTheme.finalOutputs || []).filter(o => o.id !== outputId);
    const updated = {
      ...themes,
      [day]: { ...dayTheme, finalOutputs: updatedOutputs, updatedAt: new Date().toISOString() },
    };
    setThemes(updated);
    await persist(KEYS.THEMES, updated);
  };

  const getTheme = (day) => themes[day] || null;

  // ── Attendance Operations (Strict same-day marking, no unmark for members, superuser full control) ──
  const markAttendance = async (sessionKey, memberId, memberName, user) => {
    // Extract date from sessionKey (e.g. '11-10-2026_evening' or '11-10-2026')
    const [datePart] = sessionKey.split('_');
    const dayAttendance = attendance[sessionKey] || [];
    const existsIndex = dayAttendance.findIndex(a => a.memberId === memberId || a.memberName === memberName);
    const isSuperuser = user?.role === 'superuser' || user?.username === 'Devansh';

    // Superuser can always add or remove attendance for ANY date and ANY member (to prevent/provoke fake attendance)
    if (isSuperuser) {
      let updatedList;
      if (existsIndex >= 0) {
        updatedList = dayAttendance.filter(a => a.memberId !== memberId && a.memberName !== memberName);
      } else {
        updatedList = [
          ...dayAttendance,
          {
            memberId,
            memberName: memberName || 'Member',
            markedAt: new Date().toISOString(),
            markedBy: 'Superuser',
          },
        ];
      }
      const updated = { ...attendance, [sessionKey]: updatedList };
      setAttendance(updated);
      await persist(KEYS.ATTENDANCE, updated);
      return { success: true, action: existsIndex >= 0 ? 'removed' : 'marked' };
    }

    // Non-Superuser (Members & Admins):
    // 1. Cannot mark for another member
    if (user && user.id && user.id !== memberId) {
      return {
        success: false,
        error: 'Only Superuser is authorized to add or remove attendance for other members.',
      };
    }

    // 2. Check if already marked: once marked, it cannot be unmarked by members/admins!
    if (existsIndex >= 0) {
      return {
        success: false,
        error: 'Attendance once marked cannot be unmarked! Only Superuser can adjust attendance.',
      };
    }

    // 3. Same-day only check:
    const today = new Date();
    const todayStr = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`;
    
    // In October 2026 festival period:
    // If today is within festival 11 to 19 Oct 2026, datePart must match todayStr
    // If testing outside festival dates, we check if date matches today or if user is non-superuser
    if (datePart !== todayStr) {
      return {
        success: false,
        error: `Attendance can only be marked on the same day (${todayStr})! Members & Admins cannot mark for previous or future dates. Only Superuser can modify past/future records.`,
      };
    }

    const updatedList = [
      ...dayAttendance,
      {
        memberId,
        memberName: memberName || user?.displayName || user?.name || 'Member',
        markedAt: new Date().toISOString(),
        markedBy: 'Self',
      },
    ];

    const updated = { ...attendance, [sessionKey]: updatedList };
    setAttendance(updated);
    await persist(KEYS.ATTENDANCE, updated);
    return { success: true, action: 'marked' };
  };

  const getAttendance = (date) => attendance[date] || [];

  // ── Media Gallery Operations (5x5 Grid, Optional Captions & Emoji Reactions) ──
  const addMedia = async (item) => {
    const newItem = {
      ...item,
      id: `media-${Date.now()}`,
      caption: item.caption || '',
      reactions: item.reactions || {},
      uploadedAt: new Date().toISOString(),
    };
    const updated = [newItem, ...media];
    setMedia(updated);
    await persist(KEYS.MEDIA, updated);
  };

  const deleteMedia = async (id) => {
    const updated = media.filter(m => m.id !== id);
    setMedia(updated);
    await persist(KEYS.MEDIA, updated);
  };

  const reactToMedia = async (mediaId, emoji, userId) => {
    const updated = media.map(item => {
      if (item.id !== mediaId) return item;
      const currentReactions = item.reactions || {};
      const userList = currentReactions[emoji] || [];
      const hasReacted = userList.includes(userId);
      const newUserList = hasReacted
        ? userList.filter(u => u !== userId)
        : [...userList, userId];

      const newReactions = { ...currentReactions };
      if (newUserList.length > 0) {
        newReactions[emoji] = newUserList;
      } else {
        delete newReactions[emoji];
      }
      return { ...item, reactions: newReactions };
    });
    setMedia(updated);
    await persist(KEYS.MEDIA, updated);
  };

  // ── Task Operations (Admins can assign, edit, save; only Superuser can delete) ──
  const addTask = async (taskData, currentUser) => {
    const isSuperuser = currentUser?.role === 'superuser' || currentUser?.username === 'Devansh';
    const isAdmin = isSuperuser || currentUser?.role === 'admin';

    if (!isAdmin) {
      return { success: false, error: 'Only Admins and Superuser can assign tasks.' };
    }

    const newTask = {
      ...taskData,
      id: `tsk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
      announcements: taskData.announcements || [],
      assignedBy: {
        id: currentUser.id,
        name: currentUser.displayName || currentUser.name || 'Admin',
        role: isSuperuser ? 'Superuser Lead' : 'Admin',
      },
    };

    const updated = [newTask, ...tasks];
    setTasks(updated);
    await persist(KEYS.TASKS, updated);

    // Broadcast a community task notification so assignees and community get message
    const assigneeNames = (newTask.assignedTo || []).map(a => a.name).join(', ') || 'Members';
    const notifyMsg = {
      id: `msg-task-${Date.now()}`,
      text: `📋 [Task Assigned] "${newTask.name}" assigned to ${assigneeNames} (Due: ${newTask.dueDate || 'Navratri'}). Please check Tasks tab!`,
      senderId: currentUser.id,
      senderName: currentUser.displayName || currentUser.name || 'Admin',
      timestamp: new Date().toISOString(),
    };
    const updatedMsgs = [...messages, notifyMsg];
    setMessages(updatedMsgs);
    await persist(KEYS.MESSAGES, updatedMsgs);

    return { success: true, task: newTask };
  };

  const updateTask = async (id, updatedData, currentUser) => {
    const isSuperuser = currentUser?.role === 'superuser' || currentUser?.username === 'Devansh';
    const isAdmin = isSuperuser || currentUser?.role === 'admin';

    const existingTask = tasks.find(t => t.id === id);
    if (!existingTask) return { success: false, error: 'Task not found' };

    const isAssignee = (existingTask.assignedTo || []).some(
      a => a.id === currentUser?.id || a.name?.toLowerCase() === currentUser?.name?.toLowerCase()
    );

    if (!isAdmin && !isAssignee) {
      return { success: false, error: 'You do not have permission to update this task.' };
    }

    const updated = tasks.map(t => {
      if (t.id !== id) return t;
      return {
        ...t,
        ...updatedData,
        updatedAt: new Date().toISOString(),
      };
    });

    setTasks(updated);
    await persist(KEYS.TASKS, updated);
    return { success: true };
  };

  const deleteTask = async (id, currentUser) => {
    const isSuperuser = currentUser?.role === 'superuser' || currentUser?.username === 'Devansh';
    if (!isSuperuser) {
      return {
        success: false,
        error: 'Only Superuser has permission to delete tasks. Admins can edit and save only.',
      };
    }

    const updated = tasks.filter(t => t.id !== id);
    setTasks(updated);
    await persist(KEYS.TASKS, updated);
    return { success: true };
  };

  const sendTaskReminder = async (taskId, announcementText, currentUser) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return { success: false, error: 'Task not found' };

    const newAnnouncement = {
      id: `ann-${Date.now()}`,
      text: announcementText,
      senderName: currentUser?.displayName || currentUser?.name || 'Admin',
      timestamp: new Date().toISOString(),
    };

    const updatedAnnouncements = [...(task.announcements || []), newAnnouncement];
    const updated = tasks.map(t => (t.id === taskId ? { ...t, announcements: updatedAnnouncements } : t));
    setTasks(updated);
    await persist(KEYS.TASKS, updated);

    // Also send an urgent alert message to community chat
    const assigneeNames = (task.assignedTo || []).map(a => a.name).join(', ') || 'Assignees';
    const reminderMsg = {
      id: `msg-remind-${Date.now()}`,
      text: `🔔 [Task Reminder] "${task.name}" for ${assigneeNames}: ${announcementText}`,
      senderId: currentUser?.id,
      senderName: currentUser?.displayName || currentUser?.name || 'Admin',
      timestamp: new Date().toISOString(),
    };
    const updatedMsgs = [...messages, reminderMsg];
    setMessages(updatedMsgs);
    await persist(KEYS.MESSAGES, updatedMsgs);

    return { success: true };
  };

  // ── Voting Poll Operations ──
  const addPoll = async (pollData, currentUser) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superuser' && currentUser.username !== 'Devansh')) {
      return { success: false, error: 'Only Admins and Superuser can create voting polls.' };
    }

    if (!pollData.question?.trim()) {
      return { success: false, error: 'Poll question is required.' };
    }

    if (!pollData.options || pollData.options.length < 2) {
      return { success: false, error: 'Please provide at least 2 voting options.' };
    }

    const newPoll = {
      id: `poll-${Date.now()}`,
      question: pollData.question.trim(),
      description: pollData.description?.trim() || '',
      options: pollData.options.map((opt, idx) => ({
        id: `opt-${Date.now()}-${idx + 1}`,
        text: (typeof opt === 'string' ? opt : opt.text).trim(),
        voterIds: [],
        votesCount: 0,
      })),
      createdBy: {
        id: currentUser.id,
        name: currentUser.displayName || currentUser.name || 'Admin',
        role: currentUser.role || 'admin',
      },
      createdAt: new Date().toISOString(),
      startsAt: pollData.startsAt || new Date().toISOString(),
      endsAt: pollData.endsAt || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      voters: [],
      totalVotes: 0,
    };

    const updatedPolls = [newPoll, ...polls];
    setPolls(updatedPolls);
    await persist(KEYS.POLLS, updatedPolls);

    // Auto-create Home Screen Announcement Pop-up Alert
    const pollAlert = {
      id: `ann-poll-${Date.now()}`,
      title: `🗳️ Decision Poll: ${newPoll.question}`,
      message: `A new community decision poll has been created by ${newPoll.createdBy.name}. Cast your vote before ${new Date(newPoll.endsAt).toLocaleDateString()} to decide together!`,
      category: 'poll_alert',
      postedBy: newPoll.createdBy,
      createdAt: new Date().toISOString(),
      priority: 'high',
      expiresAt: newPoll.endsAt,
      linkScreen: 'VotingPolls',
    };
    const updatedAnnouncements = [pollAlert, ...announcements];
    setAnnouncements(updatedAnnouncements);
    await persist(KEYS.ANNOUNCEMENTS, updatedAnnouncements);

    // Also broadcast to community Chat
    const pollChatMsg = {
      id: `msg-poll-${Date.now()}`,
      text: `🗳️ [New Voting Poll] "${newPoll.question}". Cast your vote in the Voting Polls tab to decide together!`,
      senderId: currentUser.id,
      senderName: newPoll.createdBy.name,
      timestamp: new Date().toISOString(),
    };
    const updatedMsgs = [...messages, pollChatMsg];
    setMessages(updatedMsgs);
    await persist(KEYS.MESSAGES, updatedMsgs);

    return { success: true, poll: newPoll };
  };

  const voteInPoll = async (pollId, optionId, currentUser) => {
    if (!currentUser) return { success: false, error: 'Please login to vote.' };

    const poll = polls.find(p => p.id === pollId);
    if (!poll) return { success: false, error: 'Poll not found.' };

    const now = Date.now();
    const isTimeExpired = poll.endsAt && now > new Date(poll.endsAt).getTime();
    const isNotStarted = poll.startsAt && now < new Date(poll.startsAt).getTime();

    if (poll.status === 'closed' || isTimeExpired) {
      return { success: false, error: 'Voting is closed for this poll (Timings ended).' };
    }
    if (isNotStarted) {
      return { success: false, error: 'Voting has not started yet for this poll.' };
    }

    const userId = currentUser.id || currentUser.username;

    // Update options: remove user from any existing option, and add to the target option
    const updatedOptions = poll.options.map(opt => {
      const filteredVoters = (opt.voterIds || []).filter(id => id !== userId);
      if (opt.id === optionId) {
        return {
          ...opt,
          voterIds: [...filteredVoters, userId],
          votesCount: filteredVoters.length + 1,
        };
      }
      return {
        ...opt,
        voterIds: filteredVoters,
        votesCount: filteredVoters.length,
      };
    });

    const updatedVoters = Array.from(new Set([...(poll.voters || []), userId]));
    const totalVotes = updatedOptions.reduce((sum, o) => sum + (o.votesCount || 0), 0);

    const updatedPoll = {
      ...poll,
      options: updatedOptions,
      voters: updatedVoters,
      totalVotes,
    };

    const updatedPolls = polls.map(p => (p.id === pollId ? updatedPoll : p));
    setPolls(updatedPolls);
    await persist(KEYS.POLLS, updatedPolls);

    return { success: true };
  };

  const updatePoll = async (pollId, updatedData, currentUser) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superuser' && currentUser.username !== 'Devansh')) {
      return { success: false, error: 'Only Admins and Superuser can update polls.' };
    }

    const poll = polls.find(p => p.id === pollId);
    if (!poll) return { success: false, error: 'Poll not found.' };

    const updatedPoll = {
      ...poll,
      ...updatedData,
      updatedAt: new Date().toISOString(),
    };

    const updatedPolls = polls.map(p => (p.id === pollId ? updatedPoll : p));
    setPolls(updatedPolls);
    await persist(KEYS.POLLS, updatedPolls);

    return { success: true, poll: updatedPoll };
  };

  const deletePoll = async (pollId, currentUser) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superuser' && currentUser.username !== 'Devansh')) {
      return { success: false, error: 'Only Admins and Superuser can delete polls.' };
    }

    const updatedPolls = polls.filter(p => p.id !== pollId);
    setPolls(updatedPolls);
    await persist(KEYS.POLLS, updatedPolls);

    return { success: true };
  };

  // ── Home Screen Pop-up Announcements (Excludes funds, expenses, sponsors, media) ──
  const addAnnouncement = async (announcementData, currentUser) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superuser' && currentUser.username !== 'Devansh')) {
      return { success: false, error: 'Only Admins and Superuser can publish announcements.' };
    }

    // Explicit constraint: "anything other than fund collection , expenses and sponsers or media"
    const forbiddenCategories = ['fund', 'funds', 'expense', 'expenses', 'sponsor', 'sponsors', 'media'];
    if (forbiddenCategories.includes((announcementData.category || '').toLowerCase())) {
      return { success: false, error: 'Funds, expenses, sponsors, and media must not be posted as general announcements.' };
    }

    const newAnnouncement = {
      id: `ann-${Date.now()}`,
      title: announcementData.title.trim(),
      message: announcementData.message.trim(),
      category: announcementData.category || 'announcement',
      postedBy: {
        id: currentUser.id,
        name: currentUser.displayName || currentUser.name || 'Admin',
        role: currentUser.role || 'admin',
      },
      createdAt: new Date().toISOString(),
      priority: announcementData.priority || 'high',
      deadline: announcementData.deadline || null,
      deadlineTimeline: announcementData.deadlineTimeline || 'No Deadline',
      expiresAt: announcementData.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      linkScreen: announcementData.linkScreen || 'HomeScreen',
    };

    const updatedAnnouncements = [newAnnouncement, ...announcements];
    setAnnouncements(updatedAnnouncements);
    await persist(KEYS.ANNOUNCEMENTS, updatedAnnouncements);

    // Send broadcast to community Chat
    const chatMsg = {
      id: `msg-ann-${Date.now()}`,
      text: `📢 [Community Announcement] ${newAnnouncement.title}: ${newAnnouncement.message}`,
      senderId: currentUser.id,
      senderName: newAnnouncement.postedBy.name,
      timestamp: new Date().toISOString(),
    };
    const updatedMsgs = [...messages, chatMsg];
    setMessages(updatedMsgs);
    await persist(KEYS.MESSAGES, updatedMsgs);

    return { success: true, announcement: newAnnouncement };
  };

  const deleteAnnouncement = async (id, currentUser) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superuser' && currentUser.username !== 'Devansh')) {
      return { success: false, error: 'Only Admins and Superuser can remove announcements.' };
    }
    const updated = announcements.filter(a => a.id !== id);
    setAnnouncements(updated);
    await persist(KEYS.ANNOUNCEMENTS, updated);
    return { success: true };
  };

  // ── Carry Forward Balance (Superuser control) ──
  const saveCarryForwardBalance = async (amt) => {
    const cleanAmt = amt.toString().replace(/[^0-9.]/g, '');
    setCarryForwardBalance(cleanAmt);
    await persist(KEYS.CARRY_FORWARD, cleanAmt);
  };

  // Computed financial summaries
  const totalFundsCollected = Object.values(funds).reduce(
    (sum, f) => sum + (parseFloat(f?.amount) || 0),
    0
  );

  const totalSponsorFunds = sponsors.reduce(
    (sum, s) => sum + (parseFloat(s?.amount) || 0),
    0
  );

  const totalExpenses = expenses.reduce(
    (sum, e) => sum + (parseFloat(e?.amount) || 0),
    0
  );

  const parsedCarryForward = parseFloat(carryForwardBalance) || 0;
  const netBalance = (parsedCarryForward + totalFundsCollected + totalSponsorFunds) - totalExpenses;

  // Database Backup, Restoration & Cleansing Methods
  const triggerBackup = async (reason = 'Manual Safe Backup') => {
    const res = await createDatabaseBackup(reason);
    if (res?.success) {
      const status = await getBackupSyncStatus();
      setBackupStatus(status);
    }
    return res;
  };

  const triggerRestore = async () => {
    const res = await restoreDatabaseFromBackup();
    if (res?.success) {
      await loadAll();
      const status = await getBackupSyncStatus();
      setBackupStatus(status);
    }
    return res;
  };

  const triggerCleanse = async () => {
    const res = await cleanseFakeEntriesFromDatabase();
    if (res?.success) {
      await loadAll();
    }
    return res;
  };

  const triggerPurgeDatabase = async () => {
    const res = await purgeAllDatabaseData();
    if (res?.success) {
      await loadAll();
      const status = await getBackupSyncStatus();
      setBackupStatus(status);
    }
    return res;
  };

  const value = {
    loaded,
    funds, saveFund, resetFund, getFund,
    expenses, addExpense, updateExpense, deleteExpense,
    sponsors, addSponsor, updateSponsor, deleteSponsor,
    messages, sendMessage, deleteMessage,
    members, setMembersList, addMember, updateMember, deleteMember,
    promoteMemberToAdmin, updateMemberAdminControls, demoteMemberToResident,
    qrCodes, saveQRCode, deleteQRCode,
    themes, saveTheme, deleteThemeOutput, getTheme,
    attendance, markAttendance, getAttendance,
    media, addMedia, deleteMedia, reactToMedia,
    tasks, addTask, updateTask, deleteTask, sendTaskReminder,
    polls, addPoll, voteInPoll, updatePoll, deletePoll,
    announcements, addAnnouncement, deleteAnnouncement,
    carryForwardBalance, saveCarryForwardBalance,
    syncStatus, triggerSync,
    backupStatus, triggerBackup, triggerRestore, triggerCleanse, triggerPurgeDatabase,
    totalFundsCollected,
    totalSponsorFunds,
    totalExpenses,
    netBalance,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};
