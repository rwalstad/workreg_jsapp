export interface tblUser {
  id: bigint;
  email: string;
  fname: string | null;
  lname: string | null;
  created: Date;
  profile_picture: string | null;
  access_level: number;
  password: string | null;
  last_activity: Date;
}
export interface AccountWithName {
  account_id: bigint;
  access_level: number | null;//the usrid accesslvl to system
  tblAccount: {
    name: string | null;
  };
}
export interface tblAccount {
  id: bigint;
  name: string | null;
  subscription: string | null;
  created: Date;
  last_activity: Date;
}

export interface tblAccountUser {
  account_id: bigint;
  user_id: bigint;
  access_level: number | null;
}

export interface tblPipeline {
  id: bigint;
  name: string;
  account_id: bigint;
  created: Date;
  icon?: string;       // Optional icon field
  description?: string; // Optional description field
}

export interface tblInvitation {
  id: bigint;
  email: string;
  account_id: bigint;
  expires: Date;
  status: string | null;
  role: number | null;
  created: Date;
}

export interface tblEmailVerification {
  id: bigint;
  email: string;
  otp: string;
  expires: Date;
  verified: number;
  created: Date;
}

export interface tblAccountFeature {
  id: bigint;
  account_id: bigint;
  feature_code: string;
  is_active: number | null;
  purchased_date: Date | null;
  expiry_date: Date | null;
  created_at: Date | null;
}

export interface tblFeature {
  id: bigint;
  feature_code: string;
  feature_name: string;
  feature_description: string | null;
  base_tier: string;
  is_addon: number | null;
  addon_price: number | null;
  created_at: Date | null;
  category: string | null;
  default_config: string | null;
  platform_id: bigint | null;
  icon: string | null;
}

export interface tblActionMessage {
  message_id: bigint;
  pipeline_action_id: bigint | null;
  msg: string | null;
}

export interface tblAutomationStatus {
  account_id: bigint;
  user_id: bigint;
  platform_id: bigint;
  status: string | null;
}

export interface tblComment {
  id: bigint;
  object_type: string | null;
  object_id: bigint | null;
}

export interface tblGlobalSystemConfig {
  id: bigint;
  data: string | null;
}

export interface tblLead {
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
}

export interface tblLeadStatus {
  id: bigint;
  name: string | null;
  color: string | null;
}

export interface tblMessageTemplate {
  id: bigint;
  msg: string | null;
}

export interface tblPipelineStageAction {
  id: bigint;
  action_id: bigint | null;
  pipeline_stage_id: bigint | null;
  config: string | null;
}

export interface tblPipelineLead {
  id: bigint;
  lead_id: bigint | null;
  assigned_user: bigint | null;
  pipelinestage_id: bigint | null;
  followup_date: Date | null;
}

export interface tblPipelineLeadTag {
  tag_id: bigint;
  pipelinelead_id: bigint;
}
export interface PipelineWstages {
  id: string;
  name: string;
  account_id: string;
  description?: string;
  icon?: string;
  created: string;
  stages_order?: string;
  stages?: PipelineStageWactions[];
};
export interface PipelineStageWactions {
  id: string;
  title: string;
  pipeline_id: string;
  color?: string;
  order_index?: number;
  followup_num?: number;
  followup_unit?: string;
  actions?: PipelineStageAction[];
};
export interface PipelineStageAction {
  id: string;
  action_id?: string;
  pipeline_stage_id?: string;
  config?: string;
  order_index?: number;
  feature?: {
    feature_name: string;
    icon?: string;
  };
};

// Define a more flexible StageAction type
export interface StageActionWfeature {
    id: string;
    feature?: {
        feature_name: string;
        [key: string]: any; // Allow other feature properties
    };
    [key: string]: any; // Allow other properties
}
export interface tblPipelineStage {
  id: bigint;
  name: string | null;
  followup_num: number | null;
  followup_unit: string | null;
  pipeline_id: bigint | null;
  color: string | null;
  order_index: bigint | null;
}
export interface StageDataWactions {
  id: string;
  title: string;
  color: string;
  order_index:number;
  count: number;
  conversion: {
    rate: number;
    moved: number;
    total: number;
  };
  actions: string[]; // Array of action IDs
}
export interface tblPlatform {
  id: bigint;
  name: string | null;
  prefix: string | null;
  icon: string | null;
}

export interface tblTag {
  id: bigint;
  name: string | null;
  color: string | null;
}

export interface SessionWaccount {
  user?: {
    id: bigint;
    email: string;
    name?: string | null;
    accounts?: {
      id: bigint;
      name: string;
      rights: number;
    }[];
  };
}

// Pipeline types for the UI
export interface PipelineData {
  id: string;
  name: string;
  account_id: string;
  created: Date;
  description: string;
  icon: string;
}

export interface AutomationAction {
  id: string;
  name: string;
  icon: string;
  category: string;
  description?: string;
  default_config: string;
}

export interface LeadData {
  id: string;
  fname?: string;
  lname?: string;
  email?: string;
  phone?: string;
  status?: string;
  sales_value?: number;
  linkedin_profile?: string;
  linkedin_profile_photo?: string;
  last_contact?: Date;
  score?: number;
}