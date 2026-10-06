import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Platform, Modal, TextInput, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { COLORS, PAYMENT_MODES, EXPENSE_DATES, isExpenseDateInRange } from '../utils/constants';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import StandardDatePickerModal from '../components/StandardDatePickerModal';

export default function ExpensesScreen({ navigation }) {
  const { isSuperuser, isAdmin, hasControl } = useAuth();
  const { expenses, deleteExpense, updateExpense } = useData();
  const { showToast } = useToast();

  const canManageExpenses = isSuperuser || (isAdmin && (hasControl ? hasControl('manageExpenses') : true));

  // Edit Expense State
  const [editingExpense, setEditingExpense] = useState(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editMode, setEditMode] = useState('Cash');
  const [editIncurredBy, setEditIncurredBy] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const openEditModal = (item) => {
    if (!canManageExpenses) {
      showToast('Admin Access Restricted 🔒', 'warning', 'You do not have permission to modify expenses.');
      return;
    }
    setEditingExpense(item);
    setEditName(item.name || '');
    setEditAmount(item.amount || '');
    setEditDate(item.date || '01-10-2026');
    setEditMode(item.mode || 'Cash');
    setEditIncurredBy(item.incurredBy || '');
  };

  const handleSaveEdit = async () => {
    if (!canManageExpenses) {
      showToast('Admin Access Restricted 🔒', 'error', 'Permission to edit expenses is disabled.');
      return;
    }
    if (!editName.trim() || !editAmount.trim() || !editIncurredBy.trim()) {
      showToast('Please fill all fields', 'warning');
      return;
    }
    if (!isExpenseDateInRange(editDate)) {
      showToast('Date Out of Range ⚠️', 'warning', 'Expense dates must be between 1 Oct and 22 Oct 2026');
      return;
    }
    await updateExpense(editingExpense.id, {
      name: editName.trim(),
      amount: editAmount.trim(),
      date: editDate.trim(),
      mode: editMode,
      incurredBy: editIncurredBy.trim(),
    });
    setEditingExpense(null);
    showToast('Expense Updated! 🧾', 'success', `₹${editAmount} • ${editName} (${editDate})`);
  };

  const executeDelete = async (id) => {
    if (!canManageExpenses) {
      showToast('Admin Access Restricted 🔒', 'error', 'Permission to delete expenses is disabled.');
      return;
    }
    await deleteExpense(id);
    setDeleteTarget(null);
    showToast('Expense Removed 🗑️', 'info', 'Record deleted from ledger accounts');
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  // ─── Group Expenses Date-Wise ───
  const groupedExpenses = {};
  (expenses || []).forEach((e) => {
    if (!e) return;
    const d = e.date || 'Unscheduled';
    if (!groupedExpenses[d]) {
      groupedExpenses[d] = [];
    }
    groupedExpenses[d].push(e);
  });

  // Sort dates safely
  const sortedDates = Object.keys(groupedExpenses).sort((a, b) => {
    const partA = (a || '').split('-').reverse().join('-');
    const partB = (b || '').split('-').reverse().join('-');
    return partA.localeCompare(partB);
  });

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#DC2626', '#EA580C']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expenditure Log</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Analytics')}
          style={styles.analyticsHeaderBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="wallet" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Total Card */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>TOTAL EXPENDITURE</Text>
        <Text style={styles.totalAmount}>₹{totalExpenses.toLocaleString('en-IN')}</Text>
        <View style={styles.totalFooterRow}>
          <Text style={styles.totalSub}>{expenses.length} Expense Records</Text>
          <TouchableOpacity
            style={styles.viewAnalyticsLink}
            onPress={() => navigation.navigate('Analytics')}
          >
            <Text style={styles.viewAnalyticsText}>View Ledger Leaderboard →</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date-wise Grouped Expense List */}
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.list} showsVerticalScrollIndicator={true}>
        {expenses.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={52} color="#94A3B8" />
            <Text style={styles.emptyText}>No expenses recorded yet</Text>
          </View>
        ) : (
          sortedDates.map((dateKey) => {
            const dateExpenses = groupedExpenses[dateKey];
            const dateSum = dateExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

            return (
              <View key={dateKey} style={styles.dateGroup}>
                {/* Centered Date Badge Header */}
                <View style={styles.centeredDateHeader}>
                  <View style={styles.dateLine} />
                  <View style={styles.datePill}>
                    <Ionicons name="calendar-outline" size={13} color="#991B1B" />
                    <Text style={styles.datePillText}>— {dateKey} —</Text>
                    <Text style={styles.datePillSum}>₹{dateSum.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.dateLine} />
                </View>

                {/* Expense Cards for this Date */}
                {dateExpenses.map((item) => (
                  <View key={item.id} style={styles.expenseCard}>
                    <View style={styles.expenseLeft}>
                      <View style={styles.expenseIcon}>
                        <Ionicons name="receipt" size={22} color="#DC2626" />
                      </View>
                      <View style={styles.expenseInfo}>
                        <Text style={styles.expenseName}>{item.name}</Text>
                        <Text style={styles.expenseBy}>
                          Incurred by: <Text style={styles.boldText}>{item.incurredBy || 'Admin'}</Text>
                        </Text>
                        <Text style={styles.expenseMeta}>Mode: {item.mode}</Text>
                      </View>
                    </View>

                    <View style={styles.expenseRight}>
                      <Text style={styles.expenseAmount}>₹{Number(item.amount).toLocaleString('en-IN')}</Text>
                      {canManageExpenses && (
                        <View style={styles.actionsRow}>
                          <TouchableOpacity
                            onPress={() => openEditModal(item)}
                            style={styles.editBtn}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="create-outline" size={17} color="#2563EB" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => setDeleteTarget(item)}
                            style={styles.deleteBtn}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="trash-outline" size={17} color="#DC2626" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            );
          })
        )}
      </ScrollView>

      {canManageExpenses && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('AddExpense')}
        >
          <LinearGradient colors={['#DC2626', '#EA580C']} style={styles.fabGradient}>
            <Ionicons name="add" size={30} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Edit Expense Modal */}
      <Modal
        visible={editingExpense !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingExpense(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editCard}>
            <View style={styles.editCardHeader}>
              <Text style={styles.editCardTitle}>Edit Expense</Text>
              <TouchableOpacity onPress={() => setEditingExpense(null)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>EXPENSE ITEM NAME</Text>
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Expense Name"
              />

              <Text style={styles.fieldLabel}>DATE OF EXPENSE</Text>
              <TouchableOpacity
                style={styles.datePickerInputRow}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color="#DC2626" />
                <Text style={styles.modalInputText}>{editDate}</Text>
                <Ionicons name="calendar" size={18} color="#DC2626" />
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>AMOUNT (₹)</Text>
              <TextInput
                style={styles.modalInput}
                value={editAmount}
                onChangeText={setEditAmount}
                placeholder="Amount in ₹"
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>INCURRED EXPENSE BY MEMBER</Text>
              <TextInput
                style={styles.modalInput}
                value={editIncurredBy}
                onChangeText={setEditIncurredBy}
                placeholder="Member name or vendor"
              />

              <Text style={styles.fieldLabel}>PAYMENT METHOD</Text>
              <View style={styles.pillsRow}>
                {PAYMENT_MODES.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.catPill, editMode === m && styles.catPillActive]}
                    onPress={() => setEditMode(m)}
                  >
                    <Text style={[styles.catPillText, editMode === m && styles.catPillTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditingExpense(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveEdit}
              >
                <Text style={styles.modalSaveText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirmation Dialog for Delete */}
      <ConfirmDeleteModal
        visible={deleteTarget !== null}
        title="Delete Expense Record?"
        message={`Are you sure you want to delete the expense of ₹${deleteTarget?.amount} for "${deleteTarget?.name}"?`}
        confirmText="Yes, Delete"
        onConfirm={() => executeDelete(deleteTarget?.id)}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Date Picker Modal */}
      <StandardDatePickerModal
        visible={showDatePicker}
        currentDate={editDate}
        dates={EXPENSE_DATES}
        title="Select Expense Date (1 - 22 Oct 2026)"
        sectionLabel="EXPENSE DATES (01 OCT - 22 OCT 2026)"
        onSelectDate={(d) => setEditDate(typeof d === 'object' ? (d?.date || '01-10-2026') : (d || '01-10-2026'))}
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
  analyticsHeaderBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  totalCard: {
    backgroundColor: '#FFFFFF',
    margin: 18,
    marginBottom: 8,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
    maxWidth: 440,
    width: 'auto',
    alignSelf: 'stretch',
  },
  totalLabel: { fontSize: 11, color: '#78350F', fontWeight: '800', letterSpacing: 0.6 },
  totalAmount: { fontSize: 30, fontWeight: '900', color: '#DC2626', marginTop: 4 },
  totalFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FEF3C7',
  },
  totalSub: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  viewAnalyticsLink: { padding: 2 },
  viewAnalyticsText: { fontSize: 12, fontWeight: '800', color: '#EA580C' },
  list: { padding: 18, paddingBottom: 100, maxWidth: 440, width: '100%', alignSelf: 'center' },
  dateGroup: {
    marginBottom: 16,
  },
  centeredDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#FDE68A',
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  datePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  datePillSum: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
    marginLeft: 4,
  },
  expenseCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  expenseLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  expenseIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  expenseInfo: { flex: 1 },
  expenseName: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  expenseBy: { fontSize: 11.5, color: '#64748B', marginTop: 3 },
  boldText: { fontWeight: '700', color: '#1E293B' },
  expenseMeta: { fontSize: 11, color: '#94A3B8', marginTop: 2, fontWeight: '500' },
  expenseRight: { alignItems: 'flex-end' },
  expenseAmount: { fontSize: 15, fontWeight: '800', color: '#DC2626' },
  actionsRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  editBtn: {
    padding: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  deleteBtn: {
    padding: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#94A3B8', marginTop: 12, fontWeight: '500' },
  fab: { position: 'absolute', right: 24, bottom: 28 },
  fabGradient: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 999,
  },
  editCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
  },
  editCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FEF3C7',
  },
  editCardTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#78350F',
    marginBottom: 4,
    marginTop: 10,
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  datePickerInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  modalInputText: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  catPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  catPillActive: {
    backgroundColor: '#DC2626',
  },
  catPillText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  catPillTextActive: { color: '#FFFFFF', fontWeight: '700' },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FEF3C7',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
  },
  modalSaveText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
});
