import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { COLORS, PAYMENT_MODES, EXPENSE_DATES, isExpenseDateInRange } from '../utils/constants';
import StandardDatePickerModal from '../components/StandardDatePickerModal';

export default function AddExpenseScreen({ navigation }) {
  const { currentUser, isSuperuser, isAdmin, hasControl } = useAuth();
  const { addExpense } = useData();
  const { showToast } = useToast();

  const canManageExpenses = isSuperuser || (isAdmin && (hasControl ? hasControl('manageExpenses') : true));

  const [name, setName] = useState('');
  const [date, setDate] = useState('04-10-2026'); // Today (04 Oct) or default 01-10-2026
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('Cash');
  const [incurredBy, setIncurredBy] = useState(currentUser?.displayName || currentUser?.name || '');
  const [showModeDD, setShowModeDD] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleAdd = async () => {
    if (!canManageExpenses) {
      showToast('Admin Access Restricted 🔒', 'error', 'You do not have permission to record expenses. Contact Superuser.');
      return;
    }

    if (!name.trim() || !amount.trim() || !incurredBy.trim()) {
      showToast('Please fill all required fields', 'warning');
      return;
    }

    const dateStr = typeof date === 'object' ? (date?.date || '01-10-2026') : (date || '01-10-2026');
    if (!isExpenseDateInRange(dateStr)) {
      showToast('Date Out of Allowed Range ⚠️', 'warning', 'Admins can add expense dates only between 1 Oct and 22 Oct 2026');
      return;
    }

    try {
      await addExpense({
        name: name.trim(),
        date: dateStr.trim(),
        amount: amount.trim(),
        mode,
        incurredBy: incurredBy.trim(),
      });
      showToast('Expense Recorded! 🧾', 'success', `₹${amount} • ${name} (${dateStr})`);
      navigation.goBack();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#DC2626', '#EA580C']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Expense</Text>
        <View style={{ width: 32 }} />
      </LinearGradient>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.body} showsVerticalScrollIndicator={true}>
        {/* Allowed Expense Window Indicator */}
        <View style={styles.periodBanner}>
          <Ionicons name="calendar" size={18} color="#B45309" />
          <View style={{ flex: 1 }}>
            <Text style={styles.periodTitle}>Allowed Expense Dates: 1 Oct – 22 Oct 2026</Text>
            <Text style={styles.periodSub}>
              Includes pre-festival setup (1-10 Oct), 9 Navratri days (11-19 Oct), and wrap-up (20-22 Oct).
            </Text>
          </View>
        </View>

        {!canManageExpenses && (
          <View style={styles.restrictedBanner}>
            <Ionicons name="lock-closed" size={18} color="#DC2626" />
            <Text style={styles.restrictedText}>
              Restricted: Your admin account does not have permission to record expenses. Contact Superuser Devansh.
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>New Expense Entry</Text>

          {/* Expense Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>EXPENSE ITEM NAME *</Text>
            <View style={styles.inputRow}>
              <Ionicons name="receipt-outline" size={20} color="#DC2626" style={styles.fieldIcon} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Flower & Mandap Stage Decoration"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          {/* Date Picker */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>DATE OF EXPENSE (1 OCT - 22 OCT 2026) *</Text>
            <TouchableOpacity
              style={styles.inputRow}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={20} color="#DC2626" style={styles.fieldIcon} />
              <Text style={styles.inputText}>
                {typeof date === 'object' ? (date?.label || date?.date || '04 Oct 2026') : date}
              </Text>
              <Ionicons name="calendar" size={18} color="#DC2626" />
            </TouchableOpacity>
          </View>

          {/* Amount */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>AMOUNT IN RUPEES (₹) *</Text>
            <View style={styles.inputRow}>
              <Ionicons name="cash-outline" size={20} color="#DC2626" style={styles.fieldIcon} />
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="e.g. 5000"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Incurred Expense by Member */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>INCURRED EXPENSE BY MEMBER *</Text>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={20} color="#DC2626" style={styles.fieldIcon} />
              <TextInput
                style={styles.input}
                value={incurredBy}
                onChangeText={setIncurredBy}
                placeholder="e.g. Devansh Sharma or Committee Lead"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          {/* Payment Method Selector */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>PAYMENT METHOD</Text>
            <TouchableOpacity
              style={styles.inputRow}
              onPress={() => setShowModeDD(!showModeDD)}
              activeOpacity={0.8}
            >
              <Ionicons name="card-outline" size={20} color="#DC2626" style={styles.fieldIcon} />
              <Text style={styles.inputText}>{mode}</Text>
              <Ionicons name={showModeDD ? 'chevron-up' : 'chevron-down'} size={18} color="#64748B" />
            </TouchableOpacity>

            {showModeDD && (
              <View style={styles.dropdown}>
                {PAYMENT_MODES.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.ddItem, mode === m && styles.ddActive]}
                    onPress={() => { setMode(m); setShowModeDD(false); }}
                  >
                    <Text style={[styles.ddText, mode === m && styles.ddTextActive]}>{m}</Text>
                    {mode === m && <Ionicons name="checkmark" size={18} color="#DC2626" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={handleAdd}
            activeOpacity={0.85}
            disabled={!canManageExpenses}
            style={!canManageExpenses ? { opacity: 0.5 } : {}}
          >
            <LinearGradient
              colors={['#DC2626', '#EA580C']}
              style={styles.addBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="add-circle" size={22} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Save Expense Record</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Date Picker Modal for 1 Oct to 22 Oct 2026 */}
      <StandardDatePickerModal
        visible={showDatePicker}
        currentDate={date}
        dates={EXPENSE_DATES}
        title="Select Expense Date (1 - 22 Oct 2026)"
        sectionLabel="EXPENSE DATES (01 OCT - 22 OCT 2026)"
        onSelectDate={(d) => setDate(d)}
        onClose={() => setShowDatePicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF7',
    width: '100%',
    height: '100%',
  },
  scrollContainer: {
    flex: 1,
    width: '100%',
    ...(Platform.OS === 'web' ? { overflowY: 'auto' } : {}),
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
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  body: { padding: 20, maxWidth: 440, width: '100%', alignSelf: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 18,
  },
  fieldGroup: { marginBottom: 16 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78350F',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  fieldIcon: { marginRight: 10 },
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
  ddItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FEF3C7',
  },
  ddActive: { backgroundColor: '#FEE2E2' },
  ddText: { fontSize: 14, color: '#1E293B', fontWeight: '500' },
  ddTextActive: { color: '#DC2626', fontWeight: '700' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 10,
    gap: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  periodBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    gap: 10,
  },
  periodTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#78350F',
  },
  periodSub: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 2,
    lineHeight: 15,
  },
  restrictedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    gap: 10,
  },
  restrictedText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
    lineHeight: 16,
  },
});
