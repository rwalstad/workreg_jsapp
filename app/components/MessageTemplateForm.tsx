'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Check } from 'lucide-react';
import { tblMessageTemplate } from '@/types';
import PlaceholderReference from './PlaceholderReference';
import { useActions } from 'actionsContext';
import { useUnsavedChanges } from '@/app/context/unsavedChangesContext';

// Import the placeholder definitions from a shared location
import { availablePlaceholders } from '@/app/lib/placeholderDefinitions';

interface MessageTemplateFormProps {
  selectedMessage: tblMessageTemplate | null;
  refreshMessages: () => void;
  onFormStateChange?: (isDirty: boolean) => void;
}

interface FeedbackState {
  show: boolean;
  id: string | null;
  message?: string;
}

interface PlaceholderAnalysis {
  count: number;
  brokenCount: number;
  brokenPlaceholders: string[];
  unknownCount: number;
  unknownPlaceholders: string[];
}

export function MessageTemplateForm({ selectedMessage, refreshMessages }: MessageTemplateFormProps) {
  const [message, setMessage] = useState(selectedMessage?.msg || '');
  const [originalMessage, setOriginalMessage] = useState(selectedMessage?.msg || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState>({ show: false, id: null });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { getIcon } = useActions();
  const [placeholderAnalysis, setPlaceholderAnalysis] = useState<PlaceholderAnalysis>({
    count: 0,
    brokenCount: 0,
    brokenPlaceholders: [],
    unknownCount: 0,
    unknownPlaceholders: [],
  });

  // Access the unsaved changes context
  const { setUnsavedChanges } = useUnsavedChanges();

  // Create a unique ID for this form instance
  const formId = useRef(`message-template-form-${selectedMessage?.id || 'new'}`);

  // Update message and original message when selected message changes
  useEffect(() => {
    setMessage(selectedMessage?.msg || '');
    setOriginalMessage(selectedMessage?.msg || '');
    // Update the form ID when the selected message changes
    formId.current = `message-template-form-${selectedMessage?.id || 'new'}`;
  }, [selectedMessage]);

  // Check for unsaved changes and update context
  useEffect(() => {
    const isDirty = message !== originalMessage;

    // Update the unsaved changes context
    setUnsavedChanges(isDirty);

  }, [message, originalMessage, setUnsavedChanges]);

  // Analyze placeholders
  useEffect(() => {
    const analysis = analyzePlaceholders(message);
    setPlaceholderAnalysis(analysis);
  }, [message]);

  const onCancel = useCallback(() => {
    const isDirty = message !== originalMessage;

    if (isDirty) {
      if (confirm('You have unsaved changes. Are you sure you want to discard them?')) {
        setMessage(selectedMessage?.msg || '');
      }
    } else {
      setMessage(selectedMessage?.msg || '');
    }
  }, [selectedMessage, message, originalMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const replacer = (key: string, value: any): any =>
        typeof value === "bigint" ? value.toString() : value;

      let response;

      if (selectedMessage?.id) {
        // Update existing message - use the [id] route
        const body = JSON.stringify({ msg: message }, replacer);
        response = await fetch(`/api/message_template/${selectedMessage.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: body,
        });
      } else {
        // Create new message
        const body = JSON.stringify({ msg: message }, replacer);
        response = await fetch('/api/message_template', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: body,
        });
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save message template');
      }

      // Show success feedback
      setFeedback({
        show: true,
        id: result.data?.id || '',
        message: `Message template ${selectedMessage ? 'updated' : 'created'} successfully!`
      });

      // Update original message to match the current message (no longer has unsaved changes)
      setOriginalMessage(message);

      // Update the unsaved changes context
      setUnsavedChanges(false);

      refreshMessages(); // Update the parent component

      // Only reset form if it's a new template
      if (!selectedMessage) {
        setMessage('');
        setOriginalMessage('');
      }

      setTimeout(() => {
        setFeedback({ show: false, id: null });
      }, 5000);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || '');
      } else {
        setError('An unknown error occurred.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlaceholderClick = (placeholder: string) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      // Keep the brackets format from PlaceholderReference
      const insertText = placeholder;
      const newStart = start;
      const newEnd = end;

      // Replace selected text or insert at cursor position
      textarea.setRangeText(insertText, newStart, newEnd, 'end');

      // Update React state with the new value
      setMessage(textarea.value);

      // Calculate new cursor position
      const newCursorPos = newStart + insertText.length;

      // Schedule cursor update after state change
      setTimeout(() => {
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }, 0);
    }
  };

  const analyzePlaceholders = (text: string): PlaceholderAnalysis => {
    // Look for placeholders with square brackets [placeholder_name]
    const placeholderRegex = /\[[\w_]+\]/g;
    const matches = text.match(placeholderRegex) || [];

    // Extract the available placeholder values from the imported definitions
    const placeholderValues = availablePlaceholders.map(p => p.placeholder.toLowerCase());

    // Initialize result arrays
    const brokenPlaceholders:  string[] = [];
    const unknownPlaceholders: string[] = [];

    // Process each matched placeholder
    matches.forEach(match => {
      // Check if placeholder has at least one underscore
      const hasUnderscore = /_/.test(match);
      if (!hasUnderscore) {
        brokenPlaceholders.push(match);
        return; // Skip further processing for broken placeholders
      }

      // Check if the placeholder exists in our defined list
      const matchLowerCase = match.toLowerCase();
      if (!placeholderValues.includes(matchLowerCase)) {
        // Try to find a similar placeholder
        const cleanPlaceholder = match.replace(/[\[\]]/g, '').toLowerCase();
        const similarPlaceholder = availablePlaceholders.find(p => {
          const cleanAvailable = p.placeholder.replace(/[\[\]]/g, '').toLowerCase();
          return (
            cleanAvailable.includes(cleanPlaceholder) ||
            cleanPlaceholder.includes(cleanAvailable)
          );
        });

        // If we found a similar placeholder, it's likely a typo
        // Otherwise, it's a completely unknown placeholder
        if (!similarPlaceholder) {
          unknownPlaceholders.push(match);
        } else {
          brokenPlaceholders.push(match);
        }
      }
    });

    return {
      count: matches.length,
      brokenCount: brokenPlaceholders.length,
      brokenPlaceholders: brokenPlaceholders,
      unknownCount: unknownPlaceholders.length,
      unknownPlaceholders: unknownPlaceholders,
    };
  };

  // Determine if the form is dirty (has unsaved changes)
  const isDirty = message !== originalMessage;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{selectedMessage ? 'Edit Message Template' : 'Create Message Template'}</CardTitle>
            <CardDescription>
              Create and manage message templates with placeholders for personalized outreach
            </CardDescription>
          </div>
          {isDirty && (
            <Badge className="bg-amber-100 text-amber-800 border-amber-200">
              {getIcon("alert-triangle", "w-4 h-4 mr-1 inline")}
              Unsaved Changes
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {feedback.show && (
          <Alert className="mb-4 bg-green-50 border border-green-200 text-green-700">
            <Check className="h-4 w-4 inline" />
            <AlertDescription className='inline ml-3'>{feedback.message}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mb-4 bg-red-50 border border-red-200 text-red-700">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="col-span-3">
              <div className="space-y-4">
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    Message Content
                  </label>
                  <textarea
                    id="message"
                    className="w-full border border-gray-300 rounded-md p-3 focus:ring-blue-500 focus:border-blue-500 h-[300px]"
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your message template"
                    required
                    maxLength={255}
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">
                      {message.length} characters
                    </span>
                    <span className="text-xs text-gray-500">
                      Placeholders: {placeholderAnalysis.count}
                    </span>
                  </div>
                </div>

                {(placeholderAnalysis.brokenCount > 0 || placeholderAnalysis.unknownCount > 0) && (
                  <div className="space-y-2">
                    {placeholderAnalysis.brokenCount > 0 && (
                      <div className="p-2 bg-red-50 border border-red-200 rounded">
                        <p className="text-xs text-red-700 font-medium">
                          {getIcon("alert-circle", "w-4 h-4 mr-1 inline")}
                          {placeholderAnalysis.brokenCount} broken placeholder{ placeholderAnalysis.brokenCount > 1 ? "s" : ""}:
                        </p>
                        <ul className="list-disc list-inside text-xs text-red-700 ml-5 mt-1">
                          {placeholderAnalysis.brokenPlaceholders.map((bp, index) => (
                            <li key={index}>{bp}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {placeholderAnalysis.unknownCount > 0 && (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded">
                        <p className="text-xs text-amber-700 font-medium">
                          {getIcon("alert-triangle", "w-4 h-4 mr-1 inline")}
                          {placeholderAnalysis.unknownCount} unknown placeholder{ placeholderAnalysis.unknownCount > 1 ? "s" : ""}:
                        </p>
                        <ul className="list-disc list-inside text-xs text-amber-700 ml-5 mt-1">
                          {placeholderAnalysis.unknownPlaceholders.map((bp, index) => (
                            <li key={index}>{bp}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-2">
              <div className="border border-gray-200 rounded-md p-3 bg-gray-50 h-full">
                <PlaceholderReference onPlaceholderClick={handlePlaceholderClick} />
              </div>
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="border-t pt-4 flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {getIcon("x", "w-4 h-4 mr-2 inline")}
          Cancel
        </Button>
        <Button
          type="submit"
          onClick={handleSubmit}
          disabled={isSubmitting || !isDirty}
          className={isDirty ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-400"}
        >
          {isSubmitting ?
            <>{getIcon("loader", "w-4 h-4 mr-2 inline animate-spin")}Saving...</> :
            <>{getIcon("save", "w-4 h-4 mr-2 inline")}Save Message</>
          }
        </Button>
      </CardFooter>
    </Card>
  );
}

export default MessageTemplateForm;