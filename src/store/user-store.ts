
'use client';

import { create } from 'zustand';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { ZisprUser } from '@/types/zispr';

interface UserState {
    user: FirebaseUser | null;
    zisprUser: ZisprUser | null;
    isLoading: boolean;
    setUser: (user: FirebaseUser | null, zisprUser: ZisprUser | null) => void;
    initialize: () => () => void;
}

export const useUserStore = create<UserState>((set) => ({
    user: null,
    zisprUser: null,
    isLoading: true,
    setUser: (user, zisprUser) => set({ user, zisprUser, isLoading: false }),
    initialize: () => {
        const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
            if (authUser) {
                const userDocRef = doc(db, 'users', authUser.uid);
                const unsubscribeFirestore = onSnapshot(userDocRef, (doc) => {
                    if (doc.exists()) {
                        const zisprUserData = { uid: doc.id, ...doc.data() } as ZisprUser;
                        set({ user: authUser, zisprUser: zisprUserData, isLoading: false });
                    } else {
                        // User exists in Auth but not in Firestore. This might be a new user or an error state.
                        set({ user: authUser, zisprUser: null, isLoading: false });
                    }
                });

                // Return the firestore unsubscribe function to be called when auth state changes
                return unsubscribeFirestore;
            } else {
                // No user is logged in
                set({ user: null, zisprUser: null, isLoading: false });
            }
        });

        // The returned function will be called by zustand on cleanup
        return unsubscribeAuth;
    },
}));

// Initialize the store when the app loads
// This is a bit of a trick to start the listener as soon as the app is loaded.
useUserStore.getState().initialize();
