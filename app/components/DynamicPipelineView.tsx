 "use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { PipelineData, StageDataWactions, AutomationAction, StageActionWfeature } from '@/types';
import { LeadFormData, handleAddAction as handleAddActionSQL } from '@/app/lib/api';
import { useActions } from 'actionsContext';
import { Toggle } from "@/components/ui/toggle";
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
import StageWithContextMenu from '@/app/components/StageWithContextMenu';
import LeadList from '@/app/components/LeadList';
/**interface StageActionWfeature {
    id: string;
    feature?: {
        feature_name: string;
        [key: string]: any; // Allow other feature properties
    };
    [key: string]: any; // Allow other properties
}
 * DynamicPipelineProps - Interface defining the props for the DynamicPipeline component
 *
 * @property {PipelineData} pipeline - The pipeline data object
 * @property {StageData[]} stages - Array of stage data for the pipeline
 * @property {AutomationAction[]} actions - Available actions that can be added to stages
 */
interface DynamicPipelineProps {
  pipeline: PipelineData;
  stages: StageDataWactions[];
  actions: AutomationAction[];
}

/**
 * DynamicPipeline - A component that provides a drag-and-drop interface for building pipeline automation
 *
 * This component allows users to:
 * 1. Drag actions from a library into stage sequences
 * 2. Reorder actions within a sequence
 * 3. Remove actions via a trash icon
 */
const DynamicPipelineView: React.FC<DynamicPipelineProps> = ({
  pipeline,
  stages,
  actions: actionsLibrary
}) => {
  // Get icon rendering function from context
  const { getIcon, renderIcon } = useActions();

  /**
   * Generates a UUID for creating unique action IDs
   * Used when adding new actions from the library to sequence
   */
  function generateUUID() {
    /*
    A version 4 UUID follows a specific format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx.
    The '4' in the third group signifies that it's a version 4 UUID, indicating that the bits are randomly generated.
    The 'y' in the fourth group has a very particular meaning.
    The 'y' Significance:

    The 'y' represents a 4-bit field where the two most significant bits are always set to '10'. This results in the possible values of 'y' being 8, 9, A, or B in hexadecimal.
    This specific setting of bits is part of the UUID version 4 specification, ensuring that the UUID conforms to the standard.
    By using 'y' in that location, the function insures that the generated string will conform to the RFC 4122 standard for Version 4 UUID's.
    */
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // ============================
  // ===== STATE MANAGEMENT =====
  // ============================
  //#region STATE MANAGEMENT
  /**
   * Local copy of stages that can be modified by drag and drop operations
   * Required because we need to be able to update a specific stage's actions
   */
  const [stagesState, setStagesState] = useState<StageDataWactions[]>(stages);

  // Initialize stagesState from props (the variable defined as part of the data sent in when the component is initialized)
  // when stages prop changes
  useEffect(() => {
    setStagesState(stages);
  }, [stages]);

  /**
   * Currently selected stage to display and edit
   * Initialized with the first stage when available
   */
  const [selectedStage, setSelectedStage] = useState<StageDataWactions | null>(
    stages.length > 0 ? stages[0] : null
  );


  /**
   * Actions for the currently selected stage
   * Stored as string IDs that reference the actionsLibrary
   */
  const [stageActions, setStageActions] = useState<string[]>(
    selectedStage?.actions || []
  );

  // Search term for filtering the action library
  const [searchTerm, setSearchTerm] = useState('');
  // State to hold edited values
  // Parse default_config into key-value pairs
  const parsedConfigList: ConfigItem[] = [
    {
      key: "",
      value: ""
    }
  ];
  //let parsedConfigList: { key: string; value: any }[] = [];
  const [config, setConfig] = useState(parsedConfigList);
  // Handle input change
  const handleChangeDefaultConfig = (key: string, newValue: string | boolean) => {
    // Convert boolean to string if needed
    const valueToStore = typeof newValue === 'boolean'
      ? newValue.toString()
      : newValue;
    // console.log("132 Stage actions :", stageActions);
    // console.log(`Updating ${key} to ${valueToStore}`);
  };
  /**
   * Handles stage selection when user clicks on a stage in the sidebar
   * Updates selectedStage and stageActions to show the latest state
   */
  const handleStageSelect = (stage: StageDataWactions) => {
    // Find the latest version of this stage from stagesState
    const currentStage = stagesState.find(s => s.id === stage.id) || stage;

    setSelectedStage(currentStage);
    setStageActions(currentStage.actions || []);
    console.log("145 Stage actions :", stages);
    console.log(`Selected stage ${stage.title} with ${stage.actions.length} actions`);
  };

  /**
   * This effect ensures that the selected stage and its actions are initialized properly
   * It also handles updating sequence items whenever the selected stage changes
   */
  useEffect(() => {
    // Set initial selected stage if not already set
    if (!selectedStage && stages.length > 0) {
      setSelectedStage(stages[0]);
      setStageActions(stages[0].actions || []);
    }

    // If we have a selected stage, populate sequence items
    if (selectedStage) {
      // Transform the stage's action IDs into full action objects
      const stageActionItems = selectedStage.actions
        .map(actionId => {
          const actionDetail = actionsLibrary.find(a => a.id === actionId);
          return actionDetail ? { ...actionDetail } : null;
        })
        .filter(Boolean) as AutomationAction[]; // use filter(Boolean) to remove any null entries

      console.log(`useEffect Loading ${stageActionItems.length} actions from selected stage:`, stageActionItems);
      console.log(`useEffect availablestage:`, stages);
    }
  }, [selectedStage, stages, actionsLibrary]);

  /**
   * Saves changes to a stage's actions back to the stage
   * This is the central function for persisting changes after drag/drop operations
   *
   * @param stageId - ID of the stage being updated
   * @param actions - Array of action objects to save
   */
  const saveStageActions = (stageId: string, actions: AutomationAction[]) => {
    if (!stageId || !actions) return;
    // Extract just the IDs for storage
    const actionIds = actions.map(action => action.id);

    const formattedActionItems = actions
      .map(action => {
        const actionDetail = actionsLibrary.find(a => a.id === action.id);
        return actionDetail
          ? {
            id: actionDetail.id,
            default_config: actionDetail.default_config
          }
          : null;
      })
      .filter(Boolean) as { id: string; default_config: any }[];
    console.log(`🎯👉 handleAddActionSQL called for stage ${stageId} with actions:`, formattedActionItems);
    handleAddActionSQL(pipeline.id, stageId, formattedActionItems);
    //  🔎  🆕 👉 ✅  💾  ❌  📋
    // Update the stage actions in your local state
    const updatedStages = stagesState.map(stage =>
      stage.id === stageId
        ? { ...stage, actions: actionIds }
        : stage
    );
    console.log(`194 updatedStages:`, updatedStages);
    setStagesState(updatedStages);
    // Only update the selectedStage if the stageId matches
    if (selectedStage && selectedStage.id === stageId) {
      setSelectedStage({
        ...selectedStage,
        actions: actionIds
      });
      // Update stageActions to keep state synchronized
      setStageActions(actionIds);
    }
  };

  /**
   * Removes an action from a stage's sequence
   * Called when user clicks the trash icon on an action
   *
   * @param stageId - ID of the stage containing the action
   * @param actionIndex - Index of the action to remove
   */
  const handleRemoveAction = (stageId: string, actionIndex: number) => {
    // Find the stage
    const stage = stagesState.find(s => s.id === stageId);
    if (!stage) {
      console.log("❌ Stage not found for deletion");
      return;
    }
    // Create a copy of the stage's actions
    const updatedActions = [...stage.actions];

    // Remove the action at the specified index
    updatedActions.splice(actionIndex, 1);

    console.log(`Removing action at index ${actionIndex} from stage ${stageId}`);

    // Map actions to objects for the saveStageActions function
    const stageActionItems = updatedActions
      .map(actionId => {
        const originalId = actionId.includes('_') ? actionId.split('_')[0] : actionId;
        const actionDetail = actionsLibrary.find(a => a.id === originalId);
        return actionDetail;
      })
      .filter(Boolean) as AutomationAction[];

    // Save the updated actions
    saveStageActions(stageId, stageActionItems);

    console.log("✅ 250 Removed action -stageActionItems", stageActionItems);
  };

  // Filter library items based on search term
  const filteredLibraryActions = actionsLibrary.filter(action =>
    action.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  //#endregion


  // ============================
  // ===== LEFT SIDE MENU =======
  // ============================
  //#region Left Side Menu

  // Inside the DynamicPipeline component, add these states:

  // Keep track of whether the user is editing the pipeline name
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedPipelineName, setEditedPipelineName] = useState(pipeline.name);
  const [editedPipelineIcon, setEditedPipelineIcon] = useState(pipeline.icon || '');
  const [editedPipelineDescription, setEditedPipelineDescription] = useState(pipeline.description || '');
  const [showAutomation, setShowAutomation] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [currentPipeline, setCurrentPipeline] = useState(pipeline); // Add this state to track the pipeline

  // Add this function to handle saving pipeline details
  const handleSavePipelineName = async () => {
    try {
      // API call to update the pipeline name
      const response = await fetch(`/api/pipeline/${currentPipeline.id}`, {
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

  // Add these states to the component
  const [hoverBetweenStage, setHoverBetweenStage] = useState<number | null>(null);

  // Add this function to handle adding new stages
  const handleAddStage = (position: number | null = null) => {
    // Show a modal or prompt to enter stage name
    const stageName = prompt("Enter name for new stage:");

    if (!stageName) return; // Cancel if user doesn't enter a name

    // Generate a unique ID - in production, this would come from the backend
    // FIXME: TODO: THere is a bug when reordering actions for a newly added stage. Items appear in a random order when dragging them around. THis bug might disappear when the ID is generated by the database
    const tempId = `${Date.now()}`;

    // Create a new stage with default values
    const newStage: StageDataWactions = {
      id: tempId,
      title: stageName,
      color: '#0066CC', // Default color
      order_index: stages.length,
      count: 0,
      conversion: {
        rate: 0,
        moved: 0,
        total: 0
      },
      actions: []
    };

    var newStages: StageDataWactions[] = []
    // If position is null, add to the end
    if (position === null) {
      newStages = [...stagesState, newStage]
    } else {
      // Otherwise, insert at the specified position
      newStages = [...stagesState];
      newStages.splice(position, 0, newStage);
    }

    setStagesState(newStages);

    // Save the updated stages
    console.log(`saveStageOrder - pipeline.id: ${pipeline.id}`);
    saveStageOrder(newStages, pipeline.id);
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
      saveStageOrder(updatedStages, pipeline.id);

      console.log(`Deleted stage: ${stageId}`);
    }
  };
  const handleEditStage = (stageId: string) => {

    const updatedStages = stagesState.filter(stage => stage.id !== stageId);
    setStagesState(updatedStages);

    // TODO: Move all leads assigned to this stage to another stage. Let user choose what to do

    // Save the updated stages
    saveStageOrder(updatedStages, pipeline.id);

    console.log(`edit stage: ${stageId}`);

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

    // Make a copy of the stages array
    const updatedStages = [...stagesState];

    // Remove the stage from its current position
    const [movedStage] = updatedStages.splice(fromIndex, 1);

    // Insert it at the new position
    updatedStages.splice(toIndex, 0, movedStage);

    // Update state
    setStagesState(updatedStages);

    // Save the changes
    saveStageOrder(updatedStages, pipeline.id);

    console.log(`Moved stage from index ${fromIndex} to ${toIndex}`);
  };


  //#endregion


  // ========================================================
  // ======= LEFT SIDE MENU DRAG AND DROP OF STAGES =========
  // ========================================================
  //#region LEFT SIDE MENU DRAG AND DROP OF STAGES

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
          saveStageOrder(newStages, pipeline.id);


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

  /**
   * Persists stage order changes to the backend
   * @param stages - The new stage order to save
   */
  const saveStageOrder = async (stages: StageDataWactions[], pipelineId: string) => {
    try {
      // TODO: In a real app, you'd want to persist this change to your backend
      const response = await fetch(`/api/pipeline/${pipelineId}/stages/orderindex`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stages.map(stage => ({
          id: stage.id,
          order_index: stage.order_index
        })))
      });
      const sortedData = await response.json();
      console.log('Stage order saved successfully', sortedData);
      // Could show a success notification here
    } catch (error) {
      console.error('Error saving stage order:', error);
      // Could show an error notification here
    }
  };
  //#endregion


  interface LeadsViewProps {
    selectedStage: StageDataWactions | null;
    stages: StageDataWactions[];
    setViewMode: (mode: string) => void;
    viewMode: string;
  }

  const LeadsView: React.FC<LeadsViewProps> = ({ selectedStage, stages, setViewMode, viewMode }) => {
    const [pageMessage, setPageMessage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isNewLead, setIsNewLead] = useState(false);
    const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
    // Use useRef instead of useState for the refetch function to avoid re-renders
    const refetchLeadsRef = useRef<() => Promise<void>>(() => Promise.resolve());

    const handleSearch = (query: string) => {
      setSearchQuery(query);
    };

    // Update to use useRef instead of setState
    const handleRefetchLeads = useCallback((fetchFunction: () => Promise<void>) => {
      refetchLeadsRef.current = fetchFunction;
    }, []);

    const handleCreateNew = () => {
      setIsNewLead(true);
      setEditingLeadId('0');
    };

    const handleEditLead = (leadId: string) => {
      setEditingLeadId(leadId);
    };

    const handleCancelEdit = () => {
      setEditingLeadId(null);
    };

    const handleViewStages = (lead: LeadFormData) => {
      setSelectedLeadId(lead.id);
    };

    // Create a memoized version of the initialFilters to prevent re-renders
    const initialFilters = useMemo(() => ({
      leadOwner: null,
      status: null,
      stageId: selectedStage?.id || null,
      isActive: true
    }), [selectedStage?.id]);

    return (
      <>
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold mb-0">
                {selectedStage ?
                  "Viewing leads for stage " + stages.find(s => s.id === selectedStage.id)?.title :
                  'All Leads'
                }
              </h1>
              <button
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                onClick={() => {
                  if (refetchLeadsRef.current) {
                    refetchLeadsRef.current();
                  }
                }}
              >
                {getIcon('refresh')}
                Refresh
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                className={`px-3 py-1 text-sm rounded ${viewMode === 'table' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
                onClick={() => setViewMode('table')}
              >
                Table
              </button>
              <button
                className={`px-3 py-1 text-sm rounded ${viewMode === 'cards' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
                onClick={() => setViewMode('cards')}
              >
                Cards
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Additional UI controls can go here */}
          </div>
        </div>

        {/* Lead List */}
        <div className="flex-1 overflow-auto p-4">
          <LeadList
            onEdit={handleEditLead}
            onCancel={handleCancelEdit}
            editingLeadId={editingLeadId}
            isNewLead={isNewLead}
            refetchLeads={handleRefetchLeads}
            onViewStages={handleViewStages}
            initialFilters={initialFilters}
            hidePipelineFilter={true}
          />
        </div>

        {/* Footer with Pagination */}
        <div className="bg-white border-t border-gray-200 p-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing 1-5 of {selectedStage ?
              selectedStage.count :
              stages.reduce((total, stage) => total + stage.count, 0)
            } leads
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50">
              Previous
            </button>
            <button className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50">
              Next
            </button>
          </div>
        </div>
      </>
    );
  };

  // ============================
  // ===== DRAG AND DROP ========
  // ============================
  //#region DRAG AND DROP

  // DOM references to containers for attaching event handlers
  const sequenceContainerRef = useRef<HTMLDivElement>(null);
  const libraryContainerRef = useRef<HTMLDivElement>(null);

  // State to track drag and drop operations
  const [actionDragActive, setActionDragActive] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<'library' | 'sequence' | null>(null);
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);
  const toggleActionConfig = (actionId: string) => {
    setExpandedActionId((prevId) => (prevId === actionId ? null : actionId));
  };
  // Add a state to track the expanded action specifically
  const [expandedActionDetails, setExpandedActionDetails] = useState<{
    stageId: string | null;
    actionId: string | null;
    configList: { key: string; value: any }[];
  }>({
    stageId: null,
    actionId: null,
    configList: []
  });
  const handleActionExpand = (stage: StageDataWactions, actionId: string, actionIndex: number) => {
    // Find the specific action item
    const filteredItem = stageActionItems[actionIndex];

    // Parse the default config
    let parsedConfigList: { key: string; value: any }[] = [];
    try {
      const parsedConfig = JSON.parse(filteredItem.default_config);
      parsedConfigList = Object.entries(parsedConfig).map(([key, value]) => ({ key, value }));
    } catch (error) {
      console.error("Error parsing default_config:", error);
    }

    // Set the expanded action details
    setExpandedActionDetails({
      stageId: stage.id,
      actionId: actionId,
      configList: parsedConfigList
    });
  };
  /**
   * Handles drag start when using React's event system
   * Sets up drag data and visual indicators
   *
   * @param e - React drag event
   * @param id - ID of the item being dragged
   * @param source - Where the drag started ('library' or 'sequence')
   */
  const onItemDragStart = (e: React.DragEvent<HTMLDivElement>, id: string, source: 'library' | 'sequence') => {
    console.log("🔵 onItemDragStart: id=", id, "source:", source);

    // Store the drag source
    setDragSource(source);
    setDraggedItemId(id);
    setActionDragActive(true);
    // console.log(`onItemDragStart actions: `, id, 'source:',source);
    // Set drag data
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';

    // Visual effects
    e.currentTarget.classList.add('dragging');
    document.body.classList.add('drag-active');
  };

  /**
   * Handles drag over event for drop zones
   * Highlights the drop zone being hovered over
   *
   * @param e - React drag event
   */
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Necessary for drop to work

    // Find the closest drop zone
    const target = e.target as HTMLElement;
    if (target.classList.contains('drop-zone')) {
      // Clear all active drop zones
      document.querySelectorAll('.drop-zone').forEach(zone => {
        zone.classList.remove('drop-zone-active');
      });

      // Set this one as active
      target.classList.add('drop-zone-active');
    }
  };

  /**
   * Handles drop events using React's event system
   * Processes drops from library to sequence or reordering within sequence
   *
   * @param e - React drop event
   * @param index - Target index for the dropped item
   * @param targetStage - Optional target stage if dropping into a specific stage
   */
  const onDrop = (e: React.DragEvent<HTMLDivElement>, index: number, targetStage?: StageDataWactions) => {
    e.preventDefault();
    e.stopPropagation();

    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId) {
      console.log("❌ No drag data found in onDrop");
      return;
    }

    // If no specific stage is provided, use the selected stage
    let stage = targetStage;

    if (!stage) {
      const dropTarget = e.currentTarget as HTMLElement;
      const stageContainer = dropTarget.closest('.stage-container') as HTMLElement;

      if (stageContainer) {
        const stageId = stageContainer.getAttribute('data-stage-id');
        if (stageId) {
          stage = stagesState.find(s => s.id === stageId) || undefined;
        }
      }

      // Fallback to selectedStage if we still don't have a stage
      if (!stage) {
        stage = selectedStage!;
      }
      console.log("778  selectedStage:", selectedStage?.actions);
    }

    if (!stage) {
      console.log("❌ No stage selected");
      return;
    }

    console.log("🎯 Target Stage identified:", stage.id, stage.title);

    // Get the latest version of the stage from stagesState
    const currentStage = stagesState.find(s => s.id === stage.id);
    if (!currentStage) {
      console.log("❌ Stage not found in stagesState");
      return;
    }

    // Find the dragged item
    const libraryItem = actionsLibrary.find(item => item.id === draggedId);
    if (!libraryItem) {
      console.log("❌ Library item not found:", draggedId);
      return;
    }

    // Determine the current actions for this stage
    const currentStageActions = [...currentStage.actions];

    console.log("🟢 onDrop: draggedId=", draggedId, "at index:", index, "source:", dragSource);

    // Handle based on drag source
    if (dragSource === 'library') {
      // Find item in library
      const libraryItem = actionsLibrary.find(item => item.id === draggedId);
      console.log("onDrop | draggedId", draggedId, "libraryItem", libraryItem);

      // Create new item with unique ID
      const uniqueActionId = `${libraryItem!.id}_${generateUUID()}`;

      // Insert the new action at the specified index
      currentStageActions.splice(index, 0, uniqueActionId);

      // Map actions to full objects for saveStageActions
      const stageActionItems = currentStageActions
        .map(actionId => {
          // Extract the original ID if it's a compound ID
          const originalId = actionId.includes('_') ? actionId.split('_')[0] : actionId;
          const actionDetail = actionsLibrary.find(a => a.id === originalId);
          return actionDetail;
        })
        .filter(Boolean) as AutomationAction[];

      console.log(`Adding action to stage ${stage.id} (${stage.title}), actions will be:`, currentStageActions);
      console.log("About to call saveStageActions with stage:", currentStage.id, "and actions:", stageActionItems);
      saveStageActions(currentStage.id, stageActionItems);
      console.log("✅ Added library item to sequence");

    } else if (dragSource === 'sequence') {
      // Instead of finding by ID, get the index from the data attribute of the dragged element
      const draggedElement = document.querySelector('.dragging');
      const draggedIndex = draggedElement ? parseInt(draggedElement.getAttribute('data-index') || "-1") : -1;

      console.log("onDrop | draggedIndex from DOM:", draggedIndex, "draggedId:", draggedId);

      if (draggedIndex === -1) {
        console.log("❌ Couldn't determine index of dragged item");
        cleanupDragState();
        return;
      }

      // Handle reordering by using the index we got directly from the DOM element
      const [movedItem] = currentStageActions.splice(draggedIndex, 1);

      // Now insert at the target index
      // No adjustment needed since we've already removed the item
      currentStageActions.splice(index, 0, movedItem);

      console.log("✅ Reordered sequence item from", draggedIndex, "to", index);

      // Map actions to objects for the saveStageActions function
      const stageActionItems = currentStageActions
        .map(actionId => {
          const originalId = actionId.includes('_') ? actionId.split('_')[0] : actionId;
          const actionDetail = actionsLibrary.find(a => a.id === originalId);
          return actionDetail;
        })
        .filter(Boolean) as AutomationAction[];

      saveStageActions(stage.id, stageActionItems);
    }

    // Clean up
    cleanupDragState();
  };

  /**
   * Handles drag end event
   * Ensures cleanup of drag states
   */
  const onDragEnd = () => {
    cleanupDragState();
  };

  /**
   * Cleans up all drag-related state and visual indicators
   * Called after drag operations complete or are cancelled
   */
  const cleanupDragState = () => {
    // Remove visual classes from all draggable elements
    document.querySelectorAll('.dragging').forEach(el => {
      el.classList.remove('dragging');
    });

    // Clear any active drop zones
    document.querySelectorAll('.drop-zone-active').forEach(el => {
      el.classList.remove('drop-zone-active');
    });

    // Remove active class from empty drop zones too
    document.querySelectorAll('.empty-drop-zone-active').forEach(el => {
      el.classList.remove('empty-drop-zone-active');
    });

    document.body.classList.remove('drag-active');

    // Reset React state
    setActionDragActive(false);
    setDraggedItemId(null);
    setDragSource(null);
  };

  /**
   * Effect for setting up DOM-level event listeners for drag and drop
   * This approach gives more control over drag events than React's built-in events
   */
  useEffect(() => {
    console.log("Rendering with stagesState:", stagesState);
    let stages=stagesState;
    // Make sure DOM is ready
    if (!sequenceContainerRef.current || !libraryContainerRef.current) return;

    const sequenceContainer = sequenceContainerRef.current;
    const libraryContainer = libraryContainerRef.current;
    let draggedElement: HTMLElement | null = null;

    console.log("Setting up drag handlers");

    /**
     * Handles drag start at the DOM level
     * Sets up drag data and visual states
     */
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (!target || !target.getAttribute('draggable')) return;

      // Store reference to dragged element
      draggedElement = target;

      // Get drag source
      const source = target.closest('.library-container') ? 'library' : 'sequence';
      setDragSource(source);

      // Store the ID in state for React-based updates
      const itemId = target.getAttribute('data-id');
      if (itemId) {
        setDraggedItemId(itemId);
        setActionDragActive(true);
        // CRITICAL: Store drag data for transfer
        console.log("🔵 Setting drag data: Dragging item with data-id=", itemId, "source:", source);
        e.dataTransfer!.setData('text/plain', itemId);
        e.dataTransfer!.effectAllowed = 'move';
      }

      // Add visual class
      target.classList.add('dragging');
      document.body.classList.add('drag-active');

      // Set drag image
      if (e.dataTransfer) {
        // Set required data for Firefox
        e.dataTransfer.setData('text/plain', '');

        // Create clone for drag image
        const clone = draggedElement.cloneNode(true) as HTMLElement;
        clone.style.position = 'absolute';
        clone.style.top = '-1000px';
        clone.style.opacity = '0.8';
        document.body.appendChild(clone);
        e.dataTransfer.setDragImage(clone, 20, 20);

        setTimeout(() => {
          document.body.removeChild(clone);
        }, 0);
      }
    };

    /**
     * Handles drag over at the DOM level
     * Highlights drop zones as user drags over them
     */
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault(); // Necessary to allow drop

      // Only handle if we're dragging over the sequence container
      if (!sequenceContainerRef.current?.contains(e.target as Node)) return;

      // Determine if we're hovering over a drop zone
      const target = e.target as HTMLElement;

      if (target.classList.contains('drop-zone')) {
        target.classList.add('drop-zone-active');
      } else {
        // Clear active classes from all drop zones
        if (sequenceContainer) {
          sequenceContainer.querySelectorAll('.drop-zone').forEach(zone => {
            zone.classList.remove('drop-zone-active');
          });
        }

        // Determine the closest drop zone based on cursor position
        const closestDropZone = findClosestDropZone(e.clientY);
        if (closestDropZone) {
          closestDropZone.classList.add('drop-zone-active');
        }
      }
    };

    /**
     * Finds the closest drop zone to the current mouse Y position
     * Used to highlight the appropriate drop zone during drag
     */
    const findClosestDropZone = (y: number): HTMLElement | null => {
      if (!sequenceContainer) return null;

      const dropZones = Array.from(sequenceContainer.querySelectorAll<HTMLElement>('.drop-zone'));

      // Find the drop zone with minimum distance to cursor
      let closest: HTMLElement | null = null;
      let minDistance = Infinity;

      dropZones.forEach(zone => {
        const rect = zone.getBoundingClientRect();
        const distance = Math.abs(y - (rect.top + rect.height / 2));

        if (distance < minDistance) {
          minDistance = distance;
          closest = zone;
        }
      });

      return closest;
    };

    /**
     * Handles drop events at the DOM level
     * Processes the drop based on source and target
     */
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Find the drop zone we're dropping onto
      const eventTarget = e.target as HTMLElement;

      // Find the stage container
      const stageContainer = eventTarget.closest('.stage-container') as HTMLElement;
      if (!stageContainer) {
        console.log("❌ Stage container not found");
        cleanupDragState();
        return;
      }

      // Get the stage ID from the container
      const stageId = stageContainer.getAttribute('data-stage-id');
      if (!stageId) {
        console.log("❌ No stage ID found");
        cleanupDragState();
        return;
      }

      // Find the current stage
      const currentStage = stagesState.find(stage => stage.id === stageId);
      if (!currentStage) {
        console.log("❌ Stage not found in stagesState");
        cleanupDragState();
        return;
      }

      const target = eventTarget.closest('.drop-zone') as HTMLElement;
      if (!target) {
        console.log("❌ Drop target not found");
        cleanupDragState();
        return;
      }

      // Get data from the drag event directly
      const draggedId = e.dataTransfer!.getData('text/plain');
      if (!draggedId) {
        console.log("❌ No drag data found");
        cleanupDragState();
        return;
      }

      console.log("🟢 Drop event with data: for item with data-id", draggedId, "source:", dragSource);

      // Get the drop index
      const dropIndex = Number(target.getAttribute('data-index'));
      if (isNaN(dropIndex)) {
        console.log("❌ Invalid drop index");
        cleanupDragState();
        return;
      }

      // Create a copy of the current stage's actions
      const currentStageActions = [...currentStage.actions];

      // Handle based on drag source
      if (dragSource === 'library') {
        // Find item in library
        const libraryItem = actionsLibrary.find(item => item.id === draggedId);
        if (!libraryItem) {
          console.log("❌ Library item not found:", draggedId);
          cleanupDragState();
          return;
        }

        // Create a new unique ID for the sequence item
        const uniqueId = generateUUID();

        /**
         * Make a deep copy (If your object has nested objects/arrays):
         * A shallow copy only copies the top-level properties,
         * while a deep copy recursively copies all nested objects and arrays.
         *
         * Make a shallow copy by using
         *    let newSequenceItem = Object.assign({}, libraryItem);
         * Or using spread syntax (more concise):
         *    let newSequenceItemSpread = { ...libraryItem };
         */
        let newSequenceItem: AutomationAction = JSON.parse(JSON.stringify(libraryItem));
        // We make this copy so we can assign a new ID to the item
        newSequenceItem.id = uniqueId;

        // Add to sequence
        currentStageActions.splice(dropIndex, 0, libraryItem.id);
        console.log("✅ Added library item to sequence at position", dropIndex);
        // Update the stages array
        const updatedStages = stagesState.map(stage =>
          stage.id === stageId
            ? { ...stage, actions: currentStageActions }
            : stage
        );
        setStagesState(updatedStages);


        const stageActionItems = currentStageActions
          .map(actionId => {
            const actionDetail = actionsLibrary.find(a => a.id === actionId);
            return actionDetail;
          })
          .filter(Boolean) as AutomationAction[];

        // Save stage actions
        saveStageActions(stageId, stageActionItems);

      } else if (dragSource === 'sequence') {
        // Get the dragged item's index
        const itemIndex = currentStageActions.findIndex(actionId => actionId === draggedId);
        console.log("handleDrop | itemIndex", itemIndex, "draggedId", draggedId)
        if (itemIndex === -1) {
          console.log("❌ Sequence item not found:", draggedId);
          console.log("✅  stagesState,",stagesState);
          cleanupDragState();
          return;
        }

        // Handle reordering
        const [movedItem] = currentStageActions.splice(itemIndex, 1);

        // Adjust the insertion index if needed
        let adjustedDropIndex = dropIndex;
        if (itemIndex < dropIndex) {
          adjustedDropIndex -= 1;
        }

        // Insert the moved item at the new position
        currentStageActions.splice(adjustedDropIndex, 0, movedItem);

        // Update the stages array
        const updatedStages = stagesState.map(stage =>
          stage.id === stageId
            ? { ...stage, actions: currentStageActions }
            : stage
        );
        setStagesState(updatedStages);
        console.log("✅ updatedStages", updatedStages);
        const stageActionItems = currentStageActions
          .map(actionId => {
            const actionDetail = actionsLibrary.find(a => a.id === actionId);
            return actionDetail;
          })
          .filter(Boolean) as AutomationAction[];

        // Save stage actions
        saveStageActions(stageId, stageActionItems);

        console.log("✅ Reordered sequence item from", itemIndex, "to", adjustedDropIndex);
      }

      // Clean up
      cleanupDragState();
    };

    /**
     * Handles drag end events at the DOM level
     * Cleans up all drag state
     */
    const handleDragEnd = () => {
      cleanupDragState();
      draggedElement = null; // Additionally clear the local reference
    };

    // Add event listeners with directly targeted containers
    libraryContainer.addEventListener('dragstart', handleDragStart);
    sequenceContainer.addEventListener('dragstart', handleDragStart);
    sequenceContainer.addEventListener('dragover', handleDragOver);
    sequenceContainer.addEventListener('drop', handleDrop);

    // These need to be at document level to catch all drag ends
    document.addEventListener('dragend', handleDragEnd);

    // Add mousedown listeners for better UX
    libraryContainer.addEventListener('mousedown', () => {
      setDragSource('library');
    });

    sequenceContainer.addEventListener('mousedown', () => {
      setDragSource('sequence');
    });

    // Clean up
    return () => {
      libraryContainer.removeEventListener('dragstart', handleDragStart);
      sequenceContainer.removeEventListener('dragstart', handleDragStart);
      sequenceContainer.removeEventListener('dragover', handleDragOver);
      sequenceContainer.removeEventListener('drop', handleDrop);
      document.removeEventListener('dragend', handleDragEnd);

      libraryContainer.removeEventListener('mousedown', () => setDragSource('library'));
      sequenceContainer.removeEventListener('mousedown', () => setDragSource('sequence'));
    };
  }, [stagesState, dragSource, actionsLibrary]);


  /**
   * Effect for adding document-level event listeners
   * Handles drag cancellation, escape key, and out-of-bounds drags
   */
  useEffect(() => {
    /**
     * Additional document-level handler for drag end
     * Ensures cleanup even if drag ends outside normal drop zones
     */
    const handleDocumentDragEnd = () => {
      // Clean up all dragging states regardless of how the drag ended
      cleanupDragState();
      cleanupStageDragState();
    };

    document.addEventListener('dragend', handleDocumentDragEnd);

    /**
     * Handles keyboard events to support canceling drags with Escape key
     */
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (actionDragActive) cleanupDragState();
        if (stageDragActive) cleanupStageDragState();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    /**
     * Enables dragging over the entire document
     * Prevents "no drop" cursor when dragging outside drop zones
     */
    const handleDocumentDragOver = (e: DragEvent) => {
      // Allow dragging over the document
      e.preventDefault();
    };

    document.addEventListener('dragover', handleDocumentDragOver);

    // Clean up
    return () => {
      document.removeEventListener('dragend', handleDocumentDragEnd);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('dragover', handleDocumentDragOver);
    };
  }, [actionDragActive, stageDragActive]);
  //#endregion



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

  // fixed 16.3: Function to save the stage color to the backend
  const saveStageColor = async (stageId: string, newColor: string) => {
    try {
      const response = await fetch(`/api/pipeline/${pipeline.id}/stages/${stageId}`, {
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

  //#endregion

  // Debug logging
  //console.log("1356 Selected stage:", selectedStage);
  console.log("1387 debug Stage actions (IDs):", stageActions);//
  const stageActionItems = selectedStage?.actions
    .map(actionId => {
      const actionDetail = actionsLibrary.find(a => a.id === actionId);
      return actionDetail ? { ...actionDetail } : null;
    })
    .filter(Boolean) as AutomationAction[]; // use filter(Boolean) to remove any null entries

  const selectedStageActionItems = selectedStage?.actions
    .map(actionId => {
      const actionDetail = actionsLibrary.find(a => a.id === actionId);
      return actionDetail
        ? { id: actionDetail.id, default_config: actionDetail.default_config }
        : null;
    })
    .filter(Boolean) as { id: string; default_config: any }[];
  //console.log("1373 Stage SELECTED stageActionItems:", selectedStageActionItems);
  // ============================
  // ===== RENDER COMPONENT =====
  // ============================
  const tooltipStyle = "bg-gray-800 text-white border-blue-800";
  const tooltipStyleArrow = "fill-gray-800";
  type ConfigItem = {
    key: string;
    value: string | boolean;
  };
  return (
    <TooltipProvider delayDuration={500}>
      <div className="h-full">
        <div className="flex h-full">
          {/* Left Sidebar - Stages */}
          <div className="flex flex-col w-64 h-full border-r">

            <div className="p-4 border-b border-gray-200 shrink-0">

              {/* Pipeline name and edit button */}
              <div className="flex items-center justify-between mb-4 p-4">
                <div className="group relative flex flex-row items-center">
                  <h2 className="text-lg font-semibold mb-0">{pipeline.name}</h2>

                  {/* Popup form to edit pipeline details */}
                  <Popover open={isEditingName} onOpenChange={setIsEditingName}>
                    <PopoverTrigger asChild>
                      <button
                        className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity hover:text-blue-600'"
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
                              setEditedPipelineName(pipeline.name);
                              setEditedPipelineIcon(pipeline.icon || '');
                              setEditedPipelineDescription(pipeline.description || '');
                              setIsEditingName(false);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSavePipelineName}
                            disabled={!editedPipelineName.trim() || ( /* Disable the save button if there are no changes */
                              editedPipelineName === pipeline.name &&
                              editedPipelineIcon === (pipeline.icon || '') &&
                              editedPipelineDescription === (pipeline.description || '')
                            )}
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
            </div>

            {/* List of Stages within the Left Sidebar */}
            <div className="flex-1 overflow-y-auto">

              {/* First drop zone (for dropping a stage at the beginning of the sequence of stages) */}
              {stageDragActive && (
                <div
                  className="h-2 transition-all my-1 drop-zone-stage"
                  onDragOver={(e) => handleStageDragOver(e, 0)}
                  onDragLeave={(e) => e.currentTarget.classList.remove('stage-drop-active')}
                  onDrop={(e) => handleStageDrop(e, 0)}
                />
              )}

              {/* Add hover zone before stages (before the first stage) */}
              <div
                className="h-2 group relative hover:h-8 transition-all flex items-center justify-center"
                onMouseEnter={() => setHoverBetweenStage(0)}
                onMouseLeave={() => setHoverBetweenStage(null)}
              >
                {/* When user hovers between two stages, show an "add stage" button */}
                {hoverBetweenStage === 0 && (

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="absolute bg-blue-50 hover:bg-blue-100 text-blue-600 p-1 rounded-full transition-all"
                        onClick={() => handleAddStage(0)}
                      >
                        {getIcon('plus-circle', 'w-4 h-4')}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-800 text-white border-blue-800">
                      <TooltipArrow className="fill-gray-800" />
                      <p>Add new pipeline stage</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Create an item for each stage */}
              {stagesState.map((stage, index) => (
                <React.Fragment key={stage.id}>
                  {/* Stage with context menu */}
                  <StageWithContextMenu
                    stage={stage}
                    index={index}
                    totalStages={stagesState.length}
                    selectedStage={selectedStage}
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
                    pipelineId={pipeline.id} // Add this line
                  />

                  {/* Drop zone after this stage */}
                  {stageDragActive ? (
                    <div
                      className="h-2 transition-all my-1 drop-zone-stage"
                      onDragOver={(e) => handleStageDragOver(e, index + 1)}
                      onDragLeave={(e) => e.currentTarget.classList.remove('stage-drop-active')}
                      onDrop={(e) => handleStageDrop(e, index + 1)}
                    />
                  ) : (
                    /* When not dragging, show the add button on hover as before */
                    index < stagesState.length - 1 && (
                      <div
                        className="h-2 group relative hover:h-8 transition-all flex items-center justify-center"
                        onMouseEnter={() => setHoverBetweenStage(index + 1)}
                        onMouseLeave={() => setHoverBetweenStage(null)}
                      >
                        {hoverBetweenStage === index + 1 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className="absolute bg-blue-50 hover:bg-blue-100 text-blue-600 p-1 rounded-full transition-all"
                                onClick={() => handleAddStage(index + 1)}
                              >
                                {getIcon('plus-circle', 'w-4 h-4')}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-800 text-white border-blue-800">
                              <TooltipArrow className="fill-gray-800" />
                              <p>Add new pipeline stage</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    )
                  )}
                </React.Fragment>
              ))}

              {/* Add a hover zone after the last stage */}
              <div
                className="h-2 group relative hover:h-8 transition-all flex items-center justify-center"
                onMouseEnter={() => setHoverBetweenStage(stagesState.length)}
                onMouseLeave={() => setHoverBetweenStage(null)}
              >
                {/* Add button "add stage" after the last stage */}
                {hoverBetweenStage === stagesState.length && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="absolute bg-blue-50 hover:bg-blue-100 text-blue-600 p-1 rounded-full transition-all"
                        onClick={() => handleAddStage(stagesState.length)}
                      >
                        {getIcon('plus-circle', 'w-4 h-4')}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-800 text-white border-blue-800">
                      <TooltipArrow className="fill-gray-800" />
                      <p>Add new pipeline stage</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>

            {/* Bottom actions */}
            <div className="p-4 border-t border-gray-200 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md flex items-center gap-2">
                    {getIcon('settings2')}
                    Configure Pipeline
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-800 text-white border-blue-800">
                  <TooltipArrow className="fill-gray-800" />
                  <p>Customize pipeline stages and settings</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          {/* Left Sidebar - Stages End */}

          {/* Leads view or Automation Builder with Drag and Drop Area */}
          <div className="flex-1 h-full overflow-hidden">
            {showAutomation ? (
              // Show the Automation Builder View with Action Library
              <div className="flex h-full">
                {/* Action Library - Left panel with available actions */}
                <div
                  ref={libraryContainerRef}
                  className="w-64 bg-gray-50 border-r overflow-y-auto p-4 library-container h-full"
                >
                  <h3 className="font-semibold mb-4">Action Library</h3>

                  {/* Search input for filtering actions */}
                  <div className="relative mb-4">
                    {getIcon("search", "absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4")}
                    <input
                      type="text"
                      placeholder="Search actions..."
                      className="w-full pl-8 pr-2 py-2 border rounded"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Draggable Library Items */}
                  <div className="space-y-2 overflow-y-auto">
                    {filteredLibraryActions.map((item) => (
                      <div
                        key={item.id}
                        className="bg-gray-50 p-3 rounded-md border border-gray-200 flex items-center gap-2 cursor-grab hover:shadow-sm transition-shadow"
                        draggable={true}
                        data-id={item.id}
                        onDragStart={(e) => onItemDragStart(e, item.id, 'library')}
                        onDragEnd={onDragEnd}
                      >
                        <div className="p-1 bg-blue-50 text-blue-600 rounded flex flex-row items-center gap-2">
                          {getIcon("grip-horizontal", "")}
                          {/* Render icon based on string name, or use the icon directly if it's already a component */}
                          {renderIcon(item.icon)}
                        </div>
                        <span className="text-sm">{item.name}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-4">
                    Drag actions from this library into the sequence to build your pipeline.
                  </p>
                </div>

                {/* Stages Automation Builder - Right panel with sequence containers */}
                <div
                  ref={sequenceContainerRef}
                  className="flex-1 bg-white shadow-md rounded-lg overflow-y-auto p-4"
                >
                  <h2 className="font-semibold mb-4">
                    Automation Sequence - {selectedStage?.id}
                  </h2>

                  {/* Render a section for each stage */}
                  {stagesState.map((stage) => (
                    <div
                      key={stage.id}
                      className={`mb-6 p-4 rounded-lg border stage-container
                        ${selectedStage?.id === stage.id
                          ? 'border-blue-300 bg-blue-50/50'
                          : 'border-gray-200'
                        }`}
                      data-stage-id={stage.id}
                    >
                      <h3 className="font-semibold mb-3 flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: "#" + (stage.color && stage.color.trim()) || '0066CC' }}
                        />
                        {stage.title} Automation ({stage.id}:#{stage.order_index})
                        <button
                          className="ml-auto text-green-100"
                          onClick={(e) => {
                            console.log('✅💾  STAGEID:', stage.id, ':#stageActionItems', stageActionItems);//sh
                            e.stopPropagation(); // Prevent event from bubbling
                            //saveStageActions(stage.id, stageActionItems);
                            //handleAddActionSQL(pipeline.id,stage.id, formattedStageActionItems);
                          }}
                        >
                          {getIcon("storage")}
                        </button>
                      </h3>

                      {/* Sequence container for this specific stage - Target for drops */}
                      <div ref={sequenceContainerRef} className="relative space-y-2 min-h-24">
                        {/* Empty state for stages with no actions */}
                        {stage.actions.length === 0 ? (
                          <div
                            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-500 drop-zone empty-drop-zone"
                            data-index={0}
                            onDragOver={(e) => {
                              e.preventDefault();
                              onDragOver(e);
                              e.currentTarget.classList.add('empty-drop-zone-active');
                            }}
                            onDragLeave={(e) => {
                              e.currentTarget.classList.remove('empty-drop-zone-active');
                            }}
                            onDrop={(e) => {
                              onDrop(e, 0, stage);
                              e.currentTarget.classList.remove('empty-drop-zone-active');
                            }}
                          >
                            Drag actions here to build sequence
                          </div>
                        ) : (
                          <>
                            {/* First drop zone before any items */}
                            <div
                              className={`drop-zone transition-all h-2 my-1 rounded-full ${actionDragActive ? 'opacity-100' : 'opacity-0'}`}
                              data-index={0}
                              data-stage-id={stage.id}
                              onDragOver={onDragOver}
                              onDrop={(e) => onDrop(e, 0, stage)}
                            />

                            {/* Render each action in this stage's sequence */}
                            {stage.actions.map((actionId, index) => {
                              // Handle both simple and compound IDs (with UUID)
                              const originalId = actionId.includes('_') ? actionId.split('_')[0] : actionId;
                              const actionDetail = actionsLibrary.find(a => a.id === originalId);
                              if (!actionDetail) return null;

                              return (
                                <React.Fragment key={`${stage.id}-${actionId}-${index}`}>
                                  {/* Draggable action item */}
                                  <div
                                    className="p-3 border rounded-lg flex items-center gap-2 my-2"
                                    draggable
                                    data-id={actionId}
                                    data-index={index}
                                    data-stage-id={stage.id}
                                    onDragStart={(e) => onItemDragStart(e, actionId, 'sequence')}
                                  >
                                    {/* Action content */}
                                    <span className='cursor-grab'>
                                      {getIcon("grip-horizontal", "text-gray-400")}
                                    </span>

                                    <div className="p-1 bg-blue-50 text-blue-600 rounded flex flex-row items-center gap-2">
                                      {/* Render icon based on string name, or use the icon directly if it's already a component */}
                                      {renderIcon(actionDetail.icon)}
                                    </div>
                                    <span>{actionDetail.name}</span>

                                    {/* Visual connector between actions */}
                                    {index < stage.actions.length - 1 && (
                                      <div className="absolute left-1/2">
                                        <div className="absolute bottom-[-3rem] z-10 ">
                                          <svg width="12" height="24" className="text-gray-400 fill-current">
                                            <path d="M6 0V24M6 24L1 19M6 24L11 19" stroke="currentColor" fill="none" strokeWidth="2" />
                                          </svg>
                                        </div>
                                      </div>
                                    )}

                                    {/* expand and Delete button for the stage - region setup line 708*/}
                                    <button
                                      className="ml- text-blue-500"
                                      onClick={(e) => {
                                        e.stopPropagation(); // Prevent event from bubbling
                                        let currentObject = stagesState.find(obj => obj.id === stage.id);
                                        if (currentObject) {
                                          setSelectedStage(currentObject);
                                          setStageActions(currentObject.actions || []);
                                        }

                                        handleActionExpand(stage, actionId, index);
                                      }}
                                    >
                                      {getIcon("arrow-down")}
                                    </button>
                                    {/* Conditionally render config only for the specific expanded action */}
                                    {expandedActionDetails.stageId === stage.id &&
                                      expandedActionDetails.actionId === actionId && (
                                        <div className="mt-2 bg-gray-100 rounded-md p-4">
                                          <h4 className="font-bold mb-2">Action Configuration</h4>
                                          {expandedActionDetails.configList.length > 0 ? (
                                            expandedActionDetails.configList.map(({ key, value }) => (
                                              <div key={key} className="flex items-center mb-3">
                                                <span className="font-light w-1/2">{key}</span>
                                                {typeof value === 'boolean' ? (
                                                  <input
                                                    type="checkbox"
                                                    checked={value}
                                                    onChange={(e) => handleChangeDefaultConfig(key, e.target.checked)}
                                                    className="p-1 border rounded w-1/4"
                                                  />
                                                ) : (
                                                  <input
                                                    type="text"
                                                    value={value}
                                                    onChange={(e) => handleChangeDefaultConfig(key, e.target.value)}
                                                    className="p-1 border rounded w-1/2 right"
                                                  />
                                                )}
                                              </div>
                                            ))
                                          ) : (
                                            <p className="text-gray-500">No configuration available</p>
                                          )}
                                        </div>
                                      )}
                                    <button
                                      className="ml-auto text-red-500"
                                      onClick={(e) => {
                                        e.stopPropagation(); // Prevent event from bubbling
                                        handleRemoveAction(stage.id, index);
                                      }}
                                    >
                                      {getIcon("trash")}
                                    </button>
                                    {/* <button
                                      className="ml- text-red-500"
                                      onClick={(e) => {
                                        e.stopPropagation(); // Prevent event from bubbling
                                        handleAddAction(stage.id, actionId);
                                      }}
                                    >
                                      {getIcon("plus-circle")}
                                    </button> */}
                                  </div>

                                  {/* Drop zone after each action */}
                                  <div
                                    className={`drop-zone transition-all h-2 my-1 rounded-full ${actionDragActive ? 'opacity-100' : 'opacity-0'}`}
                                    data-index={index + 1}
                                    data-stage-id={stage.id}
                                    onDragOver={onDragOver}
                                    onDrop={(e) => onDrop(e, index + 1, stage)}
                                  />
                                </React.Fragment>
                              );
                            })}
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                </div>

              </div>
            ) : (
              <div className="h-full overflow-auto">
                {(() => {
                  /*
                  TODO: Evaluate if the self-executing function is neccessary to return the LeadsView
                  The function seems to be used so that the console.log statement can be executed before the leadsview is rendered

                  The purpose of returning LeadsView from a self-executing function in this context is primarily to allow for additional logic or operations to be performed before rendering the component. This is useful in scenarios where:

                  1. Debugging or Logging:
                  The console.log("stagesState sent to LeadsView :", stagesState); statement is executed before LeadsView is rendered. This is used to log the current state of stagesState for debugging purposes, ensuring the developer can track what data is being passed into the LeadsView component.

                  2. Encapsulation of Logic:
                  If there is any additional logic needed before rendering LeadsView (e.g., conditionally modifying props, computing values, or performing side effects), wrapping it in a self-executing function allows for better organization and clarity, ensuring this logic is scoped and not mixed with the main JSX.

                  3. Preventing Unnecessary Computations:
                  In some cases, this pattern ensures that any logic or side effects are executed only when the JSX is rendered, rather than being evaluated prematurely during the component's lifecycle.
                  */
                  console.log("stagesState sent to LeadsView :", stagesState);
                  return (
                    <LeadsView
                      selectedStage={selectedStage}
                      stages={stagesState}
                      setViewMode={setViewMode}
                      viewMode={viewMode}
                    />
                  );
                })()}

              </div>
            )}
          </div>
        </div>

        {/* CSS Styles for drag and drop visual states */}
        <style jsx global>{`
        /* Make sure flex containers handle overflow properly */
        .flex-1 {
          min-height: 0;
        }

        .stage-title {
          background-color: var(--color-primary);
        }

        /* Item being dragged */
        .dragging {
            opacity: 0.6 !important;
            background-color: #dbeafe !important;
            border-color: #3b82f6 !important;
          }

        /* Active drop zone */
        .drop-zone-active {
          height: 20px !important;
          background-color: #bfdbfe !important;
          border-radius: 9999px;
        }

        /* Special handling for empty stage drop zones */
        .drop-zone.empty-drop-zone {
          transition: all 0.2s ease;
          height: auto !important;
        }

        /* Empty drop zone when active */
        .empty-drop-zone-active {
          background-color: #bfdbfe !important;
          border-color: #3b82f6 !important;
          border-width: 3px !important;
        }

        /* Show drop zones only during drag */
        .drag-active .drop-zone {
          transition: all 0.2s ease;
        }

        /* Minimum height for sequence containers */
        .sequence-container {
          min-height: 120px;
        }

        /* Hover effect for library items */
        .library-container > div:hover {
          border-color: #93c5fd;
        }

        /*******************************************
         * Drag and drop of stages
         *
        */
        /* Add these styles to your existing style jsx global block */
        .stage-dragging {
          opacity: 0.6 !important;
          border: 2px dashed #3b82f6 !important;
          background-color: #dbeafe !important;
        }

        .drop-zone-stage {
          transition: all 0.2s ease;
        }

        .stage-drop-active {
          height: 20px !important;
          background-color: #93c5fd !important;
          border-radius: 4px;
        }

        .stage-drag-active .drop-zone-stage {
          border: 1px dashed #3b82f6;
          background-color: #eff6ff;
          height: 8px !important;
          border-radius: 4px;
        }
      `}</style>
      </div>
    </TooltipProvider>
  );
};

export default DynamicPipelineView;