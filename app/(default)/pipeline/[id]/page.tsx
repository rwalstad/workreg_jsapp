//app/(default)/pipeline/[id]/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import DynamicPipelineView from '@/app/components/DynamicPipelineView';
import { PipelineData, StageDataWactions, AutomationAction } from '@/types';
import { CustomSession, saveHistory } from '@/app/lib/api';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function PipelinePage() {
    const params = useParams();
    const pipelineId = params?.id as string;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pipeline, setPipeline] = useState<PipelineData | null>(null);
    const [stages, setStages] = useState<StageDataWactions[]>([]);
    const [actions, setActions] = useState<AutomationAction[]>([]);
    const { data: session, status } = useSession() as {
        data: CustomSession | null;
        status: 'loading' | 'authenticated' | 'unauthenticated';
    };
    const router = useRouter();
    //const loggedUsr = session?.user?.id?.toString();

    useEffect(() => {
        if (status === 'loading') return; // Wait for session to load
        if (status !== 'authenticated') {
            router.push('/'); // Redirect if not authenticated
            return;
        }

        // Function to fetch all required data
        const fetchPipelineData = async () => {
            try {
                setLoading(true);

                // Fetch pipeline details
                const pipelineRes = await fetch(`/api/pipeline/${pipelineId}`);
                if (!pipelineRes.ok) {
                    throw new Error('Failed to fetch pipeline');
                }
                const pipelineData = await pipelineRes.json();

                // Fetch stages
                const stagesRes = await fetch(`/api/pipeline/${pipelineId}/stages`);

                if (!stagesRes.ok) {
                    throw new Error('Failed to fetch stages');
                }
                const stagesData = await stagesRes.json();

                // Fetch automation actions
                const actionsRes = await fetch('/api/automation-actions');
                if (!actionsRes.ok) {
                    throw new Error('Failed to fetch automation actions');
                }
                const actionsData = await actionsRes.json();
                console.log("60 Returning actionsData", actionsData);
                // Update state with fetched data
                saveHistory(pipelineData.id, 'Pipeline', session?.user?.id?.toString() || '');
                setPipeline(pipelineData);
                setStages(stagesData);
                setActions(actionsData);
                setError(null);
            } catch (err: any) {
                console.error('Error fetching pipeline data:', err);
                setError(err.message || 'Failed to load pipeline data. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        if (pipelineId && status === 'authenticated') {
            fetchPipelineData();
        }
    }, [pipelineId, status, session?.user?.id, router]); // Added status and session?.user?.id as dependencies

    if (loading) return <div className="p-8 text-center">Loading pipeline data...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
    if (!pipeline) return <div className="p-8 text-center">Pipeline not found</div>;

    return (
        <div className="h-[calc(100vh-8rem)] overflow-hidden">
            <DynamicPipelineView
                pipeline={pipeline}
                stages={stages}
                actions={actions}
            />
        </div>
    );
}