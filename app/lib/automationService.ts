import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '@/app/lib/prisma';

/**
 * Safely stringify an object that might contain BigInt values
 * by converting them to strings
 */
// TODO: Consolidate all bigIntSerializer codes across the application
function bigIntSerializer(obj: any): string {
  return JSON.stringify(obj, (key, value) => {
    // Convert BigInt values to strings
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  });
}

/**
 * Service for handling Automation-related operations
 */
export class AutomationService {

  /**
   * Update the name of an automation task with a new suffix, as specified by the 2nd parameter
   * @param name string The current name of the automation task
   * @param newStatus string The new status to set at the end of the name. This string will replace any current suffix
   * @returns string The same automation name with a new status at the end (as specified by the 2nd parameter)
   */
  static setNewStatusInName(name:string, newStatus:string = "completed") {
    let newName = ""
    const lastUnderscoreIndex = name.lastIndexOf("_");

    if (lastUnderscoreIndex === -1) {
      // If no underscore is found, return the original string
      newName = name
    } else {
      // Extract the part of the string before the last underscore
      const beforeLastUnderscore = name.substring(0, lastUnderscoreIndex + 1);
      // Concatenate with the replacement string
      newName = beforeLastUnderscore + newStatus;
    }

    return newName
  }



  /**
   * Get the status IDs for lead statuses that should be excluded from automation
   */
  static async getExcludedStatusIds(): Promise<bigint[]> {
    try {
      const statuses = await prisma.tblLeadStatus.findMany({
        where: {
          name: {
            in: ['Do Not Contact', 'Unresponsive', 'Not Qualified', 'Closed/Lost']
          }
        }
      });

      return statuses.map(status => status.id);
    } catch (error) {
      console.error('Error getting excluded status IDs:', error);
      // Return some default IDs if we can't get them from the database
      return [];
    }
  }

  /**
   * Check if there's a pending or running automation for the account and user for a particular stage
   */
  static async isAutomationPendingOrRunning(
    accountId: bigint,
    userId: bigint,
    stageId?: bigint,
    platform_id?: bigint
  ): Promise<{
    id: bigint;
    created: Date | null;
    account_id: bigint;
    user_id: bigint;
    platform_id: bigint;
    stage_id: bigint;
    status: string | null;
  }[]> {
    console.log(`app/lib/automationService.ts | isAutomationPendingOrRunning | Checking automation for account_id ${accountId}, user ${userId}, stage=${stageId}, platform=${platform_id}`);

    if (!stageId && !platform_id) {
      throw new Error("At least one of stageId or platform_id must be specified");
    }

    try {

      // Build the WHERE conditions based on provided parameters
      let whereConditions = `
        WHERE account_id = ${BigInt(accountId)}
          AND    user_id = ${BigInt(userId)}
        `;

      if (stageId) {
        whereConditions += `
          AND stage_id = ${BigInt(stageId)}
        `;
      }

      if (platform_id) {
        whereConditions += `
          AND platform_id = ${BigInt(platform_id)}
        `;
      }

      /*
      console.log(`
        SELECT * FROM [LeadMaestro].tblAutomationStatus
        ${whereConditions}
        AND (
          JSON_VALUE(status, '$.name') LIKE '%_in_progress'
          OR
          JSON_VALUE(status, '$.name') LIKE '%_pending'
        )
        `)
      */

      // Use a raw query so that we can check the name key in the JSON blob stored in the status column
      //  In other words, the column Status holds a JSON blob. This blob has a key named "name".
      const res = await prisma.$queryRaw<{
        id: bigint;
        created: Date | null;
        account_id: bigint;
        user_id: bigint;
        platform_id: bigint;
        stage_id: bigint;
        status: string | null;
      }[]>`
        SELECT * FROM [LeadMaestro].tblAutomationStatus
        ${Prisma.raw(whereConditions)}
        AND (
          JSON_VALUE(status, '$.name') LIKE '%_in_progress'
          OR
          JSON_VALUE(status, '$.name') LIKE '%_pending'
        )
        `;

      console.log(`app/lib/automationService.ts | isAutomationPendingOrRunning | returning`, res);
      return res

    } catch (error) {
      console.error('Error checking automation status:', error);
      return [];
    }
  }

  /**
   * Find leads in a pipeline stage that are due for automation
   */
  static async getLeadsForAutomation(stageId: string, excludedStatusIds: bigint[]): Promise<string[]> {
    try {
      // Get current date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];

      // Find leads in the given stage with followup_date <= today and not in excluded statuses
      const pipelineLeads = await prisma.tblPipelineLead.findMany({
        where: {
          pipelinestage_id: BigInt(stageId),
          followup_date: {
            lte: new Date(today)
          },
          tblLead: {
            status: {
              not: {
                in: excludedStatusIds
              }
            }
          }
        },
        include: {
          tblLead: true
        }
      });

      // Extract lead IDs
      return pipelineLeads
        .filter(item => item.lead_id !== null)
        .map(item => item.lead_id!.toString());
    } catch (error) {
      console.error('Error getting leads for automation:', error);
      return [];
    }
  }

  /**
   * Get automation actions for a pipeline stage
   */
  static async getStageActions(stageId: string) {
    try {
      const stageActions = await prisma.tblPipelineStageAction.findMany({
        where: {
          pipeline_stage_id: BigInt(stageId)
        },
        include: {
          tblFeature: true
        },
        orderBy: {
          order_index: 'asc'
        }
      });

      // Format the actions for the automation
      return stageActions.map(action => {
        let configObject = {};
        try {
          if (action.config) {
            configObject = JSON.parse(action.config);
          } else if (action.tblFeature?.default_config) {
            configObject = JSON.parse(action.tblFeature.default_config);
          }
        } catch (e) {
          console.error("Error parsing action config:", e);
        }

        return {
          action_name: action.tblFeature?.feature_code.replace("automation_action_", "") || `action_${action.id}`,
          ...configObject
        };
      });
    } catch (error) {
      console.error('Error getting stage actions:', error);
      return [];
    }
  }

  /**
   * Save automation state for an account and user
   */
  static async saveAutomationState(accountId: bigint, userId: bigint, platformId: bigint, stageId: bigint, automationData: any) {
    try {
      return await prisma.tblAutomationStatus.create({
        data: {
          account_id: accountId,
          user_id: userId,
          platform_id: platformId,
          status: JSON.stringify(automationData),
          stage_id: stageId
        }
      });
    } catch (error) {
      console.error('Error saving automation state:', error);
      throw error;
    }
  }


  /**
   * Cancel existing automations for a specific account, user, platform, and stage
   * @param accountId - The account ID
   * @param userId - The user ID
   * @param platformId - The platform ID
   * @param stageId - The pipeline stage ID
   * @returns Promise<boolean> - Whether the operation was successful
   */
  static async cancelExistingAutomations(
    accountId: bigint,
    userId: bigint,
    platformId: bigint,
    stageId: bigint
  ): Promise<boolean> {
    console.log(
      `app/lib/automationService.ts | cancelExistingAutomations |
     Canceling automations for account_id ${accountId}, user ${userId}, platform=${platformId}, stage=${stageId}`
    );

    try {
      // Find all running or pending automations for this combination
      const existingAutomations = await AutomationService.isAutomationPendingOrRunning(accountId, userId, stageId)

      if (existingAutomations.length === 0) {
        console.log('No active automations found to cancel');
        return true;
      }
      console.log("Found", existingAutomations.length, "existing automation(s)")

      // Update each automation to mark it as cancelled
      for (const automation of existingAutomations) {
        let statusData = {};
        try {
          statusData = JSON.parse(automation.status || '{}');
        } catch (e) {
          console.error('Error parsing automation status JSON:', e);
        }

        let updatedStatus: any = {};
        updatedStatus = statusData
        updatedStatus.result.stopped = true;
        updatedStatus.result.stopped_at = new Date().toISOString();
        updatedStatus.result.stopped_by = typeof userId === 'bigint' ? userId.toString() : userId;
        updatedStatus.result.stopped_reason = 'User initiated cancellation to start a new automation'

        // Set new name
        updatedStatus.name = AutomationService.setNewStatusInName(updatedStatus.name, "cancelled")

        // Add cancellation information to the status
        /*
        const updatedStatus = {
          ...statusData,
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_reason: 'User initiated cancellation'
        };
        */

        console.log(
          `app/lib/automationService.ts | cancelExistingAutomations |
         New status for id ${automation.id} is ${updatedStatus}`
        );

        // Update the automation record
        await prisma.tblAutomationStatus.update({
          where: {
            id: automation.id
          },
          data: {
            status: bigIntSerializer(updatedStatus)
          }
        });
      }

      console.log(`Successfully cancelled ${existingAutomations.length} automation(s)`);
      return true;
    } catch (error) {
      console.error('Error cancelling automations:', error);
      return false;
    }
  }
}