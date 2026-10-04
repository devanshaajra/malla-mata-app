// ─── Block & House Configuration ─────────────────────────────────────
export const BLOCKS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
export const HOUSES_PER_BLOCK = 12;

export const getHouseNumbers = (block) =>
  Array.from({ length: HOUSES_PER_BLOCK }, (_, i) => `${block}${i + 1}`);

export const ALL_HOUSES = BLOCKS.flatMap(getHouseNumbers);

// ─── Slogan & Invocation ───────────────────────────────────────────────
export const SLOGAN = 'Jay Ambe';
export const MANTRA = 'ॐ श्री दुर्गायै नमः • जय अम्बे माँ';

// ─── Roles (Member, Admin, Superuser) ─────────────────────────────────
export const ROLES = {
  MEMBER: 'member',
  USER: 'member',
  ADMIN: 'admin',
  SUPERUSER: 'superuser',
};

// ─── Member Designations ──────────────────────────────────────────────
export const DESIGNATIONS = [
  'Superuser & Lead Organizer',
  'Committee President',
  'Vice President',
  'Treasurer & Accounts Lead',
  'Cultural & Garba Head',
  'Stage & Decoration Head',
  'Maha Prasad & Food Committee',
  'Puja & Samagri Incharge',
  'Youth Volunteer',
  'Committee Member',
];

// ─── Theme Days (9 Navratri Days: 11 Oct to 19 Oct 2026) ─────────────
export const THEME_DAYS = [
  'Day 1 (11 Oct)',
  'Day 2 (12 Oct)',
  'Day 3 (13 Oct)',
  'Day 4 (14 Oct)',
  'Day 5 (15 Oct)',
  'Day 6 (16 Oct)',
  'Day 7 (17 Oct)',
  'Day 8 (18 Oct)',
  'Day 9 (19 Oct)',
];

// ─── Payment Modes ───────────────────────────────────────────────────
export const PAYMENT_MODES = [
  'Cash',
  'UPI / Online',
  'Cheque',
  'Bank Transfer',
  'Other',
];

// ─── Aarti Dates (Navratri Mahotsav: 11 Oct to 19 Oct 2026) ───────────
export const AARTI_DATES = [
  { date: '11-10-2026', label: '11 Oct', day: 'Day 1', deity: 'Maa Shailputri (Ghatasthapana)' },
  { date: '12-10-2026', label: '12 Oct', day: 'Day 2', deity: 'Maa Brahmacharini' },
  { date: '13-10-2026', label: '13 Oct', day: 'Day 3', deity: 'Maa Chandraghanta' },
  { date: '14-10-2026', label: '14 Oct', day: 'Day 4', deity: 'Maa Kushmanda' },
  { date: '15-10-2026', label: '15 Oct', day: 'Day 5', deity: 'Maa Skandamata' },
  { date: '16-10-2026', label: '16 Oct', day: 'Day 6', deity: 'Maa Katyayani' },
  { date: '17-10-2026', label: '17 Oct', day: 'Day 7', deity: 'Maa Kalaratri' },
  { date: '18-10-2026', label: '18 Oct', day: 'Day 8', deity: 'Maa Mahagauri (Maha Ashtami)' },
  { date: '19-10-2026', label: '19 Oct', day: 'Day 9', deity: 'Maa Siddhidatri (Maha Navami / Dussehra)' },
];

// ─── Expense Dates: 1 Oct to 22 Oct 2026 (Preparations, Navratri, & Post-Festival Wrap-up) ───
export const EXPENSE_DATES = Array.from({ length: 22 }, (_, i) => {
  const dayNum = i + 1;
  const dayStr = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
  const dateStr = `${dayStr}-10-2026`;
  let phase = 'Pre-Fest Preparations';
  let badge = 'Pre-Festival';
  if (dayNum >= 11 && dayNum <= 19) {
    const navDay = dayNum - 10;
    phase = `Day ${navDay} Navratri Mahotsav`;
    badge = `Day ${navDay}`;
  } else if (dayNum > 19) {
    phase = 'Post-Festival Wrap-up';
    badge = 'Post-Fest';
  }
  return {
    date: dateStr,
    label: `${dayNum} Oct`,
    fullLabel: `${dayStr} Oct 2026`,
    day: `${dayNum} Oct`,
    phase,
    badge,
  };
});

// Helper to validate that an expense date is between 1 Oct 2026 and 22 Oct 2026
export const isExpenseDateInRange = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const clean = dateStr.trim().replace(/\//g, '-');
  const parts = clean.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (year === 2026 && month === 10 && day >= 1 && day <= 22) {
      return true;
    }
  }
  return false;
};

// ─── Admin Controls & Permissions Configuration ──────────────────────────
export const ADMIN_CONTROLS_CONFIG = [
  {
    key: 'manageExpenses',
    label: 'Manage Expenses',
    desc: 'Record, edit & delete expenditure ledger items (1-22 Oct 2026)',
    icon: 'receipt',
    color: '#DC2626',
  },
  {
    key: 'manageFunds',
    label: 'Manage Fund Collections',
    desc: 'Update house-to-house collection amounts & modes',
    icon: 'cash',
    color: '#EA580C',
  },
  {
    key: 'manageTasks',
    label: 'Manage Tasks',
    desc: 'Create, assign, edit and monitor volunteer tasks',
    icon: 'checkbox',
    color: '#2563EB',
  },
  {
    key: 'managePolls',
    label: 'Voting & Decision Polls',
    desc: 'Create decision polls, modify timings & close voting',
    icon: 'stats-chart',
    color: '#7C3AED',
  },
  {
    key: 'manageSponsors',
    label: 'Manage Sponsors',
    desc: 'Register sponsors, banner contributions & pledges',
    icon: 'heart',
    color: '#D97706',
  },
  {
    key: 'manageThemes',
    label: 'Themes & Media Output',
    desc: 'Update 9-day garba themes, colours & media gallery',
    icon: 'color-palette',
    color: '#F97316',
  },
  {
    key: 'manageQRCode',
    label: 'UPI QR Codes',
    desc: 'Upload admin receiver UPI QR code for collections',
    icon: 'qr-code',
    color: '#CA8A04',
  },
  {
    key: 'manageMembers',
    label: 'Members Roster',
    desc: 'Add and edit member roster directory profiles',
    icon: 'people',
    color: '#16A34A',
  },
];

export const DEFAULT_ADMIN_CONTROLS = {
  manageExpenses: true,
  manageFunds: true,
  manageTasks: true,
  managePolls: true,
  manageSponsors: true,
  manageThemes: true,
  manageQRCode: true,
  manageMembers: true,
};

// ─── Color Palette (Festive Sindoor Red, Kesari Saffron, Haldi Gold & Warm Cream) ─────────
export const COLORS = {
  primary: '#DC2626',
  primaryLight: '#EF4444',
  primaryDark: '#B91C1C',
  primaryGlow: 'rgba(220, 38, 38, 0.12)',

  accent: '#EA580C',
  saffron: '#EA580C',
  saffronLight: '#FB923C',
  orange: '#EA580C',
  orangeLight: '#FB923C',
  orangeDark: '#C2410C',
  orangeGlow: 'rgba(234, 88, 12, 0.12)',

  yellow: '#F59E0B',
  yellowLight: '#FDE047',
  yellowWarm: '#FEF08A',
  yellowDark: '#D97706',
  yellowGlow: 'rgba(245, 158, 11, 0.15)',

  bgPrimary: '#FFFDF7',
  bgSecondary: '#FEF3C7',
  bgCard: '#FFFFFF',
  bgInput: '#FFFBEB',
  bgOverlay: 'rgba(0,0,0,0.5)',

  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textLight: '#94A3B8',
  textFestive: '#991B1B',
  textWhite: '#FFFFFF',
  textOnPrimary: '#FFFFFF',

  success: '#16A34A',
  warning: '#F59E0B',
  error: '#DC2626',
  info: '#2563EB',

  border: '#FDE68A',
  borderLight: '#FEF3C7',
  divider: '#FEEBC8',
  shadow: 'rgba(234, 88, 12, 0.1)',
  cardShadow: 'rgba(180, 83, 9, 0.1)',

  blockColors: [
    '#DC2626', // Sindoor Red
    '#EA580C', // Kesari Orange
    '#F59E0B', // Marigold Amber
    '#D97706', // Deep Gold
    '#B91C1C', // Royal Crimson Red
    '#F97316', // Sunset Orange
    '#E11D48', // Gulal Ruby Red
    '#CA8A04', // Haldi Yellow
  ],
};

// ─── Menu Items ──────────────────────────────────────────────────────
export const MENU_ITEMS = [
  { id: 'funds',      title: 'Fund\nCollection',  icon: 'cash',              screen: 'FundCollection',  color: '#DC2626', bg: '#FEE2E2' },
  { id: 'expenses',   title: 'Expenses',           icon: 'receipt',           screen: 'Expenses',        color: '#EA580C', bg: '#FFEDD5' },
  { id: 'ledger',     title: 'Ledger',             icon: 'wallet',            screen: 'Analytics',       color: '#B91C1C', bg: '#FEE2E2' },
  { id: 'tasks',      title: 'Tasks',              icon: 'checkbox',          screen: 'Tasks',           color: '#2563EB', bg: '#DBEAFE' },
  { id: 'polls',      title: 'Voting\nPolls',      icon: 'stats-chart',       screen: 'VotingPolls',     color: '#7C3AED', bg: '#EDE9FE' },
  { id: 'sponsors',   title: 'Sponsors',           icon: 'heart',             screen: 'Sponsors',        color: '#D97706', bg: '#FEF3C7' },
  { id: 'chat',       title: 'Chat',               icon: 'chatbubbles',       screen: 'Chat',            color: '#16A34A', bg: '#DCFCE7' },
  { id: 'members',    title: 'Members',            icon: 'people',            screen: 'Members',         color: '#B91C1C', bg: '#FFE4E6' },
  { id: 'qrcode',     title: 'QR Code',            icon: 'qr-code',          screen: 'QRCode',          color: '#CA8A04', bg: '#FEF9C3' },
  { id: 'themes',     title: 'Themes &\nOutput',   icon: 'color-palette',     screen: 'Themes',          color: '#F97316', bg: '#FFEDD5' },
  { id: 'attendance', title: 'Attendance',          icon: 'calendar-number',   screen: 'Attendance',      color: '#EA580C', bg: '#FEE2E2' },
  { id: 'media',      title: 'Media',              icon: 'images',            screen: 'Media',           color: '#D97706', bg: '#FEF3C7' },
];

// ─── Superuser Profile (credentials secured internally in AuthContext) ───
export const SUPERUSER = {
  name: 'Devansh',
  username: 'Devansh',
  email: 'devansh@mallamata.app',
  phone: '+91 98765 43210',
  role: ROLES.SUPERUSER,
  designation: 'Superuser & Lead Organizer',
};
