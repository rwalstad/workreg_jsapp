// app/lib/api.ts

//API routes are serverless functions that handle requests to specific endpoints.
// They are located in the pages/api directory (or app/[...]/route.js for app
// directory) and are automatically handled by Next.js.

import { fetchHistory } from "../utils/history";
import { AccountWithName } from '../../types';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from "jose";


export interface CustomSession  {
  user?: {
    id?: number;
    email?: string;
    fname?: string | null;
    lname?: string | null;
    accessLvl?: number;
    last_activity?: string | Date;
  };
}
let prisma: PrismaClient;

export interface LeadSQLData {
  id: bigint;
  fname: string | null;
  lname: string | null;
  email: string | null;
  phone: string | null;
  status: bigint | null;
  company_name?: string | null; // Add company name
  job_title?: string | null; // Add job title
  priority?: number | null; // Add priority field
  notes?: string | null; // Add notes field
  address?: string | null; // Add address fields
  city?: string | null;
  state?: string | null;
  country_name?: string | null;
  postcode?: string | null;
  lead_source_name?: string | null; // Add source information
};

export interface LeadFormData {
  id: string;
  fname: string;
  lname: string;
  email: string;
  phone: string;
  status: string;
  company_name?: string; // Add company name for search
  job_title?: string; // Add job title for search
  priority?: string; // Add priority field
  notes?: string; // Add notes field
  address?: string; // Add address fields
  city?: string;
  state?: string;
  country_name?: string;
  postcode?: string;

};

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!(global as any).prisma) {
    (global as any).prisma = new PrismaClient();
  }
  prisma = (global as any).prisma;
}

//to handle data to (sqlData: LeadSQLData): LeadFormData
// SQL Data to Form Data transformation
export const transformSqlDataToFormData = (sqlData: LeadSQLData): LeadFormData => {
  return {
    id: sqlData.id.toString(),
    fname: sqlData.fname || '',
    lname: sqlData.lname || '',
    email: sqlData.email || '',
    phone: sqlData.phone || '',
    status: sqlData.status !== null ? sqlData.status.toString() : '',
    company_name: sqlData.company_name || '',
    job_title: sqlData.job_title || '',
    priority: sqlData.priority !== null && sqlData.priority !== undefined ? sqlData.priority.toString() : '',
    notes: sqlData.notes || '',
    address: sqlData.address || '',
    city: sqlData.city || '',
    state: sqlData.state || '',
    country_name: sqlData.country_name || '',
    postcode: sqlData.postcode || '',
    
  };
};

// Form Data to SQL Data transformation
// To handle data to (Form: LeadFormData): LeadSQLData
export const transformFormDataToSqlData = (formData: LeadFormData): LeadSQLData => {
  return {
    id: BigInt(formData.id),
    fname: formData.fname || null,
    lname: formData.lname || null,
    email: formData.email || null,
    phone: formData.phone || null,
    status: formData.status ? BigInt(formData.status) : null,
    company_name: formData.company_name || null,
    job_title: formData.job_title || null,
    priority: formData.priority ? Number(formData.priority) : null,
    notes: formData.notes || null,
    address: formData.address || null,
    city: formData.city || null,
    state: formData.state || null,
    country_name: formData.country_name || null,
    postcode: formData.postcode || null,

  };
};


export const createEmptyLead = (): LeadSQLData => ({
  id: BigInt(0),
  fname: '',
  lname: '',
  email: '',
  phone: '',
  status: null,
  company_name: '',
  job_title: '',
  priority: 0,
  notes: '',
  address: '',
  city: '',
  state: '',
  country_name: '',
  postcode: '',

});

// Define the user response type
export type UserResponse = {
  id?: number | bigint;
  email?: string;
  fname?: string | null;
  lname?: string | null;
  created?: string | Date;
  access_level?: number;
  profile_picture?: string | null;
  password?: string | null;
  last_activity?: string | Date;
};
//store the user history
export type HistoryItemPath = 'Lead' | 'Pipeline' | 'Account';
export interface HistoryItem {
  id: string;
  path: HistoryItemPath;
  hDateTime: string;
  usrId: string;
}
// Update the tblAccount type to match the converted format we return
export interface FormattedAccount {
  id: string; // String version of BigInt
  name: string | null;
  subscription: string | null;
  created: Date;
  last_activity: Date;
}
// Interface for API responses (BigInt converted to string)
interface AccountWithNameSerialized {
  account_id: string; // ✅ String for JSON serialization
  access_level: number | null;
  tblAccount: { name: string | null };
}

//using prismabiblioteket to get data  ✅ 🔎  🆕 👉 ✅  💾  ❌  📋

export async function getUserById(user_id: string): Promise<UserResponse> {
  try {
    console.log('lib/API.ts: Fetching user data for usrId:', user_id);
    const response = await fetch(`/api/user?user_id=${user_id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user data: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("lib/API.ts returns this data to form:", data);
    return data; // Return the data directly as a single object
  } catch (error) {
    console.error("Error fetching user data:", error);
    return {}; // Return an empty object
  }
}
interface UserAccessedAccountData {
  user_id: bigint;
  access_level: number | null;
  tblUser: {
    fname: string | null;
    lname: string | null;
    email: string | null;
  } | null;
}
// Interface for API responses (BigInt converted to string)
interface AccountUserSerialized {
  user_id: string;
  access_level: string | null;
  tblUser: {
    fname: string | null;
    lname: string | null;
    email: string | null;
  } | null;
}


  /**
 * Fetches all leads that are in a specific pipeline,
 * with their stage information.
 *
 * @param pipelineId - The ID of the pipeline to fetch leads for
 * @returns An array of pipeline lead objects with lead and stage information
 */


// Check if a lead is already in a pipeline and get its stage
// Function 2: Check if a lead is already in a pipeline and get its stage



  /**
   * Add an action from a stage's sequence
   * Called when user clicks the trash icon on an action
   *
   * @param stageId - ID of the stage containing the action
   * @param currentActions - array of the actions to add and sort
   */
//AutomationAction
  export const handleAddAction = async (pipelineId: string, stageId: string, currentActions: { id: string, default_config: string }[]) => {
  // export const handleAddAction = async (pipelineId: string, stageId: string, currentActions: string[]) => {
//from button  handleAddAction(stage.id, stageActions);
    console.log("🎯 handleAddAction receiving : stageid",stageId, " using currentActions",currentActions);
    try {
      // Convert stageId to BigInt
      const pipelineStageId = BigInt(stageId);
      const sqlStageAction =
      {

      }
      console.log("439 api : handleAddAction - pipelineId: ", pipelineId);//app/api/account/[id]/access/route.ts
      const addUserAccountSQL = await fetch(`/api/pipeline/${pipelineId}/stages/${stageId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentActions }),
      });
      console.log("handleAddAction actionsToAdd : stageid",stageId, " using currentActions",currentActions);
    } catch (error) {
      console.error('Error updating actions:', error);
      throw error;
    }
  };
//formattedactions
  //   [
//     {
//         "id": "6",
//         "default_config": "{\"wait_before_start\": \"5\", \"skip_lead_on_error\": true, \"only_send_if_1st_message\": false, \"only_send_if_no_reply\": false, \"inmail_subject\": \"\", \"send_through_sales_nav\": false, \"message_template_id\": \"411274\"}"
//     },
//     {
//         "id": "7",
//         "default_config": "{\"wait_before_start\": \"5\", \"skip_lead_on_error\": false, \"member_pipeline_stage_id\": \"\"}"
//     },
//     {
//         "id": "2",
//         "default_config": "{\"wait_before_start\": \"5\", \"skip_lead_on_error\": true}"
//     }
// ]
  /**
   * Removes an action from a stage's sequence
   * Called when user clicks the trash icon on an action
   *
   * @param stageId - ID of the stage containing the action
   * @param actionIndex - Index of the action to remove
   */
  // const handleRemoveAction = (stageId: string, actionIndex: number) => {
  //   // Find the stage
  //   const stage = stagesState.find(s => s.id === stageId);
  //   if (!stage) {
  //     console.log("❌ Stage not found for deletion");
  //     return;
  //   }
  //   // Create a copy of the stage's actions
  //   const updatedActions = [...stage.actions];

  //   // Remove the action at the specified index
  //   updatedActions.splice(actionIndex, 1);

  //   console.log(`Removing action at index ${actionIndex} from stage ${stageId}`);

  //   // Map actions to objects for the saveStageActions function
  //   const stageActionItems = updatedActions
  //     .map(actionId => {
  //       const originalId = actionId.includes('_') ? actionId.split('_')[0] : actionId;
  //       const actionDetail = actionsLibrary.find(a => a.id === originalId);
  //       return actionDetail;
  //     })
  //     .filter(Boolean) as AutomationAction[];

  //   // Save the updated actions
  //   saveStageActions(stageId, stageActionItems);

  //   console.log("✅ Removed action");
  // };

  // // Filter library items based on search term
  // const filteredLibraryActions = actionsLibrary.filter(action =>
  //   action.name.toLowerCase().includes(searchTerm.toLowerCase())
  // );
