'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MessageTemplateForm from '@/app/components/MessageTemplateForm';
import { useActions } from 'actionsContext';
import { tblMessageTemplate } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { toast } from "sonner";
import { useUnsavedChanges } from '@/app/context/unsavedChangesContext';

export default function MessageTemplatesPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<{ id: string; msg: string; createdAt?: Date; updatedAt?: Date }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getIcon } = useActions();
  const [currentSelectedMessage, setCurrentSelectedMessage] = useState<tblMessageTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'edit'>('list');

  // Access the unsaved changes context
  const { hasUnsavedChanges, confirmNavigation } = useUnsavedChanges();

  const fetchMessages = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/message_template');

      if (!response.ok) {
        throw new Error('Failed to fetch message templates');
      }

      const data = await response.json();
      setMessages(data.data ?? []);
    } catch (err) {
      console.error('Error fetching message templates:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);
  /*
  When useEffect is used with an empty dependency array ([]),
  it creates a side effect that runs exactly once after the
  component's initial render. This pattern is commonly used
  for initialization tasks that should only happen when a
  component first mounts to the DOM.

  Because the dependency array is empty ([]),
  React knows that this effect doesn't depend on any values from the component's props or state
  As a result, React will never re-run this effect on subsequent renders - it only executes once
  */

  // Safe navigation with unsaved changes check for template selection
  const handleSelectMessage = (msg: { id: string; msg: string }) => {
    if (hasUnsavedChanges) {
      confirmNavigation(() => {
        setCurrentSelectedMessage({ id: BigInt(msg.id), msg: msg.msg });
        setActiveTab('edit');
      });
    } else {
      setCurrentSelectedMessage({ id: BigInt(msg.id), msg: msg.msg });
      setActiveTab('edit');
    }
  };

  // Safe create new with unsaved changes check
  const handleCreateNew = () => {
    if (hasUnsavedChanges) {
      confirmNavigation(() => {
        setCurrentSelectedMessage(null);
        setActiveTab('edit');
      });
    } else {
      setCurrentSelectedMessage(null);
      setActiveTab('edit');
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this message template?')) {
      return;
    }

    try {
      const response = await fetch(`/api/message_template/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete message template');
      }

      // Refresh the list
      fetchMessages();
      toast.success("Message template deleted successfully");

      // If we're deleting the currently selected message, reset the selection
      if (currentSelectedMessage && currentSelectedMessage.id.toString() === id) {
        setCurrentSelectedMessage(null);
        setActiveTab('list');
      }
    } catch (err) {
      console.error('Error deleting message template:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete message template');
      toast.error("Failed to delete message template");
    }
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Message Templates</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchMessages}
            className="text-sm"
          >
            {getIcon("refresh", "w-4 h-4 mr-2 inline")}
            Refresh
          </Button>
          <Button
            onClick={handleCreateNew}
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white"
          >
            {getIcon("plus-circle", "w-4 h-4 mr-2 inline")}
            Create Template
          </Button>
        </div>
      </div>

      {/* Mobile tab selector - only visible on small screens */}
      <div className="md:hidden mb-4">
        <div className="flex rounded-md overflow-hidden border border-gray-200">
          <button
            className={`flex-1 py-2 px-4 ${activeTab === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
            onClick={() => {
              if (hasUnsavedChanges) {
                confirmNavigation(() => setActiveTab('list'));
              } else {
                setActiveTab('list');
              }
            }}
          >
            Templates List
          </button>
          <button
            className={`flex-1 py-2 px-4 ${activeTab === 'edit' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
            onClick={() => setActiveTab('edit')}
          >
            {currentSelectedMessage ? 'Edit Template' : 'New Template'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Message Templates List - Column 1 */}
        <div className={`${activeTab === 'list' ? 'block' : 'hidden md:block'}`}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Templates</CardTitle>
              <CardDescription>
                Manage your message templates
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4">
              {isLoading && messages.length === 0 ? (
                <div className="flex justify-center items-center p-8">
                  {getIcon("loader", "w-6 h-6 text-blue-600 animate-spin mr-2")}
                  <p>Loading templates...</p>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
                  <div className="flex items-center mb-2">
                    {getIcon("alert-circle", "w-4 h-4 mr-2")}
                    <h3 className="font-medium mb-0">Error loading templates</h3>
                  </div>
                  <p className="text-sm">{error}</p>
                  <Button
                    variant="outline"
                    className="mt-2"
                    onClick={fetchMessages}
                  >
                    {getIcon("refresh", "w-4 h-4 mr-2 inline")}
                    Retry
                  </Button>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {getIcon("message-square", "w-12 h-12 mx-auto mb-4 text-gray-300")}
                  <h3 className="text-lg font-medium mb-2">No Templates</h3>
                  <p className="max-w-md mx-auto">
                    You don&apos;t have any message templates. Create your first template to get started.
                  </p>
                  <Button
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleCreateNew}
                  >
                    {getIcon("plus", "w-4 h-4 mr-2 inline")}
                    Create Template
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {messages.map((msg) => (
                    <Card
                      key={msg.id}
                      className={`border ${currentSelectedMessage?.id.toString() === msg.id ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-400'} cursor-pointer transition-colors`}
                      onClick={() => handleSelectMessage(msg)}
                    >
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 mr-2">
                            <p className="text-sm font-medium line-clamp-2">{msg.msg}</p>
                            {msg.updatedAt && (
                              <p className="text-xs text-gray-500 mt-1">
                                Updated {formatDistanceToNow(new Date(msg.updatedAt))} ago
                              </p>
                            )}
                          </div>
                          <div className="flex">
                            <Badge className="ml-2 bg-blue-100 text-blue-800 border-blue-200">
                              Template
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="p-2 pt-0 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMessage(msg.id);
                          }}
                        >
                          {getIcon("trash", "w-4 h-4 ml-2")}
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Message Template Form - Columns 2-3 */}
        <div className={`md:col-span-2 ${activeTab === 'edit' ? 'block' : 'hidden md:block'}`}>
          <MessageTemplateForm
            selectedMessage={currentSelectedMessage}
            refreshMessages={fetchMessages}
          />
        </div>
      </div>
    </div>
  );
}