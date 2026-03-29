'use client';

import { useState, useCallback, createContext, useContext, useEffect } from 'react';
import { createClient } from '../supabase';
import { getUsers, getUserByEmail } from '../api/users';
import type { User } from '../types';

const FALLBACK_USER: User = {
  id: '', org_id: 'org-1', email: '', full_name: 'Loading...',
  avatar_url: null, role: 'member', department: '', created_at: '',
};

const CurrentUserContext = createContext<{
  currentUser: User;
  setCurrentUser: (user: User) => void;
  allUsers: User[];
  refreshUsers: () => void;
  isLoading: boolean;
  signOut: () => Promise<void>;
}>({
  currentUser: FALLBACK_USER,
  setCurrentUser: () => {},
  allUsers: [],
  refreshUsers: () => {},
  isLoading: true,
  signOut: async () => {},
});

export function useCurrentUser() {
  return useContext(CurrentUserContext);
}

export { CurrentUserContext };

export function useCurrentUserProvider() {
  const [currentUser, setCurrentUser] = useState<User>(FALLBACK_USER);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUsers = useCallback(async () => {
    try {
      const users = await getUsers();
      setAllUsers(users);
      return users;
    } catch {
      return [];
    }
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadAuthUser() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user?.email) {
        if (mounted) setIsLoading(false);
        return;
      }

      const [profile, users] = await Promise.all([
        getUserByEmail(session.user.email),
        getUsers(),
      ]);

      if (!mounted) return;
      setAllUsers(users);

      if (profile) {
        setCurrentUser(profile);
      } else if (users.length > 0) {
        setCurrentUser(users[0]);
      }
      setIsLoading(false);
    }

    loadAuthUser();
    return () => { mounted = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { currentUser, setCurrentUser, allUsers, refreshUsers, isLoading, signOut };
}
