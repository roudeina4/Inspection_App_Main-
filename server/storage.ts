import { db } from "./db";
import { eq, desc, and, isNull, inArray } from "drizzle-orm";
import {
  users,
  units,
  inspectionTemplates,
  inspectionTasks,
  checklistResponses,
  media,
  quickReports,
  notifications,
  emailLogs,
  auditLogs,
  pmNotes,
  formTemplates,
  issueCategories,
  ownerReports,
  ownerReportItems,
  ownerReportBundles,
  type User,
  type InsertUser,
  type Unit,
  type InsertUnit,
  type InspectionTemplate,
  type InsertInspectionTemplate,
  type InspectionTask,
  type InsertInspectionTask,
  type ChecklistResponse,
  type InsertChecklistResponse,
  type Media,
  type InsertMedia,
  type QuickReport,
  type InsertQuickReport,
  type Notification,
  type InsertNotification,
  type EmailLog,
  type InsertEmailLog,
  type AuditLog,
  type InsertAuditLog,
  type PmNote,
  type InsertPmNote,
  type FormTemplate,
  type InsertFormTemplate,
  type IssueCategory,
  type InsertIssueCategory,
  type OwnerReport,
  type InsertOwnerReport,
  type OwnerReportItem,
  type InsertOwnerReportItem,
  type OwnerReportBundle,
  type InsertOwnerReportBundle,
  ownerOnboardings,
  type OwnerOnboarding,
  type InsertOwnerOnboarding,
  properties,
  type Property,
  type InsertProperty,
  inspectionDrafts,
  type InspectionDraft,
  type InsertInspectionDraft,
  workflowPhases,
  workflowSubTasks,
  unitOnboardingChecklist,
  type WorkflowPhase,
  type InsertWorkflowPhase,
  type WorkflowSubTask,
  type InsertWorkflowSubTask,
  type UnitOnboardingChecklist,
  type InsertUnitOnboardingChecklist,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPmTag(pmTag: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;

  // Units
  getUnit(id: string): Promise<Unit | undefined>;
  createUnit(unit: InsertUnit): Promise<Unit>;
  updateUnit(id: string, data: Partial<InsertUnit>): Promise<Unit | undefined>;
  deleteUnit(id: string): Promise<void>;
  getUnits(): Promise<Unit[]>;

  // Templates
  getTemplate(id: string): Promise<InspectionTemplate | undefined>;
  getTemplateByType(type: string): Promise<InspectionTemplate | undefined>;
  createTemplate(template: InsertInspectionTemplate): Promise<InspectionTemplate>;
  getTemplates(): Promise<InspectionTemplate[]>;

  // Inspection Tasks
  getInspectionTask(id: string): Promise<InspectionTask | undefined>;
  createInspectionTask(task: InsertInspectionTask): Promise<InspectionTask>;
  updateInspectionTask(id: string, data: Partial<InsertInspectionTask>): Promise<InspectionTask | undefined>;
  getInspectionTasks(): Promise<InspectionTask[]>;
  getInspectionTasksByUser(userId: string): Promise<InspectionTask[]>;
  getInspectionTasksByPm(pmId: string): Promise<InspectionTask[]>;

  // Checklist Responses
  createChecklistResponse(response: InsertChecklistResponse): Promise<ChecklistResponse>;
  getChecklistResponsesByTask(taskId: string): Promise<ChecklistResponse[]>;

  // Media
  createMedia(mediaItem: InsertMedia): Promise<Media>;
  getMediaByTask(taskId: string): Promise<Media[]>;
  getMediaByQuickReport(reportId: string): Promise<Media[]>;
  getMediaByUnit(unitId: string): Promise<Media[]>;
  getAllMedia(): Promise<Media[]>;

  // Quick Reports
  getQuickReport(id: string): Promise<QuickReport | undefined>;
  createQuickReport(report: InsertQuickReport): Promise<QuickReport>;
  updateQuickReport(id: string, data: Partial<InsertQuickReport>): Promise<QuickReport | undefined>;
  getQuickReports(): Promise<QuickReport[]>;
  getQuickReportsByPm(pmId: string): Promise<QuickReport[]>;

  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  getUnreadNotificationsByUser(userId: string): Promise<Notification[]>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;

  // Email Logs
  createEmailLog(log: InsertEmailLog): Promise<EmailLog>;

  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  // PM Notes
  getPmNote(id: string): Promise<PmNote | undefined>;
  createPmNote(note: InsertPmNote): Promise<PmNote>;
  updatePmNote(id: string, content: string): Promise<PmNote | undefined>;
  deletePmNote(id: string): Promise<void>;
  getPmNotesByUnit(unitId: string): Promise<PmNote[]>;

  // Form Templates
  getFormTemplate(id: string): Promise<FormTemplate | undefined>;
  createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate>;
  updateFormTemplate(id: string, data: Partial<InsertFormTemplate>): Promise<FormTemplate | undefined>;
  deleteFormTemplate(id: string): Promise<void>;
  getFormTemplates(): Promise<FormTemplate[]>;
  getFormTemplatesByType(type: string): Promise<FormTemplate[]>;

  // Issue Categories
  getIssueCategories(): Promise<IssueCategory[]>;
  getIssueCategory(id: string): Promise<IssueCategory | undefined>;
  createIssueCategory(category: InsertIssueCategory): Promise<IssueCategory>;
  updateIssueCategory(id: string, data: Partial<InsertIssueCategory>): Promise<IssueCategory | undefined>;
  deleteIssueCategory(id: string): Promise<void>;

  // Owner Reports
  getOwnerReport(id: string): Promise<OwnerReport | undefined>;
  getOwnerReportByToken(token: string): Promise<OwnerReport | undefined>;
  getOwnerReportByInspection(inspectionTaskId: string): Promise<OwnerReport | undefined>;
  createOwnerReport(report: InsertOwnerReport): Promise<OwnerReport>;
  updateOwnerReport(id: string, data: Partial<InsertOwnerReport>): Promise<OwnerReport | undefined>;
  getOwnerReports(): Promise<OwnerReport[]>;

  // Owner Report Items
  getOwnerReportItems(reportId: string): Promise<OwnerReportItem[]>;
  createOwnerReportItem(item: InsertOwnerReportItem): Promise<OwnerReportItem>;
  updateOwnerReportItem(id: string, data: Partial<InsertOwnerReportItem>): Promise<OwnerReportItem | undefined>;
  deleteOwnerReportItem(id: string): Promise<void>;
  deleteOwnerReportItemsByReport(reportId: string): Promise<void>;

  // Owner Report Bundles
  getBundlesForReport(reportId: string): Promise<OwnerReportBundle[]>;
  createBundle(bundle: InsertOwnerReportBundle): Promise<OwnerReportBundle>;
  updateBundle(id: string, data: Partial<InsertOwnerReportBundle>): Promise<OwnerReportBundle | undefined>;
  deleteBundle(id: string): Promise<void>;
  addItemsToBundle(bundleId: string, itemIds: string[]): Promise<void>;
  removeItemFromBundle(itemId: string): Promise<void>;

  // Owner Onboardings
  getAllOwnerOnboardings(): Promise<OwnerOnboarding[]>;
  getOwnerOnboarding(id: string): Promise<OwnerOnboarding | undefined>;
  getOwnerOnboardingByToken(token: string): Promise<OwnerOnboarding | undefined>;
  getOwnerOnboardingsByUnit(unitId: string): Promise<OwnerOnboarding[]>;
  createOwnerOnboarding(data: InsertOwnerOnboarding): Promise<OwnerOnboarding>;
  updateOwnerOnboarding(id: string, data: Partial<InsertOwnerOnboarding>): Promise<OwnerOnboarding | undefined>;

  // Properties
  getProperties(): Promise<Property[]>;
  getProperty(id: string): Promise<Property | undefined>;
  getPropertyByNickname(nickname: string): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, data: Partial<InsertProperty>): Promise<Property | undefined>;
  getPropertiesByTag(tag: string): Promise<Property[]>;

  // Inspection Drafts
  getInspectionDraftsByUser(userId: string): Promise<InspectionDraft[]>;
  getInspectionDraft(id: string): Promise<InspectionDraft | undefined>;
  upsertInspectionDraft(userId: string, inspectionType: string, draftData: any): Promise<InspectionDraft>;
  deleteInspectionDraft(id: string): Promise<void>;
  deleteInspectionDraftsByUser(userId: string): Promise<void>;

  // Workflow Phases
  getWorkflowPhases(): Promise<WorkflowPhase[]>;
  getWorkflowPhase(id: string): Promise<WorkflowPhase | undefined>;
  createWorkflowPhase(phase: InsertWorkflowPhase): Promise<WorkflowPhase>;
  updateWorkflowPhase(id: string, data: Partial<InsertWorkflowPhase>): Promise<WorkflowPhase | undefined>;
  deleteWorkflowPhase(id: string): Promise<void>;

  // Workflow Sub-Tasks
  getWorkflowSubTasks(phaseId: string): Promise<WorkflowSubTask[]>;
  getAllWorkflowSubTasks(): Promise<WorkflowSubTask[]>;
  createWorkflowSubTask(subTask: InsertWorkflowSubTask): Promise<WorkflowSubTask>;
  updateWorkflowSubTask(id: string, data: Partial<InsertWorkflowSubTask>): Promise<WorkflowSubTask | undefined>;
  deleteWorkflowSubTask(id: string): Promise<void>;

  // Unit Onboarding Checklist
  getUnitChecklist(unitId: string): Promise<UnitOnboardingChecklist[]>;
  toggleChecklistItem(unitId: string, subTaskId: string, completed: boolean, userId: string): Promise<UnitOnboardingChecklist>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByPmTag(pmTag: string): Promise<User | undefined> {
    const normalized = pmTag.toLowerCase().trim();
    const allUsers = await db.select().from(users);
    return allUsers.find(u => u.pmTag?.toLowerCase().trim() === normalized);
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, role as any)).orderBy(users.name);
  }

  // Units
  async getUnit(id: string): Promise<Unit | undefined> {
    const [unit] = await db.select().from(units).where(eq(units.id, id));
    return unit;
  }

  async createUnit(unit: InsertUnit): Promise<Unit> {
    const [created] = await db.insert(units).values(unit).returning();
    return created;
  }

  async updateUnit(id: string, data: Partial<InsertUnit>): Promise<Unit | undefined> {
    const [updated] = await db.update(units).set(data).where(eq(units.id, id)).returning();
    return updated;
  }

  async deleteUnit(id: string): Promise<void> {
    await db.update(units).set({ isActive: false }).where(eq(units.id, id));
  }

  async getUnits(): Promise<Unit[]> {
    return db.select().from(units).where(eq(units.isActive, true)).orderBy(units.propertyName);
  }

  // Templates
  async getTemplate(id: string): Promise<InspectionTemplate | undefined> {
    const [template] = await db.select().from(inspectionTemplates).where(eq(inspectionTemplates.id, id));
    return template;
  }

  async getTemplateByType(type: string): Promise<InspectionTemplate | undefined> {
    const [template] = await db
      .select()
      .from(inspectionTemplates)
      .where(and(eq(inspectionTemplates.type, type as any), eq(inspectionTemplates.isActive, true)))
      .orderBy(desc(inspectionTemplates.version))
      .limit(1);
    return template;
  }

  async createTemplate(template: InsertInspectionTemplate): Promise<InspectionTemplate> {
    const [created] = await db.insert(inspectionTemplates).values(template as any).returning();
    return created;
  }

  async getTemplates(): Promise<InspectionTemplate[]> {
    return db.select().from(inspectionTemplates).where(eq(inspectionTemplates.isActive, true));
  }

  // Inspection Tasks
  async getInspectionTask(id: string): Promise<InspectionTask | undefined> {
    const [task] = await db.select().from(inspectionTasks).where(eq(inspectionTasks.id, id));
    return task;
  }

  async createInspectionTask(task: InsertInspectionTask): Promise<InspectionTask> {
    const [created] = await db.insert(inspectionTasks).values(task).returning();
    return created;
  }

  async updateInspectionTask(id: string, data: Partial<InsertInspectionTask>): Promise<InspectionTask | undefined> {
    const [updated] = await db
      .update(inspectionTasks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(inspectionTasks.id, id))
      .returning();
    return updated;
  }

  async getInspectionTasks(): Promise<InspectionTask[]> {
    return db.select().from(inspectionTasks).orderBy(desc(inspectionTasks.createdAt));
  }

  async getInspectionTasksByUser(userId: string): Promise<InspectionTask[]> {
    return db
      .select()
      .from(inspectionTasks)
      .where(eq(inspectionTasks.assignedToUserId, userId))
      .orderBy(desc(inspectionTasks.createdAt));
  }

  async getInspectionTasksByPm(pmId: string): Promise<InspectionTask[]> {
    return db
      .select()
      .from(inspectionTasks)
      .where(eq(inspectionTasks.responsiblePmId, pmId))
      .orderBy(desc(inspectionTasks.createdAt));
  }

  // Checklist Responses
  async createChecklistResponse(response: InsertChecklistResponse): Promise<ChecklistResponse> {
    const [created] = await db.insert(checklistResponses).values(response).returning();
    return created;
  }

  async getChecklistResponsesByTask(taskId: string): Promise<ChecklistResponse[]> {
    return db
      .select()
      .from(checklistResponses)
      .where(eq(checklistResponses.inspectionTaskId, taskId));
  }

  // Media
  async createMedia(mediaItem: InsertMedia): Promise<Media> {
    const [created] = await db.insert(media).values(mediaItem).returning();
    return created;
  }

  async getMediaByTask(taskId: string): Promise<Media[]> {
    return db.select().from(media).where(eq(media.inspectionTaskId, taskId));
  }

  async getMediaByQuickReport(reportId: string): Promise<Media[]> {
    return db.select().from(media).where(eq(media.quickReportId, reportId));
  }

  async getMediaByUnit(unitId: string): Promise<Media[]> {
    return db.select().from(media).where(eq(media.unitId, unitId)).orderBy(desc(media.uploadedAt));
  }

  async getAllMedia(): Promise<Media[]> {
    return db.select().from(media).orderBy(desc(media.uploadedAt));
  }

  // Quick Reports
  async getQuickReport(id: string): Promise<QuickReport | undefined> {
    const [report] = await db.select().from(quickReports).where(eq(quickReports.id, id));
    return report;
  }

  async createQuickReport(report: InsertQuickReport): Promise<QuickReport> {
    const [created] = await db.insert(quickReports).values(report).returning();
    return created;
  }

  async updateQuickReport(id: string, data: Partial<InsertQuickReport>): Promise<QuickReport | undefined> {
    const [updated] = await db.update(quickReports).set(data).where(eq(quickReports.id, id)).returning();
    return updated;
  }

  async getQuickReports(): Promise<QuickReport[]> {
    return db.select().from(quickReports).orderBy(desc(quickReports.createdAt));
  }

  async getQuickReportsByPm(pmId: string): Promise<QuickReport[]> {
    return db
      .select()
      .from(quickReports)
      .where(eq(quickReports.responsiblePmId, pmId))
      .orderBy(desc(quickReports.createdAt));
  }

  // Notifications
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationsByUser(userId: string): Promise<Notification[]> {
    return db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationRead(id: string): Promise<void> {
    await db.update(notifications).set({ readAt: new Date() }).where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  }

  // Email Logs
  async createEmailLog(log: InsertEmailLog): Promise<EmailLog> {
    const [created] = await db.insert(emailLogs).values(log).returning();
    return created;
  }

  // Audit Logs
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [created] = await db.insert(auditLogs).values(log).returning();
    return created;
  }

  // PM Notes
  async getPmNote(id: string): Promise<PmNote | undefined> {
    const [note] = await db.select().from(pmNotes).where(eq(pmNotes.id, id));
    return note;
  }

  async createPmNote(note: InsertPmNote): Promise<PmNote> {
    const [created] = await db.insert(pmNotes).values(note).returning();
    return created;
  }

  async updatePmNote(id: string, content: string): Promise<PmNote | undefined> {
    const [updated] = await db
      .update(pmNotes)
      .set({ content, updatedAt: new Date() })
      .where(eq(pmNotes.id, id))
      .returning();
    return updated;
  }

  async deletePmNote(id: string): Promise<void> {
    await db.delete(pmNotes).where(eq(pmNotes.id, id));
  }

  async getPmNotesByUnit(unitId: string): Promise<PmNote[]> {
    return db
      .select()
      .from(pmNotes)
      .where(eq(pmNotes.unitId, unitId))
      .orderBy(desc(pmNotes.createdAt));
  }

  // Form Templates
  async getFormTemplate(id: string): Promise<FormTemplate | undefined> {
    const [template] = await db.select().from(formTemplates).where(eq(formTemplates.id, id));
    return template;
  }

  async createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate> {
    const [created] = await db.insert(formTemplates).values(template as any).returning();
    return created;
  }

  async updateFormTemplate(id: string, data: Partial<InsertFormTemplate>): Promise<FormTemplate | undefined> {
    const [updated] = await db
      .update(formTemplates)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(formTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteFormTemplate(id: string): Promise<void> {
    await db.delete(formTemplates).where(eq(formTemplates.id, id));
  }

  async getFormTemplates(): Promise<FormTemplate[]> {
    return db
      .select()
      .from(formTemplates)
      .where(eq(formTemplates.isActive, true))
      .orderBy(desc(formTemplates.createdAt));
  }

  async getFormTemplatesByType(type: string): Promise<FormTemplate[]> {
    return db
      .select()
      .from(formTemplates)
      .where(and(eq(formTemplates.type, type as any), eq(formTemplates.isActive, true)))
      .orderBy(desc(formTemplates.createdAt));
  }

  // Issue Categories
  async getIssueCategories(): Promise<IssueCategory[]> {
    return db.select().from(issueCategories).where(eq(issueCategories.isActive, true)).orderBy(issueCategories.sortOrder);
  }

  async getIssueCategory(id: string): Promise<IssueCategory | undefined> {
    const [cat] = await db.select().from(issueCategories).where(eq(issueCategories.id, id));
    return cat;
  }

  async createIssueCategory(category: InsertIssueCategory): Promise<IssueCategory> {
    const [created] = await db.insert(issueCategories).values(category).returning();
    return created;
  }

  async updateIssueCategory(id: string, data: Partial<InsertIssueCategory>): Promise<IssueCategory | undefined> {
    const [updated] = await db.update(issueCategories).set(data).where(eq(issueCategories.id, id)).returning();
    return updated;
  }

  async deleteIssueCategory(id: string): Promise<void> {
    await db.update(issueCategories).set({ isActive: false }).where(eq(issueCategories.id, id));
  }

  // Owner Reports
  async getOwnerReport(id: string): Promise<OwnerReport | undefined> {
    const [report] = await db.select().from(ownerReports).where(eq(ownerReports.id, id));
    return report;
  }

  async getOwnerReportByToken(token: string): Promise<OwnerReport | undefined> {
    const [report] = await db.select().from(ownerReports).where(eq(ownerReports.shareToken, token));
    return report;
  }

  async getOwnerReportByInspection(inspectionTaskId: string): Promise<OwnerReport | undefined> {
    const [report] = await db.select().from(ownerReports).where(eq(ownerReports.inspectionTaskId, inspectionTaskId));
    return report;
  }

  async createOwnerReport(report: InsertOwnerReport): Promise<OwnerReport> {
    const [created] = await db.insert(ownerReports).values(report).returning();
    return created;
  }

  async updateOwnerReport(id: string, data: Partial<InsertOwnerReport>): Promise<OwnerReport | undefined> {
    const [updated] = await db.update(ownerReports).set({ ...data, updatedAt: new Date() }).where(eq(ownerReports.id, id)).returning();
    return updated;
  }

  async getOwnerReports(): Promise<OwnerReport[]> {
    return db.select().from(ownerReports).orderBy(desc(ownerReports.createdAt));
  }

  // Owner Report Items
  async getOwnerReportItems(reportId: string): Promise<OwnerReportItem[]> {
    return db.select().from(ownerReportItems).where(eq(ownerReportItems.ownerReportId, reportId)).orderBy(ownerReportItems.sortOrder);
  }

  async createOwnerReportItem(item: InsertOwnerReportItem): Promise<OwnerReportItem> {
    const [created] = await db.insert(ownerReportItems).values(item as any).returning();
    return created;
  }

  async updateOwnerReportItem(id: string, data: Partial<InsertOwnerReportItem>): Promise<OwnerReportItem | undefined> {
    const [updated] = await db.update(ownerReportItems).set(data as any).where(eq(ownerReportItems.id, id)).returning();
    return updated;
  }

  async deleteOwnerReportItem(id: string): Promise<void> {
    await db.delete(ownerReportItems).where(eq(ownerReportItems.id, id));
  }

  async deleteOwnerReportItemsByReport(reportId: string): Promise<void> {
    await db.delete(ownerReportItems).where(eq(ownerReportItems.ownerReportId, reportId));
  }

  // Owner Report Bundles
  async getBundlesForReport(reportId: string): Promise<OwnerReportBundle[]> {
    return db.select().from(ownerReportBundles).where(eq(ownerReportBundles.ownerReportId, reportId)).orderBy(ownerReportBundles.sortOrder);
  }

  async createBundle(bundle: InsertOwnerReportBundle): Promise<OwnerReportBundle> {
    const [created] = await db.insert(ownerReportBundles).values(bundle).returning();
    return created;
  }

  async updateBundle(id: string, data: Partial<InsertOwnerReportBundle>): Promise<OwnerReportBundle | undefined> {
    const [updated] = await db.update(ownerReportBundles).set(data).where(eq(ownerReportBundles.id, id)).returning();
    return updated;
  }

  async deleteBundle(id: string): Promise<void> {
    await db.update(ownerReportItems).set({ bundleId: null }).where(eq(ownerReportItems.bundleId, id));
    await db.delete(ownerReportBundles).where(eq(ownerReportBundles.id, id));
  }

  async addItemsToBundle(bundleId: string, itemIds: string[]): Promise<void> {
    if (itemIds.length === 0) return;
    await db.update(ownerReportItems).set({ bundleId }).where(inArray(ownerReportItems.id, itemIds));
  }

  async removeItemFromBundle(itemId: string): Promise<void> {
    await db.update(ownerReportItems).set({ bundleId: null }).where(eq(ownerReportItems.id, itemId));
  }

  // Owner Onboardings
  async getAllOwnerOnboardings(): Promise<OwnerOnboarding[]> {
    return db.select().from(ownerOnboardings).orderBy(desc(ownerOnboardings.createdAt));
  }

  async getOwnerOnboarding(id: string): Promise<OwnerOnboarding | undefined> {
    const [onboarding] = await db.select().from(ownerOnboardings).where(eq(ownerOnboardings.id, id));
    return onboarding;
  }

  async getOwnerOnboardingByToken(token: string): Promise<OwnerOnboarding | undefined> {
    const [onboarding] = await db.select().from(ownerOnboardings).where(eq(ownerOnboardings.shareToken, token));
    return onboarding;
  }

  async getOwnerOnboardingsByUnit(unitId: string): Promise<OwnerOnboarding[]> {
    return db.select().from(ownerOnboardings).where(eq(ownerOnboardings.unitId, unitId)).orderBy(desc(ownerOnboardings.createdAt));
  }

  async createOwnerOnboarding(data: InsertOwnerOnboarding): Promise<OwnerOnboarding> {
    const [created] = await db.insert(ownerOnboardings).values(data as any).returning();
    return created;
  }

  async updateOwnerOnboarding(id: string, data: Partial<InsertOwnerOnboarding>): Promise<OwnerOnboarding | undefined> {
    const [updated] = await db.update(ownerOnboardings).set({ ...data as any, updatedAt: new Date() }).where(eq(ownerOnboardings.id, id)).returning();
    return updated;
  }

  // Properties
  async getProperties(): Promise<Property[]> {
    return db.select().from(properties).orderBy(desc(properties.createdAt));
  }

  async getProperty(id: string): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property;
  }

  async getPropertyByNickname(nickname: string): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.nickname, nickname));
    return property;
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const values = {
      ...property,
      owners: property.owners ? [...property.owners] : property.owners,
    } satisfies typeof properties.$inferInsert;
    const [created] = await db.insert(properties).values(values).returning();
    return created;
  }

  async updateProperty(id: string, data: Partial<InsertProperty>): Promise<Property | undefined> {
    const [updated] = await db.update(properties).set(data as any).where(eq(properties.id, id)).returning();
    return updated;
  }

  async getPropertiesByTag(tag: string): Promise<Property[]> {
    const allProps = await db.select().from(properties).orderBy(desc(properties.createdAt));
    return allProps.filter(p => p.tags.includes(tag));
  }

  async getInspectionDraftsByUser(userId: string): Promise<InspectionDraft[]> {
    return db.select().from(inspectionDrafts).where(eq(inspectionDrafts.userId, userId)).orderBy(desc(inspectionDrafts.updatedAt));
  }

  async getInspectionDraft(id: string): Promise<InspectionDraft | undefined> {
    const [draft] = await db.select().from(inspectionDrafts).where(eq(inspectionDrafts.id, id));
    return draft;
  }

  async upsertInspectionDraft(userId: string, inspectionType: string, draftData: any): Promise<InspectionDraft> {
    const existing = await db.select().from(inspectionDrafts)
      .where(and(eq(inspectionDrafts.userId, userId), eq(inspectionDrafts.inspectionType, inspectionType)));
    if (existing.length > 0) {
      const [updated] = await db.update(inspectionDrafts)
        .set({ draftData, updatedAt: new Date() })
        .where(eq(inspectionDrafts.id, existing[0].id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(inspectionDrafts).values({ userId, inspectionType, draftData }).returning();
    return created;
  }

  async deleteInspectionDraft(id: string): Promise<void> {
    await db.delete(inspectionDrafts).where(eq(inspectionDrafts.id, id));
  }

  async deleteInspectionDraftsByUser(userId: string): Promise<void> {
    await db.delete(inspectionDrafts).where(eq(inspectionDrafts.userId, userId));
  }

  // Workflow Phases
  async getWorkflowPhases(): Promise<WorkflowPhase[]> {
    return db.select().from(workflowPhases).where(eq(workflowPhases.isActive, true)).orderBy(workflowPhases.sortOrder);
  }

  async getWorkflowPhase(id: string): Promise<WorkflowPhase | undefined> {
    const [phase] = await db.select().from(workflowPhases).where(eq(workflowPhases.id, id));
    return phase;
  }

  async createWorkflowPhase(phase: InsertWorkflowPhase): Promise<WorkflowPhase> {
    const [created] = await db.insert(workflowPhases).values(phase).returning();
    return created;
  }

  async updateWorkflowPhase(id: string, data: Partial<InsertWorkflowPhase>): Promise<WorkflowPhase | undefined> {
    const [updated] = await db.update(workflowPhases).set(data as any).where(eq(workflowPhases.id, id)).returning();
    return updated;
  }

  async deleteWorkflowPhase(id: string): Promise<void> {
    await db.update(workflowPhases).set({ isActive: false }).where(eq(workflowPhases.id, id));
  }

  // Workflow Sub-Tasks
  async getWorkflowSubTasks(phaseId: string): Promise<WorkflowSubTask[]> {
    return db.select().from(workflowSubTasks).where(eq(workflowSubTasks.phaseId, phaseId)).orderBy(workflowSubTasks.sortOrder);
  }

  async getAllWorkflowSubTasks(): Promise<WorkflowSubTask[]> {
    return db.select().from(workflowSubTasks).orderBy(workflowSubTasks.sortOrder);
  }

  async createWorkflowSubTask(subTask: InsertWorkflowSubTask): Promise<WorkflowSubTask> {
    const [created] = await db.insert(workflowSubTasks).values(subTask).returning();
    return created;
  }

  async updateWorkflowSubTask(id: string, data: Partial<InsertWorkflowSubTask>): Promise<WorkflowSubTask | undefined> {
    const [updated] = await db.update(workflowSubTasks).set(data as any).where(eq(workflowSubTasks.id, id)).returning();
    return updated;
  }

  async deleteWorkflowSubTask(id: string): Promise<void> {
    await db.delete(workflowSubTasks).where(eq(workflowSubTasks.id, id));
  }

  // Unit Onboarding Checklist
  async getUnitChecklist(unitId: string): Promise<UnitOnboardingChecklist[]> {
    return db.select().from(unitOnboardingChecklist).where(eq(unitOnboardingChecklist.unitId, unitId));
  }

  async toggleChecklistItem(unitId: string, subTaskId: string, completed: boolean, userId: string): Promise<UnitOnboardingChecklist> {
    const [result] = await db.insert(unitOnboardingChecklist)
      .values({ unitId, subTaskId, completed, completedAt: completed ? new Date() : null, completedById: completed ? userId : null })
      .onConflictDoUpdate({
        target: [unitOnboardingChecklist.unitId, unitOnboardingChecklist.subTaskId],
        set: { completed, completedAt: completed ? new Date() : null, completedById: completed ? userId : null },
      })
      .returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
