//app/(default)/pipeline/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import NewPipelineButton from "../../components/NewPipelineButton";
import { Workflow } from 'lucide-react';
import {PipelineData  } from   '@/types';
import { saveHistory, CustomSession } from '../../../app/lib/api';

interface Account {
    account_id: string;
    accountName: string;
    access_level: number;
}

export default function PipelinePage() {
    const router = useRouter();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [pipelines, setPipelines] = useState<PipelineData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const { data: session, status } = useSession() as {
        data: CustomSession | null;
        status: 'loading' | 'authenticated' | 'unauthenticated';
    };
    const addNewPipeline = (newPipeline: PipelineData) => {
        setPipelines(prevPipelines => [...prevPipelines, newPipeline]);
    };

    useEffect(() => {
        // Redirect if not authenticated
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    useEffect(() => {
        if (session?.user?.id) {
            const storedAccountString = localStorage.getItem('selectedAccount');
            console.log("📋 45 PL: useEffect- storedaccount :", storedAccountString);
            if (storedAccountString) {
                try {
                    const selectedAccountObject = JSON.parse(storedAccountString);
                    setSelectedAccount(selectedAccountObject);
                    fetchPipelines(); // Fetch pipelines immediately after setting selectedAccount
                } catch (error) {
                    console.error("Error parsing selected account:", error);
                    setSelectedAccount(null);
                }
            } else {
                setSelectedAccount(null);
            }
        }
    }, [session]);

    // Fetch pipelines when an account is selected by authorized user
    useEffect(() => {
        if (status === 'authenticated' && selectedAccount) {
            fetchPipelines();
        }
    }, [status, selectedAccount]);

    const fetchPipelines = async () => {
        if (status === 'authenticated' && session?.user?.id && selectedAccount) {
            setLoading(true);
            try {
                console.log("76: fetchPipelines - selectedAccount; ", selectedAccount);
                const response = await fetch(`/api/pipeline`);
                if (!response.ok) throw new Error('Failed to fetch pipelines');
                const data = await response.json();
                setPipelines(data);
            } catch (error) {
                console.error('Error fetching pipelines:', error);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleOpenPipeline = (pipelineId: string) => {
        if (status === 'authenticated' && session?.user?.id) {
            saveHistory(pipelineId, 'Pipeline', session.user.id);
            router.push(`/pipeline/${pipelineId}`);
        }
    };

    if (status === 'loading' || !session) {
        return <div className="p-8 text-center">Loading...</div>;
    }
//newPipeline: PipelineData) => void
    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Pipelines</h1>
                {selectedAccount && (
                    <span className="ml-2 text-sm text-gray-500">
                        (Current AccountID: {selectedAccount.account_id})
                    </span>
                )}
                {selectedAccount && (
                    <NewPipelineButton
                    accountId={selectedAccount.account_id}
                    onPipelineCreated={addNewPipeline}
                    />
      )}
            </div>

            {selectedAccount ? (
                <> {/* Corrected wrapping here */}
                    {loading ? (
                        <div className="text-center p-8">Loading pipelines...</div>
                    ) : pipelines.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {pipelines.map(pipeline => (
                                <Card
                                    key={pipeline.id}
                                    className="cursor-pointer hover:shadow-md transition-shadow"
                                    onClick={() => handleOpenPipeline(pipeline.id)}
                                >
                                    <CardHeader className="flex flex-row items-center gap-2">
                                        <Workflow className="h-5 w-5 text-blue-600" />
                                        <CardTitle>{pipeline.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <CardDescription>
                                            Created: {new Date(pipeline.created).toLocaleDateString()}
                                        </CardDescription>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center p-8 border rounded-lg">
                            <p className="text-gray-500 mb-4">No pipelines found. Create your first pipeline!</p>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center p-8 border rounded-lg">
                    <p className="text-gray-500">No account selected.</p>
                </div>
            )}
        </div>
    );
}