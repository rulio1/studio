
'use client';

import { create } from 'zustand';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { ZisprUser } from '@/types/zispr';
import { persist } from 'zustand/middleware';

type Language = 'pt' | 'en';

interface UserState {
    user: FirebaseUser | null;
    zisprUser: ZisprUser | null;
    isLoading: boolean;
    language: Language;
    setUser: (user: FirebaseUser | null, zisprUser: ZisprUser | null) => void;
    setLanguage: (language: Language) => void;
    initializeAuth: () => () => void;
}

export const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            user: null,
            zisprUser: null,
            isLoading: true,
            language: 'pt',
            setUser: (user, zisprUser) => set({ user, zisprUser, isLoading: false }),
            setLanguage: (language) => set({ language }),
            initializeAuth: () => {
                const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
                    if (authUser) {
                        const userDocRef = doc(db, 'users', authUser.uid);
                        const unsubscribeFirestore = onSnapshot(userDocRef, (doc) => {
                            if (doc.exists()) {
                                const zisprUserData = { uid: doc.id, ...doc.data() } as ZisprUser;
                                set({ user: authUser, zisprUser: zisprUserData, isLoading: false });
                            } else {
                                set({ user: authUser, zisprUser: null, isLoading: false });
                            }
                        });
                        return unsubscribeFirestore;
                    } else {
                        set({ user: null, zisprUser: null, isLoading: false });
                    }
                });
                return unsubscribeAuth;
            },
        }),
        {
            name: 'zispr-user-storage',
            partialize: (state) => ({ language: state.language }),
        }
    )
);

// Initialize the auth listener when the app loads
if (typeof window !== 'undefined') {
    useUserStore.getState().initializeAuth();
}
