// src/lib/store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Organization, User, Location } from './types';

// --- TYPE DEFINITIONS ---

/*
interface Permission {
  module: string;
  actions: string[];
}
*/
interface NavigationItem {
  key: string;
  label: string;
  path: string;
  icon?: React.ReactNode;
  children?: NavigationItem[];
}
interface ViewPreferences {
  [userId: string]: {
    [entityType: string]: {
      viewType?: 'table' | 'grid';
      currentTab?: string;
      pageSize?: number;
      currentPage?: number;
      filters?: Record<string, any>;
      sortBy?: { field: string; direction: 'asc' | 'desc' };
      lastPath?: string;
      lastLocationByOrg?: {
        [organizationId: string]: string; // { org_id: location_id }
      };
    } | undefined;
  };
}
interface ThemeState {
  themeMode: 'light' | 'dark' | 'system';
  isDarkMode: boolean; // Computed from themeMode + system preference
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;
}

/**
 * @interface RpcSessionData
 * @description Defines the shape of the data returned directly from the `jwt_get_user_session` RPC call.
 * This typically includes IDs and core session properties, but not the fully resolved objects.
 */
export interface RpcSessionData {
  user_id: string;
  org_id: string;
  location_id?: string;
  permissions: any;
  locations?: Location[];
  roles?: { id: string; name: string }[];
  teams?: { id: string; name: string }[];
}

/**
 * @interface UserSessionData
 * @description The definitive, complete structure for the user session, combining RPC data with fully resolved objects like `user` and `organization`.
 */
export interface UserSessionData extends RpcSessionData {
  user: User;
  organization: Organization;
  location?: Location | null;
}

/**
 * @interface AuthState
 * @description Defines the structure of the authentication slice in the Zustand store.
 */
interface AuthState {
  // --- Core Session State (dynamically fetched, not persisted) ---
  user: User | null;
  organization: Organization | null;
  location: Location | null;
  permissions: any; // Consider defining a more specific type for permissions
  roles?: { id: string; name: string }[];
  teams?: { id: string; name: string }[];
  locations?: Location[];


  // --- UI/App State (persisted) ---
  navigationItems: NavigationItem[];
  viewPreferences: ViewPreferences;
  appSettings: any;

  // --- Status Flags ---
  initialized: boolean;
  isOnline: boolean;
  authError: string | null;
  isSwitchingOrg: boolean;
  isLoggingOut: boolean; // <--- ADDED: Guard flag

  // --- Actions ---
  setSession: (sessionData: UserSessionData) => void;
  clearUserSession: () => void;
  reset: () => void;
  setInitialized: (value: boolean) => void;
  setIsSwitchingOrg: (value: boolean) => void;
  setIsLoggingOut: (value: boolean) => void; // <--- ADDED
  setUser: (user: User | null) => void;
  setOrganization: (organization: Organization | null) => void;
  setLocation: (location: Location | null) => void;
  setNavigationItems: (items: NavigationItem[]) => void;
  setViewPreferences: (userId: string, entityType: string, prefs: Partial<ViewPreferences[string][string]>) => void;
  resetViewPreferences: (userId: string, entityType: string) => void;
  setIsOnline: (isOnline: boolean) => void;
  setAuthError: (error: string | null) => void;
}

// --- INITIALIZATION ---

const secureStorage = createJSONStorage(() => localStorage);
const defaultSessionState: Pick<AuthState, 'user' | 'organization' | 'location' | 'permissions' | 'roles' | 'teams' | 'locations'> = {
  user: null,
  organization: null,
  location: null,
  permissions: null,
  roles: [],
  teams: [],
  locations: [],
};
const initialState: Partial<AuthState> = {
  ...defaultSessionState,
  navigationItems: [],
  viewPreferences: {},
  initialized: false,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  authError: null,
  appSettings: null,
  isSwitchingOrg: false,
  isLoggingOut: false, // <--- ADDED
};

/**
 * Helper to resolve actual dark mode based on mode setting
 */
function resolveIsDarkMode(mode: 'light' | 'dark' | 'system'): boolean {
  if (mode === 'system') {
    return typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false;
  }
  return mode === 'dark';
}

// --- STORES ---

/**
 * @store useThemeStore
 * @description Theme store with system mode support. Default: 'system' (auto-detect from OS)
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      themeMode: 'system',
      isDarkMode: resolveIsDarkMode('system'),
      setThemeMode: (mode) => set({
        themeMode: mode,
        isDarkMode: resolveIsDarkMode(mode)
      }),
      toggleTheme: () => {
        const currentMode = get().themeMode;
        // Cycle: light → dark → system → light
        const nextMode = currentMode === 'light' ? 'dark'
          : currentMode === 'dark' ? 'system'
            : 'light';
        set({
          themeMode: nextMode,
          isDarkMode: resolveIsDarkMode(nextMode)
        });
      },
    }),
    {
      name: 'theme-store',
      storage: secureStorage,
      partialize: (state) => ({ themeMode: state.themeMode }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Recompute isDarkMode on hydration (system preference may have changed)
          state.isDarkMode = resolveIsDarkMode(state.themeMode);
        }
      },
    }
  )
);

// Listen to OS theme changes when in system mode
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { themeMode, setThemeMode } = useThemeStore.getState();
    if (themeMode === 'system') {
      // Re-trigger to update isDarkMode
      setThemeMode('system');
    }
  });
}

/**
 * @store useAuthStore
 * @description The main Zustand store for managing authentication and session state.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...initialState as AuthState,
      setSession: (sessionData) => {
        console.log('>>> [STORE] setSession: Hydrating store with new session data.');
        set({
          user: sessionData.user,
          organization: sessionData.organization,
          location: sessionData.location,
          permissions: sessionData.permissions,
          roles: sessionData.roles,
          teams: sessionData.teams,
          locations: sessionData.locations,
          initialized: true,
          authError: null,
          isLoggingOut: false, // <--- CRITICAL: Reset guard on successful login
        });
      },

      clearUserSession: () => {
        console.log('🧹 [STORE] Clearing user session state.');
        set({
          ...defaultSessionState,
          initialized: true,
          authError: null,
        });
      },

      reset: () => {
        console.log('💣 [STORE] Resetting full auth state and clearing persisted data.');
        set({ ...initialState, initialized: true });
        try { localStorage.removeItem('auth-store'); } catch (e) { console.error(e) }
      },

      setInitialized: (value) => set({ initialized: value }),
      setIsSwitchingOrg: (value) => set({ isSwitchingOrg: value }),
      setIsLoggingOut: (value) => set({ isLoggingOut: value }), // <--- ADDED
      setUser: (user) => set({ user }),
      setOrganization: (organization) => set({ organization }),
      setLocation: (location) => set({ location }),
      setNavigationItems: (items) => set({ navigationItems: items }),
      setViewPreferences: (userId, entityType, prefs) => {
        if (!userId) return;
        set((state) => ({
          viewPreferences: {
            ...state.viewPreferences,
            [userId]: {
              ...(state.viewPreferences[userId] || {}),
              [entityType]: { ...(state.viewPreferences[userId]?.[entityType] || {}), ...prefs },
            }
          },
        }));
      },
      resetViewPreferences: (userId, entityType) => {
        if (!userId) return;
        set((state) => {
          const newPreferences = { ...state.viewPreferences };
          if (newPreferences[userId]) {
            const { [entityType]: _, ...rest } = newPreferences[userId];
            newPreferences[userId] = rest;
          }
          return { viewPreferences: newPreferences };
        });
      },
      setIsOnline: (isOnline) => set({ isOnline }),
      setAuthError: (error) => set({ authError: error }),
    }),
    {
      name: 'auth-store',
      storage: secureStorage,
      // NOTE: isLoggingOut is NOT added here, ensuring it is transient (memory only)
      partialize: (state) => ({
        viewPreferences: state.viewPreferences,
        navigationItems: state.navigationItems,
        appSettings: state.appSettings,
      }),
      version: 1,
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.error('❌ [STORE] Auth store rehydration error:', error);
        } else {
          console.log('🔄 [STORE] Auth store rehydrated successfully.');
          // Defer the execution of these state updates until after the store is fully initialized.
          setTimeout(() => {
            useAuthStore.getState().setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
            useAuthStore.getState().setInitialized(false);

            // Clear navigationItems to prevent hydration errors with non-serializable data (e.g., React components for icons)
            console.log('🧹 [STORE] Clearing navigationItems on rehydrate.');
            useAuthStore.getState().setNavigationItems([]);
            // Ensure no stuck state on page reload
            useAuthStore.getState().setIsLoggingOut(false);
          }, 0);
        }
      },
    }
  )
);

// --- GLOBAL EVENT LISTENERS ---
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => useAuthStore.getState().setIsOnline(true));
  window.addEventListener('offline', () => useAuthStore.getState().setIsOnline(false));
}