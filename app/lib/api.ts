// app/lib/api.ts

//API routes are serverless functions that handle requests to specific endpoints.
// They are located in the pages/api directory (or app/[...]/route.js for app
// directory) and are automatically handled by Next.js.
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth';
import { PrismaClient } from '@prisma/client';
import Cookies from 'js-cookie';
import { Session } from 'next-auth';
import { AccountWithName,AutomationAction } from '@/types';

export interface CustomSession extends Session {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
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
  sales_value: number | null;
  linkedin_profile: string | null;
  linkedin_profile_photo: string | null;
  linkedin_handle: string | null;
  linkedin_unique_id: string | null;
  lead_owner: bigint | null;
  count_stages: bigint | null;
  tblUser?: { // Include user data for owner name
    id: bigint;
    fname: string | null;
    lname: string | null;
    email: string | null;
  } | null;
  created?: Date; // Add created date
  updated?: Date; // Add updated date
  company_name?: string | null; // Add company name
  job_title?: string | null; // Add job title
  priority?: number | null; // Add priority field
  notes?: string | null; // Add notes field
  profile_instagram?: string | null; // Add social profiles
  profile_facebook?: string | null;
  profile_twitter?: string | null;
  profile_whatsapp?: string | null;
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
  sales_value: string;
  linkedin_profile: string;
  linkedin_profile_photo: string;
  linkedin_handle: string;
  linkedin_unique_id: string;
  lead_owner: string;
  lead_owner_name?: string; // Add owner's name for display
  count_stages: string;
  created?: string; // Add created date for date filtering
  updated?: string; // Add updated date
  company_name?: string; // Add company name for search
  job_title?: string; // Add job title for search
  priority?: string; // Add priority field
  notes?: string; // Add notes field
  profile_instagram?: string; // Add social profiles
  profile_facebook?: string;
  profile_twitter?: string;
  profile_whatsapp?: string;
  address?: string; // Add address fields
  city?: string;
  state?: string;
  country_name?: string;
  postcode?: string;
  lead_source_name?: string; // Add source information
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
    sales_value: sqlData.sales_value !== null ? sqlData.sales_value.toString() : '',
    linkedin_profile: sqlData.linkedin_profile || '',
    linkedin_profile_photo: sqlData.linkedin_profile_photo || '',
    linkedin_handle: sqlData.linkedin_handle || '',
    linkedin_unique_id: sqlData.linkedin_unique_id || '',
    lead_owner: sqlData.lead_owner !== null ? sqlData.lead_owner.toString() : '',
    lead_owner_name: sqlData.tblUser ?
      `${sqlData.tblUser.fname || ''} ${sqlData.tblUser.lname || ''}`.trim() : '',
    count_stages: sqlData.count_stages !== null ? sqlData.count_stages.toString() : '',
    created: sqlData.created ? sqlData.created.toISOString() : undefined,
    updated: sqlData.updated ? sqlData.updated.toISOString() : undefined,
    company_name: sqlData.company_name || '',
    job_title: sqlData.job_title || '',
    priority: sqlData.priority !== null && sqlData.priority !== undefined ? sqlData.priority.toString() : '',
    notes: sqlData.notes || '',
    profile_instagram: sqlData.profile_instagram || '',
    profile_facebook:  sqlData.profile_facebook || '',
    profile_twitter:   sqlData.profile_twitter || '',
    profile_whatsapp:  sqlData.profile_whatsapp || '',
    address: sqlData.address || '',
    city: sqlData.city || '',
    state: sqlData.state || '',
    country_name: sqlData.country_name || '',
    postcode: sqlData.postcode || '',
    lead_source_name: sqlData.lead_source_name || '',
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
    sales_value: formData.sales_value ? Number(formData.sales_value) : null,
    linkedin_profile: formData.linkedin_profile || null,
    linkedin_profile_photo: formData.linkedin_profile_photo || null,
    linkedin_handle: formData.linkedin_handle || null,
    linkedin_unique_id: formData.linkedin_unique_id || null,
    lead_owner: formData.lead_owner ? BigInt(formData.lead_owner) : null,
    count_stages: formData.count_stages ? BigInt(formData.count_stages) : null,
    created: formData.created ? new Date(formData.created) : undefined,
    updated: formData.updated ? new Date(formData.updated) : undefined,
    company_name: formData.company_name || null,
    job_title: formData.job_title || null,
    priority: formData.priority ? Number(formData.priority) : null,
    notes: formData.notes || null,
    profile_instagram: formData.profile_instagram || null,
    profile_facebook: formData.profile_facebook || null,
    profile_twitter: formData.profile_twitter || null,
    profile_whatsapp: formData.profile_whatsapp || null,
    address: formData.address || null,
    city: formData.city || null,
    state: formData.state || null,
    country_name: formData.country_name || null,
    postcode: formData.postcode || null,
    lead_source_name: formData.lead_source_name || null,
  };
};


export const createEmptyLead = (): LeadSQLData => ({
  id: BigInt(0),
  fname: '',
  lname: '',
  email: '',
  phone: '',
  status: null,
  sales_value: null,
  linkedin_profile: '',
  linkedin_profile_photo: '',
  linkedin_handle: '',
  linkedin_unique_id: '',
  lead_owner: null,
  count_stages: null,
  created: new Date(),
  updated: new Date(),
  company_name: '',
  job_title: '',
  priority: 0,
  notes: '',
  profile_instagram: '',
  profile_facebook: '',
  profile_twitter: '',
  profile_whatsapp: '',
  address: '',
  city: '',
  state: '',
  country_name: '',
  postcode: '',
  lead_source_name: '',
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

// function to save the history to cookies
// TODO:expand history to include userid as diff ppl might use same computer
export const saveHistory = (id: string, path: HistoryItemPath, usrId: string): void => {
  // Create the HistoryItem object
  const now = new Date();
  const formattedDateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}  Time:  ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const newItem: HistoryItem = {
    id: id.toString(),
    path,
    hDateTime: formattedDateTime,
    usrId: usrId.toString(),
  };
  console.log("🔎 141: saveHistory: ", newItem);
  // Get the current history
  const currentHistory = getHistory(usrId);

  // Update the history with the new item
  const updatedHistory = [newItem, ...currentHistory.filter(item => item.id !== newItem.id)].slice(0, 5);

  // Save the updated history to cookies
  Cookies.set('userHistory', JSON.stringify(updatedHistory), { expires: 30, path: '/' });
};
//************************* */
// Function to get the history from cookies
export const getHistory = (userId: string | null): HistoryItem[] => {
  try {
    const historyCookie = Cookies.get('userHistory');

    if (!historyCookie) {
      return []; // Return empty array if no history cookie
    }

    const allHistoryItems: HistoryItem[] = JSON.parse(historyCookie);

    if (!userId) {
      return allHistoryItems; //return all items if no userid.
    }

    const filteredHistory: HistoryItem[] = allHistoryItems.filter(item => item.usrId === userId);
    return filteredHistory;

  } catch (error) {
    console.error("Error parsing history from cookies:", error);
    return [];
  }
};

//using prismabiblioteket to get data  ✅ 🔎  🆕 👉 ✅  💾  ❌  📋
export async function getAccountsForUser(user_id: string): Promise<AccountWithNameSerialized[]> {
  try {
    // Verify user has access to this account
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      console.error("No valid session found");
      return [];
    }

    const currentUsrId = BigInt(session.user.id);

    // Ensure user is requesting their own accounts
    if (currentUsrId.toString() !== user_id) {
      console.error("❌ Requested user_id does not match current user");
      return [{
        account_id: '-1',
        access_level: null,
        tblAccount: {
          name: 'Error: Requested user_id does not match current user',
        },
      }];
    }

    console.log("Fetching accounts for user_id:", currentUsrId);

    // ✅ FIX: Ensure `tblAccount` is correctly joined
    const accounts = await prisma.tblAccountUser.findMany({
      where: { user_id: BigInt(user_id) },
      select: {
        account_id: true,
        access_level: true,
        tblAccount: { // Ensure the relation is properly selected
          select: {
            name: true,  // ✅ Ensure this exists in the API response
          },
        },
      },
    });

    console.log("Fetched accounts returned from getAccountsForUser. #:", accounts.length);//accounts
    //return accounts;

    // Convert BigInt to String to avoid JSON serialization issues
    const formattedAccounts: AccountWithNameSerialized[] = accounts.map((account: AccountWithName) => ({
      account_id: account.account_id.toString(), // Convert bigint to string
      access_level: account.access_level,
      tblAccount: { name: account.tblAccount?.name ?? "Unnamed Account" }, // Access name from the nested tblAccount object
    }));

    console.log("app/lib/api.ts | Returning formattedAccounts", formattedAccounts[0]);
    return formattedAccounts;
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return [];
  }
}

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
//**get all users accessed to an account**
export async function getUserAccessedAccount(account_id: string): Promise<AccountUserSerialized[]> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      console.error("No valid session found");
      return [];
    }

    const accounts = await prisma.tblAccountUser.findMany({
      where: { account_id: BigInt(account_id) },
      select: {
        user_id: true,
        access_level: true,
        tblUser: {
          select: {
            fname: true,
            lname: true,
            email: true,
          },
        },
      },
    });
    // Convert BigInt to String to avoid JSON serialization issues
    console.log("Fetched accounts returned from getUserAccessedAccount. #:", accounts.length);

    const formattedAccounts: AccountUserSerialized[] = accounts.map((account :UserAccessedAccountData) => ({
      user_id: account.user_id.toString(), // Corrected to account.user_id
      access_level: account.access_level?.toString() || null,
      tblUser: {
        fname: account.tblUser?.fname ?? "Unnamed user" ,
        lname: account.tblUser?.lname ?? "No lastname" ,
        email: account.tblUser?.email?? "no email"
      },

    }));

    console.log("app/lib/api.ts | Returning formattedAccounts", formattedAccounts[0]);
    return formattedAccounts;
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return [];
  }
}

  /**
 * Fetches all leads that are in a specific pipeline,
 * with their stage information.
 *
 * @param pipelineId - The ID of the pipeline to fetch leads for
 * @returns An array of pipeline lead objects with lead and stage information
 */
export const fetchLeadsInPipeline = async (pipelineId: string) => {
  try {
    console.log(`👉 API fetchLeadsInPipeline for pipeline: ${pipelineId}`);
    //app/api/pipeline/[id]/leads/
    const response = await fetch(`/api/pipeline/${pipelineId}/leads`);

    if (!response.ok) {
      throw new Error(`Failed to fetch pipeline leads: ${response.statusText}`);
    }

    // The response will contain all leads assigned to any stage in this pipeline
    const pipelineLeads = await response.json();
    console.log(`API fetchLeadsInPipeline Found ${pipelineLeads.length} leads in pipeline ${pipelineId}`);

    return pipelineLeads;
  } catch (err) {
    console.error("Error fetching pipeline leads:", err);
    return [];
  }
};

// Check if a lead is already in a pipeline and get its stage
// Function 2: Check if a lead is already in a pipeline and get its stage
export const checkLeadInPipeline = (pipelineLeads: any[], leadId: string): {
  isInPipeline: boolean;
  stageId: string | null;
  pipelineLeadId: string | null;
} => {
  if (!leadId || !pipelineLeads || pipelineLeads.length === 0) {
    return {
      isInPipeline: false,
      stageId: null,
      pipelineLeadId: null
    };
  }

  // Find the lead in the pipeline leads array
  const foundLead = pipelineLeads.find(pl =>
    pl.lead_id && pl.lead_id.toString() === leadId.toString()
  );

  if (foundLead) {
    return {
      isInPipeline: true,
      stageId: foundLead.pipelinestage_id?.toString() || null,
      pipelineLeadId: foundLead.id?.toString() || null
    };
  }

  return {
    isInPipeline: false,
    stageId: null,
    pipelineLeadId: null
  };
};


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
