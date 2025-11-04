'use client';

import { useState, useEffect, ReactNode, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, Home, Settings, Users, NotebookTabs, Columns, Settings2Icon, Bell, UserCircle, ChevronDown, LogOut, LucideIcon, ChartArea, MessageSquare, CirclePlay } from 'lucide-react';
import MenuItem from './MenuItem';
import { useSession, signOut } from 'next-auth/react';
import type { Session } from 'next-auth';
import React, { Children, cloneElement } from 'react';
import { saveHistory, HistoryItem, getHistory, HistoryItemPath } from '../../app/lib/api';
import { toast } from "sonner";


interface Module {
  id: string;
  path: string;
  title: string;
  icon: LucideIcon;
  description: string;
}

interface Account {
  account_id: string;
  tblAccount: {
    name: string | null;
  };
}

interface ModularMenuProps {
  children: ReactNode;
}

// Add this custom type to extend the default Session type
// Creates a custom type CustomSession that extends the default Session type
interface CustomSession extends Session {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    accounts?: {
      id: string;
      name: string;
      rights: number;
    }[];
  };
}

// Module definitions with paths
const modules: Module[] = [
  {
    id: 'dashboard',
    path: '/dashboard',
    title: 'Dashboard',
    icon: Home,
    description: 'Overview & analytics'
  }, {
    id: 'pipeline',
    path: '/pipeline',
    title: 'Pipelines',
    icon: NotebookTabs,
    description: 'Pipelines '
  }, {
    id: 'leads',
    path: '/leads',
    title: 'Leads',
    icon: Users,
    description: 'Pipeline stages'
  },
  {
    id: 'messages',
    path: '/messages',
    title: 'Messages',
    icon: MessageSquare,
    description: 'Manage your leads'
  },
  {
    id: 'automations',
    path: '/automations',
    title: 'Automations',
    icon: CirclePlay,
    description: 'Control running automations'
  },
  {
    id: 'reports',
    path: '/reports',
    title: 'Reports',
    icon: ChartArea,
    description: 'Keep track of your performance'
  },
  {
    id: 'settings',
    path: '/settings',
    title: 'Account Settings and Billing',
    icon: Settings,
    description: 'Manage account, users, roles & billing'
  },
  {
    id: 'dbadmin',
    path: '/dbadmin',
    title: 'Database admin',
    icon: Settings2Icon,
    description: 'Manage the database server'
  },
  {
    id: 'profile',
    path: '/profile',
    title: 'Profile Settings',
    icon: Settings2Icon, // Or a suitable icon
    description: 'Manage your profile settings',
  }
];

const ModularMenu: React.FC<ModularMenuProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession() as { data: CustomSession | null };
  const [currentTitle, setCurrentTitle] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [storedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const [showAddNewModal, setShowAddNewModal] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState<boolean>(false);
  const [newAccount, setNewAccountName] = useState("");
  const [showMessages, setShowMessages] = useState(false);
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);

  // Get the unsaved changes context

  const bellWarning = [
    { id: '1', msg: "Not saved message", tbl: 'tblMessage' },
    { id: '2', msg: "Not saved 2 ge", tbl: 'tbl1' },
    { id: '3', msg: "Not saved 3", tbl: 'tbl3' },
    { id: '4', msg: "Not saved 4", tbl: 'tbl4' },
    { id: '5', msg: "Not saved 5", tbl: 'tbl5' }
  ];

  const toggleMessages = () => {
    setShowMessages(!showMessages);
    setExpandedMessage(null);
  };

  const expandMessage = (bellId: string) => {
    setExpandedMessage(expandedMessage === bellId ? '' : bellId);
  };

  // Fetch user accounts
  const fetchAccounts = async (userId: string | undefined) => {
    if (!userId) return;
    console.log("👉 modularmenu  calls app/api/user/[id]/account - route.ts | Returning account");
    try {
      const res = await fetch(`/api/user/${userId}/account`);
      const data: Account[] = await res.json();
      setAccounts(data);

      if (userId && data.length > 0) {
        console.log("👉 MM: 129 set account:", data);

        // Check localStorage for selected account
        const storedAccountString = localStorage.getItem('selectedAccount');
        if (storedAccountString) {
          try {
            const storedAccount: Account = JSON.parse(storedAccountString);
            const foundAccount = data.find(account => account.account_id === storedAccount.account_id);

            if (foundAccount) {
              setSelectedAccount(foundAccount);
              toast.info(`Last account "${foundAccount}" is selected. Returned from history.`);
              console.log("✅ MM: Selected account from localStorage:", foundAccount);
            } else {
              console.log("❌ Stored account not found in fetched data.");
              if (data.length > 0) {
                setSelectedAccount(data[0]);
                localStorage.setItem("selectedAccount", JSON.stringify(data[0]));
                toast.info("Choosen account in top bar is done");
              }
            }
          } catch (error) {
            console.error("Error parsing stored account:", error);
            if (data.length > 0) {
              setSelectedAccount(data[0]);
              localStorage.setItem("selectedAccount", JSON.stringify(data[0]));
            }
          }
        } else {
          if (data.length > 0) {
            setSelectedAccount(data[0]);
            localStorage.setItem("selectedAccount", JSON.stringify(data[0]));
          }
        }
      }
    } catch (error) {
      console.error("Could not fetch accounts:", error);
    }
  };

  const handleCreateAccount = async () => {
    setIsCreatingAccount(true);
    try {
      const res = await fetch('/api/account/createAccount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountName: newAccount }),
      });
      // ... handle response and errors
      const data = await res.json();
      saveHistory(data.account_id, 'Account', session?.user?.id?.toString() || '');
      setShowAddNewModal(false);
      fetchAccounts(session?.user?.id);
    } catch (error) {
      console.log(error);
    } finally {
      setIsCreatingAccount(false);
    }
  };

  // Navigation handler that checks current path
  const handleNavigation = (path: string) => {
    // Don't navigate if we're already on this page
    if (pathname === path) {
      return;
    }


  useEffect(() => {
    const storedAccountString = localStorage.getItem('selectedAccount');
    console.log("useEffect loading storedAccountString ", storedAccountString);
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      const fetchAndSelectAccount = async () => {
        try {
          if (session === undefined || session === null) {
            return;
          } else {
            const usrId = session?.user?.id || null;
            const res = await fetch(`/api/user/${usrId}/account`);
            const data: Account[] = await res.json();
            setAccounts(data);
            console.log("✅ MM:  account from api:", data);
            if (data.length > 0) {
              // Try to load from history first
              const storedHistory = getHistory(usrId);
              if (storedHistory && storedHistory.length > 0) {
                const lastAccountHistory = storedHistory[0];
                if (lastAccountHistory && lastAccountHistory.id) {
                  const foundAccount = data.find(account => account.account_id === lastAccountHistory.id);
                  if (foundAccount) {
                    setSelectedAccount(foundAccount);
                    localStorage.setItem('selectedAccount', JSON.stringify(foundAccount));
                    console.log("✅ MM: Selected account from history:", foundAccount);
                    toast.success(`Selected account "${foundAccount}" successfully based on history.`);
                    return;
                  }
                }
              }

              // If no history or history account not found, try localStorage
              const storedAccountString = localStorage.getItem('selectedAccount');
              if (storedAccountString) {
                try {
                  const storedAccount: Account = JSON.parse(storedAccountString);
                  const foundAccount = data.find(account => account.account_id === storedAccount.account_id);
                  if (foundAccount) {
                    setSelectedAccount(foundAccount);
                    console.log("✅ Selected account from localStorage:", foundAccount);
                    return;
                  }
                } catch (error) {
                  console.error("Error parsing stored account:", error);
                }
              }

              // If neither history nor localStorage, select the first account
              setSelectedAccount(data[0]);
              localStorage.setItem('selectedAccount', JSON.stringify(data[0]));
              console.log("✅ Selected first account:", data[0]);
            }
          }
        } catch (error) {
          console.error("Could not fetch accounts:", error);
        }
      };

      fetchAndSelectAccount();
    }
  }, [session?.user?.id]);

  useEffect(() => {
    // Find the module that matches the current path
    if (pathname) {
      const activeModule = modules.find(module => pathname === module.path);
      if (activeModule) {
        setCurrentTitle(activeModule.title);
        document.title = activeModule.title;
      } else if (pathname.startsWith('/pipeline/')) {
        setCurrentTitle("Pipeline-Stage Builder");
        document.title = 'Pipeline-Stage';
      } else {
        // Handle cases where the path doesn't match a module (e.g., 404 page)
        setCurrentTitle("loading....");
        document.title = "Not Found"; // Or a default title
      }
    }
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-background-alt">
      {/* Sidebar */}
      <div className="w-16 hover:w-64 bg-white shadow-md transition-all duration-200 flex flex-col gap-1 p-2">
        {modules.map((module) => (
          <MenuItem
            key={module.id}
            module={module}
            isActive={pathname === module.path}
            onClick={() => handleNavigation(module.path)}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white shadow-sm p-4 flex justify-between items-center relative">
          <h1 className="text-xl font-heading font-bold text-accent">{currentTitle}</h1>
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <div className="relative">
              <button
                className="p-2 hover:bg-primary/10 rounded-full transition-colors"
                onClick={toggleMessages}
              >
                <Bell className="w-6 h-6 text-neutral" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {bellWarning.length}
                </span>
              </button>
              {showMessages && (
                <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-lg w-64 py-1 z-50">
                  <h3 className="px-4 py-2 font-semibold">Latest Messages</h3>
                  <ul>
                    {bellWarning.map((message) => (
                      <li
                        key={message.id}
                        className="px-4 py-2 hover:bg-primary/10 cursor-pointer"
                        onClick={() => expandMessage(message.id)}
                      >
                        <strong>{message.msg}</strong>
                        {expandedMessage === message.id && (
                          <p className="text-sm text-gray-600 mt-1">Table: {message.tbl}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Accounts Dropdown */}
            <div className="relative">
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background-alt hover:bg-primary/10 transition-colors"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <span className="text-accent font-medium">{storedAccount?.tblAccount.name || "Select Account"}</span>
                <ChevronDown className="w-4 h-4 text-neutral" />
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-lg w-48 py-1 z-50">
                  {accounts.map((account) => (
                    <button
                      key={account.account_id}
                      className="w-full px-4 py-2 text-left hover:bg-primary/10 transition-colors"
                      onClick={() => {
                        // Only check for unsaved changes if we're selecting a different account
                        const isNewAccount = !storedAccount || account.account_id.toString() !== storedAccount.account_id.toString();

                        if (!isNewAccount) {
                          // Same account, just close dropdown
                          setShowDropdown(false);
                          return;
                        }

                      }}
                    >
                      {account.tblAccount.name}
                    </button>
                  ))}
                  <hr /> {/* Separator */}

                  <button
                    id='btnAddNewAcc'
                    className="w-full px-4 py-2 text-left hover:bg-primary/10 transition-colors"
                    onClick={() => {
                      const addBtn = document.getElementById("btnAddNewAcc");
                      if (!addBtn) { return; }
                      addBtn.style.display = 'none';
                      setShowAddNewModal(true);
                    }}
                  >
                    -- Add New --
                  </button>
                  {showAddNewModal && (
                    <div className="flex justify-center items-center">
                      <div className="bg-white rounded-lg p-4">
                        <h6 className="text-blue-500 text-sm">Name for new Account</h6>
                        <input
                          type="text"
                          placeholder="Account Name"
                          value={newAccount}
                          onChange={(e) => setNewAccountName(e.target.value)}
                          className="w-full border rounded px-2 py-1 mb-2"
                        />
                        <div className="flex justify-end">
                          <button
                            onClick={() => { console.log("handleCreateAccount()"); setIsCreatingAccount(true); handleCreateAccount(); }}
                            className="bg-primary text-white rounded px-2 py-1 hover:bg-primary-dark transition-colors disabled:opacity-50 mr-2"
                          >
                            {isCreatingAccount ? "Creating..." : "Create"}
                          </button>
                          <button
                            onClick={() => {
                              setShowAddNewModal(false);
                              const addBtn = document.getElementById("btnAddNewAcc");
                              if (!addBtn) { return; }
                              addBtn.style.display = 'block';
                              setIsCreatingAccount(false);
                            }}
                            className="bg-gray-200 rounded px-2 py-1 hover:bg-gray-300 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile Section with Dropdown */}
            <div className="relative">
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <UserCircle className="w-8 h-8 text-gray-600" />
                <span className="text-gray-700 font-medium">{session?.user?.name || "User"}</span>
                <ChevronDown className="w-4 h-4 text-gray-600" />
              </div>

              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 bg-white rounded-md shadow-lg w-48 z-50">
                  <div
                    className="px-4 py-2 cursor-pointer hover:bg-gray-100 flex items-center gap-2"
                    onClick={() => {
                      router.push('/profile');}}
                  >
                    <Settings2Icon size={16} />
                    Profile Settings
                  </div>
                  <div
                    className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-red-600 flex items-center gap-2"
                    onClick={async () => {
                        router.push('/login');
                    }}
                  >
                    <LogOut size={16} />
                    Logout
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6 pb-0 flex-1">
          {/* The key attribute holds the id of the selected account.
              This helps React efficiently update/re-render the component when selectedAccount changes.
              If selectedAccount?.account_id is null or undefined, it defaults to "0".
              Account ID 0 represent an invalid account because the first account is added to the database with id 1.
              */}
          <div className="bg-white rounded-lg shadow-sm" key={storedAccount?.account_id || "0"}>
            {/* React forces a re-render everytme the key attribute of the parrent changes (because the user select a different account), */}
            {Children.map(children, (child) => {
              return child;
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
 return null; // valid ReactNode
}
export default ModularMenu;