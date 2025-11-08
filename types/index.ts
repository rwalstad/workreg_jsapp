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

export interface tblMessageTemplate {
  id: bigint;
  msg: string | null;
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

