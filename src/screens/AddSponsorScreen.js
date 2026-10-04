import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { COLORS } from '../utils/constants';

export default function AddSponsorScreen({ navigation }) {
  const { addSponsor } = useData();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [sponsorshipFor, setSponsorshipFor] = useState('');
  const [amount, setAmount] = useState('');

  const handleAdd = async () => {
    if (!name.trim() || !sponsorshipFor.trim() || !amount.trim()) {
      showToast('Please fill all required fields', 'warning');
      return;
    }
    await addSponsor({
      name: name.trim(),
      houseNumber: houseNumber.trim() || 'General Sponsor',
      sponsorshipFor: sponsorshipFor.trim(),
      amount: amount.trim(),
    });
    showToast('Sponsor Added! 💖', 'success', `₹${amount} by ${name} (${sponsorshipFor})`);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#EA580C', '#F59E0B']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Sponsor</Text>
        <View style={{ width: 32 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>New Sponsor Details</Text>

          {[
            { label: 'SPONSOR / MEMBER NAME *', icon: 'person-outline', value: name, setter: setName, ph: 'e.g. Ramesh Shah & Family' },
            { label: 'HOUSE NUMBER', icon: 'home-outline', value: houseNumber, setter: setHouseNumber, ph: 'e.g. A-4 or Outside Donor' },
            { label: 'SPONSORSHIP ITEM / SEVA *', icon: 'heart-outline', value: sponsorshipFor, setter: setSponsorshipFor, ph: 'e.g. Day 1 Flower Decoration & Toran' },
            { label: 'PLEDGE AMOUNT (₹) *', icon: 'cash-outline', value: amount, setter: setAmount, ph: 'e.g. 15000', kb: 'numeric' },
          ].map((f, i) => (
            <View key={i} style={styles.fieldGroup}>
              <Text style={styles.label}>{f.label}</Text>
              <View style={styles.inputRow}>
                <Ionicons name={f.icon} size={20} color="#EA580C" style={styles.fieldIcon} />
                <TextInput
                  style={styles.input}
                  value={f.value}
                  onChangeText={f.setter}
                  placeholder={f.ph}
                  placeholderTextColor="#94A3B8"
                  keyboardType={f.kb || 'default'}
                />
              </View>
            </View>
          ))}

          <TouchableOpacity onPress={handleAdd} activeOpacity={0.85}>
            <LinearGradient
              colors={['#EA580C', '#F59E0B']}
              style={styles.addBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="heart" size={20} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Record Sponsorship</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  body: { padding: 20, maxWidth: 440, width: '100%', alignSelf: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 18,
  },
  fieldGroup: { marginBottom: 16 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78350F',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    borderWidth: 1,
    borderColor: '#FDE68A',
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 10,
    gap: 8,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
});
