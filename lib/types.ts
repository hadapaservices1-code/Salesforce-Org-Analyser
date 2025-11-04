import { z } from 'zod';

// Salesforce OAuth Types
export const SalesforceAuthSchema = z.object({
  accessToken: z.string(),
  instanceUrl: z.string(),
  refreshToken: z.string().optional(),
});

export type SalesforceAuth = z.infer<typeof SalesforceAuthSchema>;

// Org Info Types
export interface OrgInfo {
  id: string;
  organizationType: string;
  edition: string;
  instanceName: string;
  limits: Record<string, { Max: number; Remaining: number }>;
  licenses: Record<string, { Total: number; Used: number }>;
  userCount: number;
}

// Schema Types
export interface ObjectMetadata {
  name: string;
  label: string;
  keyPrefix: string;
  recordCount: number;
  fields: FieldMetadata[];
  relationships: RelationshipMetadata[];
}

export interface FieldMetadata {
  name: string;
  label: string;
  type: string;
  required: boolean;
  unique: boolean;
  lookupTarget?: string;
  picklistValues?: string[];
}

export interface RelationshipMetadata {
  name: string;
  type: string;
  childObject: string;
  field: string;
}

// Automation Types
export interface FlowMetadata {
  id: string;
  name: string;
  label: string;
  status: string;
  version: number;
}

export interface TriggerMetadata {
  name: string;
  object: string;
  status: string;
  bodyLength: number;
}

export interface ValidationRuleMetadata {
  name: string;
  object: string;
  active: boolean;
  errorMessage: string;
}

// Reporting Types
export interface ReportMetadata {
  id: string;
  name: string;
  folder: string;
  type: string;
}

export interface DashboardMetadata {
  id: string;
  name: string;
  folder: string;
}

export interface LayoutMetadata {
  name: string;
  object: string;
  recordType?: string;
}

// Ownership Types
export interface ProfileMetadata {
  id: string;
  name: string;
  userLicense: string;
  objectPermissions: Record<string, {
    read: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  }>;
}

export interface RoleMetadata {
  id: string;
  name: string;
  parentRole?: string;
  userCount: number;
}

export interface QueueMetadata {
  id: string;
  name: string;
  objectType: string;
  memberCount: number;
}

export interface SharingRuleMetadata {
  name: string;
  object: string;
  type: string;
  criteria?: string;
}

export interface PermissionSetMetadata {
  id: string;
  name: string;
  label: string;
  description?: string;
  userCount: number;
  license?: string;
}

// Migration Blocker Types
export interface MigrationBlocker {
  type: 'autonumber' | 'automation_density' | 'large_object' | 'profile_mismatch';
  severity: 'high' | 'medium' | 'low';
  object?: string;
  message: string;
  recommendation: string;
}

// Scan Output Types
export interface ScanOutput {
  orgInfo: OrgInfo;
  objects: ObjectMetadata[];
  picklists: Record<string, string[]>;
  recordTypes: Record<string, string[]>;
  flows: FlowMetadata[];
  triggers: TriggerMetadata[];
  validationRules: ValidationRuleMetadata[];
  profiles: ProfileMetadata[];
  roles: RoleMetadata[];
  queues: QueueMetadata[];
  sharingRules: SharingRuleMetadata[];
  permissionSets: PermissionSetMetadata[];
  reports: ReportMetadata[];
  dashboards: DashboardMetadata[];
  layouts: LayoutMetadata[];
  blockers: MigrationBlocker[];
  scannedAt: string;
  scanDuration: number;
}

// Database Types
export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface Org {
  id: string;
  userId: string;
  orgId: string;
  orgName: string;
  instanceUrl: string;
  edition: string;
  refreshTokenEncrypted?: string;
  createdAt: string;
}

export interface Scan {
  id: string;
  orgId: string;
  rawJson: ScanOutput;
  createdAt: string;
}
