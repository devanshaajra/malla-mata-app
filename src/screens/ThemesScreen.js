import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Alert, Platform, Image, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import { COLORS, THEME_DAYS } from '../utils/constants';

export default function ThemesScreen({ navigation }) {
  const { currentUser, isAdmin: rawIsAdmin, isSuperuser, hasControl } = useAuth();
  const isAdmin = isSuperuser || (rawIsAdmin && (hasControl ? hasControl('manageThemes') : true));
  const { themes, saveTheme, deleteThemeOutput, getTheme, members } = useData();
  const { showToast } = useToast();

  const [expandedDay, setExpandedDay] = useState('Day 1 (11 Oct)');
  const [editingDay, setEditingDay] = useState(null);
  const [form, setForm] = useState({
    themeName: '',
    timeRequired: '',
    expense: '',
    membersPresent: '',
    referenceMedia: null,
    performers: [],
    finalOutputs: [],
  });

  // Media upload modal state for selected day (Final Outputs)
  const [uploadModalDay, setUploadModalDay] = useState(null);
  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaType, setMediaType] = useState('image'); // 'image' | 'video'

  // Reference Media upload state
  const [uploadRefModalDay, setUploadRefModalDay] = useState(null);
  const [refMediaTitle, setRefMediaTitle] = useState('');

  // Performers state
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [otherPerformerName, setOtherPerformerName] = useState('');

  // Delete media output confirmation modal state
  const [mediaToDelete, setMediaToDelete] = useState(null); // { day, outputId, title }

  const handleExpand = (day) => {
    if (expandedDay === day) {
      setExpandedDay(null);
      return;
    }
    setExpandedDay(day);
    const existing = getTheme(day);
    if (existing) {
      setForm({
        themeName: existing.themeName || '',
        timeRequired: existing.timeRequired || '',
        expense: existing.expense || '',
        membersPresent: existing.membersPresent || '',
        referenceMedia: existing.referenceMedia || null,
        performers: existing.performers || [],
        finalOutputs: existing.finalOutputs || [],
      });
    } else {
      setForm({
        themeName: '',
        timeRequired: '',
        expense: '',
        membersPresent: '',
        referenceMedia: null,
        performers: [],
        finalOutputs: [],
      });
    }
    setEditingDay(null);
    setShowMemberDropdown(false);
    setOtherPerformerName('');
  };

  const handleSaveTheme = async (day) => {
    const existing = getTheme(day) || {};
    const updated = {
      ...existing,
      themeName: (form.themeName || '').trim(),
      timeRequired: (form.timeRequired || '').trim(),
      expense: (form.expense || '').trim(),
      membersPresent: (form.membersPresent || '').trim(),
      referenceMedia: form.referenceMedia !== undefined ? form.referenceMedia : (existing.referenceMedia || null),
      performers: form.performers || existing.performers || [],
      finalOutputs: form.finalOutputs || existing.finalOutputs || [],
    };
    await saveTheme(day, updated);
    setEditingDay(null);
    showToast(`Saved ${day} Theme! 🪔`, 'success', 'Daily theme & event details recorded');
  };

  // Launch device picker for Reference Media (Photo or Video concept)
  const handleUploadReferenceMedia = async (type) => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please enable media permissions to upload reference concept.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: type === 'video' ? ['videos'] : ['images'],
        quality: 0.8,
        allowsEditing: type !== 'video',
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const newRefMedia = {
          id: `ref-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          title: refMediaTitle.trim() || `${uploadRefModalDay} Reference Concept`,
          type: type,
          uri: result.assets[0].uri,
          uploadedBy: currentUser?.displayName || currentUser?.name || 'Admin',
          uploaderId: currentUser?.id,
          uploadedAt: new Date().toISOString(),
        };

        const existing = getTheme(uploadRefModalDay) || {};
        await saveTheme(uploadRefModalDay, {
          ...existing,
          referenceMedia: newRefMedia,
        });

        if (expandedDay === uploadRefModalDay) {
          setForm(prev => ({ ...prev, referenceMedia: newRefMedia }));
        }

        setUploadRefModalDay(null);
        setRefMediaTitle('');
        showToast('Reference Media Uploaded! 🎨', 'insert', `Set for ${uploadRefModalDay}`);
      }
    } catch (e) {
      console.error('Error uploading reference media:', e);
      Alert.alert('Upload Error', e.message);
    }
  };

  const handleRemoveReferenceMedia = async (day) => {
    const existing = getTheme(day) || {};
    await saveTheme(day, {
      ...existing,
      referenceMedia: null,
    });
    if (expandedDay === day) {
      setForm(prev => ({ ...prev, referenceMedia: null }));
    }
    showToast('Reference Media Removed', 'info', `Removed from ${day}`);
  };

  // Performers operations
  const handleAddMemberPerformer = async (day, member) => {
    const existing = getTheme(day) || {};
    const currentPerformers = form.performers || existing.performers || [];
    if (currentPerformers.some(p => p.id === member.id || p.name?.toLowerCase() === member.name?.toLowerCase())) {
      showToast('Already Added', 'info', `${member.name} is already listed as a performer.`);
      setShowMemberDropdown(false);
      return;
    }

    const updatedPerformers = [
      ...currentPerformers,
      { id: member.id, name: member.name, type: 'member', designation: member.designation || 'Member' }
    ];

    setForm(prev => ({ ...prev, performers: updatedPerformers }));
    await saveTheme(day, { ...existing, performers: updatedPerformers });
    setShowMemberDropdown(false);
    showToast('Performer Added! 💃', 'success', `${member.name} added to theme performers`);
  };

  const handleAddOtherPerformer = async (day) => {
    if (!otherPerformerName.trim()) {
      showToast('Name Required', 'error', 'Please enter the name of the performer / artist');
      return;
    }

    const existing = getTheme(day) || {};
    const currentPerformers = form.performers || existing.performers || [];
    const updatedPerformers = [
      ...currentPerformers,
      { id: `guest-${Date.now()}`, name: otherPerformerName.trim(), type: 'guest' }
    ];

    setForm(prev => ({ ...prev, performers: updatedPerformers }));
    await saveTheme(day, { ...existing, performers: updatedPerformers });
    setOtherPerformerName('');
    showToast('Guest Performer Added! ⭐', 'success', `${otherPerformerName.trim()} added to performers list`);
  };

  const handleRemovePerformer = async (day, performerId) => {
    const existing = getTheme(day) || {};
    const currentPerformers = form.performers || existing.performers || [];
    const updatedPerformers = currentPerformers.filter(p => p.id !== performerId);

    setForm(prev => ({ ...prev, performers: updatedPerformers }));
    await saveTheme(day, { ...existing, performers: updatedPerformers });
    showToast('Performer Removed', 'delete', 'Removed from theme performers list');
  };

  // Launch device picker for day output media (Photo or Video)
  const handleUploadOutputMedia = async (type) => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please enable media permissions to upload outputs.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: type === 'video' ? ['videos'] : ['images'],
        quality: 0.8,
        allowsEditing: type !== 'video',
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const newMediaItem = {
          id: `out-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          title: mediaTitle.trim() || `${uploadModalDay} ${type === 'video' ? 'Video Output' : 'Photo Output'}`,
          type: type,
          uri: result.assets[0].uri,
          uploadedBy: currentUser?.displayName || currentUser?.name || 'Member',
          uploaderId: currentUser?.id,
          uploadedAt: new Date().toISOString(),
        };

        const existing = getTheme(uploadModalDay) || {};
        const currentOutputs = existing.finalOutputs || [];
        const updatedOutputs = [newMediaItem, ...currentOutputs];

        await saveTheme(uploadModalDay, {
          ...existing,
          finalOutputs: updatedOutputs,
        });

        // Update local state if currently expanded
        if (expandedDay === uploadModalDay) {
          setForm(prev => ({ ...prev, finalOutputs: updatedOutputs }));
        }

        setUploadModalDay(null);
        setMediaTitle('');
        showToast('Final Output Uploaded! 📸', 'insert', `Added to ${uploadModalDay}`);
      }
    } catch (e) {
      console.error('Error uploading media:', e);
      Alert.alert('Upload Error', e.message);
    }
  };

  // Download media item uploaded by any user
  const handleDownloadMedia = (mediaItem) => {
    const filename = `${mediaItem.title.replace(/\s+/g, '_').toLowerCase()}.${mediaItem.type === 'video' ? 'mp4' : 'jpg'}`;

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        const link = document.createElement('a');
        link.href = mediaItem.uri;
        link.download = filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Media Downloaded! 📥', 'download', `${filename} saved to your device`);
      } catch (e) {
        showToast('Download started in browser', 'info', filename);
      }
    } else {
      showToast('Media Ready for Saving 📥', 'download', `${filename} ready in gallery`);
    }
  };

  // Delete media item (Restricted to Admins and Superuser)
  const handleConfirmDeleteOutput = async () => {
    if (!mediaToDelete) return;
    const { day, outputId } = mediaToDelete;
    await deleteThemeOutput(day, outputId);
    
    // Update local state if currently expanded
    if (expandedDay === day) {
      setForm(prev => ({
        ...prev,
        finalOutputs: prev.finalOutputs.filter(o => o.id !== outputId),
      }));
    }

    setMediaToDelete(null);
    showToast('Theme Output Deleted', 'delete', 'The photo/video output has been removed.');
  };

  const dayColors = [
    '#DC2626', '#EA580C', '#F59E0B', '#D97706', '#B91C1C',
    '#F97316', '#E11D48', '#CA8A04', '#EA580C',
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#DC2626', '#EA580C']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Themes & Final Output</Text>
        <View style={{ width: 32 }} />
      </LinearGradient>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.body} showsVerticalScrollIndicator={true}>
        {/* Intro Banner */}
        <View style={styles.introCard}>
          <Ionicons name="sparkles" size={22} color="#DC2626" />
          <View style={{ flex: 1 }}>
            <Text style={styles.introTitle}>9 Days Divine Navratri Themes</Text>
            <Text style={styles.introText}>
              Plan daily concepts, track actual expenditure, and upload or download photo/video final outputs for each day.
            </Text>
          </View>
        </View>

        {THEME_DAYS.map((day, idx) => {
          const data = getTheme(day) || {};
          const isExpanded = expandedDay === day;
          const isEditing = editingDay === day;
          const color = dayColors[idx] || '#DC2626';
          const outputs = data.finalOutputs || [];

          return (
            <View key={day} style={styles.dayCard}>
              <TouchableOpacity
                style={styles.dayHeader}
                onPress={() => handleExpand(day)}
                activeOpacity={0.8}
              >
                <View style={[styles.dayBadge, { backgroundColor: color }]}>
                  <Text style={styles.dayNumber}>{idx + 1}</Text>
                </View>
                <View style={styles.dayInfo}>
                  <Text style={styles.dayTitle}>{day}</Text>
                  {data?.themeName ? (
                    <Text style={styles.dayTheme}>{data.themeName}</Text>
                  ) : (
                    <Text style={styles.dayThemePlaceholder}>Tap to view/set theme details</Text>
                  )}
                </View>

                {outputs.length > 0 && (
                  <View style={styles.mediaCountBadge}>
                    <Ionicons name="images" size={13} color="#D97706" />
                    <Text style={styles.mediaCountText}>{outputs.length}</Text>
                  </View>
                )}

                <Ionicons
                  name={isExpanded ? 'chevron-up-circle' : 'chevron-down-circle-outline'}
                  size={24}
                  color={color}
                  style={{ marginLeft: 6 }}
                />
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.dayContent}>
                  {/* Theme Fields */}
                  {[
                    { label: 'THEME NAME / CONCEPT', key: 'themeName', icon: 'color-palette-outline', ph: 'e.g. Royal Yellow Garba (Maa Shailputri)' },
                    { label: 'TIME REQUIRED / SCHEDULE', key: 'timeRequired', icon: 'time-outline', ph: 'e.g. 4 Hours (6:00 PM - 10:00 PM)' },
                    { label: 'ACTUAL EXPENDITURE (₹)', key: 'expense', icon: 'cash-outline', ph: 'Actual amount spent in ₹', kb: 'numeric' },
                    { label: 'COMMITTEE IN CHARGE / VOLUNTEERS', key: 'membersPresent', icon: 'people-outline', ph: 'Select or enter volunteer names' },
                  ].map((f) => (
                    <View key={f.key} style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>{f.label}</Text>
                      <View style={[styles.inputRow, isEditing && styles.inputRowEditing]}>
                        <Ionicons name={f.icon} size={18} color={color} />
                        <TextInput
                          style={styles.input}
                          value={form[f.key] !== undefined ? form[f.key] : data[f.key] || ''}
                          onChangeText={(v) => setForm(prev => ({ ...prev, [f.key]: v }))}
                          placeholder={f.ph}
                          placeholderTextColor="#94A3B8"
                          editable={isAdmin && isEditing}
                          keyboardType={f.kb || 'default'}
                        />
                      </View>

                      {/* Quick Dropdown Chips for Members List */}
                      {f.key === 'membersPresent' && isAdmin && isEditing && (
                        <View style={styles.memberPickerContainer}>
                          <Text style={styles.memberPickerHint}>+ Tap member to add to volunteers:</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.memberChipsScroll}>
                            {(members || []).map((m) => {
                              const currentVal = form.membersPresent || '';
                              const isIncluded = currentVal.toLowerCase().includes(m.name.toLowerCase());
                              return (
                                <TouchableOpacity
                                  key={m.id}
                                  style={[styles.memberChip, isIncluded && styles.memberChipActive]}
                                  onPress={() => {
                                    if (isIncluded) {
                                      // Remove member name
                                      const parts = currentVal.split(',').map(s => s.trim()).filter(s => s && s.toLowerCase() !== m.name.toLowerCase());
                                      setForm(prev => ({ ...prev, membersPresent: parts.join(', ') }));
                                    } else {
                                      // Append member name
                                      const newVal = currentVal ? `${currentVal.trim()}, ${m.name}` : m.name;
                                      setForm(prev => ({ ...prev, membersPresent: newVal }));
                                    }
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons
                                    name={isIncluded ? 'checkmark-circle' : 'add-circle-outline'}
                                    size={13}
                                    color={isIncluded ? '#FFFFFF' : '#475569'}
                                  />
                                  <Text style={[styles.memberChipText, isIncluded && styles.memberChipTextActive]}>
                                    {m.name}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  ))}

                  {/* ─── Field: Reference Image / Video Concept ─── */}
                  <View style={styles.refMediaSection}>
                    <View style={styles.refMediaHeaderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="image" size={16} color="#D97706" />
                        <Text style={styles.fieldLabel}>REFERENCE IMAGE / VIDEO CONCEPT</Text>
                      </View>
                      {isAdmin && (form.referenceMedia || data.referenceMedia) && (
                        <TouchableOpacity
                          style={styles.refChangeBtn}
                          onPress={() => {
                            setUploadRefModalDay(day);
                            setRefMediaTitle((form.referenceMedia || data.referenceMedia)?.title || '');
                          }}
                        >
                          <Ionicons name="sync-outline" size={12} color="#D97706" />
                          <Text style={styles.refChangeBtnText}>Change</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {(form.referenceMedia || data.referenceMedia) ? (
                      (() => {
                        const refItem = form.referenceMedia || data.referenceMedia;
                        return (
                          <View style={styles.refMediaCard}>
                            <View style={styles.refMediaPreviewWrap}>
                              <Image source={{ uri: refItem.uri }} style={styles.refMediaImage} resizeMode="cover" />
                              {refItem.type === 'video' && (
                                <View style={styles.videoBadgeOverlay}>
                                  <Ionicons name="play-circle" size={32} color="#FFFFFF" />
                                </View>
                              )}
                              <View style={styles.refTypeTag}>
                                <Ionicons name={refItem.type === 'video' ? 'videocam' : 'camera'} size={10} color="#FFFFFF" />
                                <Text style={styles.refTypeTagText}>
                                  {refItem.type === 'video' ? 'Reference Video' : 'Reference Image'}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.refMediaInfo}>
                              <Text style={styles.refMediaTitle} numberOfLines={1}>{refItem.title || 'Theme Reference'}</Text>
                              <Text style={styles.refMediaUploader}>By {refItem.uploadedBy || 'Admin'}</Text>

                              <View style={styles.refActionsRow}>
                                <TouchableOpacity
                                  style={styles.refDownloadBtn}
                                  onPress={() => handleDownloadMedia(refItem)}
                                  activeOpacity={0.8}
                                >
                                  <Ionicons name="download-outline" size={13} color="#059669" />
                                  <Text style={styles.refDownloadBtnText}>Download / View</Text>
                                </TouchableOpacity>

                                {isAdmin && (
                                  <TouchableOpacity
                                    style={styles.refRemoveBtn}
                                    onPress={() => handleRemoveReferenceMedia(day)}
                                    activeOpacity={0.8}
                                  >
                                    <Ionicons name="trash-outline" size={13} color="#DC2626" />
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                          </View>
                        );
                      })()
                    ) : (
                      <View style={styles.emptyRefBox}>
                        <View style={styles.emptyRefIconWrap}>
                          <Ionicons name="images-outline" size={24} color="#D97706" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.emptyRefTitle}>No Reference Image / Video Yet</Text>
                          <Text style={styles.emptyRefSub}>Upload concept photos, stage decor mockup, or choreography video</Text>
                        </View>
                        {isAdmin && (
                          <TouchableOpacity
                            style={styles.uploadRefBtn}
                            onPress={() => {
                              setUploadRefModalDay(day);
                              setRefMediaTitle('');
                            }}
                            activeOpacity={0.85}
                          >
                            <Ionicons name="cloud-upload" size={13} color="#FFFFFF" />
                            <Text style={styles.uploadRefBtnText}>Upload</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>

                  {/* ─── Field: Theme Performers & Artists (Dropdown + Other Names) ─── */}
                  <View style={styles.performersSection}>
                    <View style={styles.performersHeaderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="musical-notes" size={16} color="#EA580C" />
                        <Text style={styles.fieldLabel}>THEME PERFORMERS & ARTISTS</Text>
                      </View>
                      <View style={styles.performerCountBadge}>
                        <Text style={styles.performerCountText}>
                          {(form.performers || data.performers || []).length} Performers
                        </Text>
                      </View>
                    </View>

                    {/* Performers List */}
                    <View style={styles.performersListWrap}>
                      {(form.performers || data.performers || []).length === 0 ? (
                        <Text style={styles.emptyPerformersText}>No performers assigned yet for this theme.</Text>
                      ) : (
                        <View style={styles.performerChipsContainer}>
                          {(form.performers || data.performers || []).map((p) => {
                            const isMember = p.type === 'member';
                            return (
                              <View
                                key={p.id}
                                style={[styles.performerPill, isMember ? styles.performerPillMember : styles.performerPillGuest]}
                              >
                                <Ionicons
                                  name={isMember ? 'person' : 'star'}
                                  size={12}
                                  color={isMember ? '#2563EB' : '#D97706'}
                                />
                                <Text style={[styles.performerPillName, isMember ? styles.performerPillNameMember : styles.performerPillNameGuest]}>
                                  {p.name}
                                </Text>
                                <View style={[styles.performerTypeTag, isMember ? styles.performerTypeTagMember : styles.performerTypeTagGuest]}>
                                  <Text style={[styles.performerTypeTagText, isMember ? styles.performerTypeTagTextMember : styles.performerTypeTagTextGuest]}>
                                    {isMember ? 'Member' : 'Guest'}
                                  </Text>
                                </View>
                                {isAdmin && (
                                  <TouchableOpacity
                                    onPress={() => handleRemovePerformer(day, p.id)}
                                    style={styles.performerRemoveTouch}
                                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                  >
                                    <Ionicons name="close-circle" size={14} color="#94A3B8" />
                                  </TouchableOpacity>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>

                    {/* Add Performers Controls (Dropdown for Members + Add Other Names) */}
                    {isAdmin && (
                      <View style={styles.addPerformersBox}>
                        {/* 1. Dropdown list to add members to perform the theme */}
                        <Text style={styles.performerControlLabel}>1. ADD REGISTERED MEMBER AS PERFORMER</Text>
                        <TouchableOpacity
                          style={[styles.memberDropdownBtn, showMemberDropdown && styles.memberDropdownBtnActive]}
                          onPress={() => setShowMemberDropdown(prev => !prev)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="people" size={16} color="#2563EB" />
                          <Text style={styles.memberDropdownBtnText}>
                            {showMemberDropdown ? 'Close Member Dropdown ▲' : 'Select Member from Dropdown List ▼'}
                          </Text>
                          <Ionicons name={showMemberDropdown ? 'chevron-up' : 'chevron-down'} size={16} color="#64748B" />
                        </TouchableOpacity>

                        {showMemberDropdown && (
                          <View style={styles.dropdownMenuCard}>
                            <Text style={styles.dropdownMenuHint}>Select a member to add to {day} performance:</Text>
                            <ScrollView nestedScrollEnabled style={{ maxHeight: 180 }} showsVerticalScrollIndicator={true}>
                              {(members || []).map((m) => {
                                const currentPerformers = form.performers || data.performers || [];
                                const isAlreadyAdded = currentPerformers.some(p => p.id === m.id || p.name?.toLowerCase() === m.name?.toLowerCase());
                                return (
                                  <TouchableOpacity
                                    key={m.id}
                                    style={[styles.dropdownMenuItem, isAlreadyAdded && styles.dropdownMenuItemDisabled]}
                                    onPress={() => !isAlreadyAdded && handleAddMemberPerformer(day, m)}
                                    disabled={isAlreadyAdded}
                                    activeOpacity={0.7}
                                  >
                                    <View style={styles.dropdownMemberAvatar}>
                                      <Text style={styles.dropdownMemberAvatarText}>{(m.name || 'M')[0]}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                      <Text style={[styles.dropdownMemberName, isAlreadyAdded && { color: '#94A3B8' }]}>
                                        {m.name}
                                      </Text>
                                      <Text style={styles.dropdownMemberDesig}>
                                        {m.designation || m.role || 'Member'}
                                      </Text>
                                    </View>
                                    {isAlreadyAdded ? (
                                      <View style={styles.alreadyAddedBadge}>
                                        <Ionicons name="checkmark" size={11} color="#059669" />
                                        <Text style={styles.alreadyAddedText}>Added</Text>
                                      </View>
                                    ) : (
                                      <Ionicons name="add-circle" size={18} color="#2563EB" />
                                    )}
                                  </TouchableOpacity>
                                );
                              })}
                            </ScrollView>
                          </View>
                        )}

                        {/* 2. Option to add other names apart from members */}
                        <Text style={[styles.performerControlLabel, { marginTop: 12 }]}>2. ADD OTHER ARTIST / GUEST PERFORMER</Text>
                        <View style={styles.otherPerformerInputRow}>
                          <Ionicons name="person-add-outline" size={16} color="#D97706" />
                          <TextInput
                            style={styles.otherPerformerInput}
                            value={otherPerformerName}
                            onChangeText={setOtherPerformerName}
                            placeholder="Enter guest artist, troupe, or other name..."
                            placeholderTextColor="#94A3B8"
                          />
                          <TouchableOpacity
                            style={[styles.addOtherBtn, !otherPerformerName.trim() && styles.addOtherBtnDisabled]}
                            onPress={() => handleAddOtherPerformer(day)}
                            disabled={!otherPerformerName.trim()}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.addOtherBtnText}>+ Add Name</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Admin Edit / Save Buttons */}
                  {isAdmin && (
                    <View style={styles.actionRow}>
                      {isEditing ? (
                        <>
                          <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={() => setEditingDay(null)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.cancelText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleSaveTheme(day)}
                            activeOpacity={0.85}
                            style={{ flex: 1 }}
                          >
                            <LinearGradient colors={[color, color + 'E6']} style={styles.saveBtn}>
                              <Ionicons name="save-outline" size={16} color="#FFFFFF" />
                              <Text style={styles.saveText}>Save Details</Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <TouchableOpacity
                          style={styles.editBtn}
                          onPress={() => {
                            setEditingDay(day);
                            setForm({
                              themeName: data.themeName || '',
                              timeRequired: data.timeRequired || '',
                              expense: data.expense || '',
                              membersPresent: data.membersPresent || '',
                              referenceMedia: data.referenceMedia || null,
                              performers: data.performers || [],
                              finalOutputs: data.finalOutputs || [],
                            });
                          }}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="create-outline" size={16} color={color} />
                          <Text style={[styles.editText, { color }]}>Edit Day {idx + 1} Theme</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {/* ─── Final Output & Media Gallery Section ─── */}
                  <View style={styles.outputSectionHeader}>
                    <View style={styles.outputTitleRow}>
                      <Ionicons name="images-outline" size={18} color="#EA580C" />
                      <Text style={styles.outputSectionTitle}>Day {idx + 1} Final Output & Highlights</Text>
                    </View>

                    {/* Upload button */}
                    <TouchableOpacity
                      style={styles.addOutputBtn}
                      onPress={() => {
                        setUploadModalDay(day);
                        setMediaTitle('');
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="cloud-upload" size={14} color="#FFFFFF" />
                      <Text style={styles.addOutputBtnText}>Upload Output</Text>
                    </TouchableOpacity>
                  </View>

                  {outputs.length === 0 ? (
                    <View style={styles.emptyOutputsCard}>
                      <Ionicons name="image-outline" size={36} color="#CBD5E1" />
                      <Text style={styles.emptyOutputsText}>
                        No photos or videos uploaded for Day {idx + 1} yet.
                      </Text>
                      <TouchableOpacity
                        style={styles.firstUploadBtn}
                        onPress={() => {
                          setUploadModalDay(day);
                          setMediaTitle('');
                        }}
                      >
                        <Text style={styles.firstUploadBtnText}>+ Upload First Photo / Video</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.outputsGrid}>
                      {outputs.map((item) => (
                        <View key={item.id} style={styles.outputCard}>
                          <View style={styles.outputMediaWrap}>
                            <Image
                              source={{ uri: item.uri }}
                              style={styles.outputImage}
                              resizeMode="cover"
                            />
                            {item.type === 'video' && (
                              <View style={styles.videoBadgeOverlay}>
                                <Ionicons name="play-circle" size={32} color="#FFFFFF" />
                              </View>
                            )}
                            <View style={styles.typeBadge}>
                              <Ionicons
                                name={item.type === 'video' ? 'videocam' : 'camera'}
                                size={11}
                                color="#FFFFFF"
                              />
                              <Text style={styles.typeBadgeText}>
                                {item.type === 'video' ? 'Video' : 'Photo'}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.outputInfo}>
                            <Text style={styles.outputCaption} numberOfLines={2}>
                              {item.title}
                            </Text>
                            <Text style={styles.outputUploader}>
                              By {item.uploadedBy || 'Member'}
                            </Text>

                            {/* Actions Row: Download + (Delete for Admins/Superuser) */}
                            <View style={styles.outputActionsRow}>
                              <TouchableOpacity
                                style={styles.downloadBtn}
                                onPress={() => handleDownloadMedia(item)}
                                activeOpacity={0.8}
                              >
                                <Ionicons name="download-outline" size={13} color="#059669" />
                                <Text style={styles.downloadBtnText}>Download</Text>
                              </TouchableOpacity>

                              {(isAdmin || isSuperuser) && (
                                <TouchableOpacity
                                  style={styles.deleteOutputBtn}
                                  onPress={() => setMediaToDelete({ day, outputId: item.id, title: item.title })}
                                  activeOpacity={0.8}
                                >
                                  <Ionicons name="trash-outline" size={14} color="#DC2626" />
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Upload Final Output Modal */}
      <Modal
        visible={uploadModalDay !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setUploadModalDay(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Upload Final Output</Text>
                <Text style={styles.modalSubtitle}>{uploadModalDay}</Text>
              </View>
              <TouchableOpacity onPress={() => setUploadModalDay(null)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>TITLE / CAPTION (OPTIONAL)</Text>
            <TextInput
              style={styles.modalInput}
              value={mediaTitle}
              onChangeText={setMediaTitle}
              placeholder="e.g. Stage Mandap Output or Garba Highlights"
              placeholderTextColor="#94A3B8"
            />

            <Text style={[styles.modalLabel, { marginTop: 14 }]}>SELECT MEDIA TYPE</Text>
            <View style={styles.modalUploadBtnsRow}>
              <TouchableOpacity
                style={styles.modalPickBtn}
                onPress={() => handleUploadOutputMedia('image')}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#DC2626', '#EA580C']} style={styles.modalPickGradient}>
                  <Ionicons name="image" size={24} color="#FFFFFF" />
                  <Text style={styles.modalPickText}>Upload Photo</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalPickBtn}
                onPress={() => handleUploadOutputMedia('video')}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#EA580C', '#F59E0B']} style={styles.modalPickGradient}>
                  <Ionicons name="videocam" size={24} color="#FFFFFF" />
                  <Text style={styles.modalPickText}>Upload Video</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Upload Reference Image / Video Modal */}
      <Modal
        visible={uploadRefModalDay !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setUploadRefModalDay(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Upload Reference Media</Text>
                <Text style={styles.modalSubtitle}>{uploadRefModalDay} Concept & Mockup</Text>
              </View>
              <TouchableOpacity onPress={() => setUploadRefModalDay(null)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>REFERENCE CONCEPT TITLE / NOTE (OPTIONAL)</Text>
            <TextInput
              style={styles.modalInput}
              value={refMediaTitle}
              onChangeText={setRefMediaTitle}
              placeholder="e.g. Stage Decoration Reference or Garba Choreography Video"
              placeholderTextColor="#94A3B8"
            />

            <Text style={[styles.modalLabel, { marginTop: 14 }]}>UPLOAD PHOTO OR VIDEO</Text>
            <View style={styles.modalUploadBtnsRow}>
              <TouchableOpacity
                style={styles.modalPickBtn}
                onPress={() => handleUploadReferenceMedia('image')}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#D97706', '#EA580C']} style={styles.modalPickGradient}>
                  <Ionicons name="image" size={24} color="#FFFFFF" />
                  <Text style={styles.modalPickText}>Upload Image</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalPickBtn}
                onPress={() => handleUploadReferenceMedia('video')}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#EA580C', '#DC2626']} style={styles.modalPickGradient}>
                  <Ionicons name="videocam" size={24} color="#FFFFFF" />
                  <Text style={styles.modalPickText}>Upload Video</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirm Delete Output Modal */}
      <ConfirmDeleteModal
        visible={mediaToDelete !== null}
        title="Delete Output Media"
        message={`Are you sure you want to delete "${mediaToDelete?.title || 'this output'}" from ${mediaToDelete?.day}?`}
        onConfirm={handleConfirmDeleteOutput}
        onCancel={() => setMediaToDelete(null)}
      />
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
  body: { padding: 18, paddingBottom: 40, maxWidth: 440, width: '100%', alignSelf: 'center' },
  introCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FEF3C7',
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
  },
  introTitle: { fontSize: 13, fontWeight: '800', color: '#92400E' },
  introText: { fontSize: 11.5, color: '#78350F', fontWeight: '500', marginTop: 2, lineHeight: 16 },
  dayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  dayBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dayNumber: { fontSize: 18, fontWeight: '900', color: '#FFFFFF' },
  dayInfo: { flex: 1 },
  dayTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  dayTheme: { fontSize: 12.5, color: '#EA580C', marginTop: 2, fontWeight: '700' },
  dayThemePlaceholder: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  mediaCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  mediaCountText: { fontSize: 11, fontWeight: '800', color: '#B45309' },
  dayContent: {
    padding: 16,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#FEF3C7',
    backgroundColor: '#FFFDF7',
  },
  fieldGroup: { marginTop: 12 },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: '#78350F', marginBottom: 4, letterSpacing: 0.5 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  inputRowEditing: { backgroundColor: '#FFFFFF', borderColor: '#DC2626' },
  input: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '600',
    height: '100%',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    flex: 1,
  },
  editText: { fontSize: 13, fontWeight: '700' },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },

  outputSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
    paddingTop: 14,
    borderTopWidth: 1.5,
    borderTopColor: '#FDE68A',
  },
  outputTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  outputSectionTitle: { fontSize: 13, fontWeight: '800', color: '#92400E' },
  addOutputBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addOutputBtnText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  emptyOutputsCard: {
    alignItems: 'center',
    padding: 18,
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#FDE68A',
    gap: 6,
  },
  emptyOutputsText: { fontSize: 12, color: '#94A3B8', fontWeight: '500', textAlign: 'center' },
  firstUploadBtn: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  firstUploadBtnText: { fontSize: 11.5, fontWeight: '700', color: '#B45309' },
  outputsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  outputCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  outputMediaWrap: {
    position: 'relative',
    height: 110,
    backgroundColor: '#FFFBEB',
  },
  outputImage: { width: '100%', height: '100%' },
  videoBadgeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  typeBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF' },
  outputInfo: { padding: 8 },
  outputCaption: { fontSize: 11.5, fontWeight: '700', color: '#1E293B', lineHeight: 15 },
  outputUploader: { fontSize: 10, color: '#64748B', marginTop: 2 },
  outputActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  downloadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  downloadBtnText: { fontSize: 10.5, fontWeight: '800', color: '#059669' },
  deleteOutputBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FEF3C7',
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
  modalSubtitle: { fontSize: 12, color: '#EA580C', fontWeight: '700', marginTop: 2 },
  modalLabel: { fontSize: 10.5, fontWeight: '700', color: '#78350F', marginBottom: 6, letterSpacing: 0.5 },
  modalInput: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#FDE68A',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  modalUploadBtnsRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  modalPickBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  modalPickGradient: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 6 },
  modalPickText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },

  memberPickerContainer: {
    marginTop: 6,
    marginBottom: 4,
  },
  memberPickerHint: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#D97706',
    marginBottom: 4,
  },
  memberChipsScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  memberChipActive: {
    backgroundColor: '#EA580C',
    borderColor: '#C2410C',
  },
  memberChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  memberChipTextActive: {
    color: '#FFFFFF',
  },

  /* Reference Media Section Styles */
  refMediaSection: {
    marginTop: 14,
    backgroundColor: '#FFFDF7',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
  },
  refMediaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  refChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  refChangeBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#B45309',
  },
  refMediaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  refMediaPreviewWrap: {
    position: 'relative',
    height: 140,
    backgroundColor: '#FFFBEB',
  },
  refMediaImage: {
    width: '100%',
    height: '100%',
  },
  refTypeTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  refTypeTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  refMediaInfo: {
    padding: 10,
  },
  refMediaTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1E293B',
  },
  refMediaUploader: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },
  refActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  refDownloadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  refDownloadBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  refRemoveBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  emptyRefBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#FDE68A',
  },
  emptyRefIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyRefTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#78350F',
  },
  emptyRefSub: {
    fontSize: 10.5,
    color: '#92400E',
    marginTop: 2,
    lineHeight: 14,
  },
  uploadRefBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D97706',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  uploadRefBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Performers Section Styles */
  performersSection: {
    marginTop: 14,
    backgroundColor: '#FFFDF7',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
  },
  performersHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  performerCountBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  performerCountText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#92400E',
  },
  performersListWrap: {
    marginBottom: 8,
  },
  emptyPerformersText: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  performerChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  performerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  performerPillMember: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  performerPillGuest: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  performerPillName: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  performerPillNameMember: {
    color: '#1D4ED8',
  },
  performerPillNameGuest: {
    color: '#B45309',
  },
  performerTypeTag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  performerTypeTagMember: {
    backgroundColor: '#DBEAFE',
  },
  performerTypeTagGuest: {
    backgroundColor: '#FEF3C7',
  },
  performerTypeTagText: {
    fontSize: 9,
    fontWeight: '800',
  },
  performerTypeTagTextMember: {
    color: '#1E40AF',
  },
  performerTypeTagTextGuest: {
    color: '#92400E',
  },
  performerRemoveTouch: {
    marginLeft: 2,
  },
  addPerformersBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#FEF3C7',
  },
  performerControlLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#78350F',
    marginBottom: 5,
    letterSpacing: 0.5,
  },
  memberDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  memberDropdownBtnActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  memberDropdownBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
    flex: 1,
    marginLeft: 6,
  },
  dropdownMenuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginTop: 4,
    padding: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  dropdownMenuHint: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownMenuItemDisabled: {
    opacity: 0.5,
  },
  dropdownMemberAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownMemberAvatarText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  dropdownMemberName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  dropdownMemberDesig: {
    fontSize: 10,
    color: '#64748B',
  },
  alreadyAddedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  alreadyAddedText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#065F46',
  },
  otherPerformerInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 10,
    height: 40,
    gap: 6,
  },
  otherPerformerInput: {
    flex: 1,
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '600',
    height: '100%',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  addOtherBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  addOtherBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  addOtherBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

