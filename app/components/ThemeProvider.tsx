'use client';

/*
This file is part of a 3-way file approach to give us multiple layers of styling:
 - Global defaults through app/globals.css
 - Application-wide consistency through app/components/ThemeProvider
 - Component-specific styling through the CSS module app/components/ui-styles.module.css
*/

import React, { ReactNode } from 'react';

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * ThemeProvider component that applies global styles through CSS
 * This helps ensure components like popovers, dialogs, etc. have proper backgrounds
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  // We'll inject some CSS to ensure that specific Radix UI components have a white background
  React.useEffect(() => {
    // Create a style element
    const styleElement = document.createElement('style');

    // Define CSS to fix transparent backgrounds in popover and dialog components
    styleElement.textContent = `
      /* Radix Popover */
      [data-radix-popper-content-wrapper] {
        background-color: white !important;
      }

      /* Command Dialog */
      [cmdk-root],
      [cmdk-input],
      [cmdk-list],
      [cmdk-empty],
      [cmdk-group],
      [cmdk-item] {
        background-color: white !important;
      }

      /* Select Dropdown and Calendar */
      .select-content,
      .calendar,
      .popover-content {
        background-color: white !important;
      }

      /* Nested content inside popovers and dialogs */
      [role="dialog"] > div,
      [data-state="open"] > div {
        background-color: white !important;
      }
    `;

    // Append the style element to the document head
    document.head.appendChild(styleElement);

    // Clean up function to remove the style element when the component unmounts
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  return <>{children}</>;
}

export default ThemeProvider;