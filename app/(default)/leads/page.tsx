'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useActions } from 'actionsContext';
import LeadList from '@/app/components/LeadList';
import PipelinesWithStages from '@/app/components/PipelinesWithStages';
import { LeadFormData } from '@/app/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function LeadsPage() {
  // State for lead management
  const [isNewLead, setIsNewLead] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadFormData | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [showStagesView, setShowStagesView] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');

  // Function reference for refreshing leads - not stored in state to avoid rerender cycle
  let refreshLeadsFunction: (() => Promise<void>) | null = null;

  // Get icons from actions context
  const { getIcon } = useActions();

  // Get session for user info
  const { data: session } = useSession();

  // Get the selected account from localStorage
  React.useEffect(() => {
    const storedAccountString = localStorage.getItem('selectedAccount');
    if (storedAccountString) {
      try {
        const parsedAccount = JSON.parse(storedAccountString);
        setSelectedAccount(parsedAccount.account_id);
      } catch (error) {
        console.error('Error parsing stored account:', error);
      }
    }
  }, []);

  // Register the refetch function - store reference, not in state
  const handleRefetchLeads = (fetchFunction: () => Promise<void>) => {
    console.log('Storing fetch function reference');
    refreshLeadsFunction = fetchFunction;
  };

  // Handle refreshing leads
  const handleRefreshLeads = () => {
    if (refreshLeadsFunction) {
      refreshLeadsFunction().then(() => {
        toast.success("Leads refreshed successfully");
      }).catch(() => {
        toast.error("Failed to refresh leads");
      });
    }
  };

  // Handle editing a lead
  const handleEditLead = (leadId: string) => {
    setIsNewLead(leadId === '0');
    setEditingLeadId(leadId);
    // Close stages view if open
    setShowStagesView(false);
  };

  // Handle canceling lead edit/creation
  const handleCancelEdit = () => {
    setEditingLeadId(null);
    setIsNewLead(false);
  };

  // Handle viewing lead pipeline stages
  const handleViewStages = (lead: LeadFormData) => {
    setSelectedLead(lead);
    setShowStagesView(true);
    // Close lead edit if open
    setEditingLeadId(null);
    setIsNewLead(false);
  };

  // Handle going back from stages view
  const handleBackFromStages = () => {
    setShowStagesView(false);
    // toast.success("Returned to leads view");
  };

  // Determine filter settings based on active tab
  const getFilterSettings = () => {
    switch (activeTab) {
      case 'all':
        return {
          leadOwner: null // Show all leads
        };
      case 'active':
        return {
          leadOwner: null,
          isActive: true // Filter for active leads
        };
      case 'new':
        return {
          leadOwner: null,
          isNew: true // Filter for new leads
        };
      case 'mine':
        return {
          leadOwner: session?.user?.id?.toString() || null // Filter for current user's leads
        };
      default:
        return {
          leadOwner: null
        };
    }
  };

  // Render pipeline stages full width
  const renderPipelineStages = () => {
    return (
      <div className="bg-white rounded-lg border shadow-lg">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            {getIcon('git-branch', 'h-5 w-5 text-primary')}
            Pipeline Stages for {selectedLead?.fname} {selectedLead?.lname}
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={handleBackFromStages}
            >
              {getIcon('arrow-left', 'h-4 w-4')}
              Back to Leads
            </Button>
            <Button variant="ghost" size="icon" onClick={handleBackFromStages}>
              {getIcon('x', 'h-5 w-5')}
            </Button>
          </div>
        </div>

        <div className="p-6">
          {selectedLead && selectedAccount && (
            <PipelinesWithStages
              onViewStages={handleViewStages}
              accountId={selectedAccount}
              selectedLead={selectedLead}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-4 px-4">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-accent">Leads</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track all your leads in one place
          </p>
        </div>
      </div>

      {/* If editing lead or viewing stages, show those components */}
      {editingLeadId ? (
        // Show lead form when editing
        <div>
          {/* Content will be replaced by LeadForm via LeadList component's renderEditForm */}
          <LeadList
            refetchLeads={handleRefetchLeads}
            onEdit={handleEditLead}
            onCancel={handleCancelEdit}
            editingLeadId={editingLeadId}
            isNewLead={isNewLead}
            onViewStages={handleViewStages}
            initialFilters={getFilterSettings()}
          />
        </div>
      ) : showStagesView ? (
        // Show pipeline stages when viewing stages
        renderPipelineStages()
      ) : (
        // Otherwise show normal lead list with tabs
        <div>
          {/* Tabs for different lead views */}
          <Tabs defaultValue="all" className="mb-6" onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all" className="flex items-center gap-2">
                {getIcon('users', 'w-4 h-4')}
                All Leads
              </TabsTrigger>
              <TabsTrigger value="active" className="flex items-center gap-2">
                {getIcon('activity', 'w-4 h-4')}
                Active
              </TabsTrigger>
              <TabsTrigger value="new" className="flex items-center gap-2">
                {getIcon('plus-circle', 'w-4 h-4')}
                New
              </TabsTrigger>
              <TabsTrigger value="mine" className="flex items-center gap-2">
                {getIcon('user', 'w-4 h-4')}
                My Leads
              </TabsTrigger>
            </TabsList>

            {/* Tab Content */}
            <TabsContent value="all">
              <LeadList
                refetchLeads={handleRefetchLeads}
                onEdit={handleEditLead}
                onCancel={handleCancelEdit}
                editingLeadId={editingLeadId}
                isNewLead={isNewLead}
                onViewStages={handleViewStages}
                initialFilters={getFilterSettings()}
              />
            </TabsContent>

            <TabsContent value="active">
              <LeadList
                refetchLeads={handleRefetchLeads}
                onEdit={handleEditLead}
                onCancel={handleCancelEdit}
                editingLeadId={editingLeadId}
                isNewLead={isNewLead}
                onViewStages={handleViewStages}
                initialFilters={getFilterSettings()}
              />
            </TabsContent>

            <TabsContent value="new">
              <LeadList
                refetchLeads={handleRefetchLeads}
                onEdit={handleEditLead}
                onCancel={handleCancelEdit}
                editingLeadId={editingLeadId}
                isNewLead={isNewLead}
                onViewStages={handleViewStages}
                initialFilters={getFilterSettings()}
              />
            </TabsContent>

            <TabsContent value="mine">
              <LeadList
                refetchLeads={handleRefetchLeads}
                onEdit={handleEditLead}
                onCancel={handleCancelEdit}
                editingLeadId={editingLeadId}
                isNewLead={isNewLead}
                onViewStages={handleViewStages}
                initialFilters={getFilterSettings()}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}