import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, pgEnum, jsonb, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["CLEANER", "INSPECTOR", "PM", "ADMIN", "OWNER"]);
export const inspectionTypeEnum = pgEnum("inspection_type", ["FULL_INSPECTION", "ONBOARDING"]);
export const taskStatusEnum = pgEnum("task_status", ["ASSIGNED", "IN_PROGRESS", "SUBMITTED", "REVIEWED", "ARCHIVED"]);
export const checklistResultEnum = pgEnum("checklist_result", ["PASS", "FAIL", "NA", "YES", "NO", "MISSING", "NEED_REPLACEMENT", "GOOD"]);
export const severityEnum = pgEnum("severity", ["LOW", "MED", "HIGH"]);
export const mediaTypeEnum = pgEnum("media_type", ["PHOTO", "VIDEO"]);
export const quickReportStatusEnum = pgEnum("quick_report_status", ["NEW", "ACKNOWLEDGED", "RESOLVED"]);
export const damageLocationEnum = pgEnum("damage_location", ["KITCHEN", "BATHROOM", "BEDROOM", "LIVING_ROOM", "HALLWAY", "BALCONY", "EXTERIOR", "OTHER"]);
export const damageSeverityEnum = pgEnum("damage_severity", ["MINOR", "MODERATE", "SEVERE"]);
export const notificationTypeEnum = pgEnum("notification_type", ["QUICK_REPORT", "INSPECTION_SUBMITTED", "INSPECTION_ASSIGNED"]);
export const mediaCategoryEnum = pgEnum("media_category", [
  // Videos - Part 1 tasks
  "VIDEO_WALKTHROUGH",
  "VIDEO_ENTRANCE_ELEVATOR",
  "VIDEO_PARKING_ENTRANCE",
  "VIDEO_PARKING_ACCESS",
  "VIDEO_THERMOSTAT",
  "VIDEO_GARBAGE_RECYCLING",
  "VIDEO_SPECIAL_INSTRUCTIONS",
  "VIDEO_TV_DEMO",
  "VIDEO_BALCONY_DOORS",
  "VIDEO_WINDOWS_OPENING",
  // Photos - Part 1 tasks
  "PHOTO_AC_FILTER",
  "PHOTO_FAUCET_BRANDS",
  "PHOTO_APPLIANCE_MODELS",
  "PHOTO_WIFI_MODEM",
  "PHOTO_FUSE_BOX",
  "PHOTO_VACUUM",
  "PHOTO_KEY_FOB",
  "PHOTO_BALCONY_OUTDOOR",
  // Generic
  "OTHER"
]);

export const unitStatusEnum = pgEnum("unit_status", ["ONBOARDING", "ACTIVE"]);

// Users table
export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("CLEANER"),
  pmTag: text("pm_tag"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Units table
export const units = pgTable("units", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  propertyName: text("property_name").notNull(),
  unitNumber: text("unit_number").notNull(),
  address: text("address").notNull(),
  notes: text("notes"),
  pmTag: text("pm_tag"),
  bedroomCount: integer("bedroom_count"),
  bathroomCount: integer("bathroom_count"),
  hasDen: boolean("has_den"),
  isActive: boolean("is_active").notNull().default(true),
  unitStatus: unitStatusEnum("unit_status").notNull().default("ACTIVE"),
  ownerUserId: varchar("owner_user_id", { length: 36 }).references(() => users.id),
  ownerName: text("owner_name"),
  ownerEmail: text("owner_email"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Inspection templates
export const inspectionTemplates = pgTable("inspection_templates", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: inspectionTypeEnum("type").notNull(),
  rooms: jsonb("rooms").notNull().$type<TemplateRoom[]>(),
  version: integer("version").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Inspection tasks
export const inspectionTasks = pgTable("inspection_tasks", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  type: inspectionTypeEnum("type").notNull(),
  unitId: varchar("unit_id", { length: 36 }).notNull().references(() => units.id),
  assignedToUserId: varchar("assigned_to_user_id", { length: 36 }).notNull().references(() => users.id),
  responsiblePmId: varchar("responsible_pm_id", { length: 36 }).references(() => users.id),
  templateId: varchar("template_id", { length: 36 }).references(() => inspectionTemplates.id),
  scheduledAt: timestamp("scheduled_at"),
  status: taskStatusEnum("status").notNull().default("ASSIGNED"),
  reportPdfUrl: text("report_pdf_url"),
  createdById: varchar("created_by_id", { length: 36 }).notNull().references(() => users.id),
  bedroomCount: integer("bedroom_count"),
  bathroomCount: integer("bathroom_count"),
  keySetsProvided: integer("key_sets_provided"),
  hasDen: boolean("has_den"),
  bathroomTypes: text("bathroom_types"),
  keyTypes: text("key_types"),
  guestName: text("guest_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Checklist responses
export const checklistResponses = pgTable("checklist_responses", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  inspectionTaskId: varchar("inspection_task_id", { length: 36 }).notNull().references(() => inspectionTasks.id),
  roomKey: text("room_key").notNull(),
  itemKey: text("item_key").notNull(),
  result: checklistResultEnum("result").notNull(),
  notes: text("notes"),
  severity: severityEnum("severity"),
  requiredMediaSatisfied: boolean("required_media_satisfied").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Media
export const media = pgTable("media", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  inspectionTaskId: varchar("inspection_task_id", { length: 36 }).references(() => inspectionTasks.id),
  checklistResponseId: varchar("checklist_response_id", { length: 36 }).references(() => checklistResponses.id),
  quickReportId: varchar("quick_report_id", { length: 36 }),
  unitId: varchar("unit_id", { length: 36 }).references(() => units.id),
  category: mediaCategoryEnum("category"),
  type: mediaTypeEnum("type").notNull(),
  url: text("url").notNull(),
  timestampCapturedAt: timestamp("timestamp_captured_at"),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

// Quick reports
export const quickReports = pgTable("quick_reports", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  unitNumber: text("unit_number").notNull(),
  createdById: varchar("created_by_id", { length: 36 }).notNull().references(() => users.id),
  responsiblePmId: varchar("responsible_pm_id", { length: 36 }).notNull().references(() => users.id),
  location: damageLocationEnum("location").notNull(),
  locationDetails: text("location_details"),
  description: text("description").notNull(),
  severity: damageSeverityEnum("severity").notNull(),
  pmNotes: text("pm_notes"),
  cleaningNotes: text("cleaning_notes"),
  status: quickReportStatusEnum("status").notNull().default("NEW"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  linkUrl: text("link_url"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Email logs
export const emailLogs = pgTable("email_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  toEmail: text("to_email").notNull(),
  subject: text("subject").notNull(),
  bodyText: text("body_text").notNull(),
  relatedQuickReportId: varchar("related_quick_report_id", { length: 36 }),
  relatedInspectionTaskId: varchar("related_inspection_task_id", { length: 36 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Audit logs
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  actorUserId: varchar("actor_user_id", { length: 36 }).references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  meta: jsonb("meta").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Properties table
export const properties = pgTable("properties", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  nickname: text("nickname").notNull().unique(),
  title: text("title").notNull(),
  address: text("address").notNull(),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  photoUrl: text("photo_url"),
  assignedPmId: varchar("assigned_pm_id", { length: 36 }).references(() => users.id),
  owners: jsonb("owners").$type<{ name: string; email: string }[]>().default([]),
  importedById: varchar("imported_by_id", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// PM Notes (internal notes on units, visible only to PM/Admin)
export const pmNotes = pgTable("pm_notes", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  unitId: varchar("unit_id", { length: 36 }).notNull().references(() => units.id),
  createdById: varchar("created_by_id", { length: 36 }).notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Owner report enums
export const issueCategoryPriorityEnum = pgEnum("issue_category_priority", ["HIGH", "LOWER"]);
export const ownerReportStatusEnum = pgEnum("owner_report_status", ["DRAFT", "FINALIZED", "SENT"]);
export const issueStatusEnum = pgEnum("issue_status", ["OPEN", "IN_PROGRESS", "COMPLETED"]);
export const ownerResponseEnum = pgEnum("owner_response", ["LEAVE_AS_IS", "ILL_REPLACE", "PLEASE_FIX", "PROCEED_PURCHASE"]);

// Issue Categories (global PM categories for classifying inspection findings)
export const issueCategories = pgTable("issue_categories", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6b7280"),
  sortOrder: integer("sort_order").notNull().default(0),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Owner Reports (assembled from categorized inspection items)
export const ownerReports = pgTable("owner_reports", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  inspectionTaskId: varchar("inspection_task_id", { length: 36 }).notNull().references(() => inspectionTasks.id),
  unitId: varchar("unit_id", { length: 36 }).notNull().references(() => units.id),
  createdById: varchar("created_by_id", { length: 36 }).notNull().references(() => users.id),
  ownerName: text("owner_name").notNull().default(""),
  ownerEmail: text("owner_email"),
  shareToken: text("share_token").notNull(),
  status: ownerReportStatusEnum("status").notNull().default("DRAFT"),
  amazonCartLink: text("amazon_cart_link"),
  closingMessage: text("closing_message"),
  customNotes: text("custom_notes"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Owner Report Items (individual categorized inspection items in the report)
export const ownerReportItems = pgTable("owner_report_items", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  ownerReportId: varchar("owner_report_id", { length: 36 }).notNull().references(() => ownerReports.id),
  checklistResponseId: varchar("checklist_response_id", { length: 36 }).references(() => checklistResponses.id),
  categoryId: varchar("category_id", { length: 36 }).notNull().references(() => issueCategories.id),
  priority: issueCategoryPriorityEnum("priority").default("LOWER"),
  roomName: text("room_name").notNull(),
  itemName: text("item_name").notNull(),
  description: text("description"),
  repairQuote: text("repair_quote"),
  estimatedCost: text("estimated_cost"),
  mediaUrls: jsonb("media_urls").$type<string[]>().default([]),
  sortOrder: integer("sort_order").notNull().default(0),
  ownerResponse: ownerResponseEnum("owner_response"),
  issueStatus: issueStatusEnum("issue_status").notNull().default("OPEN"),
  pmNote: text("pm_note"),
  vendorName: text("vendor_name"),
  vendorLink: text("vendor_link"),
  itemPrice: text("item_price"),
  handymanQuote: text("handyman_quote"),
  handymanCost: text("handyman_cost"),
  vendorServiceFee: boolean("vendor_service_fee").default(false),
  repairOptions: jsonb("repair_options").$type<{ id: string; label: string; vendor?: string; cost: string; description?: string }[]>().default([]),
  pmOwnerNote: text("pm_owner_note"),
  statusUpdatedAt: timestamp("status_updated_at"),
  ownerComment: text("owner_comment"),
  ownerRespondedAt: timestamp("owner_responded_at"),
  bundleId: varchar("bundle_id", { length: 36 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Owner Report Bundles (group items under a single service quote)
export const ownerReportBundles = pgTable("owner_report_bundles", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  ownerReportId: varchar("owner_report_id", { length: 36 }).notNull().references(() => ownerReports.id),
  categoryId: varchar("category_id", { length: 36 }).references(() => issueCategories.id),
  name: text("name").notNull(),
  estimatedCost: text("estimated_cost"),
  repairQuote: text("repair_quote"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Form field type enum for the form builder
export const formFieldTypeEnum = pgEnum("form_field_type", [
  "RADIO_GROUP",
  "CHECKBOX",
  "DROPDOWN",
  "MULTI_SELECT",
  "FILE_UPLOAD",
  "SINGLE_LINE_INPUT",
  "LONG_TEXT",
  "AUTO_FILL",
  "CONDITION_DROPDOWN",
  "COUNT_INPUT",
  "MODEL_NUMBER",
  "LOCATION_INPUT",
  "EXISTS_TOGGLE",
  "ACTION_NEEDED",
  "ISSUE_BADGES"
]);

// Form Templates (PM-created custom inspection forms)
// Note: Using generic types for JSON columns to avoid circular reference issues with recursive InspectionBlock.children
export const formTemplates = pgTable("form_templates", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: inspectionTypeEnum("type").notNull(),
  fields: jsonb("fields").notNull().default([]), // Legacy - kept for backward compatibility
  areas: jsonb("areas").notNull().default([]), // InspectionArea[] at runtime
  unitIds: text("unit_ids").array().notNull().default([]),
  createdById: varchar("created_by_id", { length: 36 }).notNull().references(() => users.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Owner Onboarding status enum
export const onboardingStatusEnum = pgEnum("onboarding_status", ["PENDING", "IN_PROGRESS", "COMPLETED"]);
export const propertyTypeEnum = pgEnum("property_type", ["HOUSE", "UNIT"]);

// Owner Onboarding Questionnaire (sent by PM to owner for unit onboarding)
export const ownerOnboardings = pgTable("owner_onboardings", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  unitId: varchar("unit_id", { length: 36 }).notNull().references(() => units.id),
  createdById: varchar("created_by_id", { length: 36 }).notNull().references(() => users.id),
  ownerName: text("owner_name").notNull().default(""),
  ownerEmail: text("owner_email"),
  shareToken: text("share_token").notNull().unique(),
  status: onboardingStatusEnum("status").notNull().default("PENDING"),
  propertyType: propertyTypeEnum("property_type"),
  currentStep: integer("current_step").notNull().default(0),
  responses: jsonb("responses").notNull().default({}).$type<Record<string, any>>(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Inspection block types available for each item
export type InspectionBlockType = 
  | "CONDITION"      // Good/Fair/Damaged dropdown
  | "ACTION_NEEDED"  // None/Needs Cleaning/Needs Fixing/Needs Replacement
  | "ISSUES"         // Multi-select issue badges
  | "COUNT"          // Numeric count (total and damaged)
  | "MODEL_NUMBER"   // Model number input
  | "NOTES"          // Text notes
  | "PHOTOS_VIDEOS"  // Photo/video upload
  | "EXISTS"         // Yes/No checkbox
  // Custom form fields (generic)
  | "RADIO"          // Radio button group
  | "CHECKBOX"       // Checkbox field
  | "DROPDOWN"       // Dropdown select
  | "MULTI_SELECT"   // Multi-select field
  | "AUTO_FILL"      // Auto-fill suggestions
  | "LOCATION";      // Location input

// Inspection block within an item (can have nested children)
export interface InspectionBlock {
  id: string;
  type: InspectionBlockType;
  enabled: boolean;
  order: number;
  label?: string;
  options?: string[];
  placeholder?: string;
  trueLabel?: string;
  falseLabel?: string;
  children?: InspectionBlock[];
}

// Item within an area (e.g., Couch, TV, Sink)
export interface InspectionItem {
  id: string;
  name: string;
  blocks: InspectionBlock[];
}

// Area in the inspection template (e.g., Living Room, Kitchen)
export interface InspectionArea {
  id: string;
  name: string;
  items: InspectionItem[];
}

// Legacy support - keep FormField for backward compatibility
export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  defaultValue?: string;
  helpText?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  section?: string;
}

export type FormFieldType = 
  | "RADIO_GROUP"
  | "CHECKBOX"
  | "DROPDOWN"
  | "MULTI_SELECT"
  | "FILE_UPLOAD"
  | "SINGLE_LINE_INPUT"
  | "LONG_TEXT"
  | "AUTO_FILL"
  | "CONDITION_DROPDOWN"
  | "COUNT_INPUT"
  | "MODEL_NUMBER"
  | "LOCATION_INPUT"
  | "EXISTS_TOGGLE"
  | "ACTION_NEEDED"
  | "ISSUE_BADGES";

// Template types
export interface TemplateItem {
  key: string;
  label: string;
  required: boolean;
  inputType: "PASS_FAIL" | "YES_NO" | "CONDITION";
  requiresNoteOnFail?: boolean;
  requiresMedia: boolean;
}

export interface TemplateRoom {
  key: string;
  name: string;
  items: TemplateItem[];
}

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertUnitSchema = createInsertSchema(units).omit({
  id: true,
  createdAt: true,
});

export const insertInspectionTemplateSchema = createInsertSchema(inspectionTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertInspectionTaskSchema = createInsertSchema(inspectionTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChecklistResponseSchema = createInsertSchema(checklistResponses).omit({
  id: true,
  createdAt: true,
});

export const insertMediaSchema = createInsertSchema(media).omit({
  id: true,
  uploadedAt: true,
});

export const insertQuickReportSchema = createInsertSchema(quickReports).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertPmNoteSchema = createInsertSchema(pmNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIssueCategorySchema = createInsertSchema(issueCategories).omit({
  id: true,
  createdAt: true,
});

export const insertOwnerReportSchema = createInsertSchema(ownerReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOwnerReportItemSchema = createInsertSchema(ownerReportItems, {
  mediaUrls: z.any(),
  repairOptions: z.any(),
}).omit({
  id: true,
  createdAt: true,
});

export const insertOwnerReportBundleSchema = createInsertSchema(ownerReportBundles).omit({
  id: true,
  createdAt: true,
});

export const insertOwnerOnboardingSchema = createInsertSchema(ownerOnboardings, {
  responses: z.any(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Use z.any() for areas field to avoid circular reference issues with recursive InspectionBlock.children
export const insertFormTemplateSchema = createInsertSchema(formTemplates, {
  areas: z.any(),
  fields: z.any(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPropertySchema = createInsertSchema(properties, {
  tags: z.array(z.string()),
}).omit({
  id: true,
  createdAt: true,
});

// Inspection Drafts (server-side autosave)
export const inspectionDrafts = pgTable("inspection_drafts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  inspectionType: varchar("inspection_type").notNull().default("ONBOARDING"),
  draftData: jsonb("draft_data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertInspectionDraftSchema = createInsertSchema(inspectionDrafts, {
  draftData: z.any(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Workflow Phase type enum
export const phaseTypeEnum = pgEnum("phase_type", ["SYSTEM", "MANUAL"]);

// Workflow Phases (admin-configurable onboarding workflow template)
export const workflowPhases = pgTable("workflow_phases", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  phaseType: phaseTypeEnum("phase_type").notNull().default("MANUAL"),
  systemKey: text("system_key"),
  dependencies: jsonb("dependencies").$type<string[]>().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Workflow Sub-Tasks (checklist items within a phase)
export const workflowSubTasks = pgTable("workflow_sub_tasks", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  phaseId: varchar("phase_id", { length: 36 }).notNull().references(() => workflowPhases.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Unit Onboarding Checklist (PM-toggled sub-task completion per unit)
export const unitOnboardingChecklist = pgTable("unit_onboarding_checklist", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  unitId: varchar("unit_id", { length: 36 }).notNull().references(() => units.id),
  subTaskId: varchar("sub_task_id", { length: 36 }).notNull().references(() => workflowSubTasks.id, { onDelete: "cascade" }),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  completedById: varchar("completed_by_id", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("unit_subtask_unique_idx").on(table.unitId, table.subTaskId),
]);

export const insertWorkflowPhaseSchema = createInsertSchema(workflowPhases, {
  dependencies: z.array(z.string()).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export const insertWorkflowSubTaskSchema = createInsertSchema(workflowSubTasks).omit({
  id: true,
  createdAt: true,
});

export const insertUnitOnboardingChecklistSchema = createInsertSchema(unitOnboardingChecklist).omit({
  id: true,
  createdAt: true,
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["CLEANER", "INSPECTOR", "PM", "ADMIN", "OWNER"]).optional(),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type Unit = typeof units.$inferSelect;
export type InsertInspectionTemplate = z.infer<typeof insertInspectionTemplateSchema>;
export type InspectionTemplate = typeof inspectionTemplates.$inferSelect;
export type InsertInspectionTask = z.infer<typeof insertInspectionTaskSchema>;
export type InspectionTask = typeof inspectionTasks.$inferSelect;
export type InsertChecklistResponse = z.infer<typeof insertChecklistResponseSchema>;
export type ChecklistResponse = typeof checklistResponses.$inferSelect;
export type InsertMedia = z.infer<typeof insertMediaSchema>;
export type Media = typeof media.$inferSelect;
export type InsertQuickReport = z.infer<typeof insertQuickReportSchema>;
export type QuickReport = typeof quickReports.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertPmNote = z.infer<typeof insertPmNoteSchema>;
export type PmNote = typeof pmNotes.$inferSelect;
export type InsertFormTemplate = z.infer<typeof insertFormTemplateSchema>;
export type FormTemplate = typeof formTemplates.$inferSelect;
export type InsertIssueCategory = z.infer<typeof insertIssueCategorySchema>;
export type IssueCategory = typeof issueCategories.$inferSelect;
export type InsertOwnerReport = z.infer<typeof insertOwnerReportSchema>;
export type OwnerReport = typeof ownerReports.$inferSelect;
export type InsertOwnerReportItem = z.infer<typeof insertOwnerReportItemSchema>;
export type OwnerReportItem = typeof ownerReportItems.$inferSelect;
export type InsertOwnerReportBundle = z.infer<typeof insertOwnerReportBundleSchema>;
export type OwnerReportBundle = typeof ownerReportBundles.$inferSelect;
export type InsertOwnerOnboarding = z.infer<typeof insertOwnerOnboardingSchema>;
export type OwnerOnboarding = typeof ownerOnboardings.$inferSelect;

export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;

export type InsertInspectionDraft = z.infer<typeof insertInspectionDraftSchema>;
export type InspectionDraft = typeof inspectionDrafts.$inferSelect;

export type InsertWorkflowPhase = z.infer<typeof insertWorkflowPhaseSchema>;
export type WorkflowPhase = typeof workflowPhases.$inferSelect;
export type InsertWorkflowSubTask = z.infer<typeof insertWorkflowSubTaskSchema>;
export type WorkflowSubTask = typeof workflowSubTasks.$inferSelect;
export type InsertUnitOnboardingChecklist = z.infer<typeof insertUnitOnboardingChecklistSchema>;
export type UnitOnboardingChecklist = typeof unitOnboardingChecklist.$inferSelect;

export type PhaseType = "SYSTEM" | "MANUAL";

// User role type
export type UserRole = "CLEANER" | "INSPECTOR" | "PM" | "ADMIN" | "OWNER";
export type IssueStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED";
export type InspectionType = "FULL_INSPECTION" | "ONBOARDING";
export type TaskStatus = "ASSIGNED" | "IN_PROGRESS" | "SUBMITTED" | "REVIEWED" | "ARCHIVED";
export type ChecklistResult = "PASS" | "FAIL" | "NA" | "YES" | "NO" | "MISSING" | "NEED_REPLACEMENT" | "GOOD";
export type Severity = "LOW" | "MED" | "HIGH";
export type MediaType = "PHOTO" | "VIDEO";
export type MediaCategory = 
  | "VIDEO_WALKTHROUGH" | "VIDEO_ENTRANCE_ELEVATOR" | "VIDEO_PARKING_ENTRANCE" 
  | "VIDEO_PARKING_ACCESS" | "VIDEO_THERMOSTAT" | "VIDEO_GARBAGE_RECYCLING"
  | "VIDEO_SPECIAL_INSTRUCTIONS" | "VIDEO_TV_DEMO" | "VIDEO_BALCONY_DOORS" | "VIDEO_WINDOWS_OPENING"
  | "PHOTO_AC_FILTER" | "PHOTO_FAUCET_BRANDS" | "PHOTO_APPLIANCE_MODELS" 
  | "PHOTO_WIFI_MODEM" | "PHOTO_FUSE_BOX" | "PHOTO_VACUUM" | "PHOTO_KEY_FOB" | "PHOTO_BALCONY_OUTDOOR"
  | "OTHER";
export type QuickReportStatus = "NEW" | "ACKNOWLEDGED" | "RESOLVED";
export type OwnerResponseType = "LEAVE_AS_IS" | "ILL_REPLACE" | "PLEASE_FIX" | "PROCEED_PURCHASE";
export type NotificationType = "QUICK_REPORT" | "INSPECTION_SUBMITTED" | "INSPECTION_ASSIGNED";
