import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db, handleFirestoreError, OperationType, cleanFirestoreData } from '../lib/firebase';
import { UserProfile } from '../types';

// Default 988 GB Target Quota in decimal bytes (988,000,000,000 bytes)
export const DEFAULT_QUOTA_BYTES = 988 * 1_000_000_000;

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  setAuthError: (err: string | null) => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserQuota: (newMaxBytes: number) => Promise<void>;
  recalculateUsedBytes: (newUsedBytes: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthError(null);

      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);

        // Listen for real-time user profile & quota updates
        unsubscribeProfile = onSnapshot(
          userRef,
          async (snapshot) => {
            if (snapshot.exists()) {
              setProfile(snapshot.data() as UserProfile);
            } else {
              // Initialize profile on first login
              const newProfile: UserProfile = {
                uid: currentUser.uid,
                email: currentUser.email || '',
                displayName: currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'INFCLOUD User'),
                ...(currentUser.photoURL ? { photoURL: currentUser.photoURL } : {}),
                maxQuotaBytes: DEFAULT_QUOTA_BYTES,
                usedBytes: 0,
                role: currentUser.email === 'ravimakwana2079@gmail.com' ? 'admin' : 'user',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };

              try {
                await setDoc(userRef, cleanFirestoreData(newProfile));
                setProfile(newProfile);
              } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
              }
            }
            setLoading(false);
          },
          (err) => {
            console.error('Profile snapshot error:', err);
            handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
            setLoading(false);
          }
        );
      } else {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      setAuthError(null);
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      let msg = 'Google Sign-In failed.';
      if (err.code === 'auth/popup-blocked') {
        msg = 'Sign-in popup was blocked by your browser. Please allow popups for this site and click Continue with Google.';
      } else if (err.code === 'auth/popup-closed-by-user') {
        msg = 'Sign-in window closed before completion. Please try again.';
      } else if (err.code === 'auth/cancelled-popup-request') {
        msg = 'Only one sign-in popup can be active at a time.';
      } else if (err.code === 'auth/network-request-failed') {
        msg = 'Network connection failed. Please check your internet connection and try again.';
      } else if (err.message) {
        msg = err.message;
      }
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      setAuthError(null);
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      console.error('Email Sign-In Error:', err);
      let friendlyMessage = 'Sign in failed.';
      if (err.code === 'auth/operation-not-allowed') {
        friendlyMessage = 'Email/Password sign-in is disabled in this Firebase project. Please click "Continue with Google" for instant sign-in, or enable Email/Password under Firebase Console > Authentication > Sign-in method.';
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        friendlyMessage = 'Invalid email or password. Please verify credentials.';
      } else if (err.code === 'auth/too-many-requests') {
        friendlyMessage = 'Too many attempts. Please try again later or reset password.';
      } else if (err.code === 'auth/network-request-failed') {
        friendlyMessage = 'Network connection failed. Please check your internet connection.';
      } else if (err.message) {
        friendlyMessage = err.message;
      }
      setAuthError(friendlyMessage);
      throw new Error(friendlyMessage);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    try {
      setAuthError(null);
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      if (name.trim()) {
        await updateProfile(res.user, { displayName: name.trim() });
      }
    } catch (err: any) {
      console.error('Sign-Up Error:', err);
      let friendlyMessage = 'Sign up failed.';
      if (err.code === 'auth/operation-not-allowed') {
        friendlyMessage = 'Email/Password accounts are disabled in this Firebase project. Please click "Continue with Google" for instant access, or enable Email/Password under Firebase Console > Authentication > Sign-in method.';
      } else if (err.code === 'auth/email-already-in-use') {
        friendlyMessage = 'An account with this email already exists.';
      } else if (err.code === 'auth/weak-password') {
        friendlyMessage = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        friendlyMessage = 'Please enter a valid email address.';
      } else if (err.code === 'auth/network-request-failed') {
        friendlyMessage = 'Network connection failed. Please check your internet connection.';
      } else if (err.message) {
        friendlyMessage = err.message;
      }
      setAuthError(friendlyMessage);
      throw new Error(friendlyMessage);
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      setAuthError(null);
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setAuthError(err.message || 'Failed to send password reset email.');
      throw err;
    }
  };

  const signOut = async () => {
    try {
      await fbSignOut(auth);
      setProfile(null);
      setUser(null);
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  const updateUserQuota = async (newMaxBytes: number) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        maxQuotaBytes: newMaxBytes,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const recalculateUsedBytes = async (newUsedBytes: number) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        usedBytes: Math.max(0, newUsedBytes),
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      // Non-blocking quota reconciliation
      console.warn('Could not update usedBytes:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        authError,
        setAuthError,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        sendPasswordReset,
        signOut,
        updateUserQuota,
        recalculateUsedBytes,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
