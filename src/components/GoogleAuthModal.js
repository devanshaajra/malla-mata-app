import React, { useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, Image,
  TextInput, ScrollView, Platform, Dimensions, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

const PRESET_ACCOUNTS = [
  {
    id: 'google-1',
    name: 'Devansh Sharma',
    displayName: 'Devansh Sharma',
    email: 'devansh.sharma.mallamata@gmail.com',
    phone: '+91 98765 43210',
    photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    badge: 'Superuser / Community Lead',
  },
];

export default function GoogleAuthModal({ visible, onClose, onSelectAccount, role = 'user' }) {
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [loadingAccount, setLoadingAccount] = useState(null);

  const handleSelect = async (account) => {
    setLoadingAccount(account.id || 'custom');
    try {
      await onSelectAccount(account);
    } finally {
      setLoadingAccount(null);
      onClose();
    }
  };

  const handleCustomSubmit = () => {
    if (!customName.trim() || !customEmail.trim()) {
      alert('Please enter at least Name and Email');
      return;
    }
    const initials = customName.trim().split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    const avatar = `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(customName.trim())}&backgroundColor=EA4335,4285F4,34A853,FBBC05`;
    
    handleSelect({
      id: `google-custom-${Date.now()}`,
      name: customName.trim(),
      displayName: customName.trim(),
      email: customEmail.trim(),
      phone: customPhone.trim() || '+91 98000 00000',
      photoURL: avatar,
      badge: 'Google Account',
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        
        <View style={styles.dialog}>
          {/* Google Header */}
          <View style={styles.header}>
            <View style={styles.googleBrand}>
              <Ionicons name="logo-google" size={26} color="#EA4335" />
              <Text style={styles.googleTitle}>Sign in with Google</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color="#5F6368" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtext}>
            Choose an account to continue to <Text style={styles.appName}>Malla Mata</Text>
          </Text>

          <ScrollView style={styles.accountList} showsVerticalScrollIndicator={false}>
            {PRESET_ACCOUNTS.map((acc) => (
              <TouchableOpacity
                key={acc.id}
                style={styles.accountRow}
                activeOpacity={0.7}
                onPress={() => handleSelect(acc)}
                disabled={loadingAccount !== null}
              >
                <Image source={{ uri: acc.photoURL }} style={styles.avatar} />
                <View style={styles.accDetails}>
                  <Text style={styles.accName}>{acc.name}</Text>
                  <Text style={styles.accEmail}>{acc.email}</Text>
                  <View style={styles.phoneTag}>
                    <Ionicons name="call-outline" size={11} color="#16A34A" />
                    <Text style={styles.phoneText}>{acc.phone}</Text>
                  </View>
                </View>
                {loadingAccount === acc.id ? (
                  <ActivityIndicator size="small" color="#4285F4" />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color="#9AA0A6" />
                )}
              </TouchableOpacity>
            ))}

            {/* Custom Account Toggle */}
            {!showCustom ? (
              <TouchableOpacity
                style={styles.addAccountRow}
                onPress={() => setShowCustom(true)}
              >
                <View style={styles.addIconCircle}>
                  <Ionicons name="person-add" size={18} color="#1A73E8" />
                </View>
                <Text style={styles.addAccountText}>Use another Google account</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.customForm}>
                <Text style={styles.formTitle}>Enter Google Account Details</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Full Name (e.g. Rahul Sharma)"
                  placeholderTextColor="#9AA0A6"
                  value={customName}
                  onChangeText={setCustomName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Google Email (e.g. rahul@gmail.com)"
                  placeholderTextColor="#9AA0A6"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={customEmail}
                  onChangeText={setCustomEmail}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Mobile Number (e.g. +91 98765 00000)"
                  placeholderTextColor="#9AA0A6"
                  keyboardType="phone-pad"
                  value={customPhone}
                  onChangeText={setCustomPhone}
                />
                <View style={styles.formBtnRow}>
                  <TouchableOpacity
                    style={styles.formCancelBtn}
                    onPress={() => setShowCustom(false)}
                  >
                    <Text style={styles.formCancelText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.formSubmitBtn}
                    onPress={handleCustomSubmit}
                    disabled={loadingAccount !== null}
                  >
                    <Text style={styles.formSubmitText}>Continue</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer Security Note */}
          <View style={styles.footer}>
            <Ionicons name="shield-checkmark" size={14} color="#1E8E3E" />
            <Text style={styles.footerText}>
              To continue, Google will share your name, email, phone & profile picture with Malla Mata App.
            </Text>
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
    padding: 16,
    zIndex: 9999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  dialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 420,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  googleBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  googleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#202124',
    letterSpacing: 0.2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#F1F3F4',
  },
  subtext: {
    fontSize: 13,
    color: '#5F6368',
    marginBottom: 16,
    lineHeight: 18,
  },
  appName: {
    fontWeight: '700',
    color: '#DC2626',
  },
  accountList: {
    maxHeight: 340,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8EAED',
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: '#4285F4',
  },
  accDetails: {
    flex: 1,
  },
  accName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#202124',
  },
  accEmail: {
    fontSize: 12,
    color: '#5F6368',
    marginTop: 1,
  },
  phoneTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  phoneText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16A34A',
  },
  addAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#1A73E8',
    backgroundColor: '#F8FAFC',
    marginTop: 4,
    gap: 12,
  },
  addIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F0FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addAccountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A73E8',
  },
  customForm: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#202124',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E293B',
    marginBottom: 10,
  },
  formBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  formCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
  },
  formCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  formSubmitBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1A73E8',
    alignItems: 'center',
  },
  formSubmitText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F4',
  },
  footerText: {
    fontSize: 11,
    color: '#5F6368',
    flex: 1,
    lineHeight: 15,
  },
});
