import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { COLORS } from '../utils/constants';
import GoogleAuthModal from '../components/GoogleAuthModal';

export default function RegisterScreen({ navigation }) {
  const { register, oauthLogin } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleModalVisible, setGoogleModalVisible] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      showToast('Please fill all required fields', 'warning');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    if (password.length < 4) {
      showToast('Password must be at least 4 characters', 'warning');
      return;
    }

    setLoading(true);
    try {
      const newUser = await register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });

      showToast('Registration Initiated! 📩', 'info', `OTP sent to ${phone.trim()}`);
      navigation.navigate('OTP', { userId: newUser.id, phone: newUser.phone });
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSelect = async (account) => {
    setLoading(true);
    try {
      const user = await oauthLogin('Google', 'user', account);
      showToast(`Welcome, ${user.displayName || user.name}! 🪔`, 'success', 'Google account linked');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#FFFBEB', '#FFF7ED', '#FED7AA']} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={24} color="#991B1B" />
            </TouchableOpacity>
            <View style={styles.headerTitles}>
              <Text style={styles.title}>Join Malla Mata</Text>
              <Text style={styles.subtitle}>Member Registration & OTP Verification</Text>
            </View>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <View style={styles.securityNote}>
              <Ionicons name="shield-checkmark" size={18} color="#15803D" />
              <Text style={styles.securityNoteText}>
                Mobile OTP verification required for all new members.
              </Text>
            </View>

            {/* Full Name */}
            <Text style={styles.inputLabel}>FULL MEMBER NAME</Text>
            <View style={styles.inputGroup}>
              <Ionicons name="person-outline" size={20} color="#DC2626" style={styles.fieldIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Ramesh Shah"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Email Address */}
            <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
            <View style={styles.inputGroup}>
              <Ionicons name="mail-outline" size={20} color="#DC2626" style={styles.fieldIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. ramesh.shah@gmail.com"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Mobile Phone Number */}
            <Text style={styles.inputLabel}>MOBILE PHONE (OTP WILL BE SENT)</Text>
            <View style={styles.inputGroup}>
              <Ionicons name="call-outline" size={20} color="#DC2626" style={styles.fieldIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. +91 98234 56789"
                placeholderTextColor="#94A3B8"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            {/* Password */}
            <Text style={styles.inputLabel}>CREATE PASSWORD</Text>
            <View style={styles.inputGroup}>
              <Ionicons name="lock-closed-outline" size={20} color="#DC2626" style={styles.fieldIcon} />
              <TextInput
                style={styles.input}
                placeholder="Min 4 characters"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password */}
            <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
            <View style={styles.inputGroup}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#DC2626" style={styles.fieldIcon} />
              <TextInput
                style={styles.input}
                placeholder="Re-enter password"
                placeholderTextColor="#94A3B8"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
              />
            </View>

            {/* Submit & Send OTP Button */}
            <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
              <LinearGradient
                colors={['#DC2626', '#EA580C']}
                style={styles.submitBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.submitBtnText}>
                  {loading ? 'Sending OTP...' : 'Send OTP & Register'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>

            {/* Google Quick Sign-in Option for Members */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR FAST SIGNUP WITH</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.googleBtn}
              onPress={() => setGoogleModalVisible(true)}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-google" size={20} color="#EA4335" />
              <View style={styles.googleBtnTextWrap}>
                <Text style={styles.googleBtnTitle}>Instant Signup with Google</Text>
                <Text style={styles.googleBtnSub}>Pre-verified email & avatar</Text>
              </View>
            </TouchableOpacity>

            {/* Back to Login */}
            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already registered? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Sign In Here</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Google Account Selector Modal */}
      <GoogleAuthModal
        visible={googleModalVisible}
        onClose={() => setGoogleModalVisible(false)}
        onSelectAccount={handleGoogleSelect}
        role="user"
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: { flex: 1, width: '100%', height: '100%' },
  scrollContainer: {
    flex: 1,
    width: '100%',
    ...(Platform.OS === 'web' ? { overflowY: 'auto' } : {}),
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingVertical: 24,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
    gap: 12,
  },
  backBtn: {
    padding: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  headerTitles: { flex: 1 },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#991B1B',
  },
  subtitle: {
    fontSize: 12,
    color: '#9A3412',
    marginTop: 2,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DCFCE7',
    padding: 10,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  securityNoteText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#166534',
    flex: 1,
  },
  inputLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#78350F',
    letterSpacing: 0.6,
    marginBottom: 5,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    height: 48,
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
  eyeBtn: { padding: 6 },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
    gap: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#FDE68A',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9A3412',
    marginHorizontal: 10,
    letterSpacing: 0.5,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFDF7',
  },
  googleBtnTextWrap: { alignItems: 'flex-start' },
  googleBtnTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  googleBtnSub: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  loginText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  loginLink: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },
});
