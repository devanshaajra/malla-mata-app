import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Platform, Image, ImageBackground, Dimensions,
  Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { COLORS, MENU_ITEMS, SLOGAN, MANTRA } from '../utils/constants';

export default function HomeScreen({ navigation }) {
  const { currentUser, logout, isAdmin, isSuperuser } = useAuth();
  const {
    totalFundsCollected, totalSponsorFunds, totalExpenses, funds,
    carryForwardBalance, netBalance, tasks, announcements, addAnnouncement, polls,
    syncStatus, triggerSync
  } = useData();
  const [activeBannerIdx, setActiveBannerIdx] = useState(0);
  const [activeShlokaIdx, setActiveShlokaIdx] = useState(0);
  const scrollRef = useRef(null);
  const [scrollY, setScrollY] = useState(0);

  // Auto-rotate Blinkit banners in a loop every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveBannerIdx(prev => (prev + 1) % 4);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Compute Today's Date formatted as DD-MM-YYYY
  const today = new Date();
  const todayStr = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`;

  // Filter announcements: exclude funds, expenses, sponsors, media as instructed
  const allowedAnnouncements = (announcements || []).filter(a => {
    const cat = (a.category || '').toLowerCase();
    const forbidden = ['fund', 'funds', 'expense', 'expenses', 'sponsor', 'sponsors', 'media'];
    return !forbidden.includes(cat);
  });

  const activePolls = (polls || []).filter(p => {
    const isExpired = p.endsAt && Date.now() > new Date(p.endsAt).getTime();
    return p.status !== 'closed' && !isExpired;
  });

  // Track dismissed pop-up alert announcements
  const [dismissedAnnouncementIds, setDismissedAnnouncementIds] = useState([]);
  const [showPopupModal, setShowPopupModal] = useState(false);
  const [popupAnnouncement, setPopupAnnouncement] = useState(null);

  // Admin Post Announcement Modal
  const [showPostModal, setShowPostModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newCategory, setNewCategory] = useState('announcement');
  const [newLinkScreen, setNewLinkScreen] = useState('VotingPolls');

  const handleDismissPopup = async () => {
    setShowPopupModal(false);
    try {
      await AsyncStorage.setItem('@mm_last_popup_timestamp', Date.now().toString());
    } catch (e) {}
  };

  const handleActionPopup = async () => {
    const target = popupAnnouncement?.linkScreen;
    setShowPopupModal(false);
    try {
      await AsyncStorage.setItem('@mm_last_popup_timestamp', Date.now().toString());
    } catch (e) {}
    if (target && target !== 'HomeScreen') {
      navigation.navigate(target);
    }
  };

  const handlePublishAnnouncement = async () => {
    if (!newTitle.trim() || !newMessage.trim()) {
      alert('Please enter both title and message.');
      return;
    }
    const res = await addAnnouncement(
      {
        title: newTitle.trim(),
        message: newMessage.trim(),
        category: newCategory,
        linkScreen: newLinkScreen,
      },
      currentUser
    );
    if (res?.success) {
      setNewTitle('');
      setNewMessage('');
      setShowPostModal(false);
    }
  };

  // User's assigned pending tasks
  const userPendingTasks = (tasks || []).filter(t => {
    const isAssigned = (t.assignedTo || []).some(
      a => a.id === currentUser?.id || a.name?.toLowerCase() === (currentUser?.displayName || currentUser?.name)?.toLowerCase()
    );
    return isAssigned && (t.status === 'Pending' || t.status === 'In Progress');
  });

  const SHLOKAS = [
    {
      id: 'sh-1',
      title: 'मङ्गल श्लोक (Mangala Shloka)',
      deity: 'Maa Narayani',
      line1: 'सर्वमङ्गलमाङ्गल्ये शिवे सर्वार्थसाधिके ।',
      line2: 'शरण्ये त्र्यम्बके गौरि नारायणि नमोऽस्तु ते ॥',
      meaning: 'Salutations to Devi Narayani, the auspiciousness of all that is auspicious, the accomplish-er of all auspicious goals, the giver of refuge, the three-eyed divine Gauri.',
    },
    {
      id: 'sh-2',
      title: 'दुर्गा स्तुति (Devi Stuti)',
      deity: 'Maa Jagadamba',
      line1: 'या देवी सर्वभूतेषु शक्ति-रूपेण संस्थिता ।',
      line2: 'नमस्तस्यै नमस्तस्यै नमस्तस्यै नमो नमः ॥',
      meaning: 'To that Divine Mother who abides in all living beings in the form of divine energy, courage, and spiritual strength; salutations to Her again and again.',
    },
    {
      id: 'sh-3',
      title: 'दुर्गा कवच (Maha Kavacham)',
      deity: 'Maa Durga',
      line1: 'ॐ जयन्ती मङ्गला काली भद्रकाली कपालिनी ।',
      line2: 'दुर्गा क्षमा शिवा धात्री स्वाहा स्वधा नमोऽस्तु ते ॥',
      meaning: 'O Jayanti, Mangala, Kali, Bhadrakali, Kapalini, Durga, Kshama, Shiva, Dhatri, Svaha, Svadha - our humble salutations unto You, O Supreme Mother.',
    },
  ];

  const BANNERS = [
    {
      id: 'b1',
      tag: '⚡ 9 DIVINE NIGHTS • 11 - 19 OCT',
      title: 'Maa Ambe Pandal & Garba Mahotsav',
      sub: 'Grand Raas-Garba, 108 Diya Deepotsav & Traditional Dandiya',
      badgeText: 'FESTIVAL SPECIAL',
      accentEmoji: '🪔',
      colors: ['#881337', '#BE123C', '#E11D48'],
      btnText: 'View Themes & Decor →',
      action: () => navigation.navigate('Themes'),
    },
    {
      id: 'b2',
      tag: '🪔 DAILY AT 8:00 PM SHARP',
      title: 'Daily Maha Aarti Schedule',
      sub: '8:00 PM Aarti Only • Mark attendance daily from 11 to 19 Oct',
      badgeText: 'PANDAL TIMINGS',
      accentEmoji: '✨',
      colors: ['#7C2D12', '#C2410C', '#EA580C'],
      btnText: 'Mark 8 PM Aarti Attendance →',
      action: () => navigation.navigate('Attendance'),
    },
    {
      id: 'b3',
      tag: '🗳️ DEMOCRACY IN SEVA • VOTE LIVE',
      title: 'Decision Polls',
      sub: 'Decide music troupe, prasad menu & timing extensions together',
      badgeText: 'LIVE DECISION',
      accentEmoji: '📊',
      colors: ['#4C1D95', '#6D28D9', '#8B5CF6'],
      btnText: 'Cast Your Vote Now →',
      action: () => navigation.navigate('VotingPolls'),
    },
    {
      id: 'b4',
      tag: '💰 100% TRANSPARENT • LIVE ACCOUNTS',
      title: 'Festival Ledger & Accounts',
      sub: 'Complete live transparent balance, inflows, sponsors & bills',
      badgeText: 'COMMUNITY LEDGER',
      accentEmoji: '🪙',
      colors: ['#14532D', '#15803D', '#22C55E'],
      btnText: 'Open Live Ledger →',
      action: () => navigation.navigate('Analytics'),
    },
  ];

  const getRoleBadge = () => {
    if (isSuperuser) return { label: 'Superuser Lead', color: '#D97706', icon: 'star' };
    if (isAdmin) return { label: 'Admin', color: '#DC2626', icon: 'shield-checkmark' };
    return { label: 'Member', color: '#16A34A', icon: 'person' };
  };

  const badge = getRoleBadge();
  const totalIncome = (parseFloat(carryForwardBalance) || 0) + totalFundsCollected + totalSponsorFunds;

  // Display user's display name or username formatted with @
  const rawName = currentUser?.displayName || currentUser?.name || currentUser?.username || 'Devansh';
  const cleanHandle = rawName.replace(/\s+/g, '_').toLowerCase();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#DC2626" />

      {/* Ambe Maa Divine Eyes Center Warm Blended Background Overlay (No black background) */}
      <View style={styles.divineEyesBgWrap} pointerEvents="none">
        <Image
          source={require('../../assets/ambe_maa_eyes_warm.png')}
          style={styles.divineEyesBg}
          resizeMode="contain"
        />
      </View>

      {/* Main Scrollable Content (Header + Content: 100% of the screen scrolls seamlessly) */}
      <ScrollView
        ref={scrollRef}
        onScroll={(e) => {
          const y = e.nativeEvent?.contentOffset?.y || 0;
          setScrollY(y);
        }}
        scrollEventThrottle={16}
        style={[
          styles.scrollContainer,
          Platform.OS === 'web' && { overflowY: 'auto', WebkitOverflowScrolling: 'touch' },
        ]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        bounces={true}
      >
        {/* Header (Festive Gradient & Attractive Navratri Logo) */}
        <LinearGradient
          colors={['#DC2626', '#EA580C', '#F59E0B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
        <View style={styles.headerTop}>
          {/* Navratri Themed Logo */}
          <View style={styles.headerLogoBadge}>
            <Image
              source={require('../../assets/navratri_logo.jpg')}
              style={styles.headerLogoImg}
              resizeMode="cover"
            />
          </View>

          <View style={styles.headerLeft}>
            <View style={styles.greetingRow}>
              <Text style={styles.sloganText}>{SLOGAN}</Text>
              <Text style={styles.diyaEmoji}>🪔</Text>
            </View>
            <Text style={styles.userGreetingText} numberOfLines={1}>
              Hi, @{currentUser?.username || cleanHandle}
            </Text>
            <Text style={styles.userFullName}>
              {currentUser?.displayName || currentUser?.name || 'Devansh Sharma'}
            </Text>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.profileBtn}
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.8}
            >
              {currentUser?.photoURL ? (
                <Image source={{ uri: currentUser.photoURL }} style={styles.profileAvatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>
                    {(currentUser?.displayName || currentUser?.name || 'D').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              {currentUser?.authProvider === 'Google' && (
                <View style={styles.googleIconBadge}>
                  <Ionicons name="logo-google" size={10} color="#EA4335" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Role & Aarti Pill (11 - 19 Oct 2026) & Live Sync */}
        <View style={styles.badgeRow}>
          <View style={[styles.roleBadge, { backgroundColor: badge.color }]}>
            <Ionicons name={badge.icon} size={13} color="#FFFFFF" />
            <Text style={styles.roleText}>{badge.label}</Text>
          </View>

          <View style={styles.aartiHeaderPill}>
            <Ionicons name="calendar-number" size={13} color="#FDE047" />
            <Text style={styles.aartiHeaderText}>11 - 19 Oct 2026</Text>
          </View>

          {/* Cross-Platform Real-Time Sync Indicator */}
          <TouchableOpacity
            style={styles.syncStatusPill}
            onPress={async () => {
              await triggerSync();
            }}
            activeOpacity={0.75}
          >
            <View style={[styles.syncDot, syncStatus?.isSyncing && styles.syncDotPulsing]} />
            <Ionicons name={syncStatus?.isSyncing ? 'sync' : 'cloud-done'} size={12} color="#FFFFFF" />
            <Text style={styles.syncStatusText}>
              {syncStatus?.isSyncing ? 'Syncing...' : 'Live Synced'}
            </Text>
          </TouchableOpacity>
        </View>
        </LinearGradient>

        {/* Inner Cards and Widgets Content */}
        <View style={styles.mainInnerContent}>
        {/* Modern Blinkit-Style Interactive Banner Carousel */}
        <View style={styles.bannerSection}>
          <LinearGradient
            colors={BANNERS[activeBannerIdx].colors}
            style={styles.blinkitBannerCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Top Blinkit Meta Bar */}
            <View style={styles.blinkitTopRow}>
              <View style={styles.blinkitTagPill}>
                <Ionicons name="flash" size={11} color="#FEF08A" />
                <Text style={styles.blinkitTagText}>{BANNERS[activeBannerIdx].tag}</Text>
              </View>

              {/* Elongated Pill Indicators */}
              <View style={styles.blinkitIndicatorsRow}>
                {BANNERS.map((_, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setActiveBannerIdx(i)}
                    style={[
                      styles.blinkitPill,
                      activeBannerIdx === i && styles.blinkitPillActive,
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* Middle Content Row with 3D-styled Accent */}
            <View style={styles.blinkitMiddleRow}>
              <View style={styles.blinkitTextCol}>
                <Text style={styles.blinkitTitle}>{BANNERS[activeBannerIdx].title}</Text>
                <Text style={styles.blinkitSub}>{BANNERS[activeBannerIdx].sub}</Text>
              </View>
              <View style={styles.blinkitEmojiBadge}>
                <Text style={styles.blinkitEmojiText}>{BANNERS[activeBannerIdx].accentEmoji}</Text>
              </View>
            </View>

            {/* Bottom Row with Modern Blinkit CTA */}
            <View style={styles.blinkitBottomRow}>
              <TouchableOpacity
                style={styles.blinkitCtaBtn}
                onPress={BANNERS[activeBannerIdx].action}
                activeOpacity={0.85}
              >
                <Text style={styles.blinkitCtaText}>{BANNERS[activeBannerIdx].btnText}</Text>
              </TouchableOpacity>
              <Text style={styles.blinkitOfferNote}>
                {BANNERS[activeBannerIdx].badgeText}
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Figma/Adobe-Inspired Quick Action Shortcut Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickActionStrip}
          contentContainerStyle={styles.quickActionContent}
        >
          {[
            { id: 'qa-aarti', label: '🪔 8 PM Aarti', screen: 'Attendance' },
            { id: 'qa-tasks', label: '📋 Tasks', screen: 'Tasks', badge: userPendingTasks.length },
            { id: 'qa-polls', label: '🗳️ Polls', screen: 'VotingPolls', badge: activePolls.length },
            { id: 'qa-chat', label: '💬 Chat', screen: 'Chat' },
            { id: 'qa-ledger', label: '💰 Ledger', screen: 'Analytics' },
            { id: 'qa-media', label: '📸 5x5 Media', screen: 'Media' },
          ].map(qa => (
            <TouchableOpacity
              key={qa.id}
              style={styles.quickActionChip}
              onPress={() => navigation.navigate(qa.screen)}
              activeOpacity={0.78}
            >
              <Text style={styles.quickActionChipText}>{qa.label}</Text>
              {qa.badge > 0 && (
                <View style={styles.quickActionBadge}>
                  <Text style={styles.quickActionBadgeText}>{qa.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Latest Community Announcement Alert Banner (Non-Financial, Non-Media) */}
        {allowedAnnouncements.length > 0 && (
          <View style={styles.announcementBannerWrap}>
            <TouchableOpacity
              style={styles.announcementBanner}
              activeOpacity={0.88}
              onPress={() => {
                setPopupAnnouncement(allowedAnnouncements[0]);
                setShowPopupModal(true);
              }}
            >
              <View style={styles.announcementLeft}>
                <View style={styles.announcementIconBg}>
                  <Ionicons name="notifications" size={17} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.announcementTagRow}>
                    <Text style={styles.announcementTag}>
                      {allowedAnnouncements[0].category === 'poll_alert'
                        ? '🗳️ DECISION POLL'
                        : allowedAnnouncements[0].category === 'aarti_update'
                        ? '🪔 AARTI UPDATE'
                        : allowedAnnouncements[0].category === 'task_reminder'
                        ? '📋 TASK REMINDER'
                        : '📢 COMMUNITY NOTICE'}
                    </Text>
                    <Text style={styles.announcementTimeTag}>Tap to read</Text>
                  </View>
                  <Text style={styles.announcementTitle} numberOfLines={1}>
                    {allowedAnnouncements[0].title}
                  </Text>
                  <Text style={styles.announcementSnippet} numberOfLines={1}>
                    {allowedAnnouncements[0].message}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#7C3AED" />
            </TouchableOpacity>

            {(isAdmin || isSuperuser) && (
              <TouchableOpacity
                style={styles.postNoticeBtn}
                onPress={() => setShowPostModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="megaphone" size={13} color="#7C3AED" />
                <Text style={styles.postNoticeBtnText}>+ Post Alert</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Frequently Shown Today's Pending Tasks Reminder Banner */}
        {userPendingTasks.length > 0 && (
          <TouchableOpacity
            style={styles.pendingTaskBanner}
            onPress={() => navigation.navigate('Tasks')}
            activeOpacity={0.88}
          >
            <View style={styles.pendingTaskLeft}>
              <View style={styles.pendingPulseDot} />
              <Ionicons name="checkbox" size={24} color="#DC2626" />
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingTaskTitle}>
                  Your Today's Seva Task is Pending! ({userPendingTasks.length})
                </Text>
                <Text style={styles.pendingTaskSub} numberOfLines={1}>
                  "{userPendingTasks[0]?.name}" • Tap to view & update progress
                </Text>
              </View>
            </View>
            <View style={styles.pendingTaskArrow}>
              <Ionicons name="arrow-forward" size={16} color="#DC2626" />
            </View>
          </TouchableOpacity>
        )}

        {/* Live Fund & Aarti Schedule Card */}
        <View style={styles.liveHeroCard}>
          <TouchableOpacity
            style={styles.heroLeft}
            onPress={() => navigation.navigate('Analytics')}
            activeOpacity={0.8}
          >
            <View style={styles.heroHeaderRow}>
              <Ionicons name="cash" size={18} color="#DC2626" />
              <Text style={styles.heroTitle}>NET BALANCE</Text>
            </View>
            <Text style={styles.heroAmount}>₹{netBalance.toLocaleString('en-IN')}</Text>
            <Text style={styles.heroSub}>Total Pool: ₹{totalIncome.toLocaleString('en-IN')}</Text>
          </TouchableOpacity>

          <View style={styles.heroDivider} />

          <TouchableOpacity
            style={styles.heroRight}
            onPress={() => navigation.navigate('Attendance')}
            activeOpacity={0.8}
          >
            <View style={styles.heroHeaderRow}>
              <Ionicons name="flame" size={18} color="#EA580C" />
              <Text style={styles.heroTitle}>AARTI SCHEDULE</Text>
            </View>
            <Text style={styles.aartiDateBig}>11 - 19 OCT</Text>
            <Text style={styles.aartiTimeSub}>8:00 PM Aarti Only</Text>
          </TouchableOpacity>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderLeft}>
            <Text style={styles.sectionTitle}>Festival Menu</Text>
            <Text style={styles.mantraText}>{MANTRA}</Text>
          </View>
          <TouchableOpacity
            style={styles.analyticsQuickBtn}
            onPress={() => navigation.navigate('Analytics')}
            activeOpacity={0.8}
          >
            <Ionicons name="wallet" size={15} color="#DC2626" />
            <Text style={styles.analyticsQuickText}>Open Ledger</Text>
          </TouchableOpacity>
        </View>

        {/* 3-Column Responsive Grid Menu */}
        <View style={styles.grid}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.gridCard}
              activeOpacity={0.75}
              onPress={() => navigation.navigate(item.screen)}
            >
              <View style={[styles.iconBg, { backgroundColor: item.bg || (item.color + '18') }]}>
                <Ionicons name={item.icon} size={28} color={item.color} />
                {item.id === 'tasks' && userPendingTasks.length > 0 && (
                  <View style={styles.taskBadge}>
                    <Text style={styles.taskBadgeText}>{userPendingTasks.length}</Text>
                  </View>
                )}
                {item.id === 'polls' && activePolls.length > 0 && (
                  <View style={[styles.taskBadge, { backgroundColor: '#7C3AED' }]}>
                    <Text style={styles.taskBadgeText}>{activePolls.length}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardLabel} numberOfLines={2}>
                {item.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Festival Highlights */}
        <View style={[styles.sectionHeaderRow, { marginTop: 22 }]}>
          <Text style={styles.sectionTitle}>Festival Quick Glance</Text>
          <Text style={styles.sectionSubBadge}>Navratri 2026</Text>
        </View>

        <View style={styles.statsRow}>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}
            onPress={() => navigation.navigate('FundCollection')}
            activeOpacity={0.8}
          >
            <Ionicons name="home" size={24} color="#DC2626" />
            <Text style={[styles.statNumber, { color: '#B91C1C' }]}>96</Text>
            <Text style={styles.statLabel}>Member Units</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: '#FFEDD5', borderColor: '#FED7AA' }]}
            onPress={() => navigation.navigate('Themes')}
            activeOpacity={0.8}
          >
            <Ionicons name="sparkles" size={24} color="#EA580C" />
            <Text style={[styles.statNumber, { color: '#C2410C' }]}>9 Days</Text>
            <Text style={styles.statLabel}>Themes & Outputs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: '#FEF9C3', borderColor: '#FDE68A' }]}
            onPress={() => navigation.navigate('Analytics')}
            activeOpacity={0.8}
          >
            <Ionicons name="wallet" size={24} color="#D97706" />
            <Text style={[styles.statNumber, { color: '#B45309' }]}>
              ₹{netBalance.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.statLabel}>Net Ledger</Text>
          </TouchableOpacity>
        </View>

        {/* Auspicious Sacred Shlokas Section */}
        <View style={styles.shlokasContainer}>
          <View style={styles.shlokasHeaderRow}>
            <View style={styles.shlokasHeaderLeft}>
              <Ionicons name="flame" size={18} color="#EA580C" />
              <Text style={styles.shlokasMainTitle}>पावन दुर्गा श्लोक • Sacred Shlokas</Text>
            </View>
            <Text style={styles.shlokasSubBadge}>Navratri 2026</Text>
          </View>

          {/* Shloka Selector Tabs */}
          <View style={styles.shlokaTabsRow}>
            {SHLOKAS.map((s, idx) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.shlokaTab, activeShlokaIdx === idx && styles.shlokaTabActive]}
                onPress={() => setActiveShlokaIdx(idx)}
                activeOpacity={0.8}
              >
                <Text style={[styles.shlokaTabText, activeShlokaIdx === idx && styles.shlokaTabTextActive]}>
                  {s.title.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Active Shloka Display Card */}
          <LinearGradient
            colors={['#FFFBEB', '#FEF3C7']}
            style={styles.shlokaDisplayCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.shlokaCardTop}>
              <Text style={styles.shlokaCardTitle}>{SHLOKAS[activeShlokaIdx].title}</Text>
              <Text style={styles.shlokaDeityTag}>समर्पित: {SHLOKAS[activeShlokaIdx].deity}</Text>
            </View>

            <View style={styles.shlokaVerseBox}>
              <Text style={styles.shlokaVerseLine}>{SHLOKAS[activeShlokaIdx].line1}</Text>
              <Text style={styles.shlokaVerseLine}>{SHLOKAS[activeShlokaIdx].line2}</Text>
            </View>

            <View style={styles.shlokaDivider} />

            <View style={styles.shlokaMeaningBox}>
              <Ionicons name="sparkles" size={14} color="#D97706" style={{ marginTop: 2 }} />
              <Text style={styles.shlokaMeaningText}>
                {SHLOKAS[activeShlokaIdx].meaning}
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Bottom App Logout & Account Footer */}
        <View style={styles.bottomAppSection}>
          <TouchableOpacity
            style={styles.bottomLogoutBtn}
            onPress={logout}
            activeOpacity={0.85}
          >
            <Ionicons name="log-out-outline" size={20} color="#DC2626" />
            <Text style={styles.bottomLogoutText}>Log Out of Account</Text>
          </TouchableOpacity>
          <Text style={styles.bottomFooterText}>Malla Mata Navratri Mahotsav 2026 • Jay Ambe 🪔</Text>
        </View>
        </View>
      </ScrollView>

      {/* Floating Quick Scroll Controls (Instant 1-tap navigation up/down) */}
      {scrollY > 220 ? (
        <TouchableOpacity
          style={styles.floatingScrollTopBtn}
          onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-up" size={16} color="#FFFFFF" />
          <Text style={styles.floatingScrollText}>Top</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.floatingScrollDownBtn}
          onPress={() => scrollRef.current?.scrollTo({ y: 460, animated: true })}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-down" size={14} color="#991B1B" />
          <Text style={styles.floatingScrollDownText}>Menu ⬇</Text>
        </TouchableOpacity>
      )}

      {/* ── Pop-Up Alert Modal for Announcements / Polls / Notices ── */}
      <Modal
        visible={showPopupModal && !!popupAnnouncement}
        transparent={true}
        animationType="fade"
        onRequestClose={handleDismissPopup}
      >
        <View style={styles.popupOverlay}>
          <View style={styles.popupCard}>
            <LinearGradient
              colors={['#DC2626', '#B91C1C']}
              style={styles.popupHeaderGradient}
            >
              <View style={styles.popupHeaderTop}>
                <View style={styles.popupCategoryPill}>
                  <Ionicons name="megaphone" size={14} color="#FDE047" />
                  <Text style={styles.popupCategoryText}>
                    {popupAnnouncement?.category === 'poll_alert'
                      ? 'NEW VOTING POLL'
                      : popupAnnouncement?.category === 'aarti_update'
                      ? '8 PM AARTI UPDATE'
                      : popupAnnouncement?.category === 'task_reminder'
                      ? 'SEVA TASK REMINDER'
                      : 'COMMUNITY ANNOUNCEMENT'}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleDismissPopup} style={styles.popupCloseBtn}>
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <Text style={styles.popupTitle}>{popupAnnouncement?.title}</Text>
            </LinearGradient>

            <View style={styles.popupBody}>
              <Text style={styles.popupMessage}>{popupAnnouncement?.message}</Text>

              <View style={styles.popupMetaRow}>
                <Ionicons name="person-circle" size={16} color="#9CA3AF" />
                <Text style={styles.popupMetaText}>
                  Posted by {popupAnnouncement?.postedBy?.name || 'Admin'} (
                  {popupAnnouncement?.postedBy?.role || 'Admin'})
                </Text>
              </View>

              <View style={styles.popupActionsRow}>
                <TouchableOpacity
                  style={styles.popupDismissBtn}
                  onPress={handleDismissPopup}
                  activeOpacity={0.8}
                >
                  <Text style={styles.popupDismissText}>Acknowledge</Text>
                </TouchableOpacity>

                {popupAnnouncement?.linkScreen && popupAnnouncement.linkScreen !== 'HomeScreen' && (
                  <TouchableOpacity
                    style={styles.popupActionBtn}
                    onPress={handleActionPopup}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#7C3AED', '#6D28D9']}
                      style={styles.popupActionGradient}
                    >
                      <Text style={styles.popupActionText}>
                        {popupAnnouncement.linkScreen === 'VotingPolls'
                          ? 'Cast Vote Now →'
                          : popupAnnouncement.linkScreen === 'Tasks'
                          ? 'View Tasks →'
                          : popupAnnouncement.linkScreen === 'Attendance'
                          ? 'Mark Aarti Attendance →'
                          : 'View Details →'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Admin Post New Announcement Modal ── */}
      <Modal
        visible={showPostModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPostModal(false)}
      >
        <View style={styles.popupOverlay}>
          <View style={[styles.popupCard, { maxWidth: 440 }]}>
            <View style={styles.postModalHeader}>
              <View>
                <Text style={styles.postModalTitle}>📢 Post Community Announcement</Text>
                <Text style={styles.postModalSub}>
                  Will pop up on all members' Home Screens & post to Chat
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowPostModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.postModalBody}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 🪔 8 PM Aarti Diya Lighting Guidelines"
                placeholderTextColor="#9CA3AF"
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <Text style={styles.inputLabel}>Message / Notice *</Text>
              <TextInput
                style={[styles.textInput, { height: 75, textAlignVertical: 'top' }]}
                placeholder="Write detailed announcement for members..."
                placeholderTextColor="#9CA3AF"
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
              />

              <Text style={styles.inputLabel}>Notice Category *</Text>
              <View style={styles.catChipsRow}>
                {[
                  { id: 'announcement', label: '📢 General' },
                  { id: 'aarti_update', label: '🪔 Aarti' },
                  { id: 'task_reminder', label: '📋 Task' },
                  { id: 'poll_alert', label: '🗳️ Poll' },
                ].map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.catChip, newCategory === c.id && styles.catChipActive]}
                    onPress={() => setNewCategory(c.id)}
                  >
                    <Text style={[styles.catChipText, newCategory === c.id && styles.catChipTextActive]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Link Target Screen (Optional)</Text>
              <View style={styles.catChipsRow}>
                {[
                  { id: 'VotingPolls', label: '🗳️ Polls' },
                  { id: 'Tasks', label: '📋 Tasks' },
                  { id: 'Attendance', label: '🪔 Aarti' },
                  { id: 'HomeScreen', label: '🏠 None' },
                ].map(s => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.catChip, newLinkScreen === s.id && styles.catChipActive]}
                    onPress={() => setNewLinkScreen(s.id)}
                  >
                    <Text style={[styles.catChipText, newLinkScreen === s.id && styles.catChipTextActive]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowPostModal(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.publishBtn}
                  onPress={handlePublishAnnouncement}
                >
                  <LinearGradient
                    colors={['#DC2626', '#B91C1C']}
                    style={styles.publishBtnGradient}
                  >
                    <Ionicons name="megaphone" size={16} color="#FFFFFF" />
                    <Text style={styles.publishBtnText}>Publish Popup Alert</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF7',
    position: 'relative',
    height: '100%',
    width: '100%',
  },
  divineEyesBgWrap: {
    position: 'absolute',
    top: '25%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
    opacity: 0.12,
    pointerEvents: 'none',
  },
  divineEyesBg: {
    width: 320,
    height: 320,
  },
  header: {
    paddingTop: Platform.OS === 'web' ? 24 : 48,
    paddingBottom: 18,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#B45309',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLogoBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    marginRight: 10,
    borderWidth: 2.5,
    borderColor: '#FDE047',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  headerLogoImg: {
    width: '100%',
    height: '100%',
  },
  headerLeft: {
    flex: 1,
    marginRight: 10,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sloganText: {
    fontSize: 13,
    color: '#FEF3C7',
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  diyaEmoji: {
    fontSize: 14,
  },
  userGreetingText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  userFullName: {
    fontSize: 12,
    color: '#FDE047',
    marginTop: 2,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileBtn: {
    padding: 2,
    position: 'relative',
  },
  profileAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  avatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FDE68A',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: '#DC2626',
  },
  googleIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EA4335',
  },
  logoutBtn: {
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  aartiHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  aartiHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  syncStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  syncDotPulsing: {
    backgroundColor: '#FACC15',
  },
  syncStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  scrollContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: 0,
    ...(Platform.OS === 'web' ? {
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
    } : {}),
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 70,
  },
  mainInnerContent: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  floatingScrollTopBtn: {
    position: 'absolute',
    bottom: 22,
    right: 18,
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 99,
    gap: 4,
  },
  floatingScrollText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  floatingScrollDownBtn: {
    position: 'absolute',
    bottom: 22,
    right: 18,
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 99,
    gap: 4,
  },
  floatingScrollDownText: {
    color: '#991B1B',
    fontSize: 11,
    fontWeight: '800',
  },
  bannerSection: {
    marginBottom: 12,
  },
  // ── Modern Blinkit-Style Banner Styles ──
  blinkitBannerCard: {
    borderRadius: 22,
    padding: 16,
    shadowColor: '#991B1B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  blinkitTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  blinkitTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(254, 240, 138, 0.4)',
  },
  blinkitTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FEF08A',
    letterSpacing: 0.5,
  },
  blinkitIndicatorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  blinkitPill: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  blinkitPillActive: {
    width: 22,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  blinkitMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  blinkitTextCol: {
    flex: 1,
    marginRight: 10,
  },
  blinkitTitle: {
    fontSize: 17.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  blinkitSub: {
    fontSize: 11.5,
    color: '#FEE2E2',
    fontWeight: '600',
    marginTop: 4,
    lineHeight: 16,
  },
  blinkitEmojiBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  blinkitEmojiText: {
    fontSize: 26,
  },
  blinkitBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.18)',
  },
  blinkitCtaBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  blinkitCtaText: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#991B1B',
  },
  blinkitOfferNote: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FEF08A',
    letterSpacing: 0.4,
  },

  // ── Figma/Adobe Quick Action Shortcuts Strip ──
  quickActionStrip: {
    marginBottom: 14,
  },
  quickActionContent: {
    gap: 8,
    paddingVertical: 2,
  },
  quickActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionChipText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#7C2D12',
  },
  quickActionBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  quickActionBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  liveHeroCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  heroLeft: {
    flex: 1,
    paddingRight: 10,
  },
  heroRight: {
    flex: 1,
    paddingLeft: 10,
  },
  heroDivider: {
    width: 1,
    backgroundColor: '#FEF3C7',
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#78350F',
    letterSpacing: 0.5,
  },
  heroAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#DC2626',
    marginTop: 4,
  },
  heroSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  aartiDateBig: {
    fontSize: 18,
    fontWeight: '900',
    color: '#EA580C',
    marginTop: 6,
  },
  aartiTimeSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionHeaderLeft: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
  },
  mantraText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '700',
    marginTop: 1,
  },
  analyticsQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  analyticsQuickText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  sectionSubBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  gridCard: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    minHeight: 112,
  },
  iconBg: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerLogoBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FEF3C7',
    marginRight: 10,
    backgroundColor: '#78350F',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  headerLogoImg: {
    width: '100%',
    height: '100%',
  },
  shlokasContainer: {
    marginTop: 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  shlokasHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  shlokasHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shlokasMainTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1E293B',
  },
  shlokasSubBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  shlokaTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  shlokaTab: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  shlokaTabActive: {
    backgroundColor: '#DC2626',
    borderColor: '#B91C1C',
  },
  shlokaTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  shlokaTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  shlokaDisplayCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  shlokaCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  shlokaCardTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#991B1B',
  },
  shlokaDeityTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  shlokaVerseBox: {
    paddingVertical: 6,
    gap: 6,
    alignItems: 'center',
  },
  shlokaVerseLine: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#78350F',
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.3,
  },
  shlokaDivider: {
    height: 1,
    backgroundColor: '#FDE68A',
    marginVertical: 10,
  },
  shlokaMeaningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: 4,
  },
  shlokaMeaningText: {
    flex: 1,
    fontSize: 11,
    color: '#78350F',
    lineHeight: 16,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  pendingTaskBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF1F2',
    borderWidth: 1.5,
    borderColor: '#FDA4AF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  pendingTaskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 6,
  },
  pendingPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E11D48',
  },
  pendingTaskTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#9F1239',
  },
  pendingTaskSub: {
    fontSize: 11,
    color: '#BE123C',
    fontWeight: '600',
    marginTop: 2,
  },
  pendingTaskArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFE4E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  taskBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // ── Announcement Banner & Popups ──
  announcementBannerWrap: {
    marginBottom: 12,
    gap: 6,
  },
  announcementBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF5FF',
    borderWidth: 1.5,
    borderColor: '#D8B4FE',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  announcementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  announcementIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  announcementTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  announcementTag: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#6D28D9',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  announcementTimeTag: {
    fontSize: 9.5,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  announcementTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#3B0764',
  },
  announcementSnippet: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  postNoticeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F3E8FF',
  },
  postNoticeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D28D9',
  },

  // ── Pop-Up Alert Modal ──
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  popupCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
  },
  popupHeaderGradient: {
    padding: 16,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  popupHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  popupCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  popupCategoryText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FDE047',
    letterSpacing: 0.5,
  },
  popupCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  popupBody: {
    padding: 18,
  },
  popupMessage: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 14,
  },
  popupMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 14,
  },
  popupMetaText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  popupActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  popupDismissBtn: {
    flex: 0.45,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupDismissText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  popupActionBtn: {
    flex: 0.55,
    borderRadius: 12,
    overflow: 'hidden',
  },
  popupActionGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Post Notice Modal
  postModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  postModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#991B1B',
  },
  postModalSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  postModalBody: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 5,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1F2937',
    marginBottom: 10,
    backgroundColor: '#F9FAFB',
  },
  catChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  catChipActive: {
    backgroundColor: '#DC2626',
    borderColor: '#B91C1C',
  },
  catChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  catChipTextActive: {
    color: '#FFFFFF',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 0.35,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  publishBtn: {
    flex: 0.65,
    borderRadius: 12,
    overflow: 'hidden',
  },
  publishBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  publishBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bottomAppSection: {
    marginTop: 20,
    marginBottom: 28,
    alignItems: 'center',
    paddingHorizontal: 16,
    maxWidth: 440,
    alignSelf: 'center',
    width: '100%',
  },
  bottomLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: '100%',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bottomLogoutText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.2,
  },
  bottomFooterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 12,
    textAlign: 'center',
  },
});

