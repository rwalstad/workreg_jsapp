// app/(default)/settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useActions } from '../../../actionsContext';
import { useSession } from 'next-auth/react';

interface Account {
  account_id: string;
  access_level: number | null;
  tblAccount: {
      name: string;
  };
}
interface User {
  user_id: bigint;
  access_level: number | null;
  tblUser: {
    fname: string | null;
    lname: string | null;
    email: string | null;
  } | null;
}
export default function AccountSettings() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editedAccountName, setEditedAccountName] = useState('');
  const { data: session } = useSession();
  const { actionLibrary } = useActions();
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [accountUsers, setAccountUsers] = useState<User[]>([]);
  const { getIcon } = useActions();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [accessLevel, setAccessLevel] = useState(99);
  const [userDialogMessage, setUserDialogMessage] = useState<string | null>(null);
  const [userExist, setUserExist] = useState(Boolean);
  const [sendInvite, setSendInvite] = useState(false);
  const [maskedEmail, setmaskedEmail] = useState<string | null>(null);
  const [usrEmail, setusrEmail] = useState<string | null>(null);
  const fetchAccounts = async (userId: string | undefined) => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/user/${userId}/account`);
      if (!res.ok) {
        throw new Error('Failed to fetch accounts');
      }
      const data: Account[] = await res.json(); // Type the response
      setAccounts(data);
      console.log("Settings: setAccounts - accounts ", accounts);
    } catch (error) {
      console.error('Error fetching user accounts:', error);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchAccounts(session.user.id);
    }
  }, [session]);

  useEffect(() => {
    console.log("userExist is : ", userExist);
    if(!sendInvite){
      if (userExist){return;}
      const emailChk = isValidEmail(userInput);
      console.log("email check returned: ", emailChk);
      if(!emailChk){
        setUserDialogMessage("Type correct email");
        setSendInvite(false); // uncheck checkbox
      }
    }else{
      console.log("send invite is truuuu : the email is ",usrEmail);
      if (userExist){return;}
      const emailChk = isValidEmail(userInput);
      if(!emailChk){
        setUserDialogMessage("Type correct email");
        setSendInvite(false); // uncheck checkbox
      }
      else{
        setusrEmail(userInput);

      }
    }
  }, [sendInvite]);

  // Fetch users when account is selected
  useEffect(() => {
    if (!session) return;
        const usrId = session.user?.id || null;
    console.log("page setting_ selected account",selectedAccount?.account_id," | User ID is", usrId);
    const fetchUsers = async () => {
      if (selectedAccount !== null) { // Explicit check


        const res = await fetch(`/api/account/${selectedAccount.account_id}/access`);
        const usrAccess: User[] = await res.json();
        console.log("✅ account setting: account from API:", usrAccess);
        setAccountUsers(usrAccess);
        //setUserExist(false);
      }
    };
    fetchUsers();
  }, [selectedAccount]);

  useEffect(() => {
    // Reset checkbox and button when userInput changes
    setUserDialogMessage(null);
    setSendInvite(false); // uncheck checkbox
    if (userInput) {
      setUserDialogMessage(null);
    }
  }, [userInput, setUserDialogMessage, setSendInvite]); // Dependencies:  userInput and setter functions for states that are changed

  useEffect(() => {
    console.log("userExist is : ", userExist);
    if (!sendInvite) {
      if (userExist) {
        return;
      }
      const emailChk = isValidEmail(userInput);
      console.log("email check returned: ", emailChk);
      if (!emailChk) {
        setUserDialogMessage("Type correct email");
        setSendInvite(false); // uncheck checkbox
      }
    } else {
      console.log("send invite is truuuu : the email is ", usrEmail);
      if (userExist) {
        return;
      }
      const emailChk = isValidEmail(userInput);
      if (!emailChk) {
        setUserDialogMessage("Type correct email");
        setSendInvite(false); // uncheck checkbox
      } else {
        setusrEmail(userInput);
      }
    }
  }, [sendInvite]);

  function maskEmail(email : string) {
    if (!email || typeof email !== 'string') {
      return "Invalid email";
    }

    const atIndex = email.indexOf('@');
    const dotIndex = email.lastIndexOf('.');

    if (atIndex === -1 || dotIndex === -1 || atIndex >= dotIndex -1) {
      return "Invalid email format";
    }

    const prefix = email.substring(0, 2);
    const domainPrefix = email.substring(atIndex, atIndex + 3);
    const domainSuffix = email.substring(dotIndex);

    return `${prefix}...${domainPrefix}...${domainSuffix}`;
  }

//    const maskedEmail = maskEmail(email);
  const handleEdit = (account: Account) => {
    setEditingAccountId(account.account_id);
    setEditedAccountName(account.tblAccount?.name || 'No Name');

  };
  const handleAccountClick = (account: Account) => {
    console.log("handleAccountClick for id:  ", account.account_id,);
    setSelectedAccount(account);
  };
  const handleSaveAccountName = async (accountId: string) => {
    try {
      console.log("handleSave for id:  ", accountId,'  editedAccountName',editedAccountName);
      const res = await fetch(`/api/account/${accountId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: editedAccountName }),
      });

      if (!res.ok) {
        throw new Error('Failed to update account');
      }
      setAccounts(
        accounts.map((acc) =>
          acc.account_id === accountId ? {
            ...acc,
            tblAccount: { ...acc.tblAccount, name: editedAccountName }
          } : acc
        )
      );

      setEditingAccountId(null);
    } catch (error) {
      console.error('Error updating account:', error);
    }
  };
  const  handleSendInvitation= async (account: Account, userInput: string, accessLevel: number) => {
    const sqlData =
    {
      account_id: account.account_id,
      user_id: userInput,
      access_level: accessLevel,
    }
    console.log("206: handleSendInvitation - usrinput: ", sqlData);//app/api/account/[id]/access/route.ts
    const addUserAccountSQL = await fetch(`/api/account/${account.account_id}/access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sqlData),
    });

  };
  const handleInviteChk = async () => {
    try {
      console.log("handleInviteChk start with usrinput: ", userInput);

      if (userInput.includes('@')) {
        console.log("handleInviteChk - usrinput is with email: ", userInput);
      } else {
        console.log("handleInviteChk - checking SQL for user: ", userInput);
        // TODO: Switch to GET for querying info
        const userExistSQL = await fetch(`/api/user/${userInput}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userInput }),
        });

        if (!userExistSQL.ok) {
          setUserDialogMessage(`User with id ${userInput} doesn't exists. Send invite through email.`);
          setUserExist(false);
          console.log("!userExistSQL - usr exists false :  - ", userExist);
          return;
        } else {
          setUserExist(true);
          console.log(" userExistSQL - usr exists true:  - ", userExist);
        }

        const userData = await userExistSQL.json();
        setusrEmail(userData);

        console.log("handleInviteChk - usr exists - setusrEmail:  - ", userData);
        if (userData && userData.email) {
          setUserExist(true);
        } else if (userData && !sendInvite) {
          // user was found but has no email
          setUserDialogMessage(`User with id ${userInput} already exists. Send invite through email.`);
        } else {
          setShowInviteModal(false);
        }
        if (!sendInvite) {
          return;
        }
        setShowInviteModal(false);
        console.log('handleInviteChk done - send invite - User Data:', userData);
        return userData;
      }
      setShowInviteModal(false);
      setUserInput('');
    } catch (error) {
      console.error('Invitation failed:', error);
    }
  };

  useEffect(() => {
    console.log('useEffect usrEmail:', usrEmail);
    if (usrEmail) {
      const masked = maskEmail(usrEmail);
      setUserDialogMessage(`User with email ${usrEmail} already exists. Send invite through email: ${masked}.`);
    }
  }, [usrEmail]);

  // Email validation function
  const isValidEmail = (inputTxt:string) => {
      // Basic email validation regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(inputTxt);
  };

  const handleDelete = async (accountId: string) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      const accData={
        account_id: accountId,
        user_id: session?.user?.id
      }
       console.log("✅/api/user/${session?.user?.id}/account : deleting :",accData);
      try {
        const res = await fetch(`/api/user/${session?.user?.id}/account`, {
          method: 'DELETE',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(accData),
        });

        if (!res.ok) {
          throw new Error('Failed to delete account');
        }

        setAccounts(accounts.filter((acc) => acc.account_id !== accountId));
      } catch (error) {
        console.error('Error deleting account:', error);
      }
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Account Settings</h1>
      <div className="flex gap-8 p-4">
        {/* Account List (Left) */}
        <div className="w-1/2">
          <h2 className="text-xl font-bold mb-4">Account List</h2> {/* Changed h1 to h2 for semantic structure */}
          <div className="overflow-x-auto">
            <table className="relative mb-4 w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions {/* More descriptive than just settings icon */}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {accounts.map((account) => (
                  <tr
                    key={account.account_id}
                    className="cursor-pointer hover:bg-gray-100" // Added hover effect for usability
                    onClick={() => handleAccountClick(account)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingAccountId === account.account_id ? (
                        <input
                          type="text"
                          value={editedAccountName}
                          onChange={(e) => setEditedAccountName(e.target.value)}
                          className="border rounded p-2 w-full" // Added w-full for better input width
                        />
                      ) : (
                        `${account.tblAccount?.name || 'No Name'} (${account.account_id})`
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingAccountId === account.account_id ? (
                        <button
                          onClick={() => handleSaveAccountName(account.account_id)}
                          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700" // Added hover effect
                        >
                          Save
                        </button>
                      ) : (
                        <div className="flex items-center space-x-2">
                          {/* Consider using Link component from React Router for navigation if these actions navigate to different pages */}
                          <button
                            onClick={() => handleAccountClick(account)}
                            className="text-green-600 hover:text-green-900"
                          >
                            {getIcon('users')}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent row click when editing
                              handleEdit(account);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            {getIcon('pencil')}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent row click when deleting
                              handleDelete(account.account_id);
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            {getIcon('trash')}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* User List (Right) */}
        <div className="w-1/2 p-4 bg-gray-50 rounded-lg shadow">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">
              Show users with access to
              <br /> {selectedAccount?.tblAccount?.name || 'No Account Selected'} {/* Added safety check */}
            </h3>
          </div>
          {selectedAccount ? (
            <div>
              <button
                onClick={() => setShowInviteModal(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
              >
                + Add User
              </button>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        First & Last Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Access lvl
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions {/* Changed settings to Actions */}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {accountUsers.map((AccUser) => (
                      <tr key={AccUser.user_id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {AccUser.user_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {AccUser.tblUser?.fname} {AccUser.tblUser?.lname}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {AccUser.tblUser?.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {AccUser.access_level}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {/* Add settings icons or buttons here */}
                          {/* Example:  <button onClick={() => handleRemoveUser(AccUser.user_id)} className="text-red-600 hover:text-red-900">{getIcon("trash")}</button> */}
                          <button className="text-red-600 hover:text-red-900">
                            {getIcon('trash')}
                          </button>
                          {AccUser.user_id.toString() !== session?.user?.id && (
                              <button className="text-blue-600 hover:text-red-900">
                                {getIcon('edit')}
                              </button>
                            )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Invite Modal */}
              {showInviteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
                  <div className="bg-white p-6 rounded-lg shadow-lg w-96">
                    <h2 className="text-lg font-semibold mb-4">Add User to Account</h2>

                    {userDialogMessage && (
                      <div className="mb-4 text-red-500">
                        {userDialogMessage}
                        {/* Add checkbox if the message contains the specific text */}
                        {userDialogMessage.includes("Send invite") && (
                          <div className="mt-3 flex items-center">
                            <input
                              type="checkbox"
                              id="sendInvite"
                              checked={sendInvite}
                              onChange={(e) => setSendInvite(e.target.checked)}
                              className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                            />
                            <label htmlFor="sendInvite" className="ml-2 text-sm text-gray-700">
                              Send invitation email
                            </label>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mb-4">
                    <label
                      htmlFor="userIdentifier"
                      className="block text-sm font-medium text-gray-700"
                    >
                      {userDialogMessage && userDialogMessage.includes("Type correct email") && !userExist
                        ? "Need to type email address for non existing user"
                        : "User ID or Email Address"}
                    </label>

                      <input
                        type="text"
                        id="userIdentifier"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        className="mt-1 block w-full bg-yellow-100 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm h-9"
                        style={{ height: '35px' }}
                      />
                    </div>
                        {/* Access Level Dropdown */}
                        <div className="mb-4">
                          <label htmlFor="accessLevel" className="block text-sm font-medium text-gray-700">
                            Access Level
                          </label>
                          <select
                            id="accessLevel"
                            value={accessLevel}
                            onChange={(e) => setAccessLevel(Number(e.target.value))} // Convert string to number
                            className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm h-9"
                          >
                            <option value={5}>Admin (5)</option>
                            <option value={20}>Edit Stages (20)</option>
                            <option value={90}>Read (90)</option>
                          </select>
                        </div>
                    <div className="flex justify-end">
                      {userDialogMessage &&
                      userDialogMessage.includes("Send invite through email") &&
                      sendInvite ? (
                        <button
                        onClick={() => {
                          console.log('/onClick= handleSendInvitation ');//TODO: fix sending mail
                          handleSendInvitation(selectedAccount, userInput, accessLevel);
                          setShowInviteModal(false);
                          }}
                          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 mr-2"
                        >
                          Send Invite
                        </button>
                      ) : (
                        <button
                          onClick={handleInviteChk}
                          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 mr-2"
                        >
                          Invite
                        </button>
                      )}
                      <button
                        onClick={() => {
                          console.log('/onClick= reset : ');
                          setShowInviteModal(false);
                          setUserDialogMessage(null); // Clear the message
                          setSendInvite(false); // Reset checkbox state
                        }}
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
               {/* show modal ends */}
            </div>
          ) : (
            <div className="text-gray-500 text-center mt-20">
              Select an account to view access permissions
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

