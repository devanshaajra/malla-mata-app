import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList,
  Modal, ScrollView, Platform, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { AARTI_DATES } from '../utils/constants';

const PRIORITIES = ['High', 'Medium', 'Normal'];
const STATUSES = ['Pending', 'In Progress', 'Completed'];

export default function TasksScreen({ navigation }) {
  const { currentUser, isSuperuser, isAdmin: rawIsAdmin, hasControl } = useAuth();
  const isAdmin = isSuperuser || (rawIsAdmin && (hasControl ? hasControl('manageTasks') : true));
  const { tasks, addTask, updateTask, deleteTask, sendTaskReminder, members } = useData();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('my'); // 'my' | 'all' | 'pending' | 'completed'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [reminderTaskId, setReminderTaskId] = useState(null);
  const [reminderText, setReminderText] = useState('');

  // Form State
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState([]);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [dueDate, setDueDate] = useState('11-10-2026');
  const [priority, setPriority] = useState('High');
  const [status, setStatus] = useState('Pending');

  // Compute Today's Date formatted as DD-MM-YYYY
  const today = new Date();
  const todayStr = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`;

  // Check if current user is an assignee of a task
  const isUserAssigned = (task) => {
    return (task.assignedTo || []).some(
      a => a.id === currentUser?.id || a.name?.toLowerCase() === (currentUser?.displayName || currentUser?.name)?.toLowerCase()
    );
  };

  // User's today's pending tasks count
  const todayPendingTasks = (tasks || []).filter(t => {
    if (!t) return false;
    const assigned = isUserAssigned(t);
    const isDueTodayOrActive = (t.dueDate === todayStr || t.status === 'Pending' || t.status === 'In Progress');
    return assigned && isDueTodayOrActive && t.status !== 'Completed';
  });

  // Filtered tasks list
  const filteredTasks = (tasks || []).filter(t => {
    if (!t) return false;
    const q = (searchQuery || '').toLowerCase();
    const matchesSearch =
      (t.name || '').toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (t.assignedBy?.name || '').toLowerCase().includes(q) ||
      (t.assignedTo || []).some(a => (a?.name || '').toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (activeTab === 'my') return isUserAssigned(t);
    if (activeTab === 'pending') return t.status === 'Pending' || t.status === 'In Progress';
    if (activeTab === 'completed') return t.status === 'Completed';
    return true; // 'all'
  });

  // Open Create / Edit Modal
  const openCreateModal = () => {
    setEditingTask(null);
    setTaskName('');
    setDescription('');
    setSelectedAssigneeIds([]);
    setDueDate('11-10-2026');
    setPriority('High');
    setStatus('Pending');
    setShowCreateModal(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setTaskName(task.name);
    setDescription(task.description || '');
    setSelectedAssigneeIds((task.assignedTo || []).map(a => a.id));
    setDueDate(task.dueDate || '11-10-2026');
    setPriority(task.priority || 'High');
    setStatus(task.status || 'Pending');
    setShowCreateModal(true);
  };

  // Toggle Member Selection in Dropdown Multi-Select
  const toggleAssignee = (member) => {
    if (selectedAssigneeIds.includes(member.id)) {
      setSelectedAssigneeIds(selectedAssigneeIds.filter(id => id !== member.id));
    } else {
      setSelectedAssigneeIds([...selectedAssigneeIds, member.id]);
    }
  };

  // Save Task (Create or Update)
  const handleSaveTask = async () => {
    if (!taskName.trim()) {
      showToast('Task Name is required', 'warning');
      return;
    }

    if (selectedAssigneeIds.length === 0) {
      showToast('Please assign to at least 1 person', 'warning');
      return;
    }

    // Resolve assignedTo objects
    const assignedToObjects = (members || [])
      .filter(m => selectedAssigneeIds.includes(m?.id))
      .map(m => ({ id: m.id, name: m.name, role: m.designation || m.role || 'Member' }));

    const taskPayload = {
      name: taskName.trim(),
      description: description.trim(),
      assignedTo: assignedToObjects,
      dueDate,
      priority,
      status,
    };

    if (editingTask) {
      const res = await updateTask(editingTask.id, taskPayload, currentUser);
      if (res?.success) {
        showToast('Task Updated! 📝', 'success', `Saved changes for "${taskName}"`);
        setShowCreateModal(false);
      } else {
        showToast(res?.error || 'Failed to update task', 'error');
      }
    } else {
      const res = await addTask(taskPayload, currentUser);
      if (res?.success) {
        showToast('Task Assigned! 📋', 'success', `Assigned to ${assignedToObjects.map(a => a.name).join(', ')}`);
        setShowCreateModal(false);
      } else {
        showToast(res?.error || 'Failed to create task', 'error');
      }
    }
  };

  // Delete Task (Superuser only)
  const handleDeleteTask = (task) => {
    if (!isSuperuser) {
      showToast(
        'Superuser Only 🔒',
        'warning',
        'Only Superuser has rights to delete tasks. Admins can edit and save only.'
      );
      return;
    }

    const doDelete = async () => {
      const res = await deleteTask(task.id, currentUser);
      if (res?.success) {
        showToast('Task Deleted', 'delete', `Removed "${task.name}"`);
      } else {
        showToast(res?.error || 'Failed to delete task', 'error');
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`Are you sure you want to delete task "${task.name}"?`)) {
        doDelete();
      }
    } else {
      Alert.alert('Delete Task', `Are you sure you want to delete task "${task.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  // Toggle Task Status (Pending -> In Progress -> Completed)
  const handleCycleStatus = async (task) => {
    const nextStatus =
      task.status === 'Pending'
        ? 'In Progress'
        : task.status === 'In Progress'
        ? 'Completed'
        : 'Pending';

    const res = await updateTask(task.id, { status: nextStatus }, currentUser);
    if (res?.success) {
      showToast(`Status: ${nextStatus}`, 'success', task.name);
    } else {
      showToast(res?.error || 'Could not update status', 'warning');
    }
  };

  // Send Task Reminder / Announcement
  const handleSendReminder = async () => {
    if (!reminderText.trim()) {
      showToast('Please enter reminder text', 'warning');
      return;
    }

    const res = await sendTaskReminder(reminderTaskId, reminderText.trim(), currentUser);
    if (res?.success) {
      showToast('Reminder Broadcasted! 📢', 'success', 'Notification sent to assignees & chat');
      setReminderTaskId(null);
      setReminderText('');
    } else {
      showToast(res?.error || 'Failed to send reminder', 'error');
    }
  };

  const getPriorityColor = (p) => {
    if (p === 'High') return { bg: '#FEE2E2', border: '#FCA5A5', text: '#DC2626' };
    if (p === 'Medium') return { bg: '#FFEDD5', border: '#FED7AA', text: '#EA580C' };
    return { bg: '#F1F5F9', border: '#CBD5E1', text: '#475569' };
  };

  const getStatusColor = (s) => {
    if (s === 'Completed') return { bg: '#DCFCE7', border: '#86EFAC', text: '#166534', icon: 'checkmark-circle' };
    if (s === 'In Progress') return { bg: '#DBEAFE', border: '#93C5FD', text: '#1D4ED8', icon: 'hourglass' };
    return { bg: '#FEF3C7', border: '#FDE68A', text: '#B45309', icon: 'time-outline' };
  };

  const renderTaskCard = ({ item }) => {
    const pStyle = getPriorityColor(item.priority);
    const sStyle = getStatusColor(item.status);
    const isAssignedToMe = isUserAssigned(item);
    const canEdit = isSuperuser || isAdmin;

    return (
      <View style={[styles.taskCard, isAssignedToMe && styles.taskCardAssignedToMe]}>
        {/* Top Badges Row */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.badgeGroup}>
            <View style={[styles.statusBadge, { backgroundColor: sStyle.bg, borderColor: sStyle.border }]}>
              <Ionicons name={sStyle.icon} size={12} color={sStyle.text} />
              <Text style={[styles.statusText, { color: sStyle.text }]}>{item.status}</Text>
            </View>

            <View style={[styles.priorityBadge, { backgroundColor: pStyle.bg, borderColor: pStyle.border }]}>
              <Text style={[styles.priorityText, { color: pStyle.text }]}>{item.priority} Priority</Text>
            </View>
          </View>

          <View style={styles.dueDateBadge}>
            <Ionicons name="calendar-outline" size={13} color="#EA580C" />
            <Text style={styles.dueDateText}>Due: {item.dueDate || 'Navratri'}</Text>
          </View>
        </View>

        {/* Task Title & Description */}
        <Text style={styles.taskTitle}>{item.name}</Text>
        {item.description ? (
          <Text style={styles.taskDesc}>{item.description}</Text>
        ) : null}

        {/* Superuser Special View: Track Admin ➔ Member Assignment */}
        {isSuperuser && (
          <View style={styles.superuserAssignmentAudit}>
            <Ionicons name="git-branch-outline" size={14} color="#B45309" />
            <Text style={styles.superuserAssignmentText}>
              Assigned by Admin: <Text style={{ fontWeight: '800' }}>{item.assignedBy?.name || 'Devansh'}</Text> ({item.assignedBy?.role || 'Admin'})
            </Text>
          </View>
        )}

        {/* Normal Assigned By for non-superusers */}
        {!isSuperuser && (
          <View style={styles.assignedByRow}>
            <Text style={styles.assignedByText}>
              Assigned by {item.assignedBy?.name || 'Admin'}
            </Text>
          </View>
        )}

        {/* Assigned Members (1 or more persons) */}
        <View style={styles.assigneesSection}>
          <Text style={styles.assigneesLabel}>Assigned Members ({item.assignedTo?.length || 0}):</Text>
          <View style={styles.assigneesWrap}>
            {(item.assignedTo || []).map((m, idx) => (
              <View key={m.id || idx} style={styles.assigneeChip}>
                <View style={styles.assigneeAvatarSmall}>
                  <Text style={styles.assigneeInitial}>{m.name.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.assigneeName} numberOfLines={1}>{m.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Announcements & Reminders List (if any) */}
        {item.announcements && item.announcements.length > 0 && (
          <View style={styles.announcementsBox}>
            <View style={styles.announcementHead}>
              <Ionicons name="megaphone-outline" size={14} color="#B45309" />
              <Text style={styles.announcementHeadText}>Latest Announcement / Reminder</Text>
            </View>
            {item.announcements.slice(-2).map((ann, i) => (
              <Text key={ann.id || i} style={styles.announcementItemText}>
                • {ann.text} <Text style={styles.announcementSender}>— {ann.senderName}</Text>
              </Text>
            ))}
          </View>
        )}

        {/* Action Buttons Row */}
        <View style={styles.actionBtnsRow}>
          {/* Status Cycle Button */}
          <TouchableOpacity
            style={[styles.statusActionBtn, { borderColor: sStyle.border }]}
            onPress={() => handleCycleStatus(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="swap-horizontal" size={14} color={sStyle.text} />
            <Text style={[styles.statusActionText, { color: sStyle.text }]}>Change Status</Text>
          </TouchableOpacity>

          {/* Announcement / Reminder Button (Admins & Superuser) */}
          {canEdit && (
            <TouchableOpacity
              style={styles.remindBtn}
              onPress={() => {
                setReminderTaskId(item.id);
                setReminderText('');
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={14} color="#D97706" />
              <Text style={styles.remindBtnText}>Remind</Text>
            </TouchableOpacity>
          )}

          {/* Edit Button (Admins & Superuser) */}
          {canEdit && (
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => openEditModal(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={15} color="#2563EB" />
            </TouchableOpacity>
          )}

          {/* Delete Button (STRICTLY SUPERUSER ONLY) */}
          {isSuperuser && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDeleteTask(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={15} color="#DC2626" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Festival Tasks & Seva</Text>
          <Text style={styles.headerSub}>{tasks.length} Total Navratri Tasks</Text>
        </View>

        {/* Add Task Button (Admins & Superuser) */}
        {(isAdmin || isSuperuser) ? (
          <TouchableOpacity onPress={openCreateModal} style={styles.addTaskHeaderBtn} activeOpacity={0.8}>
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </LinearGradient>

      {/* Role Authority Indicator */}
      <View style={styles.roleBanner}>
        <Ionicons
          name={isSuperuser ? 'shield-checkmark' : isAdmin ? 'ribbon' : 'person-circle'}
          size={16}
          color="#1E3A8A"
        />
        <Text style={styles.roleBannerText}>
          {isSuperuser
            ? 'Superuser Lead: Full rights to assign, edit, save, delete tasks & audit assignments.'
            : isAdmin
            ? 'Admin: You can assign, edit and save tasks. Delete is reserved for Superuser.'
            : 'Member Portal: View your assigned tasks and update status.'}
        </Text>
      </View>

      {/* Frequently Shown Today's Pending Tasks Reminder Banner */}
      {todayPendingTasks.length > 0 && (
        <TouchableOpacity
          style={styles.pendingAlertBanner}
          onPress={() => setActiveTab('my')}
          activeOpacity={0.9}
        >
          <View style={styles.pendingAlertLeft}>
            <View style={styles.pulseDot} />
            <Ionicons name="alert-circle" size={20} color="#DC2626" />
            <View style={{ flex: 1 }}>
              <Text style={styles.pendingAlertTitle}>Your Today's Task is Pending!</Text>
              <Text style={styles.pendingAlertSub}>
                You have {todayPendingTasks.length} pending task(s) assigned to you for today.
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#DC2626" />
        </TouchableOpacity>
      )}

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        {[
          { id: 'my', label: 'My Tasks', icon: 'person' },
          { id: 'all', label: 'All Tasks', icon: 'list' },
          { id: 'pending', label: 'Pending', icon: 'time' },
          { id: 'completed', label: 'Completed', icon: 'checkmark-circle' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={tab.icon}
                size={13}
                color={isActive ? '#FFFFFF' : '#64748B'}
              />
              <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search Input */}
      <View style={styles.searchBarWrap}>
        <Ionicons name="search-outline" size={16} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search task, assigned member or admin..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={16} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tasks List */}
      <FlatList
        data={filteredTasks}
        renderItem={renderTaskCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="checkbox-outline" size={54} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Tasks Found</Text>
            <Text style={styles.emptySub}>
              {activeTab === 'my'
                ? "You have no tasks assigned to you right now. Jay Ambe!"
                : "No matching tasks found."}
            </Text>
          </View>
        }
      />

      {/* Create / Edit Task Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingTask ? 'Edit Task Details' : 'Assign New Seva Task'}
              </Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              {/* Task Name */}
              <Text style={styles.inputLabel}>TASK NAME *</Text>
              <TextInput
                style={styles.textInput}
                value={taskName}
                onChangeText={setTaskName}
                placeholder="e.g. Stage Flower & Toran Setup"
                placeholderTextColor="#94A3B8"
              />

              {/* Description */}
              <Text style={styles.inputLabel}>INSTRUCTIONS & DETAILS</Text>
              <TextInput
                style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Instructions for the assigned members..."
                placeholderTextColor="#94A3B8"
                multiline
              />

              {/* Assign To: Multi-Select Members Dropdown List (Fix overlapping) */}
              <View style={styles.assignHeaderRow}>
                <Text style={styles.inputLabel}>ASSIGN TO (SELECT 1 OR MORE PERSONS) *</Text>
                <Text style={styles.inputSubHint}>
                  Selected: {selectedAssigneeIds.length} members
                </Text>
              </View>

              {/* Quick Member Filter */}
              <View style={styles.assignSearchRow}>
                <Ionicons name="search-outline" size={15} color="#94A3B8" />
                <TextInput
                  style={styles.assignSearchInput}
                  placeholder="Filter member by name..."
                  placeholderTextColor="#94A3B8"
                  value={assigneeSearch}
                  onChangeText={setAssigneeSearch}
                />
                {assigneeSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setAssigneeSearch('')}>
                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.multiSelectContainerWrapper}>
                <ScrollView
                  style={styles.multiSelectScroll}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                >
                  {members
                    .filter(m => (m.name || '').toLowerCase().includes(assigneeSearch.toLowerCase()))
                    .map((member) => {
                      const isSelected = selectedAssigneeIds.includes(member.id);
                      return (
                        <TouchableOpacity
                          key={member.id}
                          style={[styles.memberSelectRow, isSelected && styles.memberSelectRowActive]}
                          onPress={() => toggleAssignee(member)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={isSelected ? 'checkbox' : 'square-outline'}
                            size={20}
                            color={isSelected ? '#2563EB' : '#94A3B8'}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.selectMemberName, isSelected && styles.selectMemberNameActive]}>
                              {member.name}
                            </Text>
                            <Text style={styles.selectMemberDesig}>
                              {member.designation || member.role || 'Member'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>
              </View>

              {/* Due Date */}
              <Text style={styles.inputLabel}>TARGET / DUE DATE *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateSelectorRow}>
                {AARTI_DATES.map((item) => {
                  const dateStr = item.date || item;
                  const isSelected = dueDate === dateStr;
                  return (
                    <TouchableOpacity
                      key={dateStr}
                      style={[styles.dateChip, isSelected && styles.dateChipActive]}
                      onPress={() => setDueDate(dateStr)}
                    >
                      <Text style={[styles.dateChipDay, isSelected && styles.dateChipDayActive]}>
                        {item.day || dateStr.slice(0, 5)}
                      </Text>
                      <Text style={[styles.dateChipLabel, isSelected && styles.dateChipLabelActive]}>
                        {item.label || dateStr}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Priority Selection */}
              <Text style={styles.inputLabel}>TASK PRIORITY</Text>
              <View style={styles.optionRow}>
                {PRIORITIES.map((p) => {
                  const isSelected = priority === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[styles.optionBtn, isSelected && styles.optionBtnActive]}
                      onPress={() => setPriority(p)}
                    >
                      <Text style={[styles.optionBtnText, isSelected && styles.optionBtnTextActive]}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Status Selection */}
              <Text style={styles.inputLabel}>STATUS</Text>
              <View style={styles.optionRow}>
                {STATUSES.map((s) => {
                  const isSelected = status === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.optionBtn, isSelected && styles.optionBtnActive]}
                      onPress={() => setStatus(s)}
                    >
                      <Text style={[styles.optionBtnText, isSelected && styles.optionBtnTextActive]}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={handleSaveTask}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.saveBtn}>
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>
                    {editingTask ? 'Save Changes' : 'Assign Task Now'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Send Reminder / Announcement Modal */}
      <Modal
        visible={reminderTaskId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setReminderTaskId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Task Reminder</Text>
              <TouchableOpacity onPress={() => setReminderTaskId(null)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>ANNOUNCEMENT / REMINDER MESSAGE *</Text>
            <TextInput
              style={[styles.textInput, { height: 90, textAlignVertical: 'top' }]}
              value={reminderText}
              onChangeText={setReminderText}
              placeholder="e.g. Please finish stage flower arrangement by 5 PM before Aarti..."
              placeholderTextColor="#94A3B8"
              multiline
            />
            <Text style={styles.inputSubHint}>
              This announcement will be saved on this task and broadcasted to members!
            </Text>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setReminderTaskId(null)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={handleSendReminder}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#D97706', '#EA580C']} style={styles.saveBtn}>
                  <Ionicons name="megaphone" size={16} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Broadcast Reminder</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backBtn: { padding: 4 },
  headerTitleWrap: { alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.9)', marginTop: 1, fontWeight: '600' },
  addTaskHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  roleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  roleBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E40AF',
    flex: 1,
    lineHeight: 15,
  },

  // Today's Pending Alert Banner
  pendingAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  pendingAlertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },
  pendingAlertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991B1B',
  },
  pendingAlertSub: {
    fontSize: 11,
    color: '#B91C1C',
    fontWeight: '600',
    marginTop: 1,
  },

  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 6,
    marginTop: 12,
    maxWidth: 440,
    alignSelf: 'center',
    width: '100%',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabBtnActive: {
    backgroundColor: '#2563EB',
    borderColor: '#1D4ED8',
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    maxWidth: 440,
    alignSelf: 'center',
    width: '92%',
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#1E293B',
    fontWeight: '600',
    height: '100%',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },

  listContainer: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  taskCardAssignedToMe: {
    borderColor: '#93C5FD',
    backgroundColor: '#F8FAFF',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '800',
  },
  dueDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  dueDateText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C2410C',
  },

  taskTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1E293B',
    lineHeight: 20,
    marginBottom: 4,
  },
  taskDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 10,
  },

  // Superuser Audit Track
  superuserAssignmentAudit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  superuserAssignmentText: {
    fontSize: 11,
    color: '#78350F',
    fontWeight: '600',
    flex: 1,
  },

  assignedByRow: {
    marginBottom: 8,
  },
  assignedByText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },

  assigneesSection: {
    marginBottom: 10,
  },
  assigneesLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  assigneesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  assigneeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    maxWidth: 160,
  },
  assigneeAvatarSmall: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assigneeInitial: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  assigneeName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E40AF',
  },

  announcementsBox: {
    backgroundColor: '#FEF9C3',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  announcementHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  announcementHeadText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#854D0E',
    textTransform: 'uppercase',
  },
  announcementItemText: {
    fontSize: 11.5,
    color: '#713F12',
    lineHeight: 16,
    fontWeight: '600',
  },
  announcementSender: {
    color: '#A16207',
    fontWeight: '700',
    fontStyle: 'italic',
  },

  actionBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  statusActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  statusActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  remindBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  remindBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  editBtn: {
    padding: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginLeft: 'auto',
  },
  deleteBtn: {
    padding: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },

  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#64748B',
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 240,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  inputLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 4,
    marginTop: 8,
    letterSpacing: 0.4,
  },
  inputSubHint: {
    fontSize: 10,
    color: '#2563EB',
    fontWeight: '700',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 6,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },

  assignHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  assignSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  assignSearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#1E293B',
    padding: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  multiSelectContainerWrapper: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
    marginBottom: 10,
    maxHeight: 160,
  },
  multiSelectScroll: {
    padding: 4,
  },
  memberSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  memberSelectRowActive: {
    backgroundColor: '#EFF6FF',
  },
  selectMemberName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  selectMemberNameActive: {
    color: '#1D4ED8',
    fontWeight: '800',
  },
  selectMemberDesig: {
    fontSize: 10,
    color: '#64748B',
  },

  dateSelectorRow: {
    gap: 6,
    paddingVertical: 4,
    marginBottom: 6,
  },
  dateChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    minWidth: 70,
  },
  dateChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#1D4ED8',
  },
  dateChipDay: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  dateChipDayActive: { color: 'rgba(255,255,255,0.9)' },
  dateChipLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 1,
  },
  dateChipLabelActive: { color: '#FFFFFF' },

  optionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  optionBtnActive: {
    backgroundColor: '#2563EB',
    borderColor: '#1D4ED8',
  },
  optionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  optionBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  cancelBtn: {
    flex: 0.6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
