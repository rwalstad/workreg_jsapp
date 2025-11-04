'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlayIcon, LoaderIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, TooltipArrow } from '@/components/ui/tooltip';

interface AutomationButtonProps {
  pipelineId: string;
  stageId: string;
  stageName: string;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  /**
   Compact Mode (when compact=true):
      Renders a smaller, icon-only button suitable for tight spaces like the pipeline stage headers
      Uses minimal styling with just an icon (the play button)
      Takes up less space and integrates better with the existing stage UI elements
      Shows information via tooltips rather than directly on the button
      Has smaller confirmation dialogs when needed

    Standard Mode (when compact=false or not specified):
      Renders a full-sized button with both icon and text ("Run Automation")
      Has a more prominent appearance suitable for dedicated automation panels or controls
      Shows more information directly on the button
      Takes up more space but offers better visibility and accessibility
   */
  compact?: boolean;
  tooltipStyle?: string,
  tooltipStyleArrow?: string
}

/**
 * Button component to trigger automation for a specific pipeline stage
 */
const AutomationButton: React.FC<AutomationButtonProps> = ({
  pipelineId,
  stageId,
  stageName,
  onSuccess,
  onError,
  compact = false, // Default to false for backward compatibility in older versions of Lead Maestro
  tooltipStyle = "",
  tooltipStyleArrow = ""
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [result, setResult] = useState<{
    status: string;
    number_of_leads: number;
    requires_confirmation?: boolean;
    existing_automation_id?: string;
  } | null>(null);

  const handleStartAutomation = async (force: boolean = false) => {
    try {
      setIsLoading(true);
      setResult(null);
      setNeedsConfirmation(false);

      const response = await fetch(`/api/pipeline/${pipelineId}/stages/${stageId}/automation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          platformId: 1, // Default platformId
          force: force
        })
      });

      const data = await response.json();

      setResult(data);

      if (response.ok) {
        if (data.requires_confirmation) {
          setNeedsConfirmation(true);
        } else {
          if (onSuccess) onSuccess(data);
        }
      } else {
        if (onError) onError(data);
      }
    } catch (error) {
      console.error('Error starting automation:', error);
      if (onError) onError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonColor = () => {
    if (isLoading) return 'bg-gray-400 hover:bg-gray-400';
    if (result && result.status.includes('No leads pending')) return 'bg-yellow-500 hover:bg-yellow-600';
    if (result && result.status.includes('Automation already exists')) return 'bg-orange-500 hover:bg-orange-600';
    if (result && result.status.includes('successfully')) return 'bg-green-500 hover:bg-green-600';
    return 'bg-blue-600 hover:bg-blue-700';
  };

  // Rendering for compact mode (used in pipeline builder)
  if (compact) {
    return (
      <TooltipProvider>
        {needsConfirmation ? (
          <div className="space-y-2 p-2 border border-yellow-200 bg-yellow-50 rounded-md text-xs">
            <p className="text-yellow-800">
              {result?.status || "Automation already running"}
            </p>
            <div className="flex space-x-1">
              <Button
                onClick={() => handleStartAutomation(true)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white h-6 text-xs py-0 px-2"
                size="sm"
              >
                Run Anyway
              </Button>
              <Button
                onClick={() => setNeedsConfirmation(false)}
                variant="outline"
                size="sm"
                className="h-6 text-xs py-0 px-2"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => handleStartAutomation(false)}
                disabled={isLoading}
                className="p-1 h-7 w-7 bg-transparent hover:bg-blue-100 text-blue-600"
                variant="ghost"
                size="sm"
              >
                {isLoading ? (
                  <LoaderIcon className="w-4 h-4 animate-spin" />
                ) : (
                  <PlayIcon className="w-4 h-4" />
                )}
                <span className="sr-only">Run Automation</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className={tooltipStyle + " max-w-xs p-2"}>
              <TooltipArrow className={tooltipStyleArrow} />
              <p>
                {result?.status || `Run automation for leads in the "${stageName}" stage`}
              </p>
              {result && result.number_of_leads && result.number_of_leads > 0 && (
                <p className="font-semibold mt-1">
                  {result.number_of_leads} leads will be processed
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
    );
  }

  // Original rendering for normal mode
  return (
    <TooltipProvider>
      {needsConfirmation ? (
        <div className="space-y-3 p-3 border border-yellow-200 bg-yellow-50 rounded-md">
          <p className="text-sm text-yellow-800">
            {result?.status || "You already have an automation running for this platform."}
          </p>
          <div className="flex space-x-2">
            <Button
              onClick={() => handleStartAutomation(true)}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
              size="sm"
            >
              Run Anyway
            </Button>
            <Button
              onClick={() => setNeedsConfirmation(false)}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => handleStartAutomation(false)}
              disabled={isLoading}
              className={`${getButtonColor()} text-white font-medium rounded-md py-2 px-4 transition-colors duration-200`}
            >
              {isLoading ? (
                <LoaderIcon className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <PlayIcon className="w-5 h-5 mr-2" />
              )}
              {isLoading ? 'Processing...' : 'Run Automation'}
            </Button>
          </TooltipTrigger>
          <TooltipContent className={tooltipStyle + " max-w-md p-2"}>
            <TooltipArrow className={tooltipStyleArrow} />
            <p>
              {result?.status || `Start automation for leads in the "${stageName}" stage that are due for follow-up`}
            </p>
            {result && result.number_of_leads && result.number_of_leads > 0 && (
              <p className="font-semibold mt-1">
                Number of leads: {result.number_of_leads}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      )}
    </TooltipProvider>
  );
};

export default AutomationButton;