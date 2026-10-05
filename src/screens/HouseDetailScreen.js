import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { COLORS, PAYMENT_MODES, AARTI_DATES } from '../utils/constants';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import StandardDatePickerModal from '../components/StandardDatePickerModal';

export default function HouseDetailScreen({ route, navigation }) {
  const { houseId = '101', block = 'A' } = route?.params || {};
  const { isAdmin: rawIsAdmin, isSuperuser, hasControl } = useAuth();
  const isAdmin = isSuperuser || (rawIsAdmin && (hasControl ? hasControl('manageFunds') : true));
  const { getFund, saveFund, resetFund } = useData();
  const { showToast } = useToast();

  const existing = getFund ? getFund(houseId) : null;
  const [amount, setAmount] = useState(existing?.amount || '');
  const [mode, setMode] = useState(existing?.mode || 'Cash');
  const [aartiDate, setAartiDate] = useState(existing?.aartiDate || '');
  const [residentName, setResidentName] = useState(existing?.residentName || '');
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    if (existing) {
      setAmount(existing.amount || '');
      setMode(existing.mode || 'Cash');
      setAartiDate(existing.aartiDate || '');
      setResidentName(existing.residentName || '');
    }
  }, [existing]);

  const blockIdx = (block || 'A').charCodeAt(0) - 65;
  const color = COLORS.blockColors[blockIdx >= 0 ? blockIdx : 0] || COLORS.primary;

  const handleManualSave = async () => {
    if (!amount.trim()) {
      showToast('Please enter contribution amount', 'warning');
      return;
    }
    await saveFund(houseId, {
      amount: amount.trim(),
      mode,
      aartiDate: aartiDate || '11-10-2026',
      residentName: residentName.trim() || `Block ${block} Resident`,
    });
    showToast(`House ${houseId} Saved! 💰`, 'success', `₹${amount} • ${mode} • Aarti: ${aartiDate || '11-10-2026'}`);
    navigation.goBack();
  };

  const handleResetFund = async () => {
    await resetFund(houseId);
    setAmount('');
    setResidentName('');
    setAartiDate('');
    setShowResetConfirm(false);
    showToast(`House ${houseId} Cleared 🗑️`, 'info', 'Contribution record removed and set to pending');
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[color, color + 'E6']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="home" size={20} color="#FFFFFF" />
          <Text style={styles.headerTitle}>House {houseId} Details</Text>
        </View>
        <View style={{ width: 32 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* House Info Card */}
        <View style={styles.infoCard}>
          <View style={[styles.houseBadge, { backgroundColor: color + '15' }]}>
            <Ionicons name="home" size={38} color={color} />
          </View>
          <Text style={styles.houseTitle}>House {houseId}</Text>
          <Text style={styles.houseSubtitle}>Block {block} • Member Residence</Text>

          {existing?.amount ? (
            <View style={styles.statusPillPaid}>
              <Ionicons name="checkmark-circle" size={14} color="#166534" />
              <Text style={styles.statusPillPaidText}>Contribution Recorded: ₹{existing.amount}</Text>
            </View>
          ) : (
            <View style={styles.statusPillPending}>
              <Ionicons name="time-outline" size={14} color="#B45309" />
              <Text style={styles.statusPillPendingText}>Payment Pending</Text>
            </View>
          )}

          {!isAdmin && (
            <View style={styles.viewOnlyBadge}>
              <Ionicons name="eye" size={14} color="#2563EB" />
              <Text style={styles.viewOnlyText}>Member View Only</Text>
            </View>
          )}
        </View>

        {/* Payment Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contribution & Aarti Details</Text>

          {/* Resident Member Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>RESIDENT MEMBER NAME</Text>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={20} color={color} />
              <TextInput
                style={styles.input}
                value={residentName}
                onChangeText={setResidentName}
                placeholder="e.g. Ramesh Shah"
                placeholderTextColor="#94A3B8"
                editable={isAdmin}
              />
            </View>
          </View>

          {/* Contribution Amount */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>CONTRIBUTION AMOUNT (₹)</Text>
            <View style={styles.inputRow}>
              <Ionicons name="cash-outline" size={20} color={color} />
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="Enter amount in ₹ (e.g. 2100)"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                editable={isAdmin}
              />
            </View>
          </View>

          {/* Mode of payment */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>PAYMENT METHOD</Text>
            <TouchableOpacity
              style={styles.inputRow}
              onPress={() => isAdmin && setShowModeDropdown(!showModeDropdown)}
              disabled={!isAdmin}
              activeOpacity={0.8}
            >
              <Ionicons name="card-outline" size={20} color={color} />
              <Text style={[styles.inputText, !mode && { color: '#94A3B8' }]}>{mode || 'Select mode'}</Text>
              {isAdmin && <Ionicons name={showModeDropdown ? 'chevron-up' : 'chevron-down'} size={18} color="#64748B" />}
            </TouchableOpacity>
            {showModeDropdown && (
              <View style={styles.dropdown}>
                {PAYMENT_MODES.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.dropdownItem, mode === m && styles.dropdownItemActive]}
                    onPress={() => { setMode(m); setShowModeDropdown(false); }}
                  >
                    <Text style={[styles.dropdownText, mode === m && { color: color, fontWeight: '700' }]}>{m}</Text>
                    {mode === m && <Ionicons name="checkmark" size={18} color={color} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Aarti Date Picker Modal Trigger */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>ASSIGNED AARTI DATE (11 OCT - 19 OCT)</Text>
            <TouchableOpacity
              style={styles.inputRow}
              onPress={() => isAdmin && setShowDatePicker(true)}
              disabled={!isAdmin}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={20} color={color} />
              <Text style={[styles.inputText, !aartiDate && { color: '#94A3B8' }]}>
                {aartiDate ? `Aarti on ${aartiDate}` : 'Tap to pick Aarti Date (Day 1 - 9)'}
              </Text>
              {isAdmin && <Ionicons name="calendar" size={18} color={color} />}
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          {isAdmin && (
            <View style={styles.actionButtons}>
              <TouchableOpacity onPress={handleManualSave} activeOpacity={0.85}>
                <LinearGradient colors={[color, color + 'E6']} style={styles.saveBtn}>
                  <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Save House Details</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Remove / Reset Entry Button */}
              {existing?.amount && (
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={() => setShowResetConfirm(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  <Text style={styles.resetBtnText}>Remove / Reset House Entry</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Confirmation Dialog for Resetting House Entry */}
      <ConfirmDeleteModal
        visible={showResetConfirm}
        title={`Reset House ${houseId} Record?`}
        message={`Are you sure you want to remove the contribution record (₹${existing?.amount || ''}) for House ${houseId}? This will reset its status to Pending.`}
        confirmText="Yes, Reset Entry"
        onConfirm={handleResetFund}
        onCancel={() => setShowResetConfirm(false)}
      />

      {/* Standard Date Picker Modal */}
      <StandardDatePickerModal
        visible={showDatePicker}
        currentDate={aartiDate}
        onSelectDate={(pickedDate) => setAartiDate(pickedDate)}
        onClose={() => setShowDatePicker(false)}
      />
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
    paddingBottom: 18,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backBtn: { padding: 4 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  body: { padding: 20, paddingBottom: 40, maxWidth: 440, width: '100%', alignSelf: 'center' },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  houseBadge: { width: 72, height: 72, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  houseTitle: { fontSize: 26, fontWeight: '900', color: '#1E293B' },
  houseSubtitle: { fontSize: 13, color: '#64748B', marginTop: 3, fontWeight: '500' },
  statusPillPaid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  statusPillPaidText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
  },
  statusPillPending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  statusPillPendingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  viewOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  viewOnlyText: { fontSize: 12, color: '#2563EB', fontWeight: '700' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 18 },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '700', color: '#78350F', marginBottom: 6, letterSpacing: 0.5 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
    height: '100%',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  inputText: { flex: 1, fontSize: 14, color: '#1E293B', fontWeight: '600' },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FEF3C7',
  },
  dropdownItemActive: { backgroundColor: '#FFFBEB' },
  dropdownText: { fontSize: 14, color: '#1E293B' },
  actionButtons: {
    marginTop: 10,
    gap: 10,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
  },
  saveBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 6,
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
});
