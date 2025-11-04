/* TODO: This code is WIP (Work In Progress)
  This page will be dynamicly build to show a pipeline.
  To see a demonstration/mockup, browse /pipeline/[id]

  This WIP file is currently available at pipeline/v2/[id]
*/

"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import StaticPipelineView from '@/app/components/StaticPipelineView';
import { PipelineData, StageDataWactions, AutomationAction } from '@/types';

export default function PipelinePage() {
  const params = useParams();
  const pipelineId = params?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pipeline, setPipeline] = useState<PipelineData | null>(null);
  const [stages, setStages] = useState<StageDataWactions[]>([]);
  const [actions, setActions] = useState<AutomationAction[]>([]);

  useEffect(() => {
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

        // Update state with fetched data
        setPipeline(pipelineData);
        setStages(stagesData);
        setActions(actionsData);
        setError(null);
      } catch (err) {
        console.error('Error fetching pipeline data:', err);
        setError('Failed to load pipeline data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (pipelineId) {
      fetchPipelineData();
    }
  }, [pipelineId]);

  if (loading)   return <div className="p-8 text-center">Loading pipeline data...</div>;
  if (error)     return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!pipeline) return <div className="p-8 text-center">Pipeline not found</div>;

  return (
    /* TODO: Consider to update the component to:
        Set the initial selected stage based on the first stage in the stages array
        Format numbers and dates appropriately
        Handle loading states for leads within a stage
    */
    <StaticPipelineView
      pipeline={pipeline}
      stages={stages}
      actions={actions}
    />
  );
}