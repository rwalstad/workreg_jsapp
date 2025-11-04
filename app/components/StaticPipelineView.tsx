"use client";

import React, { useState, useRef, useEffect } from 'react';
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

import { PipelineData, StageDataWactions, AutomationAction } from '@/types';

interface IntegratedPipelineDashboardProps {
  pipeline: PipelineData;
  stages: StageDataWactions[];
  actions: AutomationAction[];
}

const StaticPipelineView: React.FC<IntegratedPipelineDashboardProps> = ({
  pipeline,
  stages: initialStages,
  actions
}) => {
  const [selectedStage,         setSelectedStage]         = useState<string | null>(null);
  const [viewMode,              setViewMode]              = useState('table');
  const [showAutomation,        setShowAutomation]        = useState(false);
  const [draggedAction,         setDraggedAction]         = useState<string | null>(null);
  const [dropTarget,            setDropTarget]            = useState<{stageId: string, index: number} | null>(null);
  const [actionSearch,          setActionSearch]          = useState('');
  const [stages,                setStages]                = useState<StageDataWactions[]>(initialStages);
  const [hoverBetweenStage,     setHoverBetweenStage]     = useState<number | null>(null);  // State for tracking hover position:
  const [draggedExistingAction, setDraggedExistingAction] = useState<{stageId: string, index: number} | null>(null);
  const [currentPipeline,       setCurrentPipeline]       = useState(pipeline);
  const [isEditingName,         setIsEditingName]         = useState(false);   // Keep track of whether the user is editing the pipeline name
  const [editedPipelineName,        setEditedPipelineName]        = useState(currentPipeline.name);
  const [editedPipelineIcon,        setEditedPipelineIcon]        = useState(currentPipeline.icon || '');
  const [editedPipelineDescription, setEditedPipelineDescription] = useState(currentPipeline.description || '');
  const automationContainerRef = useRef<HTMLDivElement>(null);

  const { getIcon } = useActions();

  // Convert action data to the format needed by the component
  const actionLibrary = actions.map(action => ({
    id: action.id,
    name: action.name,
    icon: getIcon(action.icon) || getIcon("info")
  }));

  // Set the first stage as selected by default
  useEffect(() => {
    if (stages.length > 0 && !selectedStage) {
      setSelectedStage(stages[0].id);
    }
  }, [stages, selectedStage]);

  // Handle scroll in automation view to switch stages
  const handleAutomationScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!automationContainerRef.current || !showAutomation) return;

    const container = automationContainerRef.current;
    const scrollPosition = container.scrollTop;
    const containerHeight = container.clientHeight;
    const scrollHeight = container.scrollHeight;

    // Near top
    if (scrollPosition < 100) {
      const currentIndex = stages.findIndex(s => s.id === selectedStage);
      if (currentIndex > 0) {
        setSelectedStage(stages[currentIndex - 1].id);
      }
    }
    // Near bottom
    else if (scrollHeight - (scrollPosition + containerHeight) < 100) {
      const currentIndex = stages.findIndex(s => s.id === selectedStage);
      if (currentIndex < stages.length - 1) {
        setSelectedStage(stages[currentIndex + 1].id);
      }
    }
  };

  // Handle drag start on action library item
  const handleDragStart = (actionId: string) => {
    setDraggedAction(actionId);
  };

  // Handle drag start on existing action item (for reordering)
  const handleExistingActionDragStart = (e: React.DragEvent<HTMLDivElement>, stageId: string, index: number) => {
    // Set the dragged item state
    setDraggedExistingAction({ stageId, index });

    // Create a custom drag image to show only the dragged item
    const draggedItem = e.currentTarget;

    // Create a clone of the element for the drag image
    const dragImage = draggedItem.cloneNode(true) as HTMLElement;

    // Apply styles to the clone to match the original but without affecting layout
    dragImage.style.width = `${draggedItem.offsetWidth}px`;
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px'; // Position off-screen
    dragImage.style.opacity = '0.8';

    // Add to the DOM temporarily
    document.body.appendChild(dragImage);

    // Set as drag image (adjust positioning as needed)
    e.dataTransfer.setDragImage(dragImage, 20, 20);

    // Add a timeout to remove the temporary element
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);

    // Set drag effect
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over on potential drop position
  const handleDragOverPosition = (stageId: string, index: number) => {
    setDropTarget({ stageId, index });
  };

  // Handle drag leave
  const handleDragLeave = () => {
    setDropTarget(null);
  };

  // Handle drag over on drop zone
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent, stageId: string, index: number = -1) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);

    // If we're dragging a new action from library
    if (draggedAction) {
      setStages(prevStages =>
        prevStages.map(stage => {
          if (stage.id === stageId) {
            const newActions = [...stage.actions];

            if (index !== -1) {
              // If a specific index is provided, insert at that position only
              newActions.splice(index, 0, draggedAction);
            } else {
              // Only add to the end if we're specifically dropping on the end drop zone
              newActions.push(draggedAction);
            }

            return {
              ...stage,
              actions: newActions
            };
          }
          return stage;
        })
      );
      // Always reset drag states
      setDraggedAction(null);
    }
    // If we're reordering an existing action
    else if (draggedExistingAction) {
      const { stageId: sourceStageId, index: sourceIndex } = draggedExistingAction;

      // Don't do anything if dropping in same position
      if (sourceStageId === stageId && (sourceIndex === index || sourceIndex === index - 1)) {
        setDraggedExistingAction(null);
        return;
      }

      setStages(prevStages => {
        const newStages = JSON.parse(JSON.stringify(prevStages));
        // Find the source and target stages
        const sourceStage = newStages.find((s: StageDataWactions) => s.id === sourceStageId);
        const targetStage = newStages.find((s: StageDataWactions) => s.id === stageId);

        if (sourceStage && targetStage) {
        // Get the action we're moving
        const actionToMove = sourceStage.actions[sourceIndex];

          // Remove from source
          sourceStage.actions = sourceStage.actions.filter((_: string, i: number) => i !== sourceIndex);

          // Add to target
          if (index === -1) {
            targetStage.actions.push(actionToMove);
          } else {
          // If moving within same stage and moving to a position after current position,
          // we need to adjust the target index to account for the removed item
          let adjustedIndex = index;
            if (sourceStageId === stageId && sourceIndex < index) {
              adjustedIndex = Math.max(0, adjustedIndex - 1);
            }
            targetStage.actions.splice(adjustedIndex, 0, actionToMove);
          }
        }

        return newStages;
      });

      setDraggedExistingAction(null);
    }
  };

  // Handle remove action
  const handleRemoveAction = (stageId: string, actionIndex: number) => {
    setStages(prevStages =>
      prevStages.map(stage => {
        if (stage.id === stageId) {
          const newActions = [...stage.actions];
          newActions.splice(actionIndex, 1);
          return {
            ...stage,
            actions: newActions
          };
        }
        return stage;
      })
    );
  };

  // Show drop spaces based on drag state
  useEffect(() => {
    const showDropSpaces = draggedAction !== null || draggedExistingAction !== null;

    if (showDropSpaces) {
      document.body.classList.add('dragging-active');
    } else {
      document.body.classList.remove('dragging-active');
    }

    return () => {
      document.body.classList.remove('dragging-active');
    };
  }, [draggedAction, draggedExistingAction]);


  // Function for adding a new stage
  const handleAddStage = (position: number | null = null) => {
    // Show a modal or prompt to enter stage name
    const stageName = prompt("Enter name for new stage:");

    if (!stageName) return; // Cancel if user doesn't enter a name

    // Generate a unique ID - in production, this would come from the backend
    const newId = `stage-${Date.now()}`;

    // Create a new stage with default values
    const newStage: StageDataWactions = {
      id: newId,
      title: stageName,
      color: '#0066CC', // Default color
      order_index: 0,
      count: 0,
      conversion: {
        rate: 0,
        moved: 0,
        total: 0
      },
      actions: []
    };

    setStages(prevStages => {
      // If position is null, add to the end
      if (position === null) {
        return [...prevStages, newStage];
      }

      // Otherwise, insert at the specified position
      const newStages = [...prevStages];
      newStages.splice(position, 0, newStage);
      return newStages;
    });
  };

  // Filter actions by search term
  const filteredActionLibrary = actionLibrary.filter(action =>
    action.name.toLowerCase().includes(actionSearch.toLowerCase())
  );

  // Handle update to pipeline name
  const handleSavePipelineName = async () => {
    try {
      // Make an API call to update the pipeline name
      const response = await fetch(`/api/pipeline/${pipeline.id}`, {
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
        // TODO: Add a toast/sonner
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

      // TODO: Show success message (you can use a toast/sonner notification if available)
      console.log('Pipeline updated successfully');
    } catch (error) {
      console.error('Error updating pipeline:', error);
      // Show error message to the user
    }
  };


  const tooltipStyle = "bg-gray-800 text-white border-blue-800";
  const tooltipStyleArrow = "fill-gray-800";

  return (
    <TooltipProvider delayDuration={500}>
      <div className="flex h-screen bg-gray-50">
        {/* Left Sidebar - Pipeline Stages */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="group relative flex items-center">
                <h2 className="text-lg font-semibold mb-0">{currentPipeline.name}</h2>

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
                            editedPipelineName        === currentPipeline.name &&
                            editedPipelineIcon        === (currentPipeline.icon || '') &&
                            editedPipelineDescription === (currentPipeline.description || '')
                          )}
                        >
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Place the tooltip separately to avoid conflicts */}
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
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {stages.reduce((total, stage) => total + stage.count, 0)} total leads
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
                  <TooltipContent className={tooltipStyle}>
                    <TooltipArrow className={tooltipStyleArrow} />
                    <p>{showAutomation ? "Switch to leads view" : "Switch to automation builder"}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* Stage List */}
          <div className="flex-1 overflow-y-auto">
            {stages.map((stage, index) => (
              <React.Fragment key={stage.id}>
                {/* Add hover zone before stages (except the first one) */}
                {index > 0 && (
                  <div
                    className="h-2 group relative hover:h-8 transition-all flex items-center justify-center"
                    onMouseEnter={() => setHoverBetweenStage(index)}
                    onMouseLeave={() => setHoverBetweenStage(null)}
                  >
                    {/* When user hovers his mouse inbetween two stages, show a add button "add stage" */}
                    {hoverBetweenStage === index && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="absolute bg-blue-50 hover:bg-blue-100 text-blue-600 p-1 rounded-full transition-all"
                            onClick={() => handleAddStage(index)}
                          >
                            {getIcon('plus-circle', 'w-4 h-4')}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className={tooltipStyle}>
                          <TooltipArrow className={tooltipStyleArrow} />
                          <p>Add new pipeline stage</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                )}

                <div
                  key={stage.id}
                  className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${selectedStage === stage.id ? 'bg-blue-50' : ''
                    }`}
                  onClick={() => setSelectedStage(stage.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span className="font-medium">{stage.title}</span>
                    </div>
                    {!showAutomation && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="p-1 hover:bg-blue-100 rounded text-blue-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Execute automation logic
                            }}
                          >
                            {getIcon('play')}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className={tooltipStyle}>
                          <TooltipArrow className={tooltipStyleArrow} />
                          <p>Run automation flow</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{stage.count.toLocaleString()} leads</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1">
                          <span>{stage.conversion.rate.toFixed(0)}% convert</span>
                          {getIcon('info', 'w-3 h-3 text-gray-400')}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className={tooltipStyle}>
                        <TooltipArrow className={tooltipStyleArrow} />
                        <p>
                          {stage.conversion.moved.toLocaleString()} out of {stage.conversion.total.toLocaleString()} leads moved to the next stage
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {showAutomation && (
                    <div className="mt-2 text-xs text-gray-500">
                      {stage.conversion.moved.toLocaleString()} / {stage.conversion.total.toLocaleString()} moved forward
                    </div>
                  )}

                  <div className="mt-2 h-1 bg-gray-100 rounded-full">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${stage.conversion.rate}%`,
                        backgroundColor: stage.color
                      }}
                    />
                  </div>
                </div>
              </React.Fragment>
            ))}

            {/* Add a hover zone after the last stage */}
            <div
              className="h-2 group relative hover:h-8 transition-all flex items-center justify-center"
              onMouseEnter={() => setHoverBetweenStage(stages.length)}
              onMouseLeave={() => setHoverBetweenStage(null)}
            >
              {/* Add button "add stage" after after the last stage, and only show it when user hovers the mouse over the bottom of the stage */}
              {hoverBetweenStage === stages.length && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="absolute bg-blue-50 hover:bg-blue-100 text-blue-600 p-1 rounded-full transition-all"
                      onClick={() => handleAddStage(stages.length)}
                    >
                      {getIcon('plus-circle', 'w-4 h-4')}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className={tooltipStyle}>
                    <TooltipArrow className={tooltipStyleArrow} />
                    <p>Add new pipeline stage</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-4 border-t border-gray-200">
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md flex items-center gap-2">
                  {getIcon('settings2')}
                  Configure Pipeline
                </button>
              </TooltipTrigger>
              <TooltipContent className={tooltipStyle}>
                <TooltipArrow className={tooltipStyleArrow} />
                <p>Customize pipeline stages and settings</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {showAutomation ? (
            // Automation Builder View with Action Library
            <div className="flex-1 flex overflow-hidden">
              {/* Action library sidebar */}
              <div className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col overflow-hidden">
                <h3 className="font-semibold mb-3">Action Library</h3>
                <p className="text-xs text-gray-500 mb-3">Drag actions from this library into any stage to add it to your automation flow</p>

                {/* Search box */}
                <div className="relative mb-4">
                  {getIcon('search', "w-4 h-4 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400")}
                  <input
                    type="text"
                    placeholder="Search actions..."
                    className="w-full pl-8 pr-2 py-1.5 border border-gray-200 rounded-md text-sm"
                    value={actionSearch}
                    onChange={(e) => setActionSearch(e.target.value)}
                  />
                </div>

                {/* Each action available for user to drag and drop */}
                <div className="flex-1 overflow-y-auto space-y-2">
                  {filteredActionLibrary.map(action => (
                    <div
                      key={action.id}
                      className="bg-gray-50 p-3 rounded-md border border-gray-200 flex items-center gap-2 cursor-grab hover:shadow-sm transition-shadow"
                      draggable
                      onDragStart={() => handleDragStart(action.id)}
                    >
                      <div className="p-1 bg-blue-50 text-blue-600 rounded">
                        {action.icon}
                      </div>
                      <span className="text-sm">{action.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Automation builder area */}
              <div
                ref={automationContainerRef}
                className="flex-1 overflow-y-auto p-6"
                onScroll={handleAutomationScroll}
              >
                {stages.map(stage => (
                  <div
                    key={stage.id}
                    className={`mb-10 p-6 rounded-lg ${selectedStage === stage.id ? 'opacity-100' : 'opacity-60'
                      }`}
                    style={{
                      backgroundColor: `${stage.color}10` // Add 10% opacity version of the stage color
                    }}
                    onDragOver={handleDragOver}
                    onDrop={(e) => {
                      // Only handle drops directly on the stage container, not on its children
                      if (e.target === e.currentTarget) {
                        handleDrop(e, stage.id);
                      }
                    }}
                  >
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      {getIcon('workflow', 'w-5 h-5')}
                      {stage.title} Automation
                    </h2>

                    {/* Action sequence */}
                    <div className="space-y-3 relative">
                      {/* First drop position */}
                      {(draggedAction !== null || draggedExistingAction !== null) && (
                        <div
                          className={`h-2 my-1 rounded-full flex justify-center items-center transition-all ${
                            dropTarget?.stageId === stage.id && dropTarget?.index === 0
                              ? 'h-10 bg-blue-100' : ''
                            }`}
                          onDragOver={(e) => {
                            e.preventDefault();
                            handleDragOverPosition(stage.id, 0);
                          }}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => {
                            e.stopPropagation();
                            handleDrop(e, stage.id, 0);
                          }}
                        >
                          {dropTarget?.stageId === stage.id && dropTarget?.index === 0 && (
                            getIcon('plus-square', 'w-5 h-5 text-blue-500')
                          )}
                        </div>
                      )}

                      {stage.actions.map((actionId, idx) => {
                        const actionDetails = actionLibrary.find(a => a.id === actionId);

                        return (
                          <React.Fragment key={idx}>
                            <div
                              className={`bg-white p-4 rounded-lg border border-gray-200 flex items-center gap-3 group cursor-grab ${
                                draggedExistingAction?.stageId === stage.id && draggedExistingAction?.index === idx
                                  ? 'being-dragged' : ''
                                }`}
                              draggable={true}
                              onDragStart={(e) => handleExistingActionDragStart(e, stage.id, idx)}
                              onDragEnd={() => setDropTarget(null)}
                            >
                              {getIcon('grip-horizontal', 'w-4 h-4 text-gray-400 cursor-grab')}

                              {actionDetails?.icon && (
                                <div className="p-1 bg-blue-50 text-blue-600 rounded">
                                  {actionDetails.icon}
                                </div>
                              )}

                              <span>{actionDetails?.name || actionId}</span>

                              {/* If not the last item, show arrow down */}
                              {idx < stage.actions.length - 1 && (
                                <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 z-10">
                                  {getIcon('arrow-right', 'w-4 h-4 text-gray-400 transform rotate-90')}
                                </div>
                              )}

                              {/* Delete button - appears on hover */}
                              <button
                                className="ml-auto opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-red-500 rounded-full transition-opacity"
                                onClick={() => handleRemoveAction(stage.id, idx)}
                              >
                                {getIcon('trash')}
                              </button>
                            </div>

                            {/* Drop position after this action */}
                            {(draggedAction !== null || draggedExistingAction !== null) && (
                              <div
                                className={`h-2 my-1 rounded-full flex justify-center items-center transition-all ${
                                  dropTarget?.stageId === stage.id && dropTarget?.index === idx + 1
                                    ? 'h-10 bg-blue-100' : ''
                                  }`}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  handleDragOverPosition(stage.id, idx + 1);
                                }}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => {
                                  e.stopPropagation();
                                  handleDrop(e, stage.id, idx + 1);
                                }}
                              >
                                {dropTarget?.stageId === stage.id && dropTarget?.index === idx + 1 && (
                                  getIcon('plus-square', 'w-5 h-5 text-blue-500')
                                )}
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}

                      {/* Drop zone for new actions at the end */}
                      <div
                        className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 flex items-center justify-center gap-2 transition-colors"
                        onDragOver={(e) => {
                          e.preventDefault();
                          handleDragOverPosition(stage.id, -1);
                        }}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => {
                          e.stopPropagation();
                          handleDrop(e, stage.id, -1);
                        }}
                      >
                        { getIcon('plus-circle') }
                        Drop Action Here
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Leads View
            <>
              {/* Toolbar */}
              <div className="bg-white border-b border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <h1 className="text-xl font-semibold mb-0">
                      {selectedStage ?
                        "Viewing leads for stage " + stages.find(s => s.id === selectedStage)?.title :
                        'All Leads'
                      }
                    </h1>
                    <button className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"> {/* Adjust -mt-1 as needed */}
                      {getIcon('refresh')}
                      Refresh
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className={`px-3 py-1 text-sm rounded ${
                        viewMode === 'table' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
                      }`}
                      onClick={() => setViewMode('table')}
                    >
                      Table
                    </button>
                    <button
                      className={`px-3 py-1 text-sm rounded ${
                        viewMode === 'cards' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
                      }`}
                      onClick={() => setViewMode('cards')}
                    >
                      Cards
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    {getIcon("search", "w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400")}
                    <input
                      type="text"
                      placeholder="Search leads..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md"
                    />
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="px-4 py-2 border border-gray-200 rounded-md flex items-center gap-2 hover:bg-gray-50">
                        {getIcon("filter")}
                        Filters
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className={tooltipStyle}>
                      <TooltipArrow className={tooltipStyleArrow} />
                      <p>Apply filters to leads</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="px-4 py-2 border border-gray-200 rounded-md flex items-center gap-2 hover:bg-gray-50">
                        {getIcon("sort-asc")}
                        Sort
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className={tooltipStyle}>
                      <TooltipArrow className={tooltipStyleArrow} />
                      <p>Sort leads by different criteria</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Lead List - Virtualized */}
              <div className="flex-1 overflow-auto p-4">
                {viewMode === 'table' ? (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium text-gray-600">Lead</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-600">Company</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-600">Status</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-600">Last Contact</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-600">Score</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {/* In real app, use react-window or react-virtualized */}
                    </tbody>
                  </table>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* In real app, use react-window or react-virtualized */}

                  </div>
                )}
              </div>

              {/* Footer with Pagination */}
              <div className="bg-white border-t border-gray-200 p-4 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing 1-5 of {selectedStage ?
                    stages.find(s => s.id === selectedStage)?.count :
                    stages.reduce((total, stage) => total + stage.count, 0)
                  } leads
                </div>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50">
                        Previous
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className={tooltipStyle}>
                      <TooltipArrow className={tooltipStyleArrow} />
                      <p>Go to previous page</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50">
                        Next
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className={tooltipStyle}>
                      <TooltipArrow className={tooltipStyleArrow} />
                      <p>Go to next page</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default StaticPipelineView;