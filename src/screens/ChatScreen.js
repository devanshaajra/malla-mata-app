import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList,
  KeyboardAvoidingView, Platform, Alert, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';

// WhatsApp-style Navratri & community Sticker Packs
const WHATSAPP_STICKERS = [
  {
    id: 'st-1',
    emoji: '🪔',
    text: 'Jay Ambe Maa!',
    sub: 'Navratri Mahotsav',
    badgeBg: '#FEF3C7',
    borderColor: '#F59E0B',
    textColor: '#9A3412',
  },
  {
    id: 'st-2',
    emoji: '🔱',
    text: 'Jai Mata Di!',
    sub: 'Maa Durga Shakti',
    badgeBg: '#FEE2E2',
    borderColor: '#EF4444',
    textColor: '#991B1B',
  },
  {
    id: 'st-3',
    emoji: '🌸',
    text: 'Shubh Navratri',
    sub: 'Divine Blessings',
    badgeBg: '#FCE7F3',
    borderColor: '#EC4899',
    textColor: '#9D174D',
  },
  {
    id: 'st-4',
    emoji: '💃',
    text: 'Garba Raas Ready!',
    sub: 'Dandiya Beats',
    badgeBg: '#FFEDD5',
    borderColor: '#F97316',
    textColor: '#C2410C',
  },
  {
    id: 'st-5',
    emoji: '🔥',
    text: '8 PM Maha Aarti',
    sub: 'Be Present Together',
    badgeBg: '#FEF08A',
    borderColor: '#EAB308',
    textColor: '#854D0E',
  },
  {
    id: 'st-6',
    emoji: '🥥',
    text: 'Maha Prasad Seva',
    sub: 'Bhog Vandana',
    badgeBg: '#DCFCE7',
    borderColor: '#22C55E',
    textColor: '#166534',
  },
  {
    id: 'st-7',
    emoji: '🕉️',
    text: 'Om Dum Durgaye Namah',
    sub: 'Mantra Jaap',
    badgeBg: '#EDE9FE',
    borderColor: '#8B5CF6',
    textColor: '#5B21B6',
  },
  {
    id: 'st-8',
    emoji: '🥁',
    text: 'Dhol & Nagada Beats',
    sub: 'Garba Night Fever',
    badgeBg: '#CFFAFE',
    borderColor: '#06B6D4',
    textColor: '#155E75',
  },
  {
    id: 'st-9',
    emoji: '🙏',
    text: 'Pranam Members!',
    sub: 'Good Morning Blessings',
    badgeBg: '#FEF3C7',
    borderColor: '#F59E0B',
    textColor: '#9A3412',
  },
  {
    id: 'st-10',
    emoji: '🎉',
    text: 'Jai Ho! Dandiya King',
    sub: 'Navratri Garba Winner',
    badgeBg: '#DCFCE7',
    borderColor: '#16A34A',
    textColor: '#14532D',
  },
];

export default function ChatScreen({ navigation }) {
  const { currentUser, isAdmin } = useAuth();
  const { messages, sendMessage, deleteMessage } = useData();
  const { showToast } = useToast();

  const [text, setText] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const flatListRef = useRef();

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSendText = async () => {
    if (!text.trim()) return;
    await sendMessage({
      type: 'text',
      text: text.trim(),
      senderId: currentUser.id,
      senderName: currentUser.displayName || currentUser.name || 'Member',
    });
    setText('');
    setShowStickers(false);
  };

  const handleSendSticker = async (sticker) => {
    await sendMessage({
      type: 'sticker',
      sticker,
      text: `[Sticker: ${sticker.text}]`,
      senderId: currentUser.id,
      senderName: currentUser.displayName || currentUser.name || 'Member',
    });
    setShowStickers(false);
    showToast('Sticker Sent! 🪔', 'success', sticker.text);
  };

  const handleDelete = (id) => {
    if (!isAdmin) return;
    Alert.alert('Delete Message', 'Delete this message for everyone in the community?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMessage(id) },
    ]);
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    const hrs = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${hrs}:${mins}`;
  };

  const formatDate = (ts) => {
    const d = new Date(ts);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  const renderItem = ({ item, index }) => {
    const isMine = item.senderId === currentUser?.id;
    const showDate = index === 0 || formatDate(item.timestamp) !== formatDate(messages[index - 1]?.timestamp);

    return (
      <View>
        {showDate && (
          <View style={styles.dateBubble}>
            <Text style={styles.dateText}>{formatDate(item.timestamp)}</Text>
          </View>
        )}

        <TouchableOpacity
          activeOpacity={isAdmin ? 0.7 : 1}
          onLongPress={() => isAdmin && handleDelete(item.id)}
          style={[styles.msgRow, isMine && styles.msgRowRight]}
        >
          {item.type === 'sticker' && item.sticker ? (
            // WhatsApp-style Sticker Rendering
            <View style={[styles.stickerCard, isMine ? styles.mySticker : styles.otherSticker, { backgroundColor: item.sticker.badgeBg, borderColor: item.sticker.borderColor }]}>
              {!isMine && <Text style={styles.stickerSender}>{item.senderName}</Text>}
              <View style={styles.stickerBody}>
                <Text style={styles.stickerEmoji}>{item.sticker.emoji}</Text>
                <View style={{ flexShrink: 1 }}>
                  <Text style={[styles.stickerText, { color: item.sticker.textColor }]}>
                    {item.sticker.text}
                  </Text>
                  {item.sticker.sub ? (
                    <Text style={styles.stickerSub}>{item.sticker.sub}</Text>
                  ) : null}
                </View>
              </View>
              <Text style={styles.stickerTime}>{formatTime(item.timestamp)}</Text>
            </View>
          ) : (
            // Regular Text Message
            <View style={[styles.msgBubble, isMine ? styles.myBubble : styles.otherBubble]}>
              {!isMine && <Text style={styles.senderName}>{item.senderName}</Text>}
              <Text style={[styles.msgText, isMine && styles.myMsgText]}>{item.text}</Text>
              <Text style={[styles.timeText, isMine && styles.myTimeText]}>{formatTime(item.timestamp)}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#16A34A', '#22C55E']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Community Discussion</Text>
          <Text style={styles.headerSub}>{messages.length} Community Messages</Text>
        </View>
        <View style={{ width: 32 }} />
      </LinearGradient>

      {/* Auto-delete & Retention Policy Notice */}
      <View style={styles.retentionBanner}>
        <Ionicons name="time-outline" size={14} color="#065F46" />
        <Text style={styles.retentionBannerText}>
          Chats are stored for 15 days • Automatically deleted after 21 days
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={52} color="#94A3B8" />
              <Text style={styles.emptyText}>No messages yet. Send a festive sticker to start!</Text>
            </View>
          }
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {/* WhatsApp Stickers Drawer */}
        {showStickers && (
          <View style={styles.stickerDrawer}>
            <View style={styles.stickerDrawerHeader}>
              <Text style={styles.stickerDrawerTitle}>WhatsApp Navratri Stickers</Text>
              <TouchableOpacity onPress={() => setShowStickers(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.stickersScroll}
            >
              {WHATSAPP_STICKERS.map((st) => (
                <TouchableOpacity
                  key={st.id}
                  style={[styles.stickerPickItem, { backgroundColor: st.badgeBg, borderColor: st.borderColor }]}
                  onPress={() => handleSendSticker(st)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.stickerPickEmoji}>{st.emoji}</Text>
                  <Text style={[styles.stickerPickText, { color: st.textColor }]} numberOfLines={1}>
                    {st.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Chat Input Bar */}
        <View style={styles.inputBar}>
          {/* Sticker Button */}
          <TouchableOpacity
            style={[styles.stickerToggleBtn, showStickers && styles.stickerToggleBtnActive]}
            onPress={() => setShowStickers(!showStickers)}
            activeOpacity={0.8}
          >
            <Ionicons name="happy-outline" size={22} color={showStickers ? '#16A34A' : '#64748B'} />
          </TouchableOpacity>

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={text}
              onChangeText={setText}
              placeholder="Type message or choose a sticker..."
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={1000}
            />
          </View>

          <TouchableOpacity onPress={handleSendText} activeOpacity={0.8} style={styles.sendBtnTouchable}>
            <LinearGradient colors={['#16A34A', '#22C55E']} style={styles.sendBtn}>
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backBtn: { padding: 4 },
  headerTitleWrap: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.9)', marginTop: 1, fontWeight: '600' },
  
  retentionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#D1FAE5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
  },
  retentionBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },

  chatArea: { flex: 1, maxWidth: 440, width: '100%', alignSelf: 'center' },
  messageList: { padding: 16, paddingBottom: 12 },
  dateBubble: {
    alignSelf: 'center',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  dateText: { fontSize: 11, color: '#475569', fontWeight: '700' },
  msgRow: { marginBottom: 10, alignItems: 'flex-start' },
  msgRowRight: { alignItems: 'flex-end' },
  msgBubble: {
    maxWidth: '82%',
    borderRadius: 18,
    padding: 12,
    paddingBottom: 6,
  },
  myBubble: {
    backgroundColor: '#DCFCE7',
    borderBottomRightRadius: 4,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  senderName: { fontSize: 11, fontWeight: '800', color: '#166534', marginBottom: 3 },
  msgText: { fontSize: 14, color: '#1E293B', lineHeight: 20, fontWeight: '500' },
  myMsgText: { color: '#14532D' },
  timeText: { fontSize: 10, color: '#64748B', alignSelf: 'flex-end', marginTop: 4, fontWeight: '500' },
  myTimeText: { color: '#15803D' },

  // WhatsApp Sticker Message Card
  stickerCard: {
    borderRadius: 16,
    padding: 10,
    borderWidth: 2,
    maxWidth: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mySticker: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 2,
  },
  otherSticker: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 2,
  },
  stickerSender: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 4,
  },
  stickerBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stickerEmoji: {
    fontSize: 32,
  },
  stickerText: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  stickerSub: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 1,
  },
  stickerTime: {
    fontSize: 9.5,
    color: '#64748B',
    alignSelf: 'flex-end',
    marginTop: 4,
    fontWeight: '600',
  },

  // Stickers Tray Drawer
  stickerDrawer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  stickerDrawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  stickerDrawerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
    textTransform: 'uppercase',
  },
  stickersScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  stickerPickItem: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 4,
    minWidth: 90,
  },
  stickerPickEmoji: {
    fontSize: 24,
  },
  stickerPickText: {
    fontSize: 11,
    fontWeight: '800',
  },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  stickerToggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  stickerToggleBtnActive: {
    backgroundColor: '#DCFCE7',
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  textInput: {
    fontSize: 14,
    color: '#1E293B',
    maxHeight: 80,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  sendBtnTouchable: {
    alignSelf: 'flex-end',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 14, color: '#94A3B8', marginTop: 12, fontWeight: '500' },
});
