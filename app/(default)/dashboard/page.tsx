'use client';
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { CustomSession, saveHistory, HistoryItem, getHistory } from '../../lib/api';

import { useActions } from '../../../actionsContext';
import { useAccount } from '../../components/AccountContext';
import { AccountWithName } from '../../../types';

interface PipelineShort {
    id: string;
    name: string;
    created: string;
}

export default function DashboardPage() {
    // Use the account context for client-side account selection
    const { selectedAccount, setSelectedAccount, isLoading } = useAccount();
    const [accountWname, setAccountWname] = useState<AccountWithName[]>([]);

    const [activities, setActivities] = useState<HistoryItem[]>([]);
    const [infoVisibleAcc, setInfoVisibleAcc] = useState(true);
    
    const { getIcon } = useActions();
    const { data: session, status } = useSession() as {
        data: CustomSession | null;
        status: 'loading' | 'authenticated' | 'unauthenticated';
    };
    const router = useRouter();
    const [pipelineError, setPipelineError] = useState<string | null>(null); // error state
    const [message, setMessage] = useState<string | null>(null);

    const handleAccountSelect = (accountId: string) => {
        console.log("🔎 handleAccountSelect for account:", accountId);
        const account = accountWname.find(acc => acc.account_id.toString() === accountId);

    };

    const displayMessage = (newMessage: string, duration = 6000) => {
        setMessage(newMessage);
        setTimeout(() => {
            setMessage(selectedAccount
                ? `Current account: ${selectedAccount.account_id.toString()}`
                : 'No account selected');
        }, duration);
    };


    const fetchData = async (userId: string) => {
        console.log("🔎 Fetching accounts for user-ID:", userId);
        try {
            const res = await fetch(`/api/user/${userId}/account`);
            if (!res.ok) {
                throw new Error(`Failed to fetch accounts: ${res.statusText}`);
            }

            const accounts: AccountWithName[] = await res.json();
            setAccountWname(accounts);
            console.log("✅ setAccountWname:", accounts);

            if (userId && accounts.length > 0) {
                // Try to find the stored account in the fetched accounts
                const storedAccountString = localStorage.getItem('selectedAccount');

                if (storedAccountString) {
                    try {
                        const storedAccount: AccountWithName = JSON.parse(storedAccountString);

                        // Find matching account in fetched accounts
                        const accountId = typeof storedAccount.account_id === 'string'
                            ? storedAccount.account_id
                            : storedAccount.account_id.toString();

                        const foundAccount = accounts.find(acc =>
                            acc.account_id.toString() === accountId);

                        if (foundAccount) {
                            setSelectedAccount(foundAccount);
                            console.log("✅ Selected account from localStorage:", foundAccount);
                        } else {
                            console.log("❌ Stored account not found in fetched data.");
                            if (accounts.length > 0) {
                                setSelectedAccount(accounts[0]);
                            }
                        }
                    } catch (error) {
                        console.error("Error parsing stored account:", error);
                        if (accounts.length > 0) {
                            setSelectedAccount(accounts[0]);
                        }
                    }
                } else if (accounts.length > 0) {
                    // No stored account, use first account
                    setSelectedAccount(accounts[0]);
                    displayMessage(`Loaded data for account ${accounts[0].account_id.toString()}`, 6000);
                }
            }
        } catch (error) {
            console.error("Could not fetch accounts:", error);
            if (error instanceof Error) {
                displayMessage(error.message, 6000);
            }
        }
    };



    // Initial setup - fetch accounts and history
    useEffect(() => {
        if (status === 'loading') return;

        if (status !== 'authenticated' || !session?.user?.id) {
            router.push('/login');
            return;
        }

        const userId = session.user.id.toString();

        const fetchDataAndProcess = async () => {
            await fetchData(userId);
            const userHistory = await getHistory(userId);
            setActivities(userHistory);
        };

        fetchDataAndProcess();
    }, [session?.user?.id, status, router]);

    // Show loading state while initializing
    if (isLoading || status === 'loading') {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-heading font-bold text-accent">Dashboard</h2>
                {message && (
                    <div className="flex justify-center w-[250px]">
                        <div className="bg-green-100 rounded-md p-2 text-sm text-gray-600 w-full">
                            {message}
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card bg-gradient-to-br from-primary/10 to-primary/5 relative">
                    <h3 className="font-heading font-semibold text-lg text-accent mb-4">Accounts Available </h3>
                    {selectedAccount && (
                        <span className="ml-2 text-sm text-gray-500">
                            (Selected account ID: {selectedAccount.account_id.toString()})
                        </span>
                    )}
                    <div className="max-h-[400px] overflow-y-auto pr-2">
                        <ol className="Account-list space-y-2" id="Account-list">
                            {accountWname.map((account) => (
                                <li
                                    key={account.account_id.toString()}
                                    className={`p-2 rounded-md transition-colors ${
                                        selectedAccount && account.account_id.toString() === selectedAccount.account_id.toString()
                                            ? "bg-primary/20 border-l-4 border-primary"
                                            : "hover:bg-yellow-300"
                                    }`}
                                    onClick={() => handleAccountSelect(account.account_id.toString())}
                                >
                                    {account.tblAccount?.name ?? "Unnamed Account"} ({account.account_id.toString()})
                                </li>
                            ))}
                        </ol>
                    </div>
                    {infoVisibleAcc ? (
                        <div className="absolute left-[50%] right-[2%] top-[50%] transform -translate-y-[50%] text-xs bg-gray-100 p-2 rounded-md">
                            - change current account by using dropdown in top menu<br />
                            - select the account you want to work with<br />
                            - the pipeline will be loaded from the selected account<br />
                            <button
                                onClick={() => setInfoVisibleAcc(false)}
                                className="mt-2 bg-blue-500 text-white px-3 py-1 rounded-md text-sm"
                            >
                                I got it so go hide
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setInfoVisibleAcc(true)}
                            className="absolute top-2 right-2 p-2 rounded-full bg-gray-200"
                        >
                            {getIcon('info', 'w-5 h-5')}
                        </button>
                    )}
                </div>

                <div className="card bg-gradient-to-br from-secondary/10 to-secondary/5">
                    <h3 className="font-heading font-semibold text-lg text-accent mb-4">Recent Activity</h3>
                    <ol className="Activity-list space-y-2" id="Activity-list">
                        {activities.map((Activity) => (
                            <li
                                key={Activity.id + Activity.hDateTime}
                                className={`p-2 rounded-md transition-colors ${
                                    selectedAccount &&
                                    Activity.id === selectedAccount.account_id.toString() &&
                                    Activity.path === 'Account'
                                        ? "bg-primary/20 border-l-4 border-primary"
                                        : "hover:bg-yellow-300"
                                }`}
                                onClick={() => {
                                    if (Activity.path === 'Account') {
                                        handleAccountSelect(Activity.id);
                                    }
                                    router.push('/');
                                }}
                            >
                                {Activity.path} - {Activity.id} - @: {Activity.hDateTime}
                            </li>
                        ))}
                    </ol>
                </div>

                <div className="card bg-gradient-to-br from-green-50 to-green-100/50">
                    <h3 className="font-heading font-semibold text-lg text-accent mb-4">
                        Pipelines linked to account: {selectedAccount?.account_id.toString()}
                    </h3>
                    <div className="max-h-[400px] overflow-y-auto pr-2">
                        <ol className="Pipeline-list space-y-2" id="Pipeline-list">

                        </ol>
                    </div>
                </div>

                <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100/50">
                    <h3 className="font-heading font-semibold text-lg text-accent mb-4">Statistics</h3>
                    <p className="text-text-light">Key statistics will be shown here</p>
                </div>
            </div>
        </div>
    );
}