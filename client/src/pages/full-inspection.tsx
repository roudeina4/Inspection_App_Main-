import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { ChecklistItem } from "@/components/checklist-item";
import { EnhancedChecklistItem, isItemComplete as isEnhancedItemComplete } from "@/components/enhanced-checklist-item";
import type { EnhancedItemDef, EnhancedItemResponse } from "@/components/enhanced-checklist-item";
import { Shirt } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Upload,
  AlertCircle,
  CheckCircle2,
  Check,
  Camera,
  Plus,
  X,
  Package,
  Image as ImageIcon,
  Home,
  BedDouble,
  Bath,
  BookOpen,
  Sofa,
  CookingPot,
  ShieldCheck,
  Settings,
  UtensilsCrossed,
  Lightbulb,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { Unit, User, TemplateRoom, ChecklistResult, Severity } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MediaPreview {
  id: string;
  file: File;
  type: "PHOTO" | "VIDEO";
  url: string;
  timestamp: Date;
}

interface ItemResponse {
  result?: ChecklistResult | string;
  notes?: string;
  severity?: Severity;
  media?: MediaPreview[];
  count?: number;
  goodCount?: number;
  spareCount?: number;
  conditions?: string[];
  customCondition?: string;
  dismissed?: boolean;
  location?: string;
}

interface RoomResponses {
  [itemKey: string]: ItemResponse;
}

interface AllResponses {
  [roomKey: string]: RoomResponses;
}

interface SupplyItem {
  id: string;
  name: string;
  defaultCount: number;
  count: number;
  verified: boolean;
  isCustom?: boolean;
  minLabel?: string;
}

interface SuppliesState {
  items: SupplyItem[];
  photo: { file: File; url: string } | null;
}

interface RoomDef {
  key: string;
  name: string;
  icon: React.ReactNode;
  items: TemplateRoom["items"];
  enhancedItems?: EnhancedItemDef[];
}

const ENHANCED_ROOM_ITEMS: Record<string, EnhancedItemDef[]> = {
  bedroom: [
    { key: "bedframe", label: "Bedframe", required: true, inputType: "CONDITION_PRESET", presetConditions: ["Scratched", "Broken", "Wobbly", "Squeaky"] },
    { key: "curtains_blinds", label: "Curtains / Blinds", required: true, inputType: "CONDITION_PRESET", presetConditions: ["Torn", "Stained", "Missing", "Broken Rod"] },
    { key: "lights", label: "Lights Working", required: true, inputType: "CONDITIONAL_YESNO", presetConditions: ["Bulb Out", "Flickering", "Switch Broken", "Dim"] },
    { key: "walls", label: "Walls", required: true, inputType: "CONDITION_PRESET", presetConditions: ["Scuffed", "Peeling", "Hole", "Crack", "Stained"] },
    { key: "nightstands", label: "Nightstands", required: true, inputType: "CONDITION_PRESET", presetConditions: ["Scratched", "Stained", "Broken Drawer", "Wobbly"] },
    { key: "floor", label: "Floor", required: true, inputType: "CONDITION_PRESET", presetConditions: ["Scratched", "Stained", "Damaged", "Creaky"] },
    { key: "closet_doors", label: "Closet Doors Working", required: true, inputType: "CONDITIONAL_YESNO", presetConditions: ["Off Track", "Broken Handle", "Won't Close", "Squeaky"] },
    { key: "hangers", label: "Enough Hangers (min 10)", required: true, inputType: "CONDITIONAL_YESNO", presetConditions: ["Not Enough", "Broken", "Wrong Type"] },
  ],
  towels_linens: [
    { key: "pillows", label: "Pillows", required: true, inputType: "COUNT_CONDITION", presetConditions: ["Stained", "Unpuffed", "Torn", "Flat", "Yellowed"], countLabel: "Total" },
    { key: "sheets", label: "Sheets", required: true, inputType: "COUNT_CONDITION", presetConditions: ["Torn", "Stained", "Unremovable Stain", "Pilling", "Faded"], hasSpareCount: true, countLabel: "In Use", spareLabel: "Spares (new)" },
    { key: "duvet_covers", label: "Duvet Covers", required: true, inputType: "COUNT_CONDITION", presetConditions: ["Torn", "Stained", "Unremovable Stain", "Faded", "Missing Buttons"], hasSpareCount: true, countLabel: "In Use", spareLabel: "Spares (new)" },
    { key: "body_towels", label: "Body Towels", required: true, inputType: "COUNT_CONDITION", presetConditions: ["Stained", "Torn", "Thin/Worn", "Faded", "Musty Smell"], countLabel: "Total" },
    { key: "hand_towels", label: "Hand Towels", required: true, inputType: "COUNT_CONDITION", presetConditions: ["Stained", "Torn", "Thin/Worn", "Faded"], countLabel: "Total" },
    { key: "face_towels", label: "Face Towels", required: true, inputType: "COUNT_CONDITION", presetConditions: ["Stained", "Torn", "Thin/Worn", "Faded"], countLabel: "Total" },
  ],
  bathroom: [
    { key: "exhaust_fan", label: "Exhaust Fan", required: true, inputType: "CONDITION_PRESET", presetConditions: ["Not Working", "Loud Noise", "Weak Airflow", "Rattling", "Dusty"] },
    { key: "faucets_working", label: "Faucets Working", required: true, inputType: "CONDITIONAL_YESNO", presetConditions: ["Dripping", "Low Pressure", "Hard to Turn", "Loose Handle"] },
    { key: "leaks", label: "Are There Any Leaks?", required: true, inputType: "CONDITIONAL_YESNO", yesIsBad: true, presetConditions: ["Under Sink", "Faucet Drip", "Pipe Leak", "Base of Toilet", "Shower Head"] },
    { key: "hot_water", label: "Hot Water Working", required: true, inputType: "CONDITIONAL_YESNO", presetConditions: ["No Hot Water", "Takes Too Long", "Not Hot Enough", "Rusty Water"] },
    { key: "cold_water", label: "Cold Water Working", required: true, inputType: "CONDITIONAL_YESNO", presetConditions: ["No Cold Water", "Low Pressure", "Discolored"] },
    { key: "clogs", label: "Any Clogs?", required: true, inputType: "CONDITIONAL_YESNO", yesIsBad: true, presetConditions: ["Sink Clog", "Shower Drain", "Toilet Clog", "Slow Drain"] },
    { key: "toilet", label: "Toilet", required: true, inputType: "CONDITION_PRESET", presetConditions: ["Noisy", "Running", "Loose Seat", "Stained", "Slow Flush", "Wobbly"] },
    { key: "shower_curtain", label: "Shower Curtain / Glass", required: true, inputType: "CONDITION_PRESET", presetConditions: ["Moldy", "Torn", "Missing Rings", "Hard Water Stains", "Cracked Glass"] },
    { key: "silicone_bathroom", label: "Silicone (sink / bathtub / shower)", required: true, inputType: "CONDITION_PRESET", presetConditions: ["Cracking", "Peeling", "Moldy", "Discolored", "Missing"] },
  ],
  living_room: [
    { key: "couch", label: "Couch", required: true, inputType: "CONDITION_PRESET", presetConditions: ["Stained", "Torn", "Sagging", "Faded", "Cushion Damaged", "Pet Hair"] },
    { key: "cushions", label: "Cushions", required: true, inputType: "COUNT_CONDITION", presetConditions: ["Stained", "Torn", "Flat", "Missing Cover"], countLabel: "Total" },
    { key: "coffee_table", label: "Coffee Table", required: true, inputType: "CONDITION_PRESET", presetConditions: ["Scratched", "Stained", "Wobbly", "Chipped", "Ring Marks"], dismissable: true },
    { key: "tv_remote", label: "TV Remote Working", required: true, inputType: "CONDITIONAL_YESNO", presetConditions: ["Not Working", "Missing", "Batteries Dead", "Buttons Stuck"] },
    { key: "tv_working", label: "TV", required: true, inputType: "CONDITION_PRESET", presetConditions: ["No Signal", "Screen Cracked", "No Sound", "Remote Not Pairing", "HDMI Port Broken", "Power Issue"] },
  ],
  kitchen: [
    { key: "refrigerator", label: "Refrigerator", required: true, inputType: "CONDITION_PRESET", presetConditions: ["Not Cooling", "Noisy", "Leaking", "Dirty", "Broken Shelf", "Ice Buildup"] },
    { key: "stove_oven", label: "Stove / Oven", required: true, inputType: "CONDITION_PRESET", presetConditions: ["Burner Not Working", "Dirty", "Knob Broken", "Door Won't Close", "Scratched"] },
    { key: "microwave", label: "Microwave", required: true, inputType: "CONDITION_PRESET", presetConditions: ["Not Heating", "Noisy", "Dirty", "Door Broken", "Turntable Missing"] },
    { key: "dishwasher", label: "Dishwasher", required: true, inputType: "CONDITION_PRESET", presetConditions: ["Not Draining", "Noisy", "Leaking", "Dirty", "Door Latch Broken"] },
    { key: "coffee_machine", label: "Coffee Machine", required: true, inputType: "CONDITION_PRESET", presetConditions: ["Not Working", "Dirty", "Missing Parts", "Leaking", "Missing"] },
    { key: "electric_kettle", label: "Electric Kettle", required: true, inputType: "CONDITION_PRESET", presetConditions: ["Not Working", "Limescale", "Leaking", "Broken Lid", "Missing"] },
    { key: "countertops", label: "Countertops", required: true, inputType: "CONDITION_PRESET", presetConditions: ["Scratched", "Stained", "Chipped", "Cracked", "Burn Marks"] },
    { key: "sink_faucets", label: "Sink / Faucets", required: true, inputType: "CONDITION_PRESET", presetConditions: ["Dripping", "Clogged", "Low Pressure", "Leaking", "Stained"] },
    { key: "cabinets", label: "Cabinets", required: true, inputType: "CONDITION_PRESET", presetConditions: ["Broken Hinge", "Door Won't Close", "Scratched", "Stained", "Missing Handle"] },
    { key: "pots", label: "Pots", required: true, inputType: "COUNT_CONDITION", presetConditions: ["Scratched", "Burnt", "Missing Lid", "Worn Coating"], countLabel: "Total" },
    { key: "pans", label: "Pans", required: true, inputType: "COUNT_CONDITION", presetConditions: ["Scratched", "Burnt", "Worn Coating", "Warped"], countLabel: "Total" },
    { key: "glasses", label: "Glasses", required: true, inputType: "COUNT_CONDITION", presetConditions: ["Chipped", "Cracked", "Stained", "Mismatched"], countLabel: "Total" },
    { key: "cutlery", label: "Cutlery", required: true, inputType: "CONDITION_PRESET", presetConditions: ["Not Enough", "Bent", "Rusty", "Mismatched", "Missing Items"] },
    { key: "knife_set", label: "Knife Set", required: true, inputType: "CONDITION_PRESET", presetConditions: ["Dull", "Missing Knives", "Broken Handle", "Rusty", "Missing Block"] },
    { key: "oven_mitts", label: "Oven Mitts", required: true, inputType: "CONDITION_PRESET", presetConditions: ["Stained", "Burnt", "Torn", "Missing"] },
    { key: "silicone_kitchen", label: "Silicone (sink / cabinets)", required: true, inputType: "CONDITION_PRESET", presetConditions: ["Cracking", "Peeling", "Moldy", "Discolored", "Missing"] },
  ],
  dining_hallways: [
    { key: "dining_table", label: "Dining Table", required: true, inputType: "CONDITION_PRESET", presetConditions: ["Scratched", "Stained", "Wobbly", "Chipped", "Ring Marks"] },
    { key: "chairs", label: "Chairs", required: true, inputType: "COUNT_CONDITION", presetConditions: ["Wobbly", "Scratched", "Stained", "Broken"], countLabel: "Total" },
    { key: "closets_storage", label: "Closets / Storage", required: true, inputType: "CONDITION_PRESET", presetConditions: ["Door Won't Close", "Broken Hinge", "Scratched", "Shelf Broken"] },
  ],
  appliances: [
    { key: "washing_machine", label: "Washing Machine", required: true, inputType: "CONDITION_PRESET", presetConditions: ["Not Draining", "Noisy", "Leaking", "Not Spinning", "Error Code", "Door Won't Open", "Vibrating"] },
    { key: "dryer", label: "Dryer", required: true, inputType: "CONDITION_PRESET", presetConditions: ["Not Heating", "Noisy", "Not Spinning", "Takes Too Long", "Lint Trap Full", "Error Code", "Door Won't Close"] },
    { key: "dishwasher_appliance", label: "Dishwasher", required: true, inputType: "CONDITION_PRESET", presetConditions: ["Not Draining", "Noisy", "Leaking", "Dirty", "Door Latch Broken", "Not Cleaning", "Error Code"] },
    { key: "hairdryer", label: "Hairdryer", required: true, inputType: "EXISTS_CONDITION", hasLocation: true, presetConditions: ["Good", "Not Working", "Overheating", "Broken Switch", "Cord Damaged"] },
    { key: "vacuum", label: "Vacuum", required: true, inputType: "EXISTS_CONDITION", hasLocation: true, presetConditions: ["Good", "Not Working", "Weak Suction", "Broken Hose", "Full Bag", "Missing Attachment", "Takes Too Long to Charge"] },
    { key: "iron", label: "Iron", required: true, inputType: "EXISTS_CONDITION", hasLocation: true, presetConditions: ["Good", "Not Heating", "Leaking", "Cord Damaged", "Plate Dirty", "Broken Button"] },
    { key: "iron_board", label: "Iron Board", required: true, inputType: "EXISTS_CONDITION", hasLocation: true, presetConditions: ["Good", "Wobbly", "Cover Torn", "Height Stuck", "Broken Legs"] },
  ],
  general: [
    { key: "lighting", label: "Lighting Fixtures & Lamps", required: true, inputType: "CONDITIONAL_YESNO", presetConditions: ["Bulb Out", "Flickering", "Broken Fixture", "Missing Shade"] },
    { key: "doors_locks", label: "Doors / Locks", required: true, inputType: "CONDITIONAL_YESNO", presetConditions: ["Won't Lock", "Stiff", "Squeaky", "Broken Handle"] },
    { key: "windows_condition", label: "Windows", required: true, inputType: "CONDITION_PRESET", presetConditions: ["Cracked", "Won't Open", "Broken Lock", "Dirty", "Seal Broken"] },
    { key: "flooring", label: "Flooring", required: true, inputType: "CONDITION_PRESET", presetConditions: ["Scratched", "Stained", "Damaged", "Creaky", "Tile Cracked"] },
    { key: "walls_paint", label: "Walls / Paint", required: true, inputType: "CONDITION_PRESET", presetConditions: ["Scuffed", "Peeling", "Hole", "Crack", "Stained"] },
    { key: "heating_cooling", label: "Heating / Cooling", required: true, inputType: "CONDITIONAL_YESNO", presetConditions: ["Not Working", "Noisy", "Weak Airflow", "Leaking"] },
    { key: "wifi", label: "WiFi", required: true, inputType: "CONDITIONAL_YESNO", presetConditions: ["Not Working", "Slow", "No Password", "Weak Signal"] },
    { key: "balcony", label: "Balcony", required: true, inputType: "CONDITION_PRESET", presetConditions: ["Dirty", "Railing Loose", "Floor Damaged", "Furniture Broken", "Needs Cleaning"], dismissable: true },
  ],
};

const ROOM_ITEMS: Record<string, TemplateRoom["items"]> = {
};

function generateSupplies(bedroomCount: number, bathroomCount: number): SupplyItem[] {
  const baths = Math.max(1, bathroomCount);
  const beds = Math.max(1, bedroomCount);
  const tp = baths * 2;
  return [
    { id: "toilet_paper", name: "Toilet Paper", defaultCount: tp, count: tp, verified: false, minLabel: `Min ${tp} (2 per bathroom)` },
    { id: "paya_kits", name: "Paya Kits", defaultCount: baths, count: baths, verified: false, minLabel: `Min ${baths} (1 per bathroom)` },
    { id: "dishwasher_pods", name: "Dishwasher Pods", defaultCount: 4, count: 4, verified: false, minLabel: "Min 4" },
    { id: "dishwasher_detergent", name: "Dishwasher Detergent", defaultCount: 1, count: 1, verified: false, minLabel: "Min 1" },
    { id: "laundry_pods", name: "Laundry Pods", defaultCount: 1, count: 1, verified: false, minLabel: "Min 1" },
    { id: "laundry_detergent", name: "Laundry Detergent", defaultCount: 1, count: 1, verified: false, minLabel: "Min 1" },
    { id: "coffee_pods", name: "Coffee Pods", defaultCount: 1, count: 1, verified: false, minLabel: "Min 1 box" },
    { id: "garbage_bags", name: "Garbage Bags", defaultCount: beds, count: beds, verified: false, minLabel: `Min ${beds} (1 per bedroom)` },
    { id: "paper_towel", name: "Paper Towel", defaultCount: beds, count: beds, verified: false, minLabel: `Min ${beds} (1 per bedroom)` },
  ];
}

function generateRoomsFromUnit(unit: Unit | undefined): RoomDef[] {
  const rooms: RoomDef[] = [];

  const bedroomCount = unit?.bedroomCount || 1;
  for (let i = 1; i <= bedroomCount; i++) {
    rooms.push({
      key: `bedroom_${i}`,
      name: bedroomCount > 1 ? `Bedroom ${i}` : "Bedroom",
      icon: <BedDouble className="h-4 w-4" />,
      items: [],
      enhancedItems: ENHANCED_ROOM_ITEMS.bedroom,
    });
  }

  rooms.push({
    key: "towels_linens",
    name: "Towels & Linens",
    icon: <Shirt className="h-4 w-4" />,
    items: [],
    enhancedItems: ENHANCED_ROOM_ITEMS.towels_linens,
  });

  const bathroomCount = unit?.bathroomCount || 1;
  for (let i = 1; i <= bathroomCount; i++) {
    rooms.push({
      key: `bathroom_${i}`,
      name: bathroomCount > 1 ? `Bathroom ${i}` : "Bathroom",
      icon: <Bath className="h-4 w-4" />,
      items: [],
      enhancedItems: ENHANCED_ROOM_ITEMS.bathroom,
    });
  }

  rooms.push({
    key: "living_room",
    name: "Living Room",
    icon: <Sofa className="h-4 w-4" />,
    items: [],
    enhancedItems: ENHANCED_ROOM_ITEMS.living_room,
  });
  rooms.push({ key: "kitchen", name: "Kitchen", icon: <CookingPot className="h-4 w-4" />, items: [], enhancedItems: ENHANCED_ROOM_ITEMS.kitchen });
  rooms.push({ key: "dining_hallways", name: "Dining & Hallways", icon: <UtensilsCrossed className="h-4 w-4" />, items: [], enhancedItems: ENHANCED_ROOM_ITEMS.dining_hallways });
  rooms.push({ key: "appliances", name: "Equipment & Extras", icon: <Settings className="h-4 w-4" />, items: [], enhancedItems: ENHANCED_ROOM_ITEMS.appliances });

  if (unit?.hasDen) {
    rooms.push({
      key: "den",
      name: "Den",
      icon: <BookOpen className="h-4 w-4" />,
      items: [
        { key: "furniture", label: "Furniture Condition", required: true, inputType: "PASS_FAIL", requiresMedia: true },
        { key: "lighting", label: "Lighting Working", required: true, inputType: "YES_NO", requiresMedia: true },
        { key: "floor", label: "Floor Condition", required: true, inputType: "PASS_FAIL", requiresMedia: true },
      ],
    });
  }

  rooms.push({ key: "general", name: "General", icon: <Lightbulb className="h-4 w-4" />, items: [], enhancedItems: ENHANCED_ROOM_ITEMS.general });
  rooms.push({ key: "unit_supplies", name: "Unit Supplies", icon: <Package className="h-4 w-4" />, items: [] });

  return rooms;
}

export default function FullInspectionPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useI18n();

  const [step, setStep] = useState<"setup" | "inspection" | "complete">("setup");
  const [unitId, setUnitId] = useState("");
  const [pmId, setPmId] = useState("");
  const [unitSearch, setUnitSearch] = useState("");
  const [unitDropdownOpen, setUnitDropdownOpen] = useState(false);
  const unitSearchRef = useRef<HTMLInputElement>(null);
  const submittedRef = useRef(false);
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
  const [responses, setResponses] = useState<AllResponses>({});
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [highlightIncomplete, setHighlightIncomplete] = useState(false);
  const [showPmMismatch, setShowPmMismatch] = useState(false);
  const [pmMismatchInfo, setPmMismatchInfo] = useState<{ pmName: string; propertyName: string } | null>(null);
  const [supplies, setSupplies] = useState<SuppliesState>({
    items: generateSupplies(1, 1),
    photo: null,
  });
  const [customSupplyName, setCustomSupplyName] = useState("");
  const suppliesPhotoRef = useRef<HTMLInputElement>(null);

  const { data: units } = useQuery<Unit[]>({ queryKey: ["/api/units"] });
  const { data: pms } = useQuery<User[]>({ queryKey: ["/api/users/pms"] });

  const handleUnitSelect = async (selectedUnitId: string) => {
    setUnitId(selectedUnitId);
    setPmId("");
    if (!selectedUnitId) return;
    try {
      const token = localStorage.getItem("jwt_token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/unit-pm?unitId=${selectedUnitId}`, {
        headers,
        credentials: "include",
      });
      const data = await res.json();
      if (data.pmId) {
        setPmId(data.pmId);
      }
    } catch (e) {
      // silently ignore
    }
  };

  const handlePmSelect = async (selectedPmId: string) => {
    setPmId(selectedPmId);
    if (!unitId || !selectedPmId) return;
    try {
      const token = localStorage.getItem("jwt_token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/validate-pm-property?unitId=${unitId}&pmId=${selectedPmId}`, {
        headers,
        credentials: "include",
      });
      const data = await res.json();
      if (!data.valid) {
        setPmMismatchInfo({ pmName: data.pmName, propertyName: data.propertyName });
        setShowPmMismatch(true);
      }
    } catch (e) {
      // silently ignore validation errors
    }
  };

  const selectedUnit = units?.find(u => u.id === unitId);

  useEffect(() => {
    if (selectedUnit) {
      const bedroomCount = selectedUnit.bedroomCount || 1;
      setSupplies(prev => ({
        ...prev,
        items: generateSupplies(bedroomCount, selectedUnit.bathroomCount || 1),
      }));
    }
  }, [selectedUnit]);

  const rooms = useMemo(() => generateRoomsFromUnit(selectedUnit), [selectedUnit]);

  useEffect(() => {
    if (currentRoomIndex >= rooms.length) {
      setCurrentRoomIndex(Math.max(0, rooms.length - 1));
    }
  }, [currentRoomIndex, rooms.length]);

  const safeIndex = Math.min(currentRoomIndex, rooms.length - 1);
  const currentRoom = rooms[safeIndex];

  useEffect(() => {
    const saved = localStorage.getItem("fullInspectionDraft");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.responses) {
          const restoredResponses: AllResponses = {};
          for (const roomKey in data.responses) {
            restoredResponses[roomKey] = {};
            for (const itemKey in data.responses[roomKey]) {
              const item = data.responses[roomKey][itemKey];
              restoredResponses[roomKey][itemKey] = {
                ...item,
                media: [],
              };
            }
          }
          setResponses(restoredResponses);
        }
        if (data.unitId) setUnitId(data.unitId);
        if (data.pmId) setPmId(data.pmId);
        if (data.step && data.step !== "complete") {
          setStep(data.step);
        } else if (data.step === "complete") {
          localStorage.removeItem("fullInspectionDraft");
          return;
        }
        if (typeof data.currentRoomIndex === "number") setCurrentRoomIndex(data.currentRoomIndex);
        if (data.supplies?.items) {
          setSupplies(prev => ({ ...prev, items: data.supplies.items }));
        }
        if (data.suppliesPhotoRequired) {
          setTimeout(() => {
            toast({
              title: t("photoRequired"),
              description: "Your draft was restored, but the supplies photo needs to be re-attached.",
            });
          }, 500);
        }
      } catch (e) {
        console.error("Failed to restore draft:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (step === "complete" || submittedRef.current) return;
    if (!unitId && !pmId && Object.keys(responses).length === 0) return;
    if (step === "inspection" || Object.keys(responses).length > 0) {
      localStorage.setItem("fullInspectionDraft", JSON.stringify({
        responses: Object.fromEntries(
          Object.entries(responses).map(([roomKey, roomData]) => [
            roomKey,
            Object.fromEntries(
              Object.entries(roomData).map(([itemKey, item]) => [
                itemKey,
                { ...item, media: undefined },
              ])
            ),
          ])
        ),
        unitId,
        pmId,
        step,
        currentRoomIndex,
        supplies: { items: supplies.items },
        suppliesPhotoRequired: supplies.photo !== null,
      }));
    }
  }, [responses, unitId, pmId, step, currentRoomIndex, supplies.items, supplies.photo]);

  const updateItemResponse = (roomKey: string, itemKey: string, data: Partial<ItemResponse>) => {
    setResponses((prev) => ({
      ...prev,
      [roomKey]: {
        ...prev[roomKey],
        [itemKey]: {
          ...prev[roomKey]?.[itemKey],
          ...data,
        },
      },
    }));
  };

  const isSuppliesComplete = (): boolean => {
    return supplies.items.every(s => s.verified) && supplies.photo !== null;
  };

  const getSuppliesErrors = (): string[] => {
    const errors: string[] = [];
    const unverified = supplies.items.filter(s => !s.verified);
    if (unverified.length > 0) {
      unverified.forEach(s => errors.push(`${s.name} — not verified`));
    }
    if (!supplies.photo) {
      errors.push("Stocked supplies photo — not attached");
    }
    return errors;
  };

  const toggleSupplyVerified = (id: string) => {
    setSupplies(prev => ({
      ...prev,
      items: prev.items.map(s => s.id === id ? { ...s, verified: !s.verified } : s),
    }));
  };

  const updateSupplyCount = (id: string, count: number) => {
    setSupplies(prev => ({
      ...prev,
      items: prev.items.map(s => s.id === id ? { ...s, count: Math.max(0, count) } : s),
    }));
  };

  const addCustomSupply = () => {
    const name = customSupplyName.trim();
    if (!name) return;
    const id = `custom_${Date.now()}`;
    setSupplies(prev => ({
      ...prev,
      items: [{ id, name, defaultCount: 1, count: 1, verified: false, isCustom: true }, ...prev.items],
    }));
    setCustomSupplyName("");
  };

  const removeCustomSupply = (id: string) => {
    setSupplies(prev => ({
      ...prev,
      items: prev.items.filter(s => s.id !== id),
    }));
  };

  const handleSuppliesPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSupplies(prev => ({ ...prev, photo: { file, url } }));
  };

  const removeSuppliesPhoto = () => {
    if (supplies.photo) {
      URL.revokeObjectURL(supplies.photo.url);
    }
    setSupplies(prev => ({ ...prev, photo: null }));
  };

  const isRoomComplete = (room: RoomDef): boolean => {
    if (room.key === "unit_supplies") {
      return isSuppliesComplete();
    }
    const roomResponses = responses[room.key] || {};

    if (room.enhancedItems && room.enhancedItems.length > 0) {
      return room.enhancedItems.every((item) => {
        if (!item.required) return true;
        const response = roomResponses[item.key] || {};
        return isEnhancedItemComplete(item, response as EnhancedItemResponse);
      });
    }

    return room.items.every((item) => {
      if (!item.required) return true;
      const response = roomResponses[item.key];
      if (!response?.result) return false;
      if (item.requiresMedia && response.result !== "NA" && (!response.media || response.media.length === 0)) return false;
      return true;
    });
  };

  const completedRoomCount = rooms.filter(r => isRoomComplete(r)).length;
  const overallProgress = (completedRoomCount / rooms.length) * 100;

  const handleNavigateToRoom = (idx: number) => {
    setCurrentRoomIndex(idx);
    window.scrollTo(0, 0);
  };

  const handleStartInspection = () => {
    if (!unitId) {
      toast({ variant: "destructive", title: t("unitRequired") });
      return;
    }
    if (!pmId) {
      toast({ variant: "destructive", title: t("pmRequired") });
      return;
    }
    setStep("inspection");
  };

  const handleBackToSetup = () => {
    setStep("setup");
  };

  const canSubmit = rooms.every((room) => isRoomComplete(room));

  const submitMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("unitId", unitId);
      formData.append("responsiblePmId", pmId);
      formData.append("createdById", user?.id || "");
      formData.append("type", "FULL_INSPECTION");

      const checklistData: Array<{
        roomKey: string;
        itemKey: string;
        result: ChecklistResult;
        notes?: string;
        severity?: Severity;
        mediaIndices: number[];
      }> = [];

      let mediaIndex = 0;
      rooms.forEach((room) => {
        const roomResponses = responses[room.key] || {};

        if (room.enhancedItems && room.enhancedItems.length > 0) {
          room.enhancedItems.forEach((item) => {
            const response = roomResponses[item.key] as EnhancedItemResponse | undefined;
            if (!response || response.dismissed) return;
            const mediaIndices: number[] = [];
            if (response.media) {
              response.media.forEach((m) => {
                formData.append(`media_${mediaIndex}`, m.file);
                formData.append(`mediaType_${mediaIndex}`, m.type);
                formData.append(`mediaTimestamp_${mediaIndex}`, (m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp)).toISOString());
                mediaIndices.push(mediaIndex);
                mediaIndex++;
              });
            }

            let result: ChecklistResult = "PASS";
            let notes = response.notes || "";
            const extraParts: string[] = [];

            if (item.inputType === "COUNT_CONDITION") {
              const count = response.count ?? 0;
              const goodCount = response.goodCount ?? 0;
              const notGood = Math.max(0, count - goodCount);
              extraParts.push(`Count: ${count}`);
              extraParts.push(`Good: ${goodCount}`);
              if (notGood > 0) extraParts.push(`Not Good: ${notGood}`);
              if (response.spareCount !== undefined && response.spareCount > 0) extraParts.push(`Spares: ${response.spareCount}`);
              if (response.conditions && response.conditions.length > 0) extraParts.push(`Issues: ${response.conditions.join(", ")}`);
              result = notGood > 0 ? "FAIL" as ChecklistResult : "PASS" as ChecklistResult;
            } else if (item.inputType === "CONDITIONAL_YESNO") {
              result = (response.result === "YES" ? "PASS" : "FAIL") as ChecklistResult;
              if (response.conditions && response.conditions.length > 0) extraParts.push(`Issues: ${response.conditions.join(", ")}`);
            } else if (item.inputType === "CONDITION_PRESET") {
              result = (response.result === "PASS" ? "PASS" : "FAIL") as ChecklistResult;
              if (response.conditions && response.conditions.length > 0) extraParts.push(`Issues: ${response.conditions.join(", ")}`);
            }

            const fullNotes = [extraParts.join(". "), notes].filter(Boolean).join(" | ");

            checklistData.push({
              roomKey: room.key,
              itemKey: item.key,
              result,
              notes: fullNotes || undefined,
              severity: result === "FAIL" ? ("MED" as Severity) : undefined,
              mediaIndices,
            });
          });
        } else {
          room.items.forEach((item) => {
            const response = roomResponses[item.key];
            if (response?.result) {
              const mediaIndices: number[] = [];
              if (response.media) {
                response.media.forEach((m) => {
                  formData.append(`media_${mediaIndex}`, m.file);
                  formData.append(`mediaType_${mediaIndex}`, m.type);
                  formData.append(`mediaTimestamp_${mediaIndex}`, m.timestamp.toISOString());
                  mediaIndices.push(mediaIndex);
                  mediaIndex++;
                });
              }
              checklistData.push({
                roomKey: room.key,
                itemKey: item.key,
                result: response.result as ChecklistResult,
                notes: response.notes,
                severity: response.severity,
                mediaIndices,
              });
            }
          });
        }
      });

      const suppliesData = supplies.items.map(s => ({
        id: s.id,
        name: s.name,
        count: s.count,
        verified: s.verified,
        isCustom: s.isCustom || false,
      }));
      formData.append("suppliesData", JSON.stringify(suppliesData));

      if (supplies.photo) {
        formData.append(`media_${mediaIndex}`, supplies.photo.file);
        formData.append(`mediaType_${mediaIndex}`, "PHOTO");
        formData.append(`mediaTimestamp_${mediaIndex}`, new Date().toISOString());
        checklistData.push({
          roomKey: "unit_supplies",
          itemKey: "stocked_supplies_photo",
          result: "PASS" as ChecklistResult,
          notes: `Supplies verified: ${suppliesData.map(s => `${s.name} (${s.count})`).join(", ")}`,
          mediaIndices: [mediaIndex],
        });
        mediaIndex++;
      }

      formData.append("checklistData", JSON.stringify(checklistData));
      formData.append("mediaCount", mediaIndex.toString());

      const headers: Record<string, string> = {};
      const token = localStorage.getItem("jwt_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/inspections/full", {
        method: "POST",
        headers,
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Submission failed");
      }
      return res.json();
    },
    onSuccess: () => {
      submittedRef.current = true;
      localStorage.removeItem("fullInspectionDraft");
      for (const roomKey in responses) {
        const roomData = responses[roomKey];
        for (const itemKey in roomData) {
          const item = roomData[itemKey] as any;
          if (item.media) {
            item.media.forEach((m: any) => { if (m.url) URL.revokeObjectURL(m.url); });
          }
        }
      }
      if (supplies.photo?.url) URL.revokeObjectURL(supplies.photo.url);
      setResponses({});
      setUnitId("");
      setPmId("");
      setUnitSearch("");
      setUnitDropdownOpen(false);
      setCurrentRoomIndex(0);
      setSupplies({ items: generateSupplies(1, 1), photo: null });
      setHighlightIncomplete(false);
      setShowValidationDialog(false);
      setValidationErrors([]);
      queryClient.invalidateQueries({ queryKey: ["/api/inspection-tasks"] });
      setStep("complete");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Could not submit inspection",
      });
    },
  });

  const getIncompleteRooms = (): { index: number; name: string; missingItems: string[] }[] => {
    const incomplete: { index: number; name: string; missingItems: string[] }[] = [];
    rooms.forEach((room, idx) => {
      if (room.key === "unit_supplies") {
        if (!isSuppliesComplete()) {
          incomplete.push({ index: idx, name: room.name, missingItems: getSuppliesErrors() });
        }
        return;
      }
      const roomResponses = responses[room.key] || {};
      const missingItems: string[] = [];
      if (room.enhancedItems && room.enhancedItems.length > 0) {
        room.enhancedItems.forEach((item) => {
          if (!item.required) return;
          const response = roomResponses[item.key] || {};
          if (!isEnhancedItemComplete(item, response as EnhancedItemResponse)) {
            missingItems.push(item.label);
          }
        });
      } else {
        room.items.forEach((item) => {
          if (!item.required) return;
          const response = roomResponses[item.key];
          if (!response?.result) {
            missingItems.push(item.label);
          } else if (item.requiresMedia && response.result !== "NA" && (!response.media || response.media.length === 0)) {
            missingItems.push(`${item.label} (needs photo)`);
          }
        });
      }
      if (missingItems.length > 0) {
        incomplete.push({ index: idx, name: room.name, missingItems });
      }
    });
    return incomplete;
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      setHighlightIncomplete(true);
      const incompleteRooms = getIncompleteRooms();
      if (incompleteRooms.length > 0) {
        const errors = incompleteRooms.map(r =>
          `${r.name}: ${r.missingItems.slice(0, 3).join(", ")}${r.missingItems.length > 3 ? ` +${r.missingItems.length - 3} more` : ""}`
        );
        setValidationErrors(errors);
        setShowValidationDialog(true);
        handleNavigateToRoom(incompleteRooms[0].index);
      }
      return;
    }
    setHighlightIncomplete(false);
    setIsSubmitting(true);
    try {
      await submitMutation.mutateAsync();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExit = () => {
    if (Object.keys(responses).length > 0) {
      setShowExitDialog(true);
    } else {
      setLocation("/home");
    }
  };

  if (step === "complete") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-full bg-chart-2/20 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-chart-2" />
          </div>
          <h1 className="text-2xl font-bold">{t("inspectionSubmitted")}</h1>
          <p className="text-muted-foreground">{t("fullInspectionSubmitted")}</p>
          <Button onClick={() => setLocation("/home")} data-testid="button-done">
            {t("returnHome")}
          </Button>
        </div>
      </div>
    );
  }

  if (step === "setup") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
        <header className="sticky top-0 z-50 flex items-center gap-4 p-4 border-b bg-background/95 backdrop-blur">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/home")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-lg">{t("fullInspection")}</h1>
            <p className="text-xs text-muted-foreground">{t("setup")}</p>
          </div>
          <ThemeToggle />
        </header>

        <main className="flex-1 p-4 space-y-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Home className="h-4 w-4 text-primary" />
                {t("selectUnit")} & {t("selectPM")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">{t("unit")} <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input
                    ref={unitSearchRef}
                    placeholder={selectedUnit ? `${selectedUnit.propertyName}` : t("selectUnit")}
                    value={unitDropdownOpen ? unitSearch : (selectedUnit ? selectedUnit.propertyName : "")}
                    onChange={(e) => { setUnitSearch(e.target.value); setUnitDropdownOpen(true); }}
                    onFocus={() => setUnitDropdownOpen(true)}
                    className={`h-10 ${selectedUnit && !unitDropdownOpen ? "text-foreground" : ""}`}
                    data-testid="input-unit-search"
                  />
                  {selectedUnit && !unitDropdownOpen && (
                    <button
                      type="button"
                      onClick={() => { setUnitId(""); setPmId(""); setUnitSearch(""); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-muted flex items-center justify-center"
                      data-testid="button-clear-unit"
                    >
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  )}
                  {unitDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUnitDropdownOpen(false)} />
                      <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border rounded-lg shadow-lg overflow-hidden">
                        <div className="max-h-48 overflow-y-auto hide-scrollbar">
                          {(() => {
                            const q = unitSearch.toLowerCase();
                            const filtered = units?.filter(u =>
                              u.propertyName.toLowerCase().includes(q) ||
                              u.unitNumber.toLowerCase().includes(q)
                            ) || [];
                            if (filtered.length === 0) {
                              return <div className="px-3 py-4 text-sm text-muted-foreground text-center">No units found</div>;
                            }
                            return filtered.map((unit) => (
                              <button
                                key={unit.id}
                                type="button"
                                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors flex items-center justify-between ${unit.id === unitId ? "bg-accent font-medium" : ""}`}
                                onClick={() => {
                                  handleUnitSelect(unit.id);
                                  setUnitSearch("");
                                  setUnitDropdownOpen(false);
                                }}
                                data-testid={`unit-option-${unit.id}`}
                              >
                                <span>{unit.propertyName}</span>
                                {unit.id === unitId && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                              </button>
                            ));
                          })()}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">{t("responsiblePM")} <span className="text-destructive">*</span></Label>
                <Select value={pmId} onValueChange={handlePmSelect}>
                  <SelectTrigger data-testid="select-pm">
                    <SelectValue placeholder={t("selectPM")} />
                  </SelectTrigger>
                  <SelectContent>
                    {pms?.map((pm) => (
                      <SelectItem key={pm.id} value={pm.id}>
                        {pm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {selectedUnit && (
            <Card className="border-primary/20 bg-primary/5 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Home className="h-4 w-4 text-primary" />
                  {t("propertyRooms")}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{t("basedOnUnit")}</p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <BedDouble className="h-3 w-3" />
                    {selectedUnit.bedroomCount || 1} {t("bedroom")}{(selectedUnit.bedroomCount || 1) > 1 ? "s" : ""}
                  </Badge>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Bath className="h-3 w-3" />
                    {selectedUnit.bathroomCount || 1} {t("bathroom")}{(selectedUnit.bathroomCount || 1) > 1 ? "s" : ""}
                  </Badge>
                  {selectedUnit.hasDen && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {t("den")}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            className="w-full rounded-xl h-12 text-base font-semibold"
            size="lg"
            onClick={handleStartInspection}
            disabled={!unitId || !pmId}
            data-testid="button-start"
          >
            {t("startInspection")}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </main>

        <AlertDialog open={showPmMismatch} onOpenChange={setShowPmMismatch}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                PM Mismatch
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pmMismatchInfo
                  ? `${pmMismatchInfo.pmName} does not manage the property "${pmMismatchInfo.propertyName}". Please select the correct PM for this property.`
                  : "The selected PM does not manage this property."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction
                onClick={() => {
                  setPmId("");
                  setShowPmMismatch(false);
                }}
                data-testid="button-pm-mismatch-ok"
              >
                OK, I'll change it
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <aside className="hidden lg:flex flex-col w-64 border-r bg-card fixed top-0 left-0 h-screen z-40">
        <div className="p-4 border-b">
          <Button variant="ghost" size="sm" onClick={handleBackToSetup} className="mb-2" data-testid="button-edit-setup">
            <Settings className="h-4 w-4 mr-2" />
            {t("setup")}
          </Button>
          <h2 className="font-semibold text-lg">{t("roomsToInspect")}</h2>
          <p className="text-xs text-muted-foreground">
            {completedRoomCount} {t("of")} {rooms.length} complete
          </p>
          <Progress value={overallProgress} className="h-1.5 mt-2" />
        </div>
        <div className="flex-1 overflow-y-auto hide-scrollbar">
          <div className="p-2 space-y-1">
            {rooms.map((room, idx) => {
              const roomComplete = isRoomComplete(room);
              return (
                <button
                  key={room.key}
                  onClick={() => handleNavigateToRoom(idx)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                    currentRoomIndex === idx
                      ? "bg-primary text-primary-foreground"
                      : roomComplete
                        ? "bg-chart-2/15 text-chart-2"
                        : "hover:bg-muted"
                  )}
                  data-testid={`nav-room-${room.key}`}
                >
                  {room.icon}
                  <span className="flex-1 text-sm font-medium">{room.name}</span>
                  {roomComplete && (
                    <CheckCircle2 className={cn(
                      "h-4 w-4",
                      currentRoomIndex === idx ? "text-primary-foreground" : "text-chart-2"
                    )} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="p-4 border-t">
          <Button
            className="w-full"
            variant={canSubmit ? "default" : "outline"}
            onClick={handleSubmit}
            disabled={isSubmitting}
            data-testid="button-submit-sidebar"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("submitting")}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {t("submitInspection")}
              </>
            )}
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col lg:ml-64">
        <header className="sticky top-0 z-50 flex items-center gap-2 p-4 border-b bg-background/95 backdrop-blur lg:hidden">
          <Button variant="ghost" size="icon" onClick={handleExit} data-testid="button-exit">
            <X className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold">{currentRoom.name}</h1>
            <p className="text-xs text-muted-foreground">
              {completedRoomCount}/{rooms.length} done
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleBackToSetup} data-testid="button-edit-setup-mobile">
            <Settings className="h-4 w-4" />
          </Button>
          <ThemeToggle />
        </header>

        <div className="lg:hidden overflow-x-auto border-b bg-muted/30 hide-scrollbar">
          <div className="flex p-2 gap-1.5 min-w-max">
            {rooms.map((room, idx) => {
              const roomComplete = isRoomComplete(room);
              return (
                <button
                  key={room.key}
                  onClick={() => handleNavigateToRoom(idx)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                    currentRoomIndex === idx
                      ? "bg-primary text-primary-foreground"
                      : roomComplete
                        ? "bg-chart-2/15 text-chart-2 border border-chart-2/20"
                        : "bg-background hover:bg-muted"
                  )}
                  data-testid={`tab-room-${room.key}`}
                >
                  {room.icon}
                  {room.name}
                  {roomComplete && (
                    <CheckCircle2 className={cn(
                      "h-3.5 w-3.5",
                      currentRoomIndex === idx ? "text-primary-foreground" : "text-chart-2"
                    )} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:hidden px-4 pt-3">
          <Progress value={overallProgress} className="h-1.5" />
        </div>

        <main className="flex-1 p-4 lg:p-6 pb-28 lg:pb-8 space-y-4">
          <div className="hidden lg:block mb-4">
            <h1 className="text-2xl font-bold">{currentRoom.name}</h1>
            <p className="text-muted-foreground text-sm">
              {currentRoom.key === "unit_supplies" ? t("supplyChecklistDesc") : `${(currentRoom.enhancedItems || currentRoom.items).length} ${t("items")} — ${t("photoRequired")}`}
            </p>
          </div>

          {currentRoom.key === "unit_supplies" ? (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Plus className="h-4 w-4 text-foreground" />
                    {t("addCustomSupply")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      placeholder={t("enterSupplyName")}
                      value={customSupplyName}
                      onChange={(e) => setCustomSupplyName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") addCustomSupply(); }}
                      data-testid="input-custom-supply"
                    />
                    <Button
                      variant="outline"
                      onClick={addCustomSupply}
                      disabled={!customSupplyName.trim()}
                      data-testid="button-add-custom-supply"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {t("add")}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package className="h-4 w-4 text-foreground" />
                    {t("supplyChecklist")}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{t("supplyChecklistDesc")}</p>
                </CardHeader>
                <CardContent className="space-y-0">
                  {supplies.items.map((supply, index) => (
                    <div
                      key={supply.id}
                      className={`flex items-center gap-3 py-3 ${index < supplies.items.length - 1 ? "border-b" : ""}`}
                      data-testid={`supply-item-${supply.id}`}
                    >
                      <Switch
                        checked={supply.verified}
                        onCheckedChange={() => toggleSupplyVerified(supply.id)}
                        data-testid={`switch-supply-${supply.id}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-medium ${supply.verified ? "text-foreground" : "text-muted-foreground"}`}>
                            {supply.name}
                          </span>
                          {supply.verified && (
                            <Badge variant="outline" className="text-[10px] border-blue-400 text-blue-600 dark:border-blue-500 dark:text-blue-400">
                              {t("verified")}
                            </Badge>
                          )}
                          {supply.isCustom && (
                            <Badge variant="secondary" className="text-[10px]">{t("custom")}</Badge>
                          )}
                        </div>
                        {supply.minLabel && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">{supply.minLabel}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateSupplyCount(supply.id, supply.count - 1)}
                          disabled={supply.count <= 0}
                          data-testid={`button-supply-minus-${supply.id}`}
                        >
                          <span className="text-sm font-bold">−</span>
                        </Button>
                        <span className="w-8 text-center text-sm font-medium tabular-nums" data-testid={`text-supply-count-${supply.id}`}>
                          {supply.count}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateSupplyCount(supply.id, supply.count + 1)}
                          data-testid={`button-supply-plus-${supply.id}`}
                        >
                          <span className="text-sm font-bold">+</span>
                        </Button>
                      </div>
                      {supply.isCustom && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => removeCustomSupply(supply.id)}
                          data-testid={`button-supply-remove-${supply.id}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Camera className="h-4 w-4 text-foreground" />
                    {t("stockedSuppliesPhoto")}
                    <span className="text-destructive text-xs">*{t("required")}</span>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{t("stockedSuppliesPhotoDesc")}</p>
                </CardHeader>
                <CardContent>
                  <input
                    ref={suppliesPhotoRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleSuppliesPhoto}
                    data-testid="input-supplies-photo"
                  />
                  {supplies.photo ? (
                    <div className="relative">
                      <img
                        src={supplies.photo.url}
                        alt="Stocked supplies"
                        className="w-full rounded-md object-cover max-h-[300px]"
                        data-testid="img-supplies-photo"
                      />
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={() => suppliesPhotoRef.current?.click()}
                          data-testid="button-retake-supplies-photo"
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={removeSuppliesPhoto}
                          data-testid="button-remove-supplies-photo"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => suppliesPhotoRef.current?.click()}
                      className="w-full border-2 border-dashed rounded-md p-8 flex flex-col items-center gap-3 hover-elevate transition-colors"
                      data-testid="button-take-supplies-photo"
                    >
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">{t("takeOrUploadPhoto")}</p>
                        <p className="text-xs text-muted-foreground">{t("showAllStockedSupplies")}</p>
                      </div>
                    </button>
                  )}
                </CardContent>
              </Card>

              <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
                {isSuppliesComplete() ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-chart-2 flex-shrink-0" />
                    <span className="text-sm text-chart-2 font-medium">{t("allSuppliesVerified")}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">
                      {supplies.items.filter(s => s.verified).length}/{supplies.items.length} {t("suppliesVerifiedCount")}
                      {!supplies.photo && ` · ${t("photoRequired")}`}
                    </span>
                  </>
                )}
              </div>
            </div>
          ) : currentRoom.enhancedItems && currentRoom.enhancedItems.length > 0 ? (
            currentRoom.enhancedItems.map((item) => {
              const response = (responses[currentRoom.key]?.[item.key] || {}) as EnhancedItemResponse;
              return (
                <EnhancedChecklistItem
                  key={item.key}
                  item={item}
                  roomKey={currentRoom.key}
                  response={response}
                  onChange={(data) => updateItemResponse(currentRoom.key, item.key, data)}
                  highlightIncomplete={highlightIncomplete}
                />
              );
            })
          ) : (
            currentRoom.items.map((item) => {
              const response = responses[currentRoom.key]?.[item.key] || {};
              return (
                <ChecklistItem
                  key={item.key}
                  item={item}
                  roomKey={currentRoom.key}
                  value={response.result as ChecklistResult | undefined}
                  notes={response.notes}
                  severity={response.severity}
                  media={response.media}
                  onChange={(data) => updateItemResponse(currentRoom.key, item.key, data)}
                  inspectionType="FULL_INSPECTION"
                />
              );
            })
          )}
        </main>

        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-50">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={currentRoomIndex === 0}
              onClick={() => handleNavigateToRoom(currentRoomIndex - 1)}
              data-testid="button-prev"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("previous")}
            </Button>
            {currentRoomIndex < rooms.length - 1 ? (
              <Button
                className="flex-1"
                onClick={() => handleNavigateToRoom(currentRoomIndex + 1)}
                data-testid="button-next"
              >
                {t("nextRoom")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                className="flex-1"
                variant={canSubmit ? "default" : "outline"}
                onClick={handleSubmit}
                disabled={isSubmitting}
                data-testid="button-submit"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("submitting")}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {t("submitInspection")}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("leaveInspection")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("progressSaved")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("continueInspection")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => setLocation("/home")}>
              {t("saveAndExit")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Incomplete Rooms
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>The following rooms have items that still need to be completed:</p>
                <ul className="space-y-2 max-h-[300px] overflow-y-auto">
                  {validationErrors.map((error, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">Incomplete items are highlighted in each room.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction data-testid="button-close-validation">
              {t("gotIt")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
