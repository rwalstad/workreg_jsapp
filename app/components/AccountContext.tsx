'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AccountWithName } from '@/types';
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

// Helper to safely convert to BigInt
// TODO: Consolidate all bigIntSerializer codes across the application
const safeBigInt = (value: unknown): bigint | null => {
  if (value === null || value === undefined) return null;

  try {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    if (typeof value === 'string') return BigInt(value);
    return null;
  } catch (e) {
    console.error('Error converting to BigInt:', e);
    return null;
  }
};

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

  // Function to set the selected account both in state and cookie
  const setSelectedAccount = (account: AccountWithName | null) => {
    // Update state
    setSelectedAccountState(account);

    // Update cookie - store only what's needed to restore the account
    if (account) {
      try {
        // Make a "safe" version of the account for storage
        const safeAccount = {
          account_id: account.account_id.toString(),
          access_level: account.access_level,
          tblAccount: {
            name: account.tblAccount?.name || null,
          }
        };

        const cookieValue = JSON.stringify(safeAccount);

        // Set cookie with a 30-day expiration
        Cookies.set(SELECTED_ACCOUNT_COOKIE, cookieValue, { expires: 30, path: '/' });

        // Also update localStorage for redundancy
        if (typeof window !== 'undefined') {
          localStorage.setItem(SELECTED_ACCOUNT_COOKIE, cookieValue);
        }
      } catch (error) {
        console.error('Error saving account to cookie/localStorage:', error);
      }
    } else {
      // Remove cookie if no account is selected
      try {
        Cookies.remove(SELECTED_ACCOUNT_COOKIE, { path: '/' });
        if (typeof window !== 'undefined') {
          localStorage.removeItem(SELECTED_ACCOUNT_COOKIE);
        }
      } catch (error) {
        console.error('Error removing account from cookie/localStorage:', error);
      }
    }
  };

  // Load selected account from localStorage on initial mount
  useEffect(() => {
    const loadAccount = () => {
      setIsLoading(true);

      // Wrap everything in try/catch to handle any unexpected errors
      try {
        // Default to null (no account)
        let selectedAccountData = null;

        // First try localStorage (client-side only)
        if (typeof window !== 'undefined') {
          const localStorageData = localStorage.getItem(SELECTED_ACCOUNT_COOKIE);
          const parsedLocalStorage = safeJsonParse(localStorageData);
          if (parsedLocalStorage) {
            selectedAccountData = parsedLocalStorage;
          }
        }

        // If no account in localStorage, try cookies
        if (!selectedAccountData) {
          const cookieData = Cookies.get(SELECTED_ACCOUNT_COOKIE);
          const parsedCookie = safeJsonParse(cookieData);
          if (parsedCookie) {
            selectedAccountData = parsedCookie;
          }
        }

        // If we found data in either place, process it
        if (selectedAccountData) {
          // Convert string account_id to BigInt for internal use
          const accountId = safeBigInt(selectedAccountData.account_id);

          if (accountId !== null) {
            // Create a properly-typed account object
            const accountObject: AccountWithName = {
              account_id: accountId,
              access_level: selectedAccountData.access_level || null,
              tblAccount: {
                name: selectedAccountData.tblAccount?.name || null
              }
            };

            // Update state with the selected account
            setSelectedAccountState(accountObject);

            // Ensure both localStorage and cookie are in sync
            const serializedAccount = JSON.stringify({
              account_id: accountId.toString(),
              access_level: accountObject.access_level,
              tblAccount: { name: accountObject.tblAccount?.name || null }
            });

            if (typeof window !== 'undefined') {
              localStorage.setItem(SELECTED_ACCOUNT_COOKIE, serializedAccount);
            }

            Cookies.set(SELECTED_ACCOUNT_COOKIE, serializedAccount, {
              expires: 30,
              path: '/'
            });
          }
        }
      } catch (error) {
        console.error('Error loading account from storage:', error);
      } finally {
        // Always complete loading
        setIsLoading(false);
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