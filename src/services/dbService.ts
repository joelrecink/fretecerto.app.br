import { UserCredits, VehicleData, FinancialRecord } from '../types';
import { DAILY_FREE_CREDITS } from '../constants';

const CREDITS_KEY = 'fretecerto_credits';
const PREFS_KEY = 'fretecerto_prefs';
const HISTORY_KEY = 'fretecerto_history';

// Credits Management
export const getStoredCredits = (email: string): UserCredits => {
  try {
    const stored = localStorage.getItem(`${CREDITS_KEY}_${email}`);
    if (stored) {
      const credits = JSON.parse(stored) as UserCredits;
      
      // Reset daily credits if new day
      const today = new Date().toISOString().split('T')[0];
      if (credits.lastResetDate !== today) {
        credits.freeCredits = DAILY_FREE_CREDITS;
        credits.lastResetDate = today;
        saveCredits(email, credits);
      }
      
      return credits;
    }
  } catch (e) {
    console.error('Error getting credits:', e);
  }
  
  // Default credits
  return {
    freeCredits: DAILY_FREE_CREDITS,
    premiumCredits: 0,
    lastResetDate: new Date().toISOString().split('T')[0]
  };
};

export const saveCredits = (email: string, credits: UserCredits): void => {
  localStorage.setItem(`${CREDITS_KEY}_${email}`, JSON.stringify(credits));
};

export const hasCredit = (credits: UserCredits): boolean => {
  return credits.freeCredits > 0 || credits.premiumCredits > 0;
};

export const consumeCredit = (credits: UserCredits, email: string): UserCredits => {
  const newCredits = { ...credits };
  
  if (newCredits.freeCredits > 0) {
    newCredits.freeCredits -= 1;
  } else if (newCredits.premiumCredits > 0) {
    newCredits.premiumCredits -= 1;
  }
  
  saveCredits(email, newCredits);
  return newCredits;
};

export const addPremiumCredits = (amount: number, email?: string): UserCredits => {
  if (!email) {
    return { freeCredits: 0, premiumCredits: amount, lastResetDate: new Date().toISOString().split('T')[0] };
  }
  
  const credits = getStoredCredits(email);
  credits.premiumCredits += amount;
  saveCredits(email, credits);
  return credits;
};

// Preferences
export const saveUserPreferences = (email: string, data: VehicleData): void => {
  localStorage.setItem(`${PREFS_KEY}_${email}`, JSON.stringify(data));
};

export const getUserPreferences = (email: string): VehicleData | null => {
  const stored = localStorage.getItem(`${PREFS_KEY}_${email}`);
  return stored ? JSON.parse(stored) : null;
};

// Financial Records (Local Storage for now)
export const addFinancialRecord = async (record: Omit<FinancialRecord, 'id'>): Promise<void> => {
  const records = getFinancialRecords();
  const newRecord: FinancialRecord = {
    ...record,
    id: Math.random().toString(36).substr(2, 9)
  };
  records.push(newRecord);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(records));
};

export const getFinancialRecords = (): FinancialRecord[] => {
  const stored = localStorage.getItem(HISTORY_KEY);
  return stored ? JSON.parse(stored) : [];
};

// System Config (Placeholder)
export const getSystemConfig = async (): Promise<Record<string, string>> => {
  return {};
};
