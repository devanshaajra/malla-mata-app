import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Alert, Platform, Modal, TextInput, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { COLORS } from '../utils/constants';

export default function SponsorsScreen({ navigation }) {
  const { isSuperuser, isAdmin: rawIsAdmin, hasControl } = useAuth();
  const isAdmin = isSuperuser || (rawIsAdmin && (hasControl ? hasControl('manageSponsors') : true));
  const { sponsors, deleteSponsor, updateSponsor } = useData();
  const { showToast } = useToast();

  const [editingSponsor, setEditingSponsor] = useState(null);
  const [editName, setEditName] = useState('');
  const [editHouse, setEditHouse] = useState('');
  const [editFor, setEditFor] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const openEdit = (item) => {
    setEditingSponsor(item);
    setEditName(item.name || '');
    setEditHouse(item.houseNumber || '');
    setEditFor(item.sponsorshipFor || '');
    setEditAmount(item.amount || '');
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !editFor.trim() || !editAmount.trim()) {
      showToast('Please fill all fields', 'warning');
      return;
    }
    await updateSponsor(editingSponsor.id, {
      name: editName.trim(),
      houseNumber: editHouse.trim() || 'General Sponsor',
      sponsorshipFor: editFor.trim(),
      amount: editAmount.trim(),
    });
    setEditingSponsor(null);
    showToast('Sponsor Updated! 💖', 'success', `₹${editAmount} • ${editName}`);
  };

  const executeDelete = async (id) => {
    await deleteSponsor(id);
    setDeleteTarget(null);
    showToast('Sponsor Removed 🗑️', 'info', 'Record removed from sponsor list');
  };

  const confirmDelete = (item) => {
    setDeleteTarget(item);
  };

  const totalSponsorSum = sponsors.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={styles.iconBg}>
          <Ionicons name="heart" size={24} color="#EA580C" />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.meta}>House: <Text style={styles.boldText}>{item.houseNumber}</Text></Text>
          <Text style={styles.sponsorFor}>Seva: {item.sponsorshipFor}</Text>
        </View>
      </View>

      <View style={styles.cardRight}>
        <Text style={styles.amountText}>₹{Number(item.amount || 0).toLocaleString('en-IN')}</Text>
        {isAdmin && (
          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={() => openEdit(item)} style={styles.editBtn}>
              <Ionicons name="create-outline" size={16} color="#2563EB" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={16} color="#DC2626" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#EA580C', '#F59E0B']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Member Sponsors</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Analytics')}
          style={styles.analyticsBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="trophy" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Top Banner & Total Card */}
      <View style={styles.banner}>
        <Ionicons name="sparkles" size={20} color="#EA580C" />
        <Text style={styles.bannerText}>
          Gratitude to all members & sponsors contributing to Navratri 2026.
        </Text>
      </View>

      <View style={styles.totalPillCard}>
        <Text style={styles.totalPillLabel}>TOTAL SPONSORSHIPS PLEDGED</Text>
        <Text style={styles.totalPillAmount}>₹{totalSponsorSum.toLocaleString('en-IN')}</Text>
        <Text style={styles.totalPillSub}>{sponsors.length} Generous Contributors</Text>
      </View>

      <FlatList
        data={sponsors}
        style={styles.flatList}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={true}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="heart-outline" size={52} color="#94A3B8" />
            <Text style={styles.emptyText}>No sponsors added yet</Text>
          </View>
        }
      />

      {isAdmin && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('AddSponsor')}
        >
          <LinearGradient colors={['#EA580C', '#F59E0B']} style={styles.fabGradient}>
            <Ionicons name="add" size={30} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Edit Sponsor Modal */}
      <Modal
        visible={editingSponsor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingSponsor(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Sponsor</Text>
              <TouchableOpacity onPress={() => setEditingSponsor(null)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalLabel}>SPONSOR NAME</Text>
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Member Name"
              />

              <Text style={styles.modalLabel}>HOUSE NUMBER / RESIDENCE</Text>
              <TextInput
                style={styles.modalInput}
                value={editHouse}
                onChangeText={setEditHouse}
                placeholder="e.g. B-2"
              />

              <Text style={styles.modalLabel}>SPONSORSHIP PURPOSE / ITEM</Text>
              <TextInput
                style={styles.modalInput}
                value={editFor}
                onChangeText={setEditFor}
                placeholder="e.g. Day 9 Maha Havan"
              />

              <Text style={styles.modalLabel}>PLEDGE AMOUNT (₹)</Text>
              <TextInput
                style={styles.modalInput}
                value={editAmount}
                onChangeText={setEditAmount}
                placeholder="Amount in ₹"
                keyboardType="numeric"
              />
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditingSponsor(null)}
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

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Remove Sponsor?</Text>
            <Text style={styles.confirmSub}>
              Are you sure you want to remove {deleteTarget?.name} from the sponsors list?
            </Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDeleteTarget(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDeleteBtn}
                onPress={() => executeDelete(deleteTarget?.id)}
              >
                <Text style={styles.modalSaveText}>Yes, Remove</Text>
              </TouchableOpacity>
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
    width: '100%',
    height: '100%',
  },
  flatList: {
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
  analyticsBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    marginHorizontal: 18,
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  bannerText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },
  totalPillCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 18,
    marginTop: 10,
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  totalPillLabel: { fontSize: 10.5, fontWeight: '800', color: '#78350F', letterSpacing: 0.5 },
  totalPillAmount: { fontSize: 26, fontWeight: '900', color: '#EA580C', marginTop: 2 },
  totalPillSub: { fontSize: 11, color: '#64748B', fontWeight: '600', marginTop: 2 },
  list: { padding: 18, paddingBottom: 100 },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFEDD5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  meta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  boldText: { fontWeight: '700', color: '#EA580C' },
  sponsorFor: { fontSize: 12, color: '#9A3412', marginTop: 2, fontWeight: '600' },
  cardRight: { alignItems: 'flex-end' },
  amountText: { fontSize: 15, fontWeight: '800', color: '#EA580C' },
  actionsRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  editBtn: { padding: 6, backgroundColor: '#EFF6FF', borderRadius: 8 },
  deleteBtn: { padding: 6, backgroundColor: '#FEE2E2', borderRadius: 8 },
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
    shadowColor: '#EA580C',
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
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FEF3C7',
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
  confirmSub: { fontSize: 13, color: '#64748B', marginTop: 8, marginBottom: 16 },
  modalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#78350F',
    marginTop: 10,
    marginBottom: 4,
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
    backgroundColor: '#EA580C',
    alignItems: 'center',
  },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
  },
  modalSaveText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
});
