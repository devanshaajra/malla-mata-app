import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, BLOCKS } from '../utils/constants';

const BLOCK_ICONS = ['business', 'home', 'cube', 'grid', 'layers', 'apps', 'albums', 'copy'];

export default function FundCollectionScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#DC2626', '#EA580C']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fund Collection</Text>
        <View style={{ width: 32 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.introCard}>
          <Ionicons name="information-circle" size={20} color="#DC2626" />
          <Text style={styles.introText}>
            Select a residential block below to view and record contribution status for each house.
          </Text>
        </View>

        <View style={styles.grid}>
          {BLOCKS.map((block, i) => (
            <TouchableOpacity
              key={block}
              style={styles.blockCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('BlockHouses', { block })}
            >
              <LinearGradient
                colors={[COLORS.blockColors[i] || '#DC2626', (COLORS.blockColors[i] || '#EA580C') + 'E6']}
                style={styles.blockGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.iconCircle}>
                  <Ionicons name={BLOCK_ICONS[i] || 'home'} size={28} color="#FFFFFF" />
                </View>
                <Text style={styles.blockLetter}>Block {block}</Text>
                <Text style={styles.blockInfo}>12 Houses</Text>
                <View style={styles.arrowRow}>
                  <Text style={styles.tapText}>View Houses</Text>
                  <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.9)" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF7',
    height: '100%',
    maxHeight: '100%',
    overflow: 'hidden',
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
  body: { padding: 18, paddingBottom: 36, maxWidth: 440, width: '100%', alignSelf: 'center' },
  introCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  introText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  blockCard: {
    width: '48%',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  blockGradient: {
    padding: 16,
    alignItems: 'center',
    minHeight: 145,
    justifyContent: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  blockLetter: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  blockInfo: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
    fontWeight: '600',
  },
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  tapText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
