import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { COLORS, SUPERUSER } from '../utils/constants';
import GoogleAuthModal from '../components/GoogleAuthModal';

export default function LoginScreen({ navigation }) {
  const { login, oauthLogin } = useAuth();
  const { showToast } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loginAs, setLoginAs] = useState('user'); // 'user' (Member) | 'admin' (Admin)
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleModalVisible, setGoogleModalVisible] = useState(false);

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      showToast('Please enter your credentials', 'warning');
      return;
    }
    setLoading(true);
    try {
      const user = await login(identifier.trim(), password, loginAs);
      showToast(`Welcome back, ${user.displayName || user.name}! 🪔`, 'success', 'Logged in successfully');
    } catch (e) {
      if (e.message === 'UNVERIFIED_PHONE' && e.user) {
        showToast('Phone verification required via OTP', 'info');
        navigation.navigate('OTP', { userId: e.user.id, phone: e.user.phone });
      } else {
        showToast(e.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSelect = async (account) => {
    setLoading(true);
    try {
      const user = await oauthLogin('Google', 'user', account);
      showToast(`Welcome, ${user.displayName || user.name}! 🪔`, 'success', 'Signed in via Google');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (type) => {
    if (type === 'superuser') {
      setIdentifier('Devansh');
      setPassword('112754');
      setLoginAs('admin');
      showToast('Superuser Devansh loaded', 'info');
    } else if (type === 'admin') {
      setIdentifier('admin');
      setPassword('Admin@2026');
      setLoginAs('admin');
      showToast('Admin credentials loaded', 'info');
    } else {
      setIdentifier('priya');
      setPassword('User@2026');
      setLoginAs('user');
      showToast('Member Priya loaded', 'info');
    }
  };

  return (
    <LinearGradient colors={['#FFFBEB', '#FFF7ED', '#FED7AA']} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header with Diya & Floral Insignia */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="flower" size={46} color="#DC2626" />
            </View>
            <Text style={styles.title}>Malla Mata</Text>
            <Text style={styles.subtitle}>community & Navratri Mahotsav (11-19 Oct)</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Login Role Toggle */}
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleBtn, loginAs === 'user' && styles.toggleActive]}
                onPress={() => setLoginAs('user')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="person"
                  size={17}
                  color={loginAs === 'user' ? '#FFFFFF' : '#78350F'}
                />
                <Text style={[styles.toggleText, loginAs === 'user' && styles.toggleTextActive]}>
                  Member
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toggleBtn, loginAs === 'admin' && styles.toggleActive]}
                onPress={() => setLoginAs('admin')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={17}
                  color={loginAs === 'admin' ? '#FFFFFF' : '#78350F'}
                />
                <Text style={[styles.toggleText, loginAs === 'admin' && styles.toggleTextActive]}>
                  Admin
                </Text>
              </TouchableOpacity>
            </View>

            {/* Admin Notice or Member Subtitle */}
            {loginAs === 'admin' ? (
              <View style={styles.adminNotice}>
                <Ionicons name="shield-outline" size={16} color="#B45309" />
                <Text style={styles.adminNoticeText}>
                  Direct Committee Credentials (Devansh / Admin)
                </Text>
              </View>
            ) : (
              <View style={styles.userNotice}>
                <Text style={styles.cardTitle}>Member Sign In</Text>
                <Text style={styles.cardSubtitle}>
                  Sign in or register with mobile OTP verification
                </Text>
              </View>
            )}

            {/* Username / Email / Phone Field */}
            <Text style={styles.inputLabel}>
              {loginAs === 'admin' ? 'ADMIN USERNAME OR EMAIL' : 'EMAIL, PHONE OR USERNAME'}
            </Text>
            <View style={styles.inputGroup}>
              <Ionicons
                name={loginAs === 'admin' ? 'shield-checkmark-outline' : 'person-outline'}
                size={20}
                color="#DC2626"
                style={styles.fieldIcon}
              />
              <TextInput
                style={styles.input}
                placeholder={loginAs === 'admin' ? 'Enter Admin Username (e.g. Devansh)' : 'Enter Email, Phone or Username'}
                placeholderTextColor="#94A3B8"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
              />
            </View>

            {/* Password Field */}
            <Text style={styles.inputLabel}>PASSWORD</Text>
            <View style={styles.inputGroup}>
              <Ionicons name="lock-closed-outline" size={20} color="#DC2626" style={styles.fieldIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter password"
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

            {/* Sign In Button */}
            <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
              <LinearGradient
                colors={['#DC2626', '#EA580C']}
                style={styles.loginBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.loginBtnText}>
                  {loading ? 'Authenticating...' : loginAs === 'admin' ? 'Admin Secure Login' : 'Member Sign In'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>

            {/* ONLY FOR MEMBERS: OAuth Google Sign In & Register Link */}
            {loginAs === 'user' && (
              <>
                {/* OAuth Divider */}
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR SIGN IN WITH</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Google Sign In Button */}
                <TouchableOpacity
                  style={styles.googleBtn}
                  onPress={() => setGoogleModalVisible(true)}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-google" size={20} color="#EA4335" />
                  <View style={styles.googleBtnTextWrap}>
                    <Text style={styles.googleBtnTitle}>Continue with Google</Text>
                    <Text style={styles.googleBtnSub}>Auto Profile Pic & Details Linked</Text>
                  </View>
                </TouchableOpacity>

                {/* Register Link */}
                <View style={styles.registerRow}>
                  <Text style={styles.registerText}>New Member? </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                    <Text style={styles.registerLink}>Register & Verify OTP</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Quick Demo Credentials */}
            <View style={styles.demoSection}>
              <Text style={styles.demoTitle}>⚡ 1-TAP DEMO CREDENTIALS</Text>
              <View style={styles.pillsRow}>
                <TouchableOpacity
                  style={[styles.pill, styles.pillSuperuser]}
                  onPress={() => fillCredentials('superuser')}
                >
                  <Ionicons name="shield-checkmark" size={13} color="#B45309" />
                  <Text style={styles.pillTextSuperuser}>Devansh (Superuser)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pill, styles.pillAdmin]}
                  onPress={() => fillCredentials('admin')}
                >
                  <Ionicons name="shield-checkmark" size={13} color="#15803D" />
                  <Text style={styles.pillTextAdmin}>Admin (admin / Admin@2026)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pill, styles.pillResident]}
                  onPress={() => fillCredentials('resident')}
                >
                  <Ionicons name="person" size={13} color="#9A3412" />
                  <Text style={styles.pillTextResident}>Member (priya / User@2026)</Text>
                </TouchableOpacity>
              </View>
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
    ...(Platform.OS === 'web' ? { minHeight: '100%', height: '100%' } : {}),
  },
  container: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 18,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2.5,
    borderColor: '#FDE68A',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#991B1B',
    letterSpacing: 0.6,
  },
  subtitle: {
    fontSize: 13,
    color: '#9A3412',
    marginTop: 3,
    fontWeight: '700',
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
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
    gap: 6,
  },
  toggleActive: {
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78350F',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  adminNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  adminNoticeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  userNotice: {
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  inputLabel: {
    fontSize: 11,
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
    height: 50,
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
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 6,
    gap: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtnText: {
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
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  googleBtnTextWrap: {
    alignItems: 'flex-start',
  },
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
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  registerText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  registerLink: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },
  demoSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FEF3C7',
  },
  demoTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9A3412',
    letterSpacing: 0.8,
    marginBottom: 8,
    textAlign: 'center',
  },
  pillsRow: {
    flexDirection: 'column',
    gap: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  pillSuperuser: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  pillTextSuperuser: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  pillAdmin: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  pillTextAdmin: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  pillResident: {
    backgroundColor: '#FFEDD5',
    borderColor: '#FED7AA',
  },
  pillTextResident: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9A3412',
  },
});
