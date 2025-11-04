// TODO: This component is not used anywhere. Delete it?

"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useActions } from 'actionsContext';
import { CustomSession, saveHistory } from '@/app/lib/api';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { PipelineData, StageDataWactions } from '@/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TooltipArrow,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import StageWithContextMenu from '@/app/components/StageWithContextMenu';
import { PipelineWstages, PipelineStageWactions, PipelineStageAction } from '@/types';

interface PipelineViewWithStagesProps {
  pipeline: PipelineWstages;
  onSelectStage: (stage: PipelineStageWactions) => void;
}

const PipelineViewWithStages: React.FC<PipelineViewWithStagesProps> = ({ pipeline, onSelectStage }) =>
  {
  //const [pipeline, setPipeline] = useState<PipelineData | null>(null);
  const [currentPipeline, setCurrentPipeline] = useState<PipelineData | null>(null);
  const [pipelineStages, setPipelineStages] = useState<StageDataWactions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getIcon, renderIcon } = useActions();
  const params = useParams();
  // FIXME: The URL parameters shuuld never contain an array of pipeline IDs
  const pipelineId = Array.isArray(params?.id) ? params.id[0] : params?.id; // ✅ Fix
  //const pipelineId = params?.id as string;
  const router = useRouter();
  const { data: session, status } = useSession() as {
    data: CustomSession | null;
    status: 'loading' | 'authenticated' | 'unauthenticated';
  };
  const tooltipStyle = "bg-gray-800 text-white border-blue-800";
  const tooltipStyleArrow = "fill-gray-800";

  // Keep track of whether the user is editing the pipeline name
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedPipelineName, setEditedPipelineName] = useState("");
  const [editedPipelineIcon, setEditedPipelineIcon] = useState('');
  const [editedPipelineDescription, setEditedPipelineDescription] = useState('');
  const [selectedPipelineStage, setSelectedPipelineStage] = useState<StageDataWactions | null>(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [showAutomation, setShowAutomation] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [stagesState, setStagesState] = useState<StageDataWactions[]>([]);
  //const [selectedStage, setSelectedStage] = useState<StageDataWactions | null>(null);
  //const [stageActions, setStageActions] = useState<string[]>([]);
  const [availableActions, setAvailableActions] = useState<PipelineStageAction[]>([]); // Store all available actions

    const fetchPipelineData = useCallback(async (pipelineId: string) => {
    try {
      setLoading(true);
      // Fetch pipeline details
      const pipelineRes = await fetch(`/api/pipeline/${pipelineId}`);
      if (!pipelineRes.ok) throw new Error('Failed to fetch pipeline');
      const pipelineData = await pipelineRes.json();

      // Fetch stages
      const stagesRes = await fetch(`/api/pipeline/${pipelineId}/stages`);
      if (!stagesRes.ok) throw new Error('Failed to fetch stages');
      const stagestblData = await stagesRes.json();
      console.log("app/api/pipeline/[id]/stages | stagesData", stagestblData)

      setStagesState(stagestblData.sort((a: StageDataWactions, b: StageDataWactions) => a.order_index - b.order_index));
      // Update state with fetched data
      saveHistory(pipelineData.id, 'Pipeline', session?.user?.id?.toString() || '');
      //setPipeline(pipelineData);
      setCurrentPipeline(pipelineData);
      setPipelineStages(stagestblData);
      setStagesState(stagestblData);
      setEditedPipelineName(pipelineData.name || '');
      setEditedPipelineIcon(pipelineData.icon || '');
      setEditedPipelineDescription(pipelineData.description || '');
      console.log("Rendering with stagesState:", stagesState);
    } catch (err: any) {
      console.error('Error fetching pipeline data:', err);
      setError(err.message || 'Failed to load pipeline data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (status === 'loading') return;
    if (status !== 'authenticated') {
      router.push('/');
      return;
    }
    if (pipelineId) {
      console.log(`useEffect PipelineViewWithStages - currentStage ${stagesState} `);
      fetchPipelineData(pipelineId);
    }
  }, [pipelineId, status, fetchPipelineData, router]);

// Function to handle saving pipeline details
const handleSavePipelineName = async () => {
  if (!currentPipeline) return;

  try {
    // Make an API call to update the pipeline name
    const response = await fetch(`/api/pipeline/${pipelineId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: editedPipelineName,
        icon: editedPipelineIcon,
        description: editedPipelineDescription,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update pipeline');
    }

    const updatedData = await response.json();

    // Update the local state with the new pipeline data
    setCurrentPipeline({
      ...currentPipeline,
      name: editedPipelineName,
      icon: updatedData.icon,
      description: updatedData.description,
    });

    // Close the popover
    setIsEditingName(false);

    // Show success message (you can use a toast notification if available)
    console.log('Pipeline updated successfully');
  } catch (error) {
    console.error('Error updating pipeline:', error);
    // Show error message to the user
  }
};

  /**
     * Handles deleting a stage
     * @param {string} stageId - ID of the stage to delete
     */
  const handleDeleteStage = (stageId: string) => {
    if (window.confirm('Are you sure you want to delete this stage?')) {
      // Remove the stage from local state
      const updatedStages = stagesState.filter(stage => stage.id !== stageId);
      setStagesState(updatedStages);

      // If the deleted stage was selected, select another stage
      if (selectedStage?.id === stageId) {
        setSelectedStage(updatedStages.length > 0 ? updatedStages[0] : null);
      }

      // TODO: Move all leads assigned to this stage to another stage. Let user choose what to do

      // Save the updated stages
      saveStageOrder(updatedStages);

      console.log(`Deleted stage: ${stageId}`);
    }
  };
  /**
   * Currently selected stage to display and edit
   * Initialized with the first stage when available
   */
  const [selectedStage, setSelectedStage] = useState<StageDataWactions | null>(
    pipelineStages.length > 0 ? pipelineStages[0] : null
  );
  /**
   * Actions for the currently selected stage
   * Stored as string IDs that reference the actionsLibrary
   */
  const [stageActions, setStageActions] = useState<string[]>(
    selectedStage?.actions || []
  );

    /**
     * Handles stage selection when user clicks on a stage in the sidebar
     * Updates selectedStage and stageActions to show the latest state
     */
    const handleStageSelect = (stage: StageDataWactions) => {
      // Find the latest version of this stage from stagesState
      const currentStage = stagesState.find(s => s.id === stage.id) || stage;
      const actionsLength = currentStage.actions ? currentStage.actions.length : 0;
      setSelectedStage(stage);
      console.log(`184 PipelineViewWithStages - currentStage ${stage.title} with ${stage.actions.length} actions`);
      const stageWithActions: PipelineStageWactions = {
        ...currentStage,
        pipeline_id: currentStage.id,
        actions: [],
      };
      onSelectStage(stageWithActions);

    //  setSelectedStage(currentStage);
      setStageActions(currentStage.actions || []);

      console.log(`187 PipelineViewWithStages - Selected stage ${stage.title} with ${stage.actions.length} actions`);
    };

  const handleEditStage = (stageId: string) => {

    const updatedStages = stagesState.filter(stage => stage.id !== stageId);
    // TODO: make popoverform for stageedit
    setStagesState(updatedStages);

    // TODO: Move all leads assigned to this stage to another stage. Let user choose what to do

    // Save the updated stages
    //saveStageOrder(updatedStages);

    console.log(`edit stage: ${stageId}`);

  };

  const saveStageOrder = async (updatedStages: StageDataWactions[]) => {
    try {
      const response = await fetch(`/api/pipeline/${pipelineId}/stages/orderindex`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedStages.map(stage => ({
          id: stage.id,
          order_index: stage.order_index
        })))
      });

      if (!response.ok) {
        throw new Error('Failed to update stage order');
      }

      console.log('Stage order updated successfully');
    } catch (error) {
      console.error('Error updating stage order:', error);
    }
  };
  const moveStage = (index: number, direction: 'up' | 'down') => {
    const newStages = [...pipelineStages];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex >= 0 && newIndex < newStages.length) {
      [newStages[index], newStages[newIndex]] = [newStages[newIndex], newStages[index]];

      // Update order_index for all stages
      newStages.forEach((stage, i) => {
        stage.order_index = i;
      });

      setStagesState(newStages);
      saveStageOrder(newStages);
    }
  };
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
        console.log(`sent bodu to Add stage to pipeline: ${response.body}`);
        if (!response.ok) {
            throw new Error(`Failed to add stage: ${response.statusText}`);
        }
        const resNewStage = await response.json();
        console.log(`added stage to pipeline: `, resNewStage);
        // fetchStages(pipelineId); // Refresh stages
        // setIsDialogOpen(false); // Close the dialog
    } catch (err) {
        console.error('Error adding stage:', err);
        setError(err instanceof Error ? err.message : "Failed to add stage");
    }
};

  const handleAddStage = (position: number | null = null) => {
    // Show a modal or prompt to enter stage name
    const stageName = prompt("Enter name for new stage:");

    if (!stageName) return; // Cancel if user doesn't enter a name

    // Generate a unique ID - in production, this would come from the backend
    const tempId = `${Date.now()}`;

    // Create a new stage with default values
    const newStage: StageDataWactions = {
      id: tempId,
      title: stageName,
      color: '#0066CC', // Default color
      order_index: pipelineStages.length,
      count: 0,
      conversion: {
        rate: 0,
        moved: 0,
        total: 0
      },
      actions: []
    };

    //save to sql
    if(currentPipeline){
      addPipelineStageSQL(currentPipeline?.id,stageName,newStage.color);
    }
    let newStages: StageDataWactions[] = [];
    // If position is null, add to the end
    if (position === null) {
      newStages = [...stagesState, newStage];
    } else {
      // Otherwise, insert at the specified position
      newStages = [...stagesState];
      newStages.splice(position, 0, newStage);
    }

    setStagesState(newStages);
    // Save the updated stages
    saveStageOrder(newStages);
  };

  const handleSelectStage = (stage: StageDataWactions) => {
    setSelectedPipelineStage(stage);
    setIsBuilderOpen(true);
  };

  // State variables for tracking stage drag operations
  const [draggedStage, setDraggedStage] = useState<StageDataWactions | null>(null);
  const [stageDragActive, setStageDragActive] = useState(false);
  // Function to handle drag start for stages
  const handleStageDragStart = (e: React.DragEvent<HTMLDivElement>, stage: StageDataWactions) => {
    // Set drag data
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'stage', id: stage.id }));
    e.dataTransfer.effectAllowed = 'move';

    // Update state
    setDraggedStage(stage);
    setStageDragActive(true);

    // Add visual effects
    e.currentTarget.classList.add('stage-dragging');
    document.body.classList.add('stage-drag-active');
  };
  // Function to clean up stage drag state
  const cleanupStageDragState = () => {
    // Clean up visual indicators
    document.querySelectorAll('.stage-dragging').forEach(el => {
      el.classList.remove('stage-dragging');
    });
    document.querySelectorAll('.stage-drop-active').forEach(el => {
      el.classList.remove('stage-drop-active');
    });
    document.body.classList.remove('stage-drag-active');

    // Reset state
    setDraggedStage(null);
    setStageDragActive(false);
  };
  // ============================
  // ==== Change stage Color ====
  // ============================
  //#region

  /* This timeout ensures the API call to save the stage color to the server
  is only invoked after 1000ms of inactivity.
  We want to avoid invoking the backend API as soon as the user changes the color in the color picker,
  because that would trigger an API call for every new color (which could be 50 times per second as
  the user drags the cursor around in the color picker)
  */
  const saveColorTimeout = useRef<NodeJS.Timeout | number | null>(null);

  const handleStageColorChange = (stageId: string, newColor: string) => {
    // Update the stage color in local state
    const newStages = stagesState.map(s =>
      s.id === stageId
        ? { ...s, color: newColor }
        : s
    );
    setStagesState(newStages);

    // Clear the previous timeout
    if (saveColorTimeout.current) {
      clearTimeout(saveColorTimeout.current);
    }

    // Set a new timeout to save the color after a delay
    saveColorTimeout.current = setTimeout(() => {
      // Save the color change to the backend
      saveStageColor(stageId, newColor);
    }, 1000); // 1000 milliseconds (1 second) delay

  };

  // fixed: Function to save the stage color to the backend
  const saveStageColor = async (stageId: string, newColor: string) => {
    try {
      const response = await fetch(`/api/pipeline/${pipeline?.id}/stages/${stageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ color: newColor }),
      });

      if (!response.ok) {
        console.error('Failed to save stage color');
      }
    } catch (error) {
      console.error('Error saving stage color:', error);
    }
  };
  /**
   * Handles moving a stage from one position to another
   * @param {number} fromIndex - Current index of the stage
   * @param {number} toIndex - Target index to move the stage to
   */
  const handleMoveStage = (fromIndex: number, toIndex: number) => {
    // Don't proceed if indexes are invalid
    if (fromIndex < 0 || toIndex < 0 ||
      fromIndex >= stagesState.length || toIndex >= stagesState.length) {
      return;
    }
    // Handler for when a stage is dragged over a drop zone
    const handleStageDragOver = (e: React.DragEvent<HTMLDivElement>, position: number) => {
      e.preventDefault();
      // Highlight the current drop zone
      e.currentTarget.classList.add('stage-drop-active');
    };
    // Handler for when a stage is dropped into a drop zone
    const handleStageDrop = (e: React.DragEvent<HTMLDivElement>, position: number) => {
      e.preventDefault();
      e.stopPropagation();

      try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));

        // Only process drops of type 'stage'
        if (data.type === 'stage' && draggedStage) {
          // Move the stage in the array
          const newStages = [...stagesState];

          // Find the index of the dragged stage
          const fromIndex = stagesState.findIndex(s => s.id === draggedStage.id);

          if (fromIndex !== -1) {
            // Remove the stage from its current position
            const [movedStage] = newStages.splice(fromIndex, 1);

            // Adjust insertion position if needed
            let toIndex = position;
            if (fromIndex < position) {
              toIndex -= 1;
            }

            // Insert the stage at the new position
            newStages.splice(toIndex, 0, movedStage);

            // Update the state
            setStagesState(newStages);
            saveStageOrder(newStages);


            // If the dragged stage was selected, ensure it stays selected
            if (selectedStage?.id === draggedStage.id) {
              setSelectedStage(movedStage);
            }

            console.log(`Moved stage to new position ${fromIndex} to ${toIndex}`);
          }
        }
      } catch (error) {
        console.error("Error handling stage drop:", error);
      }

      // Clean up
      cleanupStageDragState();
    };

    // Add these states to the component
    //const [hoverBetweenStage, setHoverBetweenStage] = useState<number | null>(null);
    // Make a copy of the stages array
    const updatedStages = [...stagesState];

    // Remove the stage from its current position
    const [movedStage] = updatedStages.splice(fromIndex, 1);

    // Insert it at the new position
    updatedStages.splice(toIndex, 0, movedStage);

    // Update state
    setStagesState(updatedStages);

    // Save the changes
    saveStageOrder(updatedStages);

    console.log(`Moved stage from index ${fromIndex} to ${toIndex}`);
  };
  return (
    <TooltipProvider delayDuration={500}>
      <div>
        {/* Pipeline name and edit button */}
        <div className="flex items-center justify-between mb-4 p-4">
          <div className="group relative flex flex-row items-center">
            {currentPipeline && (
              <>
                <h2 className="text-lg font-semibold mb-0">{currentPipeline.name}</h2>
                <span>({currentPipeline.id}){showAutomation.valueOf()}</span>
              </>
            )}
            {/* Popup form to edit pipeline details */}
            <Popover open={isEditingName} onOpenChange={setIsEditingName}>
              <PopoverTrigger asChild>
                <button
                  className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity hover:text-blue-600"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent event bubbling
                    setIsEditingName(true);
                  }}
                >
                  {getIcon('pencil', 'w-4 h-4 text-gray-500 hover:text-blue-600')}
                </button>
              </PopoverTrigger>

              {/* Popup window to edit pipeline name */}
              <PopoverContent className="w-80 bg-white">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Edit Pipeline</h4>
                    <p className="text-sm text-muted-foreground">
                      Update your pipeline details.
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="pipelineName" className="text-right">
                        Name
                      </Label>
                      <Input
                        id="pipelineName"
                        className="col-span-3 h-8"
                        value={editedPipelineName}
                        onChange={(e) => setEditedPipelineName(e.target.value)}
                        autoFocus
                      />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="pipelineIcon" className="text-right">
                        Icon
                      </Label>
                      <Input
                        id="pipelineIcon"
                        className="col-span-3 h-8"
                        value={editedPipelineIcon}
                        onChange={(e) => setEditedPipelineIcon(e.target.value)}
                        placeholder="e.g., workflow"
                      />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="pipelineDescription" className="text-right">
                        Description
                      </Label>
                      <Input
                        id="pipelineDescription"
                        className="col-span-3 h-8"
                        value={editedPipelineDescription}
                        onChange={(e) => setEditedPipelineDescription(e.target.value)}
                        placeholder="Optional description"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (pipeline) {
                          setEditedPipelineName(pipeline.name);
                          setEditedPipelineIcon(pipeline.icon || '');
                          setEditedPipelineDescription(pipeline.description || '');
                        }
                        setIsEditingName(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSavePipelineName}
                      disabled={!editedPipelineName.trim()}
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Place the tooltip for "Edit pipeline" separately to avoid conflicts */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity absolute inset-0 z-10 opacity-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingName(true);
                  }}
                >
                  <span className="sr-only">Edit pipeline name</span>
                </button>
              </TooltipTrigger>
              <TooltipContent className={tooltipStyle}>
                <TooltipArrow className={tooltipStyleArrow} />
                <p>Edit pipeline name</p>
              </TooltipContent>
            </Tooltip>
          </div>
          {/* Tool tip for add new pipeline stage */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="p-1 hover:bg-gray-100 rounded-full"
                onClick={() => handleAddStage()}
              >
                {getIcon('plus-circle', 'w-5 h-5 text-blue-600')}
              </button>
            </TooltipTrigger>
            <TooltipContent className={tooltipStyle}>
              <TooltipArrow className={tooltipStyleArrow} />
              <p>Add new pipeline stage</p>
            </TooltipContent>
          </Tooltip>

        </div>

        {/* Toggle View - switch between leads and automation builder */}
        <div className="flex items-center justify-between px-4">
          <p className="text-sm text-gray-500">
            {stagesState.reduce((total, stage) => total + stage.count, 0)} total leads
          </p>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  pressed={showAutomation}
                  onPressedChange={setShowAutomation}
                  className="px-3 py-1 text-sm rounded"
                >
                  {showAutomation ? "Leads view" : "Pipeline builder"}
                </Toggle>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-800 text-white border-blue-800">
                <TooltipArrow className="fill-gray-800" />
                <p>{showAutomation ? "Switch to leads view" : "Switch to automation builder"}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        {loading && <div>Loading pipeline...</div>}
        {error && <div className="text-red-500">{error}</div>}

        {!loading && !error && (
          <div
            className="space-y-2 overflow-y-auto"
            style={{ maxHeight: '600px' }} // Set a fixed height on scrollbar (adjust as needed)
          >
            {/* List of Stages */}
            <div className="space-y-2">
              {stagesState.map((stage, index) => (
                <StageWithContextMenu
                  key={stage.id}
                  stage={stage}
                  index={index}
                  totalStages={stagesState.length}
                  selectedStage={stage}
                  handleStageSelect={handleStageSelect}
                  handleStageDragStart={handleStageDragStart}
                  cleanupStageDragState={cleanupStageDragState}
                  handleEditStage={handleEditStage}
                  handleDeleteStage={handleDeleteStage}
                  handleMoveStage={handleMoveStage}
                  showAutomation={showAutomation}
                  tooltipStyle={tooltipStyle}
                  tooltipStyleArrow={tooltipStyleArrow}
                  onColorChange={handleStageColorChange}
                  pipelineId={pipelineId || ''} // FIXME: Ensure that the pipelineId can never be empty string
                />

              ))}

            </div>
          </div>
        )}


      </div>
    </TooltipProvider>
  );
}

export default PipelineViewWithStages;
