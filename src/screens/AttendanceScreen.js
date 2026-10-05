import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { AARTI_DATES } from '../utils/constants';

// Aarti session: 8:00 PM Maha Aarti ONLY
const SESSIONS = [
  { id: 'evening', label: 'Daily Maha Aarti', time: '8:00 PM Sharp', icon: 'flame' },
];

export default function AttendanceScreen({ navigation }) {
  const { currentUser, isSuperuser } = useAuth();
  const { members, markAttendance, getAttendance } = useData();
  const { showToast } = useToast();

  // Default to 11-10-2026 (Day 1)
  const [selectedDate, setSelectedDate] = useState('11-10-2026');
  const [searchQuery, setSearchQuery] = useState('');

  // Fixed session: 8:00 PM only
  const selectedSession = 'evening';
  const sessionKey = `${selectedDate}_${selectedSession}`;
  const sessionAttendance = getAttendance(sessionKey);

  // Compute Today's Date formatted as DD-MM-YYYY
  const today = new Date();
  const todayStr = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`;
  
  // Is selected date the same day?
  const isSameDay = (selectedDate === todayStr);

  // Resolve logged in user to their entry in the official members roster
  const myRosterMember = (members || []).find(
    m => m.id === currentUser?.id ||
         (m.name && currentUser?.name && m.name.toLowerCase() === currentUser.name.toLowerCase()) ||
         (m.phone && currentUser?.phone && m.phone.replace(/\s+/g, '') === currentUser.phone.replace(/\s+/g, ''))
  );
  const myMemberId = myRosterMember?.id || currentUser?.id;
  const myMemberName = myRosterMember?.name || currentUser?.displayName || currentUser?.name || 'Member';

  const isCurrentUserMarked = sessionAttendance.some(
    a => a.memberId === myMemberId ||
         a.memberId === currentUser?.id ||
         a.memberName?.toLowerCase() === myMemberName?.toLowerCase() ||
         a.memberName?.toLowerCase() === currentUser?.name?.toLowerCase()
  );

  // Mark My Own Attendance Handler
  const handleToggleMyAttendance = async () => {
    // If not superuser:
    if (!isSuperuser) {
      if (!isSameDay) {
        showToast(
          'Same-Day Attendance Only ⚠️',
          'warning',
          `Cannot mark for ${selectedDate}. You can only mark today (${todayStr}).`
        );
        return;
      }

      if (isCurrentUserMarked) {
        showToast(
          'Attendance Locked 🔒',
          'info',
          'Once marked, attendance cannot be unmarked! Only Superuser can modify.'
        );
        return;
      }
    }

    const res = await markAttendance(
      sessionKey,
      myMemberId,
      myMemberName,
      currentUser
    );

    if (res?.success) {
      if (res.action === 'marked') {
        showToast('8 PM Aarti Attendance Marked! 🪔', 'success', `Synced instantly to Admin for ${selectedDate}`);
      } else {
        showToast('Attendance Removed (Superuser Override)', 'delete', `Cleared for ${selectedDate}`);
      }
    } else if (res?.error) {
      showToast(res.error, 'warning');
    }
  };

  // Superuser Admin Member Toggle
  const handleSuperuserToggleMember = async (member) => {
    if (!isSuperuser) {
      showToast(
        'Superuser Only 🔒',
        'warning',
        'Only Superuser is authorized to add or remove attendance for other members.'
      );
      return;
    }

    const wasMarked = sessionAttendance.some(a => a.memberId === member.id || a.memberName === member.name);
    const res = await markAttendance(sessionKey, member.id, member.name, currentUser);

    if (res?.success) {
      if (!wasMarked) {
        showToast(`Marked Present: ${member.name} 🪔`, 'insert', `8 PM Aarti (${selectedDate})`);
      } else {
        showToast(`Removed: ${member.name}`, 'delete', `Attendance cleared by Superuser`);
      }
    } else if (res?.error) {
      showToast(res.error, 'warning');
    }
  };

  // Filtered members list directly from the official list maintained by superuser
  const filteredMembers = (members || []).filter(m => {
    const q = searchQuery.toLowerCase();
    return (m.name || '').toLowerCase().includes(q) ||
           (m.designation || '').toLowerCase().includes(q) ||
           (m.role || '').toLowerCase().includes(q) ||
           (m.phone || '').includes(q);
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#EA580C', '#D97706']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>8:00 PM Maha Aarti Attendance</Text>
          <Text style={styles.headerSub}>Navratri 11 Oct - 19 Oct 2026</Text>
        </View>
        <View style={{ width: 32 }} />
      </LinearGradient>

      {/* Navratri Days Horizontal Selector (11 to 19 Oct 2026) */}
      <View style={styles.dateSelectorSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroll}>
          {AARTI_DATES.map((item, idx) => {
            const dateStr = item.date || item;
            const isSelected = selectedDate === dateStr;
            const isItemToday = dateStr === todayStr;

            return (
              <TouchableOpacity
                key={dateStr}
                style={[
                  styles.dateChip,
                  isSelected && styles.dateChipActive,
                  isItemToday && styles.dateChipToday,
                ]}
                onPress={() => setSelectedDate(dateStr)}
                activeOpacity={0.8}
              >
                <View style={styles.dateChipHeader}>
                  <Text style={[styles.dayLabel, isSelected && styles.dayLabelActive]}>
                    {item.day || `Day ${idx + 1}`}
                  </Text>
                  {isItemToday && (
                    <View style={styles.todayPill}>
                      <Text style={styles.todayPillText}>TODAY</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.dateLabel, isSelected && styles.dateLabelActive]}>
                  {item.label || dateStr}
                </Text>
                <Text style={[styles.deityLabel, isSelected && styles.deityLabelActive]} numberOfLines={1}>
                  {item.deity || 'Maa Durga'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Aarti Time Banner (8 PM Only) */}
      <View style={styles.aartiTimeBanner}>
        <Ionicons name="time" size={16} color="#B45309" />
        <Text style={styles.aartiTimeBannerText}>
          Aarti Timing: 8:00 PM Sharp Daily (11 - 19 Oct) • Synced Live
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Attendance Summary Banner */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryLeft}>
            <View style={styles.aartiIconWrap}>
              <Ionicons name="flame" size={26} color="#EA580C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryTitle}>
                {selectedDate} • 8:00 PM Maha Aarti
              </Text>
              <Text style={styles.summarySubtitle}>
                {sessionAttendance.length} Members Present
              </Text>
            </View>
          </View>
          <View style={styles.attendPercentBadge}>
            <Text style={styles.attendPercentText}>
              {members.length > 0 ? Math.min(100, Math.round((sessionAttendance.length / members.length) * 100)) : 0}%
            </Text>
            <Text style={styles.attendPercentSub}>Turnout</Text>
          </View>
        </View>

        {/* Superuser Authority Notice */}
        {isSuperuser && (
          <View style={styles.superuserNotice}>
            <Ionicons name="shield-checkmark" size={16} color="#B45309" />
            <Text style={styles.superuserNoticeText}>
              Superuser Control Active: You can mark or unmark attendance for any date and any member to prevent fake attendance.
            </Text>
          </View>
        )}

        {/* Mark My Own Attendance Button */}
        <TouchableOpacity
          onPress={handleToggleMyAttendance}
          activeOpacity={0.85}
          disabled={!isSuperuser && isSameDay && isCurrentUserMarked}
        >
          <LinearGradient
            colors={
              isCurrentUserMarked
                ? (isSuperuser ? ['#DC2626', '#EF4444'] : ['#15803D', '#16A34A'])
                : (!isSameDay && !isSuperuser ? ['#94A3B8', '#64748B'] : ['#16A34A', '#22C55E'])
            }
            style={styles.markBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons
              name={
                isCurrentUserMarked
                  ? (isSuperuser ? 'close-circle' : 'lock-closed')
                  : (!isSameDay && !isSuperuser ? 'alert-circle' : 'checkmark-circle')
              }
              size={22}
              color="#FFFFFF"
            />
            <Text style={styles.markBtnText}>
              {isCurrentUserMarked
                ? (isSuperuser ? 'Remove My Attendance (Superuser)' : 'Attendance Marked (Locked) 🔒')
                : (!isSameDay && !isSuperuser
                    ? `Same Day Only (${todayStr})`
                    : 'Mark My 8:00 PM Aarti Attendance 🪔')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Member Roll Call & Admin List */}
        <View style={styles.rollCallCard}>
          <View style={styles.rollHeader}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.rollTitle}>Official Member Roll Call</Text>
              <Text style={styles.rollSub}>
                {isSuperuser
                  ? 'Superuser Member Roster • Tap member to toggle • Syncs instantly'
                  : 'Official Member Roster • Individual marks sync instantly to Admin'}
              </Text>
            </View>
            {isSuperuser && (
              <TouchableOpacity
                style={styles.manageRosterBtn}
                onPress={() => navigation.navigate('Members')}
                activeOpacity={0.8}
              >
                <Ionicons name="people" size={13} color="#DC2626" />
                <Text style={styles.manageRosterBtnText}>Manage Roster</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Superuser Member List Sync Info Banner */}
          <View style={styles.memberListSyncBanner}>
            <Ionicons name="shield-checkmark" size={15} color="#15803D" />
            <Text style={styles.memberListSyncBannerText}>
              Official Member Roster: {members.length} members loaded. Individual attendance syncs live to Admin.
            </Text>
          </View>

          {/* Search Input */}
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={16} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search in official member list..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Members Attendance List */}
          <View style={styles.memberList}>
            {filteredMembers.length === 0 ? (
              <View style={styles.emptyMembers}>
                <Ionicons name="people-outline" size={32} color="#CBD5E1" />
                <Text style={styles.emptyMembersText}>No matching members found</Text>
              </View>
            ) : (
              filteredMembers.map((m) => {
                const record = sessionAttendance.find(
                  a => a.memberId === m.id || a.memberName === m.name
                );
                const isPresent = !!record;
                let formattedTime = '';
                if (record?.markedAt) {
                  try {
                    const d = new Date(record.markedAt);
                    formattedTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  } catch (e) {}
                }

                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.memberRow, isPresent && styles.memberRowPresent]}
                    onPress={() => {
                      if (isSuperuser) {
                        handleSuperuserToggleMember(m);
                      } else if (m.id === myMemberId || m.name?.toLowerCase() === myMemberName?.toLowerCase()) {
                        handleToggleMyAttendance();
                      }
                    }}
                    activeOpacity={isSuperuser || m.id === myMemberId ? 0.7 : 1}
                  >
                    <View style={[styles.memberAvatar, isPresent && styles.memberAvatarPresent]}>
                      <Text style={[styles.memberAvatarText, isPresent && styles.memberAvatarTextPresent]}>
                        {(m?.name || 'M').charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{m.name}</Text>
                      <Text style={styles.memberDesig}>{m.designation || m.role || 'Member'}</Text>
                    </View>

                    {isPresent ? (
                      <View style={styles.presentBadgeWrap}>
                        <View style={styles.presentBadge}>
                          <Ionicons name="checkmark-circle" size={15} color="#16A34A" />
                          <Text style={styles.presentBadgeText}>Present</Text>
                        </View>
                        {formattedTime ? (
                          <Text style={styles.presentTimeText}>{formattedTime}</Text>
                        ) : null}
                      </View>
                    ) : (
                      <View style={styles.absentBadge}>
                        <Ionicons name="ellipse-outline" size={16} color="#CBD5E1" />
                        <Text style={styles.absentBadgeText}>Absent</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF7',
    height: '100%',
    maxHeight: '100%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backBtn: { padding: 4 },
  headerTitleWrap: { alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 11, color: 'rgba(255, 255, 255, 0.9)', marginTop: 1, fontWeight: '600' },
  
  aartiTimeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  aartiTimeBannerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },

  dateSelectorSection: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#FEF3C7',
    paddingVertical: 10,
  },
  dateScroll: {
    paddingHorizontal: 16,
    gap: 8,
    maxWidth: 440,
    alignSelf: 'center',
  },
  dateChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    minWidth: 92,
    alignItems: 'center',
  },
  dateChipActive: {
    backgroundColor: '#EA580C',
    borderColor: '#C2410C',
  },
  dateChipToday: {
    borderColor: '#16A34A',
    borderWidth: 1.5,
  },
  dateChipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  todayPill: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  todayPillText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#78350F',
    textTransform: 'uppercase',
  },
  dayLabelActive: { color: 'rgba(255, 255, 255, 0.9)' },
  dateLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1E293B',
    marginTop: 2,
  },
  dateLabelActive: { color: '#FFFFFF' },
  deityLabel: {
    fontSize: 9,
    color: '#EA580C',
    fontWeight: '700',
    marginTop: 2,
    maxWidth: 88,
  },
  deityLabelActive: { color: '#FEF3C7' },

  body: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  aartiIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  summarySubtitle: {
    fontSize: 11.5,
    color: '#16A34A',
    fontWeight: '700',
    marginTop: 2,
  },
  attendPercentBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  attendPercentText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#166534',
  },
  attendPercentSub: {
    fontSize: 9,
    fontWeight: '700',
    color: '#166534',
  },

  superuserNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  superuserNoticeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#92400E',
    flex: 1,
    lineHeight: 14,
  },

  markBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 16,
    gap: 8,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  markBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  rollCallCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  rollHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  manageRosterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  manageRosterBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#DC2626',
  },
  rollTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  rollSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#1E293B',
    fontWeight: '600',
    height: '100%',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  memberListSyncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  memberListSyncBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
    flex: 1,
  },
  memberList: {
    gap: 6,
    marginTop: 6,
  },
  emptyMembers: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptyMembersText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF7',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    gap: 10,
  },
  memberRowPresent: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarPresent: {
    backgroundColor: '#DCFCE7',
  },
  memberAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EA580C',
  },
  memberAvatarTextPresent: {
    color: '#16A34A',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  memberDesig: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  presentBadgeWrap: {
    alignItems: 'flex-end',
    gap: 2,
  },
  presentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  presentBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
  },
  presentTimeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#15803D',
  },
  absentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  absentBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
});
