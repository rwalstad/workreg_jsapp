//app/dashboard/dashboardClient.tsx
"use client";
import { useState, useEffect , ReactNode} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, Home, Settings, Users, NotebookTabs, Columns, Settings2Icon, Bell, UserCircle, ChevronDown, LogOut, LucideIcon, ChartArea, MessageSquare, CirclePlay } from 'lucide-react';
import MenuItem from './../components/MenuItem';
import React, { Children, cloneElement } from 'react';
import { HistoryItem, HistoryItemPath } from '../lib/api';
import { toast } from "sonner";

interface Module {
  id: string;
  path: string;
  title: string;
  icon: LucideIcon;
  description: string;
}
interface User {
  id?: number;
  email?: string;
  fname?: string | null;
  lname?: string | null;
  accessLvl?: number;
  last_activity?: string | Date;
}
interface Account {
  account_id: string;
  name?: string;
  tblAccount?: {
    name: string | null;
  };
}
interface JWTPayload {
  id: number;
  email: string;
  fname: string | null;
  lname: string | null;
  accessLvl: number;
  last_activity?: string | Date;
}

interface ModularMenuProps {
  children: ReactNode;
  user: User | null;
}

// Add this custom type to extend the default Session type
/*interface CustomSession extends Session {
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
*/
// Module definitions with paths
const modules: Module[] = [
  {
    id: 'dashboard',
    path: '/dashboard',
    title: 'Dashboard',
    icon: Home,
    description: 'Overview & login activities'
  }, {
    id: 'messages',
    path: '/messages',
    title: 'Messages',
    icon: MessageSquare,
    description: 'Manage your leads'
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
    icon: Settings2Icon,
    description: 'Manage your profile settings',
  }
];

const ModularMenu: React.FC<ModularMenuProps> = ({  user, children }) => {
  const pathname = usePathname();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
//  const { selectedAccount, setSelectedAccount, isLoading: accountLoading } = useAccount();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const accountLoading = loading;
  const [currentTitle, setCurrentTitle] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const [showAddNewModal, setShowAddNewModal] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState<boolean>(false);
  const [newAccount, setNewAccountName] = useState("");
  const [showMessages, setShowMessages] = useState(false);
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);

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

  // Fetch user session and accounts
  const fetchSessionAndAccounts = async () => {
    /*
    try {
      const resUser = await fetch('/api/auth/me');
      if (!resUser.ok) throw new Error('Failed to fetch session');

      const { user } = await resUser.json();
      setUser(user);

      if (user?.id) {
        const resAccounts = await fetch(`/api/user/${user.id}/account`);
        if (resAccounts.ok) {
          const accountsData = await resAccounts.json();
          setAccounts(accountsData);
          if (accountsData.length > 0) setSelectedAccount(accountsData[0]);
        } else {
          setAccounts([]);
        }
      }
    } catch (error) {
      console.error('Session fetch error:', error);
      setUser(null);
      setAccounts([]);
      setSelectedAccount(null);
    } finally {
      setLoading(false);
    } */
  };
  useEffect(() => {
    console.log("✅ ModularMenu: received accounts:", accounts);
    fetchAccounts(user?.id || 0);
  }, []);

  // Fetch user accounts
  const fetchAccounts = async (userId: number | 0) => {
    if (!userId) return;
    console.log("👉 ModularMenu: Fetching accounts for user:", userId);
    
    try {
      const res = await fetch(`/api/user/${userId}/account`);
      const data: Account[] = await res.json();
      setAccounts(data);
      console.log("✅ ModularMenu: Fetched accounts:", data);

      // If there's no selected account yet and we have accounts, select the first one
      if (!selectedAccount && data.length > 0) {
        console.log("ℹ️ ModularMenu: No account selected, setting first account:", data[0]);
        setSelectedAccount(data[0]);
        toast.info(`Selected account: ${data[0].name || data[0].tblAccount?.name || data[0].account_id}`);
        setLoading(true);
      }
    } catch (error) {
      console.error("❌ ModularMenu: Could not fetch accounts:", error);
      toast.error("Failed to load accounts");
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
      
      if (!res.ok) {
        throw new Error('Failed to create account');
      }
      
      const data = await res.json();
      toast.success(`Account "${newAccount}" created successfully`);
      setShowAddNewModal(false);
      setNewAccountName("");
      
      // Refresh accounts list
      await fetchAccounts(user?.id || 0);
    } catch (error) {
      console.error("❌ Error creating account:", error);
      toast.error("Failed to create account");
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const handleAccountSelect = (account: Account) => {
    console.log("👉 ModularMenu: Switching to account:", account);
    setSelectedAccount(account);
    setShowDropdown(false);
    toast.success(`Switched to: ${account.name || account.tblAccount?.name || account.account_id}`);
  };

  // Navigation handler that checks current path
  const handleNavigation = (path: string) => {
    if (pathname === path) {
      return;
    }
    router.push(path);
  };



  // Update page title based on current path
  useEffect(() => {
    if (pathname) {
      const activeModule = modules.find(module => pathname === module.path);
      if (activeModule) {
        setCurrentTitle(activeModule.title);
        document.title = activeModule.title;
      } else if (pathname.startsWith('/pipeline/')) {
        setCurrentTitle("Pipeline-Stage Builder");
        document.title = 'Pipeline-Stage';
      } else {
        setCurrentTitle("Loading...");
        document.title = "Not Found";
      }
    }
  }, [pathname]);

  // Log when selected account changes
  useEffect(() => {
    console.log("🔄 ModularMenu: selectedAccount changed:", selectedAccount);
  }, [selectedAccount]);

  // Get display name for selected account
  const getAccountDisplayName = () => {
    console.log("🔎 ModularMenu: Getting display name for selectedAccount:", selectedAccount);
    if (!selectedAccount) return "Select Account";
    return selectedAccount.name || selectedAccount.tblAccount?.name || `Account ${selectedAccount.account_id}`;
  };

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
                disabled={accountLoading}
              >
                <span className="text-accent font-medium">
                  {accountLoading ? "Loading..." : getAccountDisplayName()}
                </span>
                <ChevronDown className="w-4 h-4 text-neutral" />
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-lg w-48 py-1 z-50">
                  {accounts.length === 0 ? (
                    <div className="px-4 py-2 text-gray-500 text-sm">No accounts available</div>
                  ) : (
                    accounts.map((account) => (
                      <button
                        key={account.account_id}
                        className={`w-full px-4 py-2 text-left hover:bg-primary/10 transition-colors ${
                          selectedAccount?.account_id === account.account_id 
                            ? 'bg-primary/5 font-semibold' 
                            : ''
                        }`}
                        onClick={() => handleAccountSelect(account)}
                      >
                        {account.name || account.tblAccount?.name || `Account ${account.account_id}`}
                        {selectedAccount?.account_id === account.account_id && (
                          <span className="ml-2 text-primary">✓</span>
                        )}
                      </button>
                    ))
                  )}
                  <hr />
                  <button
                    id='btnAddNewAcc'
                    className="w-full px-4 py-2 text-left hover:bg-primary/10 transition-colors text-primary"
                    onClick={() => {
                      setShowAddNewModal(true);
                      setShowDropdown(false);
                    }}
                  >
                    + Add New Account
                  </button>
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
                <span className="text-gray-700 font-medium">{user?.fname || "User"}</span>
                <ChevronDown className="w-4 h-4 text-gray-600" />
              </div>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 bg-white rounded-md shadow-lg w-48 z-50">
                  <div
                    className="px-4 py-2 cursor-pointer hover:bg-gray-100 flex items-center gap-2"
                    onClick={() => {
                      router.push('/profile');
                      setShowProfileMenu(false);
                    }}
                  >
                    <Settings2Icon size={16} />
                    Profile Settings
                  </div>
                  <div
                    className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-red-600 flex items-center gap-2"
                    onClick={async () => {
                      //TODO: make logout and clean session
                      //await signOut({ redirect: false });
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
          <div className="bg-white rounded-lg shadow-sm" key={selectedAccount?.account_id || "0"}>
            {Children.map(children, (child) => {
              return child;
            })}
          </div>
        </div>
      </div>

      {/* Add New Account Modal */}
      {showAddNewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">Create New Account</h2>
            <input
              type="text"
              placeholder="Account Name"
              value={newAccount}
              onChange={(e) => setNewAccountName(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddNewModal(false);
                  setNewAccountName("");
                  setIsCreatingAccount(false);
                }}
                className="bg-gray-200 rounded px-4 py-2 hover:bg-gray-300 transition-colors"
                disabled={isCreatingAccount}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAccount}
                className="bg-primary text-white rounded px-4 py-2 hover:bg-primary-dark transition-colors disabled:opacity-50"
                disabled={isCreatingAccount || !newAccount.trim()}
              >
                {isCreatingAccount ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModularMenu;