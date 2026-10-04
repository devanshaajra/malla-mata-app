import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList,
  Platform, Image, Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import { DESIGNATIONS, ADMIN_CONTROLS_CONFIG, DEFAULT_ADMIN_CONTROLS } from '../utils/constants';

export default function MembersScreen({ navigation }) {
  const {
    isSuperuser,
    isAdmin,
    promoteMemberToAdmin: authPromoteMember,
    updateAdminControls: authUpdateControls,
    demoteAdminToMember: authDemoteMember,
  } = useAuth();
  const {
    members,
    addMember,
    updateMember,
    deleteMember,
    promoteMemberToAdmin: dataPromoteMember,
    updateMemberAdminControls: dataUpdateControls,
    demoteMemberToResident: dataDemoteMember,
  } = useData();
  const { showToast } = useToast();

  const [showAddModal, setShowAddModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'admins' | 'members'
  const [editingMember, setEditingMember] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('Member');
  const [addAsRole, setAddAsRole] = useState('member'); // 'member' | 'admin'
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('Admin@2026');
  const [newAdminControls, setNewAdminControls] = useState({ ...DEFAULT_ADMIN_CONTROLS });

  // Superuser Promote & Admin Controls Modal state
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteTarget, setPromoteTarget] = useState(null);
  const [targetControls, setTargetControls] = useState({ ...DEFAULT_ADMIN_CONTROLS });
  const [targetDesignation, setTargetDesignation] = useState('Committee Admin');
  const [targetUsername, setTargetUsername] = useState('');
  const [targetPassword, setTargetPassword] = useState('Admin@2026');

  // Delete modal state
  const [memberToDelete, setMemberToDelete] = useState(null);

  // Categorize members safely with null checks
  const isSuperuserMember = (m) => {
    if (!m) return false;
    const role = (m.role || '').toLowerCase();
    const desig = (m.designation || '').toLowerCase();
    const name = (m.name || '').toLowerCase();
    return role.includes('superuser') || desig.includes('superuser') || name.includes('devansh');
  };

  const isAdminMember = (m) => {
    if (!m) return false;
    if (isSuperuserMember(m)) return false;
    const role = (m.role || '').toLowerCase();
    const desig = (m.designation || '').toLowerCase();
    return role === 'admin' || desig.includes('admin') || desig.includes('president') || desig.includes('lead') || desig.includes('head') || desig.includes('treasurer');
  };

  const safeMembers = (members || []).filter(Boolean);
  const adminMembers = safeMembers.filter(m => isAdminMember(m) || isSuperuserMember(m));
  const residentMembers = safeMembers.filter(m => !isAdminMember(m) && !isSuperuserMember(m));

  const displayedMembers =
    activeCategory === 'admins'
      ? adminMembers
      : activeCategory === 'members'
      ? residentMembers
      : safeMembers;

  const openAddModal = () => {
    setName('');
    setPhone('');
    setDesignation('Member');
    setAddAsRole('member');
    setNewAdminUsername('');
    setNewAdminPassword('Admin@2026');
    setNewAdminControls({ ...DEFAULT_ADMIN_CONTROLS });
    setEditingMember(null);
    setShowAddModal(true);
  };

  const handleToggleNewAdminControl = (controlKey) => {
    setNewAdminControls(prev => ({
      ...prev,
      [controlKey]: !prev[controlKey],
    }));
  };

  const handleAllowAllNewAdminControls = () => {
    const allOn = {};
    ADMIN_CONTROLS_CONFIG.forEach(c => { allOn[c.key] = true; });
    setNewAdminControls(allOn);
  };

  const handleRevokeAllNewAdminControls = () => {
    const allOff = {};
    ADMIN_CONTROLS_CONFIG.forEach(c => { allOff[c.key] = false; });
    setNewAdminControls(allOff);
  };

  const openEditModal = (member) => {
    setName(member.name || '');
    setPhone(member.phone || '');
    setDesignation(member.designation || member.role || 'Member');
    setEditingMember(member);
    setShowAddModal(true);
  };

  // Open Superuser Promotion / Admin Controls Modal
  const openPromoteModal = (member) => {
    setPromoteTarget(member);
    const existingControls = member.adminControls || DEFAULT_ADMIN_CONTROLS;
    setTargetControls({ ...DEFAULT_ADMIN_CONTROLS, ...existingControls });
    setTargetDesignation(member.designation || (member.role === 'Admin' ? 'Committee Admin' : 'Treasurer & Accounts Lead'));
    const cleanUser = (member.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    setTargetUsername(cleanUser || `admin_${Date.now()}`);
    setTargetPassword('Admin@2026');
    setShowPromoteModal(true);
  };

  const handleToggleControl = (controlKey) => {
    setTargetControls(prev => ({
      ...prev,
      [controlKey]: !prev[controlKey],
    }));
  };

  const handleAllowAllControls = () => {
    const allOn = {};
    ADMIN_CONTROLS_CONFIG.forEach(c => { allOn[c.key] = true; });
    setTargetControls(allOn);
  };

  const handleRevokeAllControls = () => {
    const allOff = {};
    ADMIN_CONTROLS_CONFIG.forEach(c => { allOff[c.key] = false; });
    setTargetControls(allOff);
  };

  const handleSavePromotion = async () => {
    if (!promoteTarget) return;

    try {
      const isAlreadyAdmin = isAdminMember(promoteTarget);

      // 1. Update in DataContext (Members roster)
      if (dataPromoteMember) {
        await dataPromoteMember(promoteTarget.id, targetControls, targetDesignation);
      }

      // 2. Update in AuthContext (Login accounts & permissions)
      if (authPromoteMember) {
        await authPromoteMember({
          memberId: promoteTarget.id,
          name: promoteTarget.name,
          username: targetUsername.trim(),
          phone: promoteTarget.phone,
          password: targetPassword.trim() || 'Admin@2026',
          designation: targetDesignation.trim(),
          adminControls: targetControls,
        });
      }

      const activeCount = Object.values(targetControls).filter(Boolean).length;
      showToast(
        isAlreadyAdmin ? 'Controls Updated ⚙️' : 'Member Promoted to Admin! 👑',
        'success',
        `${promoteTarget.name} has ${activeCount}/8 controls active.`
      );
      setShowPromoteModal(false);
      setPromoteTarget(null);
    } catch (e) {
      showToast('Action Failed', 'error', e.message);
    }
  };

  const handleDemoteAdmin = async () => {
    if (!promoteTarget) return;
    try {
      if (dataDemoteMember) {
        await dataDemoteMember(promoteTarget.id);
      }
      if (authDemoteMember) {
        await authDemoteMember(promoteTarget.id);
      }
      showToast('Admin Demoted to Member', 'info', `${promoteTarget.name} is now a regular resident member.`);
      setShowPromoteModal(false);
      setPromoteTarget(null);
    } catch (e) {
      showToast('Demote Failed', 'error', e.message);
    }
  };

  const handleSaveMember = async () => {
    if (!name.trim()) {
      showToast('Member Name Required', 'error', 'Please enter full name of the member');
      return;
    }

    if (editingMember) {
      await updateMember(editingMember.id, {
        name: name.trim(),
        phone: phone.trim(),
        designation: designation.trim(),
        role: designation.trim(),
      });
      showToast('Member Updated! ✏️', 'success', `${name.trim()} roster entry updated`);
    } else {
      const isAddingAdmin = isSuperuser && addAsRole === 'admin';
      const cleanDesignation = designation.trim() || (isAddingAdmin ? 'Committee Admin' : 'Member');
      const cleanUser = (newAdminUsername.trim() || name.toLowerCase().replace(/[^a-z0-9]/g, '') || `admin_${Date.now()}`).toLowerCase();

      // 1. Add to DataContext Member Roster
      const newMember = await addMember({
        name: name.trim(),
        phone: phone.trim(),
        designation: cleanDesignation,
        role: isAddingAdmin ? 'Admin' : 'Member',
        username: cleanUser,
        adminControls: isAddingAdmin ? newAdminControls : null,
      });

      // 2. If Superuser added as Admin, provision login credentials in AuthContext
      if (isAddingAdmin && authPromoteMember) {
        try {
          await authPromoteMember({
            memberId: newMember?.id,
            name: name.trim(),
            username: cleanUser,
            phone: phone.trim(),
            password: newAdminPassword.trim() || 'Admin@2026',
            designation: cleanDesignation,
            adminControls: newAdminControls,
          });
          const activeCount = Object.values(newAdminControls).filter(Boolean).length;
          showToast(
            'Admin Created & Provisioned! 🛡️',
            'success',
            `${name.trim()} can now login as Admin with username "${cleanUser}" and password "${newAdminPassword.trim() || 'Admin@2026'}".`
          );
        } catch (authErr) {
          console.warn('Admin credential provisioning error:', authErr);
          showToast('Member Added as Admin 👑', 'warning', `${name.trim()} added to roster. Notice: ${authErr.message}`);
        }
      } else {
        showToast('Member Added! 👥', 'insert', `${name.trim()} added to resident roster`);
      }
    }

    setShowAddModal(false);
    setEditingMember(null);
  };

  const handleConfirmDelete = async () => {
    if (!memberToDelete) return;
    await deleteMember(memberToDelete.id);
    showToast('Member Removed', 'delete', `${memberToDelete.name} was removed from roster`);
    setMemberToDelete(null);
  };

  const renderItem = ({ item }) => {
    if (!item) return null;
    const isSuper = isSuperuserMember(item);
    const isAdminRole = isAdminMember(item);
    const isResident = !isSuper && !isAdminRole;

    const controls = item.adminControls || DEFAULT_ADMIN_CONTROLS;
    const activeControlsCount = Object.values(controls).filter(Boolean).length;

    return (
      <View style={[styles.memberCard, isSuper ? styles.memberCardSuper : isAdminRole ? styles.memberCardAdmin : {}]}>
        {/* Role Icon */}
        <View style={[styles.roleBadgeIcon, isSuper ? styles.superBadgeIcon : isAdminRole ? styles.adminBadgeIcon : styles.memberBadgeIcon]}>
          <Ionicons
            name={isSuper ? 'star' : isAdminRole ? 'shield-checkmark' : 'person'}
            size={18}
            color={isSuper ? '#D97706' : isAdminRole ? '#DC2626' : '#64748B'}
          />
        </View>

        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <Text style={styles.memberName}>{item.name}</Text>
            {isSuper ? (
              <View style={styles.superTagPill}>
                <Text style={styles.superTagText}>SUPERUSER</Text>
              </View>
            ) : isAdminRole ? (
              <View style={styles.adminTagPill}>
                <Text style={styles.adminTagText}>ADMIN</Text>
              </View>
            ) : null}
          </View>

          {item.phone ? <Text style={styles.memberPhone}>{item.phone}</Text> : null}

          <View style={styles.desigRow}>
            <View style={styles.desigPill}>
              <Text style={styles.desigText}>{item.designation || item.role || 'Member'}</Text>
            </View>

            {/* Active Controls Count Badge for Admins */}
            {isAdminRole && (
              <View style={styles.controlsBadge}>
                <Ionicons name="key" size={10} color="#7C2D12" />
                <Text style={styles.controlsBadgeText}>{activeControlsCount}/8 Controls</Text>
              </View>
            )}
          </View>
        </View>

        {/* Superuser Quick Actions: Promote to Admin or Manage Controls */}
        <View style={styles.actions}>
          {isSuperuser && isResident && (
            <TouchableOpacity
              onPress={() => openPromoteModal(item)}
              style={styles.makeAdminBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="shield" size={13} color="#FFFFFF" />
              <Text style={styles.makeAdminBtnText}>Make Admin</Text>
            </TouchableOpacity>
          )}

          {isSuperuser && isAdminRole && (
            <TouchableOpacity
              onPress={() => openPromoteModal(item)}
              style={styles.manageControlsBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="options-outline" size={14} color="#B45309" />
              <Text style={styles.manageControlsBtnText}>Controls</Text>
            </TouchableOpacity>
          )}

          {(isSuperuser || isAdmin) && (
            <>
              <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionBtn}>
                <Ionicons name="create-outline" size={17} color="#2563EB" />
              </TouchableOpacity>
              {!isSuper && (
                <TouchableOpacity onPress={() => setMemberToDelete(item)} style={styles.actionBtn}>
                  <Ionicons name="trash-outline" size={17} color="#DC2626" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#DC2626', '#EA580C']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Members Directory</Text>
        {(isSuperuser || isAdmin) ? (
          <TouchableOpacity onPress={openAddModal} style={styles.addTopBtn} activeOpacity={0.85}>
            <Ionicons name="person-add" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 32 }} />
        )}
      </LinearGradient>

      {/* Category Tabs: All, Admins, Members */}
      <View style={styles.categoryTabsContainer}>
        <TouchableOpacity
          style={[styles.categoryTab, activeCategory === 'all' && styles.categoryTabActive]}
          onPress={() => setActiveCategory('all')}
          activeOpacity={0.7}
        >
          <Text style={[styles.categoryTabText, activeCategory === 'all' && styles.categoryTabTextActive]}>
            All ({members.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.categoryTab, activeCategory === 'admins' && styles.categoryTabActive]}
          onPress={() => setActiveCategory('admins')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="shield-checkmark"
            size={13}
            color={activeCategory === 'admins' ? '#FFFFFF' : '#D97706'}
          />
          <Text style={[styles.categoryTabText, activeCategory === 'admins' && styles.categoryTabTextActive]}>
            Admins ({adminMembers.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.categoryTab, activeCategory === 'members' && styles.categoryTabActive]}
          onPress={() => setActiveCategory('members')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="people"
            size={13}
            color={activeCategory === 'members' ? '#FFFFFF' : '#DC2626'}
          />
          <Text style={[styles.categoryTabText, activeCategory === 'members' && styles.categoryTabTextActive]}>
            Members ({residentMembers.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayedMembers}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {isSuperuser && (
              <View style={styles.superuserBanner}>
                <View style={styles.superuserBannerLeft}>
                  <Ionicons name="shield-checkmark" size={22} color="#D97706" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.superuserBannerTitle}>Superuser Controls & Delegations</Text>
                    <Text style={styles.superuserBannerSub}>
                      Promote any resident member to Admin and customize their permissions for Expenses (1-22 Oct), Funds, Tasks, Polls, Sponsors, QR codes, and more.
                    </Text>
                  </View>
                </View>
              </View>
            )}
            {displayedMembers.length > 0 && (
              <Text style={styles.countText}>
                Showing {displayedMembers.length} {activeCategory === 'admins' ? 'Admins & Committee Leads' : activeCategory === 'members' ? 'Resident Members' : 'Total Roster Entries'}
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={52} color="#94A3B8" />
            <Text style={styles.emptyText}>No members found in this category</Text>
          </View>
        }
      />

      {/* Add / Edit Member Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, !editingMember && addAsRole === 'admin' && styles.modalCardTall]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingMember ? 'Edit Member Details' : 'Add New Person'}
                </Text>
                {!editingMember && (
                  <Text style={styles.modalSubtitle}>
                    {addAsRole === 'admin' ? 'Creating Committee Admin with login credentials' : 'Adding Resident Society Member'}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
              {/* Option to Add as Member or Admin - STRICTLY SUPERUSER ONLY */}
              {!editingMember && isSuperuser ? (
                <View style={styles.roleSelectorBox}>
                  <View style={styles.roleHeaderRow}>
                    <Text style={styles.modalLabel}>ADD PERSON AS *</Text>
                    <View style={styles.superuserOnlyTag}>
                      <Ionicons name="star" size={10} color="#B45309" />
                      <Text style={styles.superuserOnlyTagText}>SUPERUSER ONLY</Text>
                    </View>
                  </View>
                  <View style={styles.roleToggleRow}>
                    <TouchableOpacity
                      style={[styles.roleToggleBtn, addAsRole === 'member' && styles.roleToggleBtnActive]}
                      onPress={() => {
                        setAddAsRole('member');
                        if (designation === 'Committee Admin' || designation === 'President') {
                          setDesignation('Member');
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="person"
                        size={15}
                        color={addAsRole === 'member' ? '#DC2626' : '#64748B'}
                      />
                      <Text style={[styles.roleToggleBtnText, addAsRole === 'member' && styles.roleToggleBtnTextActive]}>
                        Resident Member
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.roleToggleBtn, addAsRole === 'admin' && styles.roleToggleBtnAdminActive]}
                      onPress={() => {
                        setAddAsRole('admin');
                        if (designation === 'Member' || !designation) {
                          setDesignation('Committee Admin');
                        }
                        if (!newAdminUsername && name) {
                          setNewAdminUsername(name.toLowerCase().replace(/[^a-z0-9]/g, ''));
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="shield-checkmark"
                        size={15}
                        color={addAsRole === 'admin' ? '#FFFFFF' : '#D97706'}
                      />
                      <Text style={[styles.roleToggleBtnText, addAsRole === 'admin' && styles.roleToggleBtnAdminTextActive]}>
                        Committee Admin
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : !editingMember ? (
                <View style={styles.residentOnlyNotice}>
                  <Ionicons name="information-circle-outline" size={15} color="#0284C7" />
                  <Text style={styles.residentOnlyNoticeText}>
                    Adding Resident Member (Only Superuser Devansh can appoint Committee Admins).
                  </Text>
                </View>
              ) : null}

              <Text style={styles.modalLabel}>FULL NAME *</Text>
              <TextInput
                style={styles.modalInput}
                value={name}
                onChangeText={(v) => {
                  setName(v);
                  if (addAsRole === 'admin' && !editingMember && !newAdminUsername) {
                    setNewAdminUsername(v.toLowerCase().replace(/[^a-z0-9]/g, ''));
                  }
                }}
                placeholder="e.g. Ramesh Shah"
                placeholderTextColor="#94A3B8"
              />

              <Text style={[styles.modalLabel, { marginTop: 12 }]}>MOBILE NUMBER (OPTIONAL)</Text>
              <TextInput
                style={styles.modalInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="e.g. +91 98221 12345"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
              />

              <Text style={[styles.modalLabel, { marginTop: 12 }]}>
                {addAsRole === 'admin' && !editingMember ? 'ADMIN DESIGNATION / ROLE' : 'MEMBER DESIGNATION'}
              </Text>
              <TextInput
                style={styles.modalInput}
                value={designation}
                onChangeText={setDesignation}
                placeholder={addAsRole === 'admin' ? 'e.g. President, Treasurer, Cultural Head' : 'e.g. Member, Volunteer, Resident'}
                placeholderTextColor="#94A3B8"
              />

              {/* Quick Designation Presets */}
              <View style={styles.presetWrap}>
                {(addAsRole === 'admin' && !editingMember
                  ? ['President', 'Treasurer', 'Cultural Head', 'Committee Admin']
                  : DESIGNATIONS.slice(0, 4)
                ).map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.presetChip, designation === d && styles.presetChipActive]}
                    onPress={() => setDesignation(d)}
                  >
                    <Text style={[styles.presetChipText, designation === d && styles.presetChipTextActive]}>
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* If Adding As Admin: Show Credentials and Permissions - STRICTLY SUPERUSER ONLY */}
              {!editingMember && isSuperuser && addAsRole === 'admin' && (
                <View style={styles.newAdminCardWrap}>
                  {/* Admin Credentials */}
                  <View style={styles.credentialsSubBox}>
                    <View style={styles.credHeaderRow}>
                      <Ionicons name="key" size={15} color="#D97706" />
                      <Text style={styles.credBoxTitle}>Admin Login Credentials</Text>
                    </View>
                    <Text style={styles.credBoxSubtitle}>
                      This admin can login from the Admin tab using this username & password:
                    </Text>

                    <Text style={[styles.modalLabel, { marginTop: 8 }]}>ADMIN USERNAME *</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={newAdminUsername}
                      onChangeText={setNewAdminUsername}
                      placeholder="e.g. ramesh_shah"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="none"
                    />

                    <Text style={[styles.modalLabel, { marginTop: 8 }]}>ADMIN PASSWORD *</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={newAdminPassword}
                      onChangeText={setNewAdminPassword}
                      placeholder="Admin@2026"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={false}
                    />
                  </View>

                  {/* Admin Permissions & Controls */}
                  <View style={styles.newAdminControlsBox}>
                    <View style={styles.controlsHeaderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="shield-outline" size={15} color="#DC2626" />
                        <Text style={styles.credBoxTitle}>Permissions & Controls</Text>
                      </View>
                      <View style={styles.quickToggleBtns}>
                        <TouchableOpacity onPress={handleAllowAllNewAdminControls} style={styles.quickToggleBtn}>
                          <Text style={styles.quickToggleText}>Allow All</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleRevokeAllNewAdminControls} style={styles.quickToggleBtn}>
                          <Text style={styles.quickToggleText}>Revoke</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.controlsList}>
                      {ADMIN_CONTROLS_CONFIG.map((ctrl) => {
                        const isEnabled = !!newAdminControls[ctrl.key];
                        return (
                          <TouchableOpacity
                            key={ctrl.key}
                            style={[styles.controlItem, isEnabled && styles.controlItemActive]}
                            onPress={() => handleToggleNewAdminControl(ctrl.key)}
                            activeOpacity={0.7}
                          >
                            <View style={[styles.controlIconWrap, { backgroundColor: ctrl.color + '18' }]}>
                              <Ionicons name={ctrl.icon} size={16} color={ctrl.color} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.controlTitle, isEnabled && styles.controlTitleActive]}>
                                {ctrl.label}
                              </Text>
                              <Text style={styles.controlDesc} numberOfLines={2}>
                                {ctrl.desc}
                              </Text>
                            </View>
                            <View style={[styles.switchToggle, isEnabled ? styles.switchToggleOn : styles.switchToggleOff]}>
                              <Ionicons
                                name={isEnabled ? 'checkmark' : 'close'}
                                size={14}
                                color="#FFFFFF"
                              />
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveMember} activeOpacity={0.85} style={{ flex: 1 }}>
                <LinearGradient colors={addAsRole === 'admin' && !editingMember ? ['#D97706', '#EA580C'] : ['#DC2626', '#EA580C']} style={styles.confirmBtn}>
                  <Text style={styles.confirmText}>
                    {editingMember ? 'Save Changes' : addAsRole === 'admin' ? 'Create Admin & Save' : 'Add Member'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Superuser: Promote to Admin & Configure Controls Modal */}
      <Modal
        visible={showPromoteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPromoteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.promoteModalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons
                  name={isAdminMember(promoteTarget) ? 'options' : 'shield-checkmark'}
                  size={22}
                  color="#D97706"
                />
                <Text style={styles.modalTitle}>
                  {isAdminMember(promoteTarget) ? 'Manage Admin Controls' : 'Make Member an Admin'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowPromoteModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              {/* Target Member Info Card */}
              <View style={styles.targetMemberCard}>
                <View style={styles.targetAvatar}>
                  <Text style={styles.targetAvatarText}>
                    {(promoteTarget?.name || 'M').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.targetName}>{promoteTarget?.name}</Text>
                  <Text style={styles.targetPhone}>{promoteTarget?.phone || 'No mobile linked'}</Text>
                  <Text style={styles.targetCurrentRole}>
                    Current: <Text style={{ fontWeight: '800', color: isAdminMember(promoteTarget) ? '#DC2626' : '#16A34A' }}>
                      {isAdminMember(promoteTarget) ? 'Committee Admin' : 'Resident Member'}
                    </Text>
                  </Text>
                </View>
              </View>

              {/* Admin Designation */}
              <Text style={[styles.modalLabel, { marginTop: 12 }]}>ADMIN DESIGNATION / RESPONSIBILITY *</Text>
              <TextInput
                style={styles.modalInput}
                value={targetDesignation}
                onChangeText={setTargetDesignation}
                placeholder="e.g. Treasurer & Accounts Lead"
                placeholderTextColor="#94A3B8"
              />

              {/* Quick Designation Presets */}
              <View style={styles.presetWrap}>
                {DESIGNATIONS.slice(1, 6).map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.presetChip, targetDesignation === d && styles.presetChipActive]}
                    onPress={() => setTargetDesignation(d)}
                  >
                    <Text style={[styles.presetChipText, targetDesignation === d && styles.presetChipTextActive]}>
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Login Credentials Setup */}
              <View style={styles.credentialsBox}>
                <View style={styles.credRowHeader}>
                  <Ionicons name="key" size={16} color="#7C2D12" />
                  <Text style={styles.credTitle}>Admin Login Account Credentials</Text>
                </View>

                <View style={styles.credFieldRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.credSubLabel}>LOGIN USERNAME</Text>
                    <TextInput
                      style={styles.credInput}
                      value={targetUsername}
                      onChangeText={setTargetUsername}
                      placeholder="username"
                      autoCapitalize="none"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.credSubLabel}>LOGIN PASSWORD</Text>
                    <TextInput
                      style={styles.credInput}
                      value={targetPassword}
                      onChangeText={setTargetPassword}
                      placeholder="password"
                      autoCapitalize="none"
                    />
                  </View>
                </View>
                <Text style={styles.credNote}>
                  Default credentials enable this admin to sign in under the Admin tab.
                </Text>
              </View>

              {/* Controls & Permissions Section */}
              <View style={styles.controlsHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.controlsSectionTitle}>ALLOWED CONTROLS (8 MODULES)</Text>
                  <Text style={styles.controlsSectionSub}>
                    Toggle specific permissions granted by Superuser Devansh.
                  </Text>
                </View>
                <View style={styles.quickToggleRow}>
                  <TouchableOpacity
                    style={styles.quickToggleBtn}
                    onPress={handleAllowAllControls}
                  >
                    <Text style={styles.quickToggleText}>Allow All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.quickToggleBtn, { backgroundColor: '#F1F5F9' }]}
                    onPress={handleRevokeAllControls}
                  >
                    <Text style={[styles.quickToggleText, { color: '#64748B' }]}>Revoke All</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 8 Configurable Controls */}
              <View style={styles.controlsList}>
                {ADMIN_CONTROLS_CONFIG.map((ctrl) => {
                  const isEnabled = targetControls[ctrl.key] !== false;
                  return (
                    <TouchableOpacity
                      key={ctrl.key}
                      style={[styles.controlItem, isEnabled && styles.controlItemActive]}
                      onPress={() => handleToggleControl(ctrl.key)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.controlIconWrap, { backgroundColor: `${ctrl.color}15` }]}>
                        <Ionicons name={ctrl.icon} size={18} color={ctrl.color} />
                      </View>
                      <View style={{ flex: 1, paddingRight: 6 }}>
                        <Text style={[styles.controlTitle, isEnabled && styles.controlTitleActive]}>
                          {ctrl.label}
                        </Text>
                        <Text style={styles.controlDesc}>{ctrl.desc}</Text>
                      </View>
                      <View style={[styles.switchToggle, isEnabled ? styles.switchToggleOn : styles.switchToggleOff]}>
                        <Ionicons
                          name={isEnabled ? 'checkmark' : 'close'}
                          size={14}
                          color="#FFFFFF"
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.modalBtnRow}>
              {isAdminMember(promoteTarget) && (
                <TouchableOpacity
                  style={styles.demoteBtn}
                  onPress={handleDemoteAdmin}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-down-circle" size={16} color="#DC2626" />
                  <Text style={styles.demoteBtnText}>Demote</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowPromoteModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSavePromotion} activeOpacity={0.85} style={{ flex: 1 }}>
                <LinearGradient colors={['#D97706', '#EA580C']} style={styles.confirmBtn}>
                  <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
                  <Text style={styles.confirmText}>
                    {isAdminMember(promoteTarget) ? 'Save Controls' : 'Grant Admin Status'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        visible={memberToDelete !== null}
        title="Remove Member"
        message={`Are you sure you want to remove "${memberToDelete?.name}" from the members roster?`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setMemberToDelete(null)}
      />

      {(isSuperuser || isAdmin) && (
        <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={openAddModal}>
          <LinearGradient colors={['#DC2626', '#EA580C']} style={styles.fabGradient}>
            <Ionicons name="person-add" size={26} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      )}
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
  list: { padding: 18, paddingBottom: 100, maxWidth: 440, width: '100%', alignSelf: 'center' },
  listHeader: { marginBottom: 12 },
  countText: { fontSize: 13, color: '#78350F', fontWeight: '800' },
  adminNoteText: { fontSize: 11, color: '#94A3B8', marginTop: 2, fontWeight: '500' },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarImg: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    marginRight: 12,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#DC2626' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14.5, fontWeight: '800', color: '#1E293B' },
  memberPhone: { fontSize: 11.5, color: '#64748B', marginTop: 1, fontWeight: '500' },
  desigPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  desigText: { fontSize: 10, fontWeight: '700', color: '#92400E' },
  actions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FFFBEB',
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
  modalLabel: { fontSize: 10.5, fontWeight: '700', color: '#78350F', marginBottom: 5, letterSpacing: 0.5 },
  modalInput: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    fontSize: 13.5,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#FDE68A',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  presetWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  presetChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  presetChipActive: {
    backgroundColor: '#DC2626',
  },
  presetChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
  },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  confirmBtn: { padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  confirmText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#94A3B8', marginTop: 12, fontWeight: '500' },
  fab: { position: 'absolute', right: 24, bottom: 28 },
  fabGradient: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  addTopBtn: {
    padding: 7,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  categoryTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFBEB',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  categoryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  categoryTabActive: {
    backgroundColor: '#DC2626',
    borderColor: '#B91C1C',
  },
  categoryTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78350F',
  },
  categoryTabTextActive: {
    color: '#FFFFFF',
  },
  memberCardAdmin: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFDF5',
  },
  roleBadgeIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminBadgeIcon: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  memberBadgeIcon: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adminTagPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  adminTagText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  memberCardSuper: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  superBadgeIcon: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  superTagPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D97706',
  },
  superTagText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  desigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  controlsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 3,
  },
  controlsBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#991B1B',
  },
  makeAdminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D97706',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  makeAdminBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  manageControlsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 4,
  },
  manageControlsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  superuserBanner: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    shadowColor: '#B45309',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  superuserBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  superuserBannerTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#78350F',
  },
  superuserBannerSub: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 2,
    lineHeight: 15,
  },
  promoteModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 440,
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8,
  },
  targetMemberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 12,
  },
  targetAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#B45309',
  },
  targetName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1E293B',
  },
  targetPhone: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  targetCurrentRole: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  credentialsBox: {
    backgroundColor: '#FFFDF7',
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  credRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  credTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#78350F',
  },
  credFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  credSubLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  credInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12.5,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#FDE68A',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  credNote: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 6,
    fontStyle: 'italic',
  },
  controlsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 10,
  },
  controlsSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#78350F',
    letterSpacing: 0.5,
  },
  controlsSectionSub: {
    fontSize: 10,
    color: '#92400E',
    marginTop: 1,
  },
  quickToggleRow: {
    flexDirection: 'row',
    gap: 6,
  },
  quickToggleBtn: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  quickToggleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#78350F',
  },
  controlsList: {
    gap: 8,
    marginBottom: 10,
  },
  controlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  controlItemActive: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  controlIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  controlTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  controlTitleActive: {
    color: '#1E293B',
    fontWeight: '800',
  },
  controlDesc: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
    lineHeight: 13,
  },
  switchToggle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchToggleOn: {
    backgroundColor: '#16A34A',
  },
  switchToggleOff: {
    backgroundColor: '#CBD5E1',
  },
  demoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  demoteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  modalCardTall: {
    maxWidth: 440,
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '600',
    marginTop: 2,
  },
  roleSelectorBox: {
    marginBottom: 14,
    backgroundColor: '#FFFDF7',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  roleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  superuserOnlyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  superuserOnlyTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
  },
  residentOnlyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 14,
  },
  residentOnlyNoticeText: {
    flex: 1,
    fontSize: 10.5,
    color: '#0369A1',
    lineHeight: 14,
    fontWeight: '600',
  },
  roleToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  roleToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  roleToggleBtnActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#DC2626',
  },
  roleToggleBtnAdminActive: {
    backgroundColor: '#D97706',
    borderColor: '#B45309',
  },
  roleToggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  roleToggleBtnTextActive: {
    color: '#DC2626',
    fontWeight: '800',
  },
  roleToggleBtnAdminTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  newAdminCardWrap: {
    marginTop: 14,
  },
  credentialsSubBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 12,
  },
  credHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  credBoxTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#78350F',
  },
  credBoxSubtitle: {
    fontSize: 10.5,
    color: '#92400E',
    marginBottom: 8,
    lineHeight: 14,
  },
  newAdminControlsBox: {
    backgroundColor: '#FFFDF7',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
});

