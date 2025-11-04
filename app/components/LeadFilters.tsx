'use client';

import React, { useState, useEffect } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  MultiSelect,
  MultiSelectItem
} from '@/components/ui/multi-select';
import {
  Card,
  CardContent
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Slider } from '@/components/ui/slider';
import { useActions } from 'actionsContext';
import { X } from 'lucide-react';
import styles from './ui-styles.module.css';

// Define filter options types
interface LeadOwner {
  id: string;
  name: string;
}

interface Pipeline {
  id: string;
  name: string;
}

interface LeadStatus {
  value: string;
  label: string;
  color: string;
}

export interface LeadFiltersProps {
  leadOwners: LeadOwner[];
  pipelines: Pipeline[];
  leadStatuses: LeadStatus[];
  onFilterChange: (filters: FilterState) => void;
  initialFilters?: Partial<FilterState>;
  hidePipelineFilter?: boolean;
}

export interface FilterState {
  leadOwners: string[];
  pipelines: string[];
  statuses: string[]; // Changed from single status to array of statuses
  createdDateFrom: Date | null | undefined;
  createdDateTo: Date | null | undefined;
  valueMin: number | null;
  valueMax: number | null;
  searchTerm: string;
}

const DEFAULT_FILTERS: FilterState = {
  leadOwners: [],
  pipelines: [],
  statuses: [], // Changed from single status to array
  createdDateFrom: null,
  createdDateTo: null,
  valueMin: null,
  valueMax: null,
  searchTerm: ''
};

export default function LeadFilters({
  leadOwners,
  pipelines,
  leadStatuses,
  onFilterChange,
  initialFilters = {},
  hidePipelineFilter = false // Default is to show the Pipeline filter
}: LeadFiltersProps) {
  // Initialize filters with default values merged with initial filters
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    ...initialFilters
  });

  // Track user-modified filters
  const [userModifiedFilters, setUserModifiedFilters] = useState<Set<string>>(new Set());

  // Track active filters count - only count filters the user has explicitly modified
  const activeFilterCount = Object.entries(filters).reduce((count, [key, value]) => {
    // Don't count searchTerm as a filter
    if (key === 'searchTerm') return count;

    // Only count this filter if the user has explicitly modified it
    if (!userModifiedFilters.has(key)) return count;

    // Count arrays with content
    if (Array.isArray(value) && value.length > 0) return count + 1;

    // Count non-null values
    if (value !== null) return count + 1;

    return count;
  }, 0);

  const { getIcon } = useActions();

  // When filters change, notify parent component
  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  // Helper to update a single filter
  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    // Mark this filter as user-modified
    setUserModifiedFilters(prev => {
      const newSet = new Set(prev);
      newSet.add(key as string);
      return newSet;
    });

    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({ ...DEFAULT_FILTERS, searchTerm: filters.searchTerm });
    // Clear the user-modified filters
    setUserModifiedFilters(new Set());
  };

  // Create a badge for each active filter
  const renderActiveFilters = () => {
    const badges = [];

    // Lead owners - only show badge if user has modified it
    if (filters.leadOwners.length > 0 && userModifiedFilters.has('leadOwners')) {
      badges.push(
        <Badge key="owners" variant="outline" className="flex items-center gap-1">
          {filters.leadOwners.length} Owner{filters.leadOwners.length !== 1 ? 's' : ''}
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0 ml-1"
            onClick={() => updateFilter('leadOwners', [])}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      );
    }

    // Pipelines - only show badge if user has modified it
    if (filters.pipelines.length > 0 && userModifiedFilters.has('pipelines')) {
      badges.push(
        <Badge key="pipelines" variant="outline" className="flex items-center gap-1">
          {filters.pipelines.length} Pipeline{filters.pipelines.length !== 1 ? 's' : ''}
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0 ml-1"
            onClick={() => updateFilter('pipelines', [])}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      );
    }

    // Statuses - only show badge if user has modified it
    if (filters.statuses.length > 0 && userModifiedFilters.has('statuses')) {
      badges.push(
        <Badge key="statuses" variant="outline" className="flex items-center gap-1">
          {filters.statuses.length} Status{filters.statuses.length !== 1 ? 'es' : ''}
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0 ml-1"
            onClick={() => updateFilter('statuses', [])}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      );
    }

    // Date range - only show badge if user has modified it
    if ((filters.createdDateFrom || filters.createdDateTo) &&
      (userModifiedFilters.has('createdDateFrom') || userModifiedFilters.has('createdDateTo'))) {
      const dateText = [];
      if (filters.createdDateFrom) {
        dateText.push(`From: ${filters.createdDateFrom.toLocaleDateString()}`);
      }
      if (filters.createdDateTo) {
        dateText.push(`To: ${filters.createdDateTo.toLocaleDateString()}`);
      }

      badges.push(
        <Badge key="dates" variant="outline" className="flex items-center gap-1">
          {dateText.join(' ')}
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0 ml-1"
            onClick={() => {
              updateFilter('createdDateFrom', null);
              updateFilter('createdDateTo', null);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      );
    }

    // Value range - only show badge if user has modified it
    if ((filters.valueMin !== null || filters.valueMax !== null) &&
      (userModifiedFilters.has('valueMin') || userModifiedFilters.has('valueMax'))) {
      const valueText = [];
      if (filters.valueMin !== null) {
        valueText.push(`Min: $${filters.valueMin.toLocaleString()}`);
      }
      if (filters.valueMax !== null) {
        valueText.push(`Max: $${filters.valueMax.toLocaleString()}`);
      }

      badges.push(
        <Badge key="value" variant="outline" className="flex items-center gap-1">
          {valueText.join(' ')}
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0 ml-1"
            onClick={() => {
              updateFilter('valueMin', null);
              updateFilter('valueMax', null);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      );
    }

    return badges;
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-64">
          <Input
            placeholder="Search leads..."
            value={filters.searchTerm}
            onChange={(e) => updateFilter('searchTerm', e.target.value)}
            className="pl-8"
          />
          <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400">
            {getIcon('search', 'w-4 h-4')}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                {getIcon('filter', 'w-4 h-4')}
                Filters
                {activeFilterCount > 0 && (
                  <Badge className="ml-1 bg-primary text-white h-5 w-5 p-0 flex items-center justify-center rounded-full">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className={`w-80 p-0 ${styles.whiteBg}`} align="end">
              <Card className={styles.whiteBg}>
                <CardContent className="p-4 space-y-4 bg-white">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Filters</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetFilters}
                      disabled={activeFilterCount === 0}
                    >
                      Reset all
                    </Button>
                  </div>

                  {/* Lead Owner Filter */}
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Lead Owner</p>
                    <MultiSelect
                      value={filters.leadOwners}
                      onChange={(value) => updateFilter('leadOwners', value)}
                      placeholder="Select owners..."
                    >
                      {leadOwners.map(owner => (
                        <MultiSelectItem key={owner.id} value={owner.id}>
                          {owner.name}
                        </MultiSelectItem>
                      ))}
                    </MultiSelect>
                  </div>

                  {/* Pipeline Filter */}
                  {!hidePipelineFilter && pipelines.length > 0 && (
                    <div className="space-y-1" data-testid="pipeline-filter">
                      <p className="text-sm font-medium">Pipeline</p>
                      <MultiSelect
                        value={filters.pipelines}
                        onChange={(value) => updateFilter('pipelines', value)}
                        placeholder="Select pipelines..."
                      >
                        {pipelines.map(pipeline => (
                          <MultiSelectItem key={pipeline.id} value={pipeline.id}>
                            {pipeline.name}
                          </MultiSelectItem>
                        ))}
                      </MultiSelect>
                    </div>
                  )}

                  {/* Status Filter */}
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Status</p>
                    <MultiSelect
                      value={filters.statuses}
                      onChange={(value) => updateFilter('statuses', value)}
                      placeholder="Select statuses..."
                    >
                      {leadStatuses.map(status => (
                        <MultiSelectItem key={status.value} value={status.value}>
                          {/* TODO: Show the color of the status
                              <div className={`${status.color} px-2 py-1 text-xs rounded-full flex items-center gap-1`}> </div>
                              <span className={h-2 w-2 rounded-full ${status.color}}></span>
                          */}
                            {status.label}
                        </MultiSelectItem>
                      ))}
                    </MultiSelect>
                  </div>

                  {/* Date Range Filter */}
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Created Date</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="justify-start text-left font-normal"
                            size="sm"
                          >
                            {filters.createdDateFrom ? (
                              filters.createdDateFrom.toLocaleDateString()
                            ) : (
                              <span className="text-muted-foreground">From date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className={`w-auto p-0 ${styles.whiteBg}`} align="start">
                          <Calendar
                            mode="single"
                            selected={filters.createdDateFrom || undefined}
                            onSelect={(date) => updateFilter('createdDateFrom', date)}
                            initialFocus
                            className={styles.whiteBg}
                          />
                        </PopoverContent>
                      </Popover>

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="justify-start text-left font-normal"
                            size="sm"
                          >
                            {filters.createdDateTo ? (
                              filters.createdDateTo.toLocaleDateString()
                            ) : (
                              <span className="text-muted-foreground">To date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className={`w-auto p-0 ${styles.whiteBg}`} align="start">
                          <Calendar
                            mode="single"
                            selected={filters.createdDateTo || undefined}
                            onSelect={(date) => updateFilter('createdDateTo', date)}
                            initialFocus
                            disabled={(date) =>
                              filters.createdDateFrom ? date < filters.createdDateFrom : false
                            }
                            className={styles.whiteBg}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Value Range Filter */}
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Lead Value</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Min value"
                        value={filters.valueMin !== null ? filters.valueMin : ''}
                        onChange={(e) => updateFilter('valueMin', e.target.value ? Number(e.target.value) : null)}
                        size={1}
                      />
                      <Input
                        type="number"
                        placeholder="Max value"
                        value={filters.valueMax !== null ? filters.valueMax : ''}
                        onChange={(e) => updateFilter('valueMax', e.target.value ? Number(e.target.value) : null)}
                        size={1}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={() => document.body.click()} // Close the popover
                    className="w-full text-white"
                  >
                    Apply Filters
                  </Button>
                </CardContent>
              </Card>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {renderActiveFilters()}

          {activeFilterCount > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={resetFilters}
            >
              Clear all
            </Button>
          )}
        </div>
      )}
    </div>
  );
}