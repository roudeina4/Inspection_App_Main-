import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import jwt from "jsonwebtoken";
import PDFDocument from "pdfkit";
import { storage } from "./storage";
import { loginSchema, registerSchema, insertUnitSchema, insertInspectionTaskSchema, insertPmNoteSchema, type TemplateRoom, type FormFieldType } from "@shared/schema";
import { z } from "zod";
import { randomUUID, createHash } from "crypto";
import path from "path";
import fs from "fs";
import multer from "multer";
import { translateChecklistNotes, translateNotesToEnglish } from "./translate";

const JWT_SECRET = process.env.SESSION_SECRET || "tba-inspection-jwt-secret";
const JWT_EXPIRES_IN = "7d";

// Simple password hashing for demo (use bcrypt in production)
function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// Generate JWT token
function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token
function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

// Extract user ID from JWT or session (JWT takes priority for pure API clients)
function getUserIdFromRequest(req: Request): string | null {
  // Check Authorization header for JWT FIRST (supports pure API clients)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (payload?.userId) {
      return payload.userId;
    }
  }
  
  // Fall back to session for web clients
  if (req.session?.userId) {
    return req.session.userId;
  }
  
  return null;
}

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function isValidPreUploadedUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  if (!url.startsWith("/uploads/")) return false;
  const filename = url.replace("/uploads/", "");
  if (filename.includes("/") || filename.includes("..")) return false;
  return fs.existsSync(path.join(uploadsDir, filename));
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// Session augmentation
declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

// Extended request with userId
interface AuthRequest extends Request {
  userId?: string;
}

// Auth middleware - supports both session and JWT
function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  req.userId = userId;
  next();
}

async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const user = await storage.getUser(userId);
  if (!user || user.role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden" });
  }
  req.userId = userId;
  next();
}

async function requirePmOrAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const user = await storage.getUser(userId);
  if (!user || (user.role !== "ADMIN" && user.role !== "PM")) {
    return res.status(403).json({ message: "Forbidden" });
  }
  req.userId = userId;
  next();
}

// Email service (console logging for dev)
async function sendEmail(to: string, subject: string, body: string, relatedId?: { quickReportId?: string; inspectionTaskId?: string }) {
  console.log(`[EMAIL] To: ${to}`);
  console.log(`[EMAIL] Subject: ${subject}`);
  console.log(`[EMAIL] Body: ${body}`);
  
  await storage.createEmailLog({
    toEmail: to,
    subject,
    bodyText: body,
    relatedQuickReportId: relatedId?.quickReportId,
    relatedInspectionTaskId: relatedId?.inspectionTaskId,
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Session setup
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "tba-inspection-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
  );

  // Serve uploaded files
  app.use("/uploads", (req, res, next) => {
    const filePath = path.join(uploadsDir, req.path);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: "File not found" });
    }
  });

  // =========== AUTH ROUTES ===========
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      
      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        if (existing.role === "OWNER") {
          const updated = await storage.updateUser(existing.id, {
            name: data.name,
            passwordHash: hashPassword(data.password),
          });
          req.session.userId = existing.id;
          const token = generateToken(existing.id);
          return res.json({ user: { ...updated, passwordHash: undefined }, token });
        }
        return res.status(400).json({ message: "Email already registered" });
      }

      const user = await storage.createUser({
        name: data.name,
        email: data.email,
        passwordHash: hashPassword(data.password),
        role: data.role || "CLEANER",
        isActive: true,
      });

      req.session.userId = user.id;
      const token = generateToken(user.id);
      res.json({ user: { ...user, passwordHash: undefined }, token });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Register error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(data.email);
      if (!user || !verifyPassword(data.password, user.passwordHash)) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (!user.isActive) {
        return res.status(401).json({ message: "Account is disabled" });
      }

      req.session.userId = user.id;
      const token = generateToken(user.id);
      res.json({ user: { ...user, passwordHash: undefined }, token });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    res.json({ user: { ...user, passwordHash: undefined } });
  });

  // =========== USERS ROUTES ===========
  app.get("/api/users", requireAuth, async (req, res) => {
    const users = await storage.getUsers();
    res.json(users.map((u) => ({ ...u, passwordHash: undefined })));
  });

  app.get("/api/users/pms", requireAuth, async (req, res) => {
    const admins = await storage.getUsersByRole("ADMIN");
    const pms = await storage.getUsersByRole("PM");
    res.json([...admins, ...pms].map((u) => ({ ...u, passwordHash: undefined })));
  });

  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      
      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const user = await storage.createUser({
        name: data.name,
        email: data.email,
        passwordHash: hashPassword(data.password),
        role: data.role || "CLEANER",
        pmTag: req.body.pmTag || null,
        isActive: true,
      });

      res.json({ ...user, passwordHash: undefined });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates: any = {};
      
      if (req.body.name) updates.name = req.body.name;
      if (req.body.email) updates.email = req.body.email;
      if (req.body.role) updates.role = req.body.role;
      if (typeof req.body.isActive === "boolean") updates.isActive = req.body.isActive;
      if (req.body.password) updates.passwordHash = hashPassword(req.body.password);
      if (req.body.pmTag !== undefined) updates.pmTag = req.body.pmTag || null;

      const user = await storage.updateUser(id, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ ...user, passwordHash: undefined });
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // =========== UNITS ROUTES ===========
  app.get("/api/units", requireAuth, async (req, res) => {
    const units = await storage.getUnits();
    res.json(units);
  });

  app.post("/api/units", requirePmOrAdmin, async (req, res) => {
    try {
      const data = insertUnitSchema.parse(req.body);
      const unit = await storage.createUnit(data);
      res.json(unit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create unit" });
    }
  });

  app.patch("/api/units/:id", requirePmOrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const unit = await storage.updateUnit(id, req.body);
      if (!unit) {
        return res.status(404).json({ message: "Unit not found" });
      }
      res.json(unit);
    } catch (error) {
      res.status(500).json({ message: "Failed to update unit" });
    }
  });

  app.delete("/api/units/:id", requirePmOrAdmin, async (req, res) => {
    await storage.deleteUnit(req.params.id);
    res.json({ message: "Unit deleted" });
  });

  app.post("/api/units/:id/assign-owner", requirePmOrAdmin, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { ownerName, ownerEmail } = req.body;
      if (!ownerEmail) return res.status(400).json({ message: "Owner email is required" });

      const unit = await storage.getUnit(id);
      if (!unit) return res.status(404).json({ message: "Unit not found" });

      let ownerUser = await storage.getUserByEmail(ownerEmail);
      if (!ownerUser) {
        const tempPassword = randomUUID().slice(0, 12);
        ownerUser = await storage.createUser({
          name: ownerName || ownerEmail.split("@")[0],
          email: ownerEmail,
          role: "OWNER",
          passwordHash: hashPassword(tempPassword),
        });
      }

      const updated = await storage.updateUnit(id, {
        ownerUserId: ownerUser.id,
        ownerName: ownerName || ownerUser.name,
        ownerEmail: ownerEmail,
      });

      const existingOnboardings = await storage.getOwnerOnboardingsByUnit(id);
      if (existingOnboardings.length === 0) {
        const shareToken = randomUUID().replace(/-/g, "").slice(0, 24);
        await storage.createOwnerOnboarding({
          unitId: id,
          createdById: req.userId!,
          ownerName: ownerName || ownerUser.name,
          ownerEmail: ownerEmail,
          shareToken,
          status: "PENDING",
          currentStep: 0,
          responses: {},
        });
      }

      res.json({ unit: updated, ownerUser: { id: ownerUser.id, name: ownerUser.name, email: ownerUser.email } });
    } catch (error) {
      console.error("Error assigning owner:", error);
      res.status(500).json({ message: "Failed to assign owner" });
    }
  });

  app.get("/api/unit-pm", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { unitId } = req.query;
      if (!unitId) return res.json({ pmId: null });

      const unit = await storage.getUnit(unitId as string);
      if (!unit) return res.json({ pmId: null });

      const properties = await storage.getProperties();
      const matchedProperty = properties.find(
        (p) => p.nickname === unit.propertyName || p.title === unit.propertyName
      );
      if (!matchedProperty || matchedProperty.tags.length === 0) {
        return res.json({ pmId: null });
      }

      const allUsers = await storage.getUsers();
      const matchedPm = allUsers.find(
        (u) => (u.role === "PM" || u.role === "ADMIN") && u.pmTag && matchedProperty.tags.includes(u.pmTag)
      );

      res.json({ pmId: matchedPm?.id || null, pmName: matchedPm?.name || null });
    } catch (error) {
      console.error("Unit PM lookup error:", error);
      res.json({ pmId: null });
    }
  });

  app.get("/api/validate-pm-property", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { unitId, pmId } = req.query;
      if (!unitId || !pmId) return res.json({ valid: true });

      const unit = await storage.getUnit(unitId as string);
      if (!unit) return res.json({ valid: true });

      const pm = await storage.getUser(pmId as string);
      if (!pm || !pm.pmTag) return res.json({ valid: true });

      const properties = await storage.getProperties();
      const matchedProperty = properties.find(
        (p) => p.nickname === unit.propertyName || p.title === unit.propertyName
      );

      if (!matchedProperty) return res.json({ valid: true });

      const pmManagesProperty = matchedProperty.tags.includes(pm.pmTag);
      res.json({
        valid: pmManagesProperty,
        pmName: pm.name,
        propertyName: matchedProperty.nickname || matchedProperty.title,
      });
    } catch (error) {
      console.error("Validate PM-property error:", error);
      res.json({ valid: true });
    }
  });

  // =========== PROPERTIES ROUTES ===========
  app.get("/api/properties", requirePmOrAdmin, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) return res.status(401).json({ message: "User not found" });

      if (user.role === "ADMIN") {
        const allProperties = await storage.getProperties();
        return res.json(allProperties);
      }

      if (user.pmTag) {
        const filtered = await storage.getPropertiesByTag(user.pmTag);
        return res.json(filtered);
      }

      return res.json([]);
    } catch (error) {
      console.error("Get properties error:", error);
      res.status(500).json({ message: "Failed to get properties" });
    }
  });

  app.post("/api/properties/import", requirePmOrAdmin, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) return res.status(401).json({ message: "User not found" });

      const rows = req.body.rows;
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ message: "No rows to import" });
      }

      const results = { created: 0, skipped: 0, errors: [] as string[] };

      for (const row of rows) {
        const nickname = (row.nickname || row.Nickname || "").trim();
        const title = (row.title || row.Title || "").trim();
        const address = (row.address || row.Address || "").trim();
        const tagsRaw = (row.tags || row.Tags || "").trim();
        const photoUrl = (row.photoUrl || row["Photo URL"] || row.photo_url || "").trim();

        if (!nickname || !title || !address) {
          results.errors.push(`Skipped row: missing nickname, title, or address`);
          results.skipped++;
          continue;
        }

        const existing = await storage.getPropertyByNickname(nickname);
        if (existing) {
          results.skipped++;
          continue;
        }

        const tags = tagsRaw
          .split(",")
          .map((t: string) => t.trim().toLowerCase())
          .filter((t: string) => t.length > 0);

        await storage.createProperty({
          nickname,
          title,
          address,
          tags,
          photoUrl: photoUrl || null,
          importedById: user.id,
        });

        let bedroomCount = 1;
        if (tags.includes("studio")) bedroomCount = 0;
        else if (tags.includes("3 bedroom")) bedroomCount = 3;
        else if (tags.includes("2 bedroom") || tags.includes("2bedroom - economy")) bedroomCount = 2;
        else if (tags.includes("1 bedroom")) bedroomCount = 1;

        const pmTagForUnit = tags.find((t: string) => t.startsWith("user")) || null;

        const existingUnit = await storage.getUnits();
        const unitExists = existingUnit.some(u => u.propertyName === nickname);
        if (!unitExists) {
          await storage.createUnit({
            propertyName: nickname,
            unitNumber: nickname,
            address,
            pmTag: pmTagForUnit,
            bedroomCount,
            bathroomCount: bedroomCount >= 2 ? 2 : 1,
          });
        }

        results.created++;
      }

      res.json(results);
    } catch (error) {
      console.error("Import properties error:", error);
      res.status(500).json({ message: "Failed to import properties" });
    }
  });

  app.get("/api/properties/:id", requirePmOrAdmin, async (req: AuthRequest, res) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) return res.status(404).json({ message: "Property not found" });

      let assignedPm = null;
      if (property.assignedPmId) {
        assignedPm = await storage.getUser(property.assignedPmId);
      }

      res.json({ ...property, assignedPm: assignedPm ? { id: assignedPm.id, name: assignedPm.name, email: assignedPm.email } : null });
    } catch (error) {
      res.status(500).json({ message: "Failed to get property" });
    }
  });

  app.patch("/api/properties/:id", requirePmOrAdmin, async (req: AuthRequest, res) => {
    try {
      const property = await storage.updateProperty(req.params.id, req.body);
      if (!property) return res.status(404).json({ message: "Property not found" });
      res.json(property);
    } catch (error) {
      console.error("Update property error:", error);
      res.status(500).json({ message: "Failed to update property" });
    }
  });

  // =========== TEMPLATES ROUTES ===========
  app.get("/api/templates", requireAuth, async (req, res) => {
    const templates = await storage.getTemplates();
    res.json(templates);
  });

  app.get("/api/templates/full-inspection", requireAuth, async (req, res) => {
    const template = await storage.getTemplateByType("FULL_INSPECTION");
    if (template && template.rooms) {
      const hasUnitSupplies = (template.rooms as any[]).some((r: any) => r.key === "unit_supplies");
      if (!hasUnitSupplies) {
        (template.rooms as any[]).push({
          key: "unit_supplies",
          name: "Unit Supplies",
          items: [
            { key: "toilet_paper", label: "Toilet Paper", required: true, inputType: "YES_NO", requiresMedia: false },
            { key: "dishwasher_pods", label: "Dishwasher Pods", required: true, inputType: "YES_NO", requiresMedia: false },
            { key: "laundry_pods", label: "Laundry Pods", required: true, inputType: "YES_NO", requiresMedia: false },
            { key: "coffee_pods", label: "Coffee Pods", required: true, inputType: "YES_NO", requiresMedia: false },
            { key: "garbage_bags", label: "Garbage Bags", required: true, inputType: "YES_NO", requiresMedia: false },
            { key: "paper_towel", label: "Paper Towel", required: true, inputType: "YES_NO", requiresMedia: false },
          ],
        });
      }
    }
    res.json(template || null);
  });

  app.get("/api/templates/onboarding", requireAuth, async (req, res) => {
    const template = await storage.getTemplateByType("ONBOARDING");
    res.json(template || null);
  });

  // =========== FORM TEMPLATES ROUTES (PM-created custom forms) ===========
  app.get("/api/form-templates", requirePmOrAdmin, async (req, res) => {
    const { type } = req.query;
    const templates = type 
      ? await storage.getFormTemplatesByType(type as string)
      : await storage.getFormTemplates();
    res.json(templates);
  });

  app.get("/api/form-templates/:id", requirePmOrAdmin, async (req, res) => {
    const template = await storage.getFormTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({ message: "Form template not found" });
    }
    res.json(template);
  });

  const formFieldSchema = z.object({
    id: z.string(),
    type: z.string(),
    label: z.string(),
    required: z.boolean(),
    placeholder: z.string().optional(),
    options: z.array(z.string()).optional(),
    defaultValue: z.string().optional(),
    helpText: z.string().optional(),
    validation: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional(),
    }).optional(),
    section: z.string().optional(),
  });

  const inspectionBlockSchema: z.ZodType<any> = z.object({
    id: z.string(),
    type: z.enum(["CONDITION", "ACTION_NEEDED", "ISSUES", "COUNT", "MODEL_NUMBER", "NOTES", "PHOTOS_VIDEOS", "EXISTS", "RADIO", "CHECKBOX", "DROPDOWN", "MULTI_SELECT", "AUTO_FILL", "LOCATION"]),
    enabled: z.boolean(),
    order: z.number(),
    label: z.string().optional(),
    options: z.array(z.string()).optional(),
    placeholder: z.string().optional(),
    trueLabel: z.string().optional(),
    falseLabel: z.string().optional(),
    children: z.lazy(() => z.array(inspectionBlockSchema)).optional(),
  });

  const inspectionItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    blocks: z.array(inspectionBlockSchema),
  });

  const inspectionAreaSchema = z.object({
    id: z.string(),
    name: z.string(),
    items: z.array(inspectionItemSchema),
  });

  const createFormTemplateSchema = z.object({
    name: z.string().min(1, "Name is required"),
    type: z.enum(["ONBOARDING", "FULL_INSPECTION"]),
    fields: z.array(formFieldSchema).optional(),
    areas: z.array(inspectionAreaSchema).optional(),
    unitIds: z.array(z.string()).optional(),
  });

  app.post("/api/form-templates", requirePmOrAdmin, async (req: AuthRequest, res) => {
    try {
      const validation = createFormTemplateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid request data", errors: validation.error.errors });
      }
      const { name, type, fields, areas, unitIds } = validation.data;
      const template = await storage.createFormTemplate({
        name,
        type,
        fields: (fields || []) as any,
        areas: (areas || []) as any,
        unitIds: unitIds || [],
        createdById: req.userId!,
        isActive: true,
      });
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating form template:", error);
      res.status(500).json({ message: "Failed to create form template" });
    }
  });

  const updateFormTemplateSchema = z.object({
    name: z.string().min(1).optional(),
    type: z.enum(["ONBOARDING", "FULL_INSPECTION"]).optional(),
    fields: z.array(formFieldSchema).optional(),
    areas: z.array(inspectionAreaSchema).optional(),
    unitIds: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
  });

  app.patch("/api/form-templates/:id", requirePmOrAdmin, async (req, res) => {
    try {
      const validation = updateFormTemplateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid request data", errors: validation.error.errors });
      }
      const { name, type, fields, areas, unitIds, isActive } = validation.data;
      const template = await storage.updateFormTemplate(req.params.id, {
        ...(name && { name }),
        ...(type && { type }),
        ...(fields && { fields: fields as any }),
        ...(areas && { areas: areas as any }),
        ...(unitIds && { unitIds }),
        ...(isActive !== undefined && { isActive }),
      });
      if (!template) {
        return res.status(404).json({ message: "Form template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error updating form template:", error);
      res.status(500).json({ message: "Failed to update form template" });
    }
  });

  app.delete("/api/form-templates/:id", requirePmOrAdmin, async (req, res) => {
    try {
      await storage.deleteFormTemplate(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting form template:", error);
      res.status(500).json({ message: "Failed to delete form template" });
    }
  });

  // =========== INSPECTION TASKS ROUTES ===========
  app.get("/api/inspection-tasks", requireAuth, async (req: AuthRequest, res) => {
    const user = await storage.getUser(req.userId!);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    let tasks;
    if (user.role === "ADMIN") {
      tasks = await storage.getInspectionTasks();
    } else if (user.role === "PM") {
      tasks = await storage.getInspectionTasksByPm(user.id);
    } else {
      tasks = await storage.getInspectionTasksByUser(user.id);
    }
    res.json(tasks);
  });

  app.get("/api/inspection-tasks/assigned", requireAuth, async (req: AuthRequest, res) => {
    const tasks = await storage.getInspectionTasksByUser(req.userId!);
    res.json(tasks.filter((t) => t.status === "ASSIGNED" || t.status === "IN_PROGRESS"));
  });

  app.post("/api/inspection-tasks", requirePmOrAdmin, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      const data = {
        ...req.body,
        createdById: user!.id,
        status: "ASSIGNED",
      };

      const task = await storage.createInspectionTask(data);

      // Notify assigned user
      const assignee = await storage.getUser(task.assignedToUserId);
      if (assignee) {
        await storage.createNotification({
          userId: assignee.id,
          type: "INSPECTION_ASSIGNED",
          title: "New Inspection Assigned",
          body: `You have been assigned a ${task.type === "FULL_INSPECTION" ? "Full Inspection" : "Onboarding Inspection"}`,
          linkUrl: `/inspection/${task.id}`,
        });
      }

      res.json(task);
    } catch (error) {
      console.error("Create task error:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.get("/api/inspection-tasks/:id", requireAuth, async (req, res) => {
    const task = await storage.getInspectionTask(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.json(task);
  });

  // Get detailed inspection task with all related data
  app.get("/api/inspection-tasks/:id/details", requireAuth, async (req, res) => {
    try {
      const task = await storage.getInspectionTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      const [unit, responses, media, inspector, template] = await Promise.all([
        storage.getUnit(task.unitId),
        storage.getChecklistResponsesByTask(task.id),
        storage.getMediaByTask(task.id),
        storage.getUser(task.assignedToUserId),
        task.templateId ? storage.getTemplate(task.templateId) : null,
      ]);

      const pm = task.responsiblePmId ? await storage.getUser(task.responsiblePmId) : null;

      res.json({
        task,
        unit,
        responses,
        media,
        inspector: inspector ? { id: inspector.id, name: inspector.name, email: inspector.email, role: inspector.role } : null,
        pm: pm ? { id: pm.id, name: pm.name, email: pm.email, role: pm.role } : null,
        template,
      });
    } catch (error) {
      console.error("Error fetching inspection details:", error);
      res.status(500).json({ message: "Failed to fetch inspection details" });
    }
  });

  app.patch("/api/inspection-tasks/:id", requireAuth, async (req, res) => {
    const task = await storage.updateInspectionTask(req.params.id, req.body);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.json(task);
  });

  // =========== QUICK REPORTS ROUTES ===========
  app.get("/api/quick-reports", requireAuth, async (req: AuthRequest, res) => {
    const user = await storage.getUser(req.userId!);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    let reports;
    if (user.role === "ADMIN") {
      reports = await storage.getQuickReports();
    } else if (user.role === "PM") {
      reports = await storage.getQuickReportsByPm(user.id);
    } else {
      reports = await storage.getQuickReports();
    }
    res.json(reports);
  });

  app.post("/api/quick-reports", upload.any(), async (req: AuthRequest, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { 
        unitNumber, 
        responsiblePmId, 
        location, 
        locationDetails, 
        description, 
        severity, 
        pmNotes, 
        cleaningNotes, 
        createdById, 
        mediaCount 
      } = req.body;
      
      if (!unitNumber || !responsiblePmId || !location || !description || !severity) {
        return res.status(400).json({ message: "Missing required fields: unitNumber, responsiblePmId, location, description, severity" });
      }

      if (description.length < 5) {
        return res.status(400).json({ message: "Description must be at least 5 characters" });
      }

      const report = await storage.createQuickReport({
        unitNumber,
        responsiblePmId,
        location,
        locationDetails: locationDetails || null,
        description,
        severity,
        pmNotes: pmNotes || null,
        cleaningNotes: cleaningNotes || null,
        createdById: createdById || userId,
        status: "NEW",
      });

      // Save media files
      const files = req.files as Express.Multer.File[];
      const count = parseInt(mediaCount) || 0;
      
      for (let i = 0; i < count; i++) {
        const file = files.find((f) => f.fieldname === `media_${i}`);
        if (file) {
          const mediaType = req.body[`mediaType_${i}`] === "VIDEO" ? "VIDEO" : "PHOTO";
          const timestamp = req.body[`mediaTimestamp_${i}`];
          
          await storage.createMedia({
            quickReportId: report.id,
            type: mediaType,
            url: `/uploads/${file.filename}`,
            timestampCapturedAt: timestamp ? new Date(timestamp) : new Date(),
          });
        }
      }

      // Notify PM
      const pm = await storage.getUser(responsiblePmId);
      const locationLabel = location.replace(/_/g, " ").toLowerCase();
      if (pm) {
        await storage.createNotification({
          userId: pm.id,
          type: "QUICK_REPORT",
          title: "New Quick Report",
          body: `${severity} damage at Unit ${unitNumber} (${locationLabel}): ${description.substring(0, 100)}`,
          linkUrl: `/portal/quick-reports/${report.id}`,
        });

        await sendEmail(
          pm.email,
          `Quick Report - Unit ${unitNumber} (${severity})`,
          `A new quick report has been submitted.\n\nUnit: ${unitNumber}\nLocation: ${locationLabel}${locationDetails ? ` - ${locationDetails}` : ""}\nSeverity: ${severity}\nDescription: ${description}\n${pmNotes ? `\nNotes for PM: ${pmNotes}` : ""}${cleaningNotes ? `\nCleaning Notes: ${cleaningNotes}` : ""}\n\nView in portal for media attachments.`,
          { quickReportId: report.id }
        );
      }

      res.json(report);
    } catch (error) {
      console.error("Quick report error:", error);
      res.status(500).json({ message: "Failed to submit quick report" });
    }
  });

  app.patch("/api/quick-reports/:id", requireAuth, async (req, res) => {
    const report = await storage.updateQuickReport(req.params.id, req.body);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    res.json(report);
  });

  app.get("/api/quick-reports/:id", requireAuth, async (req, res) => {
    const report = await storage.getQuickReport(req.params.id);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    const mediaItems = await storage.getMediaByQuickReport(report.id);
    res.json({ ...report, media: mediaItems });
  });

  // =========== INSPECTION SUBMISSION ROUTES ===========
  app.post("/api/inspections/full", upload.any(), async (req: AuthRequest, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { unitId, responsiblePmId, createdById, checklistData, mediaCount } = req.body;

      // Create inspection task
      const task = await storage.createInspectionTask({
        type: "FULL_INSPECTION",
        unitId,
        assignedToUserId: createdById || userId,
        responsiblePmId,
        createdById: createdById || userId,
        status: "SUBMITTED",
      });

      // Parse and save checklist responses with media
      const files = req.files as Express.Multer.File[];
      const items = translateChecklistNotes(JSON.parse(checklistData));

      for (const item of items) {
        const response = await storage.createChecklistResponse({
          inspectionTaskId: task.id,
          roomKey: item.roomKey,
          itemKey: item.itemKey,
          result: item.result,
          notes: item.notes,
          severity: item.severity,
          // N/A items don't require media for full inspection
          requiredMediaSatisfied: item.result === "NA" || (item.mediaIndices?.length > 0),
        });

        for (const mediaIndex of item.mediaIndices || []) {
          const mediaType = req.body[`mediaType_${mediaIndex}`] === "VIDEO" ? "VIDEO" : "PHOTO";
          const timestamp = req.body[`mediaTimestamp_${mediaIndex}`];

          const preUploadedUrl = req.body[`mediaUrl_${mediaIndex}`];
          if (preUploadedUrl && isValidPreUploadedUrl(preUploadedUrl)) {
            await storage.createMedia({
              inspectionTaskId: task.id,
              checklistResponseId: response.id,
              type: mediaType,
              url: preUploadedUrl,
              timestampCapturedAt: timestamp ? new Date(timestamp) : new Date(),
            });
          } else {
            const file = files.find((f) => f.fieldname === `media_${mediaIndex}`);
            if (file) {
              await storage.createMedia({
                inspectionTaskId: task.id,
                checklistResponseId: response.id,
                type: mediaType,
                url: `/uploads/${file.filename}`,
                timestampCapturedAt: timestamp ? new Date(timestamp) : new Date(),
              });
            }
          }
        }
      }

      // Notify PM
      if (responsiblePmId) {
        const pm = await storage.getUser(responsiblePmId);
        const unit = await storage.getUnit(unitId);
        if (pm) {
          await storage.createNotification({
            userId: pm.id,
            type: "INSPECTION_SUBMITTED",
            title: "Full Inspection Submitted",
            body: `A full inspection has been completed for ${unit?.propertyName || "Unit"}`,
            linkUrl: `/portal/tasks/${task.id}`,
          });

          await sendEmail(
            pm.email,
            `Full Inspection Complete - ${unit?.propertyName || "Unit"}`,
            `A full inspection has been submitted.\n\nUnit: ${unit?.propertyName} - ${unit?.unitNumber}\n\nView the complete report in the portal.`,
            { inspectionTaskId: task.id }
          );
        }
      }

      res.json(task);
    } catch (error) {
      console.error("Full inspection error:", error);
      res.status(500).json({ message: "Failed to submit inspection" });
    }
  });

  app.post("/api/media/upload-temp", upload.single("file"), async (req: AuthRequest, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const allowedMime = /^(image\/(jpeg|jpg|png|gif|webp|heic|heif)|video\/(mp4|webm|quicktime|mov))$/i;
      if (!allowedMime.test(file.mimetype)) {
        fs.unlinkSync(path.join(uploadsDir, file.filename));
        return res.status(400).json({ message: "Only image and video files are allowed" });
      }
      const url = `/uploads/${file.filename}`;
      res.json({ url, filename: file.filename });
    } catch (error) {
      console.error("Temp media upload error:", error);
      res.status(500).json({ message: "Failed to upload media" });
    }
  });

  app.post("/api/inspections/onboarding", upload.any(), async (req: AuthRequest, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { responsiblePmId, createdById, checklistData, issuesData, mediaCount } = req.body;
      let unitId = req.body.unitId;

      if (!unitId && req.body.propertyName) {
        const propertyName = (req.body.propertyName || "").trim();
        const unitNumber = (req.body.unitNumber || "").trim();
        const address = (req.body.address || "").trim();

        if (!propertyName || !unitNumber) {
          return res.status(400).json({ message: "Property name and unit number are required" });
        }

        const existingUnits = await storage.getUnits();
        const existing = existingUnits.find(
          (u) => u.propertyName.toLowerCase() === propertyName.toLowerCase() &&
                 u.unitNumber.toLowerCase() === unitNumber.toLowerCase()
        );

        if (existing) {
          unitId = existing.id;
        } else {
          const newUnit = await storage.createUnit({
            propertyName,
            unitNumber,
            address,
            unitStatus: "ONBOARDING",
            bedroomCount: parseInt(req.body.bedroomCount) || null,
            bathroomCount: parseInt(req.body.bathroomCount) || null,
            hasDen: req.body.hasDen === "true",
          });
          unitId = newUnit.id;
        }
      }

      if (!unitId) {
        return res.status(400).json({ message: "Property name or unit ID is required" });
      }

      const task = await storage.createInspectionTask({
        type: "ONBOARDING",
        unitId,
        assignedToUserId: createdById || userId,
        responsiblePmId,
        createdById: createdById || userId,
        status: "SUBMITTED",
        bedroomCount: parseInt(req.body.bedroomCount) || null,
        bathroomCount: parseInt(req.body.bathroomCount) || null,
        keySetsProvided: parseInt(req.body.keySetsProvided) || null,
        hasDen: req.body.hasDen === "true",
        bathroomTypes: req.body.bathroomTypes || null,
        keyTypes: req.body.keyTypes || null,
      });

      const files = req.files as Express.Multer.File[];

      // Parse and save checklist responses (translate Spanish notes to English)
      const items = translateChecklistNotes(JSON.parse(checklistData));
      for (const item of items) {
        const response = await storage.createChecklistResponse({
          inspectionTaskId: task.id,
          roomKey: item.roomKey,
          itemKey: item.itemKey,
          result: item.result,
          notes: item.notes,
          severity: item.severity,
          requiredMediaSatisfied: item.result === "MISSING" || item.result === "GOOD" || (item.mediaIndices?.length > 0),
        });

        for (const mediaIndex of item.mediaIndices || []) {
          const mediaType = req.body[`mediaType_${mediaIndex}`] === "VIDEO" ? "VIDEO" : "PHOTO";
          const timestamp = req.body[`mediaTimestamp_${mediaIndex}`];

          const preUploadedUrl = req.body[`mediaUrl_${mediaIndex}`];
          if (preUploadedUrl && isValidPreUploadedUrl(preUploadedUrl)) {
            await storage.createMedia({
              inspectionTaskId: task.id,
              checklistResponseId: response.id,
              type: mediaType,
              url: preUploadedUrl,
              timestampCapturedAt: timestamp ? new Date(timestamp) : new Date(),
            });
          } else {
            const file = files.find((f) => f.fieldname === `media_${mediaIndex}`);
            if (file) {
              await storage.createMedia({
                inspectionTaskId: task.id,
                checklistResponseId: response.id,
                type: mediaType,
                url: `/uploads/${file.filename}`,
                timestampCapturedAt: timestamp ? new Date(timestamp) : new Date(),
              });
            }
          }
        }
      }

      // Save issues as checklist responses (translate Spanish to English)
      const issues = JSON.parse(issuesData || "[]");
      for (const issue of issues) {
        const issueTitle = issue.title || "";
        const issueDesc = issue.description || "";
        const translatedIssueNotes = translateChecklistNotes([{ notes: `${issueTitle}\n${issueDesc}` }])[0].notes;
        const response = await storage.createChecklistResponse({
          inspectionTaskId: task.id,
          roomKey: "issues",
          itemKey: randomUUID(),
          result: "FAIL",
          notes: translatedIssueNotes,
          severity: issue.severity,
          requiredMediaSatisfied: issue.mediaIndices?.length > 0,
        });

        for (const mediaIndex of issue.mediaIndices || []) {
          const mediaType = req.body[`mediaType_${mediaIndex}`] === "VIDEO" ? "VIDEO" : "PHOTO";
          const timestamp = req.body[`mediaTimestamp_${mediaIndex}`];

          const preUploadedUrl = req.body[`mediaUrl_${mediaIndex}`];
          if (preUploadedUrl && isValidPreUploadedUrl(preUploadedUrl)) {
            await storage.createMedia({
              inspectionTaskId: task.id,
              checklistResponseId: response.id,
              type: mediaType,
              url: preUploadedUrl,
              timestampCapturedAt: timestamp ? new Date(timestamp) : new Date(),
            });
          } else {
            const file = files.find((f) => f.fieldname === `media_${mediaIndex}`);
            if (file) {
              await storage.createMedia({
                inspectionTaskId: task.id,
                checklistResponseId: response.id,
                type: mediaType,
                url: `/uploads/${file.filename}`,
                timestampCapturedAt: timestamp ? new Date(timestamp) : new Date(),
              });
            }
          }
        }
      }

      // Notify PM
      if (responsiblePmId) {
        const pm = await storage.getUser(responsiblePmId);
        const unit = await storage.getUnit(unitId);
        if (pm) {
          await storage.createNotification({
            userId: pm.id,
            type: "INSPECTION_SUBMITTED",
            title: "Onboarding Inspection Complete",
            body: `An onboarding inspection has been completed for ${unit?.propertyName || "Unit"}`,
            linkUrl: `/portal/tasks/${task.id}`,
          });

          await sendEmail(
            pm.email,
            `Onboarding Report - ${unit?.propertyName || "Unit"}`,
            `An onboarding inspection has been submitted.\n\nUnit: ${unit?.propertyName} - ${unit?.unitNumber}\n\nView the complete report and download PDF in the portal.`,
            { inspectionTaskId: task.id }
          );
        }
      }

      res.json(task);
    } catch (error) {
      console.error("Onboarding inspection error:", error);
      res.status(500).json({ message: "Failed to submit inspection" });
    }
  });

  // =========== NOTIFICATIONS ROUTES ===========
  app.get("/api/notifications", requireAuth, async (req: AuthRequest, res) => {
    const notifications = await storage.getNotificationsByUser(req.userId!);
    res.json(notifications);
  });

  app.get("/api/notifications/unread", requireAuth, async (req: AuthRequest, res) => {
    const notifications = await storage.getUnreadNotificationsByUser(req.userId!);
    res.json(notifications);
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    await storage.markNotificationRead(req.params.id);
    res.json({ message: "Marked as read" });
  });

  app.post("/api/notifications/mark-all-read", requireAuth, async (req: AuthRequest, res) => {
    await storage.markAllNotificationsRead(req.userId!);
    res.json({ message: "All marked as read" });
  });

  // =========== PDF GENERATION ROUTES ===========
  app.get("/api/tasks/:id/pdf", requireAuth, async (req, res) => {
    try {
      const task = await storage.getInspectionTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      const unit = await storage.getUnit(task.unitId);
      const responses = await storage.getChecklistResponsesByTask(task.id);
      const inspector = await storage.getUser(task.assignedToUserId);
      const pm = task.responsiblePmId ? await storage.getUser(task.responsiblePmId) : null;

      // Create PDF document
      const doc = new PDFDocument({ size: "A4", margin: 50 });

      // Set response headers
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="inspection-report-${task.id.slice(0, 8)}.pdf"`
      );

      // Pipe to response
      doc.pipe(res);

      // Header
      doc.fontSize(24).font("Helvetica-Bold").text("TBA Inspection Report", { align: "center" });
      doc.moveDown();

      // Report info
      doc.fontSize(12).font("Helvetica-Bold").text("Report Details");
      doc.fontSize(10).font("Helvetica");
      doc.text(`Report Type: ${task.type === "FULL_INSPECTION" ? "Full Inspection" : "Onboarding Inspection"}`);
      doc.text(`Status: ${task.status}`);
      doc.text(`Generated: ${new Date().toLocaleString()}`);
      if (task.createdAt) {
        doc.text(`Inspection Date: ${new Date(task.createdAt).toLocaleString()}`);
      }
      doc.moveDown();

      // Property info
      if (unit) {
        doc.fontSize(12).font("Helvetica-Bold").text("Property Information");
        doc.fontSize(10).font("Helvetica");
        doc.text(`Property: ${unit.propertyName}`);
        doc.text(`Unit: ${unit.unitNumber}`);
        doc.text(`Address: ${unit.address}`);
        doc.moveDown();
      }

      // Personnel
      doc.fontSize(12).font("Helvetica-Bold").text("Personnel");
      doc.fontSize(10).font("Helvetica");
      if (inspector) {
        doc.text(`Inspector: ${inspector.name} (${inspector.email})`);
      }
      if (pm) {
        doc.text(`Property Manager: ${pm.name} (${pm.email})`);
      }
      doc.moveDown();

      // Checklist Responses
      doc.fontSize(12).font("Helvetica-Bold").text("Inspection Results");
      doc.moveDown(0.5);

      const groupedResponses: Record<string, typeof responses> = {};
      for (const resp of responses) {
        if (!groupedResponses[resp.roomKey]) {
          groupedResponses[resp.roomKey] = [];
        }
        groupedResponses[resp.roomKey].push(resp);
      }

      for (const [roomKey, roomResponses] of Object.entries(groupedResponses)) {
        doc.fontSize(11).font("Helvetica-Bold").text(roomKey.charAt(0).toUpperCase() + roomKey.slice(1).replace(/_/g, " "));
        doc.fontSize(9).font("Helvetica");
        
        for (const resp of roomResponses) {
          const result = resp.result === "PASS" ? "[PASS]" : resp.result === "FAIL" ? "[FAIL]" : "[N/A]";
          doc.text(`${result} ${resp.itemKey.replace(/_/g, " ")}`);
          if (resp.notes) {
            doc.text(`   Notes: ${resp.notes}`, { indent: 20 });
          }
          if (resp.severity) {
            doc.text(`   Severity: ${resp.severity}`, { indent: 20 });
          }
        }
        doc.moveDown(0.5);
      }

      // Summary
      const passCount = responses.filter((r) => r.result === "PASS").length;
      const failCount = responses.filter((r) => r.result === "FAIL").length;
      const naCount = responses.filter((r) => r.result === "NA").length;

      doc.moveDown();
      doc.fontSize(12).font("Helvetica-Bold").text("Summary");
      doc.fontSize(10).font("Helvetica");
      doc.text(`Total Items: ${responses.length}`);
      doc.text(`Passed: ${passCount}`);
      doc.text(`Failed: ${failCount}`);
      doc.text(`Not Applicable: ${naCount}`);

      // Footer
      doc.moveDown(2);
      doc.fontSize(8).font("Helvetica").fillColor("gray");
      doc.text("This report was generated by TBA Inspection Checklist App", { align: "center" });

      // Finalize PDF
      doc.end();
    } catch (error) {
      console.error("PDF generation error:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // Quick report PDF
  app.get("/api/quick-reports/:id/pdf", requireAuth, async (req, res) => {
    try {
      const report = await storage.getQuickReport(req.params.id);
      if (!report) {
        return res.status(404).json({ message: "Quick report not found" });
      }

      const reporter = await storage.getUser(report.createdById);
      const pm = report.responsiblePmId ? await storage.getUser(report.responsiblePmId) : null;
      const media = await storage.getMediaByQuickReport(report.id);

      // Create PDF
      const doc = new PDFDocument({ size: "A4", margin: 50 });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="quick-report-${report.id.slice(0, 8)}.pdf"`
      );

      doc.pipe(res);

      // Header
      doc.fontSize(24).font("Helvetica-Bold").text("Quick Issue Report", { align: "center" });
      doc.moveDown();

      // Report info
      doc.fontSize(12).font("Helvetica-Bold").text("Report Details");
      doc.fontSize(10).font("Helvetica");
      doc.text(`Status: ${report.status}`);
      doc.text(`Severity: ${report.severity}`);
      if (report.createdAt) {
        doc.text(`Submitted: ${new Date(report.createdAt).toLocaleString()}`);
      }
      doc.moveDown();

      // Property/Location
      doc.fontSize(12).font("Helvetica-Bold").text("Property & Location");
      doc.fontSize(10).font("Helvetica");
      doc.text(`Unit: ${report.unitNumber}`);
      const locationLabel = report.location.replace(/_/g, " ");
      doc.text(`Location: ${locationLabel}${report.locationDetails ? ` - ${report.locationDetails}` : ""}`);
      doc.moveDown();

      // Personnel
      doc.fontSize(12).font("Helvetica-Bold").text("Personnel");
      doc.fontSize(10).font("Helvetica");
      if (reporter) {
        doc.text(`Reported by: ${reporter.name} (${reporter.email})`);
      }
      if (pm) {
        doc.text(`Property Manager: ${pm.name} (${pm.email})`);
      }
      doc.moveDown();

      // Description
      doc.fontSize(12).font("Helvetica-Bold").text("Issue Description");
      doc.fontSize(10).font("Helvetica");
      doc.text(report.description || "No description provided");
      doc.moveDown();

      // Notes
      if (report.pmNotes || report.cleaningNotes) {
        doc.fontSize(12).font("Helvetica-Bold").text("Notes");
        doc.fontSize(10).font("Helvetica");
        if (report.pmNotes) {
          doc.text(`Notes for PM: ${report.pmNotes}`);
        }
        if (report.cleaningNotes) {
          doc.text(`Notes for Cleaning: ${report.cleaningNotes}`);
        }
        doc.moveDown();
      }

      // Media count
      if (media.length > 0) {
        doc.fontSize(12).font("Helvetica-Bold").text("Attached Media");
        doc.fontSize(10).font("Helvetica");
        doc.text(`${media.length} photo(s)/video(s) attached to this report`);
        for (const m of media) {
          doc.text(`- ${m.type}: ${m.url}`);
        }
      }

      // Footer
      doc.moveDown(2);
      doc.fontSize(8).font("Helvetica").fillColor("gray");
      doc.text("This report was generated by TBA Inspection Checklist App", { align: "center" });

      doc.end();
    } catch (error) {
      console.error("PDF generation error:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // PM Inspection Report PDF (comprehensive with images)
  app.get("/api/pm/inspections/:id/pdf", requirePmOrAdmin, async (req, res) => {
    try {
      const task = await storage.getInspectionTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Inspection not found" });
      }

      // Only allow PDF for submitted+ inspections
      if (task.status === "ASSIGNED" || task.status === "IN_PROGRESS") {
        return res.status(400).json({ message: "PDF only available for submitted inspections" });
      }

      const unit = await storage.getUnit(task.unitId);
      const responses = await storage.getChecklistResponsesByTask(task.id);
      const mediaItems = await storage.getMediaByTask(task.id);
      const inspector = await storage.getUser(task.assignedToUserId);
      const pm = task.responsiblePmId ? await storage.getUser(task.responsiblePmId) : null;

      // Create PDF document with page numbers
      const doc = new PDFDocument({ 
        size: "A4", 
        margin: 50,
        bufferPages: true 
      });

      // Set response headers
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="TBA-Inspection-${unit?.unitNumber || task.id.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.pdf"`
      );

      doc.pipe(res);

      const pageWidth = doc.page.width - 100;
      const primaryColor = "#6B21A8"; // Purple for branding

      // Helper function to add page header
      const addPageHeader = () => {
        doc.fillColor(primaryColor);
        doc.fontSize(16).font("Helvetica-Bold").text("Toronto Boutique Apartments", 50, 30, { align: "left" });
        doc.fillColor("gray");
        doc.fontSize(8).font("Helvetica").text(`Generated: ${new Date().toLocaleString()}`, 50, 30, { align: "right" });
        doc.moveDown(2);
        doc.fillColor("black");
      };

      // ============ PAGE 1: EXECUTIVE SUMMARY ============
      addPageHeader();

      doc.fillColor(primaryColor);
      doc.fontSize(22).font("Helvetica-Bold").text("Inspection Report", { align: "center" });
      doc.fillColor("black");
      doc.moveDown();

      // Type badge
      const typeLabel = task.type === "FULL_INSPECTION" ? "Full Inspection" : "Onboarding Inspection";
      doc.fontSize(14).font("Helvetica").text(typeLabel, { align: "center" });
      doc.moveDown(1.5);

      // Property Information Box
      doc.rect(50, doc.y, pageWidth, 80).stroke(primaryColor);
      const boxY = doc.y + 10;
      doc.fontSize(12).font("Helvetica-Bold").text("Property Information", 60, boxY);
      doc.fontSize(10).font("Helvetica");
      doc.text(`Property: ${unit?.propertyName || "N/A"}`, 60, boxY + 20);
      doc.text(`Unit: ${unit?.unitNumber || "N/A"}`, 60, boxY + 35);
      doc.text(`Address: ${unit?.address || "N/A"}`, 60, boxY + 50);
      doc.text(`Status: ${task.status}`, 300, boxY + 20);
      doc.text(`Date: ${task.createdAt ? new Date(task.createdAt).toLocaleDateString() : "N/A"}`, 300, boxY + 35);
      doc.y = boxY + 90;
      doc.moveDown();

      // Personnel
      doc.fontSize(12).font("Helvetica-Bold").text("Personnel");
      doc.fontSize(10).font("Helvetica");
      if (inspector) {
        doc.text(`Inspector: ${inspector.name} (${inspector.email})`);
      }
      if (pm) {
        doc.text(`Property Manager: ${pm.name} (${pm.email})`);
      }
      doc.moveDown(1.5);

      // Summary Statistics
      const passCount = responses.filter(r => r.result === "PASS" || r.result === "GOOD" || r.result === "YES").length;
      const failCount = responses.filter(r => r.result === "FAIL" || r.result === "NO").length;
      const missingCount = responses.filter(r => r.result === "MISSING").length;
      const replacementCount = responses.filter(r => r.result === "NEED_REPLACEMENT").length;
      const issuesCount = responses.filter(r => r.notes && r.notes.length > 0 && r.result !== "PASS").length;

      doc.fontSize(14).font("Helvetica-Bold").text("Summary Statistics");
      doc.moveDown(0.5);
      
      const statBoxWidth = (pageWidth - 30) / 4;
      const statY = doc.y;
      
      // Good items box
      doc.rect(50, statY, statBoxWidth, 50).fillAndStroke("#DCFCE7", "#22C55E");
      doc.fillColor("#166534").fontSize(20).font("Helvetica-Bold").text(String(passCount), 50, statY + 8, { width: statBoxWidth, align: "center" });
      doc.fontSize(9).text("Good", 50, statY + 32, { width: statBoxWidth, align: "center" });
      
      // Replacement box
      doc.rect(60 + statBoxWidth, statY, statBoxWidth, 50).fillAndStroke("#FEF3C7", "#F59E0B");
      doc.fillColor("#92400E").fontSize(20).font("Helvetica-Bold").text(String(replacementCount), 60 + statBoxWidth, statY + 8, { width: statBoxWidth, align: "center" });
      doc.fontSize(9).text("Need Replacement", 60 + statBoxWidth, statY + 32, { width: statBoxWidth, align: "center" });
      
      // Missing box
      doc.rect(70 + statBoxWidth * 2, statY, statBoxWidth, 50).fillAndStroke("#FEE2E2", "#EF4444");
      doc.fillColor("#991B1B").fontSize(20).font("Helvetica-Bold").text(String(missingCount), 70 + statBoxWidth * 2, statY + 8, { width: statBoxWidth, align: "center" });
      doc.fontSize(9).text("Missing", 70 + statBoxWidth * 2, statY + 32, { width: statBoxWidth, align: "center" });
      
      // Issues box
      doc.rect(80 + statBoxWidth * 3, statY, statBoxWidth, 50).fillAndStroke("#E0E7FF", "#6366F1");
      doc.fillColor("#3730A3").fontSize(20).font("Helvetica-Bold").text(String(issuesCount), 80 + statBoxWidth * 3, statY + 8, { width: statBoxWidth, align: "center" });
      doc.fontSize(9).text("Issues Noted", 80 + statBoxWidth * 3, statY + 32, { width: statBoxWidth, align: "center" });
      
      doc.fillColor("black");
      doc.y = statY + 70;
      doc.moveDown();

      // ============ ROOM-BY-ROOM OVERVIEW ============
      doc.addPage();
      addPageHeader();
      
      doc.fillColor(primaryColor);
      doc.fontSize(16).font("Helvetica-Bold").text("Room-by-Room Overview");
      doc.fillColor("black");
      doc.moveDown();

      // Group responses by room
      const roomResponses: Record<string, typeof responses> = {};
      for (const resp of responses) {
        if (!roomResponses[resp.roomKey]) {
          roomResponses[resp.roomKey] = [];
        }
        roomResponses[resp.roomKey].push(resp);
      }

      for (const [roomKey, items] of Object.entries(roomResponses)) {
        // Check if we need a new page
        if (doc.y > 650) {
          doc.addPage();
          addPageHeader();
        }

        const roomName = roomKey.charAt(0).toUpperCase() + roomKey.slice(1).replace(/_/g, " ");
        doc.fontSize(13).font("Helvetica-Bold").fillColor(primaryColor).text(roomName);
        doc.fillColor("black");
        doc.moveDown(0.3);

        for (const item of items) {
          if (doc.y > 720) {
            doc.addPage();
            addPageHeader();
          }

          const itemName = item.itemKey.replace(/_/g, " ");
          let statusIcon = "✓";
          let statusColor = "#22C55E";
          
          if (item.result === "FAIL" || item.result === "NO") {
            statusIcon = "✗";
            statusColor = "#EF4444";
          } else if (item.result === "MISSING") {
            statusIcon = "!";
            statusColor = "#EF4444";
          } else if (item.result === "NEED_REPLACEMENT") {
            statusIcon = "⚠";
            statusColor = "#F59E0B";
          } else if (item.result === "NA") {
            statusIcon = "-";
            statusColor = "#9CA3AF";
          }

          doc.fontSize(10).font("Helvetica");
          doc.fillColor(statusColor).text(statusIcon, { continued: true });
          doc.fillColor("black").text(` ${itemName} - `, { continued: true });
          doc.fillColor(statusColor).text(item.result.replace(/_/g, " "));
          doc.fillColor("black");

          if (item.notes) {
            doc.fontSize(9).font("Helvetica-Oblique").text(`   Note: ${item.notes}`, { indent: 15 });
          }
          
          if (item.severity) {
            doc.fontSize(9).text(`   Severity: ${item.severity}`, { indent: 15 });
          }
        }
        doc.moveDown(0.5);
      }

      // ============ ISSUES & DAMAGES ============
      const issueItems = responses.filter(r => 
        r.result === "FAIL" || r.result === "MISSING" || r.result === "NEED_REPLACEMENT" || 
        (r.notes && r.notes.length > 0)
      );

      if (issueItems.length > 0) {
        doc.addPage();
        addPageHeader();

        doc.fillColor(primaryColor);
        doc.fontSize(16).font("Helvetica-Bold").text("Issues & Damages");
        doc.fillColor("black");
        doc.moveDown();

        for (const issue of issueItems) {
          if (doc.y > 650) {
            doc.addPage();
            addPageHeader();
          }

          const roomName = issue.roomKey.charAt(0).toUpperCase() + issue.roomKey.slice(1).replace(/_/g, " ");
          const itemName = issue.itemKey.replace(/_/g, " ");
          
          // Issue header
          doc.fontSize(11).font("Helvetica-Bold").text(`${roomName} - ${itemName}`);
          
          // Status and severity
          let severityColor = "#9CA3AF";
          if (issue.severity === "HIGH") severityColor = "#EF4444";
          else if (issue.severity === "MED") severityColor = "#F59E0B";
          else if (issue.severity === "LOW") severityColor = "#22C55E";

          doc.fontSize(10).font("Helvetica");
          doc.fillColor("#6B7280").text(`Status: `, { continued: true });
          doc.fillColor(issue.result === "MISSING" || issue.result === "FAIL" ? "#EF4444" : "#F59E0B")
             .text(issue.result.replace(/_/g, " "), { continued: issue.severity ? true : false });
          
          if (issue.severity) {
            doc.fillColor("#6B7280").text(`  |  Severity: `, { continued: true });
            doc.fillColor(severityColor).text(issue.severity);
          } else {
            doc.text("");
          }
          
          doc.fillColor("black");
          if (issue.notes) {
            doc.fontSize(10).font("Helvetica").text(`Description: ${issue.notes}`);
          }

          // Find related media
          const issueMedia = mediaItems.filter(m => m.checklistResponseId === issue.id);
          if (issueMedia.length > 0) {
            doc.fontSize(9).fillColor("#6B7280").text(`Attached media: ${issueMedia.length} file(s)`);
            for (const m of issueMedia) {
              doc.text(`  • ${m.type}: ${m.url}`, { link: m.url });
            }
          }
          
          doc.fillColor("black");
          doc.moveDown();
        }
      }

      // ============ PART 1 MEDIA CHECKLIST ============
      doc.addPage();
      addPageHeader();

      doc.fillColor(primaryColor);
      doc.fontSize(16).font("Helvetica-Bold").text("Part 1 Media Checklist");
      doc.fillColor("black");
      doc.moveDown();

      const videoCategories = [
        { key: "VIDEO_WALKTHROUGH", label: "Full unit walkthrough" },
        { key: "VIDEO_ENTRANCE_ELEVATOR", label: "Entrance to elevator" },
        { key: "VIDEO_PARKING_ENTRANCE", label: "Parking garage entrance" },
        { key: "VIDEO_PARKING_ACCESS", label: "Access designated parking" },
        { key: "VIDEO_THERMOSTAT", label: "Thermostat how-to" },
        { key: "VIDEO_GARBAGE_RECYCLING", label: "Garbage/recycling access" },
        { key: "VIDEO_SPECIAL_INSTRUCTIONS", label: "Special instructions" },
        { key: "VIDEO_TV_DEMO", label: "TV working demo" },
        { key: "VIDEO_BALCONY_DOORS", label: "Balcony doors" },
        { key: "VIDEO_WINDOWS_OPENING", label: "Windows opening" },
      ];

      const photoCategories = [
        { key: "PHOTO_AC_FILTER", label: "AC filter wide angle" },
        { key: "PHOTO_FAUCET_BRANDS", label: "Faucet brand names" },
        { key: "PHOTO_APPLIANCE_MODELS", label: "Appliance model number stickers" },
        { key: "PHOTO_WIFI_MODEM", label: "WiFi modem back (SSID/password)" },
        { key: "PHOTO_FUSE_BOX", label: "Fuse box open/closed" },
        { key: "PHOTO_VACUUM", label: "Vacuum photo" },
        { key: "PHOTO_KEY_FOB", label: "Key/fob set" },
        { key: "PHOTO_BALCONY_OUTDOOR", label: "Balcony/outdoor" },
      ];

      // Videos section
      doc.fontSize(13).font("Helvetica-Bold").text("Videos");
      doc.moveDown(0.3);
      
      for (const cat of videoCategories) {
        const catMedia = mediaItems.filter(m => m.category === cat.key);
        const hasMedia = catMedia.length > 0;
        const checkIcon = hasMedia ? "☑" : "☐";
        const color = hasMedia ? "#22C55E" : "#9CA3AF";
        
        doc.fontSize(10).font("Helvetica").fillColor(color).text(checkIcon, { continued: true });
        doc.fillColor("black").text(` ${cat.label}`, { continued: hasMedia });
        
        if (hasMedia) {
          doc.fillColor("#6B7280").text(` (${catMedia.length} file${catMedia.length > 1 ? "s" : ""})`);
          for (const m of catMedia) {
            doc.fontSize(8).text(`     → ${m.url}`, { link: m.url });
          }
        }
      }

      doc.moveDown();

      // Photos section
      doc.fontSize(13).font("Helvetica-Bold").fillColor("black").text("Photos");
      doc.moveDown(0.3);
      
      for (const cat of photoCategories) {
        const catMedia = mediaItems.filter(m => m.category === cat.key);
        const hasMedia = catMedia.length > 0;
        const checkIcon = hasMedia ? "☑" : "☐";
        const color = hasMedia ? "#22C55E" : "#9CA3AF";
        
        doc.fontSize(10).font("Helvetica").fillColor(color).text(checkIcon, { continued: true });
        doc.fillColor("black").text(` ${cat.label}`, { continued: hasMedia });
        
        if (hasMedia) {
          doc.fillColor("#6B7280").text(` (${catMedia.length} file${catMedia.length > 1 ? "s" : ""})`);
        }
      }

      // Media completion stats
      const totalVideoCategories = videoCategories.length;
      const completedVideos = videoCategories.filter(c => mediaItems.some(m => m.category === c.key)).length;
      const totalPhotoCategories = photoCategories.length;
      const completedPhotos = photoCategories.filter(c => mediaItems.some(m => m.category === c.key)).length;

      doc.moveDown(1.5);
      doc.fontSize(11).font("Helvetica-Bold").fillColor("black").text("Media Completion Summary");
      doc.fontSize(10).font("Helvetica");
      doc.text(`Videos: ${completedVideos}/${totalVideoCategories} (${Math.round(completedVideos/totalVideoCategories*100)}%)`);
      doc.text(`Photos: ${completedPhotos}/${totalPhotoCategories} (${Math.round(completedPhotos/totalPhotoCategories*100)}%)`);

      // ============ ADD PAGE NUMBERS ============
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fillColor("gray");
        doc.fontSize(8).font("Helvetica");
        doc.text(
          `Page ${i + 1} of ${pageCount}`,
          50,
          doc.page.height - 30,
          { align: "center", width: pageWidth }
        );
      }

      // Finalize PDF
      doc.end();
    } catch (error) {
      console.error("PM Inspection PDF generation error:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // =========== MEDIA ROUTES ===========
  app.get("/api/media", requireAuth, async (req: AuthRequest, res) => {
    try {
      const media = await storage.getAllMedia();
      res.json(media);
    } catch (error) {
      console.error("Error fetching media:", error);
      res.status(500).json({ message: "Failed to fetch media" });
    }
  });

  app.get("/api/units/:unitId/media-library", requirePmOrAdmin, async (req, res) => {
    try {
      const mediaItems = await storage.getMediaByUnit(req.params.unitId);
      res.json(mediaItems);
    } catch (error) {
      console.error("Error fetching unit media library:", error);
      res.status(500).json({ message: "Failed to fetch media library" });
    }
  });

  // =========== PM NOTES ROUTES ===========
  app.get("/api/units/:unitId/pm-notes", requirePmOrAdmin, async (req, res) => {
    try {
      const notes = await storage.getPmNotesByUnit(req.params.unitId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching PM notes:", error);
      res.status(500).json({ message: "Failed to fetch PM notes" });
    }
  });

  app.post("/api/units/:unitId/pm-notes", requirePmOrAdmin, async (req: AuthRequest, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Validate with Zod schema
      const parseResult = insertPmNoteSchema.safeParse({
        unitId: req.params.unitId,
        createdById: req.userId,
        content: req.body.content,
      });
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Validation failed",
          errors: parseResult.error.flatten().fieldErrors
        });
      }
      
      const note = await storage.createPmNote(parseResult.data);
      res.status(201).json(note);
    } catch (error) {
      console.error("Error creating PM note:", error);
      res.status(500).json({ message: "Failed to create PM note" });
    }
  });

  app.patch("/api/pm-notes/:id", requirePmOrAdmin, async (req, res) => {
    try {
      const { content } = req.body;
      if (!content || typeof content !== "string") {
        return res.status(400).json({ message: "Content is required" });
      }
      const updated = await storage.updatePmNote(req.params.id, content);
      if (!updated) {
        return res.status(404).json({ message: "Note not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating PM note:", error);
      res.status(500).json({ message: "Failed to update PM note" });
    }
  });

  app.delete("/api/pm-notes/:id", requirePmOrAdmin, async (req, res) => {
    try {
      await storage.deletePmNote(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting PM note:", error);
      res.status(500).json({ message: "Failed to delete PM note" });
    }
  });

  // =========== ISSUE CATEGORIES ===========
  
  // Get all issue categories
  app.get("/api/issue-categories", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      let categories = await storage.getIssueCategories();
      
      // Auto-seed default categories if none exist
      if (categories.length === 0) {
        const defaults = [
          { name: "Good", color: "#22c55e", sortOrder: 0, isDefault: true },
          { name: "Damage", color: "#ef4444", sortOrder: 1, isDefault: true },
          { name: "Cosmetic", color: "#f59e0b", sortOrder: 2, isDefault: true },
          { name: "Missing", color: "#8b5cf6", sortOrder: 3, isDefault: true },
          { name: "Replacement", color: "#3b82f6", sortOrder: 4, isDefault: true },
          { name: "Cleaning", color: "#10b981", sortOrder: 5, isDefault: true },
        ];
        for (const cat of defaults) {
          await storage.createIssueCategory(cat);
        }
        categories = await storage.getIssueCategories();
      }
      
      // Ensure "Good" category exists (added after initial seed)
      if (!categories.find((c) => c.name === "Good")) {
        await storage.createIssueCategory({ name: "Good", color: "#22c55e", sortOrder: 0, isDefault: true });
        categories = await storage.getIssueCategories();
      }
      
      res.json(categories);
    } catch (error) {
      console.error("Error fetching issue categories:", error);
      res.status(500).json({ message: "Failed to fetch issue categories" });
    }
  });

  // Create issue category
  app.post("/api/issue-categories", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user || (user.role !== "PM" && user.role !== "ADMIN")) {
        return res.status(403).json({ message: "PM or Admin role required" });
      }
      
      const { name, color, sortOrder } = req.body;
      const category = await storage.createIssueCategory({ name, color: color || "#6b7280", sortOrder: sortOrder || 0 });
      res.json(category);
    } catch (error) {
      console.error("Error creating issue category:", error);
      res.status(500).json({ message: "Failed to create issue category" });
    }
  });

  // Update issue category
  app.patch("/api/issue-categories/:id", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user || (user.role !== "PM" && user.role !== "ADMIN")) {
        return res.status(403).json({ message: "PM or Admin role required" });
      }
      
      const updated = await storage.updateIssueCategory(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: "Category not found" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating issue category:", error);
      res.status(500).json({ message: "Failed to update issue category" });
    }
  });

  // Delete issue category
  app.delete("/api/issue-categories/:id", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user || (user.role !== "PM" && user.role !== "ADMIN")) {
        return res.status(403).json({ message: "PM or Admin role required" });
      }
      
      await storage.deleteIssueCategory(req.params.id);
      res.json({ message: "Category deleted" });
    } catch (error) {
      console.error("Error deleting issue category:", error);
      res.status(500).json({ message: "Failed to delete issue category" });
    }
  });

  // =========== OWNER REPORTS ===========
  
  // Get all owner reports
  app.get("/api/owner-reports", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const reports = await storage.getOwnerReports();
      res.json(reports);
    } catch (error) {
      console.error("Error fetching owner reports:", error);
      res.status(500).json({ message: "Failed to fetch owner reports" });
    }
  });

  // Get owner report by inspection task ID
  app.get("/api/owner-reports/by-inspection/:inspectionTaskId", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const report = await storage.getOwnerReportByInspection(req.params.inspectionTaskId);
      if (!report) return res.status(404).json({ message: "No owner report found for this inspection" });
      
      const items = await storage.getOwnerReportItems(report.id);
      const categories = await storage.getIssueCategories();
      res.json({ report, items, categories });
    } catch (error) {
      console.error("Error fetching owner report:", error);
      res.status(500).json({ message: "Failed to fetch owner report" });
    }
  });

  // Get owner report with items
  app.get("/api/owner-reports/:id", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const report = await storage.getOwnerReport(req.params.id);
      if (!report) return res.status(404).json({ message: "Report not found" });
      
      const items = await storage.getOwnerReportItems(report.id);
      const categories = await storage.getIssueCategories();
      const unit = await storage.getUnit(report.unitId);
      const task = await storage.getInspectionTask(report.inspectionTaskId);
      res.json({ report, items, categories, unit, task });
    } catch (error) {
      console.error("Error fetching owner report:", error);
      res.status(500).json({ message: "Failed to fetch owner report" });
    }
  });

  // Create or get existing owner report for an inspection
  app.post("/api/owner-reports", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user || (user.role !== "PM" && user.role !== "ADMIN")) {
        return res.status(403).json({ message: "PM or Admin role required" });
      }
      
      const { inspectionTaskId } = req.body;
      if (!inspectionTaskId) return res.status(400).json({ message: "inspectionTaskId required" });
      
      // Check if report already exists
      const existing = await storage.getOwnerReportByInspection(inspectionTaskId);
      if (existing) {
        const items = await storage.getOwnerReportItems(existing.id);
        return res.json({ report: existing, items });
      }
      
      const task = await storage.getInspectionTask(inspectionTaskId);
      if (!task) return res.status(404).json({ message: "Inspection task not found" });
      
      const shareToken = randomUUID().replace(/-/g, "");
      const report = await storage.createOwnerReport({
        inspectionTaskId,
        unitId: task.unitId,
        createdById: userId,
        ownerName: "",
        shareToken,
        closingMessage: "Please let me know how you'd like to proceed so we can keep onboarding on track.",
      });
      
      res.json({ report, items: [] });
    } catch (error) {
      console.error("Error creating owner report:", error);
      res.status(500).json({ message: "Failed to create owner report" });
    }
  });

  // Update owner report
  app.patch("/api/owner-reports/:id", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const updated = await storage.updateOwnerReport(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: "Report not found" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating owner report:", error);
      res.status(500).json({ message: "Failed to update owner report" });
    }
  });

  // =========== OWNER REPORT ITEMS ===========
  
  // Add item to owner report (categorize an inspection item)
  app.post("/api/owner-reports/:reportId/items", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const { checklistResponseId, categoryId, priority, roomName, itemName, description, repairQuote, estimatedCost, mediaUrls, sortOrder } = req.body;
      
      const item = await storage.createOwnerReportItem({
        ownerReportId: req.params.reportId,
        checklistResponseId: checklistResponseId || null,
        categoryId,
        priority: priority || "LOWER",
        roomName,
        itemName,
        description: description || "",
        repairQuote: repairQuote || null,
        estimatedCost: estimatedCost || null,
        mediaUrls: mediaUrls || [],
        sortOrder: sortOrder || 0,
      });
      
      res.json(item);
    } catch (error) {
      console.error("Error adding report item:", error);
      res.status(500).json({ message: "Failed to add report item" });
    }
  });

  // Update owner report item
  app.patch("/api/owner-report-items/:id", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const updated = await storage.updateOwnerReportItem(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: "Item not found" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating report item:", error);
      res.status(500).json({ message: "Failed to update report item" });
    }
  });

  // Delete owner report item
  app.delete("/api/owner-report-items/:id", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      await storage.deleteOwnerReportItem(req.params.id);
      res.json({ message: "Item removed" });
    } catch (error) {
      console.error("Error deleting report item:", error);
      res.status(500).json({ message: "Failed to delete report item" });
    }
  });

  // =========== OWNER REPORT BUNDLES ===========

  app.get("/api/owner-reports/:reportId/bundles", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user || (user.role !== "ADMIN" && user.role !== "PM")) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const bundles = await storage.getBundlesForReport(req.params.reportId);
      res.json(bundles);
    } catch (error) {
      console.error("Error fetching bundles:", error);
      res.status(500).json({ message: "Failed to fetch bundles" });
    }
  });

  app.post("/api/owner-reports/:reportId/bundles", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user || (user.role !== "ADMIN" && user.role !== "PM")) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const { name, estimatedCost, repairQuote, categoryId, itemIds } = req.body;
      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "Bundle name is required" });
      }
      const report = await storage.getOwnerReport(req.params.reportId);
      if (!report) return res.status(404).json({ message: "Report not found" });
      if (itemIds && Array.isArray(itemIds) && itemIds.length > 0) {
        const reportItems = await storage.getOwnerReportItems(req.params.reportId);
        const reportItemIds = new Set(reportItems.map(i => i.id));
        const invalidIds = itemIds.filter((id: string) => !reportItemIds.has(id));
        if (invalidIds.length > 0) {
          return res.status(400).json({ message: "Some item IDs do not belong to this report" });
        }
      }
      const bundle = await storage.createBundle({
        ownerReportId: req.params.reportId,
        name: name.trim(),
        estimatedCost: estimatedCost || null,
        repairQuote: repairQuote || null,
        categoryId: categoryId || null,
        sortOrder: 0,
      });
      if (itemIds && Array.isArray(itemIds) && itemIds.length > 0) {
        await storage.addItemsToBundle(bundle.id, itemIds);
      }
      res.json(bundle);
    } catch (error) {
      console.error("Error creating bundle:", error);
      res.status(500).json({ message: "Failed to create bundle" });
    }
  });

  app.patch("/api/owner-reports/:reportId/bundles/:bundleId", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user || (user.role !== "ADMIN" && user.role !== "PM")) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const { name, estimatedCost, repairQuote, categoryId } = req.body;
      const updateData: Record<string, any> = {};
      if (name !== undefined) {
        if (typeof name !== "string" || !name.trim()) {
          return res.status(400).json({ message: "Bundle name cannot be empty" });
        }
        updateData.name = name.trim();
      }
      if (estimatedCost !== undefined) updateData.estimatedCost = estimatedCost;
      if (repairQuote !== undefined) updateData.repairQuote = repairQuote;
      if (categoryId !== undefined) updateData.categoryId = categoryId;
      const updated = await storage.updateBundle(req.params.bundleId, updateData);
      if (!updated) return res.status(404).json({ message: "Bundle not found" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating bundle:", error);
      res.status(500).json({ message: "Failed to update bundle" });
    }
  });

  app.delete("/api/owner-reports/:reportId/bundles/:bundleId", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user || (user.role !== "ADMIN" && user.role !== "PM")) {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.deleteBundle(req.params.bundleId);
      res.json({ message: "Bundle deleted" });
    } catch (error) {
      console.error("Error deleting bundle:", error);
      res.status(500).json({ message: "Failed to delete bundle" });
    }
  });

  app.post("/api/owner-reports/:reportId/bundles/:bundleId/items", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user || (user.role !== "ADMIN" && user.role !== "PM")) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const { itemIds } = req.body;
      if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
        return res.status(400).json({ message: "itemIds array is required" });
      }
      const reportItems = await storage.getOwnerReportItems(req.params.reportId);
      const reportItemIds = new Set(reportItems.map(i => i.id));
      const invalidIds = itemIds.filter((id: string) => !reportItemIds.has(id));
      if (invalidIds.length > 0) {
        return res.status(400).json({ message: "Some item IDs do not belong to this report" });
      }
      await storage.addItemsToBundle(req.params.bundleId, itemIds);
      res.json({ message: "Items added to bundle" });
    } catch (error) {
      console.error("Error adding items to bundle:", error);
      res.status(500).json({ message: "Failed to add items to bundle" });
    }
  });

  app.delete("/api/owner-reports/:reportId/bundles/:bundleId/items/:itemId", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user || (user.role !== "ADMIN" && user.role !== "PM")) {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.removeItemFromBundle(req.params.itemId);
      res.json({ message: "Item removed from bundle" });
    } catch (error) {
      console.error("Error removing item from bundle:", error);
      res.status(500).json({ message: "Failed to remove item from bundle" });
    }
  });

  // =========== PUBLIC OWNER REPORT (no auth required) ===========
  
  app.get("/api/public/owner-report/:token", async (req, res) => {
    try {
      const report = await storage.getOwnerReportByToken(req.params.token);
      if (!report) return res.status(404).json({ message: "Report not found" });
      
      const items = await storage.getOwnerReportItems(report.id);
      const categories = await storage.getIssueCategories();
      const unit = await storage.getUnit(report.unitId);
      const task = await storage.getInspectionTask(report.inspectionTaskId);
      const bundles = await storage.getBundlesForReport(report.id);
      
      res.json({ report, items, categories, unit, task, bundles });
    } catch (error) {
      console.error("Error fetching public report:", error);
      res.status(500).json({ message: "Failed to fetch report" });
    }
  });

  // =========== OWNER REPORT - OWNER RESPONSES (public, no auth) ===========

  app.post("/api/public/owner-report/:token/items/:itemId/respond", async (req, res) => {
    try {
      const report = await storage.getOwnerReportByToken(req.params.token);
      if (!report) return res.status(404).json({ message: "Report not found" });

      const items = await storage.getOwnerReportItems(report.id);
      const item = items.find(i => i.id === req.params.itemId);
      if (!item) return res.status(404).json({ message: "Item not found" });

      const { ownerResponse, ownerComment } = req.body;

      const validResponses = ["LEAVE_AS_IS", "ILL_REPLACE", "PLEASE_FIX", "PROCEED_PURCHASE"];
      if (ownerResponse && !validResponses.includes(ownerResponse)) {
        return res.status(400).json({ message: "Invalid response type" });
      }

      const updated = await storage.updateOwnerReportItem(item.id, {
        ownerResponse: ownerResponse || null,
        ownerComment: ownerComment !== undefined ? ownerComment : item.ownerComment,
        ownerRespondedAt: new Date(),
      } as any);

      res.json(updated);
    } catch (error) {
      console.error("Error saving owner response:", error);
      res.status(500).json({ message: "Failed to save response" });
    }
  });

  // =========== OWNER ONBOARDING QUESTIONNAIRE (PM creates, owner fills) ===========

  // PM creates onboarding link for a unit
  app.post("/api/owner-onboardings", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user || (user.role !== "PM" && user.role !== "ADMIN")) {
        return res.status(403).json({ message: "Only PM/Admin can create onboarding links" });
      }

      const { unitId, ownerName, ownerEmail } = req.body;
      if (!unitId) return res.status(400).json({ message: "unitId is required" });

      const unit = await storage.getUnit(unitId);
      if (!unit) return res.status(404).json({ message: "Unit not found" });

      const shareToken = randomUUID().replace(/-/g, "").slice(0, 24);

      const onboarding = await storage.createOwnerOnboarding({
        unitId,
        createdById: userId,
        ownerName: ownerName || "",
        ownerEmail: ownerEmail || null,
        shareToken,
        status: "PENDING",
        currentStep: 0,
        responses: {},
      });

      res.json(onboarding);
    } catch (error) {
      console.error("Error creating onboarding:", error);
      res.status(500).json({ message: "Failed to create onboarding link" });
    }
  });

  // PM gets all onboardings
  app.get("/api/owner-onboardings", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user || (user.role !== "PM" && user.role !== "ADMIN")) {
        return res.status(403).json({ message: "Only PM/Admin can view onboardings" });
      }
      const onboardings = await storage.getAllOwnerOnboardings();
      res.json(onboardings);
    } catch (error) {
      console.error("Error fetching all onboardings:", error);
      res.status(500).json({ message: "Failed to fetch onboardings" });
    }
  });

  // PM gets onboardings for a unit
  app.get("/api/owner-onboardings/unit/:unitId", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const onboardings = await storage.getOwnerOnboardingsByUnit(req.params.unitId);
      res.json(onboardings);
    } catch (error) {
      console.error("Error fetching onboardings:", error);
      res.status(500).json({ message: "Failed to fetch onboardings" });
    }
  });

  // PM gets a specific onboarding by ID
  app.get("/api/owner-onboardings/:id", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const onboarding = await storage.getOwnerOnboarding(req.params.id);
      if (!onboarding) return res.status(404).json({ message: "Onboarding not found" });
      const unit = await storage.getUnit(onboarding.unitId);
      res.json({ onboarding, unit });
    } catch (error) {
      console.error("Error fetching onboarding:", error);
      res.status(500).json({ message: "Failed to fetch onboarding" });
    }
  });

  // Public: Owner loads questionnaire by token
  app.get("/api/public/onboarding/:token", async (req, res) => {
    try {
      const onboarding = await storage.getOwnerOnboardingByToken(req.params.token);
      if (!onboarding) return res.status(404).json({ message: "Onboarding not found" });
      const unit = await storage.getUnit(onboarding.unitId);
      res.json({
        onboarding: {
          id: onboarding.id,
          ownerName: onboarding.ownerName,
          status: onboarding.status,
          propertyType: onboarding.propertyType,
          currentStep: onboarding.currentStep,
          responses: onboarding.responses,
          completedAt: onboarding.completedAt,
        },
        unit: unit ? { propertyName: unit.propertyName, unitNumber: unit.unitNumber, address: unit.address } : null,
      });
    } catch (error) {
      console.error("Error fetching public onboarding:", error);
      res.status(500).json({ message: "Failed to fetch onboarding" });
    }
  });

  // Public: Owner auto-saves responses
  app.patch("/api/public/onboarding/:token", async (req, res) => {
    try {
      const onboarding = await storage.getOwnerOnboardingByToken(req.params.token);
      if (!onboarding) return res.status(404).json({ message: "Onboarding not found" });
      if (onboarding.status === "COMPLETED") return res.status(400).json({ message: "Onboarding already completed" });

      const { currentStep, responses, propertyType } = req.body;

      const existingResponses = (onboarding.responses || {}) as Record<string, any>;
      const mergedResponses = { ...existingResponses, ...(responses || {}) };

      const updateData: any = {
        responses: mergedResponses,
        status: "IN_PROGRESS",
      };
      if (currentStep !== undefined) updateData.currentStep = currentStep;
      if (propertyType) updateData.propertyType = propertyType;

      const updated = await storage.updateOwnerOnboarding(onboarding.id, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Error saving onboarding responses:", error);
      res.status(500).json({ message: "Failed to save responses" });
    }
  });

  // Public: Owner finalizes/submits onboarding
  app.post("/api/public/onboarding/:token/submit", async (req, res) => {
    try {
      const onboarding = await storage.getOwnerOnboardingByToken(req.params.token);
      if (!onboarding) return res.status(404).json({ message: "Onboarding not found" });
      if (onboarding.status === "COMPLETED") return res.status(400).json({ message: "Already submitted" });

      const updated = await storage.updateOwnerOnboarding(onboarding.id, {
        status: "COMPLETED",
        completedAt: new Date(),
      } as any);

      res.json(updated);
    } catch (error) {
      console.error("Error submitting onboarding:", error);
      res.status(500).json({ message: "Failed to submit onboarding" });
    }
  });

  // =========== OWNER REPORT PDF ===========
  
  app.get("/api/owner-reports/:id/pdf", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const report = await storage.getOwnerReport(req.params.id);
      if (!report) return res.status(404).json({ message: "Report not found" });
      
      const items = await storage.getOwnerReportItems(report.id);
      const categories = await storage.getIssueCategories();
      const unit = await storage.getUnit(report.unitId);
      const task = await storage.getInspectionTask(report.inspectionTaskId);
      
      const categoryMap = new Map(categories.map(c => [c.id, c]));
      
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="owner-report-${unit?.unitNumber || "unit"}.pdf"`);
      doc.pipe(res);
      
      // Header
      doc.fontSize(20).font("Helvetica-Bold").text("Toronto Boutique Apartments", { align: "center" });
      doc.fontSize(12).font("Helvetica").text("Inspection Report for Property Owner", { align: "center" });
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#cccccc");
      doc.moveDown(1);
      
      // Greeting
      const ownerName = report.ownerName || "Owner";
      doc.fontSize(12).font("Helvetica").text(`Hi ${ownerName},`);
      doc.moveDown(0.5);
      doc.text("Following the inspection of your unit, we've identified both damages and missing items.");
      doc.moveDown(1);
      
      // Unit info
      if (unit) {
        doc.fontSize(10).font("Helvetica-Bold").text("Unit: ", { continued: true });
        doc.font("Helvetica").text(`${unit.propertyName} - ${unit.unitNumber}`);
      }
      if (task) {
        doc.fontSize(10).font("Helvetica-Bold").text("Inspection Date: ", { continued: true });
        doc.font("Helvetica").text(new Date(task.createdAt).toLocaleDateString());
      }
      doc.moveDown(1);
      
      // Group items by category
      const groupedItems: Record<string, typeof items> = {};
      for (const item of items) {
        const cat = categoryMap.get(item.categoryId);
        const catName = cat?.name || "Uncategorized";
        if (!groupedItems[catName]) groupedItems[catName] = [];
        groupedItems[catName].push(item);
      }
      
      // Damages section (High + Lower priority)
      const damageItems = groupedItems["Damage"] || [];
      if (damageItems.length > 0) {
        doc.fontSize(16).font("Helvetica-Bold").text("Damages");
        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#ef4444");
        doc.moveDown(0.5);
        
        doc.text("I'll start with the damages in order of priority:");
        doc.moveDown(0.5);
        
        const highPriority = damageItems.filter(i => i.priority === "HIGH");
        const lowerPriority = damageItems.filter(i => i.priority !== "HIGH");
        
        if (highPriority.length > 0) {
          doc.fontSize(12).font("Helvetica-Bold").text("High priority (must be fixed before we go live):");
          doc.moveDown(0.3);
          for (const item of highPriority) {
            doc.fontSize(10).font("Helvetica");
            const quoteText = item.repairQuote ? ` — Repair quote: ${item.repairQuote}` : "";
            doc.text(`  •  ${item.roomName} — ${item.itemName}: ${item.description || "Needs attention"}${quoteText}`, { indent: 10 });
          }
          doc.moveDown(0.5);
        }
        
        if (lowerPriority.length > 0) {
          doc.fontSize(12).font("Helvetica-Bold").text("Lower priority (cosmetic, not deal-breakers but recommended):");
          doc.moveDown(0.3);
          for (const item of lowerPriority) {
            doc.fontSize(10).font("Helvetica");
            const quoteText = item.repairQuote ? ` — Repair quote: ${item.repairQuote}` : "";
            doc.text(`  •  ${item.roomName} — ${item.itemName}: ${item.description || "Needs attention"}${quoteText}`, { indent: 10 });
          }
          doc.moveDown(0.5);
        }
        doc.moveDown(0.5);
      }
      
      // Missing Items section
      const missingItems = groupedItems["Missing"] || [];
      if (missingItems.length > 0) {
        doc.fontSize(16).font("Helvetica-Bold").text("Missing Items");
        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#8b5cf6");
        doc.moveDown(0.5);
        
        doc.fontSize(11).font("Helvetica").text("Here's the list of items identified as missing:");
        doc.moveDown(0.3);
        for (const item of missingItems) {
          doc.fontSize(10).font("Helvetica").text(`  •  ${item.roomName} — ${item.itemName}${item.description ? `: ${item.description}` : ""}`, { indent: 10 });
        }
        doc.moveDown(0.5);
        
        if (report.amazonCartLink) {
          doc.fontSize(10).font("Helvetica").text("Here is the Amazon cart link with the missing items compiled for your approval:");
          doc.fontSize(10).fillColor("#3b82f6").text(report.amazonCartLink, { link: report.amazonCartLink, underline: true });
          doc.fillColor("#000000");
        }
        doc.moveDown(0.5);
      }
      
      // Other categories
      for (const [catName, catItems] of Object.entries(groupedItems)) {
        if (catName === "Damage" || catName === "Missing" || catName === "Good") continue;
        if (catItems.length === 0) continue;
        
        const cat = categories.find(c => c.name === catName);
        doc.fontSize(16).font("Helvetica-Bold").text(catName);
        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke(cat?.color || "#6b7280");
        doc.moveDown(0.5);
        
        for (const item of catItems) {
          doc.fontSize(10).font("Helvetica").text(`  •  ${item.roomName} — ${item.itemName}${item.description ? `: ${item.description}` : ""}`, { indent: 10 });
        }
        doc.moveDown(0.5);
      }
      
      // Closing message
      doc.moveDown(1);
      if (report.closingMessage) {
        doc.fontSize(11).font("Helvetica").text(report.closingMessage);
      }
      
      // Footer
      doc.moveDown(2);
      doc.fontSize(8).fillColor("#999999").text("Generated by Toronto Boutique Apartments Inspection System", { align: "center" });
      doc.text(`Report generated on ${new Date().toLocaleDateString()}`, { align: "center" });
      
      doc.end();
    } catch (error) {
      console.error("Error generating owner report PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // =========== OWNER PORTAL ROUTES ===========

  app.post("/api/owner-reports/:id/publish", requirePmOrAdmin, async (req: AuthRequest, res) => {
    try {
      const report = await storage.getOwnerReport(req.params.id);
      if (!report) return res.status(404).json({ message: "Report not found" });
      const updated = await storage.updateOwnerReport(req.params.id, {
        status: "SENT",
        publishedAt: new Date() as any,
      } as any);
      res.json(updated);
    } catch (error) {
      console.error("Error publishing report:", error);
      res.status(500).json({ message: "Failed to publish report" });
    }
  });

  app.patch("/api/owner-report-items/:id/status", requirePmOrAdmin, async (req: AuthRequest, res) => {
    try {
      const { issueStatus, pmNote } = req.body;
      const updated = await storage.updateOwnerReportItem(req.params.id, {
        issueStatus,
        pmNote,
        statusUpdatedAt: new Date() as any,
      } as any);
      if (!updated) return res.status(404).json({ message: "Item not found" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating item status:", error);
      res.status(500).json({ message: "Failed to update item status" });
    }
  });

  app.get("/api/owner/my-onboarding", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) return res.status(401).json({ message: "User not found" });

      const allOnboardings = await storage.getAllOwnerOnboardings();
      const myOnboardings = allOnboardings.filter((o: any) =>
        o.ownerEmail?.toLowerCase() === user.email.toLowerCase()
      );

      const pending = myOnboardings.filter((o: any) => o.status !== "COMPLETED");
      const withUnits = await Promise.all(pending.map(async (o: any) => {
        const unit = await storage.getUnit(o.unitId);
        return { ...o, unit };
      }));

      res.json(withUnits);
    } catch (error) {
      console.error("Error fetching owner onboarding:", error);
      res.status(500).json({ message: "Failed to fetch onboarding" });
    }
  });

  app.get("/api/owner/properties", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) return res.status(401).json({ message: "User not found" });

      const allUnits = await storage.getUnits();
      const ownerUnits = allUnits.filter((u: any) => u.ownerUserId === user.id);

      const allProperties = await storage.getProperties();
      const ownerProperties = allProperties.filter((p: any) => {
        const owners = p.owners as { name: string; email: string }[] || [];
        const matchByOwnersList = owners.some((o) => o.email.toLowerCase() === user.email.toLowerCase());
        const matchByUnit = ownerUnits.some((u: any) =>
          u.propertyName?.toLowerCase() === p.nickname?.toLowerCase() ||
          u.propertyName?.toLowerCase() === p.title?.toLowerCase()
        );
        return matchByOwnersList || matchByUnit;
      });

      const propertiesWithStats = await Promise.all(ownerProperties.map(async (property: any) => {
        const allReports = await storage.getOwnerReports();
        const publishedReports = allReports.filter((r: any) => r.publishedAt != null);

        const allUnits = await storage.getUnits();
        const propertyUnits = allUnits.filter((u: any) => {
          const propNickname = property.nickname?.toLowerCase() || "";
          const unitProp = u.propertyName?.toLowerCase() || "";
          return unitProp.includes(propNickname) || propNickname.includes(unitProp) ||
                 u.unitNumber === property.nickname;
        });
        const unitIds = propertyUnits.map((u: any) => u.id);

        const propertyReports = publishedReports.filter((r: any) => unitIds.includes(r.unitId));
        let openIssues = 0;
        for (const report of propertyReports) {
          const items = await storage.getOwnerReportItems(report.id);
          openIssues += items.filter((i: any) => i.issueStatus !== "COMPLETED").length;
        }

        return {
          ...property,
          reportCount: propertyReports.length,
          openIssues,
          latestReport: propertyReports[0] || null,
        };
      }));

      res.json(propertiesWithStats);
    } catch (error) {
      console.error("Error fetching owner properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  app.get("/api/owner/properties/:id/reports", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) return res.status(401).json({ message: "User not found" });

      const property = await storage.getProperty(req.params.id);
      if (!property) return res.status(404).json({ message: "Property not found" });

      const owners = property.owners as { name: string; email: string }[] || [];
      if (!owners.some((o) => o.email.toLowerCase() === user.email.toLowerCase())) {
        return res.status(403).json({ message: "Not your property" });
      }

      const allUnits = await storage.getUnits();
      const propNickname = property.nickname?.toLowerCase() || "";
      const propertyUnits = allUnits.filter((u: any) => {
        const unitProp = u.propertyName?.toLowerCase() || "";
        return unitProp.includes(propNickname) || propNickname.includes(unitProp) ||
               u.unitNumber === property.nickname;
      });
      const unitIds = propertyUnits.map((u: any) => u.id);

      const allReports = await storage.getOwnerReports();
      const publishedReports = allReports.filter((r: any) => r.publishedAt != null && unitIds.includes(r.unitId));

      const reportsWithItems = await Promise.all(publishedReports.map(async (report: any) => {
        const items = await storage.getOwnerReportItems(report.id);
        const task = await storage.getInspectionTask(report.inspectionTaskId);
        const unit = await storage.getUnit(report.unitId);
        const categories = await storage.getIssueCategories();
        const checklistResponses = task ? await storage.getChecklistResponsesByTask(task.id) : [];
        const responseMap = new Map(checklistResponses.map((r: any) => [r.id, r.result]));
        const enrichedItems = items.map((item: any) => ({
          ...item,
          checklistResult: item.checklistResponseId ? (responseMap.get(item.checklistResponseId) || null) : null,
        }));
        const issueResults = ["FAIL", "MISSING", "NEED_REPLACEMENT", "NO"];
        const actualIssues = enrichedItems.filter((i: any) => issueResults.includes(i.checklistResult));
        return {
          ...report,
          items: enrichedItems,
          task,
          unit,
          categories,
          openIssues: actualIssues.filter((i: any) => i.issueStatus !== "COMPLETED").length,
          totalIssues: actualIssues.length,
        };
      }));

      res.json(reportsWithItems);
    } catch (error) {
      console.error("Error fetching property reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.get("/api/owner/reports/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) return res.status(401).json({ message: "User not found" });

      if (user.role === "ADMIN" || user.role === "PM") {
        const report = await storage.getOwnerReport(req.params.id);
        if (!report) return res.status(404).json({ message: "Report not found" });
        const items = await storage.getOwnerReportItems(report.id);
        const categories = await storage.getIssueCategories();
        const unit = await storage.getUnit(report.unitId);
        const task = await storage.getInspectionTask(report.inspectionTaskId);
        const crList = task ? await storage.getChecklistResponsesByTask(task.id) : [];
        const crMap = new Map(crList.map((r: any) => [r.id, r.result]));
        const enriched = items.map((item: any) => ({
          ...item,
          checklistResult: item.checklistResponseId ? (crMap.get(item.checklistResponseId) || null) : null,
        }));
        const bundles = await storage.getBundlesForReport(report.id);
        return res.json({ report, items: enriched, categories, unit, task, bundles });
      }

      const report = await storage.getOwnerReport(req.params.id);
      if (!report) return res.status(404).json({ message: "Report not found" });
      if (!report.publishedAt) return res.status(403).json({ message: "Report not published" });

      const reportUnit = await storage.getUnit(report.unitId);
      const allProperties = await storage.getProperties();
      const ownerProperties = allProperties.filter((p: any) => {
        const owners = p.owners as { name: string; email: string }[] || [];
        return owners.some((o) => o.email.toLowerCase() === user.email.toLowerCase());
      });

      const allUnits = await storage.getUnits();
      const ownerUnitIds = new Set<string>();
      for (const prop of ownerProperties) {
        const propNickname = prop.nickname?.toLowerCase() || "";
        for (const u of allUnits) {
          const unitProp = (u as any).propertyName?.toLowerCase() || "";
          if (unitProp.includes(propNickname) || propNickname.includes(unitProp) || u.unitNumber === prop.nickname) {
            ownerUnitIds.add(u.id);
          }
        }
      }

      if (!ownerUnitIds.has(report.unitId)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const items = await storage.getOwnerReportItems(report.id);
      const categories = await storage.getIssueCategories();
      const task = await storage.getInspectionTask(report.inspectionTaskId);
      const checklistResponses = task ? await storage.getChecklistResponsesByTask(task.id) : [];
      const responseMap = new Map(checklistResponses.map((r: any) => [r.id, r.result]));
      const enrichedItems = items.map((item: any) => ({
        ...item,
        description: translateNotesToEnglish(item.description) || item.description,
        checklistResult: item.checklistResponseId ? (responseMap.get(item.checklistResponseId) || null) : null,
      }));
      const bundles = await storage.getBundlesForReport(report.id);

      res.json({ report, items: enrichedItems, categories, unit: reportUnit, task, bundles, ownerName: user.name });
    } catch (error) {
      console.error("Error fetching owner report:", error);
      res.status(500).json({ message: "Failed to fetch report" });
    }
  });

  app.get("/api/owner/monthly-summary", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) return res.status(401).json({ message: "User not found" });

      const monthStr = req.query.month as string || new Date().toISOString().slice(0, 7);
      const [year, month] = monthStr.split("-").map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const allProperties = await storage.getProperties();
      const ownerProperties = allProperties.filter((p: any) => {
        const owners = p.owners as { name: string; email: string }[] || [];
        return owners.some((o) => o.email.toLowerCase() === user.email.toLowerCase());
      });

      const allUnits = await storage.getUnits();
      const unitIds: string[] = [];
      for (const property of ownerProperties) {
        const propNickname = property.nickname?.toLowerCase() || "";
        const propertyUnits = allUnits.filter((u: any) => {
          const unitProp = u.propertyName?.toLowerCase() || "";
          return unitProp.includes(propNickname) || propNickname.includes(unitProp);
        });
        unitIds.push(...propertyUnits.map((u: any) => u.id));
      }

      const allReports = await storage.getOwnerReports();
      const publishedReports = allReports.filter((r: any) =>
        r.publishedAt != null && unitIds.includes(r.unitId) &&
        new Date(r.publishedAt) >= startDate && new Date(r.publishedAt) <= endDate
      );

      let totalIssues = 0;
      let completedIssues = 0;
      let openIssues = 0;
      let highSeverityIssues = 0;

      const issueResultValues = ["FAIL", "MISSING", "NEED_REPLACEMENT", "NO"];
      for (const report of publishedReports) {
        const items = await storage.getOwnerReportItems(report.id);
        const task = await storage.getInspectionTask(report.inspectionTaskId);
        const crList = task ? await storage.getChecklistResponsesByTask(task.id) : [];
        const crMap = new Map(crList.map((r: any) => [r.id, r.result]));
        const actualIssues = items.filter((i: any) => {
          const cr = i.checklistResponseId ? crMap.get(i.checklistResponseId) : null;
          return issueResultValues.includes(cr);
        });
        totalIssues += actualIssues.length;
        completedIssues += actualIssues.filter((i: any) => i.issueStatus === "COMPLETED").length;
        openIssues += actualIssues.filter((i: any) => i.issueStatus !== "COMPLETED").length;
        highSeverityIssues += actualIssues.filter((i: any) => i.priority === "HIGH").length;
      }

      res.json({
        month: monthStr,
        totalReports: publishedReports.length,
        totalIssues,
        completedIssues,
        openIssues,
        highSeverityIssues,
        completionRate: totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0,
      });
    } catch (error) {
      console.error("Error fetching monthly summary:", error);
      res.status(500).json({ message: "Failed to fetch monthly summary" });
    }
  });

  // =========== SEED DATA ROUTE ===========
  app.post("/api/seed", async (req, res) => {
    try {
      if (process.env.NODE_ENV === "production") {
        return res.status(403).json({ message: "Seeding is disabled in production" });
      }

      const { ensureSeedData } = await import("./seed");
      const result = await ensureSeedData();
      res.json({ message: result.message, seeded: result.seeded });
    } catch (error) {
      console.error("Seed error:", error);
      res.status(500).json({ message: "Failed to seed data" });
    }
  });

  // =========== WORKFLOW PHASES ROUTES ===========
  app.get("/api/workflow-phases", requireAuth, async (req: AuthRequest, res) => {
    try {
      const phases = await storage.getWorkflowPhases();
      const subTasks = await storage.getAllWorkflowSubTasks();
      const phasesWithSubTasks = phases.map(p => ({
        ...p,
        subTasks: subTasks.filter(st => st.phaseId === p.id).sort((a, b) => a.sortOrder - b.sortOrder),
      }));
      res.json(phasesWithSubTasks);
    } catch (error) {
      console.error("Get workflow phases error:", error);
      res.status(500).json({ message: "Failed to get workflow phases" });
    }
  });

  app.post("/api/workflow-phases", requirePmOrAdmin, async (req: AuthRequest, res) => {
    try {
      const { name, sortOrder, phaseType, systemKey, dependencies } = req.body;
      const phase = await storage.createWorkflowPhase({
        name,
        sortOrder: sortOrder ?? 0,
        phaseType: phaseType ?? "MANUAL",
        systemKey: systemKey ?? null,
        dependencies: dependencies ?? [],
      });
      res.json(phase);
    } catch (error) {
      console.error("Create workflow phase error:", error);
      res.status(500).json({ message: "Failed to create workflow phase" });
    }
  });

  app.patch("/api/workflow-phases/reorder", requirePmOrAdmin, async (req: AuthRequest, res) => {
    try {
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds)) return res.status(400).json({ message: "orderedIds required" });
      for (let i = 0; i < orderedIds.length; i++) {
        await storage.updateWorkflowPhase(orderedIds[i], { sortOrder: i });
      }
      res.json({ message: "Phases reordered" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reorder phases" });
    }
  });

  app.patch("/api/workflow-phases/:id", requirePmOrAdmin, async (req: AuthRequest, res) => {
    try {
      const phase = await storage.updateWorkflowPhase(req.params.id, req.body);
      if (!phase) return res.status(404).json({ message: "Phase not found" });
      res.json(phase);
    } catch (error) {
      res.status(500).json({ message: "Failed to update workflow phase" });
    }
  });

  app.delete("/api/workflow-phases/:id", requirePmOrAdmin, async (req: AuthRequest, res) => {
    try {
      await storage.deleteWorkflowPhase(req.params.id);
      res.json({ message: "Phase deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete workflow phase" });
    }
  });

  // Sub-tasks
  app.post("/api/workflow-phases/:id/sub-tasks", requirePmOrAdmin, async (req: AuthRequest, res) => {
    try {
      const { name, sortOrder } = req.body;
      const subTask = await storage.createWorkflowSubTask({
        phaseId: req.params.id,
        name,
        sortOrder: sortOrder ?? 0,
      });
      res.json(subTask);
    } catch (error) {
      res.status(500).json({ message: "Failed to create sub-task" });
    }
  });

  app.patch("/api/workflow-sub-tasks/:id", requirePmOrAdmin, async (req: AuthRequest, res) => {
    try {
      const subTask = await storage.updateWorkflowSubTask(req.params.id, req.body);
      if (!subTask) return res.status(404).json({ message: "Sub-task not found" });
      res.json(subTask);
    } catch (error) {
      res.status(500).json({ message: "Failed to update sub-task" });
    }
  });

  app.delete("/api/workflow-sub-tasks/:id", requirePmOrAdmin, async (req: AuthRequest, res) => {
    try {
      await storage.deleteWorkflowSubTask(req.params.id);
      res.json({ message: "Sub-task deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete sub-task" });
    }
  });

  // Unit onboarding checklist
  app.get("/api/units/:unitId/onboarding-checklist", requirePmOrAdmin, async (req: AuthRequest, res) => {
    try {
      const checklist = await storage.getUnitChecklist(req.params.unitId);
      res.json(checklist);
    } catch (error) {
      res.status(500).json({ message: "Failed to get checklist" });
    }
  });

  app.patch("/api/units/:unitId/onboarding-checklist/:subTaskId", requirePmOrAdmin, async (req: AuthRequest, res) => {
    try {
      const { completed } = req.body;
      if (typeof completed !== "boolean") return res.status(400).json({ message: "completed (boolean) required" });
      const item = await storage.toggleChecklistItem(req.params.unitId, req.params.subTaskId, completed, req.userId!);
      res.json(item);
    } catch (error: any) {
      console.error("Toggle checklist error:", error?.message || error);
      res.status(500).json({ message: "Failed to toggle checklist item" });
    }
  });

  // Seed default workflow phases
  app.post("/api/workflow-phases/seed", requirePmOrAdmin, async (req: AuthRequest, res) => {
    try {
      const existing = await storage.getWorkflowPhases();
      if (existing.length > 0) {
        return res.json({ message: "Phases already seeded", phases: existing });
      }

      const defaultPhases = [
        { name: "Inspection Completed", sortOrder: 0, phaseType: "SYSTEM" as const, systemKey: "inspection_submitted" },
        { name: "Report Review", sortOrder: 1, phaseType: "SYSTEM" as const, systemKey: "report_reviewed" },
        { name: "Owner Report Sent", sortOrder: 2, phaseType: "SYSTEM" as const, systemKey: "owner_report_published" },
        { name: "Owner Responses", sortOrder: 3, phaseType: "SYSTEM" as const, systemKey: "owner_responses_complete" },
        { name: "Repairs & Replacements", sortOrder: 4, phaseType: "MANUAL" as const, systemKey: null },
        { name: "Final Walkthrough", sortOrder: 5, phaseType: "MANUAL" as const, systemKey: null },
        { name: "Unit Activated", sortOrder: 6, phaseType: "MANUAL" as const, systemKey: null },
      ];

      const createdPhases = [];
      for (const p of defaultPhases) {
        const phase = await storage.createWorkflowPhase(p);
        createdPhases.push(phase);
      }

      const subTasksMap: Record<string, string[]> = {
        "Repairs & Replacements": [
          "Order replacement items",
          "Schedule handyman",
          "Verify repairs completed",
          "Upload completion photos",
        ],
        "Final Walkthrough": [
          "Schedule walkthrough date",
          "Complete walkthrough inspection",
          "Document any remaining issues",
          "Sign-off approval",
        ],
        "Unit Activated": [
          "Update unit status to Active",
          "Set up listing",
          "Confirm key handover",
        ],
      };

      for (const phase of createdPhases) {
        const tasks = subTasksMap[phase.name];
        if (tasks) {
          for (let i = 0; i < tasks.length; i++) {
            await storage.createWorkflowSubTask({ phaseId: phase.id, name: tasks[i], sortOrder: i });
          }
        }
      }

      res.json({ message: "Default phases seeded", phases: createdPhases });
    } catch (error) {
      console.error("Seed workflow phases error:", error);
      res.status(500).json({ message: "Failed to seed workflow phases" });
    }
  });

  app.get("/api/inspection-drafts", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId || (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const drafts = await storage.getInspectionDraftsByUser(userId);
      res.json(drafts);
    } catch (error) {
      res.status(500).json({ message: "Failed to get drafts" });
    }
  });

  app.put("/api/inspection-drafts", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId || (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { inspectionType, draftData } = req.body;
      if (!inspectionType || !draftData) {
        return res.status(400).json({ message: "inspectionType and draftData are required" });
      }
      const draft = await storage.upsertInspectionDraft(userId, inspectionType, draftData);
      res.json(draft);
    } catch (error) {
      res.status(500).json({ message: "Failed to save draft" });
    }
  });

  app.delete("/api/inspection-drafts/:type", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId || (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const drafts = await storage.getInspectionDraftsByUser(userId);
      const draft = drafts.find(d => d.inspectionType === req.params.type);
      if (draft) {
        await storage.deleteInspectionDraft(draft.id);
      }
      res.json({ message: "Draft deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete draft" });
    }
  });

  app.get("/api/config/maps-key", requireAuth, (req: AuthRequest, res) => {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) return res.status(404).json({ message: "Maps API key not configured" });
    res.json({ key });
  });

  if (process.env.NODE_ENV !== "production") {
    try {
      const { ensureSeedData } = await import("./seed");
      const result = await ensureSeedData();
      if (result.seeded) {
        console.log(`[seed] ${result.message}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[seed] Database not ready:", message);
      console.error("[seed] Fix DATABASE_URL in .env, then run: npm run setup");
    }
  }

  return httpServer;
}
