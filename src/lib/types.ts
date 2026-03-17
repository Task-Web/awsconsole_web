// State metadata - tracks versioning and timestamps
export interface StateMeta {
  created_at: string;
  updated_at: string;
  version: number;
  type: string;
}

// File metadata for uploaded files
export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  filename: string;
  uploaded_at?: string;
}

// Default data structure - allows any keys for AWS console state
export interface DefaultStateData {
  [key: string]: unknown;
}

// User state with envelope structure (meta, data, note)
// Generic T allows per-project typing of the data field
export interface UserState<T extends Record<string, unknown> = DefaultStateData> {
  meta: StateMeta;
  data: T;
  note: string | null;
}

// API response for state endpoints
export interface StateResponse<T extends Record<string, unknown> = DefaultStateData> {
  user_id: string;
  state: UserState<T>;
}

// Request body for PUT /api/state
export interface StateRequest<T extends Record<string, unknown> = Record<string, unknown>> {
  data: T;
  note?: string | null;
  meta?: Partial<StateMeta>;
}

// Request body for PATCH /api/state
export interface StatePatchRequest<T extends Record<string, unknown> = Record<string, unknown>> {
  data: Partial<T>;
  note?: string | null;
}

// Input for replaceState - allows partial meta
export interface ReplaceStateInput<T extends Record<string, unknown> = Record<string, unknown>> {
  data?: T;
  note?: string | null;
  meta?: Partial<StateMeta>;
}

// System info response
export interface InfoResponse {
  app_name: string;
  node_version: string;
  env: Record<string, string>;
  request: Record<string, unknown>;
}

export function createDefaultStateData(): DefaultStateData {
  // Import the AWS default data at runtime to avoid circular dependencies
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getDefaultData } = require("@/components/aws/store/dataManager");
  return getDefaultData();
}

export function createDefaultState(): UserState<DefaultStateData> {
  const now = new Date().toISOString();
  return {
    meta: {
      created_at: now,
      updated_at: now,
      version: 1,
      type: "unrestricted",
    },
    data: createDefaultStateData(),
    note: null,
  };
}
