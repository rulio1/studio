
// This hook is no longer needed as we are using a Zustand store for state management.
// The file is kept to avoid breaking imports, but it should be considered deprecated.
'use client';

import { useUserStore } from '@/store/user-store';

export function useAuth() {
  const { user, isLoading } = useUserStore();
  return { user, isLoading };
}
