import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList,
  Image, Alert, Platform, Modal, useWindowDimensions, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';

const REACTION_EMOJIS = ['❤️', '🙏', '🪔', '🌸', '🔥', '👏', '🔱'];

export default function MediaScreen({ navigation }) {
  const { currentUser, isAdmin } = useAuth();
  const { media, addMedia, deleteMedia, reactToMedia } = useData();
  const { showToast } = useToast();
  const { width } = useWindowDimensions();

  const [caption, setCaption] = useState('');
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' (mobile aspect ratio grid) or 'feed'

  // Mobile aspect ratio responsive grid calculation
  const numColumns = width < 520 ? 3 : 4;
  const contentWidth = Math.min(width, 480) - 24; // 12px padding on each side
  const gridGap = 8;
  const itemSize = (contentWidth - gridGap * (numColumns - 1)) / numColumns;
  // Mobile portrait aspect ratio (~4:5 ratio) for optimal phone display
  const itemHeight = Math.round(itemSize * 1.15);

  const handlePick = async (type) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: type === 'video' ? ['videos'] : ['images'],
        quality: 0.8,
        allowsEditing: type !== 'video',
      });
      if (!result.canceled && result.assets?.[0]) {
        // Caption is completely optional
        await addMedia({
          type: result.assets[0].type || type,
          uri: result.assets[0].uri,
          caption: caption.trim(),
          uploadedBy: currentUser?.displayName || currentUser?.name || 'Member',
          uploaderId: currentUser?.id || 'guest',
        });
        setCaption('');
        showToast('Media Uploaded! 📸', 'success', 'Added to Navratri 5x5 festival gallery');
      }
    } catch (e) {
      showToast('Upload Error: ' + e.message, 'error');
    }
  };

  const handleDownload = (item) => {
    const filename = `${(item.caption || 'navratri_media').replace(/\s+/g, '_').toLowerCase()}.${item.type === 'video' ? 'mp4' : 'jpg'}`;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        const a = document.createElement('a');
        a.href = item.uri;
        a.download = filename;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast('Media Downloaded! 📥', 'download', `${filename} saved`);
      } catch (e) {
        showToast('Download started', 'info', filename);
      }
    } else {
      showToast('Media Ready in Gallery 📥', 'download', filename);
    }
  };

  const handleDelete = (id) => {
    const doDelete = () => {
      deleteMedia(id);
      setSelectedMediaIndex(null);
      showToast('Media Deleted', 'info');
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm('Are you sure you want to remove this media?')) {
        doDelete();
      }
    } else {
      Alert.alert('Delete Media', 'Are you sure you want to remove this media?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const handleToggleReaction = async (mediaItem, emoji) => {
    if (!currentUser?.id) {
      showToast('Please login to react', 'warning');
      return;
    }
    await reactToMedia(mediaItem.id, emoji, currentUser.id);
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const selectedMedia = selectedMediaIndex !== null ? media[selectedMediaIndex] : null;

  // Render Mobile Aspect Ratio Grid Item
  const renderGridItem = ({ item, index }) => {
    const reactions = item.reactions || {};
    const topReaction = Object.keys(reactions)[0];
    const totalReactions = Object.values(reactions).reduce((sum, users) => sum + users.length, 0);

    return (
      <TouchableOpacity
        style={[styles.gridCell, { width: itemSize, height: itemHeight }]}
        activeOpacity={0.85}
        onPress={() => setSelectedMediaIndex(index)}
      >
        <Image source={{ uri: item.uri }} style={styles.gridImage} resizeMode="cover" />
        
        {item.type === 'video' && (
          <View style={styles.gridVideoBadge}>
            <Ionicons name="play" size={13} color="#FFFFFF" />
          </View>
        )}

        {totalReactions > 0 && (
          <View style={styles.gridReactionPill}>
            <Text style={styles.gridReactionText}>{topReaction} {totalReactions}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Render Feed Card
  const renderFeedItem = ({ item, index }) => {
    const reactions = item.reactions || {};

    return (
      <View style={styles.mediaCard}>
        <View style={styles.feedImageWrap}>
          {item.type === 'video' && Platform.OS === 'web' ? (
            <video
              src={item.uri}
              controls
              style={{ width: '100%', height: 260, objectFit: 'contain', backgroundColor: '#000', borderRadius: 12 }}
            />
          ) : (
            <>
              <Image source={{ uri: item.uri }} style={styles.mediaImage} resizeMode="cover" />
              {item.type === 'video' && (
                <View style={styles.videoOverlay}>
                  <Ionicons name="play-circle" size={54} color="rgba(255,255,255,0.95)" />
                </View>
              )}
            </>
          )}
        </View>

        {/* Reaction Bar */}
        <View style={styles.reactionRow}>
          {REACTION_EMOJIS.map((emoji) => {
            const users = reactions[emoji] || [];
            const hasReacted = users.includes(currentUser?.id);
            return (
              <TouchableOpacity
                key={emoji}
                style={[styles.reactionBtn, hasReacted && styles.reactionBtnActive]}
                onPress={() => handleToggleReaction(item, emoji)}
                activeOpacity={0.7}
              >
                <Text style={styles.reactionEmoji}>{emoji}</Text>
                {users.length > 0 && (
                  <Text style={[styles.reactionCount, hasReacted && styles.reactionCountActive]}>
                    {users.length}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.mediaInfo}>
          {item.caption ? (
            <Text style={styles.mediaCaption}>{item.caption}</Text>
          ) : (
            <Text style={styles.optionalCaptionHint}>Navratri Celebration Memory</Text>
          )}

          <View style={styles.mediaMetaRow}>
            <Text style={styles.mediaMeta}>By {item.uploadedBy} • {formatDate(item.uploadedAt)}</Text>
            <View style={styles.actionBtns}>
              <TouchableOpacity onPress={() => handleDownload(item)} style={styles.downloadBtn}>
                <Ionicons name="download-outline" size={15} color="#059669" />
                <Text style={styles.downloadBtnText}>Save</Text>
              </TouchableOpacity>
              {(item.uploaderId === currentUser?.id || isAdmin) && (
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={15} color="#DC2626" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#D97706', '#EA580C']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Festival Media Gallery</Text>
          <Text style={styles.headerSub}>{media.length} Photos & Videos • Mobile Gallery Grid</Text>
        </View>
        
        {/* Toggle Grid vs Feed View */}
        <TouchableOpacity
          onPress={() => setViewMode(viewMode === 'grid' ? 'feed' : 'grid')}
          style={styles.viewToggleBtn}
          activeOpacity={0.8}
        >
          <Ionicons name={viewMode === 'grid' ? 'list' : 'grid'} size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Upload Section (Caption is Optional) */}
      <View style={styles.uploadSection}>
        <View style={styles.uploadHeaderRow}>
          <Text style={styles.uploadTitle}>Share Navratri Photos & Videos</Text>
          <View style={styles.optionalPill}>
            <Text style={styles.optionalPillText}>Caption Optional</Text>
          </View>
        </View>

        <TextInput
          style={styles.captionInput}
          value={caption}
          onChangeText={setCaption}
          placeholder="Caption (optional, e.g. Day 1 Maha Aarti Pooja)..."
          placeholderTextColor="#94A3B8"
        />

        <View style={styles.uploadBtns}>
          <TouchableOpacity style={styles.uploadBtn} onPress={() => handlePick('image')} activeOpacity={0.8}>
            <Ionicons name="image" size={18} color="#EA580C" />
            <Text style={styles.uploadBtnText}>Upload Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.uploadBtn} onPress={() => handlePick('video')} activeOpacity={0.8}>
            <Ionicons name="videocam" size={18} color="#EA580C" />
            <Text style={styles.uploadBtnText}>Upload Video</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Grid or Feed Layout */}
      {viewMode === 'grid' ? (
        <FlatList
          key={`mobile-grid-${numColumns}`}
          data={media}
          numColumns={numColumns}
          renderItem={renderGridItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.gridRowWrapper}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="images-outline" size={52} color="#94A3B8" />
              <Text style={styles.emptyText}>No festival media uploaded yet</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          key="single-feed"
          data={media}
          renderItem={renderFeedItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.feedContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="images-outline" size={52} color="#94A3B8" />
              <Text style={styles.emptyText}>No festival media uploaded yet</Text>
            </View>
          }
        />
      )}

      {/* Media Detail & Reaction Lightbox Modal */}
      {selectedMedia && (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedMediaIndex(null)}
        >
          <View style={styles.lightboxOverlay}>
            <View style={styles.lightboxCard}>
              {/* Modal Top Bar */}
              <View style={styles.lightboxHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lightboxUploader} numberOfLines={1}>
                    By {selectedMedia.uploadedBy}
                  </Text>
                  <Text style={styles.lightboxDate}>
                    {formatDate(selectedMedia.uploadedAt)}
                  </Text>
                </View>

                <View style={styles.lightboxHeaderActions}>
                  <TouchableOpacity
                    onPress={() => handleDownload(selectedMedia)}
                    style={styles.modalActionBtn}
                  >
                    <Ionicons name="download-outline" size={18} color="#059669" />
                  </TouchableOpacity>

                  {(selectedMedia.uploaderId === currentUser?.id || isAdmin) && (
                    <TouchableOpacity
                      onPress={() => handleDelete(selectedMedia.id)}
                      style={[styles.modalActionBtn, { backgroundColor: '#FEE2E2' }]}
                    >
                      <Ionicons name="trash-outline" size={18} color="#DC2626" />
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={() => setSelectedMediaIndex(null)}
                    style={styles.modalActionBtn}
                  >
                    <Ionicons name="close" size={20} color="#1E293B" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Main Media Preview with Interactive Video Playback */}
              <View style={styles.lightboxPreviewWrap}>
                {selectedMedia.type === 'video' && Platform.OS === 'web' ? (
                  <video
                    src={selectedMedia.uri}
                    controls
                    autoPlay
                    style={{
                      width: '100%',
                      height: 280,
                      borderRadius: 14,
                      backgroundColor: '#000',
                      objectFit: 'contain',
                    }}
                  />
                ) : (
                  <>
                    <Image
                      source={{ uri: selectedMedia.uri }}
                      style={styles.lightboxImage}
                      resizeMode="contain"
                    />
                    {selectedMedia.type === 'video' && (
                      <View style={styles.videoOverlay}>
                        <Ionicons name="play-circle" size={64} color="rgba(255,255,255,0.9)" />
                      </View>
                    )}
                  </>
                )}

                {/* Left / Right Nav Arrows */}
                {selectedMediaIndex > 0 && (
                  <TouchableOpacity
                    style={[styles.navArrow, styles.navArrowLeft]}
                    onPress={() => setSelectedMediaIndex(selectedMediaIndex - 1)}
                  >
                    <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
                {selectedMediaIndex < media.length - 1 && (
                  <TouchableOpacity
                    style={[styles.navArrow, styles.navArrowRight]}
                    onPress={() => setSelectedMediaIndex(selectedMediaIndex + 1)}
                  >
                    <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Caption (Optional) */}
              <View style={styles.lightboxCaptionWrap}>
                <Text style={styles.lightboxCaption}>
                  {selectedMedia.caption || 'Navratri Mahotsav 2026 Celebration'}
                </Text>
              </View>

              {/* Emoji Reaction Selector */}
              <View style={styles.lightboxReactionSection}>
                <Text style={styles.reactionPrompt}>React with Emoji:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lightboxReactionRow}>
                  {REACTION_EMOJIS.map((emoji) => {
                    const reactions = selectedMedia.reactions || {};
                    const users = reactions[emoji] || [];
                    const hasReacted = users.includes(currentUser?.id);

                    return (
                      <TouchableOpacity
                        key={emoji}
                        style={[styles.modalEmojiBtn, hasReacted && styles.modalEmojiBtnActive]}
                        onPress={() => handleToggleReaction(selectedMedia, emoji)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.modalEmojiText}>{emoji}</Text>
                        {users.length > 0 && (
                          <Text style={[styles.modalEmojiCount, hasReacted && styles.modalEmojiCountActive]}>
                            {users.length}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backBtn: { padding: 4 },
  headerTitleWrap: { alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.9)', marginTop: 2, fontWeight: '600' },
  viewToggleBtn: {
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
  },
  uploadSection: {
    backgroundColor: '#FFFFFF',
    margin: 14,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    maxWidth: 440,
    alignSelf: 'center',
    width: '92%',
  },
  uploadHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadTitle: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  optionalPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  optionalPillText: { fontSize: 10, fontWeight: '700', color: '#B45309' },
  captionInput: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1E293B',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  uploadBtns: { flexDirection: 'row', gap: 8 },
  uploadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFEDD5',
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  uploadBtnText: { fontSize: 12, fontWeight: '700', color: '#C2410C' },

  // Mobile Responsive Grid Styles
  gridContainer: {
    paddingHorizontal: 12,
    paddingBottom: 40,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  gridRowWrapper: {
    justifyContent: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  gridCell: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FEF3C7',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridVideoBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 8,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridReactionPill: {
    position: 'absolute',
    bottom: 3,
    left: 3,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  gridReactionText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Feed Styles
  feedContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  mediaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  feedImageWrap: {
    position: 'relative',
    width: '100%',
    height: 220,
    backgroundColor: '#FFFBEB',
  },
  mediaImage: { width: '100%', height: '100%' },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  reactionRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#FEF3C7',
    backgroundColor: '#FFFDF7',
    flexWrap: 'wrap',
  },
  reactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reactionBtnActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  reactionCountActive: { color: '#B45309' },

  mediaInfo: { padding: 12 },
  mediaCaption: { fontSize: 13.5, fontWeight: '700', color: '#1E293B', lineHeight: 18 },
  optionalCaptionHint: { fontSize: 12, fontStyle: 'italic', color: '#94A3B8' },
  mediaMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  mediaMeta: { fontSize: 11, color: '#64748B', flex: 1 },
  actionBtns: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  downloadBtnText: { fontSize: 11, fontWeight: '700', color: '#059669' },
  deleteBtn: { padding: 6, backgroundColor: '#FEE2E2', borderRadius: 8 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#94A3B8', marginTop: 12, fontWeight: '500' },

  // Lightbox Modal
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  lightboxCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    width: '100%',
    maxWidth: 420,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  lightboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  lightboxUploader: { fontSize: 13.5, fontWeight: '800', color: '#1E293B' },
  lightboxDate: { fontSize: 10.5, color: '#64748B', marginTop: 1 },
  lightboxHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modalActionBtn: {
    padding: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  lightboxPreviewWrap: {
    position: 'relative',
    width: '100%',
    height: 280,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: { width: '100%', height: '100%' },
  navArrow: {
    position: 'absolute',
    top: '44%',
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navArrowLeft: { left: 8 },
  navArrowRight: { right: 8 },
  lightboxCaptionWrap: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  lightboxCaption: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 18,
  },
  lightboxReactionSection: {
    padding: 12,
    backgroundColor: '#FFFDF7',
  },
  reactionPrompt: {
    fontSize: 11,
    fontWeight: '800',
    color: '#78350F',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  lightboxReactionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  modalEmojiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  modalEmojiBtnActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  modalEmojiText: { fontSize: 16 },
  modalEmojiCount: { fontSize: 11, fontWeight: '800', color: '#64748B' },
  modalEmojiCountActive: { color: '#B45309' },
});
