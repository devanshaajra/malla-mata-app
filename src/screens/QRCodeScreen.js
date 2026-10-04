import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Image, Platform, TextInput, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import { COLORS } from '../utils/constants';

export default function QRCodeScreen({ navigation }) {
  const { isSuperuser, isAdmin: rawIsAdmin, hasControl, getAllAdmins, addAdminAccount } = useAuth();
  const isAdmin = isSuperuser || (rawIsAdmin && (hasControl ? hasControl('manageQRCode') : true));
  const { qrCodes, saveQRCode, deleteQRCode } = useData();
  const { showToast } = useToast();

  const admins = getAllAdmins();
  const [selectedAdmin, setSelectedAdmin] = useState(admins[0]?.id || '');
  const [showAdminDD, setShowAdminDD] = useState(false);
  const [customUpiId, setCustomUpiId] = useState('');

  // New Admin Provisioning Modal (Superuser feature)
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminDesignation, setAdminDesignation] = useState('Treasurer');
  const [adminUpiId, setAdminUpiId] = useState('');

  // Delete Confirm Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const selectedQR = qrCodes.find(q => q.adminId === selectedAdmin);
  const currentAdminObj = admins.find(a => a.id === selectedAdmin);

  React.useEffect(() => {
    setCustomUpiId(selectedQR?.upiId || `${currentAdminObj?.username || 'admin'}@upi`);
  }, [selectedAdmin, selectedQR]);

  const handleUploadQR = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets?.[0]) {
      const admin = admins.find(a => a.id === selectedAdmin);
      const finalUpi = customUpiId.trim() || selectedQR?.upiId || `${admin?.username || 'admin'}@upi`;
      await saveQRCode({
        adminId: selectedAdmin,
        adminName: admin?.displayName || admin?.name || 'Admin',
        upiId: finalUpi,
        qrImageUri: result.assets[0].uri,
      });
      showToast('UPI QR Code Saved! 📱', 'success', `QR code active for ${admin?.displayName || admin?.name}`);
    }
  };

  const handleSaveUpiOnly = async () => {
    if (!customUpiId.trim()) {
      showToast('Enter UPI ID', 'warning');
      return;
    }
    const admin = admins.find(a => a.id === selectedAdmin);
    await saveQRCode({
      adminId: selectedAdmin,
      adminName: admin?.displayName || admin?.name || 'Admin',
      upiId: customUpiId.trim(),
      qrImageUri: selectedQR?.qrImageUri || '',
    });
    showToast('UPI ID Saved! 💳', 'success', `Linked to ${admin?.displayName || admin?.name}`);
  };

  const handleCreateAdmin = async () => {
    if (!adminName.trim()) {
      showToast('Admin Name Required', 'error', 'Please enter admin full name');
      return;
    }
    const cleanUsername = (adminUsername.trim() || adminName.trim().toLowerCase().replace(/\s+/g, ''));
    try {
      const created = await addAdminAccount({
        name: adminName.trim(),
        username: cleanUsername,
        phone: adminPhone.trim() || '+91 98000 00000',
        designation: adminDesignation,
        password: 'Admin@2026',
      });
      setSelectedAdmin(created.id);
      setShowAddAdminModal(false);
      setAdminName('');
      setAdminUsername('');
      setAdminPhone('');
      showToast(`Admin @${cleanUsername} Added! 🛡️`, 'insert', 'Admin established for QR Code receipt');
    } catch (e) {
      showToast('Failed to add Admin', 'error', e.message);
    }
  };

  const handleConfirmDeleteQR = async () => {
    setShowDeleteModal(false);
    await deleteQRCode(selectedAdmin);
    showToast('QR Code Removed', 'delete', 'UPI receiver QR code was deleted');
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#D97706', '#EA580C']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>UPI QR Code & Receiver</Text>
        <View style={{ width: 32 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Superuser Admin Provisioning Banner */}
        {isSuperuser && (
          <View style={styles.provisionBanner}>
            <View style={styles.provisionLeft}>
              <Ionicons name="shield-checkmark" size={24} color="#B45309" />
              <View style={{ flex: 1 }}>
                <Text style={styles.provisionTitle}>Superuser Controls</Text>
                <Text style={styles.provisionSub}>
                  Add and establish new Admin accounts to upload their UPI QR code.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.addAdminBtn}
              onPress={() => setShowAddAdminModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="person-add" size={14} color="#FFFFFF" />
              <Text style={styles.addAdminBtnText}>+ Add Admin</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Admin Selection Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Active Payment Receiver Account</Text>
          <TouchableOpacity
            style={styles.inputRow}
            onPress={() => setShowAdminDD(!showAdminDD)}
            activeOpacity={0.8}
          >
            <Ionicons name="person-circle-outline" size={24} color="#D97706" />
            <View style={{ flex: 1 }}>
              <Text style={styles.inputText}>
                {currentAdminObj?.displayName || currentAdminObj?.name || 'Select Admin'}
              </Text>
              <Text style={styles.inputSub}>
                {currentAdminObj?.role || 'Admin Account'}
              </Text>
            </View>
            <Ionicons name={showAdminDD ? 'chevron-up' : 'chevron-down'} size={18} color="#64748B" />
          </TouchableOpacity>

          {showAdminDD && (
            <View style={styles.dropdown}>
              {admins.map(a => (
                <TouchableOpacity
                  key={a.id}
                  style={[styles.ddItem, selectedAdmin === a.id && styles.ddActive]}
                  onPress={() => { setSelectedAdmin(a.id); setShowAdminDD(false); }}
                >
                  <View>
                    <Text style={[styles.ddText, selectedAdmin === a.id && styles.ddTextActive]}>
                      {a.displayName || a.name}
                    </Text>
                    <Text style={styles.ddSub}>@{a.username} • {a.role}</Text>
                  </View>
                  {selectedAdmin === a.id && <Ionicons name="checkmark-circle" size={20} color="#D97706" />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* QR Display Card */}
        <View style={styles.qrCard}>
          {selectedQR?.qrImageUri ? (
            <View style={styles.qrContainer}>
              <View style={styles.qrFrame}>
                <Image source={{ uri: selectedQR.qrImageUri }} style={styles.qrImage} resizeMode="contain" />
              </View>
              <Text style={styles.qrName}>{selectedQR.adminName}</Text>
              <View style={styles.upiPill}>
                <Ionicons name="wallet-outline" size={14} color="#059669" />
                <Text style={styles.upiPillText}>{selectedQR.upiId || 'mallamata@upi'}</Text>
              </View>
              <Text style={styles.qrHint}>
                Scan with any UPI App (GPay, PhonePe, Paytm, BHIM) to contribute to Malla Mata Navratri Fund
              </Text>
            </View>
          ) : (
            <View style={styles.noQR}>
              <View style={styles.qrIconCircle}>
                <Ionicons name="qr-code-outline" size={64} color="#D97706" />
              </View>
              <Text style={styles.noQRTitle}>No QR Code Uploaded</Text>
              <Text style={styles.noQRText}>
                {isAdmin
                  ? 'Tap below to upload a verified UPI QR code image for this admin receiver.'
                  : 'The admin has not yet uploaded a payment QR code.'}
              </Text>
            </View>
          )}

          {isAdmin && (
            <View style={styles.superActions}>
              {/* Direct UPI ID Configuration */}
              <View style={styles.upiInputBox}>
                <Text style={styles.upiInputLabel}>ADMIN UPI ID / VPA</Text>
                <View style={styles.upiInputRow}>
                  <Ionicons name="at-outline" size={18} color="#D97706" />
                  <TextInput
                    style={styles.upiInput}
                    value={customUpiId}
                    onChangeText={setCustomUpiId}
                    placeholder="e.g. devansh@oksbi"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.saveUpiSmallBtn}
                    onPress={handleSaveUpiOnly}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.saveUpiSmallText}>Save UPI</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity onPress={handleUploadQR} activeOpacity={0.85}>
                <LinearGradient
                  colors={['#EA580C', '#D97706']}
                  style={styles.uploadBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.uploadText}>{selectedQR?.qrImageUri ? 'Replace QR Image' : 'Upload QR Image'}</Text>
                </LinearGradient>
              </TouchableOpacity>
              {selectedQR && (
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => setShowDeleteModal(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  <Text style={styles.removeText}>Remove QR Code</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Superuser: Add Admin Modal */}
      <Modal
        visible={showAddAdminModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddAdminModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Establish New Admin</Text>
                <Text style={styles.modalSubtitle}>Superuser Account Provisioning</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddAdminModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>ADMIN FULL NAME *</Text>
            <TextInput
              style={styles.modalInput}
              value={adminName}
              onChangeText={setAdminName}
              placeholder="e.g. Ramesh Shah"
              placeholderTextColor="#94A3B8"
            />

            <Text style={[styles.modalLabel, { marginTop: 12 }]}>ADMIN USERNAME (FOR LOGIN)</Text>
            <TextInput
              style={styles.modalInput}
              value={adminUsername}
              onChangeText={setAdminUsername}
              placeholder="e.g. ramesh_admin"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
            />

            <Text style={[styles.modalLabel, { marginTop: 12 }]}>MOBILE NUMBER</Text>
            <TextInput
              style={styles.modalInput}
              value={adminPhone}
              onChangeText={setAdminPhone}
              placeholder="e.g. +91 98221 12345"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
            />

            <Text style={[styles.modalLabel, { marginTop: 12 }]}>DESIGNATION / ROLE</Text>
            <TextInput
              style={styles.modalInput}
              value={adminDesignation}
              onChangeText={setAdminDesignation}
              placeholder="e.g. President / Treasurer"
              placeholderTextColor="#94A3B8"
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowAddAdminModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={handleCreateAdmin}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#D97706', '#EA580C']} style={styles.modalSaveBtn}>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.modalSaveText}>Create Admin</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirm Delete QR Modal */}
      <ConfirmDeleteModal
        visible={showDeleteModal}
        title="Remove QR Code"
        message="Are you sure you want to remove this receiver's QR code? Members won't be able to scan it until a new code is uploaded."
        onConfirm={handleConfirmDeleteQR}
        onCancel={() => setShowDeleteModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF7',
    ...(Platform.OS === 'web' ? { minHeight: '100%', height: '100%' } : {}),
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
  body: { padding: 20, paddingBottom: 40, maxWidth: 440, width: '100%', alignSelf: 'center' },
  provisionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    gap: 10,
  },
  provisionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  provisionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  provisionSub: {
    fontSize: 11,
    color: '#78350F',
    fontWeight: '500',
    marginTop: 1,
  },
  addAdminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D97706',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addAdminBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B', marginBottom: 10 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  inputText: { fontSize: 14, color: '#1E293B', fontWeight: '800' },
  inputSub: { fontSize: 11, color: '#64748B', fontWeight: '500', marginTop: 1 },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    overflow: 'hidden',
  },
  ddItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FEF3C7',
  },
  ddActive: { backgroundColor: '#FEF3C7' },
  ddText: { fontSize: 13.5, color: '#1E293B', fontWeight: '700' },
  ddSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  ddTextActive: { color: '#B45309' },
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  qrContainer: { alignItems: 'center', width: '100%' },
  qrFrame: {
    padding: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FDE68A',
    marginBottom: 14,
  },
  qrImage: { width: 220, height: 220, borderRadius: 12 },
  qrName: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  upiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  upiPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  qrHint: { fontSize: 11.5, color: '#64748B', marginTop: 8, textAlign: 'center', fontWeight: '500', lineHeight: 16 },
  noQR: { alignItems: 'center', paddingVertical: 28 },
  qrIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  noQRTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  noQRText: { fontSize: 13, color: '#64748B', marginTop: 6, textAlign: 'center', lineHeight: 18, maxWidth: 280 },
  superActions: { width: '100%', marginTop: 20, gap: 10 },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  uploadText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    gap: 6,
  },
  removeText: { fontSize: 14, fontWeight: '700', color: '#DC2626' },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FEF3C7',
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
  modalSubtitle: { fontSize: 12, color: '#EA580C', fontWeight: '700', marginTop: 2 },
  modalLabel: { fontSize: 10.5, fontWeight: '700', color: '#78350F', marginBottom: 6, letterSpacing: 0.5 },
  modalInput: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#FDE68A',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  modalSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalSaveText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  upiInputBox: {
    width: '100%',
    marginBottom: 12,
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  upiInputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  upiInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
    paddingHorizontal: 8,
    gap: 6,
  },
  upiInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    paddingVertical: 8,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  saveUpiSmallBtn: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  saveUpiSmallText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
