import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, supabaseConfigured } from '../utils/supabaseClient';

const AuthContext = createContext(null);

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Check the VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
  }
  return supabase;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!supabase) return undefined;

    let active = true;
    let receivedAuthEvent = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      receivedAuthEvent = true;
      setSession(nextSession);
      setAuthError('');
      setLoading(false);
    });

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active || receivedAuthEvent) return;
        if (error) setAuthError(error.message);
        setSession(data.session);
        setLoading(false);
      })
      .catch(error => {
        if (!active || receivedAuthEvent) return;
        setAuthError(error?.message || 'Could not restore the Supabase session.');
        setLoading(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const client = requireSupabase();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signUp = useCallback(async (email, password, fullName) => {
    const client = requireSupabase();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    const client = requireSupabase();
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async password => {
    const client = requireSupabase();
    const { data, error } = await client.auth.updateUser({ password });
    if (error) throw error;
    return data;
  }, []);

  const value = useMemo(() => ({
    authError,
    isConfigured: supabaseConfigured,
    loading,
    session,
    signIn,
    signInWithPassword: signIn,
    signOut,
    signUp,
    updatePassword,
    user: session?.user || null,
  }), [authError, loading, session, signIn, signOut, signUp, updatePassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an <AuthProvider>');
  return context;
}
