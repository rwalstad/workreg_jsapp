'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { availablePlaceholders } from '@/app/lib/placeholderDefinitions';
import { useActions } from 'actionsContext';

interface PlaceholderReferenceProps {
  onPlaceholderClick: (placeholder: string) => void;
}

const PlaceholderReference: React.FC<PlaceholderReferenceProps> = ({ onPlaceholderClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { getIcon } = useActions();

  // Filter placeholders based on search term
  const filteredPlaceholders = availablePlaceholders.filter(placeholder => {
    return placeholder.placeholder.toLowerCase().includes(searchTerm.toLowerCase()) ||
           placeholder.description.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-sm font-medium mb-2">Available Placeholders</h3>
      <p className="text-xs text-gray-600 mb-5">
        Tip: Click on a placeholder to insert it at your cursor position in the message.
        All placeholders will be replaced with actual data when messages are sent.
      </p>

      <div className="mb-3 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {getIcon("search", "w-4 h-4 text-gray-400")}
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
          placeholder="Search placeholders..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="overflow-y-auto flex-grow">
        {filteredPlaceholders.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <p>No placeholders match your search</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredPlaceholders.map((placeholder, index) => (
              <div
                key={`placeholder-${index}`}
                className="border border-gray-200 rounded p-2 hover:bg-gray-50 cursor-pointer"
                onClick={() => onPlaceholderClick(placeholder.placeholder)}
              >
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-blue-600">{placeholder.placeholder}</p>
                  <p className="text-xs text-gray-600">{placeholder.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaceholderReference;