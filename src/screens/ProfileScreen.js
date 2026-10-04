import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Alert, Image, Platform, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { COLORS } from '../utils/constants';

// Divine & festive avatar presets for quick 1-tap selection
const AVATAR_PRESETS = [
  { id: 'av-1', label: 'Devansh (Superuser)', uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=240&auto=format&fit=crop&q=80' },
  { id: 'av-2', label: 'Priya (Member)', uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&auto=format&fit=crop&q=80' },
  { id: 'av-3', label: 'Admin Leader', uri: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=240&auto=format&fit=crop&q=80' },
  { id: 'av-4', label: 'Festive Traditional', uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80' },
  { id: 'av-5', label: 'Committee Member', uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&auto=format&fit=crop&q=80' },
  { id: 'av-6', label: 'Senior Member', uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&auto=format&fit=crop&q=80' },
];

export default function ProfileScreen({ navigation }) {
  const { currentUser, updateProfile, isSuperuser, isAdmin, logout } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(currentUser?.name || '');
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [photoURL, setPhotoURL] = useState(currentUser?.photoURL || '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showSuperCreds, setShowSuperCreds] = useState(false);

  if (!currentUser) return null;

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setDisplayName(currentUser.displayName || '');
      setPhone(currentUser.phone || '');
      setEmail(currentUser.email || '');
      setPhotoURL(currentUser.photoURL || '');
    }
  }, [currentUser]);

  // Launch device image picker for Admins & Members
  const handlePickFromGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'Please allow media library access to upload a profile photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const newUri = result.assets[0].uri;
        setPhotoURL(newUri);
        setShowAvatarModal(false);
        await updateProfile(currentUser.id, { photoURL: newUri });
        showToast('Profile Photo Updated! 📸', 'success', 'Your new avatar is live across the app');
      }
    } catch (e) {
      console.error('Image picker error:', e);
      Alert.alert('Image Picker Error', e.message);
    }
  };

  const handleSelectPreset = async (presetUri) => {
    setPhotoURL(presetUri);
    setShowAvatarModal(false);
    await updateProfile(currentUser.id, { photoURL: presetUri });
    showToast('Avatar Updated! 🪔', 'success', 'New festive avatar applied to your profile');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showToast('Name cannot be empty', 'error');
      return;
    }
    setSaving(true);
    try {
      await updateProfile(currentUser.id, {
        name: name.trim(),
        displayName: displayName.trim() || name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        photoURL: photoURL.trim(),
      });
      setEditing(false);
      showToast('Profile Saved Successfully! 🎉', 'success', 'All member details have been updated');
    } catch (e) {
      showToast('Failed to save profile: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Role Badges: Superuser, Admin, Member
  const getRoleInfo = () => {
    if (isSuperuser) return { label: 'Superuser Lead', color: '#D97706', icon: 'star' };
    if (isAdmin) return { label: 'Admin', color: '#DC2626', icon: 'shield-checkmark' };
    return { label: 'Member', color: '#16A34A', icon: 'person' };
  };

  const roleInfo = getRoleInfo();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#DC2626', '#EA580C']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile & Avatar</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Profile Card & Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            {photoURL ? (
              <Image source={{ uri: photoURL }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitialsText}>
                  {(name || 'Member').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            {/* Change Profile Photo Button */}
            <TouchableOpacity
              style={styles.changeAvatarBtn}
              onPress={() => setShowAvatarModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </TouchableOpacity>

            {currentUser?.authProvider === 'Google' && (
              <View style={styles.googleAvatarBadge}>
                <Ionicons name="logo-google" size={12} color="#EA4335" />
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.changePicPill}
            onPress={() => setShowAvatarModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="image-outline" size={14} color="#DC2626" />
            <Text style={styles.changePicPillText}>Change Profile Picture</Text>
          </TouchableOpacity>

          <Text style={styles.profileName}>
            {currentUser?.displayName || currentUser?.name || 'Member'}
          </Text>
          <Text style={styles.profileEmail}>{currentUser?.email || currentUser?.phone || 'Malla Mata'}</Text>

          <View style={styles.badgesRow}>
            <View style={[styles.roleBadge, { backgroundColor: roleInfo.color }]}>
              <Ionicons name={roleInfo.icon} size={13} color="#FFFFFF" />
              <Text style={styles.roleText}>{roleInfo.label}</Text>
            </View>

            {currentUser?.authProvider === 'Google' && (
              <View style={styles.googleVerifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                <Text style={styles.googleVerifiedText}>Google Account Linked</Text>
              </View>
            )}
          </View>
        </View>

        {/* Profile Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderTitle}>Member Information</Text>
            {!editing && (
              <TouchableOpacity
                style={styles.editIconBtn}
                onPress={() => setEditing(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={16} color="#DC2626" />
                <Text style={styles.editIconText}>Edit Details</Text>
              </TouchableOpacity>
            )}
          </View>

          {[
            { label: 'Full Member Name', value: name, setter: setName, icon: 'person-outline', editable: true },
            { label: 'Display Name / Tag', value: displayName, setter: setDisplayName, icon: 'at-outline', editable: true },
            { label: 'Email Address', value: email, setter: setEmail, icon: 'mail-outline', kb: 'email-address', editable: true },
            { label: 'Mobile Phone Number', value: phone, setter: setPhone, icon: 'call-outline', kb: 'phone-pad', editable: true },
          ].map((f, i) => (
            <View key={i} style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <View style={[styles.inputRow, editing && styles.inputRowEditing]}>
                <Ionicons name={f.icon} size={20} color="#DC2626" style={styles.fieldIcon} />
                <TextInput
                  style={styles.input}
                  value={f.value}
                  onChangeText={f.setter}
                  editable={editing}
                  keyboardType={f.kb || 'default'}
                  placeholder={`Enter ${f.label.toLowerCase()}`}
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>
          ))}

          {editing ? (
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditing(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={['#DC2626', '#EA580C']}
                  style={styles.saveBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Superuser Private Credentials Card - STRICTLY PROTECTED & ONLY VISIBLE TO SUPERUSER */}
        {isSuperuser && (
          <View style={styles.superuserCard}>
            <View style={styles.superuserCardHeader}>
              <View style={styles.superuserTitleRow}>
                <Ionicons name="key" size={20} color="#D97706" />
                <Text style={styles.superuserCardTitle}>Superuser Credentials Vault</Text>
              </View>
              <View style={styles.superuserPrivateBadge}>
                <Ionicons name="lock-closed" size={12} color="#92400E" />
                <Text style={styles.superuserPrivateText}>CONFIDENTIAL</Text>
              </View>
            </View>

            <Text style={styles.superuserNoticeText}>
              These master credentials have root administrative privileges. No member, resident, or general committee account can view or access this data.
            </Text>

            <View style={styles.credRow}>
              <Text style={styles.credLabel}>Superuser Username</Text>
              <View style={styles.credValueBox}>
                <Ionicons name="person" size={16} color="#B45309" />
                <Text style={styles.credValueText}>Devansh</Text>
              </View>
            </View>

            <View style={styles.credRow}>
              <Text style={styles.credLabel}>Superuser Password / Master PIN</Text>
              <View style={styles.credValueBox}>
                <Ionicons name="lock-closed" size={16} color="#B45309" />
                <Text style={styles.credValueText}>
                  {showSuperCreds ? '112754' : '••••••'}
                </Text>
                <TouchableOpacity
                  style={styles.eyeToggleBtn}
                  onPress={() => setShowSuperCreds(!showSuperCreds)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showSuperCreds ? 'eye-off' : 'eye'}
                    size={18}
                    color="#92400E"
                  />
                  <Text style={styles.eyeToggleText}>
                    {showSuperCreds ? 'Hide' : 'Reveal'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.credRow}>
              <Text style={styles.credLabel}>Role & Designation</Text>
              <View style={styles.credValueBox}>
                <Ionicons name="star" size={16} color="#B45309" />
                <Text style={styles.credValueText}>Superuser & Lead Organizer</Text>
              </View>
            </View>
          </View>
        )}

        {/* Verified Notice */}
        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#059669" />
          <View style={styles.infoBoxContent}>
            <Text style={styles.infoBoxTitle}>Verified community Profile</Text>
            <Text style={styles.infoBoxSub}>
              Your account details and avatar are active for Malla Mata Navratri Mahotsav 2026.
            </Text>
          </View>
        </View>

        {/* Bottom Logout Button */}
        <TouchableOpacity
          style={styles.bottomLogoutBtn}
          onPress={logout}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={22} color="#DC2626" />
          <Text style={styles.bottomLogoutText}>Log Out of Account</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Avatar Picker Modal */}
      <Modal
        visible={showAvatarModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Profile Picture</Text>
              <TouchableOpacity onPress={() => setShowAvatarModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Device Gallery Option */}
            <TouchableOpacity
              style={styles.uploadOptionBtn}
              onPress={handlePickFromGallery}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['#DC2626', '#EA580C']} style={styles.uploadOptionGradient}>
                <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
                <Text style={styles.uploadOptionText}>Upload from Device / Gallery</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.presetDividerRow}>
              <View style={styles.presetDividerLine} />
              <Text style={styles.presetDividerText}>OR CHOOSE FESTIVE AVATAR</Text>
              <View style={styles.presetDividerLine} />
            </View>

            {/* Presets Grid */}
            <View style={styles.presetsGrid}>
              {AVATAR_PRESETS.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.presetItem}
                  onPress={() => handleSelectPreset(p.uri)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: p.uri }} style={styles.presetImg} />
                  <Text style={styles.presetLabel} numberOfLines={1}>{p.label}</Text>
                </TouchableOpacity>
              ))}
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
    shadowColor: '#B45309',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  backBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  logoutTopBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  body: {
    padding: 20,
    paddingBottom: 40,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImg: {
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 4,
    borderColor: '#EA580C',
  },
  avatarFallback: {
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#EA580C',
  },
  avatarInitialsText: {
    fontSize: 54,
    fontWeight: '900',
    color: '#DC2626',
  },
  changeAvatarBtn: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#DC2626',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  googleAvatarBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EA4335',
  },
  changePicPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginBottom: 10,
  },
  changePicPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: 0.2,
  },
  profileEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
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
  },
  googleVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  googleVerifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FEF3C7',
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  editIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  editIconText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78350F',
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  inputRowEditing: {
    borderColor: '#DC2626',
    backgroundColor: '#FFFFFF',
  },
  fieldIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    height: '100%',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
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
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    gap: 6,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#ECFDF5',
    padding: 14,
    borderRadius: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  infoBoxContent: {
    flex: 1,
  },
  infoBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  infoBoxSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    lineHeight: 16,
  },
  bottomLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 20,
    marginBottom: 10,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  bottomLogoutText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
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
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
  },
  uploadOptionBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
  },
  uploadOptionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  uploadOptionText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  presetDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  presetDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#FDE68A',
  },
  presetDividerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9A3412',
    marginHorizontal: 8,
    letterSpacing: 0.5,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  presetItem: {
    width: '30%',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  presetImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#EA580C',
    marginBottom: 4,
  },
  presetLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  superuserCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  superuserCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  superuserTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  superuserCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#92400E',
  },
  superuserPrivateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  superuserPrivateText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  superuserNoticeText: {
    fontSize: 11,
    color: '#78350F',
    lineHeight: 16,
    marginBottom: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 10,
    borderRadius: 10,
  },
  credRow: {
    marginBottom: 10,
  },
  credLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  credValueBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 8,
  },
  credValueText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  eyeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
  },
  eyeToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
});
