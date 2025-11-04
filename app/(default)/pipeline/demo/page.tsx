"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
  Search, Filter, SortAsc, MoreVertical, ChevronRight,
  ChevronDown, Users, Settings2, RefreshCw, Play,
  PlusCircle, GripHorizontal, Workflow, Info, Trash2,
  Mail, Calendar, FileText, UserCheck, UserPlus, PhoneCall,
  MessageSquare, Clock, DollarSign, ArrowRight, PlusSquare
} from 'lucide-react';
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TooltipArrow,
} from "@/components/ui/tooltip";

const IntegratedPipelineDashboard = () => {
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState('table');
  const [showAutomation, setShowAutomation] = useState(false);
  const [draggedAction, setDraggedAction] = useState<string | null>(null);
  const [draggedExistingAction, setDraggedExistingAction] = useState<{stageId: number, index: number} | null>(null);
  const [dropTarget, setDropTarget] = useState<{stageId: number, index: number} | null>(null);
  const [actionSearch, setActionSearch] = useState('');
  const automationContainerRef = useRef<HTMLDivElement>(null);

  // Library of available actions with icons
  const actionLibrary = [
    { id: 'send-email',       name: 'Send Email',     icon: <Mail className="w-4 h-4" /> },
    { id: 'linkedin-connect', name: 'LinkedIn Connection', icon: <UserPlus className="w-4 h-4" /> },
    { id: 'add-crm',          name: 'Add to CRM',     icon: <UserCheck className="w-4 h-4" /> },
    { id: 'schedule-call',    name: 'Schedule Call',  icon: <PhoneCall className="w-4 h-4" /> },
    { id: 'follow-up',        name: 'Send Follow-up', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'calendar-invite',  name: 'Calendar Invite',icon: <Calendar className="w-4 h-4" /> },
    { id: 'send-proposal',    name: 'Send Proposal',  icon: <FileText className="w-4 h-4" /> },
    { id: 'set-reminder',     name: 'Set Reminder',   icon: <Clock className="w-4 h-4" /> },
    { id: 'pricing-quote',    name: 'Pricing Quote',  icon: <DollarSign className="w-4 h-4" /> },
  ];

  // Sample stages with automation actions - now using action IDs for referencing
  const [stages, setStages] = useState([
    {
      id: 1,
      title: 'New Leads',
      color: '#0066CC',
      count: 15,
      conversion: {
        rate: 85,
        moved: 85,
        total: 100
      },
      actions: [
        'send-email',
        'linkedin-connect',
        'add-crm',
        'schedule-call'
      ]
    },
    {
      id: 2,
      title: 'Contacted',
      color: '#4A4A4A',
      count: 35,
      conversion: {
        rate: 59,
        moved: 50,
        total: 85
      },
      actions: [
        'follow-up',
        'linkedin-connect',
        'calendar-invite'
      ]
    },
    {
      id: 3,
      title: 'Meeting Set',
      color: '#F26B3A',
      count: 40,
      conversion: {
        rate: 20,
        moved: 10,
        total: 50
      },
      actions: [
        'set-reminder',
        'send-email',
        'calendar-invite'
      ]
    },
    {
      id: 4,
      title: 'Negotiation',
      color: '#1E1E2D',
      count: 9,
      conversion: {
        rate: 10,
        moved: 1,
        total: 10
      },
      actions: [
        'send-proposal',
        'follow-up',
        'pricing-quote'
      ]
    }
  ]);

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
  const handleExistingActionDragStart = (e: React.DragEvent<HTMLDivElement>, stageId: number, index: number) => {
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

  // Handle drag over on a potential drop position
  const handleDragOverPosition = (stageId: number, index: number) => {
    setDropTarget({ stageId, index });
  };

  // Handle drag leave
  const handleDragLeave = () => {
    setDropTarget(null);
  };

  // Filter actions based on search term
  const filteredActionLibrary = actionLibrary.filter(action =>
    action.name.toLowerCase().includes(actionSearch.toLowerCase())
  );

  // Handle drag over on drop zone
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
    e.dataTransfer.dropEffect = 'move';
  };


// Update the handleDrop function with these fixes:
const handleDrop = (e: React.DragEvent, stageId: number, index: number = -1) => {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  setDropTarget(null);

  // If we're dragging a new action from the library
  if (draggedAction) {
    console.log("\ndraggedAction\n")
    setStages(prevStages =>
      prevStages.map(stage => {
        if (stage.id === stageId) {
          const newActions = [...stage.actions];

          // Only add the action once, either at the specific index or at the end
          // This is the critical fix for Bug 1
          console.log("\ndraggedAction index", index)

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
    setDraggedExistingAction(null);
  }
  // If we're reordering an existing action
  else if (draggedExistingAction) {
    const { stageId: sourceStageId, index: sourceIndex } = draggedExistingAction;

    // Don't do anything if dropping in the same position
    if (sourceStageId === stageId && (
        (sourceIndex === index) ||
        (sourceIndex === index - 1)
    )) {
      setDraggedExistingAction(null);
      return;
    }

    setStages(prevStages => {
      // Create a new copy of the stages array
      const newStages = JSON.parse(JSON.stringify(prevStages));

      // Find the source and target stages
      const sourceStage = newStages.find((s: typeof prevStages[0]) => s.id === sourceStageId);
      const targetStage = newStages.find((s: typeof prevStages[0]) => s.id === stageId);

      if (sourceStage && targetStage) {
        // Get the action we're moving
        const actionToMove = sourceStage.actions[sourceIndex];

        // Remove from source
        sourceStage.actions = sourceStage.actions.filter((_: string, i: number) => i !== sourceIndex);

        // Add to target (same or different stage)
        if (index === -1) {
          // Add to end
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

  // Handle action removal
  const handleRemoveAction = (stageId: number, actionIndex: number) => {
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

  useEffect(() => {
    // Set the first stage as selected by default
    if (stages.length > 0 && selectedStage === null) {
      setSelectedStage(stages[0].id);
    }
  }, [stages, selectedStage]);

  useEffect(() => {
    // This will now respond to the state change from onMouseDown
    const showDropSpaces = draggedAction !== null || draggedExistingAction !== null;

    // You could also add a CSS class to the root element to control this globally
    if (showDropSpaces) {
      document.body.classList.add('dragging-active');
    } else {
      document.body.classList.remove('dragging-active');
    }

    return () => {
      document.body.classList.remove('dragging-active');
    };
  }, [draggedAction, draggedExistingAction]);


  const tooltipStyle = "bg-gray-800 text-white border-blue-800";
  const tooltipStyleArrow = "fill-gray-800";

  return (
    <TooltipProvider delayDuration={500}>
      <div className="flex h-screen bg-gray-50">
        {/* Left Sidebar - Pipeline Stages */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Pipeline Stages</h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="p-1 hover:bg-gray-100 rounded-full"

                  >
                    <PlusCircle className="w-5 h-5 text-blue-600" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className={tooltipStyle}>
                  <TooltipArrow className={tooltipStyleArrow} />
                  <p>Add new pipeline stage</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">5,606 total leads</p>
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
            {stages.map(stage => (
              <div
                key={stage.id}
                className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                  selectedStage === stage.id ? 'bg-blue-50' : ''
                }`}
                onClick={(e) => { e.stopPropagation(); setSelectedStage(stage.id); }}
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
                          <Play className="w-4 h-4" />
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
                        <span>{stage.conversion.rate}% convert</span>
                        <Info className="w-3 h-3 text-gray-400" />
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

                {/* Detailed conversion tooltip */}
                {showAutomation && (
                  <div className="mt-2 text-xs text-gray-500">
                    {stage.conversion.moved.toLocaleString()} / {stage.conversion.total.toLocaleString()} moved forward
                  </div>
                )}

                {/* Progress bar */}
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
            ))}
          </div>

          {/* Quick Actions */}
          <div className="p-4 border-t border-gray-200">
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md flex items-center gap-2">
                  <Settings2 className="w-4 h-4" />
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
                  <Search className="w-4 h-4 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
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
                      <Workflow className="w-5 h-5" />
                      {stage.title} Automation
                    </h2>

                    {/* Action sequence - Now with action library items and reordering */}
                    <div className="space-y-3 relative">
                      {/* First drop position */}
                      {(draggedAction !== null || draggedExistingAction !== null) && (
                        <div
                          className={`h-2 my-1 rounded-full flex justify-center items-center transition-all ${dropTarget?.stageId === stage.id && dropTarget?.index === 0
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
                            <PlusSquare className="w-5 h-5 text-blue-500" />
                          )}
                        </div>
                      )}

                      {stage.actions.map((actionId, idx) => {
                        // Find the action details from the library
                        const actionDetails = actionLibrary.find(a => a.id === actionId);

                        return (
                          <React.Fragment key={idx}>
                            <div
                              className={`bg-white p-4 rounded-lg border border-gray-200 flex items-center gap-3 group cursor-grab ${draggedExistingAction?.stageId === stage.id && draggedExistingAction?.index === idx ? 'being-dragged' : ''
                                }`}
                              draggable={true}
                              onMouseDown={() => {
                                // Pre-set the dragged state on mouse down, before drag actually starts
                                // This helps avoid the need for a second click
                                setDraggedExistingAction({ stageId: stage.id, index: idx });
                              }}
                              onDragStart={(e) => {
                                // Stop any click propagation that might interfere
                                e.stopPropagation();

                                // Create custom drag image
                                const draggedItem = e.currentTarget;
                                const dragImage = draggedItem.cloneNode(true) as HTMLElement;
                                dragImage.style.width = `${draggedItem.offsetWidth}px`;
                                dragImage.style.position = 'absolute';
                                dragImage.style.top = '-1000px';
                                dragImage.style.opacity = '0.8';
                                document.body.appendChild(dragImage);
                                e.dataTransfer.setDragImage(dragImage, 20, 20);

                                // Clean up the temporary element
                                setTimeout(() => {
                                  document.body.removeChild(dragImage);
                                }, 0);

                                // Set drag properties
                                e.dataTransfer.effectAllowed = 'move';
                              }}
                              onDragEnd={() => {
                                // Clean up state when drag ends
                                setDropTarget(null);
                              }}
                            >
                              <GripHorizontal className="w-4 h-4 text-gray-400 cursor-grab" />

                              {actionDetails?.icon && (
                                <div className="p-1 bg-blue-50 text-blue-600 rounded">
                                  {actionDetails.icon}
                                </div>
                              )}

                              <span>{actionDetails?.name || actionId}</span>

                              {/* If not the last item, show arrow down */}
                              {idx < stage.actions.length - 1 && (
                                <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 z-10">
                                  <ArrowRight className="w-4 h-4 text-gray-400 transform rotate-90" />
                                </div>
                              )}

                              {/* Delete button - appears on hover */}
                              <button
                                className="ml-auto opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-red-500 rounded-full transition-opacity"
                                onClick={(e) => { e.stopPropagation(); handleRemoveAction(stage.id, idx); }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Drop position after this action */}
                            {(draggedAction !== null || draggedExistingAction !== null) && (
                              <div
                                className={`h-2 my-1 rounded-full flex justify-center items-center transition-all ${dropTarget?.stageId === stage.id && dropTarget?.index === idx + 1
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
                                  <PlusSquare className="w-5 h-5 text-blue-500" />
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
                          e.stopPropagation(); // Stop event from bubbling up
                          handleDrop(e, stage.id, -1);
                        }}
                      >
                        <PlusCircle className="w-4 h-4" />
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
                    <h1 className="text-xl font-semibold">
                      {selectedStage ?
                        stages.find(s => s.id === selectedStage)?.title :
                        'All Leads'
                      }
                    </h1>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                          <RefreshCw className="w-4 h-4" />
                          Refresh
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className={tooltipStyle}>
                        <TooltipArrow className={tooltipStyleArrow} />
                        <p>Refresh lead data</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className={`px-3 py-1 text-sm rounded ${
                            viewMode === 'table' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
                          }`}
                          onClick={(e) => { e.stopPropagation(); setViewMode('table'); }}
                        >
                          Table
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className={tooltipStyle}>
                        <TooltipArrow className={tooltipStyleArrow} />
                        <p>View leads in table format</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className={`px-3 py-1 text-sm rounded ${
                            viewMode === 'cards' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
                          }`}
                          onClick={(e) => { e.stopPropagation(); setViewMode('cards'); }}

                        >
                          Cards
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className={tooltipStyle}>
                        <TooltipArrow className={tooltipStyleArrow} />
                        <p>View leads in card format</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search leads..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md"
                    />
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="px-4 py-2 border border-gray-200 rounded-md flex items-center gap-2 hover:bg-gray-50">
                        <Filter className="w-4 h-4" />
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
                        <SortAsc className="w-4 h-4" />
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
                      {Array.from({ length: 20 }).map((_, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-400" />
                              <span>John Smith</span>
                            </div>
                          </td>
                          <td className="p-3">Acme Corp</td>
                          <td className="p-3">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                                  Active
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className={tooltipStyle}>
                                <TooltipArrow className={tooltipStyleArrow} />
                                <p>Lead is actively engaged</p>
                              </TooltipContent>
                            </Tooltip>
                          </td>
                          <td className="p-3 text-sm text-gray-500">2h ago</td>
                          <td className="p-3">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>85%</span>
                              </TooltipTrigger>
                              <TooltipContent className={tooltipStyle}>
                                <TooltipArrow className={tooltipStyleArrow} />
                                <p>Lead quality score - high potential</p>
                              </TooltipContent>
                            </Tooltip>
                          </td>
                          <td className="p-3">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="text-gray-400 hover:text-gray-600">
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className={tooltipStyle}>
                                <TooltipArrow className={tooltipStyleArrow} />
                                <p>More options</p>
                              </TooltipContent>
                            </Tooltip>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* In real app, use react-window or react-virtualized */}
                    {Array.from({ length: 20 }).map((_, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">John Smith</span>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="text-gray-400 hover:text-gray-600">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className={tooltipStyle}>
                              <TooltipArrow className={tooltipStyleArrow} />
                              <p>More options</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">Acme Corp</p>
                        <div className="mt-4 flex items-center justify-between text-sm">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
                                Active
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className={tooltipStyle}>
                              <TooltipArrow className={tooltipStyleArrow} />
                              <p>Lead is actively engaged</p>
                            </TooltipContent>
                          </Tooltip>
                          <span className="text-gray-500">2h ago</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer with Pagination */}
              <div className="bg-white border-t border-gray-200 p-4 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing 1-20 of {selectedStage ?
                    stages.find(s => s.id === selectedStage)?.count :
                    '5,606'} leads
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

export default IntegratedPipelineDashboard;