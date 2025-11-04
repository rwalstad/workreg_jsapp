// app/lib/server-account-helper.ts

/*
This file helps in making the selected account id available to server functions
 */

// Cookie name constant
const SELECTED_ACCOUNT_COOKIE = 'selectedAccount';

/**
 * Gets the selected account ID from cookies (server-side only)
 * This function will work with both sync and async environments
 */
export async function getSelectedAccountIdFromServer(): Promise<string | null> {
  try {
    // Get the cookie value using the safe helper function
    const accountCookieValue = await getCookieValue(SELECTED_ACCOUNT_COOKIE);

    if (!accountCookieValue) {
      console.log("app/lib/server-account-helper.ts | getSelectedAccountIdFromServer | returning null")
      return null;
    }

    // Parse the cookie value
    const parsedValue = JSON.parse(decodeURIComponent(accountCookieValue));

    console.log("app/lib/server-account-helper.ts | getSelectedAccountIdFromServer | ", parsedValue)

    // Return the account ID as a string
    return parsedValue.account_id?.toString() || null;
  } catch (error) {
    console.error('Error reading account from cookie (server-side):', error);
    return null;
  }
}

/**
 * Gets the full selected account data from cookies (server-side only)
 */
export async function getSelectedAccountFromServer(): Promise<any> {
  try {
    // Get the cookie value using the safe helper function
    const accountCookieValue = await getCookieValue(SELECTED_ACCOUNT_COOKIE);

    if (!accountCookieValue) {
      return null;
    }

    return JSON.parse(decodeURIComponent(accountCookieValue));
  } catch (error) {
    console.error('Error reading account from cookie (server-side):', error);
    return null;
  }
}

/**
 * Helper function to safely get a cookie value
 * Handles both synchronous and asynchronous environments
 */
async function getCookieValue(name: string): Promise<string | undefined> {
  // Import the headers function dynamically to avoid TypeScript errors
  const { headers } = await import('next/headers');

  try {
    // Get the headers (this might be a Promise or a synchronous value)
    const headersList = headers();

    // Handle if headersList is a Promise
    const resolvedHeaders = headersList instanceof Promise ? await headersList : headersList;

    // Get the cookie header
    const cookieHeader = resolvedHeaders.get?.('cookie') || '';

    // Parse the cookie manually
    const cookies = parseCookieString(cookieHeader);
    return cookies[name];
  } catch (error) {
    console.error('Error getting cookie value:', error);
    return undefined;
  }
}

/**
 * Helper function to parse cookie string into an object
 */
function parseCookieString(cookieString: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  if (!cookieString) {
    return cookies;
  }

  cookieString.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      const name = parts[0].trim();
      // Join with = in case the value itself contains = characters
      const value = parts.slice(1).join('=');
      cookies[name] = value;
    }
  });

  return cookies;
}