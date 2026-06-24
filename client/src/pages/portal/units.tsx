import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Building2,
  Search,
  Loader2,
  LinkIcon,
  ArrowRight,
  Eye,
  Calendar,
  Wifi,
  Car,
  FileText,
  Shield,
  Thermometer,
  ClipboardList,
  Bed,
  Building,
  User2,
  Mail,
  Check,
  UserPlus,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Unit, OwnerOnboarding } from "@shared/schema";

function getOnboardingSections(responses: Record<string, any>, propertyType: string | null) {
  const sections = [
    {
      key: "scheduling",
      title: "Scheduling",
      icon: Calendar,
      items: [
        { label: "Available Dates", value: (responses.scheduling_dates || []).map((d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })) },
        { label: "Time Windows", value: (responses.scheduling_timeSlots || []).map((s: any) => ({ date: new Date(s.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), windows: s.timeWindows || [] })) },
      ],
    },
    {
      key: "bedrooms",
      title: "Bedrooms & Linens",
      icon: Bed,
      items: [
        { label: "Bedroom Count", value: responses.bedroom_count },
        { label: "Notes", value: responses.linens_notes },
      ],
    },
    {
      key: "wifi",
      title: "WiFi",
      icon: Wifi,
      items: [
        { label: "Network (SSID)", value: responses.wifi_ssid },
        { label: "Password", value: responses.wifi_password },
        { label: "Provider", value: responses.wifi_provider },
        { label: "Account #", value: responses.wifi_account },
        { label: "Modem Location", value: responses.wifi_modem_location },
      ],
    },
    {
      key: "building",
      title: "Building & Stay",
      icon: Building,
      items: [
        { label: "Minimum Stay", value: responses.minimum_stay },
        { label: "Selling Points", value: responses.selling_points },
      ],
    },
    {
      key: "access",
      title: "Access & Parking",
      icon: Car,
      items: [
        { label: "Mailbox Access", value: responses.mailbox_access },
        { label: "Parking Info", value: responses.parking_info },
      ],
    },
    {
      key: "instructions",
      title: "Special Instructions",
      icon: FileText,
      items: [
        { label: "Instructions", value: responses.special_instructions },
        { label: "Building Management", value: responses.building_management_contact },
      ],
    },
    {
      key: "ac",
      title: "AC & Smoke Detectors",
      icon: Shield,
      items: [
        { label: "AC Filter Location", value: responses.ac_filter_location },
        { label: "AC Filter Qty", value: responses.ac_filter_quantity },
        { label: "Smoke Detector Locations", value: responses.smoke_detector_locations },
        { label: "Smoke Detector Qty", value: responses.smoke_detector_quantity },
        { label: "Smoke Detector Type", value: responses.smoke_detector_type },
        { label: "Installation Company", value: responses.smoke_detector_company },
      ],
    },
    {
      key: "thermostat",
      title: "Thermostat & Fusebox",
      icon: Thermometer,
      items: [
        { label: "Thermostat Location", value: responses.thermostat_location },
        { label: "Thermostat Notes", value: responses.thermostat_notes },
        { label: "Fusebox Location", value: responses.fusebox_location },
      ],
    },
    {
      key: "warranty",
      title: "Warranty",
      icon: ClipboardList,
      items: [
        { label: "Has Warranty", value: responses.has_warranty },
        { label: "Details", value: responses.warranty_details },
      ],
    },
  ];

  if (propertyType === "HOUSE") {
    sections.push({
      key: "bins",
      title: "Bins Service",
      icon: Trash2,
      items: [
        { label: "Number of Bins", value: responses.bins_count },
        { label: "Service Confirmed", value: responses.bins_confirm },
      ],
    });
  }

  return sections;
}

function hasValue(val: any): boolean {
  return val !== undefined && val !== null && val !== "" && !(Array.isArray(val) && val.length === 0);
}

function OnboardingResponsePreview({ onboarding }: { onboarding: OwnerOnboarding }) {
  const responses = (onboarding.responses || {}) as Record<string, any>;
  const sections = getOnboardingSections(responses, onboarding.propertyType ?? null);

  const totalSections = sections.length;
  const filledSections = sections.filter((s) => s.items.some((i) => hasValue(i.value)));
  const filledCount = filledSections.length;
  const progressPercent = totalSections > 0 ? Math.round((filledCount / totalSections) * 100) : 0;

  const keyHighlights: { label: string; value: string }[] = [];
  if (hasValue(responses.wifi_ssid)) keyHighlights.push({ label: "WiFi", value: responses.wifi_ssid });
  if (hasValue(responses.bedroom_count)) keyHighlights.push({ label: "Bedrooms", value: String(responses.bedroom_count) });
  if (hasValue(responses.parking_info)) keyHighlights.push({ label: "Parking", value: responses.parking_info.length > 40 ? responses.parking_info.slice(0, 40) + "..." : responses.parking_info });
  if (hasValue(responses.thermostat_location)) keyHighlights.push({ label: "Thermostat", value: responses.thermostat_location });
  if (hasValue(responses.minimum_stay)) keyHighlights.push({ label: "Min Stay", value: responses.minimum_stay });
  const scheduleDates = responses.scheduling_dates || [];
  if (scheduleDates.length > 0) keyHighlights.push({ label: "Dates", value: `${scheduleDates.length} available` });

  return (
    <div className="space-y-3" data-testid={`onboarding-response-preview-${onboarding.id}`}>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs text-muted-foreground font-medium">
              {filledCount} of {totalSections} sections completed
            </span>
            <span className="text-xs font-semibold text-muted-foreground">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-1.5" data-testid={`progress-bar-${onboarding.id}`} />
        </div>
      </div>

      {keyHighlights.length > 0 && (
        <div className="flex flex-wrap gap-1.5" data-testid={`response-highlights-${onboarding.id}`}>
          {keyHighlights.slice(0, 4).map((h) => (
            <Badge key={h.label} variant="outline" className="text-xs font-normal">
              <span className="text-muted-foreground mr-1">{h.label}:</span>
              {h.value}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function OwnerResponsesDialog({ onboarding, open, onClose }: { onboarding: OwnerOnboarding; open: boolean; onClose: () => void }) {
  const responses = (onboarding.responses || {}) as Record<string, any>;
  const sections = getOnboardingSections(responses, onboarding.propertyType ?? null);
  const filledSections = sections.filter((s) => s.items.some((i) => hasValue(i.value)));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Owner Questionnaire Responses</DialogTitle>
          <DialogDescription>
            Submitted by {onboarding.ownerName || "Unknown"} — {onboarding.status === "COMPLETED" ? "Completed" : onboarding.status === "IN_PROGRESS" ? "In Progress" : "Pending"}
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          {filledSections.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No responses submitted yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="owner-responses-grid">
              {filledSections.map((section) => {
                const SectionIcon = section.icon;
                const filledItems = section.items.filter((i) => hasValue(i.value));
                return (
                  <Card key={section.key} className="p-4" data-testid={`response-card-${section.key}`}>
                    <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b">
                      <div className="flex items-center justify-center h-8 w-8 rounded-md bg-teal-500/10 dark:bg-teal-400/10 shrink-0">
                        <SectionIcon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      </div>
                      <h4 className="text-sm font-semibold">{section.title}</h4>
                    </div>
                    <div className="space-y-2.5">
                      {section.key === "scheduling" ? (
                        <>
                          {filledItems.map((item) => (
                            <div key={item.label} data-testid={`response-item-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
                              <p className="text-xs text-muted-foreground mb-1.5">{item.label}</p>
                              {item.label === "Available Dates" && Array.isArray(item.value) ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {(item.value as string[]).map((date, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs font-medium px-2.5 py-1" data-testid={`date-chip-${i}`}>
                                      <Calendar className="w-3 h-3 mr-1 opacity-60" />
                                      {date}
                                    </Badge>
                                  ))}
                                </div>
                              ) : item.label === "Time Windows" && Array.isArray(item.value) ? (
                                <div className="space-y-2">
                                  {(item.value as { date: string; windows: string[] }[]).map((slot, i) => (
                                    <div key={i} className="rounded-lg border bg-muted/30 p-2.5" data-testid={`time-slot-${i}`}>
                                      <p className="text-xs font-semibold mb-1.5">{slot.date}</p>
                                      <div className="flex flex-wrap gap-1">
                                        {slot.windows.length > 0 ? slot.windows.map((w, wi) => (
                                          <Badge key={wi} variant="outline" className="text-xs font-normal">{w}</Badge>
                                        )) : (
                                          <span className="text-xs text-muted-foreground italic">None selected</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm font-medium break-words">{String(item.value)}</p>
                              )}
                            </div>
                          ))}
                        </>
                      ) : (
                        filledItems.map((item) => (
                          <div key={item.label} data-testid={`response-item-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
                            <p className="text-xs text-muted-foreground mb-0.5">{item.label}</p>
                            <p className="text-sm font-medium break-words">{String(item.value)}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Show unfilled sections summary */}
          {filledSections.length > 0 && filledSections.length < sections.length && (
            <div className="mt-4 pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-2">Not yet completed:</p>
              <div className="flex flex-wrap gap-1.5">
                {sections
                  .filter((s) => !s.items.some((i) => hasValue(i.value)))
                  .map((s) => (
                    <Badge key={s.key} variant="secondary" className="text-xs">{s.title}</Badge>
                  ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function UnitsPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [formData, setFormData] = useState({
    propertyName: "",
    unitNumber: "",
    address: "",
    notes: "",
    unitStatus: "ONBOARDING" as "ONBOARDING" | "ACTIVE",
  });

  const [viewResponsesOnboarding, setViewResponsesOnboarding] = useState<OwnerOnboarding | null>(null);
  const [editingOwnerUnitId, setEditingOwnerUnitId] = useState<string | null>(null);
  const [ownerNameInput, setOwnerNameInput] = useState("");
  const [ownerEmailInput, setOwnerEmailInput] = useState("");

  const { data: units, isLoading } = useQuery<Unit[]>({
    queryKey: ["/api/units"],
  });

  const { data: allOnboardings } = useQuery<OwnerOnboarding[]>({
    queryKey: ["/api/owner-onboardings"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/units", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      toast({ title: "Unit Created", description: "The unit has been added successfully." });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      return apiRequest("PATCH", `/api/units/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      toast({ title: "Unit Updated", description: "The unit has been updated successfully." });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/units/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      toast({ title: "Unit Deleted", description: "The unit has been removed." });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const assignOwnerMutation = useMutation({
    mutationFn: async (data: { unitId: string; ownerName: string; ownerEmail: string }) => {
      const res = await apiRequest("POST", `/api/units/${data.unitId}/assign-owner`, {
        ownerName: data.ownerName,
        ownerEmail: data.ownerEmail,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner-onboardings"] });
      setEditingOwnerUnitId(null);
      setOwnerNameInput("");
      setOwnerEmailInput("");
      toast({ title: "Owner assigned", description: "Owner account created and onboarding started." });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const moveToActiveMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/units/${id}`, { unitStatus: "ACTIVE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      toast({ title: "Unit moved to Active", description: "The unit is now in the active section." });
    },
  });

  const filteredUnits = units?.filter(
    (unit) =>
      unit.propertyName.toLowerCase().includes(search.toLowerCase()) ||
      unit.unitNumber.toLowerCase().includes(search.toLowerCase()) ||
      unit.address.toLowerCase().includes(search.toLowerCase())
  );

  const onboardingUnits = filteredUnits?.filter((u) => u.unitStatus === "ONBOARDING") || [];

  const getOnboardingsForUnit = (unitId: string) => {
    return allOnboardings?.filter((o) => o.unitId === unitId) || [];
  };

  const handleOpenDialog = (unit?: Unit) => {
    if (unit) {
      setEditingUnit(unit);
      setFormData({
        propertyName: unit.propertyName,
        unitNumber: unit.unitNumber,
        address: unit.address,
        notes: unit.notes || "",
        unitStatus: (unit.unitStatus as "ONBOARDING" | "ACTIVE") || "ACTIVE",
      });
    } else {
      setEditingUnit(null);
      setFormData({ propertyName: "", unitNumber: "", address: "", notes: "", unitStatus: "ONBOARDING" });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingUnit(null);
    setFormData({ propertyName: "", unitNumber: "", address: "", notes: "", unitStatus: "ONBOARDING" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUnit) {
      updateMutation.mutate({ id: editingUnit.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Units</h1>
          <p className="text-muted-foreground">Manage property units</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              placeholder="Search units..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64"
              data-testid="input-search"
            />
          </div>
          <Button onClick={() => handleOpenDialog()} data-testid="button-add-unit" className="shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Add Unit</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Onboarding Units Section */}
          <section data-testid="section-onboarding-units">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center h-8 w-8 rounded-md bg-amber-500/10 dark:bg-amber-400/10 shrink-0">
                <LinkIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold" data-testid="text-onboarding-heading">Onboarding Units</h2>
                <p className="text-xs text-muted-foreground">New units being set up — send the owner questionnaire before inspection</p>
              </div>
              <Badge variant="secondary" className="ml-auto">{onboardingUnits.length}</Badge>
            </div>

            {onboardingUnits.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Building2 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">No units being onboarded</p>
                  <p className="text-xs text-muted-foreground mt-1">Add a new unit to start the onboarding process</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {onboardingUnits.map((unit) => {
                  const unitOnboardings = getOnboardingsForUnit(unit.id);
                  const latestOnboarding = unitOnboardings.length > 0 ? unitOnboardings[0] : null;
                  const hasOwner = !!(unit as any).ownerEmail;
                  const isEditingOwner = editingOwnerUnitId === unit.id;
                  return (
                    <Card key={unit.id} data-testid={`onboarding-unit-card-${unit.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => setLocation(`/pm/unit/${unit.id}`)}
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold" data-testid={`text-unit-name-${unit.id}`}>{unit.propertyName}</span>
                              <Badge variant="outline" data-testid={`badge-unit-number-${unit.id}`}>Unit {unit.unitNumber}</Badge>
                              <Badge variant="secondary">Onboarding</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{unit.address}</p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => moveToActiveMutation.mutate(unit.id)}
                              disabled={moveToActiveMutation.isPending}
                              data-testid={`button-move-active-${unit.id}`}
                            >
                              <ArrowRight className="h-3.5 w-3.5 sm:mr-1.5" />
                              <span className="hidden sm:inline">Move to Active</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); handleOpenDialog(unit); }}
                              data-testid={`button-edit-${unit.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(unit.id); }}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-${unit.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        {/* Owner Info Section */}
                        <div className="mt-3 pt-3 border-t">
                          {hasOwner && !isEditingOwner ? (
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-8 w-8 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
                                  <User2 className="h-4 w-4 text-teal-600" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate" data-testid={`text-owner-name-${unit.id}`}>
                                    {(unit as any).ownerName || "Owner"}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate" data-testid={`text-owner-email-${unit.id}`}>
                                    {(unit as any).ownerEmail}
                                  </p>
                                </div>
                                <Badge variant="outline" className="text-xs flex-shrink-0">
                                  <Check className="h-3 w-3 mr-1 text-green-500" />
                                  Assigned
                                </Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingOwnerUnitId(unit.id);
                                  setOwnerNameInput((unit as any).ownerName || "");
                                  setOwnerEmailInput((unit as any).ownerEmail || "");
                                }}
                                className="text-xs"
                                data-testid={`button-edit-owner-${unit.id}`}
                              >
                                <Pencil className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                            </div>
                          ) : isEditingOwner ? (
                            <div className="space-y-2.5">
                              <div className="flex items-center gap-2">
                                <UserPlus className="h-4 w-4 text-teal-600 flex-shrink-0" />
                                <span className="text-sm font-medium">
                                  {hasOwner ? "Edit Owner" : "Assign Owner"}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="relative">
                                  <User2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                  <Input
                                    value={ownerNameInput}
                                    onChange={(e) => setOwnerNameInput(e.target.value)}
                                    placeholder="Owner name"
                                    className="h-9 text-sm pl-8"
                                    data-testid={`input-owner-name-${unit.id}`}
                                  />
                                </div>
                                <div className="relative">
                                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                  <Input
                                    value={ownerEmailInput}
                                    onChange={(e) => setOwnerEmailInput(e.target.value)}
                                    placeholder="owner@email.com"
                                    type="email"
                                    className="h-9 text-sm pl-8"
                                    data-testid={`input-owner-email-${unit.id}`}
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-2 justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingOwnerUnitId(null);
                                    setOwnerNameInput("");
                                    setOwnerEmailInput("");
                                  }}
                                  className="text-xs h-8"
                                  data-testid={`button-cancel-owner-${unit.id}`}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    assignOwnerMutation.mutate({
                                      unitId: unit.id,
                                      ownerName: ownerNameInput.trim(),
                                      ownerEmail: ownerEmailInput.trim(),
                                    });
                                  }}
                                  disabled={assignOwnerMutation.isPending || !ownerEmailInput.trim()}
                                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8"
                                  data-testid={`button-save-owner-${unit.id}`}
                                >
                                  {assignOwnerMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <Check className="h-3 w-3 mr-1" />
                                  )}
                                  {hasOwner ? "Update" : "Assign & Create Account"}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <button
                              className="flex items-center gap-2 w-full p-2 rounded-lg border border-dashed border-gray-200 hover:border-teal-300 hover:bg-teal-50/30 transition-colors text-left"
                              onClick={() => {
                                setEditingOwnerUnitId(unit.id);
                                setOwnerNameInput("");
                                setOwnerEmailInput("");
                              }}
                              data-testid={`button-assign-owner-${unit.id}`}
                            >
                              <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <UserPlus className="h-4 w-4 text-gray-400" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-600">Assign Owner</p>
                                <p className="text-xs text-muted-foreground">Add owner's name and email to start onboarding</p>
                              </div>
                            </button>
                          )}
                        </div>

                        {/* Questionnaire Status */}
                        {latestOnboarding && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Questionnaire</span>
                                <Badge
                                  variant={latestOnboarding.status === "COMPLETED" ? "default" : latestOnboarding.status === "IN_PROGRESS" ? "secondary" : "outline"}
                                  data-testid={`badge-questionnaire-status-${unit.id}`}
                                >
                                  {latestOnboarding.status === "COMPLETED" ? "Completed" : latestOnboarding.status === "IN_PROGRESS" ? "In Progress" : "Pending"}
                                </Badge>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setViewResponsesOnboarding(latestOnboarding)}
                                data-testid={`button-view-responses-${latestOnboarding.id}`}
                              >
                                <Eye className="h-3.5 w-3.5 sm:mr-1.5" />
                                <span className="hidden sm:inline">View Responses</span>
                              </Button>
                            </div>
                            <div className="mt-2">
                              <OnboardingResponsePreview onboarding={latestOnboarding} />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

        </>
      )}

      {/* Add/Edit Unit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUnit ? "Edit Unit" : "Add Unit"}</DialogTitle>
            <DialogDescription>
              {editingUnit ? "Update the unit details below." : "Fill in the details to add a new unit."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="propertyName">Property Name *</Label>
              <Input
                id="propertyName"
                value={formData.propertyName}
                onChange={(e) => setFormData({ ...formData, propertyName: e.target.value })}
                required
                data-testid="input-property-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitNumber">Unit Number *</Label>
              <Input
                id="unitNumber"
                value={formData.unitNumber}
                onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
                required
                data-testid="input-unit-number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
                data-testid="input-address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitStatus">Unit Type</Label>
              <Select
                value={formData.unitStatus}
                onValueChange={(val) => setFormData({ ...formData, unitStatus: val as "ONBOARDING" | "ACTIVE" })}
              >
                <SelectTrigger data-testid="select-unit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONBOARDING">Onboarding (New unit)</SelectItem>
                  <SelectItem value="ACTIVE">Active (Regular unit)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                data-testid="input-notes"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-save">
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingUnit ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Responses Dialog */}
      {viewResponsesOnboarding && (
        <OwnerResponsesDialog
          onboarding={viewResponsesOnboarding}
          open={!!viewResponsesOnboarding}
          onClose={() => setViewResponsesOnboarding(null)}
        />
      )}
    </div>
  );
}
