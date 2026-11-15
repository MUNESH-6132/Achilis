import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, supabaseConfigured } from '../utils/supabaseClient';

const AuthContext = createContext(null);
const DEMO_MODE_KEY = 'achilis:demo';

function readDemoMode() {
  try {
    return localStorage.getItem(DEMO_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Check the VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
  }
  return supabase;
}

export function AuthProvider({ children }) {
  const [isDemo, setIsDemo] = useState(readDemoMode);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(supabaseConfigured && !isDemo);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (isDemo) return undefined;
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
  }, [isDemo]);

  const startDemo = useCallback(() => {
    localStorage.setItem(DEMO_MODE_KEY, 'true');
    setSession(null);
    setAuthError('');
    setLoading(false);
    setIsDemo(true);
  }, []);

  const exitDemo = useCallback(() => {
    localStorage.removeItem(DEMO_MODE_KEY);
    window.location.reload();
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
    exitDemo,
    isConfigured: supabaseConfigured,
    isDemo,
    loading,
    session,
    signIn,
    signInWithPassword: signIn,
    signOut,
    signUp,
    startDemo,
    updatePassword,
    user: session?.user || null,
  }), [authError, exitDemo, isDemo, loading, session, signIn, signOut, signUp, startDemo, updatePassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an <AuthProvider>');
  return context;
}
