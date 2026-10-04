import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList,
  Modal, ScrollView, Platform, Alert, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { AARTI_DATES } from '../utils/constants';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

export default function VotingPollsScreen({ navigation }) {
  const { currentUser, isSuperuser, isAdmin: rawIsAdmin, hasControl } = useAuth();
  const isAdmin = isSuperuser || (rawIsAdmin && (hasControl ? hasControl('managePolls') : true));
  const { polls, addPoll, voteInPoll, updatePoll, deletePoll } = useData();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'closed' | 'all'
  const [searchQuery, setSearchQuery] = useState('');

  // Delete Modal State
  const [pollToDelete, setPollToDelete] = useState(null);

  // Create / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingPoll, setEditingPoll] = useState(null);
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [selectedDuration, setSelectedDuration] = useState('3days'); // '24h' | '3days' | 'aarti' | 'festival' | 'custom'
  const [customEndDate, setCustomEndDate] = useState('12-10-2026');
  const [customEndTime, setCustomEndTime] = useState('20:00'); // 8:00 PM Aarti time

  const canManagePolls = isSuperuser || isAdmin;
  const currentUserId = currentUser?.id || currentUser?.username;

  // Filter polls
  const now = Date.now();
  const filteredPolls = (polls || []).filter(poll => {
    if (!poll) return false;
    const isExpired = poll.endsAt && now > new Date(poll.endsAt).getTime();
    const isClosed = poll.status === 'closed' || isExpired;
    const q = (searchQuery || '').toLowerCase();

    const matchesSearch =
      (poll.question || '').toLowerCase().includes(q) ||
      (poll.description || '').toLowerCase().includes(q) ||
      (poll.createdBy?.name || '').toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (activeTab === 'active') return !isClosed;
    if (activeTab === 'closed') return isClosed;
    return true; // 'all'
  });

  // Calculate remaining time string
  const getTimeRemainingText = (poll) => {
    if (poll.status === 'closed') return 'Closed by Admin';
    if (!poll.endsAt) return 'Open Indefinitely';
    const endMs = new Date(poll.endsAt).getTime();
    const diff = endMs - now;
    if (diff <= 0) return 'Voting Ended';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;

    if (days > 0) {
      return `Ends in ${days}d ${remHours}h`;
    }
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `Ends in ${hours}h ${minutes}m`;
  };

  // Open Create Poll Modal
  const handleOpenCreateModal = () => {
    setEditingPoll(null);
    setQuestion('');
    setDescription('');
    setOptions(['', '']);
    setSelectedDuration('3days');
    setCustomEndDate('12-10-2026');
    setCustomEndTime('20:00');
    setShowModal(true);
  };

  // Open Edit Poll Modal
  const handleOpenEditModal = (poll) => {
    setEditingPoll(poll);
    setQuestion(poll.question);
    setDescription(poll.description || '');
    setOptions((poll.options || []).map(o => o?.text || ''));
    setSelectedDuration('custom');
    if (poll.endsAt) {
      const d = new Date(poll.endsAt);
      const dayStr = `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
      setCustomEndDate(dayStr);
      setCustomEndTime('20:00');
    }
    setShowModal(true);
  };

  // Handle Option inputs in modal
  const handleOptionChange = (text, index) => {
    const updated = [...options];
    updated[index] = text;
    setOptions(updated);
  };

  const handleAddOption = () => {
    if (options.length >= 6) {
      showToast('Maximum 6 options allowed', 'warning');
      return;
    }
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 2) {
      showToast('At least 2 options required', 'warning');
      return;
    }
    setOptions(options.filter((_, idx) => idx !== index));
  };

  // Delete Poll Handlers
  const handleDeletePoll = (poll) => {
    if (!canManagePolls) {
      showToast('Admin Only 🔒', 'warning', 'Only Admins and Superuser can delete polls.');
      return;
    }
    setPollToDelete(poll);
  };

  const handleConfirmDelete = async () => {
    if (!pollToDelete) return;
    try {
      const res = await deletePoll(pollToDelete.id, currentUser);
      if (res?.success) {
        showToast('Poll Deleted 🗑️', 'delete', `Removed: "${pollToDelete.question}"`);
      } else {
        showToast(res?.error || 'Failed to delete poll', 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setPollToDelete(null);
    }
  };

  // Compute calculated end date based on duration
  const computeEndsAtISO = () => {
    const d = new Date();
    if (selectedDuration === '24h') {
      d.setTime(d.getTime() + 24 * 60 * 60 * 1000);
      return d.toISOString();
    }
    if (selectedDuration === '3days') {
      d.setTime(d.getTime() + 3 * 24 * 60 * 60 * 1000);
      return d.toISOString();
    }
    if (selectedDuration === 'aarti') {
      // Set to 8:00 PM today or tomorrow
      d.setHours(20, 0, 0, 0);
      if (d.getTime() <= Date.now()) {
        d.setDate(d.getDate() + 1);
      }
      return d.toISOString();
    }
    if (selectedDuration === 'festival') {
      // 19 Oct 2026, 23:59 (Samapan / Dussehra)
      return new Date(2026, 9, 19, 23, 59, 59).toISOString();
    }
    // Custom date
    const [dd, mm, yyyy] = customEndDate.split('-');
    const [hh, min] = customEndTime.split(':');
    const customD = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10), parseInt(hh, 10), parseInt(min, 10));
    return customD.toISOString();
  };

  // Save / Publish Poll
  const handleSavePoll = async () => {
    if (!question.trim()) {
      showToast('Please enter the poll question', 'warning');
      return;
    }

    const cleanOptions = options.map(o => o.trim()).filter(o => o.length > 0);
    if (cleanOptions.length < 2) {
      showToast('Please provide at least 2 valid options', 'warning');
      return;
    }

    const endsAt = computeEndsAtISO();

    if (editingPoll) {
      const res = await updatePoll(
        editingPoll.id,
        {
          question: question.trim(),
          description: description.trim(),
          endsAt,
        },
        currentUser
      );
      if (res?.success) {
        showToast('Poll Updated! 🗳️', 'success', 'Timings and question saved.');
        setShowModal(false);
      } else {
        showToast(res?.error || 'Failed to update poll', 'error');
      }
    } else {
      const res = await addPoll(
        {
          question: question.trim(),
          description: description.trim(),
          options: cleanOptions,
          startsAt: new Date().toISOString(),
          endsAt,
          endsAtDisplay: selectedDuration === 'aarti' ? '8:00 PM Aarti' : 'Scheduled Deadline',
        },
        currentUser
      );
      if (res?.success) {
        showToast('Voting Poll Live! 🎉', 'success', 'Announcement broadcasted to members.');
        setShowModal(false);
      } else {
        showToast(res?.error || 'Failed to publish poll', 'error');
      }
    }
  };

  // Cast vote
  const handleVote = async (poll, option) => {
    const isExpired = poll.endsAt && now > new Date(poll.endsAt).getTime();
    if (poll.status === 'closed' || isExpired) {
      showToast('Poll Closed 🔒', 'warning', 'Voting has ended for this decision.');
      return;
    }

    const isCurrentVoted = (option.voterIds || []).includes(currentUserId);
    if (isCurrentVoted) {
      showToast('Already Voted', 'info', `Your vote is currently set to "${option.text}"`);
      return;
    }

    const res = await voteInPoll(poll.id, option.id, currentUser);
    if (res?.success) {
      showToast('Vote Recorded! 🗳️', 'success', `You voted for: ${option.text}`);
    } else {
      showToast(res?.error || 'Could not record vote', 'error');
    }
  };

  // Toggle close / reopen poll
  const handleTogglePollStatus = async (poll) => {
    const newStatus = poll.status === 'closed' ? 'active' : 'closed';
    const res = await updatePoll(poll.id, { status: newStatus }, currentUser);
    if (res?.success) {
      showToast(
        newStatus === 'closed' ? 'Poll Locked 🔒' : 'Poll Reopened 🟢',
        'info',
        poll.question
      );
    }
  };


  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#4C1D95', '#6D28D9', '#7C3AED']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go Back"
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>🗳️ Voting Polls</Text>
            <Text style={styles.headerSub}>Democracy in Seva • Decide Together</Text>
          </View>
          {canManagePolls && (
            <TouchableOpacity
              style={styles.createBtn}
              onPress={handleOpenCreateModal}
              accessibilityLabel="Create Poll"
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.createBtnText}>New Poll</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Role Privileges Banner */}
        <View style={styles.roleBanner}>
          <Ionicons
            name={isSuperuser ? 'shield-checkmark' : isAdmin ? 'key' : 'people'}
            size={16}
            color="#DDD6FE"
          />
          <Text style={styles.roleBannerText}>
            {isSuperuser
              ? 'Superuser: Full control to create, set timings, close & delete polls.'
              : isAdmin
              ? 'Admin: You can create, set poll timings, close & cast votes.'
              : 'Member: Cast your vote on active polls & shape community decisions.'}
          </Text>
        </View>
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'active' && styles.tabBtnActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Active ({polls.filter(p => p.status !== 'closed' && (!p.endsAt || now <= new Date(p.endsAt).getTime())).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'closed' && styles.tabBtnActive]}
          onPress={() => setActiveTab('closed')}
        >
          <Text style={[styles.tabText, activeTab === 'closed' && styles.tabTextActive]}>
            Closed ({polls.filter(p => p.status === 'closed' || (p.endsAt && now > new Date(p.endsAt).getTime())).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'all' && styles.tabBtnActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All ({polls.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#6D28D9" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search voting polls..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Polls List */}
      <FlatList
        data={filteredPolls}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="stats-chart-outline" size={54} color="#C4B5FD" />
            <Text style={styles.emptyTitle}>No Voting Polls Found</Text>
            <Text style={styles.emptySub}>
              {canManagePolls
                ? 'Tap "New Poll" above to create a decision poll with custom timings.'
                : 'Active polls posted by admins will appear here for voting.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isExpired = item.endsAt && now > new Date(item.endsAt).getTime();
          const isClosed = item.status === 'closed' || isExpired;
          const userVoted = (item.voters || []).includes(currentUserId);
          const totalVotes = item.totalVotes || 1;

          return (
            <View style={[styles.pollCard, isClosed && styles.pollCardClosed]}>
              {/* Poll Header */}
              <View style={styles.pollHeader}>
                <View style={styles.pollStatusBadgeWrap}>
                  <View style={[styles.statusBadge, isClosed ? styles.statusBadgeClosed : styles.statusBadgeActive]}>
                    <View style={[styles.statusDot, isClosed ? styles.statusDotClosed : styles.statusDotActive]} />
                    <Text style={[styles.statusBadgeText, isClosed ? styles.statusBadgeTextClosed : styles.statusBadgeTextActive]}>
                      {isClosed ? 'Closed' : 'Active'}
                    </Text>
                  </View>
                  <View style={styles.timingBadge}>
                    <Ionicons name="time-outline" size={13} color="#6D28D9" />
                    <Text style={styles.timingBadgeText}>{getTimeRemainingText(item)}</Text>
                  </View>
                </View>

                {/* Superuser / Admin Menu Actions */}
                {canManagePolls && (
                  <View style={styles.adminActionsRow}>
                    <TouchableOpacity
                      style={styles.adminIconBtn}
                      onPress={() => handleTogglePollStatus(item)}
                      accessibilityLabel="Toggle Lock"
                    >
                      <Ionicons
                        name={item.status === 'closed' ? 'lock-open-outline' : 'lock-closed-outline'}
                        size={17}
                        color="#6D28D9"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.adminIconBtn}
                      onPress={() => handleOpenEditModal(item)}
                      accessibilityLabel="Edit Timings"
                    >
                      <Ionicons name="time" size={17} color="#2563EB" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.adminIconBtn}
                      onPress={() => handleDeletePoll(item)}
                      accessibilityLabel="Delete Poll"
                    >
                      <Ionicons name="trash-outline" size={17} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Question & Description */}
              <Text style={styles.pollQuestion}>{item.question}</Text>
              {item.description ? (
                <Text style={styles.pollDescription}>{item.description}</Text>
              ) : null}

              {/* Options & Votes */}
              <View style={styles.optionsContainer}>
                {item.options.map(opt => {
                  const votesCount = opt.votesCount || (opt.voterIds || []).length || 0;
                  const pct = Math.round((votesCount / totalVotes) * 100) || 0;
                  const isSelected = (opt.voterIds || []).includes(currentUserId);

                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.optionCard,
                        isSelected && styles.optionCardSelected,
                        isClosed && styles.optionCardDisabled,
                      ]}
                      onPress={() => handleVote(item, opt)}
                      activeOpacity={isClosed ? 1 : 0.7}
                      disabled={isClosed}
                    >
                      {/* Live Fill Progress Bar */}
                      <View
                        style={[
                          styles.optionProgressFill,
                          { width: `${pct}%` },
                          isSelected && styles.optionProgressFillSelected,
                        ]}
                      />

                      {/* Content Row */}
                      <View style={styles.optionContentRow}>
                        <View style={styles.optionLeft}>
                          <Ionicons
                            name={
                              isSelected
                                ? 'radio-button-on'
                                : 'radio-button-off'
                            }
                            size={18}
                            color={isSelected ? '#6D28D9' : '#9CA3AF'}
                            style={{ marginRight: 8 }}
                          />
                          <Text
                            style={[
                              styles.optionText,
                              isSelected && styles.optionTextSelected,
                            ]}
                          >
                            {opt.text}
                          </Text>
                        </View>

                        <View style={styles.optionRight}>
                          <Text style={[styles.optionPct, isSelected && styles.optionPctSelected]}>
                            {pct}%
                          </Text>
                          <Text style={styles.optionVotesCount}>({votesCount})</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Poll Footer Information */}
              <View style={styles.pollFooter}>
                <View style={styles.footerAuthor}>
                  <Ionicons name="person-circle-outline" size={14} color="#6B7280" />
                  <Text style={styles.footerAuthorText}>
                    Created by {item.createdBy?.name || 'Admin'}
                  </Text>
                </View>
                <View style={styles.footerVotes}>
                  <Ionicons
                    name={userVoted ? 'checkmark-circle' : 'finger-print-outline'}
                    size={14}
                    color={userVoted ? '#16A34A' : '#6B7280'}
                  />
                  <Text style={[styles.footerVotesText, userVoted && styles.footerVotesTextVoted]}>
                    {userVoted ? 'You Voted • ' : ''}
                    {item.totalVotes || 0} total vote(s)
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Create / Edit Poll Modal - Responsive Bottom Sheet for iOS & Android */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
        statusBarTranslucent={true}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowModal(false)}
          />

          <View style={styles.modalContent}>
            {/* Sheet Handle for iOS/Android bottom sheet look */}
            <View style={styles.sheetHandleWrap}>
              <View style={styles.sheetHandle} />
            </View>

            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.modalTitle}>
                  {editingPoll ? 'Edit Poll & Timings ⏰' : 'Create Voting Poll 🗳️'}
                </Text>
                <Text style={styles.modalSub}>
                  Set question, options, and voting window
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              bounces={Platform.OS === 'ios'}
            >
              {/* Question */}
              <Text style={styles.inputLabel}>Poll Question *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Which Garba music troupe for Day 3?"
                placeholderTextColor="#9CA3AF"
                value={question}
                onChangeText={setQuestion}
                returnKeyType="next"
              />

              {/* Description */}
              <Text style={styles.inputLabel}>Context / Description (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.descTextInput]}
                placeholder="Add context or notes for members to help them decide..."
                placeholderTextColor="#9CA3AF"
                value={description}
                onChangeText={setDescription}
                multiline
              />

              {/* Options */}
              {!editingPoll && (
                <View style={{ marginTop: 8 }}>
                  <View style={styles.optionsHeaderRow}>
                    <Text style={styles.inputLabel}>Voting Options (Min 2, Max 6) *</Text>
                    {options.length < 6 && (
                      <TouchableOpacity onPress={handleAddOption} style={styles.addOptionBtn}>
                        <Ionicons name="add-circle" size={16} color="#6D28D9" />
                        <Text style={styles.addOptionBtnText}>Add Option</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {options.map((opt, idx) => (
                    <View key={idx} style={styles.optionInputRow}>
                      <Text style={styles.optionIdxBadge}>{idx + 1}</Text>
                      <TextInput
                        style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
                        placeholder={`Option ${idx + 1} text`}
                        placeholderTextColor="#9CA3AF"
                        value={opt}
                        onChangeText={text => handleOptionChange(text, idx)}
                        returnKeyType="next"
                      />
                      {options.length > 2 && (
                        <TouchableOpacity
                          onPress={() => handleRemoveOption(idx)}
                          style={styles.removeOptionBtn}
                        >
                          <Ionicons name="trash" size={18} color="#DC2626" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Timing & Restrictions */}
              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Poll Timings & Duration *</Text>
              <View style={styles.durationChipsRow}>
                <TouchableOpacity
                  style={[
                    styles.durationChip,
                    selectedDuration === '24h' && styles.durationChipActive,
                  ]}
                  onPress={() => setSelectedDuration('24h')}
                >
                  <Text
                    style={[
                      styles.durationChipText,
                      selectedDuration === '24h' && styles.durationChipTextActive,
                    ]}
                  >
                    ⚡ 24 Hours
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.durationChip,
                    selectedDuration === '3days' && styles.durationChipActive,
                  ]}
                  onPress={() => setSelectedDuration('3days')}
                >
                  <Text
                    style={[
                      styles.durationChipText,
                      selectedDuration === '3days' && styles.durationChipTextActive,
                    ]}
                  >
                    📅 3 Days
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.durationChip,
                    selectedDuration === 'aarti' && styles.durationChipActive,
                  ]}
                  onPress={() => setSelectedDuration('aarti')}
                >
                  <Text
                    style={[
                      styles.durationChipText,
                      selectedDuration === 'aarti' && styles.durationChipTextActive,
                    ]}
                  >
                    🪔 8 PM Aarti
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.durationChip,
                    selectedDuration === 'festival' && styles.durationChipActive,
                  ]}
                  onPress={() => setSelectedDuration('festival')}
                >
                  <Text
                    style={[
                      styles.durationChipText,
                      selectedDuration === 'festival' && styles.durationChipTextActive,
                    ]}
                  >
                    🎉 Till 19 Oct
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.durationChip,
                    selectedDuration === 'custom' && styles.durationChipActive,
                  ]}
                  onPress={() => setSelectedDuration('custom')}
                >
                  <Text
                    style={[
                      styles.durationChipText,
                      selectedDuration === 'custom' && styles.durationChipTextActive,
                    ]}
                  >
                    ⚙️ Custom
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Custom Date Inputs if Custom Duration selected */}
              {selectedDuration === 'custom' && (
                <View style={styles.customDateContainer}>
                  <Text style={styles.subInputLabel}>Select Festival Date (11-19 Oct 2026):</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                    {AARTI_DATES.map(item => (
                      <TouchableOpacity
                        key={item.date}
                        style={[
                          styles.dateChip,
                          customEndDate === item.date && styles.dateChipActive,
                        ]}
                        onPress={() => setCustomEndDate(item.date)}
                      >
                        <Text
                          style={[
                            styles.dateChipText,
                            customEndDate === item.date && styles.dateChipTextActive,
                          ]}
                        >
                          {item.date.slice(0, 5)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={styles.subInputLabel}>End Time (Default 20:00 / 8:00 PM Aarti):</Text>
                  <TextInput
                    style={[styles.textInput, { width: 140 }]}
                    placeholder="20:00"
                    placeholderTextColor="#9CA3AF"
                    value={customEndTime}
                    onChangeText={setCustomEndTime}
                  />
                </View>
              )}

              {/* Informative Note */}
              <View style={styles.modalNotice}>
                <Ionicons name="notifications" size={16} color="#6D28D9" />
                <Text style={styles.modalNoticeText}>
                  Publishing this poll automatically pops up an announcement alert on all members'
                  Home Screens and broadcasts to community Chat!
                </Text>
              </View>
            </ScrollView>

            {/* Pinned Action Buttons for iOS and Android */}
            <View style={styles.modalActionsRowPinned}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSavePoll}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#7C3AED', '#6D28D9']}
                  style={styles.saveBtnGradient}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>
                    {editingPoll ? 'Save Changes' : 'Publish Poll'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Confirm Delete Poll Modal */}
      <ConfirmDeleteModal
        visible={!!pollToDelete}
        title="Delete Voting Poll?"
        message={`Are you sure you want to permanently delete the poll:\n\n"${pollToDelete?.question}"?\n\nAll recorded member votes for this poll will be permanently erased.`}
        confirmText="Delete Poll"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPollToDelete(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF5FF',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 44 : 14,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    marginHorizontal: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSub: {
    fontSize: 11,
    color: '#DDD6FE',
    fontWeight: '500',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  createBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  roleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 4,
  },
  roleBannerText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1,
  },

  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  tabBtnActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#6D28D9',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 14,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
    paddingVertical: 4,
  },

  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 40,
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#6D28D9',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 30,
  },

  pollCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  pollCardClosed: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  pollHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pollStatusBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeActive: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeClosed: {
    backgroundColor: '#F3F4F6',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotActive: {
    backgroundColor: '#16A34A',
  },
  statusDotClosed: {
    backgroundColor: '#9CA3AF',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusBadgeTextActive: {
    color: '#16A34A',
  },
  statusBadgeTextClosed: {
    color: '#6B7280',
  },
  timingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  timingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6D28D9',
  },

  adminActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adminIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  pollQuestion: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  pollDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 10,
    lineHeight: 16,
  },

  optionsContainer: {
    gap: 8,
    marginVertical: 6,
  },
  optionCard: {
    position: 'relative',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  optionCardSelected: {
    borderColor: '#7C3AED',
    backgroundColor: '#FAF5FF',
  },
  optionCardDisabled: {
    opacity: 0.9,
  },
  optionProgressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#EDE9FE',
    borderRadius: 10,
  },
  optionProgressFillSelected: {
    backgroundColor: '#DDD6FE',
  },
  optionContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  optionTextSelected: {
    color: '#5B21B6',
    fontWeight: '800',
  },
  optionRight: {
    alignItems: 'flex-end',
  },
  optionPct: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4B5563',
  },
  optionPctSelected: {
    color: '#6D28D9',
  },
  optionVotesCount: {
    fontSize: 10,
    color: '#9CA3AF',
  },

  pollFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerAuthorText: {
    fontSize: 11,
    color: '#6B7280',
  },
  footerVotes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerVotesText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  footerVotesTextVoted: {
    color: '#16A34A',
    fontWeight: '700',
  },

  // Modal Styles - Polished for iOS & Android View
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    width: '100%',
    maxWidth: 520,
    maxHeight: Platform.OS === 'ios' ? '88%' : '90%',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 24,
  },
  sheetHandleWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#4C1D95',
  },
  modalSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    flexGrow: 0,
    marginBottom: 6,
  },
  modalScrollContent: {
    paddingBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  subInputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 10,
    backgroundColor: '#F9FAFB',
  },
  descTextInput: {
    height: 72,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  optionsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addOptionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6D28D9',
  },
  optionInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  optionIdxBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    color: '#6D28D9',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '800',
  },
  removeOptionBtn: {
    padding: 6,
  },

  durationChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  durationChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  durationChipActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#6D28D9',
  },
  durationChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  durationChipTextActive: {
    color: '#FFFFFF',
  },

  customDateContainer: {
    backgroundColor: '#FAF5FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  dateChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8B4FE',
    marginRight: 6,
  },
  dateChipActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#6D28D9',
  },
  dateChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4C1D95',
  },
  dateChipTextActive: {
    color: '#FFFFFF',
  },

  modalNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3E8FF',
    padding: 10,
    borderRadius: 10,
    marginVertical: 8,
  },
  modalNoticeText: {
    fontSize: 11,
    color: '#5B21B6',
    fontWeight: '600',
    flex: 1,
    lineHeight: 15,
  },

  modalActionsRowPinned: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  cancelBtn: {
    flex: 0.38,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  saveBtn: {
    flex: 0.62,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
