import React, { createContext, useContext, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Platform, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-40)).current;
  const timeoutRef = useRef(null);

  const showToast = (message, type = 'success', subtitle = '') => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setToast({ message, type, subtitle });

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 80,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    timeoutRef.current = setTimeout(() => {
      hideToast();
    }, 3200);
  };

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(translateY, {
        toValue: -40,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      setToast(null);
    });
  };

  const getNotificationTheme = () => {
    const rawType = toast?.type?.toLowerCase() || '';
    const msg = (toast?.message || '').toLowerCase();

    // Auto classify if generic or matching keywords
    let category = 'success';
    if (rawType === 'error' || rawType === 'danger' || msg.includes('fail') || msg.includes('error') || msg.includes('deleted') || msg.includes('cannot') || msg.includes('unable')) {
      category = 'red';
    } else if (rawType === 'warning' || rawType === 'alert' || msg.includes('warning') || msg.includes('required') || msg.includes('already') || msg.includes('missing')) {
      category = 'yellow';
    } else if (rawType === 'info' || rawType === 'blue') {
      category = 'blue';
    } else {
      category = 'green';
    }

    switch (category) {
      case 'red':
        return {
          name: 'alert-circle',
          cardBg: '#FEF2F2',
          border: '#EF4444',
          iconColor: '#DC2626',
          iconBg: '#FEE2E2',
          titleColor: '#991B1B',
          subtitleColor: '#B91C1C',
        };
      case 'yellow':
        return {
          name: 'warning',
          cardBg: '#FFFBEB',
          border: '#F59E0B',
          iconColor: '#D97706',
          iconBg: '#FEF3C7',
          titleColor: '#92400E',
          subtitleColor: '#B45309',
        };
      case 'blue':
        return {
          name: 'information-circle',
          cardBg: '#EFF6FF',
          border: '#3B82F6',
          iconColor: '#2563EB',
          iconBg: '#DBEAFE',
          titleColor: '#1E40AF',
          subtitleColor: '#2563EB',
        };
      case 'green':
      default:
        return {
          name: 'checkmark-circle',
          cardBg: '#F0FDF4',
          border: '#22C55E',
          iconColor: '#16A34A',
          iconBg: '#DCFCE7',
          titleColor: '#166534',
          subtitleColor: '#15803D',
        };
    }
  };

  const theme = getNotificationTheme();

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY }],
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.toastCard,
              { backgroundColor: theme.cardBg, borderColor: theme.border },
            ]}
            onPress={hideToast}
            activeOpacity={0.9}
          >
            <View style={[styles.iconCircle, { backgroundColor: theme.iconBg }]}>
              <Ionicons name={theme.name} size={22} color={theme.iconColor} />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.toastTitle, { color: theme.titleColor }]}>{toast.message}</Text>
              {toast.subtitle ? (
                <Text style={[styles.toastSubtitle, { color: theme.subtitleColor }]}>{toast.subtitle}</Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={hideToast} style={styles.closeBtn}>
              <Ionicons name="close" size={16} color={theme.titleColor} />
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: (msg) => console.log('Toast:', msg),
      hideToast: () => {},
    };
  }
  return ctx;
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 24 : 54,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 999999,
    elevation: 999999,
    pointerEvents: 'box-none',
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
    maxWidth: 420,
    width: '100%',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    lineHeight: 18,
  },
  toastSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
});
