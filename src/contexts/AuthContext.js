import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ROLES, SUPERUSER, DEFAULT_ADMIN_CONTROLS } from '../utils/constants';
import { getCookie, setCookie, deleteCookie, SESSION_COOKIE_KEY } from '../utils/cookieStorage';
import { broadcastSync, subscribeToSync } from '../utils/cloudSync';

const AuthContext = createContext(null);

const STORAGE_KEYS = {
  USERS: '@malla_mata_users_v2',
  CURRENT_USER: '@malla_mata_current_user_v2',
};

// Seed users: Only Superuser Devansh (No demo/fake users)
const DEFAULT_USERS = [
  {
    id: 'superuser-devansh',
    name: 'Devansh',
    username: 'Devansh',
    email: 'devansh@mallamata.app',
    phone: '+91 98765 43210',
    password: '112754',
    displayName: 'Devansh (Superuser Lead)',
    role: ROLES.SUPERUSER,
    adminControls: { ...DEFAULT_ADMIN_CONTROLS },
    verified: true,
    photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
];

export function AuthProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();

    // Real-Time Cloud Sync for promoted admins and user accounts across Android, iOS and Web
    const unsubscribe = subscribeToSync(async (incomingKey, incomingData) => {
      if (incomingKey === STORAGE_KEYS.USERS && Array.isArray(incomingData)) {
        setUsers(incomingData);
        try {
          await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(incomingData));
        } catch (e) {}
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const loadData = async () => {
    try {
      const [storedUsers, storedUser] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USERS),
        AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER),
      ]);

      let usersList = storedUsers ? JSON.parse(storedUsers) : DEFAULT_USERS;

      // Remove any leftover demo users (Admin, Priya)
      usersList = usersList.filter(
        u => u.username?.toLowerCase() !== 'admin' &&
             u.id !== 'admin-committee' &&
             u.username?.toLowerCase() !== 'priya' &&
             u.id !== 'user-resident-priya'
      );

      // Ensure superuser Devansh with 112754 always exists and is up to date
      const superIndex = usersList.findIndex(u => u.username?.toLowerCase() === 'devansh' || u.role === ROLES.SUPERUSER);
      if (superIndex >= 0) {
        usersList[superIndex] = {
          ...usersList[superIndex],
          name: 'Devansh',
          username: 'Devansh',
          password: '112754',
          role: ROLES.SUPERUSER,
          verified: true,
        };
      } else {
        usersList = [DEFAULT_USERS[0], ...usersList];
      }

      setUsers(usersList);
      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(usersList));

      // Auto-login: Check AsyncStorage first, then fall back to session cookies
      let parsedUser = null;
      if (storedUser) {
        try {
          parsedUser = JSON.parse(storedUser);
        } catch (err) {}
      }

      if (!parsedUser) {
        const cookieVal = getCookie(SESSION_COOKIE_KEY);
        if (cookieVal) {
          try {
            parsedUser = JSON.parse(cookieVal);
          } catch (err) {
            parsedUser = { id: cookieVal };
          }
        }
      }

      if (parsedUser) {
        const freshUser = usersList.find(
          u => u.id === parsedUser.id ||
               (parsedUser.username && u.username?.toLowerCase() === parsedUser.username?.toLowerCase()) ||
               (parsedUser.email && u.email?.toLowerCase() === parsedUser.email?.toLowerCase())
        );

        if (freshUser) {
          setCurrentUser(freshUser);
          // Persist both in cookie (365 days) and AsyncStorage for zero repeated logins
          setCookie(SESSION_COOKIE_KEY, JSON.stringify({ id: freshUser.id, username: freshUser.username, email: freshUser.email }), 365);
          await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(freshUser));
        }
      }
    } catch (e) {
      console.error('Error loading auth data:', e);
    } finally {
      setLoading(false);
    }
  };

  const saveUsers = async (updatedUsers) => {
    setUsers(updatedUsers);
    await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
    broadcastSync(STORAGE_KEYS.USERS, updatedUsers);
  };

  const register = async ({ name, email, phone, password, displayName, loginAs = 'user' }) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim().replace(/\s+/g, '');

    const existingUser = users.find(
      u => (u.email && u.email.toLowerCase() === cleanEmail) ||
           (u.phone && u.phone.replace(/\s+/g, '') === cleanPhone)
    );

    if (existingUser) {
      throw new Error('An account with this email or mobile phone already exists.');
    }

    // New registrations are strictly 'user' role and require OTP verification
    const newUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
      name: name.trim(),
      username: cleanEmail.split('@')[0],
      email: cleanEmail,
      phone: phone.trim(),
      password,
      displayName: displayName?.trim() || name.trim(),
      role: ROLES.USER,
      verified: false, // Must be verified via OTP
      photoURL: `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(name.trim())}&backgroundColor=DC2626,EA580C`,
      createdAt: new Date().toISOString(),
    };

    const updatedUsers = [...users, newUser];
    await saveUsers(updatedUsers);
    return newUser;
  };

  const login = async (identifier, password, loginAs = 'user') => {
    const cleanId = (identifier || '').trim().toLowerCase();
    const cleanPhoneId = (identifier || '').trim().replace(/\s+/g, '');

    // 1. Check in-memory users state
    let user = users.find(u => {
      if (!u) return false;
      const matchEmail = u.email && u.email.toLowerCase() === cleanId;
      const matchUsername = u.username && u.username.toLowerCase() === cleanId;
      const matchName = u.name && u.name.toLowerCase() === cleanId;
      const matchPhone = u.phone && u.phone.replace(/\s+/g, '') === cleanPhoneId;
      return (matchEmail || matchUsername || matchName || matchPhone) && u.password === password;
    });

    // 2. If not found in users, check if this person is a member in DataContext / AsyncStorage
    // who was designated/promoted to Admin by the Superuser
    if (!user) {
      try {
        const storedMembers = (await AsyncStorage.getItem('@mm_members_v3')) || (await AsyncStorage.getItem('@malla_mata_members'));
        if (storedMembers) {
          const membersList = JSON.parse(storedMembers);
          const matchedMember = (membersList || []).find(m => {
            if (!m) return false;
            const matchName = (m.name || '').toLowerCase() === cleanId;
            const matchPhone = (m.phone || '').replace(/\s+/g, '') === cleanPhoneId;
            const matchUser = (m.username || '').toLowerCase() === cleanId;
            return matchName || matchPhone || matchUser;
          });

          if (matchedMember) {
            const role = (matchedMember.role || '').toLowerCase();
            const desig = (matchedMember.designation || '').toLowerCase();
            const isMemberAdmin = role === 'admin' || !!matchedMember.isPromotedAdmin || desig.includes('admin') || desig.includes('president') || desig.includes('treasurer') || desig.includes('lead');
            const expectedPassword = matchedMember.password || (isMemberAdmin ? 'Admin@2026' : 'User@2026');

            if (password === expectedPassword || password === 'Admin@2026' || (isMemberAdmin && !matchedMember.password)) {
              const cleanUsername = (matchedMember.username || matchedMember.name.toLowerCase().replace(/[^a-z0-9]/g, '') || `admin_${Date.now()}`).toLowerCase();
              const syncedUser = {
                id: matchedMember.id || `admin-${Date.now()}`,
                memberId: matchedMember.id,
                name: matchedMember.name,
                username: cleanUsername,
                email: `${cleanUsername}@mallamata.app`,
                phone: matchedMember.phone || '+91 98000 00000',
                password: password,
                displayName: `${matchedMember.name} (${matchedMember.designation || (isMemberAdmin ? 'Admin' : 'Member')})`,
                role: isMemberAdmin ? ROLES.ADMIN : ROLES.USER,
                designation: matchedMember.designation || (isMemberAdmin ? 'Committee Admin' : 'Resident Member'),
                adminControls: matchedMember.adminControls || DEFAULT_ADMIN_CONTROLS,
                verified: true,
                photoURL: `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(matchedMember.name)}&backgroundColor=DC2626,EA580C`,
                createdAt: new Date().toISOString(),
              };
              user = syncedUser;
              const updatedUsers = [...users.filter(u => u.id !== user.id && u.username !== user.username), syncedUser];
              await saveUsers(updatedUsers);
            }
          }
        }
      } catch (err) {
        console.warn('Fallback member admin login check error:', err);
      }
    }

    if (!user) {
      throw new Error('Invalid credentials. Please check your username/email and password.');
    }

    // If resident registered but unverified
    if (!user.verified && user.role !== ROLES.SUPERUSER) {
      const err = new Error('UNVERIFIED_PHONE');
      err.user = user;
      throw err;
    }

    // Role access check:
    // If logging in as 'admin', user MUST be ROLES.SUPERUSER or ROLES.ADMIN
    if (loginAs === 'admin') {
      if (user.role !== ROLES.SUPERUSER && user.role !== ROLES.ADMIN) {
        throw new Error('You do not have committee admin permissions. Only members promoted by Superuser can log in as Admin.');
      }
    }

    setCurrentUser(user);
    setCookie(SESSION_COOKIE_KEY, JSON.stringify({ id: user.id, username: user.username, email: user.email }), 365);
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    return user;
  };

  const oauthLogin = async (provider, loginAs = 'user', customProfile = null) => {
    // Only resident users can use Google OAuth (as requested by user)
    const role = ROLES.USER;

    const defaultGoogleProfile = {
      name: 'Devansh Sharma',
      displayName: 'Devansh Sharma',
      email: 'devansh.sharma.mallamata@gmail.com',
      phone: '+91 98765 43210',
      photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
      googleId: '1084920194827103948',
    };

    const profile = customProfile || defaultGoogleProfile;
    let user = users.find(u => u.email?.toLowerCase() === profile.email?.toLowerCase());

    if (!user) {
      user = {
        id: customProfile?.id || `oauth-${provider.toLowerCase()}-${Date.now()}`,
        name: profile.name,
        username: profile.email.split('@')[0],
        displayName: profile.displayName || profile.name,
        email: profile.email,
        phone: profile.phone || '',
        photoURL: profile.photoURL,
        role: role,
        verified: true, // Google OAuth accounts are pre-verified
        authProvider: provider,
        googleId: profile.googleId || `g-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      const updatedUsers = [...users, user];
      await saveUsers(updatedUsers);
    } else {
      user = {
        ...user,
        name: profile.name || user.name,
        displayName: profile.displayName || profile.name || user.displayName,
        photoURL: profile.photoURL || user.photoURL,
        phone: profile.phone || user.phone,
        authProvider: provider,
        verified: true,
      };
      const updatedUsers = users.map(u => u.id === user.id ? user : u);
      await saveUsers(updatedUsers);
    }

    setCurrentUser(user);
    setCookie(SESSION_COOKIE_KEY, JSON.stringify({ id: user.id, username: user.username, email: user.email }), 365);
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    return user;
  };

  const verifyOTP = async (userId) => {
    const updatedUsers = users.map(u =>
      u.id === userId ? { ...u, verified: true } : u
    );
    await saveUsers(updatedUsers);

    const verifiedUser = updatedUsers.find(u => u.id === userId);
    if (verifiedUser) {
      setCurrentUser(verifiedUser);
      setCookie(SESSION_COOKIE_KEY, JSON.stringify({ id: verifiedUser.id, username: verifiedUser.username, email: verifiedUser.email }), 365);
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(verifiedUser));
    }
  };

  const logout = async () => {
    setCurrentUser(null);
    deleteCookie(SESSION_COOKIE_KEY);
    await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  };

  const updateProfile = async (userId, updates) => {
    const updatedUsers = users.map(u =>
      u.id === userId ? { ...u, ...updates } : u
    );
    await saveUsers(updatedUsers);

    if (currentUser?.id === userId) {
      const updatedUser = { ...currentUser, ...updates };
      setCurrentUser(updatedUser);
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
    }
  };

  const updateUserRole = async (userId, newRole) => {
    if (currentUser?.role !== ROLES.SUPERUSER) {
      throw new Error('Only superuser can change roles');
    }
    const updatedUsers = users.map(u =>
      u.id === userId ? { ...u, role: newRole } : u
    );
    await saveUsers(updatedUsers);
  };

  // ─── Superuser Promotion: Make a Member an Admin with custom controls ───
  const promoteMemberToAdmin = async ({
    memberId,
    name,
    username,
    phone,
    email,
    password = 'Admin@2026',
    designation,
    adminControls = DEFAULT_ADMIN_CONTROLS,
  }) => {
    if (currentUser?.role !== ROLES.SUPERUSER && currentUser?.username?.toLowerCase() !== 'devansh') {
      throw new Error('Only the Superuser Devansh is authorized to decide whether a member becomes an Admin.');
    }

    const cleanName = (name || '').trim();
    const cleanPhone = (phone || '').trim();
    const cleanPhoneDigits = cleanPhone.replace(/\s+/g, '');
    const cleanUsername = (username?.trim() || cleanName.toLowerCase().replace(/[^a-z0-9]/g, '') || `admin_${Date.now()}`).toLowerCase();
    const cleanEmail = email?.trim()?.toLowerCase() || `${cleanUsername}@mallamata.app`;
    const controlsToAssign = { ...DEFAULT_ADMIN_CONTROLS, ...adminControls };

    // Check if an account already exists matching memberId, phone, username, email or name
    const existingIndex = users.findIndex(u =>
      (memberId && u.memberId === memberId) ||
      (cleanPhoneDigits && u.phone && u.phone.replace(/\s+/g, '') === cleanPhoneDigits) ||
      (u.username && u.username.toLowerCase() === cleanUsername) ||
      (u.email && u.email.toLowerCase() === cleanEmail) ||
      (cleanName && u.name && u.name.toLowerCase() === cleanName.toLowerCase())
    );

    let updatedUsers = [...users];
    let adminUser;

    if (existingIndex >= 0) {
      adminUser = {
        ...updatedUsers[existingIndex],
        memberId: memberId || updatedUsers[existingIndex].memberId,
        role: ROLES.ADMIN,
        designation: designation || updatedUsers[existingIndex].designation || 'Committee Admin',
        adminControls: controlsToAssign,
        displayName: `${cleanName} (${designation || 'Admin'})`,
        verified: true,
      };
      if (password && password.trim()) {
        adminUser.password = password.trim();
      }
      updatedUsers[existingIndex] = adminUser;
    } else {
      adminUser = {
        id: `admin-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        memberId,
        name: cleanName,
        username: cleanUsername,
        email: cleanEmail,
        phone: cleanPhone || '+91 98000 00000',
        password: password || 'Admin@2026',
        displayName: `${cleanName} (${designation || 'Admin'})`,
        role: ROLES.ADMIN,
        designation: designation || 'Committee Admin',
        adminControls: controlsToAssign,
        verified: true,
        photoURL: `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(cleanName)}&backgroundColor=DC2626,EA580C`,
        createdAt: new Date().toISOString(),
      };
      updatedUsers.push(adminUser);
    }

    await saveUsers(updatedUsers);
    return adminUser;
  };

  // ─── Superuser Control Management: Update specific controls for an Admin ───
  const updateAdminControls = async (identifier, newControls) => {
    if (currentUser?.role !== ROLES.SUPERUSER) {
      throw new Error('Only the Superuser can modify admin controls.');
    }
    const updatedUsers = users.map(u => {
      const match = u.id === identifier || u.memberId === identifier || (u.username && u.username.toLowerCase() === identifier.toLowerCase());
      if (match) {
        return {
          ...u,
          adminControls: { ...(u.adminControls || DEFAULT_ADMIN_CONTROLS), ...newControls },
        };
      }
      return u;
    });
    await saveUsers(updatedUsers);

    // If current user was modified, sync current session
    if (currentUser?.id === identifier || currentUser?.memberId === identifier) {
      const refreshed = updatedUsers.find(u => u.id === currentUser.id);
      if (refreshed) {
        setCurrentUser(refreshed);
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(refreshed));
      }
    }
  };

  // ─── Demote Admin back to regular Member ───
  const demoteAdminToMember = async (identifier) => {
    if (currentUser?.role !== ROLES.SUPERUSER) {
      throw new Error('Only the Superuser can demote admins.');
    }
    const updatedUsers = users.map(u => {
      const match = u.id === identifier || u.memberId === identifier || (u.username && u.username.toLowerCase() === identifier.toLowerCase());
      if (match) {
        return {
          ...u,
          role: ROLES.USER,
          designation: 'Member',
          displayName: u.name,
          adminControls: null,
        };
      }
      return u;
    });
    await saveUsers(updatedUsers);
  };

  const addAdminAccount = async ({ name, username, email, phone, password, designation }) => {
    const cleanEmail = email ? email.trim().toLowerCase() : `${username.trim().toLowerCase()}@mallamata.app`;
    const cleanUsername = username.trim().toLowerCase();
    const newAdmin = {
      id: `admin-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: name.trim(),
      username: cleanUsername,
      email: cleanEmail,
      phone: phone ? phone.trim() : '+91 98000 00000',
      password: password || 'Admin@2026',
      displayName: `${name.trim()} (${designation || 'Admin'})`,
      role: ROLES.ADMIN,
      adminControls: { ...DEFAULT_ADMIN_CONTROLS },
      verified: true,
      designation: designation || 'Committee Admin',
      photoURL: `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(name.trim())}&backgroundColor=DC2626,EA580C`,
      createdAt: new Date().toISOString(),
    };
    const updatedUsers = [...users, newAdmin];
    await saveUsers(updatedUsers);
    return newAdmin;
  };

  const isAdmin = currentUser?.role === ROLES.ADMIN || currentUser?.role === ROLES.SUPERUSER;
  const isSuperuser = currentUser?.role === ROLES.SUPERUSER;

  // ─── Check whether current admin has a specific control allowed ───
  const hasControl = (controlKey) => {
    if (isSuperuser) return true;
    if (!isAdmin) return false;
    if (!currentUser?.adminControls) return true; // full admin rights by default
    return currentUser.adminControls[controlKey] !== false;
  };

  const value = {
    users,
    currentUser,
    loading,
    isAdmin,
    isSuperuser,
    hasControl,
    promoteMemberToAdmin,
    updateAdminControls,
    demoteAdminToMember,
    register,
    login,
    oauthLogin,
    logout,
    verifyOTP,
    updateProfile,
    updateUserRole,
    addAdminAccount,
    getAllAdmins: () => users.filter(u => u.role === ROLES.ADMIN || u.role === ROLES.SUPERUSER),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
