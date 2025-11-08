'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AccountWithName } from '../../types';
import Cookies from 'js-cookie';

// Cookie name constant for consistency
const SELECTED_ACCOUNT_COOKIE = 'selectedAccount';

interface AccountContextType {
  selectedAccount: AccountWithName | null;
  setSelectedAccount: (account: AccountWithName | null) => void;
  isLoading: boolean;
}

// Default context value
const defaultContextValue: AccountContextType = {
  selectedAccount: null,
  setSelectedAccount: () => {},
  isLoading: true,
};

const AccountContext = createContext<AccountContextType>(defaultContextValue);

// Helper to safely parse JSON with error handling
const safeJsonParse = (jsonString: string | null | undefined): any => {
  if (!jsonString) return null;

  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error('Error parsing JSON:', e, jsonString);
    return null;
  }
};

export const AccountProvider = ({ children }: { children: ReactNode }) => {
  const [selectedAccount, setSelectedAccountState] = useState<AccountWithName | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to set the selected account both in state and storage
  const setSelectedAccount = (account: AccountWithName | null) => {
    console.log("🔎 43: AccountContext: setSelectedAccount called with account:", account);
    
    // Update state
    setSelectedAccountState(account);
    
    // Update localStorage and cookie
    if (account) {
      try {
        // Store the full account object
        const accountToStore = JSON.stringify(account);
        
        // Save to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('selectedAccount', accountToStore);
          console.log("✅ Saved account to localStorage:", account);
        }
        
        // Optionally save to cookie as well (for SSR access)
        Cookies.set(SELECTED_ACCOUNT_COOKIE, accountToStore, { 
          path: '/',
          expires: 7 // 7 days
        });
        console.log("✅ Saved account to cookie");
        
      } catch (error) {
        console.error('❌ Error saving account to storage:', error);
      }
    } else {
      // Remove storage if no account is selected
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('selectedAccount');
          console.log("🗑️ Removed account from localStorage");
        }
        Cookies.remove(SELECTED_ACCOUNT_COOKIE, { path: '/' });
        console.log("🗑️ Removed account from cookie");
      } catch (error) {
        console.error('❌ Error removing account from storage:', error);
      }
    }
  };

  // Load selected account from localStorage on initial mount
  useEffect(() => {
    const loadAccount = () => {
      console.log("🔎 AccountContext: Loading account from storage...");
      setIsLoading(true);

      try {
        if (typeof window === 'undefined') {
          console.log("⚠️ Window not available (SSR), skipping load");
          setIsLoading(false);
          return;
        }

        // Try to load from localStorage first
        const storedAccountString = localStorage.getItem('selectedAccount');
        
        if (storedAccountString) {
          const storedAccount = safeJsonParse(storedAccountString);
          
          if (storedAccount) {
            console.log("✅ Loaded account from localStorage:", storedAccount);
            setSelectedAccountState(storedAccount);
          } else {
            console.log("⚠️ Could not parse stored account");
          }
        } else {
          // Try cookie as fallback
          const cookieAccount = Cookies.get(SELECTED_ACCOUNT_COOKIE);
          if (cookieAccount) {
            const parsedAccount = safeJsonParse(cookieAccount);
            if (parsedAccount) {
              console.log("✅ Loaded account from cookie:", parsedAccount);
              setSelectedAccountState(parsedAccount);
            }
          } else {
            console.log("ℹ️ No stored account found");
          }
        }
      } catch (error) {
        console.error('❌ Error loading account from storage:', error);
      } finally {
        setIsLoading(false);
        console.log("✅ AccountContext loading complete");
      }
    };

    loadAccount();
  }, []);

  const contextValue = {
    selectedAccount,
    setSelectedAccount,
    isLoading,
  };

  return (
    <AccountContext.Provider value={contextValue}>
      {children}
    </AccountContext.Provider>
  );
};

export const useAccount = () => {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
};