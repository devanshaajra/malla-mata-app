import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Alert, Image, Platform, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { COLORS } from '../utils/constants';
import { DEFAULT_FIREBASE_DB_URL, FIREBASE_SETUP_GUIDE } from '../config/databaseConfig';

// Divine & festive avatar presets for quick 1-tap selection
const AVATAR_PRESETS = [
  { id: 'av-1', label: 'Devansh (Superuser)', uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=240&auto=format&fit=crop&q=80' },
  { id: 'av-2', label: 'Festive Member', uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&auto=format&fit=crop&q=80' },
  { id: 'av-3', label: 'Admin Leader', uri: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=240&auto=format&fit=crop&q=80' },
  { id: 'av-4', label: 'Festive Traditional', uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80' },
  { id: 'av-5', label: 'Committee Member', uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&auto=format&fit=crop&q=80' },
  { id: 'av-6', label: 'Senior Member', uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&auto=format&fit=crop&q=80' },
];

export default function ProfileScreen({ navigation }) {
  const { currentUser, updateProfile, isSuperuser, isAdmin, logout } = useAuth();
  const {
    backupStatus,
    triggerBackup,
    triggerRestore,
    triggerPurgeDatabase,
    triggerExportBackup,
    triggerImportBackup,
    cloudDbStatus,
    pullAllFromCloud,
    pushAllToCloud,
    updateFirebaseUrl,
    testFirebaseConnection,
  } = useData();
  const { showToast } = useToast();
  const [syncingBackup, setSyncingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [purgingDb, setPurgingDb] = useState(false);
  const [pullingCloud, setPullingCloud] = useState(false);
  const [pushingCloud, setPushingCloud] = useState(false);
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);
  const [customFirebaseUrlInput, setCustomFirebaseUrlInput] = useState('');
  const [testingDbConnection, setTestingDbConnection] = useState(false);
  const [testDbResult, setTestDbResult] = useState(null);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
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

  const handleSyncBackupNow = async () => {
    setSyncingBackup(true);
    try {
      const res = await triggerBackup('Manual Superuser Vault Sync');
      if (res?.success) {
        showToast('Backup Database Synced! 🛡️', 'success', `Secured ${res.totalRecords || 0} records across all collections.`);
      } else {
        showToast(res?.error || 'Failed to sync backup', 'error');
      }
    } finally {
      setSyncingBackup(false);
    }
  };

  const handleRestoreBackup = async () => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Restore database from the latest secure backup database snapshot?')
      : true;
    if (!confirmed) return;

    setRestoringBackup(true);
    try {
      const res = await triggerRestore();
      if (res?.success) {
        showToast('Database Restored! 🔄', 'success', `Restored ${res.totalRecords || 0} records from secure backup.`);
      } else {
        showToast(res?.error || 'Failed to restore database', 'error');
      }
    } finally {
      setRestoringBackup(false);
    }
  };

  const handlePurgeCleanDatabase = async () => {
    const warning = 'PERMANENT CONFIDENTIAL RESET:\n\nAre you sure you want to completely purge and clear all database collections to start fresh with your confidential data?\n\nThis will reset all funds, expenses, sponsors, tasks, polls and announcements.';
    const confirmed = Platform.OS === 'web' ? window.confirm(warning) : true;
    if (!confirmed) return;

    setPurgingDb(true);
    try {
      const res = await triggerPurgeDatabase();
      if (res?.success) {
        showToast('Database Cleared! ✨', 'success', 'All database data purged. Ready for confidential data entry.');
      } else {
        showToast(res?.error || 'Failed to purge database', 'error');
      }
    } finally {
      setPurgingDb(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const res = await triggerExportBackup();
      if (res?.success) {
        showToast('Database Backup Exported! 📥', 'success', 'Downloaded secure backup JSON file to your device.');
      } else {
        showToast(res?.error || 'Failed to export backup', 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const handleImportBackup = async () => {
    if (typeof document === 'undefined') return;
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
          const content = event.target?.result;
          if (content) {
            setRestoringBackup(true);
            try {
              const res = await triggerImportBackup(content);
              if (res?.success) {
                showToast('Database Restored from File! 🔄', 'success', `Restored ${res.totalRecords || 0} records.`);
              } else {
                showToast(res?.error || 'Import failed', 'error');
              }
            } finally {
              setRestoringBackup(false);
            }
          }
        };
        reader.readAsText(file);
      };
      input.click();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const handlePullCloudData = async () => {
    setPullingCloud(true);
    try {
      const res = await pullAllFromCloud();
      if (res?.success) {
        showToast('Data Fetched from Cloud Database! 🌐', 'success', res.message || 'All records updated on website.');
      } else {
        showToast(res?.error || 'Failed to fetch from Cloud Database', 'error');
      }
    } finally {
      setPullingCloud(false);
    }
  };

  const handlePushCloudData = async () => {
    setPushingCloud(true);
    try {
      const res = await pushAllToCloud();
      if (res?.success) {
        showToast('Saved to Cloud Database! ☁️', 'success', res.message || 'All local records uploaded to Firebase.');
      } else {
        showToast(res?.error || 'Failed to push to Cloud Database', 'error');
      }
    } finally {
      setPushingCloud(false);
    }
  };

  const handleOpenFirebaseModal = () => {
    setCustomFirebaseUrlInput(cloudDbStatus?.dbUrl || DEFAULT_FIREBASE_DB_URL);
    setTestDbResult(null);
    setShowFirebaseModal(true);
  };

  const handleTestDbProbe = async () => {
    if (!customFirebaseUrlInput.trim()) {
      showToast('Please enter a Firebase Database URL', 'error');
      return;
    }
    setTestingDbConnection(true);
    setTestDbResult(null);
    try {
      const probe = await testFirebaseConnection(customFirebaseUrlInput.trim());
      setTestDbResult(probe);
      if (probe.success) {
        showToast('Connection Successful! 🟢', 'success', 'Firebase Database reachable and responsive.');
      } else {
        showToast('Connection Note: ' + (probe.error || 'Unable to connect'), 'error');
      }
    } finally {
      setTestingDbConnection(false);
    }
  };

  const handleSaveFirebaseUrl = async () => {
    if (!customFirebaseUrlInput.trim()) {
      showToast('Please enter a Firebase Database URL', 'error');
      return;
    }
    setTestingDbConnection(true);
    try {
      const res = await updateFirebaseUrl(customFirebaseUrlInput.trim());
      if (res?.success) {
        setShowFirebaseModal(false);
        showToast('Firebase Database Configured! 🚀', 'success', 'App connected to your Firebase Realtime Database.');
      } else {
        showToast('Could not save URL: ' + (res?.error || 'Unknown error'), 'error');
      }
    } finally {
      setTestingDbConnection(false);
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

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.body} showsVerticalScrollIndicator={true}>
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

        {/* Firebase Cloud Database & Live Website Synchronization Card */}
        {(isSuperuser || isAdmin) && (
          <View style={styles.cloudDbCard}>
            <View style={styles.cloudDbHeader}>
              <View style={styles.cloudDbTitleRow}>
                <Ionicons name="cloud-done" size={22} color="#0284C7" />
                <View>
                  <Text style={styles.cloudDbCardTitle}>Firebase Cloud Database & Sync</Text>
                  <Text style={styles.cloudDbCardSub}>Live Sync • Website • Android APK • iOS</Text>
                </View>
              </View>
              <View style={[
                styles.cloudDbStatusBadge,
                { backgroundColor: cloudDbStatus?.isConnected ? '#ECFDF5' : '#FFFBEB', borderColor: cloudDbStatus?.isConnected ? '#A7F3D0' : '#FDE68A' }
              ]}>
                <View style={[
                  styles.cloudDbPulseDot,
                  { backgroundColor: cloudDbStatus?.isConnected ? '#10B981' : '#F59E0B' }
                ]} />
                <Text style={[
                  styles.cloudDbStatusBadgeText,
                  { color: cloudDbStatus?.isConnected ? '#065F46' : '#92400E' }
                ]}>
                  {cloudDbStatus?.isConnected ? 'CONNECTED & LIVE' : 'READY / LOCAL CACHE'}
                </Text>
              </View>
            </View>

            <View style={styles.cloudDbUrlBanner}>
              <Ionicons name="server-outline" size={16} color="#0369A1" />
              <Text style={styles.cloudDbUrlBannerText} numberOfLines={1}>
                {cloudDbStatus?.dbUrl || DEFAULT_FIREBASE_DB_URL}
              </Text>
              <TouchableOpacity
                style={styles.cloudDbChangeBtn}
                onPress={handleOpenFirebaseModal}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={13} color="#0369A1" />
                <Text style={styles.cloudDbChangeBtnText}>Change</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.vaultStatusGrid}>
              <View style={styles.vaultStatusItem}>
                <Text style={styles.vaultStatusLabel}>WEBSITE & APP SYNC</Text>
                <Text style={styles.vaultStatusValHighlight}>
                  {cloudDbStatus?.isConnected ? 'Active & Live' : 'Local Cache Active'}
                </Text>
              </View>

              <View style={styles.vaultStatusItem}>
                <Text style={styles.vaultStatusLabel}>LAST CLOUD FETCH</Text>
                <Text style={styles.vaultStatusVal} numberOfLines={1}>
                  {cloudDbStatus?.lastFetched ? new Date(cloudDbStatus.lastFetched).toLocaleTimeString() : 'Automatic on load'}
                </Text>
              </View>

              <View style={styles.vaultStatusItem}>
                <Text style={styles.vaultStatusLabel}>COLLECTIONS SYNCED</Text>
                <Text style={styles.vaultStatusVal}>Funds, Members, Expenses & All</Text>
              </View>

              <View style={styles.vaultStatusItem}>
                <Text style={styles.vaultStatusLabel}>DATABASE STATUS</Text>
                <Text style={styles.vaultStatusVal}>
                  {cloudDbStatus?.isSyncing ? 'Syncing...' : 'Real-Time Streaming'}
                </Text>
              </View>
            </View>

            {/* Cloud Action Buttons */}
            <View style={styles.vaultActionsRow}>
              <TouchableOpacity
                style={styles.cloudDbPullBtn}
                onPress={handlePullCloudData}
                disabled={pullingCloud}
                activeOpacity={0.8}
              >
                <Ionicons name="cloud-download" size={16} color="#FFFFFF" />
                <Text style={styles.cloudDbPullBtnText}>
                  {pullingCloud ? 'Fetching Data...' : 'Fetch All from Database'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cloudDbPushBtn}
                onPress={handlePushCloudData}
                disabled={pushingCloud}
                activeOpacity={0.8}
              >
                <Ionicons name="cloud-upload" size={16} color="#0369A1" />
                <Text style={styles.cloudDbPushBtnText}>
                  {pushingCloud ? 'Saving...' : 'Save All to Database'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Configure Firebase Button */}
            <TouchableOpacity
              style={styles.cloudDbConfigBtn}
              onPress={handleOpenFirebaseModal}
              activeOpacity={0.8}
            >
              <Ionicons name="settings-outline" size={15} color="#475569" />
              <Text style={styles.cloudDbConfigBtnText}>
                Configure / Paste Your Firebase Database URL
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Confidential Database & Hourly Backup Vault Card */}
        {(isSuperuser || isAdmin) && (
          <View style={styles.vaultCard}>
            <View style={styles.vaultHeader}>
              <View style={styles.vaultTitleRow}>
                <Ionicons name="shield-checkmark" size={22} color="#059669" />
                <View>
                  <Text style={styles.vaultCardTitle}>Hourly Database Backup & Vault</Text>
                  <Text style={styles.vaultCardSub}>Encrypted Storage • Auto-Sync Every 60 Mins</Text>
                </View>
              </View>
              <View style={styles.vaultSecureBadge}>
                <Ionicons name="lock-closed" size={11} color="#065F46" />
                <Text style={styles.vaultSecureBadgeText}>CONFIDENTIAL</Text>
              </View>
            </View>

            <View style={styles.vaultStatusGrid}>
              <View style={styles.vaultStatusItem}>
                <Text style={styles.vaultStatusLabel}>AUTOMATED SYNC</Text>
                <View style={styles.vaultStatusValRow}>
                  <View style={styles.vaultPulseDot} />
                  <Text style={styles.vaultStatusVal}>Every 1 Hour (Active)</Text>
                </View>
              </View>

              <View style={styles.vaultStatusItem}>
                <Text style={styles.vaultStatusLabel}>LAST BACKUP SYNC</Text>
                <Text style={styles.vaultStatusVal} numberOfLines={1}>
                  {backupStatus?.lastSyncFormatted || 'Just now'}
                </Text>
              </View>

              <View style={styles.vaultStatusItem}>
                <Text style={styles.vaultStatusLabel}>NEXT SCHEDULED SYNC</Text>
                <Text style={styles.vaultStatusValHighlight}>
                  {backupStatus?.nextSyncInMinutes ? `In ~${backupStatus.nextSyncInMinutes} mins` : 'Hourly schedule active'}
                </Text>
              </View>

              <View style={styles.vaultStatusItem}>
                <Text style={styles.vaultStatusLabel}>INTEGRITY & STORAGE</Text>
                <Text style={styles.vaultStatusVal}>15 Collections Protected</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.vaultActionsRow}>
              <TouchableOpacity
                style={styles.vaultSyncBtn}
                onPress={handleSyncBackupNow}
                disabled={syncingBackup}
                activeOpacity={0.8}
              >
                <Ionicons name="cloud-upload" size={16} color="#FFFFFF" />
                <Text style={styles.vaultSyncBtnText}>
                  {syncingBackup ? 'Syncing...' : 'Sync Backup Now'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.vaultRestoreBtn}
                onPress={handleRestoreBackup}
                disabled={restoringBackup}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh-circle" size={16} color="#065F46" />
                <Text style={styles.vaultRestoreBtnText}>
                  {restoringBackup ? 'Restoring...' : 'Restore from Backup'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Offline Export / Import Safe Maintenance */}
            <View style={styles.vaultActionsRow}>
              <TouchableOpacity
                style={styles.vaultExportBtn}
                onPress={handleExportBackup}
                activeOpacity={0.8}
              >
                <Ionicons name="download-outline" size={15} color="#1E40AF" />
                <Text style={styles.vaultExportBtnText}>Download Backup JSON</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.vaultImportBtn}
                onPress={handleImportBackup}
                disabled={restoringBackup}
                activeOpacity={0.8}
              >
                <Ionicons name="cloud-upload-outline" size={15} color="#4338CA" />
                <Text style={styles.vaultImportBtnText}>Upload / Restore File</Text>
              </TouchableOpacity>
            </View>

            {/* Superuser Clean Database Purge Button */}
            {isSuperuser && (
              <TouchableOpacity
                style={styles.vaultPurgeBtn}
                onPress={handlePurgeCleanDatabase}
                disabled={purgingDb}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-bin-outline" size={15} color="#DC2626" />
                <Text style={styles.vaultPurgeBtnText}>
                  {purgingDb ? 'Purging Database...' : 'Wipe & Reset to Clean Confidential Database'}
                </Text>
              </TouchableOpacity>
            )}
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

      {/* Firebase Database URL Configuration Modal */}
      <Modal
        visible={showFirebaseModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFirebaseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardLarge}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="server" size={22} color="#DC2626" />
                <Text style={styles.modalTitle}>Firebase Cloud Database</Text>
              </View>
              <TouchableOpacity onPress={() => setShowFirebaseModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={true}>
              <Text style={styles.firebaseModalDesc}>
                Enter your Firebase Realtime Database URL to store and sync funds, expenses, sponsors, members, messages, and polls live between the website and mobile app.
              </Text>

              <Text style={styles.fieldLabel}>Firebase Realtime Database URL</Text>
              <View style={[styles.inputRow, styles.inputRowEditing, { marginBottom: 12 }]}>
                <Ionicons name="link-outline" size={18} color="#DC2626" style={styles.fieldIcon} />
                <TextInput
                  style={styles.input}
                  value={customFirebaseUrlInput}
                  onChangeText={setCustomFirebaseUrlInput}
                  placeholder="https://your-project-default-rtdb.firebaseio.com"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Test probe result banner */}
              {testDbResult && (
                <View style={[
                  styles.probeResultBox,
                  { backgroundColor: testDbResult.success ? '#ECFDF5' : '#FEF2F2', borderColor: testDbResult.success ? '#A7F3D0' : '#FECACA' }
                ]}>
                  <Ionicons
                    name={testDbResult.success ? 'checkmark-circle' : 'alert-circle'}
                    size={18}
                    color={testDbResult.success ? '#059669' : '#DC2626'}
                  />
                  <Text style={[
                    styles.probeResultText,
                    { color: testDbResult.success ? '#065F46' : '#991B1B' }
                  ]}>
                    {testDbResult.success
                      ? 'Connection successful! Database is accessible.'
                      : (testDbResult.error || 'Connection check failed.')}
                  </Text>
                </View>
              )}

              {/* Action Buttons inside modal */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 16 }}>
                <TouchableOpacity
                  style={styles.testProbeBtn}
                  onPress={handleTestDbProbe}
                  disabled={testingDbConnection}
                  activeOpacity={0.8}
                >
                  <Ionicons name="pulse-outline" size={16} color="#0369A1" />
                  <Text style={styles.testProbeBtnText}>
                    {testingDbConnection ? 'Testing...' : 'Test Connection'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={handleSaveFirebaseUrl}
                  disabled={testingDbConnection}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={['#DC2626', '#EA580C']} style={styles.saveDbBtn}>
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                    <Text style={styles.saveDbBtnText}>Save & Connect</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Accordion: Step-by-Step Setup Guide */}
              <TouchableOpacity
                style={styles.guideAccordionHeader}
                onPress={() => setShowSetupGuide(!showSetupGuide)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="help-circle-outline" size={18} color="#EA580C" />
                  <Text style={styles.guideAccordionTitle}>How to get your free Firebase URL (2 mins)</Text>
                </View>
                <Ionicons name={showSetupGuide ? 'chevron-up' : 'chevron-down'} size={18} color="#EA580C" />
              </TouchableOpacity>

              {showSetupGuide && (
                <View style={styles.guideContent}>
                  {FIREBASE_SETUP_GUIDE.map((item) => (
                    <View key={item.step} style={styles.guideStepRow}>
                      <View style={styles.guideStepNum}>
                        <Text style={styles.guideStepNumText}>{item.step}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.guideStepTitle}>{item.title}</Text>
                        <Text style={styles.guideStepDesc}>{item.desc}</Text>
                      </View>
                    </View>
                  ))}
                  <View style={styles.guideRuleBox}>
                    <Text style={styles.guideRuleTitle}>Firebase Realtime Database Rules:</Text>
                    <Text style={styles.guideRuleCode}>{`{\n  "rules": {\n    ".read": true,\n    ".write": true\n  }\n}`}</Text>
                  </View>
                </View>
              )}
            </ScrollView>
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
  // Confidential Database & Hourly Backup Vault Styles
  vaultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  vaultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ECFDF5',
  },
  vaultTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  vaultCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#065F46',
  },
  vaultCardSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
    marginTop: 1,
  },
  vaultSecureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  vaultSecureBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.5,
  },
  vaultStatusGrid: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  vaultStatusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vaultStatusLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#047857',
    letterSpacing: 0.4,
  },
  vaultStatusValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vaultPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  vaultStatusVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  vaultStatusValHighlight: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
  },
  vaultActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  vaultSyncBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 11,
    borderRadius: 12,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  vaultSyncBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  vaultRestoreBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    paddingVertical: 11,
    borderRadius: 12,
  },
  vaultRestoreBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065F46',
  },
  vaultPurgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 4,
  },
  vaultPurgeBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#DC2626',
  },
  vaultExportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    paddingVertical: 10,
    borderRadius: 12,
  },
  vaultExportBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E40AF',
  },
  vaultImportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#EEF2FF',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    paddingVertical: 10,
    borderRadius: 12,
  },
  vaultImportBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4338CA',
  },
  cloudDbCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 3,
  },
  cloudDbHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  cloudDbTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  cloudDbCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0C4A6E',
  },
  cloudDbCardSub: {
    fontSize: 11,
    color: '#0284C7',
    marginTop: 1,
    fontWeight: '600',
  },
  cloudDbStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  cloudDbPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  cloudDbStatusBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  cloudDbUrlBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#E0F2FE',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  cloudDbUrlBannerText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#0369A1',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  cloudDbChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cloudDbChangeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
  cloudDbPullBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingVertical: 11,
    borderRadius: 12,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  cloudDbPullBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cloudDbPushBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    paddingVertical: 11,
    borderRadius: 12,
  },
  cloudDbPushBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0369A1',
  },
  cloudDbConfigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  cloudDbConfigBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  modalCardLarge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    width: '94%',
    maxWidth: 540,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  firebaseModalDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 14,
  },
  probeResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  probeResultText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  testProbeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  testProbeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369A1',
  },
  saveDbBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveDbBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  guideAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 6,
    marginBottom: 10,
  },
  guideAccordionTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#C2410C',
  },
  guideContent: {
    backgroundColor: '#FFFDF7',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  guideStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  guideStepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  guideStepNumText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  guideStepTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  guideStepDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
    lineHeight: 15,
  },
  guideRuleBox: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  guideRuleTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 4,
  },
  guideRuleCode: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    fontSize: 11,
    color: '#34D399',
    lineHeight: 16,
  },
});
