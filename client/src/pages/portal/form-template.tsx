import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  DndContext, 
  DragOverlay, 
  useSensor, 
  useSensors, 
  PointerSensor,
  pointerWithin,
  rectIntersection,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDraggable,
  useDroppable,
  CollisionDetection,
} from "@dnd-kit/core";
import { 
  SortableContext, 
  useSortable, 
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Switch } from "@/components/ui/switch";
import { 
  FileText, ArrowLeft, Plus, Search, Eye, Trash2, ChevronDown, ChevronRight,
  Gauge, Hash, Tags, AlertCircle, Camera, ToggleLeft, FileEdit, 
  GripVertical, X, Folder, Package, ArrowUp, ArrowDown,
  Circle, CheckSquare, ChevronDownCircle, List, Upload, Type, AlignLeft,
  Wand2, MapPin, Boxes, Paintbrush, Settings2, Bed
} from "lucide-react";
import type { Unit, FormTemplate, InspectionArea, InspectionItem, InspectionBlock, InspectionBlockType } from "@shared/schema";

const INSPECTION_BLOCKS: { type: InspectionBlockType; icon: any; label: string; description: string }[] = [
  { type: "CONDITION", icon: Gauge, label: "Condition", description: "Good/Fair/Damaged dropdown" },
  { type: "ACTION_NEEDED", icon: AlertCircle, label: "Action Needed", description: "Cleaning/Fixing/Replacement" },
  { type: "ISSUES", icon: Tags, label: "Issues", description: "Multi-select issue badges" },
  { type: "COUNT", icon: Hash, label: "Count", description: "Total and damaged count" },
  { type: "MODEL_NUMBER", icon: Tags, label: "Model #", description: "Model number input" },
  { type: "NOTES", icon: FileEdit, label: "Notes", description: "Text notes field" },
  { type: "PHOTOS_VIDEOS", icon: Camera, label: "Photos/Videos", description: "Media upload" },
  { type: "EXISTS", icon: ToggleLeft, label: "Exists", description: "Yes/No checkbox" },
  { type: "RADIO", icon: Circle, label: "Radio Group", description: "Single-choice radio buttons" },
  { type: "CHECKBOX", icon: CheckSquare, label: "Checkbox", description: "Multi-check options" },
  { type: "DROPDOWN", icon: ChevronDownCircle, label: "Dropdown", description: "Single-select dropdown" },
  { type: "MULTI_SELECT", icon: List, label: "Multi-Select", description: "Multi-select dropdown" },
  { type: "AUTO_FILL", icon: Wand2, label: "Auto-Fill", description: "Auto-fill suggestions" },
  { type: "LOCATION", icon: MapPin, label: "Location", description: "Location input field" },
];

const DESIGNER_FIELDS: { id: string; icon: any; label: string }[] = [
  { id: "fileupload", icon: Upload, label: "File Upload" },
  { id: "singleline", icon: Type, label: "Single Line" },
  { id: "longtext", icon: AlignLeft, label: "Long Text" },
  { id: "condition", icon: Gauge, label: "Condition" },
  { id: "count", icon: Hash, label: "Count" },
  { id: "modelnumber", icon: Tags, label: "Model #" },
  { id: "exists", icon: ToggleLeft, label: "Exists" },
  { id: "actionneeded", icon: AlertCircle, label: "Action Needed" },
  { id: "issuebadges", icon: Tags, label: "Issue Badges" },
  { id: "radio", icon: Circle, label: "Radio Group" },
  { id: "checkbox", icon: CheckSquare, label: "Checkbox" },
  { id: "dropdown", icon: ChevronDownCircle, label: "Dropdown" },
  { id: "multiselect", icon: List, label: "Multi-Select" },
  { id: "autofill", icon: Wand2, label: "Auto-Fill" },
  { id: "location", icon: MapPin, label: "Location" },
];

const ALL_DESIGNER_FIELDS: { id: string; type: InspectionBlockType; icon: any; label: string; description: string; needsOptions?: boolean }[] = [
  { id: "condition", type: "CONDITION", icon: Gauge, label: "Condition", description: "Good/Fair/Damaged dropdown" },
  { id: "actionneeded", type: "ACTION_NEEDED", icon: AlertCircle, label: "Action Needed", description: "Cleaning/Fixing/Replacement" },
  { id: "issues", type: "ISSUES", icon: Tags, label: "Issue Badges", description: "Multi-select issue badges" },
  { id: "toggle", type: "EXISTS", icon: ToggleLeft, label: "Toggle", description: "Yes/No switch" },
  { id: "dropdown", type: "DROPDOWN", icon: ChevronDownCircle, label: "Dropdown", description: "Single-select list" },
  { id: "multiselect", type: "MULTI_SELECT", icon: List, label: "Multi-Select", description: "Select multiple options" },
  { id: "number", type: "COUNT", icon: Hash, label: "Number", description: "Numeric input" },
  { id: "textshort", type: "MODEL_NUMBER", icon: Type, label: "Text (Short)", description: "Single-line text" },
  { id: "textlong", type: "NOTES", icon: AlignLeft, label: "Text (Long)", description: "Multi-line text" },
  { id: "photovideo", type: "PHOTOS_VIDEOS", icon: Camera, label: "Photo/Video Upload", description: "Media upload" },
  { id: "checkbox", type: "CHECKBOX", icon: CheckSquare, label: "Checkbox", description: "Multi-check options" },
  { id: "radio", type: "RADIO", icon: Circle, label: "Radio Group", description: "Single-choice options" },
  { id: "location", type: "LOCATION", icon: MapPin, label: "Location", description: "Location input" },
  { id: "autofill", type: "AUTO_FILL", icon: Wand2, label: "Auto-Fill", description: "Auto-fill suggestions" },
];

type ViewMode = "list" | "designer" | "premade";

function generateFullInspectionTemplate(): InspectionArea[] {
  const mkBlock = (type: InspectionBlockType, order: number, opts?: { label?: string; options?: string[]; placeholder?: string; children?: InspectionBlock[] }): InspectionBlock => ({
    id: crypto.randomUUID(),
    type,
    enabled: true,
    order,
    ...(opts?.label ? { label: opts.label } : {}),
    ...(opts?.options ? { options: opts.options } : {}),
    ...(opts?.placeholder ? { placeholder: opts.placeholder } : {}),
    ...(opts?.children ? { children: opts.children } : {}),
  });

  const mkItem = (name: string, blocks: InspectionBlock[]): InspectionItem => ({
    id: crypto.randomUUID(),
    name,
    blocks,
  });

  const mkArea = (name: string, items: InspectionItem[]): InspectionArea => ({
    id: crypto.randomUUID(),
    name,
    items,
  });

  return [
    mkArea("Bedroom", [
      mkItem("Pillows", [
        mkBlock("COUNT", 0, { label: "# of pillows" }),
        mkBlock("PHOTOS_VIDEOS", 1),
        mkBlock("NOTES", 2),
      ]),
      mkItem("Sheets (including spares)", [
        mkBlock("COUNT", 0),
        mkBlock("PHOTOS_VIDEOS", 1),
        mkBlock("NOTES", 2),
      ]),
      mkItem("Duvet Covers (including spares)", [
        mkBlock("COUNT", 0),
        mkBlock("PHOTOS_VIDEOS", 1),
        mkBlock("NOTES", 2),
      ]),
      mkItem("Closet Doors", [
        mkBlock("EXISTS", 0, { label: "Working well" }),
        mkBlock("PHOTOS_VIDEOS", 1),
        mkBlock("NOTES", 2),
      ]),
      mkItem("Enough Hangers (min 10)", [
        mkBlock("EXISTS", 0),
        mkBlock("PHOTOS_VIDEOS", 1),
        mkBlock("NOTES", 2),
      ]),
    ]),
    mkArea("Towels", [
      mkItem("Body Towels", [
        mkBlock("COUNT", 0),
        mkBlock("PHOTOS_VIDEOS", 1),
        mkBlock("NOTES", 2),
      ]),
      mkItem("Hand Towels", [
        mkBlock("COUNT", 0),
        mkBlock("PHOTOS_VIDEOS", 1),
        mkBlock("NOTES", 2),
      ]),
      mkItem("Face Towels", [
        mkBlock("COUNT", 0),
        mkBlock("PHOTOS_VIDEOS", 1),
        mkBlock("NOTES", 2),
      ]),
    ]),
    mkArea("Bathroom", [
      mkItem("Fan", [
        mkBlock("EXISTS", 0, { label: "Working" }),
        mkBlock("PHOTOS_VIDEOS", 1),
        mkBlock("NOTES", 2),
      ]),
      mkItem("Faucets", [
        mkBlock("EXISTS", 0, { label: "Working well", children: [
          { id: crypto.randomUUID(), type: "EXISTS", enabled: true, order: 0, label: "Leaks" },
        ] }),
        mkBlock("PHOTOS_VIDEOS", 1),
        mkBlock("NOTES", 2),
      ]),
      mkItem("Hot and Cold Water", [
        mkBlock("EXISTS", 0),
        mkBlock("PHOTOS_VIDEOS", 1),
        mkBlock("NOTES", 2),
      ]),
      mkItem("Clogs", [
        mkBlock("EXISTS", 0),
        mkBlock("PHOTOS_VIDEOS", 1),
        mkBlock("NOTES", 2),
      ]),
      mkItem("Toilet", [
        mkBlock("EXISTS", 0, { label: "Noisy" }),
        mkBlock("PHOTOS_VIDEOS", 1),
        mkBlock("NOTES", 2),
      ]),
      mkItem("Shower Curtain/Glass Panel", [
        mkBlock("CONDITION", 0, { options: ["Good", "Needs attention"] }),
        mkBlock("PHOTOS_VIDEOS", 1),
        mkBlock("NOTES", 2),
      ]),
      mkItem("Hairdryer", [
        mkBlock("EXISTS", 0, { label: "Working" }),
        mkBlock("LOCATION", 1),
        mkBlock("PHOTOS_VIDEOS", 2),
        mkBlock("NOTES", 3),
      ]),
      mkItem("Silicone (sink/bathtub/shower)", [
        mkBlock("CONDITION", 0, { options: ["Good", "Needs Attention - Minor", "Needs Attention - Moderate", "Needs Attention - Severe"] }),
        mkBlock("PHOTOS_VIDEOS", 1),
        mkBlock("NOTES", 2),
      ]),
    ]),
    mkArea("Living Room", [
      mkItem("Couch", [
        mkBlock("CONDITION", 0, { options: ["Good", "Needs attention"] }),
        mkBlock("PHOTOS_VIDEOS", 1),
        mkBlock("NOTES", 2),
      ]),
      mkItem("Cushions", [
        mkBlock("COUNT", 0),
        mkBlock("CONDITION", 1),
        mkBlock("PHOTOS_VIDEOS", 2),
        mkBlock("NOTES", 3),
      ]),
      mkItem("Coffee Table", [
        mkBlock("CONDITION", 0),
        mkBlock("PHOTOS_VIDEOS", 1),
        mkBlock("NOTES", 2),
      ]),
    ]),
    mkArea("TV/Media Unit", [
      mkItem("TV Remote", [
        mkBlock("EXISTS", 0, { label: "Working" }),
        mkBlock("NOTES", 1, { placeholder: "Battery type if not working" }),
        mkBlock("PHOTOS_VIDEOS", 2),
      ]),
    ]),
    mkArea("Kitchen", [
      mkItem("Refrigerator", [
        mkBlock("EXISTS", 0, { label: "Working" }),
        mkBlock("CONDITION", 1),
        mkBlock("PHOTOS_VIDEOS", 2),
        mkBlock("NOTES", 3),
      ]),
      mkItem("Stove/Oven", [
        mkBlock("EXISTS", 0, { label: "Working" }),
        mkBlock("CONDITION", 1),
        mkBlock("PHOTOS_VIDEOS", 2),
        mkBlock("NOTES", 3),
      ]),
      mkItem("Microwave", [
        mkBlock("EXISTS", 0, { label: "Working" }),
        mkBlock("CONDITION", 1),
        mkBlock("PHOTOS_VIDEOS", 2),
        mkBlock("NOTES", 3),
      ]),
      mkItem("Dishwasher", [
        mkBlock("EXISTS", 0, { label: "Working" }),
        mkBlock("CONDITION", 1),
        mkBlock("PHOTOS_VIDEOS", 2),
        mkBlock("NOTES", 3),
      ]),
      mkItem("Coffee Machine", [
        mkBlock("EXISTS", 0, { label: "Exists" }),
        mkBlock("CONDITION", 1),
        mkBlock("PHOTOS_VIDEOS", 2),
        mkBlock("NOTES", 3),
      ]),
      mkItem("Countertops", [
        mkBlock("CONDITION", 0),
        mkBlock("PHOTOS_VIDEOS", 1),
        mkBlock("NOTES", 2),
      ]),
      mkItem("Sink/Faucets", [
        mkBlock("EXISTS", 0, { label: "Working" }),
        mkBlock("NOTES", 1, { placeholder: "Note any leaks" }),
        mkBlock("PHOTOS_VIDEOS", 2),
      ]),
      mkItem("Cabinets", [
        mkBlock("CONDITION", 0),
        mkBlock("PHOTOS_VIDEOS", 1),
        mkBlock("NOTES", 2),
      ]),
      mkItem("Pots", [
        mkBlock("COUNT", 0),
        mkBlock("CONDITION", 1),
        mkBlock("PHOTOS_VIDEOS", 2),
        mkBlock("NOTES", 3),
      ]),
      mkItem("Pans", [
        mkBlock("COUNT", 0),
        mkBlock("CONDITION", 1),
        mkBlock("PHOTOS_VIDEOS", 2),
        mkBlock("NOTES", 3),
      ]),
      mkItem("Glasses (min 6)", [
        mkBlock("EXISTS", 0),
        mkBlock("PHOTOS_VIDEOS", 1),
        mkBlock("NOTES", 2),
      ]),
      mkItem("Cutlery", [
        mkBlock("EXISTS", 0),
        mkBlock("PHOTOS_VIDEOS", 1),
        mkBlock("NOTES", 2),
      ]),
      mkItem("Knife Set", [
        mkBlock("EXISTS", 0, { label: "Available" }),
        mkBlock("NOTES", 1, { placeholder: "Any knives missing" }),
        mkBlock("PHOTOS_VIDEOS", 2),
      ]),
      mkItem("Oven Mitts", [
        mkBlock("EXISTS", 0, { label: "Available" }),
        mkBlock("PHOTOS_VIDEOS", 1),
        mkBlock("NOTES", 2),
      ]),
      mkItem("Electric Kettle", [
        mkBlock("EXISTS", 0, { label: "Damaged" }),
        mkBlock("PHOTOS_VIDEOS", 1),
        mkBlock("NOTES", 2),
      ]),
      mkItem("Silicone (sink/cabinets)", [
        mkBlock("CONDITION", 0, { options: ["Good", "Needs Attention - Minor", "Needs Attention - Moderate", "Needs Attention - Severe"] }),
        mkBlock("PHOTOS_VIDEOS", 1),
        mkBlock("NOTES", 2),
      ]),
    ]),
    mkArea("Dining Area and Hallways", [
      mkItem("Dining Table", [
        mkBlock("CONDITION", 0),
        mkBlock("PHOTOS_VIDEOS", 1),
        mkBlock("NOTES", 2),
      ]),
      mkItem("Chairs", [
        mkBlock("COUNT", 0),
        mkBlock("CONDITION", 1),
        mkBlock("PHOTOS_VIDEOS", 2),
        mkBlock("NOTES", 3),
      ]),
      mkItem("Closets/Storage", [
        mkBlock("CONDITION", 0),
        mkBlock("PHOTOS_VIDEOS", 1),
        mkBlock("NOTES", 2),
      ]),
      mkItem("Vacuum", [
        mkBlock("CONDITION", 0),
        mkBlock("PHOTOS_VIDEOS", 1),
        mkBlock("NOTES", 2),
      ]),
    ]),
    mkArea("General", [
      mkItem("Lighting Fixtures and Lamps", [
        mkBlock("EXISTS", 0, { label: "Working" }),
        mkBlock("NOTES", 1, { placeholder: "Bulb base type if not working" }),
        mkBlock("PHOTOS_VIDEOS", 2),
      ]),
      mkItem("Doors/Locks", [
        mkBlock("EXISTS", 0, { label: "Working" }),
        mkBlock("PHOTOS_VIDEOS", 1),
        mkBlock("NOTES", 2),
      ]),
      mkItem("Windows", [
        mkBlock("CONDITION", 0),
        mkBlock("EXISTS", 1, { label: "Locks working" }),
        mkBlock("PHOTOS_VIDEOS", 2),
        mkBlock("NOTES", 3),
      ]),
      mkItem("Flooring", [
        mkBlock("CONDITION", 0),
        mkBlock("PHOTOS_VIDEOS", 1),
        mkBlock("NOTES", 2),
      ]),
      mkItem("Walls/Paint", [
        mkBlock("CONDITION", 0),
        mkBlock("PHOTOS_VIDEOS", 1),
        mkBlock("NOTES", 2),
      ]),
      mkItem("Heating/Cooling System", [
        mkBlock("EXISTS", 0, { label: "Working" }),
        mkBlock("PHOTOS_VIDEOS", 1),
        mkBlock("NOTES", 2),
      ]),
      mkItem("WiFi", [
        mkBlock("EXISTS", 0, { label: "Working" }),
        mkBlock("PHOTOS_VIDEOS", 1),
        mkBlock("NOTES", 2),
      ]),
      mkItem("Balcony", [
        mkBlock("CONDITION", 0),
        mkBlock("PHOTOS_VIDEOS", 1),
        mkBlock("NOTES", 2),
      ]),
    ]),
    mkArea("Unit Supplies", [
      mkItem("Toilet Paper", [
        mkBlock("EXISTS", 0, { label: "Stocked" }),
        mkBlock("COUNT", 1, { label: "Quantity" }),
        mkBlock("PHOTOS_VIDEOS", 2),
        mkBlock("NOTES", 3),
      ]),
      mkItem("Dishwasher Pods", [
        mkBlock("EXISTS", 0, { label: "Stocked" }),
        mkBlock("COUNT", 1, { label: "Quantity" }),
        mkBlock("PHOTOS_VIDEOS", 2),
        mkBlock("NOTES", 3),
      ]),
      mkItem("Laundry Pods", [
        mkBlock("EXISTS", 0, { label: "Stocked" }),
        mkBlock("COUNT", 1, { label: "Quantity" }),
        mkBlock("PHOTOS_VIDEOS", 2),
        mkBlock("NOTES", 3),
      ]),
      mkItem("Coffee Pods", [
        mkBlock("EXISTS", 0, { label: "Stocked" }),
        mkBlock("COUNT", 1, { label: "Quantity" }),
        mkBlock("PHOTOS_VIDEOS", 2),
        mkBlock("NOTES", 3),
      ]),
      mkItem("Garbage Bags", [
        mkBlock("EXISTS", 0, { label: "Stocked" }),
        mkBlock("COUNT", 1, { label: "Quantity" }),
        mkBlock("PHOTOS_VIDEOS", 2),
        mkBlock("NOTES", 3),
      ]),
      mkItem("Paper Towel", [
        mkBlock("EXISTS", 0, { label: "Stocked" }),
        mkBlock("COUNT", 1, { label: "Quantity" }),
        mkBlock("PHOTOS_VIDEOS", 2),
        mkBlock("NOTES", 3),
      ]),
    ]),
  ];
}

function generateOnboardingInspectionTemplate(): InspectionArea[] {
  const mkBlock = (type: InspectionBlockType, order: number, opts?: { label?: string; options?: string[]; placeholder?: string }): InspectionBlock => ({
    id: crypto.randomUUID(),
    type,
    enabled: true,
    order,
    ...(opts?.label ? { label: opts.label } : {}),
    ...(opts?.options ? { options: opts.options } : {}),
    ...(opts?.placeholder ? { placeholder: opts.placeholder } : {}),
  });

  const mkItem = (name: string, blocks: InspectionBlock[]): InspectionItem => ({
    id: crypto.randomUUID(),
    name,
    blocks,
  });

  const mkArea = (name: string, items: InspectionItem[]): InspectionArea => ({
    id: crypto.randomUUID(),
    name,
    items,
  });

  const CONDITIONS = ["Good", "Fair", "Stained", "Peeling", "Cracked", "Damaged", "Broken", "Missing", "Worn"];

  const buildItemBlocks = (cfg: {
    hasExistsField?: boolean;
    hasCount?: boolean;
    issues?: string[];
    hasModelNumber?: boolean;
    hasLocation?: boolean;
  }): InspectionBlock[] => {
    const blocks: InspectionBlock[] = [];
    let order = 0;

    if (cfg.hasExistsField) {
      blocks.push(mkBlock("EXISTS", order++));
    }

    blocks.push(mkBlock("CONDITION", order++, { options: CONDITIONS }));

    if (cfg.hasCount) {
      blocks.push(mkBlock("COUNT", order++));
    }

    if (cfg.issues && cfg.issues.length > 0) {
      blocks.push(mkBlock("ISSUES", order++, { options: cfg.issues }));
    }

    if (cfg.hasModelNumber) {
      blocks.push(mkBlock("MODEL_NUMBER", order++));
    }

    if (cfg.hasLocation) {
      blocks.push(mkBlock("LOCATION", order++));
    }

    blocks.push(mkBlock("ACTION_NEEDED", order++, { options: ["None", "Needs Cleaning", "Needs Fixing", "Needs Replacement"] }));
    blocks.push(mkBlock("NOTES", order++));
    blocks.push(mkBlock("PHOTOS_VIDEOS", order++));

    return blocks;
  };

  return [
    mkArea("Living Room", [
      mkItem("Couch", buildItemBlocks({ hasCount: true, issues: ["Discoloration", "Looks old", "Wear and tear", "Stains", "Rips/tears", "Sagging cushions", "Broken frame"] })),
      mkItem("Coffee Table", buildItemBlocks({ hasCount: true, issues: ["Scratches", "Water rings", "Wobbly", "Chipped edges"] })),
      mkItem("TV Stand", buildItemBlocks({ issues: ["Scratches", "Broken doors", "Missing parts", "Wobbly"] })),
      mkItem("TV", buildItemBlocks({ issues: ["Not working", "Screen damaged", "Remote missing", "Poor picture"], hasModelNumber: true })),
      mkItem("Armchairs", buildItemBlocks({ hasCount: true, issues: ["Stains", "Wear and tear", "Wobbly legs", "Fabric damage"] })),
      mkItem("Side Tables", buildItemBlocks({ hasCount: true, issues: ["Scratches", "Water rings", "Wobbly"] })),
      mkItem("Lamps", buildItemBlocks({ hasCount: true, issues: ["Not working", "Shade damaged", "Missing bulb", "Cord damaged"] })),
      mkItem("Ceiling Light", buildItemBlocks({ issues: ["Not working", "Flickering", "Fixture damaged", "Missing bulbs"] })),
      mkItem("Windows", buildItemBlocks({ issues: ["Won't open", "Cracked glass", "Broken lock", "Drafty", "Dirty"] })),
      mkItem("Blinds/Curtains", buildItemBlocks({ issues: ["Broken slats", "Won't open/close", "Stains", "Missing"] })),
      mkItem("Walls", buildItemBlocks({ issues: ["Stains", "Peeling paint", "Holes", "Cracks", "Scuff marks"] })),
      mkItem("Flooring", buildItemBlocks({ issues: ["Scratches", "Stains", "Loose boards", "Worn carpet", "Creaky"] })),
      mkItem("Outlets", buildItemBlocks({ issues: ["Not working", "Loose", "Damaged cover"] })),
      mkItem("HVAC", buildItemBlocks({ hasExistsField: true, hasModelNumber: true, issues: ["Not working", "Noisy", "Dirty", "Cover damaged"] })),
      mkItem("Thermostat", buildItemBlocks({ hasLocation: true, issues: ["Not working", "Unresponsive", "Inaccurate"] })),
    ]),
    mkArea("Dining Room", [
      mkItem("Dining Table", buildItemBlocks({ issues: ["Scratches", "Water rings", "Wobbly", "Stains", "Chipped edges"] })),
      mkItem("Dining Chairs", buildItemBlocks({ hasCount: true, issues: ["Wobbly", "Stains", "Fabric damage", "Scratches", "Broken legs"] })),
      mkItem("Buffet/Sideboard", buildItemBlocks({ issues: ["Scratches", "Broken doors", "Missing parts", "Water damage"] })),
      mkItem("Chandelier/Light", buildItemBlocks({ issues: ["Not working", "Flickering", "Missing bulbs", "Dirty"] })),
      mkItem("Windows", buildItemBlocks({ issues: ["Won't open", "Cracked glass", "Broken lock", "Drafty"] })),
      mkItem("Blinds/Curtains", buildItemBlocks({ issues: ["Broken slats", "Won't open/close", "Stains", "Missing"] })),
      mkItem("Walls", buildItemBlocks({ issues: ["Stains", "Peeling paint", "Holes", "Cracks"] })),
      mkItem("Flooring", buildItemBlocks({ issues: ["Scratches", "Stains", "Loose boards", "Worn"] })),
    ]),
    mkArea("Kitchen", [
      mkItem("Oven", buildItemBlocks({ hasExistsField: true, hasModelNumber: true, issues: ["Burners not working", "Oven not heating", "Knobs missing", "Timer broken", "Dirty"] })),
      mkItem("Microwave", buildItemBlocks({ hasExistsField: true, hasModelNumber: true, issues: ["Not heating", "Turntable broken", "Door damaged", "Buttons not working"] })),
      mkItem("Kettle", buildItemBlocks({ hasExistsField: true, hasModelNumber: true, issues: ["Not heating", "Leaking", "Lid broken", "Scale buildup"] })),
      mkItem("Coffee Machine", buildItemBlocks({ hasExistsField: true, hasModelNumber: true, issues: ["Not working", "Leaking", "Dirty", "Missing parts"] })),
      mkItem("Garbage Disposal", buildItemBlocks({ hasExistsField: true, issues: ["Not working", "Noisy", "Jammed", "Leaking"] })),
      mkItem("Exhaust Hood", buildItemBlocks({ issues: ["Not working", "Noisy", "Filter dirty", "Light broken"] })),
      mkItem("Sink", buildItemBlocks({ issues: ["Leaking", "Slow drain", "Chips/cracks", "Stains"] })),
      mkItem("Faucet", buildItemBlocks({ hasModelNumber: true, issues: ["Leaking", "Low pressure", "Hard to turn", "Sprayer broken"] })),
      mkItem("Cabinets", buildItemBlocks({ issues: ["Doors won't close", "Missing handles", "Shelves broken", "Water damage", "Hinges broken"] })),
      mkItem("Countertops", buildItemBlocks({ issues: ["Scratches", "Stains", "Chips", "Burn marks", "Loose"] })),
      mkItem("Ceiling Light", buildItemBlocks({ issues: ["Not working", "Flickering", "Fixture damaged"] })),
      mkItem("Walls", buildItemBlocks({ issues: ["Stains", "Grease marks", "Peeling paint", "Holes"] })),
      mkItem("Flooring", buildItemBlocks({ issues: ["Scratches", "Stains", "Loose tiles", "Grout damage"] })),
    ]),
    mkArea("Bedroom", [
      mkItem("Bed Frame", buildItemBlocks({ issues: ["Squeaky", "Broken slats", "Wobbly", "Scratches"] })),
      mkItem("Mattress", buildItemBlocks({ issues: ["Stains", "Sagging", "Worn", "Odor"] })),
      mkItem("Nightstands", buildItemBlocks({ hasCount: true, issues: ["Scratches", "Drawer broken", "Wobbly", "Water rings"] })),
      mkItem("Dresser", buildItemBlocks({ issues: ["Drawers stuck", "Missing handles", "Scratches", "Mirror damaged"] })),
      mkItem("Desk", buildItemBlocks({ issues: ["Scratches", "Wobbly", "Drawers broken"] })),
      mkItem("Desk Chair", buildItemBlocks({ issues: ["Wobbly", "Fabric damage", "Wheels broken", "Height adjustment broken"] })),
      mkItem("Wardrobe/Closet", buildItemBlocks({ issues: ["Doors damaged", "Shelves broken", "Rod bent", "Light not working"] })),
      mkItem("Ceiling Light", buildItemBlocks({ issues: ["Not working", "Flickering", "Fixture damaged"] })),
      mkItem("Bedside Lamps", buildItemBlocks({ hasCount: true, issues: ["Not working", "Shade damaged", "Missing bulb"] })),
      mkItem("Windows", buildItemBlocks({ issues: ["Won't open", "Cracked glass", "Broken lock", "Drafty"] })),
      mkItem("Blinds/Curtains", buildItemBlocks({ issues: ["Broken slats", "Won't open/close", "Stains", "Missing"] })),
      mkItem("Walls", buildItemBlocks({ issues: ["Stains", "Peeling paint", "Holes", "Cracks"] })),
      mkItem("Flooring", buildItemBlocks({ issues: ["Scratches", "Stains", "Loose boards", "Worn carpet"] })),
      mkItem("Outlets", buildItemBlocks({ issues: ["Not working", "Loose", "Damaged cover"] })),
      mkItem("TV", buildItemBlocks({ hasModelNumber: true, issues: ["Not working", "Screen damaged", "Remote missing", "Poor picture"] })),
    ]),
    mkArea("Bathroom", [
      mkItem("Toilet", buildItemBlocks({ issues: ["Running water", "Loose seat", "Stains", "Won't flush", "Leaking base"] })),
      mkItem("Sink/Vanity", buildItemBlocks({ issues: ["Chips/cracks", "Stains", "Cabinet damaged", "Drawer broken"] })),
      mkItem("Faucet", buildItemBlocks({ hasModelNumber: true, issues: ["Leaking", "Low pressure", "Hard to turn", "Handles loose"] })),
      mkItem("Shower/Tub", buildItemBlocks({ issues: ["Slow drain", "Chips/cracks", "Stains", "Grout damage", "Caulk peeling"] })),
      mkItem("Showerhead", buildItemBlocks({ issues: ["Low pressure", "Leaking", "Clogged", "Broken mount"] })),
      mkItem("Mirror", buildItemBlocks({ issues: ["Cracked", "Peeling edges", "Cloudy", "Loose mount"] })),
      mkItem("Medicine Cabinet", buildItemBlocks({ issues: ["Door broken", "Shelves broken", "Mirror damaged", "Hinges broken"] })),
      mkItem("Tiles", buildItemBlocks({ issues: ["Cracked", "Loose", "Grout damage", "Stains", "Mold"] })),
      mkItem("Exhaust Fan", buildItemBlocks({ hasExistsField: true, issues: ["Not working", "Noisy", "Dirty"] })),
      mkItem("Towel Rack", buildItemBlocks({ issues: ["Loose", "Broken", "Missing"] })),
      mkItem("Toilet Paper Holder", buildItemBlocks({ issues: ["Loose", "Broken", "Missing"] })),
      mkItem("Lighting", buildItemBlocks({ issues: ["Not working", "Flickering", "Fixture damaged"] })),
      mkItem("Flooring", buildItemBlocks({ issues: ["Stains", "Loose tiles", "Water damage", "Grout damage"] })),
      mkItem("Hair Dryer", buildItemBlocks({ hasExistsField: true, hasLocation: true, issues: ["Not working", "Cord damaged", "Overheating"] })),
      mkItem("Shower Curtain", buildItemBlocks({ hasExistsField: true, issues: ["Dirty", "Mold", "Torn", "Missing rings", "Needs replacement"] })),
    ]),
    mkArea("Closet", [
      mkItem("Iron", buildItemBlocks({ hasExistsField: true, issues: ["Not working", "Dirty plate", "Cord damaged", "Leaking"] })),
      mkItem("Iron Board", buildItemBlocks({ hasExistsField: true, issues: ["Wobbly", "Cover stained", "Cover torn", "Broken legs"] })),
      mkItem("Vacuum", buildItemBlocks({ hasExistsField: true, hasModelNumber: true, issues: ["Not working", "Weak suction", "Broken attachments", "Full bag/bin"] })),
      mkItem("Hangers", buildItemBlocks({ hasExistsField: true, hasCount: true, issues: ["Broken", "Missing"] })),
      mkItem("Fuse Box", buildItemBlocks({ hasLocation: true, issues: ["Cover damaged", "Labels missing", "Corrosion"] })),
      mkItem("Closet Door", buildItemBlocks({ issues: ["Won't close", "Squeaky", "Damaged", "Off track"] })),
      mkItem("Shelves", buildItemBlocks({ issues: ["Broken", "Loose", "Missing"] })),
    ]),
    mkArea("Appliances", [
      mkItem("Washer", buildItemBlocks({ hasExistsField: true, hasModelNumber: true, issues: ["Not working", "Leaking", "Noisy", "Won't drain", "Won't spin", "Error codes"] })),
      mkItem("Dryer", buildItemBlocks({ hasExistsField: true, hasModelNumber: true, issues: ["Not heating", "Not working", "Noisy", "Won't tumble", "Lint trap damaged"] })),
      mkItem("Refrigerator", buildItemBlocks({ hasExistsField: true, hasModelNumber: true, issues: ["Not cooling", "Noisy", "Ice maker broken", "Door seal damaged", "Interior damage", "Dirty"] })),
      mkItem("Dishwasher", buildItemBlocks({ hasExistsField: true, hasModelNumber: true, issues: ["Not cleaning", "Leaking", "Noisy", "Won't drain", "Door broken"] })),
      mkItem("Heater", buildItemBlocks({ hasExistsField: true, hasModelNumber: true, issues: ["Not heating", "Noisy", "Thermostat broken", "Pilot light out"] })),
      mkItem("Smoke Detectors", buildItemBlocks({ hasExistsField: true, hasCount: true, hasLocation: true, issues: ["Not working", "Low battery", "Missing"] })),
    ]),
    mkArea("Kitchen Inventory", [
      mkItem("Mugs", buildItemBlocks({ hasCount: true, issues: ["Chipped", "Cracked", "Stained"] })),
      mkItem("Wine Glasses", buildItemBlocks({ hasCount: true, issues: ["Chipped", "Cracked"] })),
      mkItem("Plates", buildItemBlocks({ hasCount: true, issues: ["Chipped", "Cracked", "Stained"] })),
      mkItem("Bowls", buildItemBlocks({ hasCount: true, issues: ["Chipped", "Cracked", "Stained"] })),
      mkItem("Utensils Set", buildItemBlocks({ hasCount: true, issues: ["Missing pieces", "Damaged"] })),
      mkItem("Pots & Pans", buildItemBlocks({ hasCount: true, issues: ["Scratched", "Burnt", "Missing lids", "Damaged handles"] })),
      mkItem("Cutting Boards", buildItemBlocks({ hasCount: true, issues: ["Cracked", "Stained", "Warped"] })),
      mkItem("Knives Set", buildItemBlocks({ issues: ["Missing pieces", "Dull", "Damaged"] })),
    ]),
  ];
}

const CONFIGURABLE_TYPES: InspectionBlockType[] = [
  "CONDITION", "ACTION_NEEDED", "ISSUES",
  "RADIO", "DROPDOWN", "MULTI_SELECT", "CHECKBOX", "AUTO_FILL",
];

const NEEDS_PLACEHOLDER_TYPES: InspectionBlockType[] = [
  "NOTES", "MODEL_NUMBER", "LOCATION", "COUNT", "PHOTOS_VIDEOS",
];

const NEEDS_TOGGLE_LABELS: InspectionBlockType[] = [
  "EXISTS",
];

function isConfigurableType(type: InspectionBlockType): boolean {
  return CONFIGURABLE_TYPES.includes(type) || NEEDS_PLACEHOLDER_TYPES.includes(type) || NEEDS_TOGGLE_LABELS.includes(type);
}

function getDefaultLabel(type: InspectionBlockType): string {
  const config = INSPECTION_BLOCKS.find(b => b.type === type);
  return config?.label || type;
}

function getDefaultOptions(type: InspectionBlockType): string[] | undefined {
  switch (type) {
    case "CONDITION":
      return ["Good", "Fair", "Stained", "Peeling", "Cracked", "Damaged", "Broken", "Missing", "Worn"];
    case "ACTION_NEEDED":
      return ["None", "Needs Cleaning", "Needs Fixing", "Needs Replacement"];
    case "ISSUES":
      return ["Scratched", "Stained", "Chipped", "Dented", "Faded", "Loose", "Noisy"];
    default:
      return undefined;
  }
}

function BlockConfigDialog({
  open,
  onOpenChange,
  block,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: InspectionBlock | null;
  onSave: (updated: Partial<InspectionBlock>) => void;
}) {
  const [label, setLabel] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [trueLabel, setTrueLabel] = useState("");
  const [falseLabel, setFalseLabel] = useState("");

  const needsOptions = block ? CONFIGURABLE_TYPES.includes(block.type) : false;
  const needsPlaceholder = block ? NEEDS_PLACEHOLDER_TYPES.includes(block.type) : false;
  const needsToggleLabels = block ? NEEDS_TOGGLE_LABELS.includes(block.type) : false;

  useEffect(() => {
    if (block && open) {
      setLabel(block.label || getDefaultLabel(block.type));
      setOptions(block.options || []);
      setPlaceholder(block.placeholder || "");
      setTrueLabel(block.trueLabel || "");
      setFalseLabel(block.falseLabel || "");
      setNewOption("");
    }
  }, [block, open]);

  const blockConfig = block ? INSPECTION_BLOCKS.find(b => b.type === block.type) : null;

  const handleAddOption = () => {
    const trimmed = newOption.trim();
    if (trimmed && !options.includes(trimmed)) {
      setOptions([...options, trimmed]);
      setNewOption("");
    }
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const updates: Partial<InspectionBlock> = { label: label.trim() || getDefaultLabel(block!.type) };
    if (needsOptions) updates.options = options;
    if (needsPlaceholder) updates.placeholder = placeholder;
    if (needsToggleLabels) {
      updates.trueLabel = trueLabel;
      updates.falseLabel = falseLabel;
    }
    onSave(updates);
    onOpenChange(false);
  };

  if (!block) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Configure {blockConfig?.label || block.type}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Field Label</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={getDefaultLabel(block.type)}
              data-testid="input-block-label"
            />
          </div>

          {needsOptions && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {block.type === "CHECKBOX" ? "Checkbox Options" : "Options"}
              </Label>
              <p className="text-xs text-muted-foreground">
                {block.type === "RADIO" && "Add the choices for this radio group"}
                {block.type === "DROPDOWN" && "Add the dropdown options"}
                {block.type === "MULTI_SELECT" && "Add the selectable options"}
                {block.type === "CHECKBOX" && "Add the checkbox items"}
                {block.type === "AUTO_FILL" && "Add suggestion values"}
              </p>
              <div className="space-y-1.5">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const updated = [...options];
                        updated[i] = e.target.value;
                        setOptions(updated);
                      }}
                      className="flex-1 h-8 text-sm"
                      data-testid={`input-option-${i}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOption(i)}
                      className="h-8 w-8 text-destructive"
                      data-testid={`button-remove-option-${i}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder="Type an option and press Add"
                  className="flex-1 h-8 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddOption())}
                  data-testid="input-new-option"
                />
                <Button type="button" size="sm" variant="outline" onClick={handleAddOption} data-testid="button-add-option">
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          )}

          {needsPlaceholder && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Placeholder Text</Label>
              <Input
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
                placeholder="Enter placeholder text..."
                data-testid="input-block-placeholder"
              />
            </div>
          )}

          {needsToggleLabels && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Toggle Labels</Label>
              <p className="text-xs text-muted-foreground">Customize the labels shown for each toggle state</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">True (ON)</Label>
                  <Input
                    value={trueLabel}
                    onChange={(e) => setTrueLabel(e.target.value)}
                    placeholder="Yes"
                    data-testid="input-true-label"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">False (OFF)</Label>
                  <Input
                    value={falseLabel}
                    onChange={(e) => setFalseLabel(e.target.value)}
                    placeholder="No"
                    data-testid="input-false-label"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-config-cancel">
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} data-testid="button-config-save">
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Sortable Block Component with droppable capability
function SortableBlock({ 
  block, 
  blockConfig, 
  areaId, 
  itemId, 
  onToggle,
  onConfigure,
  isDraggingFromSidebar,
  onHover,
  isHovered
}: { 
  block: InspectionBlock; 
  blockConfig: { type: InspectionBlockType; icon: any; label: string; description: string };
  areaId: string;
  itemId: string;
  onToggle: (areaId: string, itemId: string, blockType: InspectionBlockType) => void;
  onConfigure?: (block: InspectionBlock) => void;
  isDraggingFromSidebar?: boolean;
  onHover?: (blockId: string | null) => void;
  isHovered?: boolean;
}) {
  const { attributes, listeners, setNodeRef: setSortableRef, transform, transition, isDragging } = useSortable({ 
    id: block.id 
  });
  
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `block-drop-${areaId}-${itemId}-${block.id}`,
    data: { type: 'block-target', areaId, itemId, blockId: block.id, blockOrder: block.order }
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  
  const Icon = blockConfig.icon;
  const showHighlight = isOver || isHovered;
  const hasChildren = block.children && block.children.length > 0;
  
  return (
    <div className="space-y-1">
      <div 
        ref={(node) => {
          setSortableRef(node);
          setDroppableRef(node);
        }}
        style={style}
        className={`flex items-center gap-2 p-2 rounded-lg border transition-all duration-150 ${
          block.enabled ? "border-primary bg-primary/5" : "border-muted"
        } ${showHighlight ? "ring-2 ring-primary ring-offset-1 bg-primary/10" : ""}`}
        data-testid={`block-${block.type}-${itemId}`}
        onMouseEnter={() => isDraggingFromSidebar && onHover?.(block.id)}
        onMouseLeave={() => isDraggingFromSidebar && onHover?.(null)}
      >
        <div {...attributes} {...listeners} className="cursor-grab">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <Checkbox
          checked={block.enabled}
          onCheckedChange={() => onToggle(areaId, itemId, block.type)}
          data-testid={`checkbox-block-${block.type}-${itemId}`}
        />
        <Icon className={`h-4 w-4 ${block.enabled ? "text-primary" : "text-muted-foreground"}`} />
        <div className={`text-sm flex-1 min-w-0 ${block.enabled ? "font-medium" : "text-muted-foreground"}`}>
          <span>{block.label || blockConfig.label}</span>
          {block.options && block.options.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-1">
              {block.options.slice(0, 3).map((opt, i) => (
                <Badge key={i} variant="outline" className="text-[10px] py-0">{opt}</Badge>
              ))}
              {block.options.length > 3 && (
                <Badge variant="outline" className="text-[10px] py-0">+{block.options.length - 3}</Badge>
              )}
            </div>
          )}
        </div>
        {isConfigurableType(block.type) && onConfigure && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="p-1 rounded hover:bg-muted"
                onClick={(e) => { e.stopPropagation(); onConfigure(block); }}
                data-testid={`button-configure-block-${block.id}`}
              >
                <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Configure field</TooltipContent>
          </Tooltip>
        )}
        {hasChildren && (
          <Badge variant="secondary" className="text-xs">
            {block.children!.length} child{block.children!.length > 1 ? 'ren' : ''}
          </Badge>
        )}
      </div>
      {/* Render child blocks */}
      {hasChildren && (
        <div className="ml-6 pl-2 border-l-2 border-primary/20 space-y-1">
          {[...block.children!].sort((a, b) => a.order - b.order).map(childBlock => {
            const childConfig = INSPECTION_BLOCKS.find(c => c.type === childBlock.type);
            if (!childConfig) return null;
            const ChildIcon = childConfig.icon;
            return (
              <div 
                key={childBlock.id}
                className={`flex items-center gap-2 p-2 rounded-lg border text-sm ${
                  childBlock.enabled ? "border-primary/50 bg-primary/5" : "border-muted"
                }`}
                data-testid={`child-block-${childBlock.type}-${block.id}`}
              >
                <ChildIcon className={`h-3 w-3 ${childBlock.enabled ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`flex-1 ${childBlock.enabled ? "font-medium" : "text-muted-foreground"}`}>
                  {childConfig.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Draggable Designer Item Component (source-only, uses useDraggable)
function DraggableDesignerItem({ 
  field, 
  isExpanded,
  onClick
}: { 
  field: { id: string; icon: any; label: string }; 
  isExpanded: boolean;
  onClick?: (fieldId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({ 
    id: `designer-${field.id}`,
    data: { type: 'designer', field }
  });
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;
  
  const Icon = field.icon;
  
  return (
    <div 
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      className={`flex items-center gap-3 p-2 rounded-md hover-elevate cursor-grab group ${
        isExpanded ? "justify-start" : "justify-center"
      } ${isDragging ? "opacity-50 z-50" : ""}`}
      data-testid={`designer-item-${field.id}`}
      onPointerUp={(e) => { 
        if (!isDragging) { 
          e.stopPropagation(); 
          onClick?.(field.id); 
        }
      }}
    >
      <Icon className="h-4 w-4 text-primary/70 flex-shrink-0" />
      {isExpanded && (
        <span className="text-sm text-foreground whitespace-nowrap">{field.label}</span>
      )}
    </div>
  );
}

function DraggableBlockItem({ 
  block, 
  isExpanded,
  onClick
}: { 
  block: { type: InspectionBlockType; icon: any; label: string; description: string }; 
  isExpanded: boolean;
  onClick?: (blockType: InspectionBlockType) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({ 
    id: `block-${block.type}`,
    data: { type: 'available-block', block }
  });
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;
  
  const Icon = block.icon;
  
  return (
    <div 
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      className={`flex items-center gap-3 p-2 rounded-md hover-elevate cursor-grab group ${
        isExpanded ? "justify-start" : "justify-center"
      } ${isDragging ? "opacity-50 z-50" : ""}`}
      data-testid={`available-block-${block.type}`}
      onPointerUp={(e) => { 
        if (!isDragging) { 
          e.stopPropagation(); 
          onClick?.(block.type); 
        }
      }}
    >
      <Icon className="h-4 w-4 text-primary/70 flex-shrink-0" />
      {isExpanded && (
        <span className="text-sm text-foreground whitespace-nowrap">{block.label}</span>
      )}
    </div>
  );
}

function SortablePremadeBlock({ 
  block,
  renderInteractiveBlock
}: { 
  block: InspectionBlock;
  renderInteractiveBlock: (block: InspectionBlock) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: block.id 
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  
  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`group flex gap-2 items-start rounded-md transition-shadow ${isDragging ? "ring-2 ring-primary/40 bg-primary/5 shadow-md" : ""}`}
      data-testid={`sortable-block-${block.id}`}
    >
      <div 
        {...attributes} 
        {...listeners} 
        className="cursor-grab pt-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        data-testid={`drag-handle-${block.id}`}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        {renderInteractiveBlock(block)}
      </div>
    </div>
  );
}

// Droppable Item Zone - a drop target for sidebar items
function DroppableItemZone({ 
  areaId, 
  itemId, 
  isOver,
  children 
}: { 
  areaId: string; 
  itemId: string;
  isOver: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({
    id: `drop-${areaId}-${itemId}`,
    data: { areaId, itemId }
  });

  return (
    <div 
      ref={setNodeRef}
      className={`transition-all duration-200 rounded-lg ${
        isOver ? "ring-2 ring-primary ring-offset-2 bg-primary/5" : ""
      }`}
      data-testid={`drop-zone-${itemId}`}
    >
      {children}
    </div>
  );
}

export default function FormTemplatePage() {
  const { toast } = useToast();
  
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  const [editingTemplate, setEditingTemplate] = useState<Partial<FormTemplate> | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateType, setTemplateType] = useState<"ONBOARDING" | "FULL_INSPECTION">("ONBOARDING");
  const [templateAreas, setTemplateAreas] = useState<InspectionArea[]>([]);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({});
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [previewAreaId, setPreviewAreaId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragData, setActiveDragData] = useState<{ type: string; data: any } | null>(null);
  const [dragContext, setDragContext] = useState<{ areaId: string; itemId: string } | null>(null);
  const [activeDropTarget, setActiveDropTarget] = useState<{ areaId: string; itemId: string } | null>(null);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [configuringBlock, setConfiguringBlock] = useState<{ block: InspectionBlock; areaId: string; itemId: string; isChild?: boolean; parentBlockId?: string } | null>(null);
  const [activeItemContext, setActiveItemContext] = useState<{ areaId: string; itemId: string } | null>(null);
  const [selectedItemForSettings, setSelectedItemForSettings] = useState<{ areaId: string; itemId: string } | null>(null);
  const [settingsStep, setSettingsStep] = useState<"fields" | "configure">("fields");
  const [bedroomFilter, setBedroomFilter] = useState<string>("all");
  const [unitSearchQuery, setUnitSearchQuery] = useState("");
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  
  useEffect(() => {
    if (selectedItemForSettings) {
      setSettingsStep("fields");
    }
  }, [selectedItemForSettings]);

  // Track if we're dragging from sidebar (designer or available-block)
  const isDraggingFromSidebar = activeDragData?.type === 'designer' || activeDragData?.type === 'available-block';

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const premadeSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );
  
  // Custom collision detection that prefers blocks over general drop zones
  const customCollisionDetection: CollisionDetection = (args) => {
    // First, get all collisions using pointerWithin
    const collisions = pointerWithin(args);
    
    console.log('[Collision] pointerWithin found:', collisions.length, 'collisions');
    if (collisions.length > 0) {
      console.log('[Collision] IDs:', collisions.map(c => c.id));
    }
    
    if (collisions.length === 0) {
      const rectCollisions = rectIntersection(args);
      console.log('[Collision] rectIntersection found:', rectCollisions.length, 'collisions');
      return rectCollisions;
    }
    
    // Prefer block-drop targets over general drop zones
    const blockCollision = collisions.find(c => 
      typeof c.id === 'string' && c.id.startsWith('block-drop-')
    );
    
    if (blockCollision) {
      console.log('[Collision] Found block-drop collision:', blockCollision.id);
      return [blockCollision];
    }
    
    // Also check for sortable block IDs (UUIDs) that exist in templateAreas
    const sortableBlockCollision = collisions.find(c => {
      if (typeof c.id !== 'string') return false;
      for (const area of templateAreas) {
        for (const item of area.items) {
          if (item.blocks.find(b => b.id === c.id)) {
            return true;
          }
        }
      }
      return false;
    });
    
    if (sortableBlockCollision) {
      console.log('[Collision] Found sortable block collision:', sortableBlockCollision.id);
      return [sortableBlockCollision];
    }
    
    return collisions;
  };

  const { data: templates, isLoading: templatesLoading } = useQuery<FormTemplate[]>({ 
    queryKey: ["/api/form-templates"] 
  });

  const { data: units } = useQuery<Unit[]>({ queryKey: ["/api/units"] });
  const activeUnits = units?.filter(u => u.isActive) || [];
  const filteredActiveUnits = useMemo(() => {
    if (!unitSearchQuery.trim()) return activeUnits;
    const q = unitSearchQuery.toLowerCase();
    return activeUnits.filter(u =>
      u.unitNumber.toLowerCase().includes(q) ||
      u.propertyName.toLowerCase().includes(q) ||
      u.address.toLowerCase().includes(q)
    );
  }, [activeUnits, unitSearchQuery]);

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    if (!searchQuery) return templates;
    return templates.filter(t => 
      t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [templates, searchQuery]);

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; type: "ONBOARDING" | "FULL_INSPECTION"; areas: InspectionArea[]; unitIds: string[] }) => {
      return apiRequest("POST", "/api/form-templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      toast({ title: "Template created successfully" });
      resetDesigner();
    },
    onError: () => {
      toast({ title: "Failed to create template", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FormTemplate> }) => {
      return apiRequest("PATCH", `/api/form-templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      toast({ title: "Template updated successfully" });
      resetDesigner();
    },
    onError: () => {
      toast({ title: "Failed to update template", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/form-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      toast({ title: "Template deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete template", variant: "destructive" });
    },
  });

  const resetDesigner = () => {
    setViewMode("list");
    setEditingTemplate(null);
    setTemplateName("");
    setTemplateType("ONBOARDING");
    setTemplateAreas([]);
    setSelectedUnits([]);
    setExpandedAreas({});
    setExpandedItems({});
    setSelectedItemForSettings(null);
  };

  const handleAddTemplate = () => {
    setEditingTemplate({});
    setTemplateName("Onboarding Inspection");
    setTemplateType("ONBOARDING");
    const areas = generateOnboardingInspectionTemplate();
    setTemplateAreas(areas);
    setSelectedUnits([]);
    setExpandedAreas({});
    setExpandedItems({});
    setSelectedAreaId(areas.length > 0 ? areas[0].id : null);
    setViewMode("premade");
  };

  const handleEditTemplate = (template: FormTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateType(template.type);
    let areas = (template.areas as InspectionArea[]) || [];
    if (template.type === "FULL_INSPECTION" && !areas.some(a => a.name === "Unit Supplies")) {
      const fullAreas = generateFullInspectionTemplate();
      const unitSuppliesArea = fullAreas.find(a => a.name === "Unit Supplies");
      if (unitSuppliesArea) {
        areas = [...areas, unitSuppliesArea];
      }
    }
    setTemplateAreas(areas);
    setSelectedUnits(template.unitIds || []);
    setExpandedAreas({});
    setExpandedItems({});
    setSelectedItemForSettings(null);
    setSelectedAreaId(areas.length > 0 ? areas[0].id : null);
    setViewMode("premade");
  };

  const handlePreviewTemplate = (template: FormTemplate) => {
    if (template.type === "FULL_INSPECTION") {
      const areas = (template.areas as InspectionArea[]) || [];
      if (!areas.some(a => a.name === "Unit Supplies")) {
        const fullAreas = generateFullInspectionTemplate();
        const unitSuppliesArea = fullAreas.find(a => a.name === "Unit Supplies");
        if (unitSuppliesArea) {
          const augmented = { ...template, areas: [...areas, unitSuppliesArea] };
          setSelectedTemplate(augmented as FormTemplate);
          setPreviewOpen(true);
          return;
        }
      }
    }
    setSelectedTemplate(template);
    setPreviewOpen(true);
  };

  const handleAddArea = () => {
    const newArea: InspectionArea = {
      id: crypto.randomUUID(),
      name: `Area ${templateAreas.length + 1}`,
      items: [],
    };
    setTemplateAreas([...templateAreas, newArea]);
    setExpandedAreas(prev => ({ ...prev, [newArea.id]: true }));
    if (viewMode === "premade") {
      setSelectedAreaId(newArea.id);
    }
  };

  const handleUpdateAreaName = (areaId: string, name: string) => {
    setTemplateAreas(templateAreas.map(area =>
      area.id === areaId ? { ...area, name } : area
    ));
  };

  const handleDeleteArea = (areaId: string) => {
    const remaining = templateAreas.filter(area => area.id !== areaId);
    setTemplateAreas(remaining);
    if (selectedAreaId === areaId) {
      setSelectedAreaId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleAddItem = (areaId: string) => {
    const newItem: InspectionItem = {
      id: crypto.randomUUID(),
      name: "New Item",
      blocks: INSPECTION_BLOCKS.map((block, index) => {
        const defaultOpts = getDefaultOptions(block.type);
        return {
          id: crypto.randomUUID(),
          type: block.type,
          enabled: block.type === "CONDITION" || block.type === "NOTES",
          order: index,
          ...(defaultOpts ? { options: defaultOpts } : {}),
        };
      }),
    };
    setTemplateAreas(templateAreas.map(area =>
      area.id === areaId 
        ? { ...area, items: [...area.items, newItem] }
        : area
    ));
    setExpandedItems(prev => ({ ...prev, [newItem.id]: true }));
    setActiveItemContext({ areaId, itemId: newItem.id });
  };

  const handleUpdateItemName = (areaId: string, itemId: string, name: string) => {
    setTemplateAreas(templateAreas.map(area =>
      area.id === areaId 
        ? { 
            ...area, 
            items: area.items.map(item =>
              item.id === itemId ? { ...item, name } : item
            )
          }
        : area
    ));
  };

  const handleDeleteItem = (areaId: string, itemId: string) => {
    setTemplateAreas(templateAreas.map(area =>
      area.id === areaId 
        ? { ...area, items: area.items.filter(item => item.id !== itemId) }
        : area
    ));
  };

  const handleToggleBlock = (areaId: string, itemId: string, blockType: InspectionBlockType) => {
    setTemplateAreas(templateAreas.map(area =>
      area.id === areaId 
        ? { 
            ...area, 
            items: area.items.map(item =>
              item.id === itemId 
                ? {
                    ...item,
                    blocks: item.blocks.map(block =>
                      block.type === blockType ? { ...block, enabled: !block.enabled } : block
                    )
                  }
                : item
            )
          }
        : area
    ));
  };

  const handleConfigureBlock = (block: InspectionBlock, areaId: string, itemId: string) => {
    setConfiguringBlock({ block, areaId, itemId });
    setConfigDialogOpen(true);
  };

  const handleSaveBlockConfig = (updates: Partial<InspectionBlock>) => {
    if (!configuringBlock) return;
    const { areaId, itemId, block } = configuringBlock;
    setTemplateAreas(templateAreas.map(area => {
      if (area.id !== areaId) return area;
      return {
        ...area,
        items: area.items.map(item => {
          if (item.id !== itemId) return item;
          return {
            ...item,
            blocks: item.blocks.map(b => {
              if (b.id === block.id) {
                return { ...b, ...updates };
              }
              if (b.children) {
                return {
                  ...b,
                  children: b.children.map(c => c.id === block.id ? { ...c, ...updates } : c)
                };
              }
              return b;
            })
          };
        })
      };
    }));
    setConfiguringBlock(null);
  };

  const handleClickAddAvailableBlock = (blockType: InspectionBlockType) => {
    if (!activeItemContext) {
      toast({ title: "No item selected", description: "Expand an item first, then click a block to add it.", variant: "destructive" });
      return;
    }
    const { areaId, itemId } = activeItemContext;
    let enabledBlock: InspectionBlock | null = null;
    setTemplateAreas(templateAreas.map(area => {
      if (area.id !== areaId) return area;
      return {
        ...area,
        items: area.items.map(item => {
          if (item.id !== itemId) return item;
          const existingBlock = item.blocks.find(b => b.type === blockType);
          if (existingBlock) {
            enabledBlock = { ...existingBlock, enabled: true };
            return {
              ...item,
              blocks: item.blocks.map(b =>
                b.type === blockType ? { ...b, enabled: true } : b
              )
            };
          }
          return item;
        })
      };
    }));
    const blockLabel = INSPECTION_BLOCKS.find(b => b.type === blockType)?.label || blockType;
    toast({ title: "Block enabled", description: `Enabled ${blockLabel}.` });
    if (enabledBlock && isConfigurableType(blockType)) {
      setConfiguringBlock({ block: enabledBlock, areaId, itemId });
      setConfigDialogOpen(true);
    }
  };

  const handleClickAddDesignerField = (fieldId: string, contextOverride?: { areaId: string; itemId: string }) => {
    const ctx = contextOverride || activeItemContext;
    if (!ctx) {
      toast({ title: "No item selected", description: "Expand an item first, then click a field to add it.", variant: "destructive" });
      return;
    }
    const { areaId, itemId } = ctx;
    const fieldToBlockMap: Record<string, InspectionBlockType> = {
      'condition': 'CONDITION',
      'actionneeded': 'ACTION_NEEDED',
      'issues': 'ISSUES',
      'toggle': 'EXISTS',
      'dropdown': 'DROPDOWN',
      'multiselect': 'MULTI_SELECT',
      'number': 'COUNT',
      'textshort': 'MODEL_NUMBER',
      'textlong': 'NOTES',
      'photovideo': 'PHOTOS_VIDEOS',
      'checkbox': 'CHECKBOX',
      'radio': 'RADIO',
      'autofill': 'AUTO_FILL',
      'location': 'LOCATION',
    };
    const blockType = fieldToBlockMap[fieldId];
    if (!blockType) return;

    const newBlockId = crypto.randomUUID();
    let wasAdded = false;
    let wasToggled: "on" | "off" = "on";
    let enabledBlockRef: InspectionBlock | null = null;
    setTemplateAreas(templateAreas.map(area => {
      if (area.id !== areaId) return area;
      return {
        ...area,
        items: area.items.map(item => {
          if (item.id !== itemId) return item;
          const existingBlock = item.blocks.find(b => b.type === blockType);
          if (existingBlock) {
            wasToggled = existingBlock.enabled ? "off" : "on";
            const defaultOpts = getDefaultOptions(blockType);
            const shouldPopulateDefaults = wasToggled === "on" && defaultOpts && (!existingBlock.options || existingBlock.options.length === 0);
            enabledBlockRef = shouldPopulateDefaults
              ? { ...existingBlock, enabled: true, options: defaultOpts }
              : { ...existingBlock, enabled: !existingBlock.enabled };
            return {
              ...item,
              blocks: item.blocks.map(b => {
                if (b.type !== blockType) return b;
                if (shouldPopulateDefaults) return { ...b, enabled: true, options: defaultOpts };
                return { ...b, enabled: !b.enabled };
              })
            };
          }
          wasAdded = true;
          const maxOrder = Math.max(...item.blocks.map(b => b.order), -1);
          const defaultOpts = getDefaultOptions(blockType);
          const newBlock: InspectionBlock = {
            id: newBlockId,
            type: blockType,
            enabled: true,
            order: maxOrder + 1,
            ...(defaultOpts ? { options: defaultOpts } : {}),
          };
          enabledBlockRef = newBlock;
          return {
            ...item,
            blocks: [...item.blocks, newBlock]
          };
        })
      };
    }));

    const fieldLabel = ALL_DESIGNER_FIELDS.find(f => f.id === fieldId)?.label || fieldId;
    if ((wasAdded || wasToggled === "on") && isConfigurableType(blockType) && enabledBlockRef) {
      setTimeout(() => {
        setConfiguringBlock({ block: enabledBlockRef!, areaId, itemId });
        setConfigDialogOpen(true);
      }, 100);
    }
    toast({ title: wasToggled === "on" ? "Field enabled" : "Field disabled", description: `${wasToggled === "on" ? "Enabled" : "Disabled"} ${fieldLabel}.` });
  };

  const handleMoveBlock = (areaId: string, itemId: string, blockId: string, direction: "up" | "down") => {
    setTemplateAreas(templateAreas.map(area => {
      if (area.id !== areaId) return area;
      return {
        ...area,
        items: area.items.map(item => {
          if (item.id !== itemId) return item;
          const blocks = [...item.blocks].sort((a, b) => a.order - b.order);
          const blockIndex = blocks.findIndex(b => b.id === blockId);
          if (blockIndex === -1) return item;
          
          const newIndex = direction === "up" ? blockIndex - 1 : blockIndex + 1;
          if (newIndex < 0 || newIndex >= blocks.length) return item;
          
          [blocks[blockIndex].order, blocks[newIndex].order] = [blocks[newIndex].order, blocks[blockIndex].order];
          return { ...item, blocks };
        })
      };
    }));
  };

  // DnD Handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveDragId(active.id as string);
    
    // Capture the data for the drag overlay
    if (active.data.current) {
      setActiveDragData({
        type: active.data.current.type,
        data: active.data.current
      });
    } else {
      // For sortable blocks within items
      setActiveDragData({ type: 'sortable-block', data: null });
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    
    if (!over) {
      setActiveDropTarget(null);
      setHoveredBlockId(null);
      return;
    }

    const overId = typeof over.id === 'string' ? over.id : '';
    const data = over.data.current;
    
    console.log('[DragOver] overId:', overId, 'data:', data);

    // Check if hovering over a block droppable (for adding children)
    if (overId.startsWith('block-drop-') && data?.blockId) {
      console.log('[DragOver] Setting hoveredBlockId to:', data.blockId);
      setHoveredBlockId(data.blockId);
      if (data?.areaId && data?.itemId) {
        setActiveDropTarget({ areaId: data.areaId, itemId: data.itemId });
      }
    }
    // Check if hovering over a general item drop zone
    else if (overId.startsWith('drop-')) {
      setHoveredBlockId(null);
      if (data?.areaId && data?.itemId) {
        setActiveDropTarget({ areaId: data.areaId, itemId: data.itemId });
      }
    } else {
      setActiveDropTarget(null);
      setHoveredBlockId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    // Store hoveredBlockId before clearing state
    const currentHoveredBlockId = hoveredBlockId;
    
    console.log('[DragEnd] over:', over?.id, 'data:', over?.data.current);
    console.log('[DragEnd] hoveredBlockId:', currentHoveredBlockId);
    console.log('[DragEnd] active:', active.id, 'data:', active.data.current);
    
    // Clear drag state
    setActiveDragId(null);
    setActiveDragData(null);
    setActiveDropTarget(null);
    setHoveredBlockId(null);
    
    // Early exit only if no target at all (neither over nor hover)
    if (!over && !currentHoveredBlockId) return;

    // Get target block ID from DnD data (primary) or hover state (fallback)
    const dropData = over?.data.current;
    
    // Check multiple sources for target block ID:
    // 1. dropData.blockId - from block droppable
    // 2. currentHoveredBlockId - from hover state
    // 3. over.id directly - if it's a sortable block (UUID format)
    let targetBlockId = dropData?.blockId || currentHoveredBlockId;
    
    // If still no target, check if over.id is a block ID (sortable)
    if (!targetBlockId && over?.id) {
      const overId = typeof over.id === 'string' ? over.id : '';
      // Check if overId is a UUID (block sortable) and exists in templateAreas
      for (const area of templateAreas) {
        for (const item of area.items) {
          const block = item.blocks.find(b => b.id === overId);
          if (block) {
            targetBlockId = overId;
            break;
          }
        }
        if (targetBlockId) break;
      }
    }
    console.log('[DragEnd] targetBlockId:', targetBlockId);

    // PRIORITY: Handle dropping onto a specific block position FIRST
    // Check if we have a target block ID (from DnD or hover state)
    if (targetBlockId) {
      const activeData = active.data.current;
      console.log('[DragEnd] activeData:', activeData);
      
      // Find the target block from targetBlockId
      let targetInfo: { areaId: string; itemId: string; blockId: string; blockOrder: number } | null = null;
      for (const area of templateAreas) {
        for (const item of area.items) {
          const block = item.blocks.find(b => b.id === targetBlockId);
          if (block) {
            targetInfo = { areaId: area.id, itemId: item.id, blockId: block.id, blockOrder: block.order };
            break;
          }
        }
        if (targetInfo) break;
      }
      
      console.log('[DragEnd] targetInfo:', targetInfo);
      
      // Guard: if no target block found, show toast and exit
      if (!targetInfo) {
        console.log('[DragEnd] No target block found!');
        toast({
          title: "Drop failed",
          description: "Could not find target block. Please try again.",
          variant: "destructive"
        });
        return;
      }
      
      if (activeData) {
        const { areaId, itemId, blockId, blockOrder } = targetInfo;
        
        // Get block type from either available-block or designer field
        let blockType: InspectionBlockType | undefined;
        let fieldLabel = '';
        
        if (activeData.type === 'available-block' && activeData.block) {
          blockType = activeData.block.type as InspectionBlockType;
          fieldLabel = activeData.block.label;
          console.log('[DragEnd] Available block type:', blockType);
        } else if (activeData.type === 'designer' && activeData.field) {
          const fieldId = activeData.field.id;
          console.log('[DragEnd] Designer field id:', fieldId);
          const fieldToBlockMap: Record<string, InspectionBlockType> = {
            'condition': 'CONDITION',
            'actionneeded': 'ACTION_NEEDED',
            'issuebadges': 'ISSUES',
            'count': 'COUNT',
            'modelnumber': 'MODEL_NUMBER',
            'longtext': 'NOTES',
            'singleline': 'NOTES',
            'fileupload': 'PHOTOS_VIDEOS',
            'exists': 'EXISTS',
            // Generic form fields - will be added in next task
            'radio': 'RADIO',
            'checkbox': 'CHECKBOX',
            'dropdown': 'DROPDOWN',
            'multiselect': 'MULTI_SELECT',
            'autofill': 'AUTO_FILL',
            'location': 'LOCATION',
          };
          blockType = fieldToBlockMap[fieldId];
          fieldLabel = activeData.field.label;
          console.log('[DragEnd] Mapped block type:', blockType);
        } else {
          console.log('[DragEnd] activeData.type not recognized:', activeData.type);
        }
        
        if (blockType) {
          console.log('[DragEnd] Creating child block of type:', blockType);
          // Insert as a CHILD of the target block
          const newChildBlock: InspectionBlock = {
            id: crypto.randomUUID(),
            type: blockType!,
            enabled: true,
            order: 0 // First child
          };
          
          setTemplateAreas(templateAreas.map(area => {
            if (area.id !== areaId) return area;
            return {
              ...area,
              items: area.items.map(item => {
                if (item.id !== itemId) return item;
                // Find the target block and add the new block as its child
                return {
                  ...item,
                  blocks: item.blocks.map(b => {
                    if (b.id === blockId) {
                      const existingChildren = b.children || [];
                      // Check if child block of this type already exists
                      const existingChild = existingChildren.find(c => c.type === blockType);
                      if (existingChild) {
                        // Enable existing child
                        return {
                          ...b,
                          children: existingChildren.map(c => 
                            c.type === blockType ? { ...c, enabled: true } : c
                          )
                        };
                      }
                      // Add new child block
                      const maxOrder = existingChildren.length > 0 
                        ? Math.max(...existingChildren.map(c => c.order)) + 1 
                        : 0;
                      return {
                        ...b,
                        children: [...existingChildren, { ...newChildBlock, order: maxOrder }]
                      };
                    }
                    return b;
                  })
                };
              })
            };
          }));
          
          if (isConfigurableType(blockType)) {
            const createdBlock = { ...newChildBlock, type: blockType };
            setTimeout(() => {
              setConfiguringBlock({ block: createdBlock, areaId, itemId });
              setConfigDialogOpen(true);
            }, 100);
          }

          toast({
            title: "Block added",
            description: `Added ${fieldLabel} as child of the selected block.`
          });
          return;
        }
      }
    }

    // Handle dropping sidebar items onto an item's drop zone (general, not specific block)
    if (over && typeof over.id === 'string' && over.id.startsWith('drop-')) {
      const dropData = over.data.current;
      const activeData = active.data.current;
      
      if (dropData?.areaId && dropData?.itemId && activeData) {
        const { areaId, itemId } = dropData;
        
        // Handle dropping an available block
        if (activeData.type === 'available-block' && activeData.block) {
          const blockType = activeData.block.type as InspectionBlockType;
          
          setTemplateAreas(templateAreas.map(area => {
            if (area.id !== areaId) return area;
            return {
              ...area,
              items: area.items.map(item => {
                if (item.id !== itemId) return item;
                // Check if block already exists
                const existingBlock = item.blocks.find(b => b.type === blockType);
                if (existingBlock) {
                  // Enable it if it exists
                  return {
                    ...item,
                    blocks: item.blocks.map(b => 
                      b.type === blockType ? { ...b, enabled: true } : b
                    )
                  };
                }
                // Add new block at the end
                const maxOrder = Math.max(...item.blocks.map(b => b.order), -1);
                const newBlock: InspectionBlock = {
                  id: crypto.randomUUID(),
                  type: blockType,
                  enabled: true,
                  order: maxOrder + 1
                };
                return {
                  ...item,
                  blocks: [...item.blocks, newBlock]
                };
              })
            };
          }));
          
          toast({
            title: "Block added",
            description: `Added ${activeData.block.label} to the item.`
          });
          return;
        }
        
        // Handle dropping a designer field (convert to appropriate block type)
        if (activeData.type === 'designer' && activeData.field) {
          const fieldId = activeData.field.id;
          // Map designer fields to block types (all designer fields now supported)
          const fieldToBlockMap: Record<string, InspectionBlockType> = {
            'condition': 'CONDITION',
            'actionneeded': 'ACTION_NEEDED',
            'issuebadges': 'ISSUES',
            'count': 'COUNT',
            'modelnumber': 'MODEL_NUMBER',
            'longtext': 'NOTES',
            'singleline': 'NOTES',
            'fileupload': 'PHOTOS_VIDEOS',
            'exists': 'EXISTS',
            // Generic form fields
            'radio': 'RADIO',
            'checkbox': 'CHECKBOX',
            'dropdown': 'DROPDOWN',
            'multiselect': 'MULTI_SELECT',
            'autofill': 'AUTO_FILL',
            'location': 'LOCATION',
          };
          
          const blockType = fieldToBlockMap[fieldId];
          if (blockType) {
            const newBlockId = crypto.randomUUID();
            setTemplateAreas(templateAreas.map(area => {
              if (area.id !== areaId) return area;
              return {
                ...area,
                items: area.items.map(item => {
                  if (item.id !== itemId) return item;
                  const existingBlock = item.blocks.find(b => b.type === blockType);
                  if (existingBlock) {
                    return {
                      ...item,
                      blocks: item.blocks.map(b => 
                        b.type === blockType ? { ...b, enabled: true } : b
                      )
                    };
                  }
                  const maxOrder = Math.max(...item.blocks.map(b => b.order), -1);
                  const newBlock: InspectionBlock = {
                    id: newBlockId,
                    type: blockType,
                    enabled: true,
                    order: maxOrder + 1
                  };
                  return {
                    ...item,
                    blocks: [...item.blocks, newBlock]
                  };
                })
              };
            }));
            
            if (isConfigurableType(blockType)) {
              setTimeout(() => {
                setConfiguringBlock({ block: { id: newBlockId, type: blockType, enabled: true, order: 0 }, areaId, itemId });
                setConfigDialogOpen(true);
              }, 100);
            }

            toast({
              title: "Field added",
              description: `Added ${activeData.field.label} to the item.`
            });
          }
          return;
        }
      }
    }
    
    // Handle block reordering within an item
    if (!over || active.id === over.id) return;
    
    if (dragContext) {
      const { areaId, itemId } = dragContext;
      setTemplateAreas(templateAreas.map(area => {
        if (area.id !== areaId) return area;
        return {
          ...area,
          items: area.items.map(item => {
            if (item.id !== itemId) return item;
            const sortedBlocks = [...item.blocks].sort((a, b) => a.order - b.order);
            const oldIndex = sortedBlocks.findIndex(b => b.id === active.id);
            const newIndex = sortedBlocks.findIndex(b => b.id === over!.id);
            if (oldIndex === -1 || newIndex === -1) return item;
            
            const reorderedBlocks = arrayMove(sortedBlocks, oldIndex, newIndex);
            return {
              ...item,
              blocks: reorderedBlocks.map((block, index) => ({ ...block, order: index }))
            };
          })
        };
      }));
      setDragContext(null);
    }
  };

  // Get preview area data
  const previewArea = previewAreaId ? templateAreas.find(a => a.id === previewAreaId) : null;

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast({ title: "Please enter a template name", variant: "destructive" });
      return;
    }
    if (templateAreas.length === 0) {
      toast({ title: "Please add at least one area", variant: "destructive" });
      return;
    }

    const normalizedAreas: InspectionArea[] = templateAreas.map(area => ({
      ...area,
      items: area.items.map(item => ({
        ...item,
        blocks: item.blocks
          .sort((a, b) => a.order - b.order)
          .map((block, index) => ({ ...block, order: index }))
      }))
    }));

    const data = {
      name: templateName,
      type: templateType,
      areas: normalizedAreas,
      fields: [],
      unitIds: selectedUnits,
    };

    if (editingTemplate?.id) {
      updateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleAreaExpanded = (areaId: string) => {
    setExpandedAreas(prev => ({ ...prev, [areaId]: !prev[areaId] }));
  };

  const toggleItemExpanded = (itemId: string, areaId?: string) => {
    const willExpand = !expandedItems[itemId];
    setExpandedItems(prev => ({ ...prev, [itemId]: willExpand }));
    if (willExpand && areaId) {
      setActiveItemContext({ areaId, itemId });
    }
  };

  const toggleUnitSelection = (unitId: string) => {
    setSelectedUnits(prev => 
      prev.includes(unitId) 
        ? prev.filter(id => id !== unitId)
        : [...prev, unitId]
    );
  };

  const selectedArea = useMemo(() => 
    templateAreas.find(a => a.id === selectedAreaId) || null
  , [templateAreas, selectedAreaId]);

  const totalItems = templateAreas.reduce((sum, area) => sum + area.items.length, 0);
  const totalBlocks = templateAreas.reduce((sum, area) => 
    sum + area.items.reduce((itemSum, item) => 
      itemSum + item.blocks.filter(b => b.enabled).length, 0
    ), 0
  );

  const selectedSettingsItem = useMemo(() => {
    if (!selectedItemForSettings) return null;
    const area = templateAreas.find(a => a.id === selectedItemForSettings.areaId);
    if (!area) return null;
    const item = area.items.find(i => i.id === selectedItemForSettings.itemId);
    if (!item) return null;
    return { area, item };
  }, [selectedItemForSettings, templateAreas]);

  const renderInteractiveBlock = (block: InspectionBlock) => {
    const bc = INSPECTION_BLOCKS.find(b => b.type === block.type);
    if (!bc) return null;

    switch (block.type) {
      case "EXISTS":
        return (
          <div className="flex items-center justify-between py-1" data-testid={`interactive-block-${block.type}-${block.id}`}>
            <span className="text-sm text-muted-foreground">{block.label || "Exists"}</span>
            <Switch data-testid={`switch-exists-${block.id}`} />
          </div>
        );
      case "CONDITION":
        return (
          <div className="space-y-1" data-testid={`interactive-block-${block.type}-${block.id}`}>
            <span className="text-xs text-muted-foreground">{block.label || "Condition"}</span>
            <Select data-testid={`select-condition-${block.id}`}>
              <SelectTrigger className="h-8 text-xs" data-testid={`trigger-condition-${block.id}`}>
                <SelectValue placeholder="Select condition..." />
              </SelectTrigger>
              <SelectContent>
                {(block.options || ["Good", "Fair", "Stained", "Peeling", "Cracked", "Damaged", "Broken", "Missing", "Worn"]).map(opt => (
                  <SelectItem key={opt} value={opt} data-testid={`option-condition-${opt}`}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case "COUNT":
        return (
          <div className="flex items-center gap-3 py-1" data-testid={`interactive-block-${block.type}-${block.id}`}>
            <span className="text-sm text-muted-foreground">{block.label || "Count"}</span>
            <Input type="number" min={0} defaultValue={0} className="h-8 w-20 text-xs" data-testid={`input-count-${block.id}`} />
          </div>
        );
      case "NOTES":
        return (
          <div className="space-y-1" data-testid={`interactive-block-${block.type}-${block.id}`}>
            <span className="text-xs text-muted-foreground">{block.label || "Notes"}</span>
            <Textarea placeholder={block.placeholder || "Add notes..."} className="min-h-[60px] text-xs resize-none" data-testid={`textarea-notes-${block.id}`} />
          </div>
        );
      case "PHOTOS_VIDEOS":
        return (
          <div className="flex items-center gap-2 py-1 cursor-pointer hover-elevate rounded-md p-2" data-testid={`interactive-block-${block.type}-${block.id}`}>
            <div className="h-10 w-10 rounded-md border border-dashed bg-muted/10 flex items-center justify-center">
              <Camera className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">Tap to add photo/video</span>
          </div>
        );
      case "LOCATION":
        return (
          <div className="space-y-1" data-testid={`interactive-block-${block.type}-${block.id}`}>
            <span className="text-xs text-muted-foreground">{block.label || "Location"}</span>
            <div className="relative">
              <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input placeholder={block.placeholder || "Enter location..."} className="h-8 text-xs pl-6" data-testid={`input-location-${block.id}`} />
            </div>
          </div>
        );
      case "MODEL_NUMBER":
        return (
          <div className="space-y-1" data-testid={`interactive-block-${block.type}-${block.id}`}>
            <span className="text-xs text-muted-foreground">{block.label || "Model #"}</span>
            <Input placeholder={block.placeholder || "Enter model number..."} className="h-8 text-xs" data-testid={`input-model-${block.id}`} />
          </div>
        );
      case "ACTION_NEEDED":
        return (
          <div className="space-y-1" data-testid={`interactive-block-${block.type}-${block.id}`}>
            <span className="text-xs text-muted-foreground">{block.label || "Action Needed"}</span>
            <Select data-testid={`select-action-${block.id}`}>
              <SelectTrigger className="h-8 text-xs" data-testid={`trigger-action-${block.id}`}>
                <SelectValue placeholder="Select action..." />
              </SelectTrigger>
              <SelectContent>
                {(block.options || ["None", "Needs Cleaning", "Needs Fixing", "Needs Replacement"]).map(opt => (
                  <SelectItem key={opt} value={opt} data-testid={`option-action-${opt}`}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case "ISSUES":
        return (
          <div className="space-y-1" data-testid={`interactive-block-${block.type}-${block.id}`}>
            <span className="text-xs text-muted-foreground">{block.label || "Issues"}</span>
            <div className="flex flex-wrap gap-1.5">
              {(block.options || ["Stains", "Scratches", "Dents", "Cracks"]).map(opt => (
                <Badge key={opt} variant="outline" className="text-xs cursor-pointer toggle-elevate" data-testid={`badge-issue-${opt}-${block.id}`}>{opt}</Badge>
              ))}
            </div>
          </div>
        );
      case "DROPDOWN":
        return (
          <div className="space-y-1" data-testid={`interactive-block-${block.type}-${block.id}`}>
            <span className="text-xs text-muted-foreground">{block.label || "Dropdown"}</span>
            <Select>
              <SelectTrigger className="h-8 text-xs" data-testid={`trigger-dropdown-${block.id}`}>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {(block.options || ["Option 1", "Option 2"]).map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case "RADIO":
        return (
          <div className="space-y-1" data-testid={`interactive-block-${block.type}-${block.id}`}>
            <span className="text-xs text-muted-foreground">{block.label || "Radio Group"}</span>
            <RadioGroup className="flex flex-wrap gap-3">
              {(block.options || ["Option 1", "Option 2"]).map(opt => (
                <div key={opt} className="flex items-center space-x-1">
                  <RadioGroupItem value={opt} id={`radio-${block.id}-${opt}`} />
                  <Label htmlFor={`radio-${block.id}-${opt}`} className="text-xs cursor-pointer">{opt}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );
      case "CHECKBOX":
        return (
          <div className="space-y-1" data-testid={`interactive-block-${block.type}-${block.id}`}>
            <span className="text-xs text-muted-foreground">{block.label || "Checkbox"}</span>
            <div className="flex flex-wrap gap-3">
              {(block.options || ["Option 1", "Option 2"]).map(opt => (
                <div key={opt} className="flex items-center space-x-1">
                  <Checkbox id={`check-${block.id}-${opt}`} />
                  <Label htmlFor={`check-${block.id}-${opt}`} className="text-xs cursor-pointer">{opt}</Label>
                </div>
              ))}
            </div>
          </div>
        );
      case "MULTI_SELECT":
        return (
          <div className="space-y-1" data-testid={`interactive-block-${block.type}-${block.id}`}>
            <span className="text-xs text-muted-foreground">{block.label || "Multi-Select"}</span>
            <div className="flex flex-wrap gap-1.5">
              {(block.options || ["Option 1", "Option 2"]).map(opt => (
                <Badge key={opt} variant="outline" className="text-xs cursor-pointer toggle-elevate" data-testid={`badge-multiselect-${opt}-${block.id}`}>{opt}</Badge>
              ))}
            </div>
          </div>
        );
      case "AUTO_FILL":
        return (
          <div className="space-y-1" data-testid={`interactive-block-${block.type}-${block.id}`}>
            <span className="text-xs text-muted-foreground">{block.label || "Auto-Fill"}</span>
            <Input placeholder="Start typing for suggestions..." className="h-8 text-xs" data-testid={`input-autofill-${block.id}`} />
          </div>
        );
      default: {
        const Icon = bc.icon;
        return (
          <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground" data-testid={`interactive-block-${block.type}-${block.id}`}>
            <Icon className="h-3.5 w-3.5" />
            <span>{block.label || bc.label}</span>
          </div>
        );
      }
    }
  };

  if (viewMode === "premade") {
    return (
      <div className="space-y-3">
        {/* Top Header Bar - Back, Template Name, Units, Type, Save */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={resetDesigner} data-testid="button-cancel-premade">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg">Full Inspection Template</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 flex-1 sm:justify-center">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Name:</span>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Enter template name"
                className="max-w-full sm:max-w-[220px] h-9"
                data-testid="input-premade-template-name"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 cursor-pointer"
                  data-testid="button-premade-units-selector"
                >
                  <span className="text-sm text-muted-foreground">Units:</span>
                  <Badge variant="secondary">{selectedUnits.length} unit(s) selected</Badge>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3" align="start">
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Select Units</p>
                <Input
                  placeholder="Search by unit number..."
                  value={unitSearchQuery}
                  onChange={(e) => setUnitSearchQuery(e.target.value)}
                  className="mb-2"
                  data-testid="input-premade-unit-search"
                />
                <div className="flex gap-1 mb-2 flex-wrap">
                  {["all", "1", "2", "3"].map((br) => (
                    <Button
                      key={br}
                      type="button"
                      variant={bedroomFilter === br ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBedroomFilter(br)}
                      data-testid={`button-premade-br-${br}`}
                    >
                      {br === "all" ? "All" : <><Bed className="h-3 w-3 mr-1" />{br} BR</>}
                    </Button>
                  ))}
                </div>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {filteredActiveUnits.map((unit) => (
                      <div key={unit.id} className="flex items-start space-x-2">
                        <Checkbox
                          id={`premade-unit-${unit.id}`}
                          checked={selectedUnits.includes(unit.id)}
                          onCheckedChange={() => toggleUnitSelection(unit.id)}
                          className="mt-0.5"
                        />
                        <Label htmlFor={`premade-unit-${unit.id}`} className="cursor-pointer">
                          <span className="text-sm">{unit.propertyName} - {unit.unitNumber}</span>
                          <span className="block text-xs text-muted-foreground">{unit.address}</span>
                        </Label>
                      </div>
                    ))}
                    {filteredActiveUnits.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2">No units found</p>
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Type:</span>
              <RadioGroup value={templateType} onValueChange={(v) => {
                const newType = v as "ONBOARDING" | "FULL_INSPECTION";
                setTemplateType(newType);
                if (newType === "ONBOARDING") {
                  const areas = generateOnboardingInspectionTemplate();
                  setTemplateAreas(areas);
                  setSelectedAreaId(areas.length > 0 ? areas[0].id : null);
                  if (!templateName.trim() || templateName === "Full Inspection") {
                    setTemplateName("Onboarding Inspection");
                  }
                } else {
                  const areas = generateFullInspectionTemplate();
                  setTemplateAreas(areas);
                  setSelectedAreaId(areas.length > 0 ? areas[0].id : null);
                  if (!templateName.trim() || templateName === "Onboarding Inspection") {
                    setTemplateName("Full Inspection");
                  }
                }
              }} className="flex gap-3" data-testid="premade-radio-group-type">
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="ONBOARDING" id="premade-onboarding" data-testid="premade-radio-type-onboarding" />
                  <Label htmlFor="premade-onboarding" className="cursor-pointer text-sm">Onboarding</Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="FULL_INSPECTION" id="premade-full" data-testid="premade-radio-type-full" />
                  <Label htmlFor="premade-full" className="cursor-pointer text-sm">Full</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <Button
            onClick={handleSaveTemplate}
            disabled={createMutation.isPending || updateMutation.isPending}
            data-testid="button-save-premade-template"
          >
            {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Template"}
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-0 h-[calc(100vh-160px)]">
          {/* Inspection Areas Nav Panel */}
          <div
            className="w-full md:w-64 flex-shrink-0 border-b md:border-b-0 md:border-r flex flex-col max-h-[200px] md:max-h-none"
            style={{ backgroundColor: "hsl(179 25% 50% / 0.05)" }}
            data-testid="premade-left-panel"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <p className="text-xs font-semibold uppercase text-primary tracking-wider">Inspection Areas</p>
              <Button type="button" onClick={handleAddArea} variant="ghost" size="icon" data-testid="button-premade-add-area">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <div className="px-2.5 py-2.5 space-y-1">
                {templateAreas.map((area) => (
                  <div
                    key={area.id}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md cursor-pointer transition-colors ${
                      selectedAreaId === area.id
                        ? "bg-primary/15 text-primary font-medium"
                        : "hover-elevate"
                    }`}
                    onClick={() => setSelectedAreaId(area.id)}
                    data-testid={`premade-area-nav-${area.id}`}
                  >
                    <span className="text-sm flex-1 leading-snug">{area.name}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 flex-shrink-0 ml-1">{area.items.length}</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Center Panel - Selected Area Canvas */}
          <div className="flex-1 min-w-0" data-testid="premade-canvas">
            {!selectedArea ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center py-8">
                  <Folder className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                  <p className="text-muted-foreground text-sm font-medium">No area selected</p>
                  <p className="text-xs text-muted-foreground mb-3">Select an area from the left panel or add a new one</p>
                  {templateAreas.length === 0 && (
                    <Button type="button" onClick={handleAddArea} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Area
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                {/* Area header */}
                <div className="flex items-center justify-between gap-3 px-5 py-3 border-b">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Folder className="h-4 w-4 text-primary flex-shrink-0" />
                    <Input
                      value={selectedArea.name}
                      onChange={(e) => handleUpdateAreaName(selectedArea.id, e.target.value)}
                      className="flex-1 h-8 font-semibold text-base border-0 border-b border-muted-foreground/20 rounded-none px-0 bg-transparent focus-visible:border-primary"
                      data-testid={`input-premade-area-name-${selectedArea.id}`}
                    />
                    <Badge variant="secondary">{selectedArea.items.length} items</Badge>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddItem(selectedArea.id)}
                      data-testid={`button-premade-add-item-${selectedArea.id}`}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Item
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteArea(selectedArea.id)}
                      className="text-destructive"
                      data-testid={`button-premade-delete-area-${selectedArea.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Items for selected area */}
                <div className="flex-1 overflow-y-auto">
                  <div className="max-w-[520px] mx-auto p-5 space-y-3">
                    {selectedArea.items.length === 0 ? (
                      <div className="text-center py-10 border-2 border-dashed rounded-lg bg-muted/20">
                        <p className="text-muted-foreground text-sm font-medium">No items in {selectedArea.name}</p>
                        <p className="text-xs text-muted-foreground mb-3">Add items to this area</p>
                        <Button type="button" onClick={() => handleAddItem(selectedArea.id)} variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Item
                        </Button>
                      </div>
                    ) : (
                      selectedArea.items.map((item) => {
                        const enabledBlocks = item.blocks.filter(b => b.enabled).sort((a, b) => a.order - b.order);
                        return (
                          <div
                            key={item.id}
                            className="bg-background border rounded-lg p-4 space-y-3"
                            data-testid={`premade-item-${item.id}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-sm">{item.name}</span>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedItemForSettings({ areaId: selectedArea.id, itemId: item.id });
                                    setActiveItemContext({ areaId: selectedArea.id, itemId: item.id });
                                  }}
                                  data-testid={`button-premade-settings-item-${item.id}`}
                                >
                                  <Settings2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteItem(selectedArea.id, item.id)}
                                  className="text-destructive"
                                  data-testid={`button-premade-delete-item-${item.id}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            {enabledBlocks.length > 0 ? (
                              <DndContext
                                sensors={premadeSensors}
                                onDragEnd={(event) => {
                                  const { active, over } = event;
                                  if (!over || active.id === over.id) return;
                                  const sortedBlocks = [...item.blocks].sort((a, b) => a.order - b.order);
                                  const oldIndex = sortedBlocks.findIndex(b => b.id === active.id);
                                  const newIndex = sortedBlocks.findIndex(b => b.id === over.id);
                                  if (oldIndex === -1 || newIndex === -1) return;
                                  const reorderedBlocks = arrayMove(sortedBlocks, oldIndex, newIndex);
                                  setTemplateAreas(templateAreas.map(area => {
                                    if (area.id !== selectedArea.id) return area;
                                    return {
                                      ...area,
                                      items: area.items.map(it => {
                                        if (it.id !== item.id) return it;
                                        return { ...it, blocks: reorderedBlocks.map((block, index) => ({ ...block, order: index })) };
                                      })
                                    };
                                  }));
                                }}
                              >
                                <SortableContext items={enabledBlocks.map(b => b.id)} strategy={rectSortingStrategy}>
                                  <div className="space-y-2">
                                    {enabledBlocks.map((block) => (
                                      <SortablePremadeBlock key={block.id} block={block} renderInteractiveBlock={renderInteractiveBlock} />
                                    ))}
                                  </div>
                                </SortableContext>
                              </DndContext>
                            ) : (
                              <p className="text-xs text-muted-foreground text-center py-2">No fields enabled</p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Item Settings Sheet */}
        <Sheet open={!!selectedItemForSettings} onOpenChange={(open) => { if (!open) setSelectedItemForSettings(null); }}>
          <SheetContent className="w-full sm:w-[380px] md:w-[420px]" data-testid="premade-right-panel">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                Item Settings
              </SheetTitle>
            </SheetHeader>
            {selectedSettingsItem && (
              <ScrollArea className="h-[calc(100vh-120px)] mt-4">
                <div className="space-y-5 pr-4">
                  {settingsStep === "fields" ? (
                    <>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Item Name</Label>
                        <Input
                          value={selectedSettingsItem.item.name}
                          onChange={(e) => handleUpdateItemName(selectedItemForSettings!.areaId, selectedItemForSettings!.itemId, e.target.value)}
                          data-testid="input-premade-item-name"
                        />
                        <p className="text-xs text-muted-foreground">
                          Area: {selectedSettingsItem.area.name}
                        </p>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Field Types</Label>
                          <p className="text-xs text-muted-foreground mt-0.5">Toggle field types on/off for this item</p>
                        </div>
                        <div className="space-y-1">
                          {ALL_DESIGNER_FIELDS.map((field) => {
                            const Icon = field.icon;
                            const isActive = selectedSettingsItem.item.blocks.some(b => b.type === field.type && b.enabled);
                            return (
                              <div
                                key={field.id}
                                className="flex items-center gap-2.5 py-2 px-2.5 rounded-md"
                                data-testid={`field-row-${field.id}`}
                              >
                                <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                                <div className="flex-1 min-w-0">
                                  <span className={`text-sm ${isActive ? "font-medium" : "text-muted-foreground"}`}>
                                    {field.label}
                                  </span>
                                  <p className="text-[11px] text-muted-foreground leading-tight">{field.description}</p>
                                </div>
                                <Switch
                                  checked={!!isActive}
                                  onCheckedChange={() => handleClickAddDesignerField(field.id, selectedItemForSettings!)}
                                  data-testid={`switch-add-field-${field.id}`}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {selectedSettingsItem.item.blocks.some(b => b.enabled) && (
                        <>
                          <Separator />
                          <Button
                            type="button"
                            onClick={() => setSettingsStep("configure")}
                            className="w-full"
                            data-testid="button-settings-next"
                          >
                            Next: Configure Fields
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setSettingsStep("fields")}
                          data-testid="button-settings-back"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Configure Fields</Label>
                          <p className="text-xs text-muted-foreground mt-0.5">Name each field and set options</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {selectedSettingsItem.item.blocks
                          .filter(b => b.enabled)
                          .sort((a, b) => a.order - b.order)
                          .map((block) => {
                            const bc = INSPECTION_BLOCKS.find(b => b.type === block.type);
                            if (!bc) return null;
                            const BIcon = bc.icon;
                            const needsOpts = CONFIGURABLE_TYPES.includes(block.type);
                            const needsPlaceholder = NEEDS_PLACEHOLDER_TYPES.includes(block.type);
                            const needsToggleLabels = NEEDS_TOGGLE_LABELS.includes(block.type);
                            const effectiveOptions = block.options && block.options.length > 0 ? block.options : (needsOpts ? getDefaultOptions(block.type) || [] : []);

                            return (
                              <div key={block.id} className="border rounded-lg p-3 space-y-3" data-testid={`config-block-${block.id}`}>
                                <div className="flex items-center gap-2">
                                  <BIcon className="h-4 w-4 text-primary flex-shrink-0" />
                                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                                    {ALL_DESIGNER_FIELDS.find(f => f.type === block.type)?.label || bc.label}
                                  </span>
                                </div>

                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground">Field Name</Label>
                                  <Input
                                    value={block.label || ""}
                                    placeholder={bc.label}
                                    onChange={(e) => {
                                      const newLabel = e.target.value;
                                      setTemplateAreas(templateAreas.map(area =>
                                        area.id === selectedItemForSettings!.areaId
                                          ? {
                                              ...area,
                                              items: area.items.map(item =>
                                                item.id === selectedItemForSettings!.itemId
                                                  ? {
                                                      ...item,
                                                      blocks: item.blocks.map(b =>
                                                        b.id === block.id ? { ...b, label: newLabel } : b
                                                      )
                                                    }
                                                  : item
                                              )
                                            }
                                          : area
                                      ));
                                    }}
                                    data-testid={`input-config-label-${block.id}`}
                                  />
                                </div>

                                {needsPlaceholder && (
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Placeholder Text</Label>
                                    <Input
                                      value={block.placeholder || ""}
                                      placeholder="Enter placeholder..."
                                      onChange={(e) => {
                                        const newPlaceholder = e.target.value;
                                        setTemplateAreas(templateAreas.map(area =>
                                          area.id === selectedItemForSettings!.areaId
                                            ? {
                                                ...area,
                                                items: area.items.map(item =>
                                                  item.id === selectedItemForSettings!.itemId
                                                    ? {
                                                        ...item,
                                                        blocks: item.blocks.map(b =>
                                                          b.id === block.id ? { ...b, placeholder: newPlaceholder } : b
                                                        )
                                                      }
                                                    : item
                                                )
                                              }
                                            : area
                                        ));
                                      }}
                                      data-testid={`input-config-placeholder-${block.id}`}
                                    />
                                  </div>
                                )}

                                {needsToggleLabels && (
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Toggle Labels</Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      <div className="space-y-1">
                                        <Label className="text-[11px] text-muted-foreground">True (ON)</Label>
                                        <Input
                                          value={block.trueLabel || ""}
                                          placeholder="Yes"
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            setTemplateAreas(templateAreas.map(area =>
                                              area.id === selectedItemForSettings!.areaId
                                                ? {
                                                    ...area,
                                                    items: area.items.map(item =>
                                                      item.id === selectedItemForSettings!.itemId
                                                        ? {
                                                            ...item,
                                                            blocks: item.blocks.map(b =>
                                                              b.id === block.id ? { ...b, trueLabel: val } : b
                                                            )
                                                          }
                                                        : item
                                                    )
                                                  }
                                                : area
                                            ));
                                          }}
                                          data-testid={`input-config-true-label-${block.id}`}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-[11px] text-muted-foreground">False (OFF)</Label>
                                        <Input
                                          value={block.falseLabel || ""}
                                          placeholder="No"
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            setTemplateAreas(templateAreas.map(area =>
                                              area.id === selectedItemForSettings!.areaId
                                                ? {
                                                    ...area,
                                                    items: area.items.map(item =>
                                                      item.id === selectedItemForSettings!.itemId
                                                        ? {
                                                            ...item,
                                                            blocks: item.blocks.map(b =>
                                                              b.id === block.id ? { ...b, falseLabel: val } : b
                                                            )
                                                          }
                                                        : item
                                                    )
                                                  }
                                                : area
                                            ));
                                          }}
                                          data-testid={`input-config-false-label-${block.id}`}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {needsOpts && (
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Options</Label>
                                    <div className="flex gap-1.5">
                                      <Input
                                        placeholder="Add option..."
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            const val = (e.target as HTMLInputElement).value.trim();
                                            if (val) {
                                              const currentOptions = effectiveOptions;
                                              if (!currentOptions.includes(val)) {
                                                setTemplateAreas(templateAreas.map(area =>
                                                  area.id === selectedItemForSettings!.areaId
                                                    ? {
                                                        ...area,
                                                        items: area.items.map(item =>
                                                          item.id === selectedItemForSettings!.itemId
                                                            ? {
                                                                ...item,
                                                                blocks: item.blocks.map(b =>
                                                                  b.id === block.id ? { ...b, options: [...currentOptions, val] } : b
                                                                )
                                                              }
                                                            : item
                                                        )
                                                      }
                                                    : area
                                                ));
                                                (e.target as HTMLInputElement).value = "";
                                              }
                                            }
                                          }
                                        }}
                                        data-testid={`input-config-option-${block.id}`}
                                      />
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={(e) => {
                                          const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                          const val = input?.value.trim();
                                          if (val) {
                                            const currentOptions = effectiveOptions;
                                            if (!currentOptions.includes(val)) {
                                              setTemplateAreas(templateAreas.map(area =>
                                                area.id === selectedItemForSettings!.areaId
                                                  ? {
                                                      ...area,
                                                      items: area.items.map(item =>
                                                        item.id === selectedItemForSettings!.itemId
                                                          ? {
                                                              ...item,
                                                              blocks: item.blocks.map(b =>
                                                                b.id === block.id ? { ...b, options: [...currentOptions, val] } : b
                                                              )
                                                            }
                                                          : item
                                                      )
                                                    }
                                                  : area
                                              ));
                                              input.value = "";
                                            }
                                          }
                                        }}
                                        data-testid={`button-add-option-${block.id}`}
                                      >
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    {effectiveOptions.length > 0 && (
                                      <div className="space-y-1 mt-1.5">
                                        {effectiveOptions.map((opt, idx) => (
                                          <div key={idx} className="flex items-center gap-2 py-1 px-2 bg-muted/30 rounded text-sm">
                                            <span className="flex-1">{opt}</span>
                                            <button
                                              type="button"
                                              className="h-6 w-6 p-0 inline-flex items-center justify-center rounded-md text-muted-foreground hover-elevate"
                                              onClick={() => {
                                                const newOpts = effectiveOptions.filter((_, i) => i !== idx);
                                                setTemplateAreas(templateAreas.map(area =>
                                                  area.id === selectedItemForSettings!.areaId
                                                    ? {
                                                        ...area,
                                                        items: area.items.map(item =>
                                                          item.id === selectedItemForSettings!.itemId
                                                            ? {
                                                                ...item,
                                                                blocks: item.blocks.map(b =>
                                                                  b.id === block.id ? { ...b, options: newOpts } : b
                                                                )
                                                              }
                                                            : item
                                                        )
                                                      }
                                                    : area
                                                ));
                                              }}
                                              data-testid={`button-remove-option-${block.id}-${idx}`}
                                            >
                                              <X className="h-3 w-3" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>

                      <Button
                        type="button"
                        onClick={() => setSelectedItemForSettings(null)}
                        className="w-full"
                        data-testid="button-settings-done"
                      >
                        Done
                      </Button>
                    </>
                  )}
                </div>
              </ScrollArea>
            )}
          </SheetContent>
        </Sheet>

        <BlockConfigDialog
          open={configDialogOpen}
          onOpenChange={setConfigDialogOpen}
          block={configuringBlock?.block || null}
          onSave={handleSaveBlockConfig}
        />
      </div>
    );
  }

  if (viewMode === "designer") {
    return (
      <div className="space-y-4">
        {/* Top Header Row - Back button, Title, and Save */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={resetDesigner} data-testid="button-cancel">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg">Inspection Template</span>
            </div>
          </div>
          <Button 
            onClick={handleSaveTemplate} 
            disabled={createMutation.isPending || updateMutation.isPending}
            data-testid="button-save-template"
          >
            {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Template"}
          </Button>
        </div>

        {/* Template Info Header - Simple fields, no card */}
        <div className="space-y-2 pb-2 border-b">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Template Name</p>
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Enter template name"
            className="max-w-md border-0 border-b border-muted-foreground/30 rounded-none px-0 text-lg font-medium bg-transparent focus-visible:border-primary"
            data-testid="input-template-name"
          />
          <div className="flex items-center flex-wrap gap-3 md:gap-4 pt-1">
            <Popover>
              <PopoverTrigger asChild>
                <button 
                  type="button"
                  className="inline-flex items-center gap-1.5 cursor-pointer"
                  data-testid="button-units-selector"
                >
                  <span className="text-sm text-muted-foreground">Units:</span>
                  <Badge variant="secondary">{selectedUnits.length} unit(s) selected</Badge>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3" align="start">
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Select Units</p>
                <Input
                  placeholder="Search by unit number..."
                  value={unitSearchQuery}
                  onChange={(e) => setUnitSearchQuery(e.target.value)}
                  className="mb-2"
                  data-testid="input-designer-unit-search"
                />
                <div className="flex gap-1 mb-2 flex-wrap">
                  {["all", "1", "2", "3"].map((br) => (
                    <Button
                      key={br}
                      type="button"
                      variant={bedroomFilter === br ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBedroomFilter(br)}
                      data-testid={`button-designer-br-${br}`}
                    >
                      {br === "all" ? "All" : <><Bed className="h-3 w-3 mr-1" />{br} BR</>}
                    </Button>
                  ))}
                </div>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {filteredActiveUnits.map((unit) => (
                      <div key={unit.id} className="flex items-start space-x-2">
                        <Checkbox
                          id={`unit-pop-${unit.id}`}
                          checked={selectedUnits.includes(unit.id)}
                          onCheckedChange={() => toggleUnitSelection(unit.id)}
                          className="mt-0.5"
                        />
                        <Label htmlFor={`unit-pop-${unit.id}`} className="cursor-pointer">
                          <span className="text-sm">{unit.propertyName} - {unit.unitNumber}</span>
                          <span className="block text-xs text-muted-foreground">{unit.address}</span>
                        </Label>
                      </div>
                    ))}
                    {filteredActiveUnits.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2">No units found</p>
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground">|</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Type:</span>
              <RadioGroup value={templateType} onValueChange={(v) => {
                const newType = v as "ONBOARDING" | "FULL_INSPECTION";
                setTemplateType(newType);
                if (newType === "FULL_INSPECTION") {
                  let areas = templateAreas;
                  if (templateAreas.length === 0) {
                    areas = generateFullInspectionTemplate();
                    setTemplateAreas(areas);
                  }
                  if (!templateName.trim()) {
                    setTemplateName("Full Inspection");
                  }
                  setSelectedAreaId(areas.length > 0 ? areas[0].id : null);
                  setViewMode("premade");
                } else {
                  let areas = templateAreas;
                  if (templateAreas.length === 0) {
                    areas = generateOnboardingInspectionTemplate();
                    setTemplateAreas(areas);
                  }
                  if (!templateName.trim()) {
                    setTemplateName("Onboarding Inspection");
                  }
                  setSelectedAreaId(areas.length > 0 ? areas[0].id : null);
                  setViewMode("premade");
                }
              }} className="flex gap-3" data-testid="radio-group-type">
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="ONBOARDING" id="onboarding" data-testid="radio-type-onboarding" />
                  <Label htmlFor="onboarding" className="cursor-pointer text-sm">Onboarding</Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="FULL_INSPECTION" id="full" data-testid="radio-type-full" />
                  <Label htmlFor="full" className="cursor-pointer text-sm">Full</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </div>

        <DndContext 
          sensors={sensors}
          collisionDetection={customCollisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Main Content Area */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8">
            {/* Inspection Areas Card */}
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-base">Inspection Areas</h3>
                  <Button type="button" onClick={handleAddArea} size="sm" variant="outline" data-testid="button-add-area">
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add Area
                  </Button>
                </div>

                {templateAreas.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/20">
                    <Folder className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                    <p className="text-muted-foreground text-sm font-medium">No areas added yet</p>
                    <p className="text-xs text-muted-foreground mb-3">Add areas like Living Room, Kitchen, Bathroom</p>
                    <Button type="button" onClick={handleAddArea} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Area
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4 pr-4">
                      {templateAreas.map((area) => (
                        <div key={area.id} className="border rounded-lg" data-testid={`area-${area.id}`}>
                          <div 
                            className="flex items-center gap-3 p-3 bg-muted/30 cursor-pointer"
                            onClick={() => toggleAreaExpanded(area.id)}
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            {expandedAreas[area.id] ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <Folder className="h-4 w-4 text-primary" />
                            <Input
                              value={area.name}
                              onChange={(e) => handleUpdateAreaName(area.id, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 h-8 font-medium"
                              data-testid={`input-area-name-${area.id}`}
                            />
                            <Badge variant="secondary">{area.items.length} items</Badge>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => { e.stopPropagation(); setPreviewAreaId(area.id); }}
                                  className="h-8 w-8"
                                  data-testid={`button-view-area-${area.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Preview Area</TooltipContent>
                            </Tooltip>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); handleDeleteArea(area.id); }}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              data-testid={`button-delete-area-${area.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {expandedAreas[area.id] && (
                            <div className="p-3 space-y-3">
                              {area.items.map((item) => (
                                <DroppableItemZone
                                  key={item.id}
                                  areaId={area.id}
                                  itemId={item.id}
                                  isOver={activeDropTarget?.areaId === area.id && activeDropTarget?.itemId === item.id}
                                >
                                  <div className="border rounded-lg bg-background" data-testid={`item-${item.id}`}>
                                    <div 
                                      className="flex items-center gap-3 p-3 cursor-pointer"
                                      onClick={() => toggleItemExpanded(item.id, area.id)}
                                    >
                                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                                      {expandedItems[item.id] ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                      <Package className="h-4 w-4 text-primary" />
                                      <Input
                                        value={item.name}
                                        onChange={(e) => handleUpdateItemName(area.id, item.id, e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex-1 h-8"
                                        data-testid={`input-item-name-${item.id}`}
                                      />
                                      <Badge variant="outline">
                                        {item.blocks.filter(b => b.enabled).length} blocks
                                      </Badge>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => { e.stopPropagation(); handleDeleteItem(area.id, item.id); }}
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                        data-testid={`button-delete-item-${item.id}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    
                                    {expandedItems[item.id] && (
                                      <div 
                                        className="px-3 pb-3"
                                        onMouseEnter={() => setDragContext({ areaId: area.id, itemId: item.id })}
                                      >
                                        <Separator className="mb-3" />
                                        <p className="text-sm text-muted-foreground mb-2">Drag blocks from sidebar or reorder existing:</p>
                                        <SortableContext 
                                          items={item.blocks.sort((a, b) => a.order - b.order).map(b => b.id)}
                                          strategy={rectSortingStrategy}
                                        >
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {item.blocks
                                              .sort((a, b) => a.order - b.order)
                                              .map((block) => {
                                                const blockConfig = INSPECTION_BLOCKS.find(b => b.type === block.type);
                                                if (!blockConfig) return null;
                                                return (
                                                  <SortableBlock
                                                    key={block.id}
                                                    block={block}
                                                    blockConfig={blockConfig}
                                                    areaId={area.id}
                                                    itemId={item.id}
                                                    onToggle={handleToggleBlock}
                                                    onConfigure={(b) => handleConfigureBlock(b, area.id, item.id)}
                                                    isDraggingFromSidebar={isDraggingFromSidebar}
                                                    onHover={setHoveredBlockId}
                                                    isHovered={hoveredBlockId === block.id}
                                                  />
                                                );
                                              })}
                                          </div>
                                        </SortableContext>
                                      </div>
                                    )}
                                  </div>
                                </DroppableItemZone>
                              ))}
                              
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => handleAddItem(area.id)}
                                data-testid={`button-add-item-${area.id}`}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Item to {area.name}
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar - Summary */}
          <div className="lg:col-span-4">
            <Card className="sticky top-4 z-[999]">
              <CardContent className="pt-4 pb-4">
                <h3 className="font-medium text-sm mb-3 text-muted-foreground uppercase tracking-wide">Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Areas</span>
                    <span className="font-semibold text-primary">{templateAreas.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Items</span>
                    <span className="font-semibold text-primary">{totalItems}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Blocks</span>
                    <span className="font-semibold text-primary">{totalBlocks}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-sm text-muted-foreground">Units</span>
                    <span className="font-semibold text-primary">{selectedUnits.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          </div>
          </div>

          {/* Drag Overlay - shows the actual item being dragged */}
          <DragOverlay>
            {activeDragId && activeDragData && (
              <div className="flex items-center gap-2 p-2 rounded-lg border bg-background shadow-lg cursor-grabbing">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                {activeDragData.type === 'designer' && activeDragData.data?.field && (
                  <>
                    {(() => {
                      const Icon = activeDragData.data.field.icon;
                      return <Icon className="h-4 w-4 text-primary" />;
                    })()}
                    <span className="text-sm font-medium">{activeDragData.data.field.label}</span>
                  </>
                )}
                {activeDragData.type === 'available-block' && activeDragData.data?.block && (
                  <>
                    {(() => {
                      const Icon = activeDragData.data.block.icon;
                      return <Icon className="h-4 w-4 text-primary" />;
                    })()}
                    <span className="text-sm font-medium">{activeDragData.data.block.label}</span>
                  </>
                )}
                {activeDragData.type === 'sortable-block' && (
                  <span className="text-sm text-muted-foreground">Reordering block...</span>
                )}
              </div>
            )}
          </DragOverlay>
        </DndContext>

        <BlockConfigDialog
          open={configDialogOpen}
          onOpenChange={setConfigDialogOpen}
          block={configuringBlock?.block || null}
          onSave={handleSaveBlockConfig}
        />

        {/* Area Preview Modal */}
        <Dialog open={!!previewAreaId} onOpenChange={(open) => !open && setPreviewAreaId(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                Preview: {previewArea?.name || "Area"}
                <Badge variant="outline" className="ml-2">
                  {templateType === "ONBOARDING" ? "Onboarding Inspection" : "Full Inspection"}
                </Badge>
              </DialogTitle>
            </DialogHeader>
            
            {previewArea && (
              <div className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  This is how the area will appear to {templateType === "ONBOARDING" ? "inspectors" : "cleaners"} in the mobile app.
                </p>
                
                {previewArea.items.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/20">
                    <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                    <p className="text-muted-foreground text-sm">No items in this area</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {previewArea.items.map((item) => (
                      <Card key={item.id} className="overflow-hidden">
                        <div className="bg-primary/10 px-4 py-2 border-b">
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <CardContent className="pt-4 space-y-3">
                          {item.blocks
                            .filter(b => b.enabled)
                            .sort((a, b) => a.order - b.order)
                            .map((block) => {
                              const blockConfig = INSPECTION_BLOCKS.find(b => b.type === block.type);
                              if (!blockConfig) return null;
                              const Icon = blockConfig.icon;
                              
                              return (
                                <div key={block.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20">
                                  <Icon className="h-5 w-5 text-primary mt-0.5" />
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{block.label || blockConfig.label}</p>
                                    <p className="text-xs text-muted-foreground">{blockConfig.description}</p>
                                    
                                    {/* Preview of each block type */}
                                    <div className="mt-2">
                                      {block.type === "CONDITION" && (
                                        <div className="flex gap-1 flex-wrap">
                                          {["Good", "Fair", "Stained", "Damaged", "Missing"].map(c => (
                                            <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                                          ))}
                                        </div>
                                      )}
                                      {block.type === "ACTION_NEEDED" && (
                                        <div className="flex gap-1 flex-wrap">
                                          {["None", "Needs Cleaning", "Needs Fixing", "Needs Replacement"].map(a => (
                                            <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
                                          ))}
                                        </div>
                                      )}
                                      {block.type === "EXISTS" && (
                                        <div className="flex gap-2">
                                          <Badge variant="outline" className="text-xs">{block.trueLabel || "Yes"}</Badge>
                                          <Badge variant="outline" className="text-xs">{block.falseLabel || "No"}</Badge>
                                        </div>
                                      )}
                                      {block.type === "COUNT" && (
                                        <div className="flex gap-2 text-xs text-muted-foreground">
                                          <span>Total: ___</span>
                                          <span>Damaged: ___</span>
                                        </div>
                                      )}
                                      {block.type === "NOTES" && (
                                        <div className="h-8 w-full rounded border border-dashed bg-background" />
                                      )}
                                      {block.type === "MODEL_NUMBER" && (
                                        <div className="h-8 w-32 rounded border border-dashed bg-background" />
                                      )}
                                      {block.type === "PHOTOS_VIDEOS" && (
                                        <div className="flex gap-2">
                                          <div className="h-12 w-12 rounded border border-dashed bg-background flex items-center justify-center">
                                            <Camera className="h-4 w-4 text-muted-foreground" />
                                          </div>
                                        </div>
                                      )}
                                      {block.type === "ISSUES" && (
                                        <div className="flex gap-1 flex-wrap">
                                          {["Scratch", "Stain", "Crack", "Dent"].map(i => (
                                            <Badge key={i} variant="secondary" className="text-xs">{i}</Badge>
                                          ))}
                                        </div>
                                      )}
                                      {block.type === "RADIO" && (
                                        <div className="space-y-1">
                                          {(block.options && block.options.length > 0) ? block.options.map((opt, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                              <Circle className="h-3 w-3 text-muted-foreground" />
                                              <span className="text-xs">{opt}</span>
                                            </div>
                                          )) : (
                                            <span className="text-xs text-muted-foreground italic">No options configured</span>
                                          )}
                                        </div>
                                      )}
                                      {block.type === "DROPDOWN" && (
                                        <div className="flex gap-1 flex-wrap">
                                          {(block.options && block.options.length > 0) ? block.options.map((opt, i) => (
                                            <Badge key={i} variant="outline" className="text-xs">{opt}</Badge>
                                          )) : (
                                            <span className="text-xs text-muted-foreground italic">No options configured</span>
                                          )}
                                        </div>
                                      )}
                                      {block.type === "MULTI_SELECT" && (
                                        <div className="flex gap-1 flex-wrap">
                                          {(block.options && block.options.length > 0) ? block.options.map((opt, i) => (
                                            <Badge key={i} variant="secondary" className="text-xs">{opt}</Badge>
                                          )) : (
                                            <span className="text-xs text-muted-foreground italic">No options configured</span>
                                          )}
                                        </div>
                                      )}
                                      {block.type === "CHECKBOX" && (
                                        <div className="space-y-1">
                                          {(block.options && block.options.length > 0) ? block.options.map((opt, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                              <CheckSquare className="h-3 w-3 text-muted-foreground" />
                                              <span className="text-xs">{opt}</span>
                                            </div>
                                          )) : (
                                            <span className="text-xs text-muted-foreground italic">No options configured</span>
                                          )}
                                        </div>
                                      )}
                                      {block.type === "AUTO_FILL" && (
                                        <div className="flex gap-1 flex-wrap">
                                          {(block.options && block.options.length > 0) ? block.options.map((opt, i) => (
                                            <Badge key={i} variant="outline" className="text-xs">{opt}</Badge>
                                          )) : (
                                            <span className="text-xs text-muted-foreground italic">No suggestions configured</span>
                                          )}
                                        </div>
                                      )}
                                      {block.type === "LOCATION" && (
                                        <div className="h-8 w-full rounded border border-dashed bg-background flex items-center px-2">
                                          <span className="text-xs text-muted-foreground">{block.placeholder || "Enter location..."}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          
                          {item.blocks.filter(b => b.enabled).length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">No blocks enabled for this item</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inspection Templates</h1>
          <p className="text-muted-foreground">Create and manage inspection templates</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-templates"
              />
            </div>
            <Button type="button" onClick={handleAddTemplate} data-testid="button-add-template">
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templatesLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading templates...</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No templates found</p>
              <p className="text-sm">Create your first inspection template to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="hidden sm:table-cell">Areas</TableHead>
                  <TableHead className="hidden sm:table-cell">Units</TableHead>
                  <TableHead className="hidden md:table-cell">Created</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template) => (
                  <TableRow 
                    key={template.id} 
                    className="cursor-pointer"
                    onClick={() => handleEditTemplate(template)}
                    data-testid={`template-row-${template.id}`}
                  >
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {template.type === "ONBOARDING" ? "Onboarding" : "Full Inspection"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{(template.areas as InspectionArea[])?.length || 0} areas</TableCell>
                    <TableCell className="hidden sm:table-cell">{template.unitIds?.length || 0} units</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {new Date(template.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); handlePreviewTemplate(template); }}
                              data-testid={`button-preview-${template.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Preview</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(template.id); }}
                              className="text-destructive hover:text-destructive"
                              data-testid={`button-delete-${template.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent className="w-full sm:w-[400px] md:w-[480px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 flex-wrap">
              {selectedTemplate?.name || "Template Preview"}
              {selectedTemplate && (
                <Badge variant="outline">
                  {selectedTemplate.type === "ONBOARDING" ? "Onboarding" : "Full Inspection"}
                </Badge>
              )}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {selectedTemplate && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { handleEditTemplate(selectedTemplate); setPreviewOpen(false); }}
                  data-testid="button-edit-from-preview"
                >
                  <FileEdit className="h-4 w-4 mr-1.5" />
                  Edit Template
                </Button>
                <p className="text-sm text-muted-foreground">
                  Units Applied: {selectedTemplate.unitIds?.length || 0}
                </p>
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Areas ({(selectedTemplate.areas as InspectionArea[])?.length || 0})
                  </p>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {(selectedTemplate.areas as InspectionArea[])?.map((area: InspectionArea) => (
                        <div key={area.id}>
                          <div className="flex items-center gap-2">
                            <Folder className="h-4 w-4 text-primary" />
                            <span className="font-medium text-sm">{area.name}</span>
                            <span className="text-xs text-muted-foreground">({area.items.length})</span>
                          </div>
                          <div className="space-y-0.5 ml-6 mt-1">
                            {area.items.map((item: InspectionItem) => (
                              <div key={item.id} className="text-sm text-muted-foreground">
                                {item.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {(!(selectedTemplate.areas as InspectionArea[]) || (selectedTemplate.areas as InspectionArea[]).length === 0) && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No areas in this template
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
