import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Platform, TextInput, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { COLORS, BLOCKS } from '../utils/constants';

export default function AnalyticsScreen({ navigation }) {
  const { isSuperuser, isAdmin } = useAuth();
  const {
    funds,
    expenses,
    sponsors,
    totalFundsCollected,
    totalSponsorFunds,
    totalExpenses,
    carryForwardBalance,
    saveCarryForwardBalance,
    netBalance,
  } = useData();
  const { showToast } = useToast();

  // Active Tab: 'ledger' | 'expenses' | 'income'
  const [activeTab, setActiveTab] = useState('ledger');

  // Superuser Carry Forward edit state
  const [isEditingCarry, setIsEditingCarry] = useState(false);
  const [carryInput, setCarryInput] = useState(carryForwardBalance?.toString() || '0');

  // Payment Channel Drilldown Modal State
  const [drilldownChannel, setDrilldownChannel] = useState(null); // 'Cash' | 'UPI / Online' | 'Cheque' | 'Other'

  const parsedCarry = parseFloat(carryForwardBalance) || 0;
  const totalIncome = parsedCarry + totalFundsCollected + totalSponsorFunds;

  const handleSaveCarryForward = async () => {
    await saveCarryForwardBalance(carryInput);
    setIsEditingCarry(false);
    showToast('Carry Forward Balance Saved! 💰', 'insert', `₹${(parseFloat(carryInput) || 0).toLocaleString('en-IN')} added from previous year`);
  };

  // ─── 1. EXPENSE LEADERBOARD (Repeated expenses summed up) ───
  const expenseMap = {};
  expenses.forEach((e) => {
    const key = (e.name || e.category || 'General Expense').trim();
    const amt = parseFloat(e.amount) || 0;
    if (!expenseMap[key]) {
      expenseMap[key] = {
        name: key,
        category: e.category || 'Festival Seva',
        totalAmount: 0,
        count: 0,
        dates: [],
        modes: [],
        incurredByList: [],
      };
    }
    expenseMap[key].totalAmount += amt;
    expenseMap[key].count += 1;
    if (e.date && !expenseMap[key].dates.includes(e.date)) expenseMap[key].dates.push(e.date);
    if (e.mode && !expenseMap[key].modes.includes(e.mode)) expenseMap[key].modes.push(e.mode);
    if (e.incurredBy && !expenseMap[key].incurredByList.includes(e.incurredBy)) {
      expenseMap[key].incurredByList.push(e.incurredBy);
    }
  });

  const expenseLeaderboard = Object.values(expenseMap).sort((a, b) => b.totalAmount - a.totalAmount);

  // ─── 2. INCOME LEADERBOARD (Top House Contributions + Sponsors) ───
  const incomeList = [];
  Object.entries(funds).forEach(([houseId, f]) => {
    const amt = parseFloat(f?.amount) || 0;
    if (amt > 0) {
      incomeList.push({
        id: `house-${houseId}`,
        type: 'House Fund',
        title: `House ${houseId}`,
        subtitle: f.residentName || `Block ${houseId.charAt(0)} Resident`,
        amount: amt,
        mode: f.mode || 'Cash',
        aartiDate: f.aartiDate || '11 Oct',
        icon: 'home',
        badgeBg: '#FEE2E2',
        badgeColor: '#DC2626',
      });
    }
  });

  sponsors.forEach((s) => {
    const amt = parseFloat(s?.amount) || 0;
    if (amt > 0) {
      incomeList.push({
        id: s.id,
        type: 'Sponsorship',
        title: s.name,
        subtitle: `${s.sponsorshipFor || 'Navratri Seva'} (House ${s.houseNumber || 'Member'})`,
        amount: amt,
        mode: 'Sponsor Pledge',
        aartiDate: 'Navratri 2026',
        icon: 'heart',
        badgeBg: '#FEF3C7',
        badgeColor: '#B45309',
      });
    }
  });

  const incomeLeaderboard = incomeList.sort((a, b) => b.amount - a.amount);

  // ─── Block-wise calculations ───
  const blockStats = BLOCKS.map((block) => {
    let count = 0;
    let sum = 0;
    for (let i = 1; i <= 12; i++) {
      const houseId = `${block}${i}`;
      const f = funds[houseId];
      if (f && f.amount) {
        count++;
        sum += parseFloat(f.amount) || 0;
      }
    }
    return { block, count, sum, percent: (count / 12) * 100 };
  });

  // ─── Payment mode calculations ───
  const modeStats = { Cash: 0, 'UPI / Online': 0, Cheque: 0, Other: 0 };
  Object.values(funds).forEach((f) => {
    const amt = parseFloat(f?.amount) || 0;
    if (f?.mode?.includes('UPI') || f?.mode?.includes('Online')) modeStats['UPI / Online'] += amt;
    else if (f?.mode === 'Cash') modeStats['Cash'] += amt;
    else if (f?.mode === 'Cheque') modeStats['Cheque'] += amt;
    else if (amt > 0) modeStats['Other'] += amt;
  });

  // ─── Payment Channel Drilldown List Sorted Block A to H ───
  const getChannelHouses = (channel) => {
    const list = [];
    Object.entries(funds).forEach(([houseId, f]) => {
      const amt = parseFloat(f?.amount) || 0;
      if (amt <= 0) return;
      let matches = false;
      if (channel === 'UPI / Online') {
        matches = f?.mode?.includes('UPI') || f?.mode?.includes('Online');
      } else if (channel === 'Cash') {
        matches = f?.mode === 'Cash';
      } else if (channel === 'Cheque') {
        matches = f?.mode === 'Cheque';
      } else {
        matches = f?.mode !== 'Cash' && !f?.mode?.includes('UPI') && !f?.mode?.includes('Online') && f?.mode !== 'Cheque';
      }

      if (matches) {
        list.push({
          houseId,
          residentName: f.residentName || 'Resident Member',
          amount: amt,
          aartiDate: f.aartiDate || '11 Oct',
          mode: f.mode,
          block: houseId.charAt(0),
        });
      }
    });

    // Sort strictly Block A to H, then unit 1 to 12
    return list.sort((a, b) => a.houseId.localeCompare(b.houseId, undefined, { numeric: true }));
  };

  const getRankBadge = (idx) => {
    if (idx === 0) return { emoji: '🥇', bg: '#FEF3C7', border: '#F59E0B', text: '#B45309' };
    if (idx === 1) return { emoji: '🥈', bg: '#F1F5F9', border: '#94A3B8', text: '#475569' };
    if (idx === 2) return { emoji: '🥉', bg: '#FFEDD5', border: '#FB923C', text: '#C2410C' };
    return { emoji: `#${idx + 1}`, bg: '#FFFBEB', border: '#FDE68A', text: '#78350F' };
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#DC2626', '#EA580C']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Festival Ledger & Accounts</Text>
        <View style={{ width: 32 }} />
      </LinearGradient>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.body} showsVerticalScrollIndicator={true}>
        {/* Main Financial Balance Card */}
        <LinearGradient
          colors={['#7F1D1D', '#991B1B', '#B91C1C']}
          style={styles.balanceCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.balanceTop}>
            <Text style={styles.balanceLabel}>NET FESTIVAL BALANCE</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>Live Ledger</Text>
            </View>
          </View>

          <Text style={styles.balanceAmount}>
            ₹{netBalance.toLocaleString('en-IN')}
          </Text>

          <View style={styles.balanceMetricsRow}>
            <View style={styles.metricItem}>
              <Ionicons name="arrow-down-circle" size={18} color="#4ADE80" />
              <View>
                <Text style={styles.metricSub}>Total Inflow</Text>
                <Text style={styles.metricVal}>₹{totalIncome.toLocaleString('en-IN')}</Text>
              </View>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Ionicons name="arrow-up-circle" size={18} color="#F87171" />
              <View>
                <Text style={styles.metricSub}>Total Expenses</Text>
                <Text style={styles.metricVal}>₹{totalExpenses.toLocaleString('en-IN')}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Superuser Carry Forward Balance Card */}
        <View style={styles.carryForwardCard}>
          <View style={styles.carryTop}>
            <View style={styles.carryLeft}>
              <Ionicons name="repeat-outline" size={20} color="#D97706" />
              <View>
                <Text style={styles.carryTitle}>Previous Year Carry Forward</Text>
                <Text style={styles.carrySub}>Opening balance from 2025 festival surplus</Text>
              </View>
            </View>
            {isSuperuser && (
              <TouchableOpacity
                style={styles.carryEditBtn}
                onPress={() => {
                  setCarryInput(carryForwardBalance?.toString() || '0');
                  setIsEditingCarry(!isEditingCarry);
                }}
              >
                <Ionicons name={isEditingCarry ? 'close' : 'create-outline'} size={16} color="#B45309" />
                <Text style={styles.carryEditText}>{isEditingCarry ? 'Cancel' : 'Edit'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {isEditingCarry ? (
            <View style={styles.carryEditRow}>
              <TextInput
                style={styles.carryInput}
                value={carryInput}
                onChangeText={setCarryInput}
                keyboardType="numeric"
                placeholder="Enter previous balance ₹"
                placeholderTextColor="#94A3B8"
              />
              <TouchableOpacity style={styles.carrySaveBtn} onPress={handleSaveCarryForward} activeOpacity={0.85}>
                <LinearGradient colors={['#D97706', '#EA580C']} style={styles.carrySaveGradient}>
                  <Text style={styles.carrySaveText}>Save</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.carryAmount}>
              ₹{parsedCarry.toLocaleString('en-IN')}
            </Text>
          )}
        </View>

        {/* 3 Quick Cards */}
        <View style={styles.cardsRow}>
          <View style={[styles.statCard, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
            <Text style={styles.statCardLabel}>House Funds</Text>
            <Text style={[styles.statCardVal, { color: '#B91C1C' }]}>
              ₹{totalFundsCollected.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.statCardSub}>{Object.keys(funds).length} Houses</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
            <Text style={styles.statCardLabel}>Sponsors</Text>
            <Text style={[styles.statCardVal, { color: '#B45309' }]}>
              ₹{totalSponsorFunds.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.statCardSub}>{sponsors.length} Sponsors</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#FFEDD5', borderColor: '#FED7AA' }]}>
            <Text style={styles.statCardLabel}>Expenses</Text>
            <Text style={[styles.statCardVal, { color: '#C2410C' }]}>
              ₹{totalExpenses.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.statCardSub}>{expenses.length} Records</Text>
          </View>
        </View>

        {/* ─── TAB SWITCHER (Ledger, Expenses Leaderboard, Income Leaderboard) ─── */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'ledger' && styles.tabBtnActive]}
            onPress={() => setActiveTab('ledger')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="book-outline"
              size={15}
              color={activeTab === 'ledger' ? '#FFFFFF' : '#78350F'}
            />
            <Text style={[styles.tabBtnText, activeTab === 'ledger' && styles.tabBtnTextActive]}>
              Ledger & Channels
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'expenses' && styles.tabBtnActive]}
            onPress={() => setActiveTab('expenses')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="receipt-outline"
              size={15}
              color={activeTab === 'expenses' ? '#FFFFFF' : '#78350F'}
            />
            <Text style={[styles.tabBtnText, activeTab === 'expenses' && styles.tabBtnTextActive]}>
              🔥 Expenses
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'income' && styles.tabBtnActive]}
            onPress={() => setActiveTab('income')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="trophy-outline"
              size={15}
              color={activeTab === 'income' ? '#FFFFFF' : '#78350F'}
            />
            <Text style={[styles.tabBtnText, activeTab === 'income' && styles.tabBtnTextActive]}>
              🏆 Income
            </Text>
          </TouchableOpacity>
        </View>

        {/* ─── 1. LEDGER & PAYMENT CHANNELS TAB ─── */}
        {activeTab === 'ledger' && (
          <View>
            {/* Payment Channels with Drilldown */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>Payment Channels</Text>
                  <Text style={styles.sectionSub}>Tap any channel to view Block A to H houses</Text>
                </View>
                <View style={styles.pillTag}>
                  <Text style={styles.pillTagText}>Clickable</Text>
                </View>
              </View>

              <View style={styles.modeList}>
                {Object.entries(modeStats).map(([channelName, val]) => (
                  <TouchableOpacity
                    key={channelName}
                    style={styles.modeRow}
                    onPress={() => setDrilldownChannel(channelName)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.modeLeft}>
                      <View style={styles.modeIconCircle}>
                        <Ionicons
                          name={
                            channelName === 'UPI / Online'
                              ? 'qr-code-outline'
                              : channelName === 'Cash'
                              ? 'cash-outline'
                              : channelName === 'Cheque'
                              ? 'document-text-outline'
                              : 'wallet-outline'
                          }
                          size={18}
                          color="#DC2626"
                        />
                      </View>
                      <View>
                        <Text style={styles.modeName}>{channelName}</Text>
                        <Text style={styles.modeSubText}>
                          {getChannelHouses(channelName).length} Houses Paid
                        </Text>
                      </View>
                    </View>
                    <View style={styles.modeRight}>
                      <Text style={styles.modeVal}>₹{val.toLocaleString('en-IN')}</Text>
                      <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Block-wise Collection Progress Grid */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>Block-wise Collection</Text>
                  <Text style={styles.sectionSub}>8 Festival Blocks (Tap block to view houses)</Text>
                </View>
                <View style={[styles.pillTag, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                  <Text style={[styles.pillTagText, { color: '#059669' }]}>Tap to View</Text>
                </View>
              </View>

              <View style={styles.blockGrid}>
                {blockStats.map((b, idx) => (
                  <TouchableOpacity
                    key={b.block}
                    style={styles.blockStatItem}
                    onPress={() => navigation.navigate('BlockHouses', { block: b.block })}
                    activeOpacity={0.8}
                  >
                    <View style={styles.blockStatHeader}>
                      <Text style={styles.blockStatTitle}>Block {b.block}</Text>
                      <Text style={styles.blockStatPaid}>{b.count}/12</Text>
                    </View>
                    <Text style={styles.blockStatSum}>₹{b.sum.toLocaleString('en-IN')}</Text>
                    <View style={styles.blockMiniBar}>
                      <View
                        style={[
                          styles.blockMiniFill,
                          { width: `${b.percent}%`, backgroundColor: COLORS.blockColors[idx] || '#DC2626' },
                        ]}
                      />
                    </View>
                    <View style={styles.blockTapHint}>
                      <Text style={styles.blockTapHintText}>View 12 Units</Text>
                      <Ionicons name="arrow-forward" size={11} color="#EA580C" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ─── 2. EXPENSES LEADERBOARD TAB ─── */}
        {activeTab === 'expenses' && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Expenses Leaderboard</Text>
            <Text style={styles.sectionSub}>Ranked by highest summed expense items</Text>

            <View style={styles.sumNotice}>
              <Ionicons name="git-merge-outline" size={16} color="#DC2626" />
              <Text style={styles.sumNoticeText}>
                Repeated expenses with the same title are automatically aggregated together.
              </Text>
            </View>

            {expenseLeaderboard.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={40} color="#94A3B8" />
                <Text style={styles.emptyStateText}>No expense records found</Text>
              </View>
            ) : (
              expenseLeaderboard.map((item, idx) => {
                const rank = getRankBadge(idx);
                const percent = totalExpenses > 0 ? (item.totalAmount / totalExpenses) * 100 : 0;

                return (
                  <View key={item.name + idx} style={styles.leaderCard}>
                    <View style={styles.leaderCardTop}>
                      <View style={[styles.rankBadge, { backgroundColor: rank.bg, borderColor: rank.border }]}>
                        <Text style={[styles.rankText, { color: rank.text }]}>{rank.emoji}</Text>
                      </View>

                      <View style={styles.leaderInfo}>
                        <View style={styles.nameRow}>
                          <Text style={styles.leaderName} numberOfLines={1}>{item.name}</Text>
                          <Text style={styles.leaderAmount}>
                            ₹{item.totalAmount.toLocaleString('en-IN')}
                          </Text>
                        </View>

                        <View style={styles.leaderMetaRow}>
                          <View style={styles.catTag}>
                            <Text style={styles.catTagText}>{item.category}</Text>
                          </View>

                          {item.count > 1 ? (
                            <View style={styles.mergedPill}>
                              <Ionicons name="layers-outline" size={11} color="#C2410C" />
                              <Text style={styles.mergedPillText}>
                                {item.count} entries combined
                              </Text>
                            </View>
                          ) : (
                            <Text style={styles.singleEntryText}>Single entry</Text>
                          )}

                          <Text style={styles.percentShareText}>{percent.toFixed(1)}% of total</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.rankProgressBarBg}>
                      <View
                        style={[
                          styles.rankProgressBarFill,
                          {
                            width: `${Math.min(percent, 100)}%`,
                            backgroundColor: idx === 0 ? '#DC2626' : idx === 1 ? '#EA580C' : '#F59E0B',
                          },
                        ]}
                      />
                    </View>

                    {item.incurredByList.length > 0 && (
                      <Text style={styles.incurredSummary}>
                        Incurred by: {item.incurredByList.join(', ')}
                      </Text>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ─── 3. INCOME LEADERBOARD TAB ─── */}
        {activeTab === 'income' && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Income & Member Leaderboard</Text>
            <Text style={styles.sectionSub}>Honoring highest contributing houses and sponsors</Text>

            {incomeLeaderboard.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="cash-outline" size={40} color="#94A3B8" />
                <Text style={styles.emptyStateText}>No contributions recorded yet</Text>
              </View>
            ) : (
              incomeLeaderboard.map((item, idx) => {
                const rank = getRankBadge(idx);
                const percent = totalIncome > 0 ? (item.amount / totalIncome) * 100 : 0;

                return (
                  <View key={item.id + idx} style={styles.leaderCard}>
                    <View style={styles.leaderCardTop}>
                      <View style={[styles.rankBadge, { backgroundColor: rank.bg, borderColor: rank.border }]}>
                        <Text style={[styles.rankText, { color: rank.text }]}>{rank.emoji}</Text>
                      </View>

                      <View style={styles.leaderInfo}>
                        <View style={styles.nameRow}>
                          <Text style={styles.leaderName} numberOfLines={1}>{item.title}</Text>
                          <Text style={[styles.leaderAmount, { color: '#15803D' }]}>
                            ₹{item.amount.toLocaleString('en-IN')}
                          </Text>
                        </View>

                        <Text style={styles.incomeSubtitle}>{item.subtitle}</Text>

                        <View style={styles.leaderMetaRow}>
                          <View style={[styles.catTag, { backgroundColor: item.badgeBg }]}>
                            <Text style={[styles.catTagText, { color: item.badgeColor }]}>
                              {item.type}
                            </Text>
                          </View>

                          <Text style={styles.modeMetaText}>{item.mode}</Text>
                          <Text style={styles.percentShareText}>{percent.toFixed(1)}% of pool</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.rankProgressBarBg}>
                      <View
                        style={[
                          styles.rankProgressBarFill,
                          {
                            width: `${Math.min(percent, 100)}%`,
                            backgroundColor: idx === 0 ? '#16A34A' : idx === 1 ? '#059669' : '#D97706',
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* ─── PAYMENT CHANNEL DRILLDOWN MODAL (Sorted Block A to H) ─── */}
      <Modal
        visible={drilldownChannel !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setDrilldownChannel(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <View style={styles.modalTitleRow}>
                  <Ionicons
                    name={
                      drilldownChannel === 'UPI / Online'
                        ? 'qr-code-outline'
                        : drilldownChannel === 'Cash'
                        ? 'cash-outline'
                        : 'wallet-outline'
                    }
                    size={22}
                    color="#DC2626"
                  />
                  <Text style={styles.modalTitle}>{drilldownChannel} Contributions</Text>
                </View>
                <Text style={styles.modalSubtitle}>
                  Sorted Block A to Block H • {drilldownChannel ? getChannelHouses(drilldownChannel).length : 0} Houses
                </Text>
              </View>
              <TouchableOpacity onPress={() => setDrilldownChannel(null)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.drilldownList} showsVerticalScrollIndicator={false}>
              {drilldownChannel && getChannelHouses(drilldownChannel).length === 0 ? (
                <View style={styles.emptyDrilldown}>
                  <Ionicons name="file-tray-outline" size={44} color="#94A3B8" />
                  <Text style={styles.emptyDrilldownText}>
                    No houses have paid via {drilldownChannel} yet.
                  </Text>
                </View>
              ) : (
                drilldownChannel &&
                getChannelHouses(drilldownChannel).map((item) => (
                  <View key={item.houseId} style={styles.drilldownItem}>
                    <View style={styles.drilldownHouseBadge}>
                      <Text style={styles.drilldownHouseText}>{item.houseId}</Text>
                    </View>

                    <View style={styles.drilldownInfo}>
                      <Text style={styles.drilldownResident}>{item.residentName}</Text>
                      <View style={styles.drilldownMetaRow}>
                        <View style={styles.aartiDatePill}>
                          <Text style={styles.aartiDatePillText}>🪔 {item.aartiDate}</Text>
                        </View>
                        <Text style={styles.drilldownBlockText}>Block {item.block}</Text>
                      </View>
                    </View>

                    <Text style={styles.drilldownAmount}>
                      ₹{item.amount.toLocaleString('en-IN')}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.drilldownDoneBtn}
              onPress={() => setDrilldownChannel(null)}
              activeOpacity={0.85}
            >
              <Text style={styles.drilldownDoneText}>Close</Text>
            </TouchableOpacity>
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
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  body: {
    padding: 18,
    paddingBottom: 40,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  balanceCard: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 14,
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  balanceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FEF3C7',
    letterSpacing: 0.6,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  balanceAmount: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 6,
    letterSpacing: 0.3,
  },
  balanceMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  metricItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 10,
  },
  metricSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  metricVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 1,
  },

  // Carry Forward Card
  carryForwardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  carryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  carryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  carryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  carrySub: {
    fontSize: 11,
    color: '#78350F',
    fontWeight: '500',
    marginTop: 1,
  },
  carryEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  carryEditText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  carryAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: '#D97706',
    marginTop: 8,
  },
  carryEditRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  carryInput: {
    flex: 1,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#FDE68A',
    height: 42,
  },
  carrySaveBtn: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  carrySaveGradient: {
    paddingHorizontal: 16,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carrySaveText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  cardsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
  statCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  statCardVal: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 4,
  },
  statCardSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '600',
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 11,
    gap: 4,
  },
  tabBtnActive: {
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78350F',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  sectionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  pillTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pillTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  modeList: {
    gap: 8,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFDF7',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  modeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  modeSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '500',
  },
  modeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#DC2626',
  },
  blockGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 6,
  },
  blockStatItem: {
    width: '48%',
    backgroundColor: '#FFFDF7',
    borderRadius: 14,
    padding: 11,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  blockStatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  blockStatTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1E293B',
  },
  blockStatPaid: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  blockStatSum: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#78350F',
    marginTop: 3,
  },
  blockMiniBar: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 6,
  },
  blockMiniFill: {
    height: '100%',
    borderRadius: 2,
  },
  blockTapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
    marginTop: 6,
  },
  blockTapHintText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#EA580C',
  },

  // Leaderboard styles
  sumNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF1F2',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECDD3',
    marginVertical: 10,
  },
  sumNoticeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9F1239',
    flex: 1,
    lineHeight: 15,
  },
  leaderCard: {
    backgroundColor: '#FFFDF7',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 10,
  },
  leaderCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  rankBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  rankText: {
    fontSize: 16,
    fontWeight: '900',
  },
  leaderInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leaderName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1E293B',
    flex: 1,
    marginRight: 6,
  },
  leaderAmount: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#DC2626',
  },
  incomeSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '500',
  },
  leaderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
    flexWrap: 'wrap',
  },
  catTag: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  catTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#991B1B',
  },
  mergedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  mergedPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C2410C',
  },
  singleEntryText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
  modeMetaText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  percentShareText: {
    fontSize: 10,
    color: '#78350F',
    fontWeight: '700',
    marginLeft: 'auto',
  },
  rankProgressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 8,
  },
  rankProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  incurredSummary: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 6,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 8,
    fontWeight: '600',
  },

  // Modal styles for drilldown
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: '#FEF3C7',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: '#EA580C',
    fontWeight: '700',
    marginTop: 3,
  },
  modalCloseBtn: {
    padding: 2,
  },
  drilldownList: {
    marginVertical: 12,
  },
  emptyDrilldown: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyDrilldownText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: 'center',
  },
  drilldownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF7',
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 10,
  },
  drilldownHouseBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drilldownHouseText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  drilldownInfo: {
    flex: 1,
  },
  drilldownResident: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  drilldownMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  aartiDatePill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  aartiDatePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  drilldownBlockText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  drilldownAmount: {
    fontSize: 15,
    fontWeight: '900',
    color: '#059669',
  },
  drilldownDoneBtn: {
    backgroundColor: '#EA580C',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  drilldownDoneText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
