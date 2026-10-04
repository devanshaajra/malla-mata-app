import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AARTI_DATES } from '../utils/constants';

const STANDARD_TIMES = [
  '08:00 PM (Daily Maha Aarti)',
];

export default function StandardDatePickerModal({
  visible,
  currentDate,
  currentTime,
  onSelectDate,
  onClose,
  mode = 'date', // 'date' | 'datetime'
  dates,
  title,
  sectionLabel,
}) {
  if (!visible) return null;

  const dateList = dates && dates.length > 0 ? dates : AARTI_DATES;
  const defaultDateStr = typeof dateList[0] === 'object' ? (dateList[0]?.date || '01-10-2026') : dateList[0];
  const [selectedDate, setSelectedDate] = useState(
    typeof currentDate === 'object' ? (currentDate?.date || defaultDateStr) : (currentDate || defaultDateStr)
  );
  const [selectedTime, setSelectedTime] = useState(currentTime || STANDARD_TIMES[0]);
  const [phaseFilter, setPhaseFilter] = useState('all');

  // Detect whether this is the 1-22 Oct expense dates list
  const hasPhases = dateList.some(d => d?.phase);

  const filteredDates = dateList.filter(item => {
    if (!hasPhases || phaseFilter === 'all') return true;
    const p = (item?.phase || '').toLowerCase();
    if (phaseFilter === 'prep') return p.includes('prep');
    if (phaseFilter === 'navratri') return p.includes('navratri');
    if (phaseFilter === 'wrap') return p.includes('post') || p.includes('wrap');
    return true;
  });

  const selectedItemObj = dateList.find(d => (d?.date || d) === selectedDate);

  const handleConfirm = () => {
    if (mode === 'datetime') {
      onSelectDate(selectedDate, selectedTime);
    } else {
      onSelectDate(selectedDate);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="calendar" size={20} color="#DC2626" />
              <Text style={styles.title}>
                {title || `Select Navratri Date ${mode === 'datetime' ? '& Time' : ''}`}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Phase Filters if dates contain phases (e.g. 1 Oct to 22 Oct 2026) */}
            {hasPhases && (
              <View style={styles.phaseFilterRow}>
                <TouchableOpacity
                  style={[styles.phaseChip, phaseFilter === 'all' && styles.phaseChipActive]}
                  onPress={() => setPhaseFilter('all')}
                >
                  <Text style={[styles.phaseChipText, phaseFilter === 'all' && styles.phaseChipTextActive]}>
                    All ({dateList.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.phaseChip, phaseFilter === 'prep' && styles.phaseChipActive]}
                  onPress={() => setPhaseFilter('prep')}
                >
                  <Text style={[styles.phaseChipText, phaseFilter === 'prep' && styles.phaseChipTextActive]}>
                    1-10 Oct (Prep)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.phaseChip, phaseFilter === 'navratri' && styles.phaseChipActive]}
                  onPress={() => setPhaseFilter('navratri')}
                >
                  <Text style={[styles.phaseChipText, phaseFilter === 'navratri' && styles.phaseChipTextActive]}>
                    11-19 Oct (Fest)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.phaseChip, phaseFilter === 'wrap' && styles.phaseChipActive]}
                  onPress={() => setPhaseFilter('wrap')}
                >
                  <Text style={[styles.phaseChipText, phaseFilter === 'wrap' && styles.phaseChipTextActive]}>
                    20-22 Oct (Wrap)
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Days Grid */}
            <Text style={styles.sectionLabel}>
              {sectionLabel || (hasPhases ? 'EXPENSE DATES (01 OCT - 22 OCT 2026)' : 'NAVRATRI MAHOTSAV (11 OCT - 19 OCT 2026)')}
            </Text>

            <View style={styles.daysGrid}>
              {filteredDates.map((item, idx) => {
                const dateStr = item?.date || item;
                const isSelected = selectedDate === dateStr;
                const badgeText = item?.badge || item?.day || `Day ${idx + 1}`;
                return (
                  <TouchableOpacity
                    key={dateStr}
                    style={[styles.dayCard, isSelected && styles.dayCardActive]}
                    onPress={() => setSelectedDate(dateStr)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.dayCardNum, isSelected && styles.dayCardNumActive]}>
                      {item?.label || item?.day || dateStr.substring(0, 5)}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[styles.dayCardDate, isSelected && styles.dayCardDateActive]}
                    >
                      {badgeText}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" style={styles.checkIcon} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Selected Date Summary Indicator */}
            <View style={styles.selectedDateBanner}>
              <Ionicons name="information-circle-outline" size={16} color="#B45309" />
              <Text style={styles.selectedDateBannerText}>
                Selected: <Text style={{ fontWeight: '800', color: '#DC2626' }}>{selectedDate}</Text>
                {selectedItemObj?.phase ? ` (${selectedItemObj.phase})` : ''}
              </Text>
            </View>

            {/* Time Slot Selection */}
            {mode === 'datetime' && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 16 }]}>DAILY AARTI TIME (8:00 PM ONLY)</Text>
                <View style={styles.timeSlotsList}>
                  {STANDARD_TIMES.map((time) => {
                    const isSelected = selectedTime === time;
                    return (
                      <TouchableOpacity
                        key={time}
                        style={[styles.timeSlotRow, isSelected && styles.timeSlotRowActive]}
                        onPress={() => setSelectedTime(time)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name="time-outline"
                          size={18}
                          color={isSelected ? '#DC2626' : '#64748B'}
                        />
                        <Text style={[styles.timeSlotText, isSelected && styles.timeSlotTextActive]}>
                          {time}
                        </Text>
                        {isSelected && <Ionicons name="checkmark-circle" size={18} color="#DC2626" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm} activeOpacity={0.85} style={{ flex: 1 }}>
              <LinearGradient colors={['#DC2626', '#EA580C']} style={styles.confirmBtn}>
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.confirmText}>Confirm Date</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 99999,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FEF3C7',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  closeBtn: {
    padding: 4,
  },
  scroll: {
    maxHeight: 380,
  },
  sectionLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#78350F',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayCard: {
    width: '31%',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
    position: 'relative',
  },
  dayCardActive: {
    backgroundColor: '#DC2626',
    borderColor: '#B91C1C',
  },
  dayCardNum: {
    fontSize: 12,
    fontWeight: '800',
    color: '#78350F',
  },
  dayCardNumActive: {
    color: '#FFFFFF',
  },
  dayCardDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  dayCardDateActive: {
    color: '#FEF3C7',
  },
  checkIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  timeSlotsList: {
    gap: 6,
  },
  timeSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  timeSlotRowActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
  },
  timeSlotText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
    marginLeft: 8,
  },
  timeSlotTextActive: {
    color: '#DC2626',
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FEF3C7',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  confirmText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  phaseFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  phaseChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  phaseChipActive: {
    backgroundColor: '#DC2626',
    borderColor: '#B91C1C',
  },
  phaseChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78350F',
  },
  phaseChipTextActive: {
    color: '#FFFFFF',
  },
  selectedDateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 6,
  },
  selectedDateBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78350F',
    flex: 1,
  },
});
