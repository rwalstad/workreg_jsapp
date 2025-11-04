"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { PlusCircle, X } from "lucide-react";
import { toast } from "sonner";
import {PipelineData  } from   '@/types';
/*
    toast("Your action was successful!"); //simple toast.
    toast.success("Action completed successfully.");
    toast.error("There was an error.");
    toast.warning("Be careful!");
    toast.info("Here's some information.");

    //or with options:
    toast("Custom toast!", {
      description: "This is a custom toast message.",
      duration: 5000,
    });
*/

interface NewPipelineButtonProps {
  accountId: string;
  onPipelineCreated: (newPipeline: PipelineData) => void;
}
//export default function SimpleNewPipelineModal({ accountId, onPipelineCreated = () => {} }: SimpleNewPipelineProps) {
export default function NewPipelineButton({ accountId, onPipelineCreated = () => {} }: NewPipelineButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pipelineName, setPipelineName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  // Close on escape key
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!pipelineName.trim()) {
      setError('Pipeline name cannot be empty');
      toast.error("Pipeline name cannot be empty.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch('/api/pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: pipelineName,
          accountId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create pipeline');
      }

      setSuccess('Pipeline created !');
      setPipelineName('');
      const newPipeline = await response.json();
      console.log("81: Pipeline returned from sql; ",newPipeline);
      toast.success(`Pipeline "${newPipeline.name}" created successfully. (ID: ${newPipeline.id})`);
      // Call the callback function with the new pipeline data
     
      onPipelineCreated(newPipeline);
      // FIXME: Refresh the page data after a short delay
      setTimeout(() => {
        router.refresh(); //not updating the cards
        // The router.refresh() method is primarily designed for server-side updates and may not always
        // trigger a re-render of client-side components.
        setIsOpen(false);
        setSuccess('');
      }, 1500);

    } catch (error: any) {
      setError(error.message || 'Failed to create pipeline');
      toast.error(error.message || 'Failed to create pipeline');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
      >
        <PlusCircle className="w-5 h-5" />
        New Pipeline
      </Button>

      {/* Simple modal overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
            {/* Close button */}
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-semibold mb-1">Create New Pipeline</h2>
            <p className="text-gray-500 mb-4">Enter a name for your new pipeline.</p>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="pipeline-name" className="text-right">
                    Name
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="pipeline-name"
                      value={pipelineName}
                      onChange={(e) => setPipelineName(e.target.value)}
                      placeholder="My Sales Pipeline"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Error message */}
                {error && (
                  <div className="text-red-600 text-sm p-2 bg-red-50 rounded">
                    {error}
                  </div>
                )}

                {/* Success message */}
                {success && (
                  <div className="text-green-600 text-sm p-2 bg-green-50 rounded">
                    {success}
                  </div>
                )}

                <div className="flex justify-end gap-2 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isSubmitting ? "Creating..." : "Create Pipeline"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}