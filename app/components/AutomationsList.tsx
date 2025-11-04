'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { useActions } from 'actionsContext';

interface Automation {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  stageId: string;
  stageName: string;
  pipelineId: string;
  pipelineName: string;
  leadCount: number;
  completedCount: number;
  createdAt: Date;
  error?: string;
}

/**
 * Component to display and manage a list of running automations
 */
const AutomationsList: React.FC = () => {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getIcon } = useActions();

  const fetchAutomations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/automations');

      if (!response.ok) {
        throw new Error('Failed to fetch automations');
      }

      const data = await response.json();
      setAutomations(data);
    } catch (err) {
      console.error('Error fetching automations:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopAutomation = async (automationId: string) => {
    try {
      // This endpoint needs to be implemented
      const response = await fetch(`/api/automations/${automationId}/stop`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to stop automation');
      }

      // Refresh the list
      fetchAutomations();
    } catch (err) {
      console.error('Error stopping automation:', err);
      setError(err instanceof Error ? err.message : 'Failed to stop automation');
    }
  };

  useEffect(() => {
    fetchAutomations();

    // Set up polling to refresh data
    const intervalId = setInterval(fetchAutomations, 30000); // Every 30 seconds

    return () => clearInterval(intervalId);
  }, []);

  const getStatusBadge = (status: Automation['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 pl-1 pr-1">Pending</Badge>;
      case 'running':
        return <Badge variant="outline" className="bg-blue-50   text-blue-700   border-blue-200   pl-1 pr-1"><i className="fa fa-spinner fa-spin" aria-hidden="true"></i> Running</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50  text-green-700  border-green-200  pl-1 pr-1"> { getIcon("check", "w-4 h-4 inline") } Completed</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-50    text-red-700    border-red-200    pl-1 pr-1">Failed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50    text-red-700    border-red-200    pl-1 pr-1">Cancelled</Badge>;
      default:
        return null;
    }
  };

  if (isLoading && automations.length === 0) {
    return (
      <div className="flex justify-center items-center p-8">
        { getIcon("loader", "w-6 h-6 text-blue-600 animate-spin mr-2") }
        <p>Loading automations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
        <div className="flex items-center mb-2">
          { getIcon("alert-circle", "w-4 h-4 mr-2") }
          <h3 className="font-medium mb-0">Error loading automations</h3>
        </div>
        <p className="text-sm">{error}</p>
        <Button
          variant="outline"
          className="mt-2"
          onClick={fetchAutomations}
        >
          { getIcon("refresh", "w-4 h-4 mr-2 inline") }
          Retry
        </Button>
      </div>
    );
  }

  if (automations.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Automations</CardTitle>
          <CardDescription>
            View and manage your pipeline automations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            { getIcon("play", "w-12 h-12 mx-auto mb-4 text-gray-300") }
            <h3 className="text-lg font-medium mb-2">No Active Automations</h3>
            <p className="max-w-md mx-auto">
              You don&apos;t have any active automations. Go to a pipeline stage and click
              &quot;Run Automation&quot; to start processing leads.
            </p>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-4 flex justify-between">
          <Button
            variant="outline"
            onClick={fetchAutomations}
            className="text-sm"
          >
            { getIcon("refresh", "w-4 h-4 mr-2 inline") }
            Refresh
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold mb-0">Active Automations</h2>
        <Button
          variant="outline"
          onClick={fetchAutomations}
          className="text-sm"
        >
            { getIcon("refresh", "w-4 h-4 mr-2 inline")}
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {automations.map((automation) => (
          <Card key={automation.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start items-center">
                <div>
                  <CardTitle className="text-base">{automation.name}</CardTitle>
                </div>
                {getStatusBadge(automation.status)}
              </div>
              <CardDescription>
                {automation.pipelineName} &gt; {automation.stageName}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div>
                  <p className="font-medium">Leads</p>
                  <p>{automation.leadCount}</p>
                </div>
                <div>
                  <p className="font-medium">Completed</p>
                  <p>
                    {automation.completedCount}
                    {automation.leadCount > 0 && (
                      <span className="text-xs text-gray-500 ml-1">
                        ({Math.round((automation.completedCount / automation.leadCount) * 100)}%)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{
                    width: `${automation.leadCount > 0
                      ? Math.round((automation.completedCount / automation.leadCount) * 100)
                      : 0}%`
                  }}
                ></div>
              </div>

              <p className="text-xs text-gray-500">
                Started {formatDistanceToNow(new Date(automation.createdAt))} ago
              </p>

              {automation.error && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  {automation.error}
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t pt-3">
              {(automation.status === 'pending' || automation.status === 'running') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 w-full"
                  onClick={() => handleStopAutomation(automation.id)}
                >
                  { getIcon("stop", "w-4 h-4 mr-2 inline") }
                  Stop Automation
                </Button>
              )}

              {/* {automation.status === 'completed' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 w-full"
                  disabled
                >
                  { getIcon("check", "w-4 h-4 mr-2 inline") }
                  Completed
                </Button>
              )} */}

              {(automation.status === 'failed' || automation.status === 'cancelled')  && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 w-full"
                  onClick={fetchAutomations}
                >
                  { getIcon("play", "w-4 h-4 mr-2 inline") }
                  Retry Automation
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AutomationsList;