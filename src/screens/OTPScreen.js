import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { COLORS } from '../utils/constants';

export default function OTPScreen({ route, navigation }) {
  const { verifyOTP } = useAuth();
  const { showToast } = useToast();
  const { userId, phone } = route.params;
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(t => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      showToast('Please enter all 6 digits', 'warning');
      return;
    }
    setLoading(true);
    try {
      await verifyOTP(userId);
      showToast('Account Verified! 🎉', 'success', 'Welcome to Malla Mata');
      navigation.navigate('Login');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setTimer(30);
    showToast('New OTP Sent 📲', 'info', `Verification code resent to ${phone}`);
  };

  return (
    <LinearGradient colors={['#FFFBEB', '#FFF7ED', '#FED7AA']} style={styles.gradient}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#991B1B" />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={44} color="#DC2626" />
          </View>
          <Text style={styles.title}>Verify Mobile OTP</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit OTP code sent to{'\n'}
            <Text style={styles.phoneText}>{phone}</Text>
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.otpRow}>
            {otp.map((digit, i) => (
              <TextInput
                key={i}
                ref={ref => (inputRefs.current[i] = ref)}
                style={[styles.otpInput, digit ? styles.otpFilled : null]}
                value={digit}
                onChangeText={text => handleChange(text, i)}
                onKeyPress={e => handleKeyPress(e, i)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          <TouchableOpacity onPress={handleVerify} disabled={loading} activeOpacity={0.85}>
            <LinearGradient
              colors={['#DC2626', '#EA580C']}
              style={styles.verifyBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.verifyBtnText}>
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </Text>
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.resendRow}>
            {timer > 0 ? (
              <Text style={styles.timerText}>Resend code in {timer}s</Text>
            ) : (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendLink}>Resend OTP Code</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.hintBox}>
            <Ionicons name="information-circle" size={18} color="#D97706" />
            <Text style={styles.hintText}>For quick demo: Enter any 6 digits (e.g. 1 2 3 4 5 6)</Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    ...(Platform.OS === 'web' ? { minHeight: '100%', height: '100%' } : {}),
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: 48,
    left: 24,
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FDE68A',
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
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
  },
  subtitle: {
    fontSize: 14,
    color: '#9A3412',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
  phoneText: {
    fontWeight: '800',
    color: '#1E293B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  otpInput: {
    width: 44,
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FDE68A',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    backgroundColor: '#FFFBEB',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  otpFilled: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  verifyBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 18,
  },
  timerText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  hintText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
    fontWeight: '600',
  },
});
