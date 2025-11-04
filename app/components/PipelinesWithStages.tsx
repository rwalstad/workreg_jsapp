import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Settings, ArrowRight, Plus, CheckCircle, ArrowRightCircle, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, TooltipArrow } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { tblPipeline, PipelineStageWactions, PipelineStageAction } from '@/types';
import { CustomSession, saveHistory, LeadFormData, fetchLeadsInPipeline, checkLeadInPipeline } from '@/app/lib/api';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

interface PipelinesWithStagesProps {
  onViewStages: (lead: LeadFormData) => void;
  accountId: string;
  selectedLead: LeadFormData | null;
  onEditPipeline?: (pipelineId: string) => void;
  onEditStage?: (pipelineId: string, stageId: string) => void;
  onAddStage?: (pipelineId: string) => void;
  onClose?: () => void; // Added close callback
}

const PipelinesWithStages: React.FC<PipelinesWithStagesProps> = ({
  onViewStages: leadDataSelected,
  accountId,
  selectedLead,
  onEditPipeline,
  onEditStage = (leadIdConnect, stageId) => {
    console.log(`onEditStage : ${stageId} . Lead`, leadIdConnect);
  },
  onClose, // New prop for closing
}) => {
  const [pipelines, setPipelines] = useState<tblPipeline[]>([]);
  const [stages, setStages] = useState<PipelineStageWactions[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [expandedPipelines, setExpandedPipelines] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [IsCreatingAccount, setIsCreatingAccount] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [newStageName, setNewStageName] = useState<string>("");
  const [newStageColor, setNewStageColor] = useState<string>("#0066CC");
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const router = useRouter();
  const { data: session, status } = useSession() as {
    data: CustomSession | null;
    status: 'loading' | 'authenticated' | 'unauthenticated';
  };
  const [pipelineLeads, setPipelineLeads] = useState<any[]>([]);
  const [leadPipelineStatuses, setLeadPipelineStatuses] = useState<Record<string, {
    isInPipeline: boolean,
    stageId: string | null,
    stageName: string | null,
    pipelineLeadId: string | null
  }>>({});

  // Handle navigation to edit pipeline
  const handleEditPipeline = (id: string) => {
    router.push(`/pipeline/${id}`);
  };

  // Fetch pipelines for the account
  const fetchPipelines = async () => {
    try {
      setIsLoading(true);
      console.log(`👉 Fetching pipelines for account: ${accountId}`);
      const resPipes = await fetch(`/api/pipeline`);

      if (!resPipes.ok) {
        throw new Error(`Failed to fetch pipelines: ${resPipes.statusText}`);
      }

      const dataPipes: tblPipeline[] = await resPipes.json();
      console.log(`Received ${dataPipes.length} pipelines`);
      setPipelines(dataPipes);

      // Set all pipelines as collapsed by default
      const initialExpandState: Record<string, boolean> = {};

      // Set all pipelines as NOT expanded
      dataPipes.forEach(pipeline => {
        const pipelineId = pipeline.id.toString();
        initialExpandState[pipelineId] = false;
      });
      setExpandedPipelines(initialExpandState);

      // Fetch stages for each pipeline,
      // but don't await them since pipelines are collapsed by default
      // This improves initial load time while still getting data ready
      dataPipes.forEach(pipeline => {
        const pipelineId = pipeline.id.toString();
        fetchStages(pipelineId);
      });

      setIsLoading(false);
    } catch (err) {
      console.error("Error fetching pipelines:", err);
      setError(err instanceof Error ? err.message : "Unknown error fetching pipelines");
      setIsLoading(false);
    }
  };

  // Fetch stages for a specific pipeline
  const fetchStages = async (pipelineId: string) => {
    try {
      console.log(`👉 Fetching stages for pipeline: ${pipelineId}`);
      const resStages = await fetch(`/api/pipeline/${pipelineId}/stages`);

      if (!resStages.ok) {
        throw new Error(`Failed to fetch stages: ${resStages.statusText}`);
      }

      const dataStages: PipelineStageWactions[] = await resStages.json();
      console.log(`Received ${dataStages.length} stages for pipeline ${pipelineId}`);

      // Sort stages based on order_index if available
      const sortedStages = dataStages.sort((a, b) => {
        if (a.order_index !== undefined && b.order_index !== undefined) {
          return a.order_index - b.order_index;
        }
        return 0;
      });

      // Add pipeline_id to each stage if it's not already there
      const stagesWithPipelineId = sortedStages.map(stage => ({
        ...stage,
        pipeline_id: pipelineId
      }));

      setStages(prev => {
        const otherPipelineStages = prev.filter(stage => stage.pipeline_id !== pipelineId);
        return [...otherPipelineStages, ...stagesWithPipelineId];
      });

      // After fetching stages, check if the selected lead is in any of them
      if (selectedLead?.id) {
        const leads = await fetchLeadsInPipeline(pipelineId);
        const status = checkLeadInPipeline(leads, selectedLead.id);

        // If the lead is in this pipeline, find the stage name
        let stageName = null;
        if (status.isInPipeline && status.stageId) {
          const stage = stagesWithPipelineId.find(s => s.id === status.stageId);
          stageName = stage ? stage.title : null;
        }

        setLeadPipelineStatuses(prev => ({
          ...prev,
          [pipelineId]: {
            ...status,
            stageName
          }
        }));
      }
    } catch (err) {
      console.error("Error fetching stages:", err);
      setError(err instanceof Error ? err.message : "Unknown error fetching stages");
    }
  };

  // Toggle expanded state for a pipeline
  const togglePipelineExpand = (pipelineId: string) => {
    setExpandedPipelines(prev => ({
      ...prev,
      [pipelineId]: !prev[pipelineId]
    }));

    // If we're expanding this pipeline, ensure stages are loaded
    if (!expandedPipelines[pipelineId]) {
      fetchStages(pipelineId);
    }
  };

  // Add lead to a stage
  const addLeadToStage = async (pipelineId: string, stageId: string, leadId: string, assignedUsrId: string) => {
    console.log("addLeadToStage - Pipeline:", pipelineId, "Stage:", stageId, "Lead:", leadId);
    try {
      setIsCreatingAccount(true);

      // Find stage name for toast
      const stages = getStagesForPipeline(pipelineId);
      const stage = stages.find(s => s.id === stageId);
      const pipeline = pipelines.find(p => p.id.toString() === pipelineId);

      const res = await fetch(`/api/pipeline/${pipelineId}/stages/${stageId}/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipelinestage_id: stageId,
          lead_id: leadId,
          assigned_user: assignedUsrId
        })
      });

      if (!res.ok) {
        throw new Error(`Failed to add lead to stage: ${res.statusText}`);
      }

      const data = await res.json();

      // Update leadPipelineStatuses for this pipeline
      setLeadPipelineStatuses(prev => ({
        ...prev,
        [pipelineId]: {
          isInPipeline: true,
          stageId: stageId,
          stageName: stage?.title || null,
          pipelineLeadId: data.id?.toString() || null
        }
      }));

      // Update other pipelines to show lead is not in them
      Object.keys(leadPipelineStatuses).forEach(otherPipelineId => {
        if (otherPipelineId !== pipelineId) {
          refreshPipelineStatus(otherPipelineId);
        }
      });

      // Show success toast
      toast.success(
        `Lead added to ${stage?.title || 'stage'} in ${pipeline?.name || 'pipeline'}`,
        {
          duration: 3000,
          position: 'top-center',
        }
      );

      saveHistory(leadId, 'Lead', session?.user?.id?.toString() || '');
    } catch (error) {
      console.error("Error adding lead to stage:", error);
      setError(error instanceof Error ? error.message : "Failed to add lead to stage");

      // Show error toast
      toast.error(`Failed to add lead to stage: ${error instanceof Error ? error.message : "Unknown error"}`, {
        duration: 4000,
      });
    } finally {
      setIsCreatingAccount(false);
    }
  };

  // Move lead to another stage
  const moveLeadToStage = async (pipelineId: string, pipelineLeadId: string, fromStageId: string, toStageId: string) => {
    console.log("moveLeadToStage - Pipeline:", pipelineId, "From:", fromStageId, "To:", toStageId);
    try {
      // Find stage names for toast
      const stages = getStagesForPipeline(pipelineId);
      const fromStage = stages.find(s => s.id === fromStageId);
      const toStage = stages.find(s => s.id === toStageId);
      const pipeline = pipelines.find(p => p.id.toString() === pipelineId);

      const response = await fetch(`/api/pipeline/${pipelineId}/stages/${fromStageId}/lead`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipelineLeadId: pipelineLeadId,
          pipelinestage_id: toStageId
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to move to stage: ${response.statusText}`);
      }

      const resNewStage = await response.json();
      console.log(`Moved lead:`, resNewStage);

      // Update the lead's pipeline status
      setLeadPipelineStatuses(prev => ({
        ...prev,
        [pipelineId]: {
          isInPipeline: true,
          stageId: toStageId,
          stageName: toStage?.title || null,
          pipelineLeadId: pipelineLeadId || null
        }
      }));

      // Show success toast with information about the move
      toast.success(
        `Lead moved from ${fromStage?.title || 'previous stage'} to ${toStage?.title || 'new stage'} in ${pipeline?.name || 'pipeline'}`,
        {
          duration: 3000,
          position: 'top-center',
        }
      );

      saveHistory(selectedLead?.id || '', 'Lead', session?.user?.id?.toString() || '');
    } catch (error) {
      console.error("Error moving lead to stage:", error);
      setError(error instanceof Error ? error.message : "Failed to move lead to stage");

      // Show error toast
      toast.error(`Failed to move lead: ${error instanceof Error ? error.message : "Unknown error"}`, {
        duration: 4000,
      });
    }
  };

  // Add a new stage to a pipeline
  const addPipelineStageSQL = async (pipelineId: string, stageName: string, stageColor: string) => {
    console.log(`Add stage to pipeline: ${pipelineId}`);
    try {
      const response = await fetch(`/api/pipeline/${pipelineId}/stages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: stageName,
          color: stageColor
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to add stage: ${response.statusText}`);
      }

      const resNewStage = await response.json();
      console.log(`Added stage to pipeline:`, resNewStage);
      fetchStages(pipelineId); // Refresh stages
      setIsDialogOpen(false); // Close the dialog
      setNewStageName(""); // Reset form

      // Show success toast
      toast.success(`Stage "${stageName}" added successfully`, {
        duration: 3000,
      });
    } catch (err) {
      console.error('Error adding stage:', err);
      setError(err instanceof Error ? err.message : "Failed to add stage");

      // Show error toast
      toast.error(`Failed to add stage: ${err instanceof Error ? err.message : "Unknown error"}`, {
        duration: 4000,
      });
    }
  };

  // Helper to refresh a pipeline's lead status
  const refreshPipelineStatus = async (pipelineId: string) => {
    if (!selectedLead?.id) return;

    try {
      const leads = await fetchLeadsInPipeline(pipelineId);
      const status = checkLeadInPipeline(leads, selectedLead.id);

      // Find stage name if lead is in this pipeline
      let stageName = null;
      if (status.isInPipeline && status.stageId) {
        const pipeline_stages = getStagesForPipeline(pipelineId);
        const stage = pipeline_stages.find(s => s.id === status.stageId);
        stageName = stage ? stage.title : null;
      }

      setLeadPipelineStatuses(prev => ({
        ...prev,
        [pipelineId]: {
          ...status,
          stageName
        }
      }));
    } catch (error) {
      console.error(`Error refreshing pipeline ${pipelineId} status:`, error);
    }
  };

  // Helper to get stages for a specific pipeline
  const getStagesForPipeline = (pipelineId: string) => {
    const filteredStages = stages.filter(stage => {
      return stage.pipeline_id === pipelineId || String(stage.pipeline_id) === pipelineId;
    });
    console.log(`Found ${filteredStages.length} stages for pipeline ${pipelineId}`);
    return filteredStages;
  };

  // Initial load of pipelines when component mounts
  useEffect(() => {
    if (accountId) {
      console.log("Initial fetch of pipelines triggered");
      fetchPipelines();
    }
  }, [accountId]);

  // Debug useEffect to monitor stages
  useEffect(() => {
    console.log(`Current stages state: ${stages.length} total stages`);
    pipelines.forEach(pipeline => {
      const pipelineId = pipeline.id.toString();
      const pipelineStages = getStagesForPipeline(pipelineId);
      console.log(`Pipeline ${pipeline.name} (${pipelineId}) has ${pipelineStages.length} stages`);
    });
  }, [stages, pipelines]);

  // When selectedLead changes, refresh all pipeline statuses
  useEffect(() => {
    if (selectedLead?.id && pipelines.length > 0) {
      console.log("Selected lead changed, refreshing pipeline statuses");
      pipelines.forEach(pipeline => {
        refreshPipelineStatus(pipeline.id.toString());
      });
    }
  }, [selectedLead, pipelines.length]);

  if (isLoading && pipelines.length === 0) {
    return (
      <div className="flex justify-center items-center p-8 space-x-2">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        <span>Loading pipelines...</span>
      </div>
    );
  }

  if (error && pipelines.length === 0) {
    return (
      <div className="bg-red-50 p-4 rounded-md border border-red-200">
        <div className="flex items-center text-red-700">
          <span className="font-medium">Error: </span>
          <span className="ml-1">{error}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 text-red-600"
          onClick={() => {
            setError(null);
            fetchPipelines();
          }}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">
          Lead Pipelines
        </h2>

        {selectedLead && (
          <div className="text-sm text-gray-500">
            Managing {selectedLead.fname} {selectedLead.lname}
          </div>
        )}
      </div> */}

      {pipelines.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-gray-500 py-8">
              No pipelines found. Create a pipeline to get started.
            </div>
            <Button onClick={() => console.log("Create pipeline clicked")}>
              <Plus className="h-4 w-4 mr-2" />
              Create Pipeline
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pipelines.map((pipeline) => {
            const pipelineId = pipeline.id.toString();
            const pipelineStages = getStagesForPipeline(pipelineId);
            const leadStatus = leadPipelineStatuses[pipelineId];
            const isExpanded = expandedPipelines[pipelineId] || false;

            return (
              <Card key={pipelineId} className="overflow-hidden border border-gray-200">
                <CardHeader className="py-3 px-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <div
                      className="flex items-center gap-2 cursor-pointer hover:text-blue-600"
                      onClick={() => togglePipelineExpand(pipelineId)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-500" />
                      )}
                      <CardTitle className="text-base font-medium flex items-center">
                        {pipeline.name}

                        {/* Show badge if lead is in this pipeline */}
                        {leadStatus?.isInPipeline && leadStatus.stageName && (
                          <Badge className="ml-2 bg-blue-100 text-blue-800 hover:bg-blue-200 border-none">
                            In: {leadStatus.stageName}
                          </Badge>
                        )}
                      </CardTitle>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPipelineId(pipelineId);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add Stage
                      </Button>

                      <TooltipProvider delayDuration={500}>
                        <Tooltip>
                          <TooltipTrigger asChild>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditPipeline ? onEditPipeline(pipelineId) : handleEditPipeline(pipelineId);
                              }}
                            >
                              <Settings className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-800 text-white border-blue-800">
                            <TooltipArrow className="fill-gray-800" />
                            <p>Go to the pipeline page</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="p-0 overflow-y-auto max-h-[300px]">
                    {pipelineStages.length === 0 ? (
                      <div className="text-center py-6 text-gray-500">
                        No stages found for this pipeline
                      </div>
                    ) : (
                      <div className="divide-y">
                        {pipelineStages.length > 0 ? (
                        pipelineStages.map((stage) => {
                          const isLeadInThisStage = leadStatus?.stageId === stage.id;

                          return (
                            <div
                              key={stage.id}
                              className={`p-3 ${isLeadInThisStage ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                              style={{
                                borderLeft: stage.color ?
                                  `4px solid ${stage.color.startsWith('#') ? stage.color : '#' + stage.color}` :
                                  '4px solid #0066CC'
                              }}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex-1">
                                  <div className="font-medium text-gray-800">
                                    {stage.title}
                                  </div>

                                  {stage.followup_num && stage.followup_unit && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      Follow up: {stage.followup_num} {stage.followup_unit}
                                    </div>
                                  )}
                                </div>

                                <div>
                                  {selectedLead && (
                                    leadStatus?.isInPipeline ? (
                                      isLeadInThisStage ? (
                                        <Badge className="bg-green-100 text-green-800 border-none p-2">
                                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                          Lead is here
                                        </Badge>
                                      ) : (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-8 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                                          onClick={() => moveLeadToStage(
                                            pipelineId,
                                            leadStatus.pipelineLeadId || '',
                                            leadStatus.stageId || '',
                                            stage.id
                                          )}
                                        >
                                          <ArrowRightCircle className="h-3.5 w-3.5 mr-1" />
                                          Move to this stage
                                        </Button>
                                      )
                                    ) : (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                                        onClick={() => addLeadToStage(
                                          pipelineId,
                                          stage.id,
                                          selectedLead.id || '',
                                          session?.user?.id?.toString() || ''
                                        )}
                                      >
                                        <Plus className="h-3.5 w-3.5 mr-1" />
                                        Add lead here
                                      </Button>
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-4 text-center text-gray-500">
                          Loading stages...
                        </div>
                      )}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog for adding a new stage */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Stage</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="stageName" className="text-sm font-medium">
                Stage Name
              </label>
              <Input
                id="stageName"
                placeholder="Enter stage name"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="stageColor" className="text-sm font-medium">
                Stage Color
              </label>
              <div className="flex items-center gap-3">
                <Input
                  id="stageColor"
                  type="color"
                  value={newStageColor}
                  onChange={(e) => setNewStageColor(e.target.value)}
                  className="w-20 h-10 p-1"
                />
                <div
                  className="w-12 h-6 rounded"
                  style={{ backgroundColor: newStageColor }}
                ></div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>

            <Button
              onClick={() => {
                if (selectedPipelineId && newStageName.trim()) {
                  addPipelineStageSQL(selectedPipelineId, newStageName, newStageColor);
                }
              }}
              disabled={!newStageName.trim() || !selectedPipelineId}
              className='text-white'
            >
              Create Stage
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PipelinesWithStages;