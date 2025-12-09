// Authentication utilities for localStorage management
import { TransferData, BankType } from '../types/TransferData';

export interface AuthData {
  isAuthenticated: boolean;
  currentUser: string;
  loginTime?: number;
}

export interface AppState {
  step: 'bank-select' | 'upload' | 'form' | 'preview';
  selectedBank: BankType;
  transferData: TransferData;
  uploadedImage: string | null;
}

const AUTH_STORAGE_KEY = 'cetakresi_auth';
const APP_STATE_STORAGE_KEY = 'cetakresi_app_state';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export const saveAuthData = (authData: AuthData): void => {
  try {
    const dataToSave = {
      ...authData,
      loginTime: Date.now()
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(dataToSave));
  } catch (error) {
    console.error('Error saving auth data:', error);
  }
};

export const loadAuthData = (): AuthData | null => {
  try {
    const savedData = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!savedData) return null;

    const authData: AuthData = JSON.parse(savedData);
    
    // Check if session has expired (24 hours)
    if (authData.loginTime) {
      const now = Date.now();
      const timeDiff = now - authData.loginTime;
      
      if (timeDiff > SESSION_DURATION) {
        // Session expired, remove data
        clearAuthData();
        return null;
      }
    }

    return authData;
  } catch (error) {
    console.error('Error loading auth data:', error);
    clearAuthData();
    return null;
  }
};

export const clearAuthData = (): void => {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

export const isSessionValid = (): boolean => {
  const authData = loadAuthData();
  return authData?.isAuthenticated === true;
};

// App state management functions
export const saveAppState = (appState: AppState): void => {
  try {
    localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(appState));
  } catch (error) {
    console.error('Error saving app state:', error);
  }
};

export const loadAppState = (): AppState | null => {
  try {
    const savedState = localStorage.getItem(APP_STATE_STORAGE_KEY);
    if (!savedState) return null;

    return JSON.parse(savedState);
  } catch (error) {
    console.error('Error loading app state:', error);
    clearAppState();
    return null;
  }
};

export const clearAppState = (): void => {
  try {
    localStorage.removeItem(APP_STATE_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing app state:', error);
  }
};

export interface UserSettings {
  shopName: string;
  shopSubtitle: string;
  shopFooter: string;
}

const USER_SETTINGS_KEY = 'cetakresi_user_settings';

export const saveUserSettings = (username: string, settings: UserSettings): void => {
  try {
    const allSettings = loadAllUserSettings();
    allSettings[username] = settings;
    localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(allSettings));
  } catch (error) {
    console.error('Error saving user settings:', error);
  }
};

export const loadUserSettings = (username: string): UserSettings | null => {
  try {
    const allSettings = loadAllUserSettings();
    return allSettings[username] || null;
  } catch (error) {
    console.error('Error loading user settings:', error);
    return null;
  }
};

const loadAllUserSettings = (): Record<string, UserSettings> => {
  try {
    const saved = localStorage.getItem(USER_SETTINGS_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    return {};
  }
};
