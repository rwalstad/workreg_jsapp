//actionsContext.tsx
'use client';
import React, { createContext, useContext } from 'react';
import {
  AlertCircleIcon,
  Pencil, Search, Filter, SortAsc, MoreVertical, ChevronRight,
  ChevronDown, Users, Settings2, RefreshCw, Play,
  PlusCircle, GripHorizontal, Workflow, Info, Trash2,
  Mail, Calendar, FileText, UserCheck, UserPlus, PhoneCall,
  MessageSquare, Clock, DollarSign, ArrowRight, PlusSquare,
  ArrowDown,Save,Database,
  ArrowUp, CircleEllipsis, CircleStop, CheckIcon,
  LoaderIcon, HistoryIcon,
  StopCircle, AlertTriangle,
  Activity,
  User,
  ArrowLeft
} from 'lucide-react';

export interface IconAction {
  id: string;
  name: string;
  icon: React.ElementType; // Changed to ElementType for better typing
}

interface ActionsContextType {
  actionLibrary: IconAction[];
  getIcon: (id: string, className?: string) => React.ReactNode | null;
  renderIcon: (icon: string | React.ReactNode, className?: string) => React.ReactNode | null;
}

const ActionsContext = createContext<ActionsContextType | undefined>(undefined);

export const ActionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
const actionLibrary: IconAction[] = [
  { id: 'activity',         name: 'Activity',             icon: Activity      },
  { id: 'add-crm',          name: 'Add to CRM',           icon: UserCheck     },
  { id: 'alert-circle',     name: 'Alert Circle',         icon: AlertCircleIcon},
  { id: 'alert-triangle',   name: 'Alert Triangle',       icon: AlertTriangle },
  { id: 'arrow-down',       name: 'Arrow Down',           icon: ArrowDown     },
  { id: 'arrow-left',       name: 'Arrow Let',            icon: ArrowLeft     },
  { id: 'arrow-right',      name: 'Arrow Right',          icon: ArrowRight    },
  { id: 'arrow-up',         name: 'Arrow Up',             icon: ArrowUp       },
  { id: 'calendar',         name: 'Calendar',             icon: Calendar      },
  { id: 'calendar-invite',  name: 'Calendar Invite',      icon: Calendar      },
  { id: 'check',            name: 'Check',                icon: CheckIcon     },
  { id: 'chevron-down',     name: 'Chevron Down',         icon: ChevronDown   },
  { id: 'chevron-right',    name: 'Chevron Right',        icon: ChevronRight  },
  { id: 'circle-ellipsis',  name: 'Circle Ellipsis',      icon: CircleEllipsis},
  { id: 'circle-stop',      name: 'CircleStop',           icon: CircleStop    },
  { id: 'clock',            name: 'Clock',                icon: Clock         },
  { id: 'dollar-sign',      name: 'Dollar Sign',          icon: DollarSign    },
  { id: 'edit',             name: 'Edit',                 icon: Pencil        },
  { id: 'file-text',        name: 'File Text',            icon: FileText      },
  { id: 'filter',           name: 'Filter',               icon: Filter        },
  { id: 'follow-up',        name: 'Send Follow-up',       icon: MessageSquare },
  { id: 'grip-horizontal',  name: 'Grip Horizontal',      icon: GripHorizontal},
  { id: 'history',          name: 'History',              icon: HistoryIcon   },
  { id: 'info',             name: 'Information',          icon: Info          },
  { id: 'linkedin-connect', name: 'LinkedIn Connection',  icon: UserPlus      },
  { id: 'loader',           name: 'Loader',               icon: LoaderIcon    },
  { id: 'message-square',   name: 'Message Square',       icon: MessageSquare },
  { id: 'more-vertical',    name: 'More Options',         icon: MoreVertical  },
  { id: 'pencil',           name: 'Edit',                 icon: Pencil        },
  { id: 'phone-call',       name: 'Phone Call',           icon: PhoneCall     },
  { id: 'play',             name: 'Play',                 icon: Play          },
  { id: 'plus-circle',      name: 'Add',                  icon: PlusCircle    },
  { id: 'plus-square',      name: 'Plus Square',          icon: PlusSquare    },
  { id: 'pricing-quote',    name: 'Pricing Quote',        icon: DollarSign    },
  { id: 'refresh',          name: 'Refresh',              icon: RefreshCw     },
  { id: 'save',             name: 'Save',                 icon: Save          },
  { id: 'schedule-call',    name: 'Schedule Call',        icon: PhoneCall     },
  { id: 'search',           name: 'Search',               icon: Search        },
  { id: 'send-email',       name: 'Send Email',           icon: Mail          },
  { id: 'send-proposal',    name: 'Send Proposal',        icon: FileText      },
  { id: 'set-reminder',     name: 'Set Reminder',         icon: Clock         },
  { id: 'settings',         name: 'Settings',             icon: Settings2     },
  { id: 'sort-asc',         name: 'Sort Ascending',       icon: SortAsc       },
  { id: 'stop',             name: 'Stop',                 icon: StopCircle    },
  { id: 'storage',          name: 'Storage',              icon: Database      },
  { id: 'trash',            name: 'Delete',               icon: Trash2        },
  { id: 'user-check',       name: 'User Check',           icon: UserCheck     },
  { id: 'user-plus',        name: 'User Plus',            icon: UserPlus      },
  { id: 'user',             name: 'User',                 icon: User          },
  { id: 'users',            name: 'Users',                icon: Users         },
  { id: 'workflow',         name: 'Workflow',             icon: Workflow      },
];

  // Function to get a Luicide icon with custom className
  const getIcon = (id: string, className: string = "w-4 h-4"): React.ReactNode | null => {
    const action = actionLibrary.find(action => action.id === id);
    if (!action) return null;

    const IconComponent = action.icon;
    return <IconComponent className={className} />;
  };

  /**
   * Get an icon, either a Font Awesome or Luicide icon
   * @param icon Either a string, which can refer to a luicide icon or a font awesome icon, or a direct Luicide Component
   * @param className The class string to apply to the HTML element
   * @returns An HTML element with the icon
   */
  const renderIcon = (icon: string | React.ReactNode, className: string = "w-4 h-4") => {
    if (typeof icon === 'string') {
      if (icon.startsWith('fa')) {
        // For Font Awesome icons
        // Determine if the class already has a prefix (fa, fas, far, fab)
        // const hasPrefix = /^fa[srb]?\s/.test(icon);

        // Construct the full class string
        // const fullClass = hasPrefix ? icon : `${icon}`;
        const fullClass = icon

        return <i className={fullClass}></i>;
      } else {
        // For Lucide icons
        return getIcon(icon, className);
      }
    } else {
      // For direct component references
      return icon;
    }
  };

  return (
    <ActionsContext.Provider value={{ actionLibrary, getIcon, renderIcon }}>
      {children}
    </ActionsContext.Provider>
  );
};

export const useActions = (): ActionsContextType => {
  const context = useContext(ActionsContext);
  if (!context) {
    throw new Error("useActions must be used within an ActionsProvider");
  }
  return context;
};