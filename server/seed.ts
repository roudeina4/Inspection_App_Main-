import { createHash } from "crypto";
import { storage } from "./storage";
import type { TemplateRoom, UserRole } from "@shared/schema";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

const DEMO_PASSWORD = "password123";

const DEMO_USERS: Array<{ name: string; email: string; role: UserRole }> = [
  { name: "Admin User", email: "admin@tba.com", role: "ADMIN" },
  { name: "Hadil PM", email: "hadil@tba.com", role: "PM" },
  { name: "Demo Cleaner", email: "cleaner@tba.com", role: "CLEANER" },
  { name: "Demo Inspector", email: "inspector@tba.com", role: "INSPECTOR" },
  { name: "Demo Owner", email: "owner@tba.com", role: "OWNER" },
];

const ONBOARDING_UNITS = [
  {
    propertyName: "King West Loft",
    unitNumber: "1204",
    address: "1204-88 Blue Jays Way, Toronto, ON M5V 0L7",
    unitStatus: "ONBOARDING" as const,
    bedroomCount: 2,
    bathroomCount: 1,
    ownerName: "Demo Owner",
    ownerEmail: "owner@tba.com",
  },
  {
    propertyName: "Yorkville Suite",
    unitNumber: "PH-02",
    address: "2-155 Yorkville Ave, Toronto, ON M5R 1C4",
    unitStatus: "ONBOARDING" as const,
    bedroomCount: 1,
    bathroomCount: 1,
    ownerName: "Demo Owner",
    ownerEmail: "owner@tba.com",
  },
];

const FULL_INSPECTION_ROOMS: TemplateRoom[] = [
  {
    key: "kitchen",
    name: "Kitchen",
    items: [
      { key: "appliances", label: "Appliances functional", required: true, inputType: "PASS_FAIL", requiresMedia: false },
      { key: "cabinets", label: "Cabinets condition", required: true, inputType: "CONDITION", requiresMedia: false },
      { key: "sink", label: "Sink and faucet", required: true, inputType: "PASS_FAIL", requiresMedia: false },
    ],
  },
  {
    key: "bathroom",
    name: "Bathroom",
    items: [
      { key: "toilet", label: "Toilet functional", required: true, inputType: "PASS_FAIL", requiresMedia: false },
      { key: "shower", label: "Shower/tub condition", required: true, inputType: "CONDITION", requiresMedia: false },
      { key: "vanity", label: "Vanity and sink", required: true, inputType: "PASS_FAIL", requiresMedia: false },
    ],
  },
  {
    key: "bedroom",
    name: "Bedroom",
    items: [
      { key: "flooring", label: "Flooring condition", required: true, inputType: "CONDITION", requiresMedia: false },
      { key: "closet", label: "Closet doors/shelves", required: true, inputType: "PASS_FAIL", requiresMedia: false },
      { key: "windows", label: "Windows and blinds", required: true, inputType: "PASS_FAIL", requiresMedia: false },
    ],
  },
  {
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
  },
];

const ONBOARDING_TEMPLATE_ROOMS: TemplateRoom[] = [
  {
    key: "property_overview",
    name: "Property Overview",
    items: [
      { key: "keys", label: "Keys and access", required: true, inputType: "PASS_FAIL", requiresMedia: false },
      { key: "utilities", label: "Utilities working", required: true, inputType: "PASS_FAIL", requiresMedia: false },
    ],
  },
  {
    key: "living_areas",
    name: "Living Areas",
    items: [
      { key: "flooring", label: "Flooring condition", required: true, inputType: "CONDITION", requiresMedia: false },
      { key: "walls", label: "Walls and paint", required: true, inputType: "CONDITION", requiresMedia: false },
    ],
  },
];

export async function ensureSeedData(): Promise<{ seeded: boolean; message: string }> {
  const markerUser = await storage.getUserByEmail("inspector@tba.com");
  if (markerUser) {
    return { seeded: false, message: "Demo data already exists" };
  }

  const passwordHash = hashPassword(DEMO_PASSWORD);
  const createdUsers: Array<{ id: string; role: string }> = [];

  for (const user of DEMO_USERS) {
    const existing = await storage.getUserByEmail(user.email);
    if (!existing) {
      const created = await storage.createUser({ ...user, passwordHash });
      createdUsers.push({ id: created.id, role: created.role });
    } else {
      createdUsers.push({ id: existing.id, role: existing.role });
    }
  }

  const owner = createdUsers.find((u) => u.role === "OWNER");
  const pm = createdUsers.find((u) => u.role === "PM");
  const inspector = createdUsers.find((u) => u.role === "INSPECTOR");

  const existingUnits = await storage.getUnits();
  const createdUnitIds: string[] = [];

  for (const unit of ONBOARDING_UNITS) {
    const existing = existingUnits.find(
      (u) => u.unitNumber === unit.unitNumber && u.propertyName === unit.propertyName,
    );
    if (!existing) {
      const created = await storage.createUnit({
        ...unit,
        ownerUserId: owner?.id,
        isActive: true,
      });
      createdUnitIds.push(created.id);
    } else {
      createdUnitIds.push(existing.id);
    }
  }

  const activeUnits = [
    { propertyName: "Sunset Apartments", unitNumber: "101", address: "123 Sunset Blvd, Toronto, ON M5V 1A1" },
    { propertyName: "Sunset Apartments", unitNumber: "202", address: "123 Sunset Blvd, Toronto, ON M5V 1A1" },
  ];

  for (const unit of activeUnits) {
    const existing = existingUnits.find(
      (u) => u.unitNumber === unit.unitNumber && u.propertyName === unit.propertyName,
    );
    if (!existing) {
      const created = await storage.createUnit({ ...unit, unitStatus: "ACTIVE", isActive: true });
      createdUnitIds.push(created.id);
    } else {
      createdUnitIds.push(existing.id);
    }
  }

  let fullTemplateId = (await storage.getTemplateByType("FULL_INSPECTION"))?.id;
  if (!fullTemplateId) {
    const template = await storage.createTemplate({
      name: "Standard Full Inspection",
      type: "FULL_INSPECTION",
      rooms: FULL_INSPECTION_ROOMS,
    });
    fullTemplateId = template.id;
  }

  if (!(await storage.getTemplateByType("ONBOARDING"))) {
    await storage.createTemplate({
      name: "Property Onboarding Inspection",
      type: "ONBOARDING",
      rooms: ONBOARDING_TEMPLATE_ROOMS,
    });
  }

  const inspectors = createdUsers.filter((u) => u.role === "INSPECTOR");
  const pms = createdUsers.filter((u) => u.role === "PM" || u.role === "ADMIN");

  if (createdUnitIds.length >= 2 && inspector && pm && fullTemplateId) {
    const existingTasks = await storage.getInspectionTasks();
    if (existingTasks.length === 0) {
      await storage.createInspectionTask({
        type: "ONBOARDING",
        unitId: createdUnitIds[0],
        assignedToUserId: inspector.id,
        responsiblePmId: pm.id,
        templateId: fullTemplateId,
        status: "ASSIGNED",
        createdById: pm.id,
      });
      await storage.createInspectionTask({
        type: "FULL_INSPECTION",
        unitId: createdUnitIds[createdUnitIds.length - 1],
        assignedToUserId: inspectors[0]?.id ?? inspector.id,
        responsiblePmId: pm.id,
        templateId: fullTemplateId,
        status: "ASSIGNED",
        createdById: pm.id,
      });
    }
  }

  if (pms.length >= 1 && inspectors.length >= 1) {
    const existingReports = await storage.getQuickReports();
    if (existingReports.length === 0) {
      await storage.createQuickReport({
        unitNumber: "101",
        location: "KITCHEN",
        severity: "MINOR",
        description: "Minor scratch on countertop near sink area",
        createdById: inspectors[0].id,
        responsiblePmId: pms[0].id,
        status: "NEW",
      });
    }
  }

  return {
    seeded: true,
    message: `Created ${createdUsers.length} demo users and ${createdUnitIds.length} units`,
  };
}
