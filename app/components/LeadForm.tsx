// app/components/LeadForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { transformSqlDataToFormData, transformFormDataToSqlData, LeadFormData } from '@/app/lib/api';
import { useActions } from 'actionsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';

// Interface for lead status options
interface LeadStatusOption {
  value: string;
  label: string;
  color: string;
}

interface LeadFormProps {
  lead?: LeadFormData;
  onSave: () => void;
  onCancel: () => void;
  leadStatusOptions: LeadStatusOption[];
}

const LeadForm: React.FC<LeadFormProps> = ({ lead, onSave, onCancel, leadStatusOptions }) => {
  const { getIcon } = useActions();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isNewLead = !lead?.id || lead.id === '0';

  // Initialize form data with lead data or empty values
  const [formData, setFormData] = useState<LeadFormData>({
    id: lead?.id || '0',
    fname: lead?.fname || '',
    lname: lead?.lname || '',
    email: lead?.email || '',
    phone: lead?.phone || '',
    status: lead?.status || '1', // Default to first status (usually Active)
    sales_value: lead?.sales_value || '',
    linkedin_profile: lead?.linkedin_profile || '',
    linkedin_profile_photo: lead?.linkedin_profile_photo || '',
    linkedin_handle: lead?.linkedin_handle || '',
    linkedin_unique_id: lead?.linkedin_unique_id || '',
    lead_owner: lead?.lead_owner || '',
    count_stages: lead?.count_stages || '0',
    lead_owner_name: lead?.lead_owner_name || ''
  });

  // Update form data when lead prop changes
  useEffect(() => {
    if (lead) {
      setFormData({
        id: lead.id || '0',
        fname: lead.fname || '',
        lname: lead.lname || '',
        email: lead.email || '',
        phone: lead.phone || '',
        status: lead.status || '1',
        sales_value: lead.sales_value || '',
        linkedin_profile: lead.linkedin_profile || '',
        linkedin_profile_photo: lead.linkedin_profile_photo || '',
        linkedin_handle: lead.linkedin_handle || '',
        linkedin_unique_id: lead.linkedin_unique_id || '',
        lead_owner: lead.lead_owner || '',
        count_stages: lead.count_stages || '0',
        lead_owner_name: lead.lead_owner_name || ''
      });
    }
  }, [lead]);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle select changes (like status dropdown)
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Save lead data
  const handleSave = async () => {
    // Validate required fields
    if (!formData.fname || !formData.lname || !formData.email) {
      toast.error('First name, last name, and email are required');
      return;
    }

    setIsSaving(true);
    try {
      const sqlData = transformFormDataToSqlData(formData);
      const serializedData = JSON.stringify(sqlData, (key, value) =>
        typeof value === "bigint" ? value.toString() : value
      );

      const response = await fetch('/api/leads', {
        method: isNewLead ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: serializedData,
      });

      if (!response.ok) {
        throw new Error('Failed to save lead');
      }

      const savedLead = await response.json();
      toast.success(isNewLead ? 'Lead created successfully' : 'Lead updated successfully');
      onSave(); // Call the callback from parent
    } catch (error) {
      console.error('Error saving lead:', error);
      toast.error('Failed to save lead');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete lead
  const handleDelete = async () => {
    if (!formData.id || formData.id === '0') return;

    if (!confirm('Are you sure you want to delete this lead?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/leads?id=${formData.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete lead');
      }

      toast.success('Lead deleted successfully');
      onSave(); // Refresh the lead list
      onCancel(); // Close the form
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error('Failed to delete lead');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Personal Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Personal Information</h3>

          <div className="space-y-2">
            <Label htmlFor="fname">First Name*</Label>
            <Input
              id="fname"
              name="fname"
              value={formData.fname}
              onChange={handleChange}
              placeholder="First Name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lname">Last Name*</Label>
            <Input
              id="lname"
              name="lname"
              value={formData.lname}
              onChange={handleChange}
              placeholder="Last Name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address*</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="email@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Phone Number"
            />
          </div>
        </div>

        {/* Lead Details Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Lead Details</h3>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status?.toString() || '1'}
              onValueChange={(value: string) => handleSelectChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                {leadStatusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${option.color.replace('text-', 'bg-')}`}></span>
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sales_value">Sales Value</Label>
            <Input
              id="sales_value"
              name="sales_value"
              type="number"
              value={formData.sales_value}
              onChange={handleChange}
              placeholder="0"
            />
          </div>

          {formData.lead_owner && (
            <div className="space-y-2">
              <Label htmlFor="lead_owner">Lead Owner</Label>
              <Input
                id="lead_owner"
                name="lead_owner"
                value={formData.lead_owner}
                readOnly
                className="bg-gray-100"
              />
            </div>
          )}
        </div>
      </div>

      {/* LinkedIn Information Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">LinkedIn Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="linkedin_profile">LinkedIn Profile URL</Label>
            <Input
              id="linkedin_profile"
              name="linkedin_profile"
              value={formData.linkedin_profile || ''}
              onChange={handleChange}
              placeholder="https://linkedin.com/in/username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin_handle">LinkedIn Handle</Label>
            <Input
              id="linkedin_handle"
              name="linkedin_handle"
              value={formData.linkedin_handle || ''}
              onChange={handleChange}
              placeholder="username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin_unique_id">LinkedIn ID</Label>
            <Input
              id="linkedin_unique_id"
              name="linkedin_unique_id"
              value={formData.linkedin_unique_id || ''}
              onChange={handleChange}
              placeholder="LinkedIn ID"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin_profile_photo">Profile Photo URL</Label>
            <Input
              id="linkedin_profile_photo"
              name="linkedin_profile_photo"
              value={formData.linkedin_profile_photo || ''}
              onChange={handleChange}
              placeholder="https://example.com/photo.jpg"
            />
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSaving || isDeleting}
        >
          {getIcon('x', 'w-4 h-4 mr-2')}
          Cancel
        </Button>

        {!isNewLead && (
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isSaving || isDeleting}
          >
            {isDeleting ? (
              <>
                <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                Deleting...
              </>
            ) : (
              <>
                {getIcon('trash', 'w-4 h-4 mr-2')}
                Delete
              </>
            )}
          </Button>
        )}

        <Button
          onClick={handleSave}
          disabled={isSaving || isDeleting}
          className='text-white'
        >
          {isSaving ? (
            <>
              <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
              Saving...
            </>
          ) : (
            <>
              {getIcon('save', 'w-4 h-4 mr-2')}
              {isNewLead ? 'Create Lead' : 'Save Changes'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default LeadForm;