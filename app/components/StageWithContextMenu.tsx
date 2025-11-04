import React, { useEffect, useRef, useState } from 'react';
import { ChromePicker, ColorResult } from 'react-color';
import { useActions } from 'actionsContext';
import AutomationButton from './AutomationButton';
import { toast } from "sonner"

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TooltipArrow,
} from "@/components/ui/tooltip";

import { StageDataWactions } from '@/types';

// Define prop types for the component
interface StageWithContextMenuProps {
  stage: StageDataWactions;
  index: number;
  totalStages: number;
  selectedStage: StageDataWactions | null;
  handleStageSelect: (stage: StageDataWactions) => void;
  handleStageDragStart: (e: React.DragEvent<HTMLDivElement>, stage: StageDataWactions) => void;
  cleanupStageDragState: () => void;
  handleEditStage: (stageId: string) => void;
  handleDeleteStage: (stageId: string) => void;
  handleMoveStage: (fromIndex: number, toIndex: number) => void;
  showAutomation: boolean;
  tooltipStyle: string;
  tooltipStyleArrow: string;
  onColorChange: (stageId: string, newColor: string) => void;
  pipelineId: string;
}

const StageWithContextMenu: React.FC<StageWithContextMenuProps> = ({
  stage,
  index,
  totalStages,
  selectedStage,
  handleStageSelect,
  handleStageDragStart,
  cleanupStageDragState,
  handleEditStage,
  handleDeleteStage,
  handleMoveStage,
  showAutomation,
  tooltipStyle,
  tooltipStyleArrow,
  onColorChange,
  pipelineId
}) => {
  // Get icon rendering function from context
  const { getIcon, renderIcon } = useActions();

  const [colorPickerOpen, setColorPickerOpen] = useState<boolean>(false);
  const [colorPickerStageId, setColorPickerStageId] = useState<string | null>(null);
  const [colorPickerPosition, setColorPickerPosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 });

  const stageRef = useRef<HTMLDivElement>(null);

  /* Function to programmatically open context menu */
  const openContextMenu = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering stage selection

    // Blur the button to help dismiss any tooltips
    (e.currentTarget as HTMLButtonElement).blur();

    // Create and dispatch a custom contextmenu event
    if (stageRef.current) {
      const rect = stageRef.current.getBoundingClientRect();
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: rect.right, // Position near the button
        clientY: rect.top + 20
      });

      stageRef.current.dispatchEvent(event);
    }
  };

  return (
    <div
      className={`stage-container mb-2 ${selectedStage?.id === stage.id ? 'selected bg-blue-50' : ''}`}
      style={{
        ['--stage-color' as string]: `#${stage.color && stage.color.trim() || '0066CC'}`
      }}
    >
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={stageRef}
            onClick={() => handleStageSelect(stage)}
            className="w-full p-3 text-left cursor-pointer rounded-md transition-colors group hover:bg-gray-50"
            draggable={true}
            onDragStart={(e) => handleStageDragStart(e, stage)}
            onDragEnd={cleanupStageDragState}
            data-stage-id={stage.id}
          >
            {/* Name and play button */}
            <div className="flex justify-between items-center">
              {/* Show the name of this stage, with the stage color in front of it */}
              <div className="flex items-center">
                {/* A drag handle that appears on hover */}
                <span className="mr-2 text-gray-400 opacity-0 group-hover:opacity-100 cursor-grab">
                  {getIcon('grip-vertical', 'w-4 h-4')}
                </span>

                {/* A colored dot for visual identification of the stage */}
                <div
                  className="w-3 h-3 mr-[5px] rounded-full stage-title cursor-pointer"
                  style={{ backgroundColor: "#" + (stage.color && stage.color.trim()) || '0066CC' }}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent the stage selection when clicking the color dot
                    setColorPickerStageId(stage.id);
                    setColorPickerOpen(true);
                    setColorPickerPosition({
                      x: e.clientX,
                      y: e.clientY
                    });
                  }}
                />

                {/* The name of this stage */}
                <span className="font-medium ml-2">{stage.title}</span>
              </div>

              <div className='flex items-center flex-row'>
                {/* Menu button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="p-1 hover:bg-blue-100 rounded"
                      onClick={openContextMenu}
                    >
                      {getIcon('circle-ellipsis')}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className={tooltipStyle}>
                    <TooltipArrow className={tooltipStyleArrow} />
                    <p>Open menu</p>
                  </TooltipContent>
                </Tooltip>

                {/* Show a play button to allow user to run the automation for this step */}
                {!showAutomation && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <AutomationButton
                      pipelineId={pipelineId}
                      stageId={stage.id}
                      stageName={stage.title}
                      compact={true}
                      tooltipStyle={tooltipStyle}
                      tooltipStyleArrow={tooltipStyleArrow}
                      onSuccess={(data) => {
                        console.log('Automation triggered successfully:', data);
                        // Show success toast notification
                        if (data.number_of_leads > 0) {
                          toast.success(`Automation started`, {
                            description: `Processing ${data.number_of_leads} leads in "${stage.title}" stage`,
                            duration: 10000,
                            action: {
                              label: 'View',
                              onClick: () => window.location.href = '/automations' // Navigate to automations page
                            }
                          });

                          //  Automatically create a new window which opens the SoMe platform that the automation is configured for
                          if (data.url != "") {
                            const windowName = '_blank';
                            const windowFeatures = 'width=800,height=600,resizable=yes,scrollbars=yes';
                            window.open(data.url, windowName, windowFeatures);
                          }
                        } else {
                          toast.info(data.status || 'No leads to process');
                        }
                      }}
                      onError={(error) => {
                        console.error('Error triggering automation:', error);
                        // Show error toast notification
                        toast.error('Failed to start automation', {
                          description: error.message || error.error || 'An unexpected error occurred',
                          duration: 8000
                        });
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">
                {stage.count} leads
              </span>
              <span className="text-blue-600 text-sm">
                {stage.actions.length} actions
              </span>
            </div>

            {/* Progress bar for the conversion rate */}
            <div className="mt-2 h-1 bg-gray-100 rounded-full">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${stage.conversion.rate}%`,
                  backgroundColor: "#" + (stage.color && stage.color.trim()) || '0066CC'
                }}
              />
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48 bg-white">  {/* TODO: instead of setting bg-white, use the global CSS */}
          {index > 0 && (
            <ContextMenuItem
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => handleMoveStage(index, index - 1)}
            >
              {getIcon('arrow-up', 'w-4 h-4')} Move Stage Up
            </ContextMenuItem>
          )}
          {index < totalStages - 1 && (
            <ContextMenuItem
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => handleMoveStage(index, index + 1)}
            >
              {getIcon('arrow-down', 'w-4 h-4')} Move Stage Down
            </ContextMenuItem>
          )}
          <ContextMenuItem
            className="flex items-center gap-2 cursor-pointer text-blue-600 focus:text-blue-600 focus:bg-blue-50"
            onClick={() => handleEditStage(stage.id)}
          >
            {getIcon('edit', 'w-4 h-4')} Edit stage title
          </ContextMenuItem>
          <ContextMenuItem
            className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
            onClick={() => handleDeleteStage(stage.id)}
          >
            {getIcon('trash', 'w-4 h-4')} Delete stage
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Color picker popup */}
      {colorPickerOpen && colorPickerStageId && (
        <div
          className="fixed z-50 shadow-lg"
          style={{
            left: colorPickerPosition.x,
            top: colorPickerPosition.y
          }}
        >
          <div
            className="fixed inset-0"
            onClick={() => setColorPickerOpen(false)}
          />
          <ChromePicker
            color={"#" + (stage.color && stage.color.trim()) || '0066CC'}
            onChange={(color: ColorResult) => {
              onColorChange(stage.id, color.hex.replace('#', ''));
            }}
            disableAlpha={true}
          />
        </div>
      )}

      <style jsx>{`
        .stage-container {
          position: relative;
        }

        .stage-container.selected::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background-color: var(--stage-color, #3b82f6); /* Uses the custom stage color with a fallback. The style attribute of the parent div in this component sets the stage-color value */
          border-top-left-radius: 0.375rem;
          border-bottom-left-radius: 0.375rem;
        }
    `}
      </style>
    </div>
  );
};

export default StageWithContextMenu;