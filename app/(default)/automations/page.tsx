'use client';

import { useState } from 'react';
import AutomationsList from '@/app/components/AutomationsList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useActions } from 'actionsContext';

/**
 * Automations Dashboard Page
 * Displays active and completed automations
 */
export default function AutomationsPage() {
  const { getIcon } = useActions();

  const [activeTab, setActiveTab] = useState('active');

  return (
    <div className="container mx-auto py-8 px-4">
      <Tabs defaultValue="active" onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex justify-start">
          <TabsTrigger value="active" className="flex items-center">
            { getIcon("play", "w-4 h-4 mr-2" )}
            Active Automations
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center">
          { getIcon("history", "w-4 h-4 mr-2" )}
            Automation History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <AutomationsList />
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Automation History</CardTitle>
              <CardDescription>
                View a history of all completed automations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-8 text-gray-500">
                Automation history will be implemented in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}