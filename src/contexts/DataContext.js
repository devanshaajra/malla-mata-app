import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME_DAYS, AARTI_DATES, DEFAULT_ADMIN_CONTROLS } from '../utils/constants';
import { broadcastSync, subscribeToSync } from '../utils/cloudSync';

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

// Rich Seed Data for Navratri (11 Oct to 19 Oct)
const SEED_FUNDS = {
  'A1': { amount: '3500', mode: 'UPI / Online', aartiDate: '11-10-2026', residentName: 'Ramesh Shah' },
  'A2': { amount: '2100', mode: 'Cash', aartiDate: '12-10-2026', residentName: 'Kavita Joshi' },
  'A3': { amount: '5000', mode: 'UPI / Online', aartiDate: '13-10-2026', residentName: 'Sanjay Mehta' },
  'B1': { amount: '2500', mode: 'UPI / Online', aartiDate: '14-10-2026', residentName: 'Devansh Sharma' },
  'B2': { amount: '3100', mode: 'Cash', aartiDate: '15-10-2026', residentName: 'Anil Gupta' },
  'C1': { amount: '2100', mode: 'Cheque', aartiDate: '16-10-2026', residentName: 'Pooja Trivedi' },
  'D1': { amount: '4500', mode: 'UPI / Online', aartiDate: '17-10-2026', residentName: 'Vikas Rao' },
  'E1': { amount: '2100', mode: 'Cash', aartiDate: '18-10-2026', residentName: 'Sunita Patel' },
  'F1': { amount: '5100', mode: 'UPI / Online', aartiDate: '19-10-2026', residentName: 'Deepak Verma' },
};

const SEED_EXPENSES = [
  {
    id: 'exp-1',
    name: 'Mandap & Stage Flower Decoration (Day 1)',
    amount: '45000',
    date: '11-10-2026',
    mode: 'UPI / Online',
    incurredBy: 'Devansh (Superuser)',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'exp-2',
    name: 'Sound System & DJ Setup for Garba',
    amount: '32000',
    date: '11-10-2026',
    mode: 'Bank Transfer',
    incurredBy: 'Admin Committee',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'exp-3',
    name: 'Maha Prasad & Bhog Sweets',
    amount: '18500',
    date: '12-10-2026',
    mode: 'Cash',
    incurredBy: 'Pooja Trivedi (Prasad Lead)',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'exp-4',
    name: 'Puja Samagri & Havan Ingredients',
    amount: '9400',
    date: '11-10-2026',
    mode: 'Cash',
    incurredBy: 'Pandit Ji / Admin',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'exp-5',
    name: 'Stage Flower Decoration (Day 2)',
    amount: '22000',
    date: '12-10-2026',
    mode: 'UPI / Online',
    incurredBy: 'Anil Gupta (Decoration Head)',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'exp-6',
    name: 'Daily Aarti Ghee & Diya Essentials',
    amount: '4800',
    date: '13-10-2026',
    mode: 'Cash',
    incurredBy: 'Devansh (Superuser)',
    createdAt: new Date().toISOString(),
  },
];

const SEED_SPONSORS = [
  {
    id: 'sp-1',
    name: 'Shah Family & Associates',
    houseNumber: 'A1',
    sponsorshipFor: 'Day 1 Flower & Entrance Toran',
    amount: '15000',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sp-2',
    name: 'Devansh Sharma & Family',
    houseNumber: 'B1',
    sponsorshipFor: 'Day 9 Maha Havan & Kanya Poojan',
    amount: '25000',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sp-3',
    name: 'Mehta Textiles',
    houseNumber: 'A3',
    sponsorshipFor: 'Mataji Traditional Poshak & Chunri',
    amount: '11000',
    createdAt: new Date().toISOString(),
  },
];

const SEED_MEMBERS = [
  {
    id: 'mem-1',
    name: 'Devansh Sharma',
    phone: '+91 98765 43210',
    role: 'Superuser & Lead Organizer',
    designation: 'Superuser & Lead Organizer',
    adminControls: { ...DEFAULT_ADMIN_CONTROLS },
    photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'mem-2',
    name: 'Ramesh Shah',
    phone: '+91 98221 12345',
    role: 'Admin',
    designation: 'Committee President',
    adminControls: { ...DEFAULT_ADMIN_CONTROLS },
    photoURL: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'mem-3',
    name: 'Priya Patel',
    phone: '+91 98234 56789',
    role: 'Admin',
    designation: 'Cultural & Garba Head',
    adminControls: { ...DEFAULT_ADMIN_CONTROLS },
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'mem-4',
    name: 'Anil Gupta',
    phone: '+91 98112 34567',
    role: 'Admin',
    designation: 'Stage & Decoration Head',
    adminControls: { ...DEFAULT_ADMIN_CONTROLS },
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'mem-5',
    name: 'Pooja Trivedi',
    phone: '+91 98334 45566',
    role: 'Admin',
    designation: 'Maha Prasad & Food Committee',
    adminControls: { ...DEFAULT_ADMIN_CONTROLS },
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'mem-6',
    name: 'Sunil Joshi',
    phone: '+91 98450 11223',
    role: 'Member',
    designation: 'Youth Volunteer',
    adminControls: null,
    photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'mem-7',
    name: 'Kavita Shah',
    phone: '+91 98980 44556',
    role: 'Member',
    designation: 'Resident Member',
    adminControls: null,
    photoURL: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'mem-8',
    name: 'Bhavin Parekh',
    phone: '+91 98790 77889',
    role: 'Member',
    designation: 'Resident Member',
    adminControls: null,
    photoURL: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
  },
];

const SEED_THEMES = {
  'Day 1 (11 Oct)': {
    themeName: 'Royal Yellow (Maa Shailputri)',
    timeRequired: '4 Hours (6:00 PM - 10:00 PM)',
    expense: '22000',
    membersPresent: 'Devansh Sharma, Ramesh Shah, Priya Patel, Aarti Troupe',
    referenceMedia: {
      id: 'ref-1',
      title: 'Royal Yellow Stage Concept & Floral Reference',
      type: 'image',
      uri: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
      uploadedBy: 'Devansh (Superuser)',
      uploadedAt: '2026-10-01T10:00:00.000Z',
    },
    performers: [
      { id: 'p-1', name: 'Priya Patel', type: 'member' },
      { id: 'p-2', name: 'Kavita Shah', type: 'member' },
      { id: 'p-3', name: 'Aarti Troupe (Choreographer)', type: 'guest' },
    ],
    finalOutputs: [
      {
        id: 'out-1-1',
        title: 'Mataji Stage & Golden Marigold Mandap Output',
        type: 'image',
        uri: 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=600&auto=format&fit=crop&q=80',
        uploadedBy: 'Devansh (Superuser)',
        uploadedAt: '2026-10-11T21:30:00.000Z',
      },
      {
        id: 'out-1-2',
        title: 'Day 1 Maha Aarti & Lamp Lighting Highlights',
        type: 'video',
        uri: 'https://images.unsplash.com/photo-1609137144813-7d9921338f24?w=600&auto=format&fit=crop&q=80',
        uploadedBy: 'Ramesh Shah (Admin)',
        uploadedAt: '2026-10-11T22:00:00.000Z',
      }
    ],
  },
  'Day 2 (12 Oct)': {
    themeName: 'Vibrant Green (Maa Brahmacharini)',
    timeRequired: '4 Hours (6:30 PM - 10:30 PM)',
    expense: '18500',
    membersPresent: 'Anil Gupta, Pooja Trivedi, Priya Patel',
    referenceMedia: {
      id: 'ref-2',
      title: 'Green Traditional Dandiya Raas Reference',
      type: 'image',
      uri: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80',
      uploadedBy: 'Anil Gupta (Admin)',
      uploadedAt: '2026-10-02T11:00:00.000Z',
    },
    performers: [
      { id: 'p-4', name: 'Pooja Trivedi', type: 'member' },
      { id: 'p-5', name: 'Sunil Joshi', type: 'member' },
    ],
    finalOutputs: [
      {
        id: 'out-2-1',
        title: 'Green Traditional Garba Floor & Toran Output',
        type: 'image',
        uri: 'https://images.unsplash.com/photo-1608889825103-e5595db6916e?w=600&auto=format&fit=crop&q=80',
        uploadedBy: 'Priya Patel (Member)',
        uploadedAt: '2026-10-12T21:45:00.000Z',
      }
    ],
  },
  'Day 3 (13 Oct)': {
    themeName: 'Auspicious Grey & Silver (Maa Chandraghanta)',
    timeRequired: '3.5 Hours (7:00 PM - 10:30 PM)',
    expense: '16000',
    membersPresent: 'Devansh, Vikas',
    finalOutputs: [
      {
        id: 'out-3-1',
        title: 'Silver Bells & Chandraghanta Decor Output',
        type: 'image',
        uri: 'https://images.unsplash.com/photo-1543807535-eceef0bc6599?w=600&auto=format&fit=crop&q=80',
        uploadedBy: 'Devansh (Superuser)',
        uploadedAt: '2026-10-13T21:15:00.000Z',
      }
    ],
  },
  'Day 4 (14 Oct)': {
    themeName: 'Glowing Orange (Maa Kushmanda)',
    timeRequired: '4 Hours (6:00 PM - 10:00 PM)',
    expense: '19000',
    membersPresent: 'Ramesh, Sunita',
    finalOutputs: [],
  },
  'Day 5 (15 Oct)': {
    themeName: 'Pure White & Gold (Maa Skandamata)',
    timeRequired: '5 Hours (5:30 PM - 10:30 PM)',
    expense: '24000',
    membersPresent: 'Devansh, Priya, Anil',
    finalOutputs: [],
  },
  'Day 6 (16 Oct)': {
    themeName: 'Festive Red (Maa Katyayani)',
    timeRequired: '4 Hours (6:00 PM - 10:00 PM)',
    expense: '21000',
    membersPresent: 'Pooja, Deepak',
    finalOutputs: [],
  },
  'Day 7 (17 Oct)': {
    themeName: 'Royal Blue (Maa Kalaratri)',
    timeRequired: '4 Hours (6:30 PM - 10:30 PM)',
    expense: '23500',
    membersPresent: 'Devansh, Ramesh',
    finalOutputs: [],
  },
  'Day 8 (18 Oct)': {
    themeName: 'Pink & Magenta (Maa Mahagauri)',
    timeRequired: '5 Hours (5:00 PM - 10:30 PM)',
    expense: '28000',
    membersPresent: 'All Committee Members',
    finalOutputs: [],
  },
  'Day 9 (19 Oct)': {
    themeName: 'Golden Sunset & Purple (Maa Siddhidatri)',
    timeRequired: '6 Hours (4:00 PM - 11:00 PM)',
    expense: '32000',
    membersPresent: 'All Members',
    finalOutputs: [],
  },
};

// 25 Rich Seed Media Items for 5x5 Grid Presentation
const SEED_MEDIA = [
  {
    id: 'med-1',
    type: 'image',
    uri: 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=600&auto=format&fit=crop&q=80',
    caption: 'Mataji Golden Marigold Stage Decoration',
    uploadedBy: 'Devansh Sharma',
    uploaderId: 'mem-1',
    uploadedAt: '2026-10-10T19:30:00.000Z',
    reactions: { '❤️': ['mem-1', 'mem-2'], '🪔': ['mem-3'], '🌸': ['mem-4'] },
  },
  {
    id: 'med-2',
    type: 'video',
    uri: 'https://images.unsplash.com/photo-1609137144813-7d9921338f24?w=600&auto=format&fit=crop&q=80',
    caption: 'Day 1 Maha Aarti Lamp Lighting (8 PM)',
    uploadedBy: 'Ramesh Shah',
    uploaderId: 'mem-2',
    uploadedAt: '2026-10-10T20:15:00.000Z',
    reactions: { '🔥': ['mem-1', 'mem-2', 'mem-3'], '🙏': ['mem-4', 'mem-5'] },
  },
  {
    id: 'med-3',
    type: 'image',
    uri: 'https://images.unsplash.com/photo-1608889825103-e5595db6916e?w=600&auto=format&fit=crop&q=80',
    caption: 'Traditional Garba Raas Circle Formation',
    uploadedBy: 'Priya Patel',
    uploaderId: 'mem-3',
    uploadedAt: '2026-10-11T21:00:00.000Z',
    reactions: { '❤️': ['mem-2'], '👏': ['mem-1', 'mem-5'] },
  },
  {
    id: 'med-4',
    type: 'image',
    uri: 'https://images.unsplash.com/photo-1543807535-eceef0bc6599?w=600&auto=format&fit=crop&q=80',
    caption: '', // Optional caption demo
    uploadedBy: 'Anil Gupta',
    uploaderId: 'mem-4',
    uploadedAt: '2026-10-11T21:30:00.000Z',
    reactions: { '🪔': ['mem-1'] },
  },
  {
    id: 'med-5',
    type: 'image',
    uri: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&auto=format&fit=crop&q=80',
    caption: 'Festive Lights & Rangoli Entrance',
    uploadedBy: 'Pooja Trivedi',
    uploaderId: 'mem-5',
    uploadedAt: '2026-10-12T19:00:00.000Z',
    reactions: { '🌸': ['mem-1', 'mem-2'] },
  },
  {
    id: 'med-6',
    type: 'video',
    uri: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&auto=format&fit=crop&q=80',
    caption: 'Dandiya Night Whirlwind Performance',
    uploadedBy: 'Devansh Sharma',
    uploaderId: 'mem-1',
    uploadedAt: '2026-10-12T21:40:00.000Z',
    reactions: { '🔥': ['mem-3'], '❤️': ['mem-4', 'mem-5'] },
  },
  {
    id: 'med-7',
    type: 'image',
    uri: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&auto=format&fit=crop&q=80',
    caption: 'Youth Garba Team in Traditional Kediya',
    uploadedBy: 'Ramesh Shah',
    uploaderId: 'mem-2',
    uploadedAt: '2026-10-13T20:20:00.000Z',
    reactions: { '👏': ['mem-1', 'mem-3'] },
  },
  {
    id: 'med-8',
    type: 'image',
    uri: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=600&auto=format&fit=crop&q=80',
    caption: '',
    uploadedBy: 'Priya Patel',
    uploaderId: 'mem-3',
    uploadedAt: '2026-10-13T21:10:00.000Z',
    reactions: { '❤️': ['mem-1'] },
  },
  {
    id: 'med-9',
    type: 'image',
    uri: 'https://images.unsplash.com/photo-1576085898323-218337e3e43c?w=600&auto=format&fit=crop&q=80',
    caption: 'Maha Prasad Bhog Distribution Setup',
    uploadedBy: 'Pooja Trivedi',
    uploaderId: 'mem-5',
    uploadedAt: '2026-10-14T18:45:00.000Z',
    reactions: { '🙏': ['mem-1', 'mem-2', 'mem-4'] },
  },
  {
    id: 'med-10',
    type: 'image',
    uri: 'https://images.unsplash.com/photo-1582738411706-bfc8e691d1c2?w=600&auto=format&fit=crop&q=80',
    caption: 'Silver Diyas for Evening 8 PM Aarti',
    uploadedBy: 'Devansh Sharma',
    uploaderId: 'mem-1',
    uploadedAt: '2026-10-14T19:55:00.000Z',
    reactions: { '🪔': ['mem-2', 'mem-3', 'mem-5'] },
  },
  {
    id: 'med-11',
    type: 'image',
    uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=600&auto=format&fit=crop&q=80',
    caption: 'Navratri Ethnic Chaniya Choli Attire',
    uploadedBy: 'Priya Patel',
    uploaderId: 'mem-3',
    uploadedAt: '2026-10-15T20:30:00.000Z',
    reactions: { '🌸': ['mem-1'] },
  },
  {
    id: 'med-12',
    type: 'video',
    uri: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80',
    caption: 'Mataji Stuti Recitation Highlight',
    uploadedBy: 'Anil Gupta',
    uploaderId: 'mem-4',
    uploadedAt: '2026-10-15T21:15:00.000Z',
    reactions: { '🙏': ['mem-1', 'mem-2'] },
  },
  {
    id: 'med-13',
    type: 'image',
    uri: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    caption: 'Temple Toran & Fresh Mango Leaves',
    uploadedBy: 'Ramesh Shah',
    uploaderId: 'mem-2',
    uploadedAt: '2026-10-16T18:00:00.000Z',
    reactions: { '❤️': ['mem-5'] },
  },
  {
    id: 'med-14',
    type: 'image',
    uri: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    caption: '',
    uploadedBy: 'Devansh Sharma',
    uploaderId: 'mem-1',
    uploadedAt: '2026-10-16T19:40:00.000Z',
    reactions: { '🔥': ['mem-3'] },
  },
  {
    id: 'med-15',
    type: 'image',
    uri: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&auto=format&fit=crop&q=80',
    caption: 'community Digital Ledger & Display Screen',
    uploadedBy: 'Devansh Sharma',
    uploaderId: 'mem-1',
    uploadedAt: '2026-10-16T21:00:00.000Z',
    reactions: { '👏': ['mem-2'] },
  },
  {
    id: 'med-16',
    type: 'image',
    uri: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=600&auto=format&fit=crop&q=80',
    caption: 'Community Havan Samagri Preparation',
    uploadedBy: 'Pooja Trivedi',
    uploaderId: 'mem-5',
    uploadedAt: '2026-10-17T17:30:00.000Z',
    reactions: { '🙏': ['mem-1', 'mem-4'] },
  },
  {
    id: 'med-17',
    type: 'video',
    uri: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80',
    caption: 'Maha Ashtami Deepotsav View',
    uploadedBy: 'Ramesh Shah',
    uploaderId: 'mem-2',
    uploadedAt: '2026-10-17T20:00:00.000Z',
    reactions: { '🪔': ['mem-1', 'mem-3', 'mem-5'] },
  },
  {
    id: 'med-18',
    type: 'image',
    uri: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600&auto=format&fit=crop&q=80',
    caption: 'Kanya Poojan Divine Gifts & Prasad',
    uploadedBy: 'Priya Patel',
    uploaderId: 'mem-3',
    uploadedAt: '2026-10-18T11:00:00.000Z',
    reactions: { '🌸': ['mem-1', 'mem-2'] },
  },
  {
    id: 'med-19',
    type: 'image',
    uri: 'https://images.unsplash.com/photo-1519750157634-b6d493a0f77c?w=600&auto=format&fit=crop&q=80',
    caption: '',
    uploadedBy: 'Anil Gupta',
    uploaderId: 'mem-4',
    uploadedAt: '2026-10-18T18:20:00.000Z',
    reactions: { '❤️': ['mem-3'] },
  },
  {
    id: 'med-20',
    type: 'image',
    uri: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop&q=80',
    caption: 'Vijayadashami Shobha Yatra Stage Decor',
    uploadedBy: 'Devansh Sharma',
    uploaderId: 'mem-1',
    uploadedAt: '2026-10-19T16:00:00.000Z',
    reactions: { '👏': ['mem-1', 'mem-5'] },
  },
  {
    id: 'med-21',
    type: 'image',
    uri: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
    caption: 'Mataji Poshak Gold Embroidery Detail',
    uploadedBy: 'Pooja Trivedi',
    uploaderId: 'mem-5',
    uploadedAt: '2026-10-19T18:30:00.000Z',
    reactions: { '❤️': ['mem-1', 'mem-2'] },
  },
  {
    id: 'med-22',
    type: 'video',
    uri: 'https://images.unsplash.com/photo-1609137144813-7d9921338f24?w=600&auto=format&fit=crop&q=80',
    caption: 'Grand Finale Garba Raas 2026',
    uploadedBy: 'Priya Patel',
    uploaderId: 'mem-3',
    uploadedAt: '2026-10-19T22:30:00.000Z',
    reactions: { '🔥': ['mem-1', 'mem-2', 'mem-3', 'mem-4'] },
  },
  {
    id: 'med-23',
    type: 'image',
    uri: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=600&auto=format&fit=crop&q=80',
    caption: 'Member Group Photo at Mandap',
    uploadedBy: 'Ramesh Shah',
    uploaderId: 'mem-2',
    uploadedAt: '2026-10-20T19:00:00.000Z',
    reactions: { '❤️': ['mem-1', 'mem-2', 'mem-3', 'mem-4', 'mem-5'] },
  },
  {
    id: 'med-24',
    type: 'image',
    uri: 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?w=600&auto=format&fit=crop&q=80',
    caption: 'Auspicious Kalash & Coconut Pooja',
    uploadedBy: 'Devansh Sharma',
    uploaderId: 'mem-1',
    uploadedAt: '2026-10-21T10:00:00.000Z',
    reactions: { '🙏': ['mem-1', 'mem-3'] },
  },
  {
    id: 'med-25',
    type: 'image',
    uri: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&auto=format&fit=crop&q=80',
    caption: 'Navratri Samapan & Blessings',
    uploadedBy: 'Devansh Sharma',
    uploaderId: 'mem-1',
    uploadedAt: '2026-10-21T21:00:00.000Z',
    reactions: { '🪔': ['mem-1', 'mem-2'], '🌸': ['mem-3', 'mem-4'] },
  },
];

const SEED_MESSAGES = [
  {
    id: 'msg-seed-1',
    text: 'Jai Mata Di! Welcome all members to Malla Mata Navratri Mahotsav 2026. Daily Maha Aarti is at 8:00 PM Sharp! 🪔',
    senderId: 'mem-1',
    senderName: 'Devansh Sharma',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-seed-2',
    type: 'sticker',
    sticker: {
      emoji: '🪔',
      text: 'Jay Ambe Maa!',
      sub: 'Navratri Mahotsav',
      badgeBg: '#FEF3C7',
      borderColor: '#F59E0B',
      textColor: '#9A3412',
    },
    senderId: 'mem-2',
    senderName: 'Ramesh Shah',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-seed-3',
    text: 'All members please mark your 8 PM Maha Aarti attendance daily between 11 Oct and 19 Oct. Looking forward to glorious Garba tonight! 💃',
    senderId: 'mem-3',
    senderName: 'Priya Patel',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
];

const SEED_TASKS = [
  {
    id: 'tsk-1',
    name: 'Stage Flower & Entrance Toran Setup (Day 1)',
    description: 'Ensure fresh marigold garlands and entrance toran are hung by 5:00 PM before 8 PM Maha Aarti.',
    assignedTo: [
      { id: 'mem-4', name: 'Anil Gupta', role: 'Stage & Decoration Head' },
      { id: 'mem-3', name: 'Priya Patel', role: 'Cultural & Garba Head' },
    ],
    assignedBy: { id: 'mem-1', name: 'Devansh Sharma', role: 'Superuser & Lead Organizer' },
    dueDate: '11-10-2026',
    priority: 'High',
    status: 'In Progress',
    announcements: [
      { id: 'ann-1', text: 'Fresh flowers arriving from Dadar market at 3 PM. Please coordinate.', senderName: 'Devansh Sharma', timestamp: '2026-10-09T14:30:00.000Z' }
    ],
    createdAt: '2026-10-08T10:00:00.000Z',
  },
  {
    id: 'tsk-2',
    name: 'Maha Prasad & Bhog Preparation for 8 PM Aarti',
    description: 'Procure 500 pedas, halwa prasad and fresh fruits for all members attending 8 PM Aarti.',
    assignedTo: [
      { id: 'mem-5', name: 'Pooja Trivedi', role: 'Maha Prasad & Food Committee' },
      { id: 'mem-1', name: 'Devansh Sharma', role: 'Superuser & Lead Organizer' },
    ],
    assignedBy: { id: 'mem-2', name: 'Ramesh Shah', role: 'President (Admin)' },
    dueDate: '11-10-2026',
    priority: 'High',
    status: 'Pending',
    announcements: [
      { id: 'ann-2', text: 'Reminder: Prasad counters will open right after 8 PM Aarti ends.', senderName: 'Ramesh Shah', timestamp: '2026-10-09T18:00:00.000Z' }
    ],
    createdAt: '2026-10-08T11:00:00.000Z',
  },
  {
    id: 'tsk-3',
    name: 'Garba Sound System & Speaker Setup',
    description: 'Sound engineer will arrive by 4:00 PM for mic testing and traditional dholak audio calibration.',
    assignedTo: [
      { id: 'mem-1', name: 'Devansh Sharma', role: 'Superuser & Lead Organizer' },
      { id: 'mem-4', name: 'Anil Gupta', role: 'Stage & Decoration Head' },
    ],
    assignedBy: { id: 'mem-2', name: 'Ramesh Shah', role: 'President (Admin)' },
    dueDate: '11-10-2026',
    priority: 'Medium',
    status: 'Completed',
    announcements: [],
    createdAt: '2026-10-07T09:30:00.000Z',
  },
  {
    id: 'tsk-4',
    name: 'Diya Oil, Camphor & Aarti Samagri Readiness',
    description: 'Keep 108 brass diyas and pure cow ghee ready at the mandap altar by 7:30 PM.',
    assignedTo: [
      { id: 'mem-5', name: 'Pooja Trivedi', role: 'Maha Prasad & Food Committee' },
    ],
    assignedBy: { id: 'mem-1', name: 'Devansh Sharma', role: 'Superuser & Lead Organizer' },
    dueDate: '12-10-2026',
    priority: 'High',
    status: 'Pending',
    announcements: [],
    createdAt: '2026-10-09T08:15:00.000Z',
  },
];

const SEED_POLLS = [
  {
    id: 'poll-1',
    question: 'Which Garba musical troupe should we book for Day 3 (12 Oct)?',
    description: 'Help the cultural committee finalize the orchestra for Monday night Garba after the 8:00 PM Maha Aarti.',
    options: [
      { id: 'opt-1-1', text: 'Live Traditional Gujarati Dholak & Shenai Troupe', voterIds: ['mem-1', 'mem-3', 'mem-4'], votesCount: 3 },
      { id: 'opt-1-2', text: 'Modern Fusion DJ with Folk Rhythm & Dhol Combo', voterIds: ['mem-2'], votesCount: 1 },
      { id: 'opt-1-3', text: 'Classical Authentic Raas-Garba Mandali', voterIds: ['mem-5'], votesCount: 1 },
    ],
    createdBy: { id: 'mem-1', name: 'Devansh Sharma', role: 'Superuser & Lead Organizer' },
    createdAt: '2026-10-02T10:00:00.000Z',
    startsAt: '2026-10-02T00:00:00.000Z',
    endsAt: '2026-10-12T20:00:00.000Z',
    status: 'active',
    voters: ['mem-1', 'mem-2', 'mem-3', 'mem-4', 'mem-5'],
    totalVotes: 5,
  },
  {
    id: 'poll-2',
    question: 'Maha Ashtami (18 Oct) Hawan Prasad Preference',
    description: 'Decision on whether to prepare fresh Desi Ghee Sooji Halwa or Kesari Kheer for all members.',
    options: [
      { id: 'opt-2-1', text: 'Desi Ghee Sooji Halwa, Chana & Puri Prasad', voterIds: ['mem-1', 'mem-2'], votesCount: 2 },
      { id: 'opt-2-2', text: 'Kesari Dryfruit Kheer, Puri & Shrikhand', voterIds: ['mem-3'], votesCount: 1 },
    ],
    createdBy: { id: 'mem-2', name: 'Ramesh Shah', role: 'President (Admin)' },
    createdAt: '2026-10-03T08:00:00.000Z',
    startsAt: '2026-10-03T00:00:00.000Z',
    endsAt: '2026-10-17T22:00:00.000Z',
    status: 'active',
    voters: ['mem-1', 'mem-2', 'mem-3'],
    totalVotes: 3,
  },
  {
    id: 'poll-3',
    question: 'Daily Garba Timing Extension on Weekend (17-18 Oct)',
    description: 'Request permission to extend community music system playing hours from 10:30 PM to 11:30 PM.',
    options: [
      { id: 'opt-3-1', text: 'Yes, extend till 11:30 PM with low bass volume', voterIds: ['mem-1', 'mem-3', 'mem-4', 'mem-5'], votesCount: 4 },
      { id: 'opt-3-2', text: 'No, strictly follow 10:30 PM community decibel limit', voterIds: ['mem-2'], votesCount: 1 },
    ],
    createdBy: { id: 'mem-1', name: 'Devansh Sharma', role: 'Superuser & Lead Organizer' },
    createdAt: '2026-10-01T10:00:00.000Z',
    startsAt: '2026-10-01T00:00:00.000Z',
    endsAt: '2026-10-02T22:00:00.000Z',
    status: 'closed',
    voters: ['mem-1', 'mem-2', 'mem-3', 'mem-4', 'mem-5'],
    totalVotes: 5,
  }
];

const SEED_ANNOUNCEMENTS = [
  {
    id: 'ann-init-1',
    title: '🕉️ Navratri 2026 Maha Aarti Schedule & Timings',
    message: 'Daily Maha Aarti will be conducted strictly at 8:00 PM from 11 Oct to 19 Oct. All members are requested to assemble at the pandal by 7:45 PM for 108 Diya Deepotsav.',
    category: 'aarti_update',
    postedBy: { id: 'mem-1', name: 'Devansh Sharma', role: 'Superuser' },
    createdAt: new Date().toISOString(),
    priority: 'high',
    expiresAt: '2026-10-20T00:00:00.000Z',
    linkScreen: 'Attendance',
  },
  {
    id: 'ann-init-2',
    title: '🗳️ New Decision Poll: Day 3 Garba Musical Troupe',
    message: 'A new voting poll has been created for all members to decide the music troupe for Day 3. Cast your vote in the Voting Polls tab before 12 Oct.',
    category: 'poll_alert',
    postedBy: { id: 'mem-1', name: 'Devansh Sharma', role: 'Superuser' },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    priority: 'normal',
    expiresAt: '2026-10-12T20:00:00.000Z',
    linkScreen: 'VotingPolls',
  },
  {
    id: 'ann-init-3',
    title: '📋 Seva Task Reminder: Day 1 Pandal & Altar Readiness',
    message: 'Members assigned to Day 1 Seva tasks: please report to the stage entrance at 5:00 PM for flower toran hanging and altar setup.',
    category: 'task_reminder',
    postedBy: { id: 'mem-2', name: 'Ramesh Shah', role: 'Admin' },
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    priority: 'high',
    expiresAt: '2026-10-11T20:00:00.000Z',
    linkScreen: 'Tasks',
  },
];

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
  const [carryForwardBalance, setCarryForwardBalance] = useState('45000');
  const [loaded, setLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState({
    lastSynced: new Date().toISOString(),
    isSyncing: false,
    platform: 'Android • iOS • Web',
  });

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
        await AsyncStorage.setItem(incomingKey, JSON.stringify(incomingData));
        if (incomingKey === KEYS.MEMBERS) {
          await AsyncStorage.setItem('@malla_mata_members', JSON.stringify(incomingData));
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

    return () => {
      if (bc) {
        try { bc.close(); } catch (e) {}
      }
      if (unsubscribeCloud) unsubscribeCloud();
    };
  }, []);

  const loadAll = async () => {
    try {
      const keys = Object.values(KEYS);
      const results = await AsyncStorage.multiGet(keys);
      const map = {};
      results.forEach(([k, v]) => {
        try {
          map[k] = v ? JSON.parse(v) : null;
        } catch (err) {
          console.warn(`Safe recovery: error parsing ${k}`, err);
          map[k] = null;
        }
      });

      // Chat retention: auto delete older than 21 days
      const rawMessages = map[KEYS.MESSAGES] || SEED_MESSAGES;
      const now = Date.now();
      const MAX_RETENTION_MS = 21 * 24 * 60 * 60 * 1000; // 21 days
      const DISPLAY_RETENTION_MS = 15 * 24 * 60 * 60 * 1000; // 15 days

      // Purge messages > 21 days old permanently
      const nonExpired = rawMessages.filter(m => (now - new Date(m.timestamp).getTime()) <= MAX_RETENTION_MS);
      if (nonExpired.length !== rawMessages.length) {
        await persist(KEYS.MESSAGES, nonExpired);
      }
      // Display messages within 15 days
      const activeMsgs = nonExpired.filter(m => (now - new Date(m.timestamp).getTime()) <= DISPLAY_RETENTION_MS);

      setFunds(map[KEYS.FUNDS] || SEED_FUNDS);
      setExpenses(map[KEYS.EXPENSES] || SEED_EXPENSES);
      setSponsors(map[KEYS.SPONSORS] || SEED_SPONSORS);
      setMessages(activeMsgs);
      setMembers(map[KEYS.MEMBERS] || SEED_MEMBERS);
      setQrCodes(map[KEYS.QR_CODES] || []);
      setThemes(map[KEYS.THEMES] || SEED_THEMES);
      setAttendance(map[KEYS.ATTENDANCE] || {});
      setMedia(map[KEYS.MEDIA] || SEED_MEDIA);
      setTasks(map[KEYS.TASKS] || SEED_TASKS);
      setPolls(map[KEYS.POLLS] || SEED_POLLS);
      setAnnouncements(map[KEYS.ANNOUNCEMENTS] || SEED_ANNOUNCEMENTS);
      setCarryForwardBalance(map[KEYS.CARRY_FORWARD] || '45000');

      // Save initial seeds if first time
      if (!map[KEYS.FUNDS]) await persist(KEYS.FUNDS, SEED_FUNDS);
      if (!map[KEYS.EXPENSES]) await persist(KEYS.EXPENSES, SEED_EXPENSES);
      if (!map[KEYS.SPONSORS]) await persist(KEYS.SPONSORS, SEED_SPONSORS);
      if (!map[KEYS.MEMBERS]) await persist(KEYS.MEMBERS, SEED_MEMBERS);
      if (!map[KEYS.THEMES]) await persist(KEYS.THEMES, SEED_THEMES);
      if (!map[KEYS.MEDIA]) await persist(KEYS.MEDIA, SEED_MEDIA);
      if (!map[KEYS.TASKS]) await persist(KEYS.TASKS, SEED_TASKS);
      if (!map[KEYS.POLLS]) await persist(KEYS.POLLS, SEED_POLLS);
      if (!map[KEYS.ANNOUNCEMENTS]) await persist(KEYS.ANNOUNCEMENTS, SEED_ANNOUNCEMENTS);
      if (!map[KEYS.CARRY_FORWARD]) await persist(KEYS.CARRY_FORWARD, '45000');
    } catch (e) {
      console.error('Data load error:', e);
    } finally {
      setLoaded(true);
    }
  };

  const persist = async (key, data) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
      if (key === KEYS.MEMBERS) {
        await AsyncStorage.setItem('@malla_mata_members', JSON.stringify(data));
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
