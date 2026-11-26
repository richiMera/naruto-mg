import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Member } from '../lib/types';

type AuthState = {
  session: Session | null;
  member: Member | null;
  members: Member[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async (s: Session | null) => {
      setSession(s);
      if (!s) {
        setMembers([]);
        setLoading(false);
        return;
      }
      const { data } = await supabase.from('members').select('user_id, display_name').order('display_name');
      if (!active) return;
      setMembers((data as Member[] | null) ?? []);
      setLoading(false);
    };
    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setLoading(true);
      // evita chiamate Supabase dentro il callback sincrono
      setTimeout(() => load(s), 0);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const member = session ? members.find((m) => m.user_id === session.user.id) ?? null : null;

  const value: AuthState = {
    session,
    member,
    members,
    loading,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Email o password errate' : error.message);
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fuori da AuthProvider');
  return ctx;
}

export function useMemberName() {
  const { members } = useAuth();
  return (id: string | null | undefined) => members.find((m) => m.user_id === id)?.display_name ?? '—';
}
