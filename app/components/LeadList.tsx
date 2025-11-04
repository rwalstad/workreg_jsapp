// app/components/SimpleLeadList.tsx
'use client';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
    Card, CardContent
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Avatar, AvatarImage, AvatarFallback
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useActions } from 'actionsContext';
import { LeadFormData } from '@/app/lib/api';
import LeadForm from './LeadForm';
import LeadFilters, { FilterState } from './LeadFilters';

// Define view options
type ViewMode = 'table' | 'cards';

// Define lead status option type
interface LeadStatusOption {
    value: string;
    label: string;
    color: string;
}

export interface SimpleLeadListProps {
    refetchLeads: (callback: () => Promise<void>) => void;
    onEdit: (leadId: string) => void;
    onCancel: () => void;
    editingLeadId: string | null;
    isNewLead: boolean;
    onViewStages: (lead: LeadFormData) => void;
    initialFilters: {
        leadOwner: string | null;
        status?: string | null;
        stageId?: string | null;
        isActive?: boolean;
        isNew?: boolean;
    };
    hidePipelineFilter?: boolean
}

export default function LeadList({
    refetchLeads,
    onEdit,
    onCancel,
    editingLeadId,
    isNewLead,
    onViewStages,
    initialFilters,
    hidePipelineFilter = false // default to false, which means we will show the pipeline filter
}: SimpleLeadListProps) {
    const [leads, setLeads] = useState<LeadFormData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
    const [filters, setFilters] = useState<FilterState>({
        leadOwners: initialFilters.leadOwner ? [initialFilters.leadOwner] : [],
        pipelines: [],
        statuses: initialFilters.status ? [initialFilters.status] : [],
        createdDateFrom: null,
        createdDateTo: null,
        valueMin: null,
        valueMax: null,
        searchTerm: ''
    });
    const [leadOwners, setLeadOwners] = useState<Array<{ id: string, name: string }>>([]);
    const [pipelines, setPipelines] = useState<Array<{ id: string, name: string }>>([]);
    // Replace static leadStatusOptions with state
    const [leadStatusOptions, setLeadStatusOptions] = useState<LeadStatusOption[]>([]);
    const { getIcon } = useActions();

    // Fetch lead statuses from the API
    useEffect(() => {
        const fetchLeadStatuses = async () => {
            try {
                const response = await fetch('/api/lead-statuses');
                if (response.ok) {
                    const statusData = await response.json();
                    setLeadStatusOptions(statusData);
                } else {
                    console.error('Failed to fetch lead statuses');
                }
            } catch (error) {
                console.error('Error fetching lead statuses:', error);
            }
        };

        fetchLeadStatuses();
    }, []);

    // Fetch lead owners and pipelines data
    useEffect(() => {
        const fetchFilterData = async () => {
            try {
                // Fetch lead owners
                const ownersResponse = await fetch('api/account/user');
                if (ownersResponse.ok) {
                    const ownersData = await ownersResponse.json();
                    setLeadOwners(ownersData.map((user: any) => ({
                        id: user.id,
                        name: `${user.fname} ${user.lname}`
                    })));
                }

                // Fetch pipelines
                const pipelinesResponse = await fetch('/api/pipeline');
                if (pipelinesResponse.ok) {
                    const pipelinesData = await pipelinesResponse.json();
                    setPipelines(pipelinesData.map((pipeline: any) => ({
                        id: pipeline.id,
                        name: pipeline.name
                    })));
                }
            } catch (error) {
                console.error('Error fetching filter data:', error);
            }
        };

        fetchFilterData();
    }, []);

    // Define the fetch function
    const fetchLeads = async () => {
        setLoading(true);
        setError(null);

        try {
            // Build URL with query parameters for filters
            let url = '/api/leads';
            const queryParams = new URLSearchParams();

            // Apply leadOwners filter (multiple)
            if (filters.leadOwners.length > 0) {
                filters.leadOwners.forEach(owner => {
                    queryParams.append('leadOwners[]', owner);
                });
            } else if (initialFilters.leadOwner) {
                // Fall back to initial filter if no specific selection
                queryParams.append('leadOwner', initialFilters.leadOwner);
            }

            // Apply pipelines filter (multiple)
            if (filters.pipelines.length > 0) {
                filters.pipelines.forEach(pipeline => {
                    queryParams.append('pipelines[]', pipeline);
                });
            }

            // Apply statuses filter (multiple)
            if (filters.statuses.length > 0) {
                filters.statuses.forEach(status => {
                    queryParams.append('statuses[]', status);
                });
            } else if (initialFilters.status) {
                // Fall back to initial filter if no specific selection
                queryParams.append('status', initialFilters.status);
            }

            // Apply pipeline stage filter
            if (initialFilters.stageId) {
                queryParams.append('stageId', initialFilters.stageId);
            }

            // Apply date range filters
            if (filters.createdDateFrom) {
                queryParams.append('createdFrom', filters.createdDateFrom.toISOString());
            }

            if (filters.createdDateTo) {
                // Add one day to include the entire day
                const endDate = new Date(filters.createdDateTo);
                endDate.setDate(endDate.getDate() + 1);
                queryParams.append('createdTo', endDate.toISOString());
            }

            // Apply value range filters
            if (filters.valueMin !== null) {
                queryParams.append('valueMin', filters.valueMin.toString());
            }

            if (filters.valueMax !== null) {
                queryParams.append('valueMax', filters.valueMax.toString());
            }

            // Apply any other initial filters
            if (initialFilters.isActive) {
                queryParams.append('isActive', 'true');
            }

            if (initialFilters.isNew) {
                queryParams.append('isNew', 'true');
            }

            if (queryParams.toString()) {
                url += `?${queryParams.toString()}`;
            }

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Failed to fetch leads: ${response.statusText}`);
            }

            const data = await response.json();

            // Check if the response is an error object (could be an empty array which is valid)
            if (data && typeof data === 'object' && 'error' in data) {
                throw new Error(data.error || 'Error fetching leads');
            }

            // Ensure data is an array
            if (!Array.isArray(data)) {
                console.error("API did not return an array of leads:", data);
                setLeads([]);
            } else {
                console.log("Leads fetched successfully:", data.length);
                setLeads(data);
            }
        } catch (error: any) {
            console.error('Error fetching leads:', error);
            setError(error.message || 'Failed to fetch leads');
            // Set leads to empty array in case of error
            setLeads([]);
        } finally {
            setLoading(false);
        }
    };

    // Register the fetch function once on mount
    useEffect(() => {
        // Register the function with the parent
        refetchLeads(fetchLeads);

        // Initial fetch
        fetchLeads();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [/* Remove filters, initialFilters from here */]); // Only run on mount

    // Instead, create a separate useEffect for running fetchLeads when filters change:
    useEffect(() => {
        if (!isMounting.current) {
            fetchLeads();
        } else {
            isMounting.current = false;
        }
    }, [filters, initialFilters]);

    // Add this at the top of your component:
    const isMounting = useRef(true);

    // Status display helper
    const getStatusBadge = (statusId: string | undefined) => {
        if (!statusId) return null;

        const status = leadStatusOptions.find(s => s.value === statusId) ||
            { label: 'Unknown', color: 'bg-gray-100 text-gray-800 border-gray-200' };

        return (
            <Badge className={`${status.color} font-normal pl-1 pr-1`}>
                {status.label}
            </Badge>
        );
    };

    // Filter leads based on search term
    const filteredLeads = useMemo(() => {
        if (!filters.searchTerm.trim()) return leads;

        const term = filters.searchTerm.toLowerCase();
        return leads.filter(lead =>
            (lead.fname?.toLowerCase().includes(term) || false) ||
            (lead.lname?.toLowerCase().includes(term) || false) ||
            (lead.email?.toLowerCase().includes(term) || false) ||
            (lead.phone?.toLowerCase().includes(term) || false)
        );
    }, [leads, filters.searchTerm]);

    // Handle filter changes
    const handleFilterChange = (newFilters: FilterState) => {
        setFilters(newFilters);
    };

    // Handle delete lead
    const handleDeleteLead = async (leadId: string) => {
        if (!window.confirm('Are you sure you want to delete this lead?')) {
            return;
        }

        try {
            const response = await fetch(`/api/leads?id=${leadId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete lead');
            }

            // Remove lead from state
            setLeads(leads.filter(lead => lead.id !== leadId));
            console.log('Lead deleted successfully');
        } catch (err: any) {
            console.error('Error deleting lead:', err);
            setError(err.message || 'Failed to delete lead');
        }
    };

    // Handle selection logic
    const handleToggleSelectAll = () => {
        if (selectedLeadIds.length === filteredLeads.length) {
            setSelectedLeadIds([]);
        } else {
            const allIds = filteredLeads.map(lead => lead.id || '').filter(id => id !== '');
            setSelectedLeadIds(allIds);
        }
    };

    const handleToggleSelect = (leadId: string) => {
        setSelectedLeadIds(prev => {
            if (prev.includes(leadId)) {
                return prev.filter(id => id !== leadId);
            } else {
                return [...prev, leadId];
            }
        });
    };

    // Display initials for avatar fallback
    const getInitials = (fname?: string, lname?: string) => {
        if (!fname && !lname) return '?';

        const f = fname ? fname.charAt(0).toUpperCase() : '';
        const l = lname ? lname.charAt(0).toUpperCase() : '';

        return `${f}${l}`;
    };

    // Render pipeline stages display
    const renderPipelineStages = (lead: LeadFormData) => {
        const stageCount = Number(lead.count_stages) || 0;

        if (stageCount === 0) {
            return <span className="text-gray-400 text-sm">No stages</span>;
        }

        return (
            <button
                onClick={() => onViewStages(lead)}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
            >
                {getIcon('layers', 'w-3.5 h-3.5')}
                <span className="text-xs">{stageCount} {stageCount === 1 ? 'stage' : 'stages'}</span>
            </button>
        );
    };

    // Lead edit form
    const renderEditForm = () => {
        const currentLead = leads.find(lead => lead.id === editingLeadId);

        return (
            <div className="bg-white rounded-lg border shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold">
                        {isNewLead ? 'Create New Lead' : 'Edit Lead'}
                    </h3>
                    <Button variant="ghost" size="icon" onClick={onCancel}>
                        {getIcon('x', 'h-5 w-5')}
                    </Button>
                </div>

                <LeadForm
                    lead={currentLead}
                    onSave={() => {
                        fetchLeads();
                        onCancel();
                    }}
                    onCancel={onCancel}
                    leadStatusOptions={leadStatusOptions}
                />
            </div>
        );
    };

    // Render table view
    const renderTableView = () => {
        return (
            <div className="overflow-auto border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-10">
                                <Checkbox
                                    checked={filteredLeads.length > 0 && selectedLeadIds.length === filteredLeads.length}
                                    onCheckedChange={handleToggleSelectAll}
                                />
                            </TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Stages</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8">
                                    <div className="flex justify-center items-center">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                                        <span>Loading leads...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredLeads.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8">
                                    <div className="flex flex-col items-center gap-2 text-gray-500">
                                        {getIcon('inbox', 'w-12 h-12 text-gray-300 mb-2')}
                                        <p className="font-medium">No leads found</p>
                                        {hidePipelineFilter ? (
                                            // Warn user that inactive leads are by default hidden in pipeline view
                                            <p className="font-medium italic">Note: Inactive leads are hidden here in the pipeline view. Inactive leads are those marked with status Unresponsive, Closed/Lost, Not Qualified and Do Not Cotnact</p>
                                        ) : (
                                            null
                                        )}
                                        <p className="text-sm">{filters.searchTerm ? 'Try a different search term' : 'Create your first lead to get started'}</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredLeads.map(lead => (
                                <TableRow key={lead.id} className={selectedLeadIds.includes(lead.id || '') ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                                    <TableCell>
                                        {lead.id && (
                                            <Checkbox
                                                checked={selectedLeadIds.includes(lead.id)}
                                                onCheckedChange={() => handleToggleSelect(lead.id || '')}
                                            />
                                        )}
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage
                                                    src={lead.linkedin_profile_photo || undefined}
                                                    alt={`${lead.fname} ${lead.lname}`}
                                                />
                                                <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                                                    {getInitials(lead.fname, lead.lname)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-medium">
                                                    {lead.fname} {lead.lname}
                                                </div>
                                                {lead.linkedin_handle && (
                                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                                        {getIcon('linkedin', 'w-3 h-3')}
                                                        {lead.linkedin_handle}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        {lead.email ? (
                                            <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">
                                                {lead.email}
                                            </a>
                                        ) : (
                                            <span className="text-gray-400">—</span>
                                        )}
                                    </TableCell>

                                    <TableCell>
                                        {lead.phone ? (
                                            <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">
                                                {lead.phone}
                                            </a>
                                        ) : (
                                            <span className="text-gray-400">—</span>
                                        )}
                                    </TableCell>

                                    <TableCell>
                                        {getStatusBadge(lead.status)}
                                    </TableCell>

                                    <TableCell>
                                        {lead.sales_value ? (
                                            <div className="font-medium">
                                                ${Number(lead.sales_value).toLocaleString()}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">—</span>
                                        )}
                                    </TableCell>

                                    <TableCell>
                                        {renderPipelineStages(lead)}
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={() => lead.id && onEdit(lead.id)}
                                            >
                                                {getIcon('pencil', 'h-4 w-4 text-blue-600')}
                                            </Button>

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={() => lead.id && handleDeleteLead(lead.id)}
                                            >
                                                {getIcon('trash', 'h-4 w-4 text-red-600')}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        );
    };

    // Render card view
    const renderCardView = () => {
        if (loading) {
            return (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-2"></div>
                    <span>Loading leads...</span>
                </div>
            );
        }

        if (filteredLeads.length === 0) {
            return (
                <div className="text-center py-16 border rounded-lg bg-white">
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                        {getIcon('inbox', 'w-16 h-16 text-gray-300 mb-2')}
                        <p className="text-xl font-medium">No leads found</p>
                        <p>{filters.searchTerm ? 'Try a different search term' : 'Create your first lead to get started'}</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLeads.map(lead => (
                    <Card
                        key={lead.id}
                        className={`overflow-hidden ${selectedLeadIds.includes(lead.id || '') ? 'border-blue-500 ring-1 ring-blue-500' : 'hover:border-gray-300'}`}
                    >
                        <CardContent className="p-0">
                            {/* Card Header with Avatar and Checkbox */}
                            <div className="p-4 flex items-start justify-between border-b">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage
                                            src={lead.linkedin_profile_photo || undefined}
                                            alt={`${lead.fname} ${lead.lname}`}
                                        />
                                        <AvatarFallback className="bg-blue-100 text-blue-700">
                                            {getInitials(lead.fname, lead.lname)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="font-medium text-lg">
                                            {lead.fname} {lead.lname}
                                        </div>
                                        {lead.linkedin_handle && (
                                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                                {getIcon('linkedin', 'w-3 h-3')}
                                                {lead.linkedin_handle}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <Checkbox
                                    checked={selectedLeadIds.includes(lead.id || '')}
                                    onCheckedChange={() => lead.id && handleToggleSelect(lead.id)}
                                />
                            </div>

                            {/* Card Body */}
                            <div className="p-4 space-y-3">
                                {/* Contact Info */}
                                <div className="space-y-1">
                                    {lead.email && (
                                        <div className="flex items-center gap-2 text-sm">
                                            {getIcon('mail', 'w-4 h-4 text-gray-500')}
                                            <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">
                                                {lead.email}
                                            </a>
                                        </div>
                                    )}

                                    {lead.phone && (
                                        <div className="flex items-center gap-2 text-sm">
                                            {getIcon('phone', 'w-4 h-4 text-gray-500')}
                                            <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">
                                                {lead.phone}
                                            </a>
                                        </div>
                                    )}
                                </div>

                                {/* Status and Value */}
                                <div className="flex items-center justify-between">
                                    <div>{getStatusBadge(lead.status)}</div>

                                    {lead.sales_value && (
                                        <div className="font-medium text-green-700">
                                            ${Number(lead.sales_value).toLocaleString()}
                                        </div>
                                    )}
                                </div>

                                {/* Pipeline Stages */}
                                <div className="flex items-center justify-between pt-2">
                                    <div>
                                        {renderPipelineStages(lead)}
                                    </div>
                                </div>
                            </div>

                            {/* Card Footer with Actions */}
                            <div className="bg-gray-50 p-3 flex items-center justify-between border-t">
                                <div className="text-xs text-gray-500">
                                    Lead ID: {lead.id}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => lead.id && onEdit(lead.id)}
                                    >
                                        {getIcon('pencil', 'h-4 w-4 text-blue-600')}
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => lead.id && handleDeleteLead(lead.id)}
                                    >
                                        {getIcon('trash', 'h-4 w-4 text-red-600')}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    };

    // Render the component UI
    if (editingLeadId) {
        return renderEditForm();
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <LeadFilters
                leadOwners={leadOwners}
                pipelines={pipelines}
                leadStatuses={leadStatusOptions}
                onFilterChange={handleFilterChange}
                initialFilters={{
                    leadOwners: initialFilters.leadOwner ? [initialFilters.leadOwner] : [],
                    pipelines: [],
                    statuses: initialFilters.status ? [initialFilters.status] : [],
                    createdDateFrom: null,
                    createdDateTo: null,
                    valueMin: null,
                    valueMax: null,
                    searchTerm: ''
                }}
                hidePipelineFilter={hidePipelineFilter || (initialFilters.stageId !== null && initialFilters.stageId !== undefined)} // Hide when stageId is provided. The Pipeline View will pass a stageid to this component, and thus we hide the pipeline filter
            />

            {/* View toggle and action buttons */}
            <div className="flex flex-col sm:flex-row justify-end items-center gap-4">
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className={viewMode === 'table' ? 'bg-blue-50 text-blue-700' : ''}
                        onClick={() => setViewMode('table')}
                    >
                        {getIcon('list', 'w-4 h-4 mr-2')}
                        Table
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        className={viewMode === 'cards' ? 'bg-blue-50 text-blue-700' : ''}
                        onClick={() => setViewMode('cards')}
                    >
                        {getIcon('grid', 'w-4 h-4 mr-2')}
                        Cards
                    </Button>

                    <Button
                        variant="outline"
                        onClick={fetchLeads}
                    >
                        {getIcon('refresh-cw', 'w-4 h-4 mr-2')}
                        Refresh
                    </Button>

                    <Button
                        variant="default"
                        className="bg-blue-600 text-white"
                        onClick={() => onEdit('0')}
                    >
                        {getIcon('plus-circle', 'w-4 h-4 mr-2')}
                        Add Lead
                    </Button>
                </div>
            </div>

            {/* Error message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-4">
                    <div className="flex items-center">
                        {getIcon('alert-circle', 'w-5 h-5 text-red-500 mr-2')}
                        <span>{error}</span>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 text-red-700"
                        onClick={() => {
                            setError(null);
                            fetchLeads();
                        }}
                    >
                        Retry
                    </Button>
                </div>
            )}

            {/* Lead list content */}
            <div className="bg-white rounded-lg border p-4">
                {viewMode === 'table' ? renderTableView() : renderCardView()}

                {filteredLeads.length > 0 && (
                    <div className="mt-4 text-sm text-gray-500">
                        Showing {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}
                    </div>
                )}
            </div>

            {/* Bulk actions bar */}
            {selectedLeadIds.length > 0 && (
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-lg border border-gray-200 px-4 py-2 flex items-center gap-3">
                    <span className="font-medium">{selectedLeadIds.length} selected</span>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedLeadIds([])}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                            if (window.confirm(`Delete ${selectedLeadIds.length} leads?`)) {
                                // Implement bulk delete
                                Promise.all(
                                    selectedLeadIds.map(id =>
                                        fetch(`/api/leads?id=${id}`, { method: 'DELETE' })
                                    )
                                ).then(() => {
                                    fetchLeads();
                                    setSelectedLeadIds([]);
                                });
                            }
                        }}
                    >
                        {getIcon('trash', 'w-4 h-4 mr-1')}
                        Delete
                    </Button>
                </div>
            )}
        </div>
    );
}