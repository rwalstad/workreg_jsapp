import { getSelectedAccountIdFromServer } from '@/app/lib/server-account-helper';
import prisma from '@/app/lib/prisma';

/**
 * Service for handling Lead-related operations
 */
export class LeadService {

  // BigInt serializer for JSON responses
  // TODO: Consolidate all bigIntSerializer codes across the application
  static bigIntSerializer = (obj: any) => JSON.stringify(obj, (_, value) =>
    typeof value === 'bigint' ? value.toString() : value
  );

  /**
   * Verifies if a lead belongs to a specific account by checking related pipeline stages
   * @param leadId - The ID of the lead to check
   * @param accountId - The account ID to verify against
   * @returns Boolean indicating whether the lead belongs to the specified account
   */
  static async verifyLeadAccess(leadId: string, accountId: string): Promise<boolean> {
    try {
      const leadIdBigInt    = BigInt(leadId);
      const accountIdBigInt = BigInt(accountId);

      // Get all pipeline stages associated with this lead
      const pipelineLeads = await prisma.tblPipelineLead.findMany({
        where: { lead_id: leadIdBigInt },
        include: {
          tblPipelineStage: {
            include: {
              tblPipeline: true
            }
          }
        }
      });

      // Loop each pipeline this lead is associated with, and check if the lead belongs to an account owner by this account
      // Check if any of the lead's pipeline stages belong to pipelines owned by the account
      for (const pipelineLead of pipelineLeads) {
        // If pipeline stage exists and its pipeline belongs to the account
        if (pipelineLead.tblPipelineStage?.tblPipeline?.account_id === accountIdBigInt) {
          return true;
        }
      }

      // If no pipeline stages were linked to the lead or none matched the account,
      // check if this lead is associated with any user in the account
      const accountUsers = await prisma.tblAccountUser.findMany({
        where: { account_id: accountIdBigInt },
        select: { user_id: true }
      });

      const accountUserIds = accountUsers.map(au => au.user_id);

      // Check if the lead owner is among the account users
      const lead = await prisma.tblLead.findUnique({
        where: { id: leadIdBigInt },
        select: { lead_owner: true }
      });

      // Check if any of the users associated with the account is the owner of the lead
      if (lead?.lead_owner && accountUserIds.some(userId => userId === lead.lead_owner)) {
        return true;
      }

      // If we got here, the lead is not associated with the account
      return false;
    } catch (error) {
      console.error(`Error verifying lead access for lead ID ${leadId} and account ID ${accountId}:`, error);
      // In case of an error, deny access to be safe
      return false;
    }
  }
  /**
   * Get a lead by ID
   */
  static async getLeadById(id: string) {
    try {
      return await prisma.tblLead.findUnique({
        where: { id: BigInt(id) },
        include: {
          tblLeadStatus: true,
          tblUser: true,
          tblPipelineLead: {
            include: {
              tblPipelineStage: true,
              tblPipelineLeadTag: {
                include: {
                  tblTag: true
                }
              }
            }
          }
        }
      });
    } catch (error) {
      console.error(`Error fetching lead by ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get a lead by filters (email, LinkedIn profile, Instagram handle (profile_instagram), etc.)
   * @param filter object A JSON object with key value pairs defining your search
   * @returns
   */
  static async getLeadByFilter(filter: {
    id?: string,
    email?: string,
    linkedin_profile?: string,
    profile_instagram?: string, // The extension sends profile_instagram
  }) {
    try {
      // Build the where clause based on provided filters
      const where: any = {};

      if (filter.id) {
        where.id = BigInt(filter.id);
      }

      if (filter.email) {
        where.email = filter.email;
      }

      if (filter.linkedin_profile) {
        where.linkedin_profile = filter.linkedin_profile;
      }

      if (filter.profile_instagram) {
        where.profile_instagram = filter.profile_instagram;
      }

      return await prisma.tblLead.findFirst({
        where,
        include: {
          tblLeadStatus: true,
          tblUser: true,
          tblPipelineLead: {
            include: {
              tblPipelineStage: true,
              tblPipelineLeadTag: {
                include: {
                  tblTag: true
                }
              }
            }
          }
        }
      });
    } catch (error) {
      console.error(`Error fetching lead by filter:`, error);
      throw error;
    }
  }

  /**
   * Format a lead for API response
   */
  static formatLeadForResponse(lead: any) {
    const now = new Date();
    const formattedDate = this.formatDate(now);

    // Extract JSON data if exists
    let jsonData = {};
    try {
      if (lead.linkedin_profile) {
        jsonData = {
          ...jsonData,
          profile_linkedin:       lead.linkedin_profile,
          profile_photo_linkedin: lead.linkedin_profile_photo
        };
      }

      if (lead.profile_instagram) {
        jsonData = {
          ...jsonData,
          profile_instagram:       lead.profile_instagram,
          profile_photo_instagram: lead.profile_photo_instagram
        };
      }
    } catch (e) {
      console.error('Error parsing JSON data:', e);
    }

    // Build lead segments/tags
    const leadSegments: string[] = [];
    if (lead.tblPipelineLead && lead.tblPipelineLead.length > 0 &&
      lead.tblPipelineLead[0].tblPipelineLeadTag) {
      lead.tblPipelineLead[0].tblPipelineLeadTag.forEach((tagRelation: any) => {
        if (tagRelation.tblTag) {
          leadSegments.push(tagRelation.tblTag.name);
        }
      });
    }

    // Get pipeline stage info
    let pipelineStageId = '';
    if (lead.tblPipelineLead && lead.tblPipelineLead.length > 0) {
      const pipelineLead = lead.tblPipelineLead[0];
      if (pipelineLead.tblPipelineStage) {
        pipelineStageId = pipelineLead.id.toString();
      }
    }

    // Determine lead source
    let leadSourceName = "LinkedIn Search";
    if (lead.profile_instagram) {
      leadSourceName = "Instagram";
    }

    return {
      lead_id: lead.id.toString(),
      name: `${lead.fname || ''} ${lead.lname || ''}`.trim(),
      company_name: "",  // Add company name if available in your database
      job_title: "",  // Add job title if available in your database
      country_id: "",  // Add country if available
      country_name: "",  // Add country name if available
      lead_status_id: lead.status ? lead.status.toString() : "1",
      date_followup: lead.tblPipelineLead?.[0]?.followup_date
        ? this.formatDate(lead.tblPipelineLead[0].followup_date)
        : formattedDate,
      member_id: lead.lead_owner ? lead.lead_owner.toString() : "",
      created: this.formatDate(lead.created || now),
      updated: this.formatDate(lead.last_activity || now),
      lead_source_id: "",  // Add lead source if available
      profile_linkedin: lead.linkedin_profile || "",
      profile_instagram: lead.profile_instagram || "",
      json_data_lead: JSON.stringify(jsonData),
      lead_status_name: lead.tblLeadStatus?.name || "Lead In",
      lead_source_name: leadSourceName,
      membername: lead.tblUser ? `${lead.tblUser.fname || ''} ${lead.tblUser.lname || ''}`.trim() : "",
      map_lead_member_pipeline_stage: pipelineStageId,
      map_lead_segment: leadSegments.join(','),
      lead_segment_name: leadSegments.join(','),
      priority: lead.priority !== undefined ? lead.priority : 0,  // 0= No Priority, 1=Low, 2=Normal, 3=High, 4= Urgent
      Actions: `
        <a href="javascript:;" onclick="MUModals.actionLeadEdit(${lead.id.toString()}); return false;" class="btn btn-sm btn-clean btn-icon btn-icon-sm" title="Edit details" data-toggle="modal" data-target="#modalLeadEditor">
          <i class="flaticon2-edit"></i>
        </a>
        <a href="javascript:;" onclick="MUModals.actionDeleteDialog(${lead.id.toString()}, 'leadid', 'lead'); return false;" class="btn btn-sm btn-clean btn-icon btn-icon-sm" title="Delete">
          <i class="flaticon2-trash"></i>
        </a>
      `
    };
  }

  /**
   * Format a date for API response
   */
  static formatDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  /**
   * Get all leads for an account
   */
  static async getLeadsByAccount(accountId: string) {
    try {
      // Get all users in this account
      const accountUsers = await prisma.tblAccountUser.findMany({
        where: { account_id: BigInt(accountId) },
        select: { user_id: true }
      });

      // Get list of user IDs in this account
      const userIds = accountUsers.map(au => au.user_id);

      // Fetch all leads owned by any user in the account
      return await prisma.tblLead.findMany({
        where: {
          lead_owner: {
            in: userIds
          }
        },
        include: {
          tblUser: true,
          tblLeadStatus: true,
          tblPipelineLead: {
            include: {
              tblPipelineStage: true
            }
          }
        }
      });
    } catch (error) {
      console.error(`Error fetching leads for account ${accountId}:`, error);
      throw error;
    }
  }

  /**
   * Get leads for a user
   */
  static async getLeadsByOwner(ownerId: string) {
    try {
      return await prisma.tblLead.findMany({
        where: { lead_owner: BigInt(ownerId) },
        include: {
          tblUser: true,
          tblLeadStatus: true,
          tblPipelineLead: {
            include: {
              tblPipelineStage: true
            }
          }
        }
      });
    } catch (error) {
      console.error(`Error fetching leads for owner ${ownerId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new lead
   */
  // TODO: Replace this with addLeadsToDatabase, which is used when importing from extension
  static async createLead(leadData: {
    fname?: string;
    lname?: string;
    email?: string;
    phone?: string;
    status?: string;
    sales_value?: string;
    linkedin_profile?: string;
    linkedin_profile_photo?: string;
    linkedin_handle?: string;
    linkedin_unique_id?: string;
    lead_owner: string;
  }) {
    try {
      return await prisma.tblLead.create({
        data: {
          fname: leadData.fname || null,
          lname: leadData.lname || null,
          email: leadData.email || null,
          phone: leadData.phone || null,
          status: leadData.status ? BigInt(leadData.status) : null,
          sales_value: leadData.sales_value ? parseInt(leadData.sales_value, 10) : null,
          linkedin_profile: leadData.linkedin_profile || null,
          linkedin_profile_photo: leadData.linkedin_profile_photo || null,
          linkedin_handle: leadData.linkedin_handle || null,
          linkedin_unique_id: leadData.linkedin_unique_id || null,
          lead_owner: BigInt(leadData.lead_owner),
        }
      });
    } catch (error) {
      console.error('Error creating lead:', error);
      throw error;
    }
  }

  /**
   * Update an existing lead
   */
  static async updateLead(id: string, leadData: {
    fname?: string;
    lname?: string;
    email?: string;
    phone?: string;
    status?: string;
    sales_value?: string | number;
    linkedin_profile?: string;
    linkedin_profile_photo?: string;
    linkedin_handle?: string;
    linkedin_unique_id?: string;
    profile_instagram?: string;
    profile_photo_instagram?: string;
    lead_owner?: string;
    priority?: number;
  }) {
    try {
      const updateData: any = {};

      if (leadData.fname !== undefined) updateData.fname = leadData.fname;
      if (leadData.lname !== undefined) updateData.lname = leadData.lname;
      if (leadData.email !== undefined) updateData.email = leadData.email;
      if (leadData.phone !== undefined) updateData.phone = leadData.phone;
      if (leadData.status !== undefined) updateData.status = leadData.status ? BigInt(leadData.status) : null;
      if (leadData.sales_value !== undefined) {
        updateData.sales_value = typeof leadData.sales_value === 'string'
          ? parseInt(leadData.sales_value, 10)
          : leadData.sales_value;
      }

      // LinkedIn fields
      if (leadData.linkedin_profile       !== undefined) updateData.linkedin_profile       = leadData.linkedin_profile;
      if (leadData.linkedin_profile_photo !== undefined) updateData.linkedin_profile_photo = leadData.linkedin_profile_photo;
      if (leadData.linkedin_handle        !== undefined) updateData.linkedin_handle        = leadData.linkedin_handle;
      if (leadData.linkedin_unique_id     !== undefined) updateData.linkedin_unique_id     = leadData.linkedin_unique_id;

      // Instagram fields
      if (leadData.profile_instagram       !== undefined) updateData.profile_instagram       = leadData.profile_instagram;
      if (leadData.profile_photo_instagram !== undefined) updateData.profile_photo_instagram = leadData.profile_photo_instagram;

      if (leadData.lead_owner !== undefined) updateData.lead_owner = BigInt(leadData.lead_owner);

      // Handle priority field updates
      if (leadData.priority !== undefined) updateData.priority = leadData.priority;

      return await prisma.tblLead.update({
        where: { id: BigInt(id) },
        data: updateData
      });
    } catch (error) {
      console.error(`Error updating lead ${id}:`, error);
      throw error;
    }
  }

  /**
 * Deletes a lead and associated pipeline lead entries from the database
 * @param leadId - The ID of the lead to delete
 * @returns Object indicating success or failure
 */
  static async deleteLead(leadId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Convert the leadId to BigInt for database operations
      const leadIdBigInt = BigInt(leadId);

      // First delete any associated pipeline lead tags and pipeline lead entries
      // Start a transaction to ensure data consistency
      await prisma.$transaction(async (tx) => {
        // Find all pipeline leads associated with this lead
        const pipelineLeads = await tx.tblPipelineLead.findMany({
          where: { lead_id: leadIdBigInt },
          select: { id: true }
        });

        // If there are any pipeline leads, delete their tags first
        if (pipelineLeads.length > 0) {
          const pipelineLeadIds = pipelineLeads.map(pl => pl.id);

          // Delete all tags associated with these pipeline leads
          await tx.tblPipelineLeadTag.deleteMany({
            where: {
              pipelinelead_id: { in: pipelineLeadIds }
            }
          });

          // Now delete all pipeline lead entries
          await tx.tblPipelineLead.deleteMany({
            where: { lead_id: leadIdBigInt }
          });
        }

        // Finally delete the lead itself
        await tx.tblLead.delete({
          where: { id: leadIdBigInt }
        });
      });

      console.log(`Successfully deleted lead with ID: ${leadId}`);
      return { success: true };
    } catch (error: any) {
      console.error(`Error deleting lead with ID ${leadId}:`, error);
      return {
        success: false,
        error: error.message || 'Failed to delete lead'
      };
    }
  }

  /**
   * Move a lead to a pipeline stage
   * Preserves the follow-up date for newly created leads
   */
  static async moveLeadToPipelineStage(leadId: string, pipelineStageId: string, cardColor?: string) {
    try {
      // Get the target pipeline stage
      const targetStage = await prisma.tblPipelineStage.findUnique({
        where: { id: BigInt(pipelineStageId) },
        include: { tblPipeline: true },
      });

      if (!targetStage) {
        throw new Error('Target pipeline stage not found');
      }

      // Get the lead to check its creation time
      const lead = await prisma.tblLead.findUnique({
        where: { id: BigInt(leadId) }
      });

      if (!lead) {
        throw new Error('Lead not found');
      }

      // Check if the lead is already in the pipeline
      const existingPipelineLead = await prisma.tblPipelineLead.findFirst({
        where: { lead_id: BigInt(leadId) },
        include: { tblPipelineStage: true },
      });

      // Determine if this is a newly created lead (created in the last minute)
      const isNewlyCreated = lead.created &&
        (new Date().getTime() - lead.created.getTime() < 60000); // 60 seconds

      // Calculate follow-up date if needed and if not newly created
      let followupDate = null;

      if (!isNewlyCreated && targetStage.followup_num && targetStage.followup_unit) {
        /*
        Only calculate new followup date if lead is not newly created

         This is because the extension makes two API calls when important a lead. These two calls are
          api/datatables/lead.php?action=import
          api/datatables/lead.php?action=AddSelectedLeadsToPipelineStage&add_to_pipeline_stage_id=106

          The lead is added to the pipeline in the import stage. The followup date is set during this operation.
          Thus, when this funciton is executed just afterwards, we want to preserve the original followup date that was set
        */
        followupDate = this.calculateFollowUpDate(
          targetStage.followup_num,
          targetStage.followup_unit
        );
      }

      // If lead is not in any pipeline yet, add it
      if (!existingPipelineLead) {
        return await prisma.tblPipelineLead.create({
          data: {
            lead_id: BigInt(leadId),
            pipelinestage_id: BigInt(pipelineStageId),
            followup_date: followupDate,
            // Add card color if your schema supports it
            // card_color: cardColor
          },
        });
      }

      // If lead needs to move to a different pipeline
      if (existingPipelineLead.tblPipelineStage?.pipeline_id !== targetStage.pipeline_id) {
        // For newly created leads, preserve the existing follow-up date
        const effectiveFollowupDate = isNewlyCreated
          ? existingPipelineLead.followup_date
          : (followupDate || existingPipelineLead.followup_date);

        // Create a new pipeline lead entry in the target pipeline
        const newPipelineLead = await prisma.tblPipelineLead.create({
          data: {
            lead_id: BigInt(leadId),
            pipelinestage_id: BigInt(pipelineStageId),
            assigned_user: existingPipelineLead.assigned_user,
            followup_date: effectiveFollowupDate,
            // Add card color if your schema supports it
            // card_color: cardColor
          },
        });

        // Archive/delete the old pipeline lead entry
        await prisma.tblPipelineLead.delete({
          where: { id: existingPipelineLead.id },
        });

        return newPipelineLead;
      }

      // For newly created leads, preserve the existing follow-up date
      const effectiveFollowupDate = isNewlyCreated
        ? existingPipelineLead.followup_date
        : (followupDate || existingPipelineLead.followup_date);

      // Just update the existing pipeline lead entry
      return await prisma.tblPipelineLead.update({
        where: { id: existingPipelineLead.id },
        data: {
          pipelinestage_id: BigInt(pipelineStageId),
          followup_date: effectiveFollowupDate,
          // Add card color if your schema supports it
          // card_color: cardColor
        },
      });
    } catch (error) {
      console.error('Error moving lead to pipeline stage:', error);
      throw error;
    }
  }
  /**
   * Calculate a follow-up date based on a number and unit
   */
  static calculateFollowUpDate(num: number, unit: string): Date {
    const date = new Date();

    switch (unit.toLowerCase()) {
      case 'minutes':
        date.setMinutes(date.getMinutes() + num);
        break;
      case 'hours':
        date.setHours(date.getHours() + num);
        break;
      case 'days':
        date.setDate(date.getDate() + num);
        break;
      case 'weeks':
        date.setDate(date.getDate() + (num * 7));
        break;
      case 'months':
        date.setMonth(date.getMonth() + num);
        break;
      default:
        // Default to days if unit is not recognized
        date.setDate(date.getDate() + num);
    }

    return date;
  }

  /**
  * Add leads to the database from import
  */
  static async addLeadsToDatabase(
    leadData: any,
    userId: string,
    pipelineStageId: string | null,
    leadTags: string[],
    leadProposalPrice: string,
    leadDateFollowUp: string | null,
    leadNotes: string,
    profileId: string | null
  ) {
    const newLeads: string[] = [];
    const existingLeads: string[] = [];
    let newLeadsCount = 0;
    let existingLeadsCount = 0;

    // Get currently selected accountID
    const accountId = await getSelectedAccountIdFromServer();

    // If we still don't have an account ID, return an error
    if (!accountId) {
      throw new Error('Account ID is required');
    }

    // Determine data source (LinkedIn, Instagram, Facebook, or WhatsApp)
    const dataSource  = leadData.data_type?.toLowerCase() || 'linkedin profile';
    const isInstagram = dataSource.includes('instagram');
    const isFacebook  = dataSource.includes('facebook');
    const isWhatsapp  = dataSource.includes('whatsapp');

    // Process each lead in the import data
    for (const lead of leadData.data) {
      try {
        // Build where clause to check for existing leads based on data source
        const whereClause: any = {
          OR: []
        };

        // Add email check if available
        if (lead.email) {
          whereClause.OR.push({ email: lead.email });
        }

        // Add source-specific profile checks
        if (isInstagram) {
          if (lead.profile_instagram) {
            whereClause.OR.push({ profile_instagram: lead.profile_instagram });
          }
        } else if (isFacebook) {
          if (lead.profile_facebook) {
            whereClause.OR.push({ profile_facebook: lead.profile_facebook });
          }
        } else if (isWhatsapp) {
          if (lead.profile_whatsapp) {
            whereClause.OR.push({ profile_whatsapp: lead.profile_whatsapp });
          }
        }
        else {
          // LinkedIn or other sources
          if (lead.profile_linkedin) {
            whereClause.OR.push({ linkedin_profile: lead.profile_linkedin });
          }
        }

        // Skip if we don't have enough info to check for duplicates
        if (whereClause.OR.length === 0) {
          console.warn('Skipping lead import due to insufficient identifier data', lead);
          continue;
        }

        // Check if lead already exists
        const existingLead = await prisma.tblLead.findFirst({
          where: whereClause,
        });

        if (existingLead) {
          existingLeadsCount++;
          existingLeads.push(existingLead.id.toString());
          continue;
        }

        // Prepare lead data based on the source
        const createData: any = {
          sales_value:  leadProposalPrice ? parseInt(leadProposalPrice, 10) : 0,
          created: new Date(),
          updated: new Date(),
          job_title:    lead.job_title || '',
          company_name: lead.company_name || '',
          notes:        leadNotes || '',
          priority: 0, // TODO: get the priority from the import
        };

        createData.tblLeadStatus = {
          connect: {
            id: BigInt(0) // "Client in"
          }
        };

        createData.tblUser = {
          connect: {
            id: BigInt(userId)
          }
        };

        // Set source info if your schema has these fields
        if (isFacebook) {
          // createData.lead_source_id = '70';
          createData.lead_source_name = 'Facebook Profile';
        } else if (isInstagram) {
          // createData.lead_source_id = '71';
          createData.lead_source_name = 'Instagram Profile';
        } else if (isWhatsapp) {
          createData.lead_source_name = 'WhatsApp Profile';
        } else {
          createData.lead_source_name = 'LinkedIn Profile';
        }

        // Set name fields
        if (lead.name) {
          const nameParts = lead.name.split(' ');
          createData.fname = nameParts[0] || '';
          createData.lname = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        }

        // Set email if available
        if (lead.email) {
          createData.email = lead.email;
        }

        // Set phone if available (from either telephone or phone field)
        if (lead.profile_whatsapp || lead.telephone || lead.phone) {
          createData.phone = lead.profile_whatsapp || lead.telephone || lead.phone;
        }

        // Set address fields if available
        if (lead.address)  createData.address  = lead.address;
        if (lead.city)     createData.city     = lead.city;
        if (lead.state)    createData.state    = lead.state;
        if (lead.country)  createData.country  = lead.country;
        if (lead.postcode) createData.postcode = lead.postcode;

        // Set source-specific fields
        if (isInstagram) {
          createData.profile_instagram       = lead.profile_instagram || '';
          createData.profile_photo_instagram = lead.profile_photo_instagram || '';

        } else if (isFacebook) {
          createData.profile_facebook       = lead.profile_facebook || '';
          createData.profile_photo_facebook = lead.profile_photo_facebook || '';

        } else if (isWhatsapp) {
          createData.profile_whatsapp       = lead.profile_whatsapp || '';
          createData.profile_photo_whatsapp = lead.photo_url_whatsapp || '';

        } else {
          // LinkedIn or other sources
          createData.linkedin_profile       = lead.profile_linkedin || '';
          createData.linkedin_profile_photo = lead.profile_photo_linkedin || '';
          createData.linkedin_handle        = lead.linkedin_handle || '';
        }

        // Console log the createData for debugging
        console.log('Creating lead with data:', LeadService.bigIntSerializer(createData));

        // Create new lead
        const newLead = await prisma.tblLead.create({
          data: createData,
        });

        newLeadsCount++;
        newLeads.push(newLead.id.toString());

        if (pipelineStageId && pipelineStageId != "undefined") {  // Extension sends string "undefined" if no pipeline was specified

          try {
            // Add follow-up date if provided
            const pipelineData: any = {
              lead_id: newLead.id,
              assigned_user: BigInt(userId),
              pipelinestage_id: BigInt(pipelineStageId),
            };

            if (leadDateFollowUp) {
              pipelineData.followup_date = new Date(leadDateFollowUp);
              console.log(`app/lib/leadService.ts | Setting a followup date: ${pipelineData.followup_date}`)
            } else {
              // If no explicit followup date was provided, calculate it from the pipeline stage settings
              try {
                // Get the pipeline stage to access its followup settings
                const stageSettings = await prisma.tblPipelineStage.findUnique({
                  where: { id: BigInt(pipelineStageId) },
                  select: { followup_num: true, followup_unit: true }
                });

                // If the stage has followup settings, calculate and set the followup date
                if (stageSettings && stageSettings.followup_num && stageSettings.followup_unit) {
                  const calculatedDate = LeadService.calculateFollowUpDate(
                    stageSettings.followup_num,
                    stageSettings.followup_unit
                  );

                  pipelineData.followup_date = calculatedDate;
                  console.log(`app/lib/leadService.ts | Setting calculated followup date from stage settings: ${calculatedDate}`);
                }
              } catch (stageError) {
                console.error('Error getting pipeline stage settings for followup date:', stageError);
                // Continue without setting a followup date if there's an error
              }
            }

            console.log(`Connecting new lead ${newLead.id} to pipeline stage ${pipelineStageId}:`, LeadService.bigIntSerializer(pipelineData));

            // Create the pipeline lead entry
            const pipelineLead = await prisma.tblPipelineLead.create({
              data: pipelineData,
            });


            // Add tags if any
            if (leadTags.length > 0 && pipelineLead) {
              for (const tagName of leadTags) {
                try {
                  // Find or create tag
                  let tag = await prisma.tblTag.findFirst({
                    where: {
                      name: tagName,
                      account_id: BigInt(accountId)
                    },
                  });

                  if (!tag) {
                    tag = await prisma.tblTag.create({
                      data: {
                        name: tagName,
                        color: this.generateRandomColor(),
                        account_id: BigInt(accountId)
                      },
                    });
                  }

                  // Create tag association
                  await prisma.tblPipelineLeadTag.create({
                    data: {
                      tag_id: tag.id,
                      pipelinelead_id: pipelineLead.id,
                    },
                  });
                } catch (tagError) {
                  console.error('Error processing tag:', tagError);
                  // Continue with next tag
                }
              }
            }
          } catch (pipelineError) {
            console.error(`Error creating pipeline lead for lead ${newLead.id}:`, pipelineError);
          }
        }

      } catch (error) {
        console.error('Error adding lead:', error);
        // Continue with next lead
      }
    }

    return {
      existing_leads_total: existingLeadsCount,
      new_leads_total: newLeadsCount,
      existing_leads: existingLeads,
      new_leads: newLeads,
    };
  }

  /**
   * Generate a random color for tags
   */
  static generateRandomColor(): string {
    const letters = '0123456789ABCDEF';
    let color = '';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }
}