import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useData } from '../contexts/DataContext';
import { COLORS, getHouseNumbers } from '../utils/constants';

export default function BlockHousesScreen({ route, navigation }) {
  const { block } = route.params;
  const { getFund } = useData();
  const houses = getHouseNumbers(block);
  const blockIdx = block.charCodeAt(0) - 65;
  const color = COLORS.blockColors[blockIdx] || COLORS.primary;

  const paidHouses = houses.filter(h => {
    const f = getFund(h);
    return f && f.amount;
  });

  const blockTotalAmount = houses.reduce((sum, h) => {
    const f = getFund(h);
    return sum + (parseFloat(f?.amount) || 0);
  }, 0);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[color, color + 'E6']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Block {block} Houses</Text>
          <Text style={styles.headerSub}>Total Collection: ₹{blockTotalAmount.toLocaleString('en-IN')}</Text>
        </View>
        <View style={{ width: 32 }} />
      </LinearGradient>

      {/* Progress Card */}
      <View style={styles.progressCard}>
        <View style={styles.progressInfo}>
          <View>
            <Text style={styles.progressTitle}>Block {block} Collection Progress</Text>
            <Text style={styles.progressSub}>12 Residential Member Units</Text>
          </View>
          <Text style={[styles.progressCount, { color }]}>
            {paidHouses.length} / 12 Paid
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(paidHouses.length / 12) * 100}%`, backgroundColor: color }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Tap any house to record, view, or reset contribution & Aarti date</Text>

        <View style={styles.grid}>
          {houses.map((house) => {
            const fund = getFund(house);
            const hasFund = fund && fund.amount;
            const aartiDate = fund?.aartiDate;

            return (
              <TouchableOpacity
                key={house}
                style={[styles.houseCard, hasFund && styles.houseCardPaid]}
                activeOpacity={0.75}
                onPress={() => navigation.navigate('HouseDetail', { houseId: house, block })}
              >
                {hasFund ? (
                  <View style={styles.paidBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                  </View>
                ) : (
                  <View style={styles.unpaidBadge}>
                    <Ionicons name="ellipse-outline" size={14} color="#94A3B8" />
                  </View>
                )}

                <Ionicons
                  name="home"
                  size={26}
                  color={hasFund ? '#16A34A' : color}
                  style={styles.homeIcon}
                />
                <Text style={[styles.houseLabel, hasFund && styles.houseLabelPaid]}>
                  {house}
                </Text>

                {hasFund ? (
                  <View style={styles.paidDetails}>
                    <Text style={styles.amountText}>₹{Number(fund.amount).toLocaleString('en-IN')}</Text>
                    {aartiDate ? (
                      <View style={styles.aartiDatePill}>
                        <Ionicons name="flame" size={10} color="#B45309" />
                        <Text style={styles.aartiDatePillText}>
                          {aartiDate.substring(0, 5)}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.aartiPendingText}>Aarti TBD</Text>
                    )}
                  </View>
                ) : (
                  <Text style={styles.pendingText}>Pending</Text>
                )}
              </TouchableOpacity>
            );
          })}
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
  headerTitleWrap: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.9)', marginTop: 2, fontWeight: '600' },
  progressCard: {
    backgroundColor: '#FFFFFF',
    margin: 18,
    marginBottom: 8,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    maxWidth: 440,
    width: 'auto',
    alignSelf: 'stretch',
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  progressSub: { fontSize: 11, color: '#64748B', marginTop: 1, fontWeight: '500' },
  progressCount: { fontSize: 13, fontWeight: '800' },
  progressBar: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  body: { padding: 18, paddingBottom: 36, maxWidth: 440, width: '100%', alignSelf: 'center' },
  subtitle: { fontSize: 12, color: '#64748B', marginBottom: 14, fontWeight: '600' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  houseCard: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 116,
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
  },
  houseCardPaid: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  paidBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
  },
  unpaidBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
  },
  homeIcon: {
    marginTop: 2,
  },
  houseLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 3,
  },
  houseLabelPaid: {
    color: '#166534',
  },
  paidDetails: {
    alignItems: 'center',
    marginTop: 2,
  },
  amountText: {
    fontSize: 11.5,
    color: '#16A34A',
    fontWeight: '800',
  },
  aartiDatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  aartiDatePillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#92400E',
  },
  aartiPendingText: {
    fontSize: 9.5,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '500',
  },
  pendingText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 4,
  },
});
