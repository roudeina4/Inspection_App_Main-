import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Check,
  Download,
  ExternalLink,
  Link2,
  Copy,
  Pencil,
  Trash2,
  Play,
  Image,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Eye,
  MessageSquare,
  Send,
  Loader2,
  Package,
  Plus,
  X,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  SkipForward,
  Search,
} from "lucide-react";
import type {
  InspectionTask,
  Unit,
  ChecklistResponse,
  Media,
  InspectionTemplate,
  TemplateRoom,
  IssueCategory,
  OwnerReport,
  OwnerReportItem,
  OwnerReportBundle,
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { StructuredDescription } from "@/components/structured-description";

const OWNER_RESPONSE_LABELS: Record<string, { label: string; color: string }> = {
  LEAVE_AS_IS: { label: "Leave as is", color: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300" },
  ILL_REPLACE: { label: "Owner will replace", color: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" },
  PLEASE_FIX: { label: "Please fix", color: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" },
  PROCEED_PURCHASE: { label: "Proceed with purchase", color: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" },
};

function OwnerResponseBadge({ item }: { item: OwnerReportItem }) {
  if (!item.ownerResponse) return null;
  const info = OWNER_RESPONSE_LABELS[item.ownerResponse];
  if (!info) return null;
  return (
    <div className="mt-1 space-y-1">
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${info.color}`} data-testid={`badge-owner-response-${item.id}`}>
        <CheckCircle2 className="w-3 h-3" />
        Owner: {info.label}
      </span>
      {item.ownerComment && (
        <p className="text-xs text-muted-foreground italic pl-1" data-testid={`text-owner-comment-pm-${item.id}`}>
          "{item.ownerComment}"
        </p>
      )}
    </div>
  );
}

interface InspectorInfo {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface InspectionDetails {
  task: InspectionTask;
  unit: Unit | null;
  responses: ChecklistResponse[];
  media: Media[];
  inspector: InspectorInfo | null;
  pm: InspectorInfo | null;
  template: InspectionTemplate | null;
}

interface OwnerReportData {
  report: OwnerReport;
  items: OwnerReportItem[];
  categories?: IssueCategory[];
}

export function OwnerReportBuilderContent({ inspectionId, initialTab = "review", embedded = false, splitView = false }: { inspectionId: string; initialTab?: "review" | "report" | "responses"; embedded?: boolean; splitView?: boolean }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  const [reviewCardIndex, setReviewCardIndex] = useState(0);
  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewSearchOpen, setReviewSearchOpen] = useState(false);
  const [editItemDialog, setEditItemDialog] = useState<OwnerReportItem | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editRepairQuote, setEditRepairQuote] = useState("");
  const [editEstimatedCostMin, setEditEstimatedCostMin] = useState("");
  const [editEstimatedCostMax, setEditEstimatedCostMax] = useState("");
  const [editPriority, setEditPriority] = useState<"HIGH" | "LOWER">("LOWER");
  const [linkCopied, setLinkCopied] = useState(false);
  const [showOwnerResponses, setShowOwnerResponses] = useState(false);

  const [quotePreset, setQuotePreset] = useState("custom");
  const [addServiceFee, setAddServiceFee] = useState(false);
  const [partName, setPartName] = useState("");
  const [partPrice, setPartPrice] = useState("");
  const [partLink, setPartLink] = useState("");

  const [editVendorName, setEditVendorName] = useState("");
  const [editVendorLink, setEditVendorLink] = useState("");
  const [editItemPrice, setEditItemPrice] = useState("");
  const [editHandymanQuoteType, setEditHandymanQuoteType] = useState<"fixed" | "range">("fixed");
  const [editHandymanFixed, setEditHandymanFixed] = useState("");
  const [editHandymanMin, setEditHandymanMin] = useState("");
  const [editHandymanMax, setEditHandymanMax] = useState("");
  const [editPmOwnerNote, setEditPmOwnerNote] = useState("");
  const [editVendorServiceFee, setEditVendorServiceFee] = useState(false);
  const [editRepairOptions, setEditRepairOptions] = useState<{ id: string; label: string; vendor?: string; cost: string; description?: string }[]>([]);

  const [repairTypeChooser, setRepairTypeChooser] = useState<{
    itemId: string;
    item: OwnerReportItem;
  } | null>(null);

  const QUOTE_PRESETS = [
    { value: "plumber_unclog", label: "Plumber — Unclogging", quote: "Plumber unclogging service: $250 +HST", quoteFee: "Plumber unclogging service: $300 +HST" },
    { value: "plumber_inspect", label: "Plumber — Inspection & Repair", quote: "Plumber inspection fee: $100. If fixable on the spot: $200–$300 +HST", quoteFee: "Plumber inspection fee: $150. If fixable on the spot: $250–$350 +HST" },
    { value: "technician", label: "Technician — Appliance", quote: "Technician appliance inspection fee: $100. If fixable on the spot: $200–$250 (inspection fee waived) +HST", quoteFee: "Technician appliance inspection fee: $150. If fixable on the spot: $250–$300 (inspection fee waived) +HST" },
    { value: "handyman_quote", label: "Handyman — Quote Needed", quote: "Handyman will provide a quote after reviewing photos of the issues +HST", quoteFee: "Handyman will provide a quote after reviewing photos (includes $50 service fee) +HST" },
    { value: "small_jobs", label: "Small Handyman Jobs", quote: "Small handyman jobs: $45/hr (min 2 hours) +HST", quoteFee: "Small handyman jobs: $45/hr (min 2 hours). Total with service fee: $140 +HST" },
    { value: "custom", label: "Custom", quote: "", quoteFee: "" },
  ];

  const buildQuoteText = (preset: string, serviceFee: boolean, pName: string, pPrice: string, pLink: string) => {
    const found = QUOTE_PRESETS.find((p) => p.value === preset);
    if (!found || preset === "custom") return "";

    const base = serviceFee ? found.quoteFee : found.quote;

    if (preset === "small_jobs" && (pName || pPrice || pLink)) {
      let partText = "Part needed:";
      if (pName) partText += ` ${pName}`;
      if (pPrice) partText += ` ($${pPrice})`;
      if (pLink) partText += ` — ${pLink}`;
      return base.replace(" +HST", `. ${partText} +HST`);
    }

    return base;
  };

  const extractCostFromPreset = (preset: string, serviceFee: boolean): string => {
    const costs: Record<string, number> = {
      plumber_unclog: 250,
      plumber_inspect: 300,
      technician: 250,
      small_jobs: 90,
    };
    const base = costs[preset];
    if (!base) return "";
    const total = serviceFee ? base + 50 : base;
    return String(total);
  };

  const handlePresetChange = (preset: string) => {
    setQuotePreset(preset);
    if (preset !== "custom") {
      if (preset !== "small_jobs") {
        setPartName("");
        setPartPrice("");
        setPartLink("");
      }
      const text = buildQuoteText(preset, addServiceFee, preset === "small_jobs" ? partName : "", preset === "small_jobs" ? partPrice : "", preset === "small_jobs" ? partLink : "");
      setEditRepairQuote(text);
      const cost = extractCostFromPreset(preset, addServiceFee);
      setEditEstimatedCostMin(cost);
      setEditEstimatedCostMax("");
    } else {
      setEditEstimatedCostMin("");
      setEditEstimatedCostMax("");
    }
  };

  const handleServiceFeeToggle = (checked: boolean) => {
    setAddServiceFee(checked);
    if (quotePreset !== "custom") {
      const text = buildQuoteText(quotePreset, checked, partName, partPrice, partLink);
      setEditRepairQuote(text);
      const cost = extractCostFromPreset(quotePreset, checked);
      if (cost) {
        setEditEstimatedCostMin(cost);
        setEditEstimatedCostMax("");
      }
    }
  };

  const handlePartFieldChange = (field: "name" | "price" | "link", value: string) => {
    const newName = field === "name" ? value : partName;
    const newPrice = field === "price" ? value : partPrice;
    const newLink = field === "link" ? value : partLink;
    if (field === "name") setPartName(value);
    if (field === "price") setPartPrice(value);
    if (field === "link") setPartLink(value);
    if (quotePreset === "small_jobs") {
      const text = buildQuoteText("small_jobs", addServiceFee, newName, newPrice, newLink);
      setEditRepairQuote(text);
    }
  };

  const { data: details, isLoading: detailsLoading } = useQuery<InspectionDetails>({
    queryKey: ["/api/inspection-tasks", inspectionId, "details"],
    enabled: !!inspectionId,
  });

  const { data: categories = [] } = useQuery<IssueCategory[]>({
    queryKey: ["/api/issue-categories"],
  });

  const { data: reportData, isLoading: reportLoading } = useQuery<OwnerReportData>({
    queryKey: ["/api/owner-reports/by-inspection", inspectionId],
    enabled: !!inspectionId,
    retry: false,
  });

  const createReportMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/owner-reports", { inspectionTaskId: inspectionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner-reports/by-inspection", inspectionId] });
    },
  });

  useEffect(() => {
    if (inspectionId && !reportLoading && !reportData && !createReportMutation.isPending) {
      createReportMutation.mutate();
    }
  }, [inspectionId, reportLoading, reportData]);

  const report = reportData?.report;
  const reportItems = reportData?.items || [];

  const { data: bundles = [] } = useQuery<OwnerReportBundle[]>({
    queryKey: ["/api/owner-reports", report?.id, "bundles"],
    enabled: !!report?.id,
  });

  const BUNDLE_PRESETS = [
    { value: "small_handyman", label: "Small Job Handyman Services", quotes: ["Small handyman jobs: $45/hr (min 2 hours) +HST"] },
    { value: "big_handyman", label: "Big Job Handyman Services", quotes: ["Handyman will provide a quote after reviewing photos of the issues +HST"] },
    { value: "plumbing", label: "Plumbing Repairs", quotes: ["Plumber unclogging service: $250 +HST", "Plumber inspection fee: $100. If fixable on the spot: $200–$300 +HST"] },
    { value: "technician", label: "Technician Repairs", quotes: ["Technician appliance inspection fee: $100. If fixable on the spot: $200–$250 (inspection fee waived) +HST"] },
    { value: "custom", label: "Custom", quotes: [] },
  ];

  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [mobileSplitTab, setMobileSplitTab] = useState<"review" | "report">("review");
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const highlightedItemRef = useRef<HTMLDivElement>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerHighlight = useCallback((itemId: string) => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setHighlightedItemId(itemId);
    highlightTimerRef.current = setTimeout(() => setHighlightedItemId(null), 1500);
  }, []);

  const toggleSection = useCallback((sectionName: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionName)) next.delete(sectionName);
      else next.add(sectionName);
      return next;
    });
  }, []);

  useEffect(() => {
    if (highlightedItemId && highlightedItemRef.current) {
      highlightedItemRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [highlightedItemId, reportItems]);

  const [bundleDialogOpen, setBundleDialogOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<OwnerReportBundle | null>(null);
  const [bundleTypePreset, setBundleTypePreset] = useState("");
  const [bundleName, setBundleName] = useState("");
  const [bundleCostMin, setBundleCostMin] = useState("");
  const [bundleCostMax, setBundleCostMax] = useState("");
  const [bundleCategoryId, setBundleCategoryId] = useState("");
  const [bundleRepairQuote, setBundleRepairQuote] = useState("");
  const [bundleSelectedItems, setBundleSelectedItems] = useState<string[]>([]);

  const createBundleMutation = useMutation({
    mutationFn: async (data: { name: string; estimatedCost: string | null; repairQuote: string | null; categoryId: string | null; itemIds: string[] }) => {
      return apiRequest("POST", `/api/owner-reports/${report!.id}/bundles`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner-reports", report?.id, "bundles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner-reports/by-inspection", inspectionId] });
      setBundleDialogOpen(false);
      resetBundleForm();
      toast({ title: "Bundle created" });
    },
  });

  const updateBundleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest("PATCH", `/api/owner-reports/${report!.id}/bundles/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner-reports", report?.id, "bundles"] });
      setBundleDialogOpen(false);
      setEditingBundle(null);
      resetBundleForm();
      toast({ title: "Bundle updated" });
    },
  });

  const deleteBundleMutation = useMutation({
    mutationFn: async (bundleId: string) => {
      return apiRequest("DELETE", `/api/owner-reports/${report!.id}/bundles/${bundleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner-reports", report?.id, "bundles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner-reports/by-inspection", inspectionId] });
      toast({ title: "Bundle deleted" });
    },
  });

  const addItemsToBundleMutation = useMutation({
    mutationFn: async ({ bundleId, itemIds }: { bundleId: string; itemIds: string[] }) => {
      return apiRequest("POST", `/api/owner-reports/${report!.id}/bundles/${bundleId}/items`, { itemIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner-reports", report?.id, "bundles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner-reports/by-inspection", inspectionId] });
    },
  });

  const removeItemFromBundleMutation = useMutation({
    mutationFn: async ({ bundleId, itemId }: { bundleId: string; itemId: string }) => {
      return apiRequest("DELETE", `/api/owner-reports/${report!.id}/bundles/${bundleId}/items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner-reports", report?.id, "bundles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner-reports/by-inspection", inspectionId] });
    },
  });

  const resetBundleForm = () => {
    setBundleTypePreset("");
    setBundleName("");
    setBundleCostMin("");
    setBundleCostMax("");
    setBundleCategoryId("");
    setBundleRepairQuote("");
    setBundleSelectedItems([]);
  };

  const openCreateBundleDialog = () => {
    setEditingBundle(null);
    resetBundleForm();
    setBundleDialogOpen(true);
  };

  const openEditBundleDialog = (bundle: OwnerReportBundle) => {
    setEditingBundle(bundle);
    setBundleName(bundle.name);
    const matchedPreset = BUNDLE_PRESETS.find(p => p.label.toLowerCase() === bundle.name.toLowerCase());
    setBundleTypePreset(matchedPreset ? matchedPreset.value : "custom");
    setBundleCategoryId(bundle.categoryId || "");
    setBundleRepairQuote(bundle.repairQuote || "");
    const costVal = bundle.estimatedCost || "";
    if (costVal.includes(" - ")) {
      const [min, max] = costVal.split(" - ");
      setBundleCostMin(min.trim());
      setBundleCostMax(max.trim());
    } else {
      setBundleCostMin(costVal);
      setBundleCostMax("");
    }
    const bundleItems = reportItems.filter(i => i.bundleId === bundle.id).map(i => i.id);
    setBundleSelectedItems(bundleItems);
    setBundleDialogOpen(true);
  };

  const handleBundleSave = async () => {
    const cost = bundleCostMin && bundleCostMax
      ? `${bundleCostMin} - ${bundleCostMax}`
      : bundleCostMin || bundleCostMax || null;

    if (editingBundle) {
      await updateBundleMutation.mutateAsync({ id: editingBundle.id, data: { name: bundleName, estimatedCost: cost, repairQuote: bundleRepairQuote || null, categoryId: bundleCategoryId || null } });
      const currentItems = reportItems.filter(i => i.bundleId === editingBundle.id).map(i => i.id);
      const toRemove = currentItems.filter(id => !bundleSelectedItems.includes(id));
      const toAdd = bundleSelectedItems.filter(id => !currentItems.includes(id));
      for (const itemId of toRemove) {
        await removeItemFromBundleMutation.mutateAsync({ bundleId: editingBundle.id, itemId });
      }
      if (toAdd.length > 0) {
        await addItemsToBundleMutation.mutateAsync({ bundleId: editingBundle.id, itemIds: toAdd });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/owner-reports/by-inspection", inspectionId] });
    } else {
      createBundleMutation.mutate({ name: bundleName, estimatedCost: cost, repairQuote: bundleRepairQuote || null, categoryId: bundleCategoryId || null, itemIds: bundleSelectedItems });
    }
  };

  const getBundleForItem = (itemId: string): OwnerReportBundle | undefined => {
    const item = reportItems.find(i => i.id === itemId);
    if (!item?.bundleId) return undefined;
    return bundles.find(b => b.id === item.bundleId);
  };

  const groupedByCategory = useMemo(() => {
    const grouped: Record<string, OwnerReportItem[]> = {};
    for (const item of reportItems) {
      const cat = categories.find((c) => c.id === item.categoryId);
      const catName = cat?.name || "Uncategorized";
      if (!grouped[catName]) grouped[catName] = [];
      grouped[catName].push(item);
    }
    return grouped;
  }, [reportItems, categories]);

  const highPriorityDamages = (groupedByCategory["Damage"] || []).filter((i) => i.priority === "HIGH" && !i.bundleId);
  const lowerPriorityDamages = (groupedByCategory["Damage"] || []).filter((i) => i.priority !== "HIGH" && !i.bundleId);

  const updateReportMutation = useMutation({
    mutationFn: async (data: Partial<OwnerReport>) => {
      return apiRequest("PATCH", `/api/owner-reports/${report?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner-reports/by-inspection", inspectionId] });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/owner-reports/${report?.id}/items`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner-reports/by-inspection", inspectionId] });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest("PATCH", `/api/owner-report-items/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner-reports/by-inspection", inspectionId] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/owner-report-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner-reports/by-inspection", inspectionId] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/owner-reports/${report?.id}/publish`);
    },
    onSuccess: () => {
      setPublishConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/owner-reports/by-inspection", inspectionId] });
      toast({ title: "Published to Owner Portal", description: "The owner can now view this report in their portal." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to publish", description: error.message || "Please try again.", variant: "destructive" });
    },
  });

  const isItemMissingCostInfo = (item: OwnerReportItem) => {
    const cat = categories.find(c => c.id === item.categoryId);
    if (!cat || cat.name === "Good") return { missing: false, missingQuote: false, missingCost: false };
    const isVendorCategory = cat.name === "Missing" || cat.name === "Replacement";
    if (isVendorCategory) {
      const hasVendorCost = !!(item.itemPrice || item.estimatedCost);
      return { missing: !hasVendorCost, missingQuote: false, missingCost: !hasVendorCost };
    }
    return { missing: !item.estimatedCost || !item.repairQuote, missingQuote: !item.repairQuote, missingCost: !item.estimatedCost };
  };

  const itemsMissingCostInfo = useMemo(() => {
    return reportItems.filter(item => isItemMissingCostInfo(item).missing);
  }, [reportItems, categories]);

  const handlePublishClick = () => {
    if (itemsMissingCostInfo.length > 0) {
      setPublishConfirmOpen(true);
    } else {
      publishMutation.mutate();
    }
  };

  const task = details?.task || null;
  const unit = details?.unit || null;
  const responses = details?.responses || [];
  const mediaItems = details?.media || [];
  const template = details?.template || null;

  const getRoomName = (roomKey: string) => {
    if (template?.rooms) {
      const room = (template.rooms as TemplateRoom[]).find((r) => r.key === roomKey);
      if (room) return room.name;
    }
    return roomKey.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getItemLabel = (roomKey: string, itemKey: string) => {
    if (template?.rooms) {
      const room = (template.rooms as TemplateRoom[]).find((r) => r.key === roomKey);
      if (room) {
        const item = room.items.find((i) => i.key === itemKey);
        if (item) return item.label;
      }
    }
    return itemKey.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getMediaForResponse = (responseId: string) => {
    return mediaItems.filter((m) => m.checklistResponseId === responseId);
  };

  const allResponses = responses;

  const roomGroups: Record<string, ChecklistResponse[]> = {};
  allResponses.forEach((r) => {
    if (!roomGroups[r.roomKey]) roomGroups[r.roomKey] = [];
    roomGroups[r.roomKey].push(r);
  });

  const getItemCategory = (responseId: string) => {
    return reportItems.find((ri) => ri.checklistResponseId === responseId);
  };

  const flatItems = useMemo(() => {
    const items: ChecklistResponse[] = [];
    Object.entries(roomGroups).forEach(([, roomItems]) => {
      roomItems.forEach((item) => items.push(item));
    });
    return items;
  }, [roomGroups]);

  const safeIndex = Math.min(reviewCardIndex, Math.max(0, flatItems.length - 1));

  const nextUncategorized = useMemo(() => {
    for (let i = safeIndex + 1; i < flatItems.length; i++) {
      if (!getItemCategory(flatItems[i].id)) return i;
    }
    for (let i = 0; i < safeIndex; i++) {
      if (!getItemCategory(flatItems[i].id)) return i;
    }
    return -1;
  }, [safeIndex, flatItems, reportItems]);

  const reviewSearchResults = useMemo(() => {
    if (!reviewSearch.trim()) return [];
    const q = reviewSearch.toLowerCase();
    return flatItems
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => {
        const room = getRoomName(item.roomKey).toLowerCase();
        const label = getItemLabel(item.roomKey, item.itemKey).toLowerCase();
        return room.includes(q) || label.includes(q);
      });
  }, [reviewSearch, flatItems]);

  if (!user || (user.role !== "PM" && user.role !== "ADMIN")) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Access denied. PM or Admin role required.</p>
      </div>
    );
  }

  if (detailsLoading || reportLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Inspection not found.</p>
        <Button variant="ghost" onClick={() => setLocation("/pm/dashboard")} className="mt-4" data-testid="button-back-dashboard">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const media = mediaItems;

  const handleCategorize = (response: ChecklistResponse, category: IssueCategory) => {
    const existing = getItemCategory(response.id);
    const catName = category.name;
    if (existing) {
      if (existing.categoryId === category.id) {
        deleteItemMutation.mutate(existing.id);
      } else {
        const itemId = existing.id;
        updateItemMutation.mutate({
          id: itemId,
          data: { categoryId: category.id },
        }, {
          onSuccess: () => {
            if (catName !== "Good") {
              setExpandedSections(prev => new Set(prev).add(catName));
              triggerHighlight(itemId);
            }
          }
        });
      }
    } else {
      const roomName = getRoomName(response.roomKey);
      const itemName = getItemLabel(response.roomKey, response.itemKey);
      const responseMedia = getMediaForResponse(response.id);
      const mediaUrls = responseMedia.map((m) => m.url);

      addItemMutation.mutate({
        checklistResponseId: response.id,
        categoryId: category.id,
        priority: category.name === "Damage" ? "LOWER" : "LOWER",
        roomName,
        itemName,
        description: response.notes || `${response.result?.replace(/_/g, " ")}`,
        mediaUrls,
        sortOrder: reportItems.length,
      }, {
        onSuccess: (data: any) => {
          if (catName !== "Good") {
            setExpandedSections(prev => new Set(prev).add(catName));
            const newId = data?.id || response.id;
            triggerHighlight(newId);
            const newItem = { ...data, id: newId } as OwnerReportItem;
            setRepairTypeChooser({ itemId: newId, item: newItem });
          }
        }
      });
    }
  };

  const handleRepairTypeChoice = (choice: "single" | "multiple") => {
    if (!repairTypeChooser) return;
    const freshItem = reportItems.find(ri => ri.id === repairTypeChooser.itemId) || repairTypeChooser.item;
    setRepairTypeChooser(null);
    if (choice === "multiple") {
      openEditDialog(freshItem);
      setEditRepairOptions([
        { id: crypto.randomUUID(), label: "", cost: "", vendor: "", description: "" },
        { id: crypto.randomUUID(), label: "", cost: "", vendor: "", description: "" },
      ]);
    } else {
      openEditDialog(freshItem);
    }
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case "FAIL":
        return <Badge variant="destructive" className="text-xs">Fail</Badge>;
      case "MISSING":
        return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-0 text-xs">Missing</Badge>;
      case "NEED_REPLACEMENT":
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-xs">Needs Replacement</Badge>;
      case "PASS":
      case "GOOD":
      case "YES":
        return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-xs">Pass</Badge>;
      case "NA":
        return <Badge variant="secondary" className="text-xs">N/A</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{result?.replace(/_/g, " ") || "N/A"}</Badge>;
    }
  };

  const categorizedCount = reportItems.length;
  const totalItems = allResponses.length;
  const progress = totalItems > 0 ? Math.round((categorizedCount / totalItems) * 100) : 0;

  const actionableItems = reportItems.filter((ri) => {
    const cat = categories.find((c) => c.id === ri.categoryId);
    return cat?.name !== "Good";
  });
  const ownerRespondedCount = actionableItems.filter((ri) => ri.ownerResponse).length;
  const ownerCommentedCount = actionableItems.filter((ri) => ri.ownerComment).length;
  const totalActionable = actionableItems.length;

  const shareUrl = report ? `${window.location.origin}/report/${report.shareToken}` : "";

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setLinkCopied(true);
    toast({ title: "Link copied to clipboard" });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const isVendorCategory = (item: OwnerReportItem) => {
    const cat = categories.find((c) => c.id === item.categoryId);
    return cat?.name === "Missing" || cat?.name === "Replacement";
  };

  const buildVendorEstimatedCost = () => {
    let total = 0;
    const price = parseFloat(editItemPrice);
    if (!isNaN(price)) total += price;
    if (editVendorName === "Structube") {
      if (editHandymanQuoteType === "fixed") {
        const f = parseFloat(editHandymanFixed);
        if (!isNaN(f)) total += f;
      } else {
        const mx = parseFloat(editHandymanMax);
        if (!isNaN(mx)) total += mx;
      }
    }
    if (editVendorServiceFee) total += 50;
    return total > 0 ? String(total) : "";
  };

  const buildHandymanQuoteText = () => {
    if (editVendorName !== "Structube") return "";
    let text = "Our handyman can pick up this item from Structube, install it, and dispose of the old one. His estimated quote is ";
    if (editHandymanQuoteType === "fixed") {
      text += `$${editHandymanFixed || "0"} +HST`;
    } else {
      text += `$${editHandymanMin || "0"}–$${editHandymanMax || "0"} +HST`;
    }
    return text;
  };

  const handleEditSave = () => {
    if (!editItemDialog) return;
    const isVendor = isVendorCategory(editItemDialog);
    if (isVendor) {
      const handymanQuote = buildHandymanQuoteText();
      const handymanCost = editVendorName === "Structube"
        ? (editHandymanQuoteType === "fixed" ? editHandymanFixed : editHandymanMax) || null
        : null;
      const estimatedCost = buildVendorEstimatedCost();
      updateItemMutation.mutate({
        id: editItemDialog.id,
        data: {
          description: editDescription,
          priority: editPriority,
          vendorName: editVendorName || null,
          vendorLink: editVendorLink || null,
          itemPrice: editItemPrice || null,
          handymanQuote: handymanQuote || null,
          handymanCost: handymanCost || null,
          vendorServiceFee: editVendorServiceFee,
          pmOwnerNote: editPmOwnerNote || null,
          estimatedCost: estimatedCost || null,
          repairQuote: null,
          repairOptions: editRepairOptions.length > 0 ? editRepairOptions : [],
        },
      });
    } else {
      const combinedCost = editEstimatedCostMin && editEstimatedCostMax
        ? `${editEstimatedCostMin} - ${editEstimatedCostMax}`
        : editEstimatedCostMin || editEstimatedCostMax || null;
      updateItemMutation.mutate({
        id: editItemDialog.id,
        data: {
          description: editDescription,
          repairQuote: editRepairQuote || null,
          estimatedCost: combinedCost,
          priority: editPriority,
          vendorName: null,
          vendorLink: null,
          itemPrice: null,
          handymanQuote: null,
          handymanCost: null,
          vendorServiceFee: false,
          pmOwnerNote: editPmOwnerNote || null,
          repairOptions: editRepairOptions.length > 0 ? editRepairOptions : [],
        },
      });
    }
    setEditItemDialog(null);
  };

  const openEditDialog = (item: OwnerReportItem) => {
    setEditItemDialog(item);
    setEditDescription(item.description || "");
    setEditRepairQuote(item.repairQuote || "");
    const costVal = item.estimatedCost || "";
    if (costVal.includes(" - ")) {
      const [minVal, maxVal] = costVal.split(" - ");
      setEditEstimatedCostMin(minVal.trim());
      setEditEstimatedCostMax(maxVal.trim());
    } else {
      setEditEstimatedCostMin(costVal);
      setEditEstimatedCostMax("");
    }
    setEditPriority((item.priority as "HIGH" | "LOWER") || "LOWER");
    setQuotePreset("custom");
    setAddServiceFee(false);
    setPartName("");
    setPartPrice("");
    setPartLink("");
    setEditVendorName(item.vendorName || "");
    setEditVendorLink(item.vendorLink || "");
    setEditItemPrice(item.itemPrice || "");
    setEditPmOwnerNote(item.pmOwnerNote || "");
    setEditVendorServiceFee(item.vendorServiceFee === true);
    setEditRepairOptions((item.repairOptions as any) || []);
    if (item.handymanCost) {
      const quoteText = item.handymanQuote || "";
      const hasRange = quoteText.includes("–");
      if (hasRange) {
        setEditHandymanQuoteType("range");
        const match = quoteText.match(/\$(\d+)[–-]\$(\d+)/);
        setEditHandymanMin(match?.[1] || "");
        setEditHandymanMax(match?.[2] || item.handymanCost);
      } else {
        setEditHandymanQuoteType("fixed");
        setEditHandymanFixed(item.handymanCost);
        setEditHandymanMin("");
        setEditHandymanMax("");
      }
    } else {
      setEditHandymanQuoteType("fixed");
      setEditHandymanFixed("");
      setEditHandymanMin("");
      setEditHandymanMax("");
    }
  };

  const reviewTabContent = (() => {
    if (totalItems === 0) {
      return (
        <div className="space-y-4">
          <Card className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Items Found</h3>
            <p className="text-muted-foreground">This inspection has no checklist items to review.</p>
          </Card>
        </div>
      );
    }

    const currentItem = flatItems[safeIndex];
    if (!currentItem) return null;

    const itemCat = getItemCategory(currentItem.id);
    const assignedCategory = itemCat
      ? categories.find((c) => c.id === itemCat.categoryId)
      : null;
    const responseMedia = getMediaForResponse(currentItem.id);

    return (
      <div className="space-y-4">
        <div className="relative" data-testid="review-search-container">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={reviewSearch}
              onChange={(e) => {
                setReviewSearch(e.target.value);
                setReviewSearchOpen(e.target.value.trim().length > 0);
              }}
              onFocus={() => { if (reviewSearch.trim()) setReviewSearchOpen(true); }}
              placeholder="Search items by name or room..."
              className="w-full pl-9 pr-9 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
              data-testid="input-review-search"
            />
            {reviewSearch && (
              <button
                onClick={() => { setReviewSearch(""); setReviewSearchOpen(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                data-testid="button-clear-review-search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {reviewSearchOpen && reviewSearchResults.length > 0 && (
            <div
              className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-64 overflow-y-auto"
              data-testid="review-search-results"
            >
              {reviewSearchResults.map(({ item, idx }) => {
                const cat = getItemCategory(item.id);
                const assignedCat = cat ? categories.find((c) => c.id === cat.categoryId) : null;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setReviewCardIndex(idx);
                      setReviewSearch("");
                      setReviewSearchOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/60 flex items-center justify-between gap-2 transition-colors ${idx === safeIndex ? "bg-muted/40" : ""}`}
                    data-testid={`search-result-${item.id}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-muted-foreground text-xs shrink-0">{getRoomName(item.roomKey)}</span>
                      <span className="font-medium truncate">{getItemLabel(item.roomKey, item.itemKey)}</span>
                    </div>
                    {assignedCat && (
                      <span
                        className="shrink-0 text-[10px] font-medium text-white px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: assignedCat.color }}
                      >
                        {assignedCat.name}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {reviewSearchOpen && reviewSearch.trim() && reviewSearchResults.length === 0 && (
            <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg p-3 text-sm text-muted-foreground text-center" data-testid="review-search-no-results">
              No items found
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground" data-testid="review-progress-text">
              Item {safeIndex + 1} of {flatItems.length}
            </span>
            <Badge variant="outline" className="gap-1 text-xs" data-testid="review-categorized-count">
              <Check className="w-3 h-3" />
              {categorizedCount}/{totalItems} done
            </Badge>
          </div>
          {nextUncategorized >= 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-teal-600 hover:text-teal-700"
              onClick={() => setReviewCardIndex(nextUncategorized)}
              data-testid="button-skip-to-uncategorized"
            >
              <SkipForward className="w-3.5 h-3.5" />
              Skip to next uncategorized
            </Button>
          )}
        </div>

        <div className="w-full bg-muted rounded-full h-2" data-testid="review-progress-bar">
          <div
            className="bg-teal-500 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <Card
          className={`p-5 sm:p-6 transition-all ${
            itemCat ? "border-l-4" : ""
          }`}
          style={
            itemCat && assignedCategory
              ? { borderLeftColor: assignedCategory.color }
              : undefined
          }
          data-testid={`review-card-${currentItem.id}`}
        >
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <span>{getRoomName(currentItem.roomKey)}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-semibold">
                  {getItemLabel(currentItem.roomKey, currentItem.itemKey)}
                </h3>
                {getResultBadge(currentItem.result)}
                {assignedCategory && (
                  <Badge
                    className="text-xs text-white border-0"
                    style={{ backgroundColor: assignedCategory.color }}
                  >
                    {assignedCategory.name}
                  </Badge>
                )}
              </div>
            </div>

            {currentItem.notes && (
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                {currentItem.notes}
              </p>
            )}

            {responseMedia.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {responseMedia.map((m) => (
                  <a
                    key={m.id}
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative block w-20 h-20 rounded-lg overflow-hidden border hover-elevate"
                    data-testid={`review-media-${m.id}`}
                  >
                    {m.type === "PHOTO" ? (
                      <img
                        src={m.url}
                        alt="Evidence"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Play className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                  </a>
                ))}
              </div>
            )}

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-2">Categorize this item:</p>
              <div className="flex gap-2 flex-wrap">
                {categories.filter((cat) => cat.name !== "Cleaning").map((cat) => {
                  const isActive = itemCat?.categoryId === cat.id;
                  return (
                    <Button
                      key={cat.id}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      className={`text-xs toggle-elevate ${isActive ? "toggle-elevated text-white" : ""}`}
                      style={
                        isActive
                          ? { backgroundColor: cat.color, borderColor: cat.color }
                          : undefined
                      }
                      onClick={() => handleCategorize(currentItem, cat)}
                      disabled={addItemMutation.isPending || updateItemMutation.isPending || deleteItemMutation.isPending}
                      data-testid={`btn-cat-${cat.name.toLowerCase()}-${currentItem.id}`}
                    >
                      {isActive && <Check className="w-3 h-3 mr-1" />}
                      {cat.name}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setReviewCardIndex(Math.max(0, safeIndex - 1))}
            disabled={safeIndex === 0}
            className="gap-2"
            data-testid="button-review-previous"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <div className="flex gap-1">
            {flatItems.length <= 20 && flatItems.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => setReviewCardIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === safeIndex
                    ? "bg-teal-500 w-4"
                    : getItemCategory(item.id)
                      ? "bg-teal-200 dark:bg-teal-800"
                      : "bg-muted-foreground/20"
                }`}
                data-testid={`dot-${idx}`}
              />
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => setReviewCardIndex(Math.min(flatItems.length - 1, safeIndex + 1))}
            disabled={safeIndex === flatItems.length - 1}
            className="gap-2"
            data-testid="button-review-next"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  })();

  const reportTabContent = (
          <div className="space-y-6">
            {report && totalActionable > 0 && (
              <Card className="p-4" data-testid="section-owner-responses-summary">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Owner Responses</p>
                      <p className="text-xs text-muted-foreground">
                        {ownerRespondedCount === 0
                          ? "No responses from the owner yet"
                          : ownerRespondedCount === totalActionable
                            ? "Owner has reviewed all items"
                            : `${ownerRespondedCount} of ${totalActionable} items reviewed by owner`}
                        {ownerCommentedCount > 0 && ` (${ownerCommentedCount} with comments)`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${ownerRespondedCount === totalActionable ? "bg-green-500" : "bg-primary"}`}
                          style={{ width: `${totalActionable > 0 ? Math.round((ownerRespondedCount / totalActionable) * 100) : 0}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">
                        {ownerRespondedCount}/{totalActionable}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowOwnerResponses(true)}
                      data-testid="button-view-owner-responses"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Responses
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {report && (
              <>
                <Card className="p-4 sm:p-6 space-y-4" data-testid="section-report-settings">
                  <h3 className="font-semibold">Report Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Owner Name</Label>
                      <Input
                        value={report.ownerName || ""}
                        placeholder="Enter owner name..."
                        onChange={(e) =>
                          updateReportMutation.mutate({ ownerName: e.target.value } as any)
                        }
                        onBlur={(e) =>
                          updateReportMutation.mutate({ ownerName: e.target.value } as any)
                        }
                        data-testid="input-owner-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Owner Email</Label>
                      <Input
                        value={report.ownerEmail || ""}
                        placeholder="owner@example.com"
                        onChange={(e) =>
                          updateReportMutation.mutate({ ownerEmail: e.target.value } as any)
                        }
                        data-testid="input-owner-email"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Amazon Cart Link (for missing items)</Label>
                    <Input
                      value={report.amazonCartLink || ""}
                      placeholder="https://www.amazon.com/cart/..."
                      onChange={(e) =>
                        updateReportMutation.mutate({ amazonCartLink: e.target.value } as any)
                      }
                      data-testid="input-amazon-link"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Closing Message</Label>
                    <Textarea
                      value={report.closingMessage || ""}
                      placeholder="Message to show at the bottom of the report..."
                      onChange={(e) =>
                        updateReportMutation.mutate({ closingMessage: e.target.value } as any)
                      }
                      rows={3}
                      data-testid="input-closing-message"
                    />
                  </div>
                </Card>

                <Card className="p-4 sm:p-6 space-y-6" data-testid="section-report-preview">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <h3 className="font-semibold text-lg">Report Preview</h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/api/owner-reports/${report.id}/pdf`, "_blank")}
                        data-testid="button-preview-download-pdf"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/report/${report.shareToken}`, "_blank")}
                        data-testid="button-preview-public"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Public Link
                      </Button>
                    </div>
                  </div>

                  <div className="border rounded-lg p-3 sm:p-6 bg-white dark:bg-card space-y-6" data-testid="report-preview-content">
                    <div>
                      <p className="text-base">
                        Hi {report.ownerName || "[owner name]"},
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Following the inspection of your unit, we've identified both damages and missing items.
                      </p>
                    </div>

                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" onClick={openCreateBundleDialog} data-testid="button-create-bundle">
                        <Package className="w-4 h-4 mr-1" />
                        Create Bundle
                      </Button>
                    </div>

                    {(() => {
                      const groupByRoom = (list: OwnerReportItem[]) => {
                        const rooms: Record<string, OwnerReportItem[]> = {};
                        list.forEach((item) => {
                          const room = item.roomName || "General";
                          if (!rooms[room]) rooms[room] = [];
                          rooms[room].push(item);
                        });
                        return Object.entries(rooms).sort(([a], [b]) => a.localeCompare(b));
                      };

                      const renderItemCard = (item: OwnerReportItem, testIdPrefix: string) => {
                        const itemBundle = getBundleForItem(item.id);
                        const costInfo = isItemMissingCostInfo(item);
                        return (
                        <div key={item.id} className="py-5 group border-b border-border last:border-b-0" data-testid={`${testIdPrefix}-${item.id}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="text-base font-semibold text-foreground">{item.itemName}</span>
                              {itemBundle && (
                                <Badge variant="outline" className="text-xs px-2 py-0.5 border-teal-300 text-teal-700 dark:text-teal-400 gap-1">
                                  <Package className="w-3.5 h-3.5" />
                                  {itemBundle.name}
                                </Badge>
                              )}
                              {costInfo.missing && (
                                <Badge variant="outline" className="text-xs px-2 py-0.5 border-amber-300 text-amber-600 dark:text-amber-400 gap-1" data-testid={`badge-missing-cost-${item.id}`}>
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  {costInfo.missingQuote && costInfo.missingCost ? "No quote & cost" : costInfo.missingQuote ? "No repair quote" : "No cost"}
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-1 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditDialog(item)} data-testid={`btn-edit-${item.id}`}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteItemMutation.mutate(item.id)} data-testid={`btn-delete-${item.id}`}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                          {item.description && (
                            <div className="mt-2">
                              <StructuredDescription description={item.description} />
                            </div>
                          )}
                          {item.vendorName && (
                            <div className="mt-3 space-y-1.5">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <Badge className="text-sm bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-0 px-2.5 py-0.5">
                                  {item.vendorName}
                                </Badge>
                                {item.itemPrice && (
                                  <Badge variant="outline" className="text-sm border-teal-300 text-teal-700 px-2.5 py-0.5">
                                    Item: ${item.itemPrice}
                                  </Badge>
                                )}
                                {item.estimatedCost && (
                                  <Badge variant="outline" className="text-sm border-emerald-300 text-emerald-700 font-semibold px-2.5 py-0.5">
                                    Total: ${item.estimatedCost} +HST
                                  </Badge>
                                )}
                              </div>
                              {item.vendorLink && (
                                <a href={item.vendorLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                                  <ExternalLink className="w-3.5 h-3.5" /> View product
                                </a>
                              )}
                              {item.handymanQuote && (
                                <p className="text-sm text-blue-600 dark:text-blue-400 italic">{item.handymanQuote}</p>
                              )}
                            </div>
                          )}
                          {!item.vendorName && (item.repairQuote || item.estimatedCost) && (
                            <div className="mt-3 flex items-baseline gap-4 flex-wrap">
                              {item.repairQuote && (
                                <div className="flex items-baseline gap-2">
                                  <span className="text-sm text-muted-foreground font-medium">Repair:</span>
                                  <span className="text-sm text-foreground">{item.repairQuote}</span>
                                </div>
                              )}
                              {item.estimatedCost && (
                                <div className="flex items-baseline gap-2">
                                  <span className="text-sm text-muted-foreground font-medium">Est. Cost:</span>
                                  <span className="text-base font-semibold text-teal-700 dark:text-teal-400">${item.estimatedCost}</span>
                                </div>
                              )}
                            </div>
                          )}
                          {(item.repairOptions as any)?.length > 0 && (
                            <div className="mt-3 space-y-1.5">
                              <span className="text-sm font-medium text-muted-foreground">Repair Options:</span>
                              <div className="grid gap-1.5">
                                {(item.repairOptions as { id: string; label: string; vendor?: string; cost: string; description?: string }[]).map((opt, oi) => (
                                  <div key={opt.id || oi} className="flex items-center gap-3 text-sm bg-muted/40 rounded-md px-3 py-2 border border-border/50">
                                    <span className="text-xs font-bold text-teal-600 w-5 shrink-0">{String.fromCharCode(65 + oi)}</span>
                                    <span className="font-medium flex-1">{opt.label}</span>
                                    {opt.vendor && <span className="text-muted-foreground text-sm">({opt.vendor})</span>}
                                    {opt.cost && <span className="font-semibold text-teal-700 dark:text-teal-400 shrink-0">{opt.cost.startsWith("$") ? opt.cost : `$${opt.cost}`}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {item.pmOwnerNote && (
                            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-md text-sm text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                              <span className="font-medium">Note to owner:</span> {item.pmOwnerNote}
                            </div>
                          )}
                          {item.mediaUrls && (item.mediaUrls as string[]).length > 0 && (
                            <div className="flex gap-2.5 flex-wrap mt-3">
                              {(item.mediaUrls as string[]).map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block w-16 h-16 rounded-lg overflow-hidden border hover:ring-2 hover:ring-teal-400/50 transition-all">
                                  {url.match(/\.(mp4|mov|webm)$/i) ? (
                                    <div className="w-full h-full bg-muted flex items-center justify-center">
                                      <Play className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                  ) : (
                                    <img src={url} alt="Evidence" className="w-full h-full object-cover" />
                                  )}
                                </a>
                              ))}
                            </div>
                          )}
                          <OwnerResponseBadge item={item} />
                        </div>
                      );
                      };

                      const renderRoomGroupedItems = (list: OwnerReportItem[], testIdPrefix: string, borderColor: string) => {
                        const roomGroups = groupByRoom(list);
                        return (
                          <div className="space-y-2">
                            {roomGroups.map(([roomName, roomItems]) => (
                              <div key={roomName}>
                                <div className={`flex items-center gap-2.5 mt-4 mb-2 pl-3 border-l-3`} style={{ borderLeftWidth: "3px", borderLeftColor: borderColor }}>
                                  <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{roomName}</span>
                                  <Badge variant="secondary" className="text-xs px-1.5 py-0">{roomItems.length}</Badge>
                                </div>
                                <div className="pl-5 divide-y divide-border">
                                  {roomItems.map((item) => renderItemCard(item, testIdPrefix))}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      };

                      return (
                        <>
                    {["Damage", "Cosmetic", "Missing", "Replacement"].map((sectionName) => {
                      const sectionItems = groupedByCategory[sectionName] || [];
                      const cat = categories.find((c) => c.name === sectionName);
                      const sectionBundles = bundles.filter(b => b.categoryId === cat?.id);
                      const unbundledItems = sectionItems.filter(i => !i.bundleId);
                      if (sectionItems.length === 0 && sectionBundles.length === 0) return null;

                      const renderBundleCards = () => sectionBundles.map((bundle) => {
                        const bundleItems = reportItems.filter(i => i.bundleId === bundle.id);
                        return (
                          <Card key={bundle.id} className="p-3 border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20 mb-3" data-testid={`bundle-card-${bundle.id}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Package className="w-4 h-4 text-teal-600" />
                                  <span className="font-semibold text-sm">{bundle.name}</span>
                                  {bundle.estimatedCost && (
                                    <Badge variant="secondary" className="text-xs bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300">
                                      ${bundle.estimatedCost} +HST
                                    </Badge>
                                  )}
                                </div>
                                {bundle.repairQuote && (
                                  <p className="text-xs text-muted-foreground mt-1 italic">{bundle.repairQuote}</p>
                                )}
                                <div className="mt-2 space-y-1">
                                  {bundleItems.map((item) => (
                                    <div key={item.id} className="flex items-center gap-2 text-xs">
                                      <span className="text-muted-foreground">{item.roomName}</span>
                                      <span>—</span>
                                      <span className="font-medium">{item.itemName}</span>
                                      <button
                                        onClick={() => removeItemFromBundleMutation.mutate({ bundleId: bundle.id, itemId: item.id })}
                                        className="ml-auto text-muted-foreground hover:text-destructive"
                                        data-testid={`bundle-remove-item-${item.id}`}
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                  {bundleItems.length === 0 && (
                                    <p className="text-xs text-muted-foreground italic">No items in this bundle</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditBundleDialog(bundle)} data-testid={`bundle-edit-${bundle.id}`}>
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteBundleMutation.mutate(bundle.id)} data-testid={`bundle-delete-${bundle.id}`}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        );
                      });

                      if (sectionName === "Damage") {
                        return (
                          <div key={sectionName} className="space-y-4">
                            <div className="border-b-2 border-red-500 pb-2">
                              <h4 className="font-bold text-xl text-foreground">
                                Damages
                              </h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                Issues identified during inspection, listed by priority.
                              </p>
                            </div>

                            {renderBundleCards()}

                            {highPriorityDamages.length > 0 && (
                              <div className="mb-5">
                                <p className="font-semibold text-base mb-3 flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4 text-red-500" />
                                  High Priority
                                </p>
                                {renderRoomGroupedItems(highPriorityDamages, "report-damage-high", "#fca5a5")}
                              </div>
                            )}

                            {lowerPriorityDamages.length > 0 && (
                              <div>
                                <p className="font-semibold text-base mb-3">
                                  Lower Priority
                                </p>
                                {renderRoomGroupedItems(lowerPriorityDamages, "report-damage-lower", "#fcd34d")}
                              </div>
                            )}
                          </div>
                        );
                      }

                      if (sectionName === "Missing") {
                        return (
                          <div key={sectionName} className="space-y-4">
                            <div className="border-b-2 border-purple-500 pb-2">
                              <h4 className="font-bold text-xl text-foreground">
                                Missing Items
                              </h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                Items that need to be purchased or replaced.
                              </p>
                            </div>
                            {renderBundleCards()}
                            {renderRoomGroupedItems(unbundledItems, "report-missing", "#c4b5fd")}
                            {report.amazonCartLink && (
                              <p className="text-sm mt-4">
                                Amazon cart link with missing items:{" "}
                                <a href={report.amazonCartLink} target="_blank" rel="noopener noreferrer" className="text-primary underline font-medium">
                                  View Cart
                                </a>
                              </p>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div key={sectionName} className="space-y-4">
                          <div className="pb-2" style={{ borderBottom: `2px solid ${cat?.color || "#6b7280"}` }}>
                            <h4 className="font-bold text-xl text-foreground">
                              {sectionName}
                            </h4>
                          </div>
                          {renderBundleCards()}
                          {renderRoomGroupedItems(unbundledItems, "report-item", cat?.color || "#6b7280")}
                        </div>
                      );
                    })}

                        </>
                      );
                    })()}

                    {reportItems.filter((ri) => {
                      const cat = categories.find((c) => c.id === ri.categoryId);
                      return cat?.name !== "Good";
                    }).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                        <p>No issues categorized yet. Go to "Review & Categorize" tab to start building the report.</p>
                      </div>
                    )}

                    {report.closingMessage && reportItems.filter((ri) => {
                      const cat = categories.find((c) => c.id === ri.categoryId);
                      return cat?.name !== "Good";
                    }).length > 0 && (
                      <div className="pt-4 border-t">
                        <p className="text-sm">{report.closingMessage}</p>
                      </div>
                    )}
                  </div>

                  {report && (
                    <div className="space-y-3">
                      <Card className="p-4 bg-muted/30" data-testid="section-share-link">
                        <div className="flex items-center gap-3 flex-wrap">
                          <Link2 className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">Public Share Link</p>
                            <p className="text-xs text-muted-foreground truncate">{shareUrl}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={copyShareLink} data-testid="button-copy-share-link">
                            <Copy className="w-4 h-4 mr-2" />
                            Copy
                          </Button>
                        </div>
                      </Card>

                      <Card className="p-4 bg-muted/30" data-testid="section-publish-owner">
                        <div className="flex items-center gap-3 flex-wrap">
                          <Send className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">Owner Portal</p>
                            <p className="text-xs text-muted-foreground">
                              {report.publishedAt
                                ? `Published on ${new Date(report.publishedAt).toLocaleDateString()}`
                                : "Publish this report so the owner can view it in their portal"}
                            </p>
                          </div>
                          {report.publishedAt ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200 gap-1" data-testid="badge-published">
                              <CheckCircle2 className="w-3 h-3" />
                              Published
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={handlePublishClick}
                              disabled={publishMutation.isPending}
                              data-testid="button-publish-owner"
                            >
                              {publishMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4 mr-2" />
                              )}
                              Publish to Owner
                            </Button>
                          )}
                        </div>
                      </Card>
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>
  );

  const responsesTabContent = (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">
              {ownerRespondedCount} of {totalActionable} items reviewed
            </span>
            {ownerRespondedCount === totalActionable && totalActionable > 0 && (
              <Badge variant="outline" className="border-green-300 text-green-700 dark:border-green-700 dark:text-green-400 text-xs">
                Complete
              </Badge>
            )}
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${ownerRespondedCount === totalActionable && totalActionable > 0 ? "bg-green-500" : "bg-primary"}`}
              style={{ width: `${totalActionable > 0 ? Math.round((ownerRespondedCount / totalActionable) * 100) : 0}%` }}
            />
          </div>
        </div>
      </div>

      {totalActionable === 0 ? (
        <Card className="p-8 text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Actionable Items</h3>
          <p className="text-muted-foreground">Categorize items in the Review & Categorize tab first.</p>
        </Card>
      ) : (
        (() => {
          const sectionOrder = ["Damage", "Cosmetic", "Missing", "Replacement"];
          const groupedByCat: Record<string, OwnerReportItem[]> = {};
          for (const item of actionableItems) {
            const cat = categories.find((c) => c.id === item.categoryId);
            const catName = cat?.name || "Other";
            if (!groupedByCat[catName]) groupedByCat[catName] = [];
            groupedByCat[catName].push(item);
          }
          return (
            <>
              {[...sectionOrder, ...Object.keys(groupedByCat).filter((k) => !sectionOrder.includes(k) && k !== "Cleaning")].map((sectionName) => {
                const sectionItems = groupedByCat[sectionName];
                if (!sectionItems || sectionItems.length === 0) return null;
                const cat = categories.find((c) => c.name === sectionName);
                return (
                  <div key={sectionName} data-testid={`owner-response-section-${sectionName.toLowerCase()}`}>
                    <h3
                      className="text-sm font-bold uppercase tracking-wide pb-1.5 mb-3"
                      style={{ borderBottom: `2px solid ${cat?.color || "#6b7280"}`, color: cat?.color }}
                    >
                      {sectionName}
                    </h3>
                    <div className="space-y-2">
                      {sectionItems.map((item) => {
                        const responseInfo = item.ownerResponse ? OWNER_RESPONSE_LABELS[item.ownerResponse] : null;
                        return (
                          <div key={item.id} className="p-3 border rounded-lg" data-testid={`owner-response-item-${item.id}`}>
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium">{item.roomName} — {item.itemName}</span>
                                {item.description && (
                                  <span className="text-xs text-muted-foreground ml-1">: {item.description}</span>
                                )}
                              </div>
                              {responseInfo ? (
                                <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${responseInfo.color}`}>
                                  <CheckCircle2 className="w-3 h-3" />
                                  {responseInfo.label}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-muted text-muted-foreground whitespace-nowrap">
                                  <AlertTriangle className="w-3 h-3" />
                                  No response
                                </span>
                              )}
                            </div>
                            {item.ownerComment && (
                              <div className="mt-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-md px-3 py-2">
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                  <MessageSquare className="w-3 h-3 inline mr-1" />
                                  {item.ownerComment}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          );
        })()
      )}
    </div>
  );

  const dialogs = (
    <>
      <Dialog open={!!repairTypeChooser} onOpenChange={(open) => !open && setRepairTypeChooser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>How would you like to handle this repair?</DialogTitle>
          </DialogHeader>
          {repairTypeChooser && (
            <div className="space-y-3 pt-2">
              <p className="text-sm text-muted-foreground">
                Choose how to set up repair details for <span className="font-medium text-foreground">{repairTypeChooser.item.itemName}</span>
              </p>
              <div className="grid gap-3">
                <button
                  onClick={() => handleRepairTypeChoice("single")}
                  className="flex items-start gap-4 p-4 rounded-lg border-2 border-border hover:border-teal-400 hover:bg-teal-50/50 dark:hover:bg-teal-950/30 transition-all text-left group"
                  data-testid="btn-repair-single"
                >
                  <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center shrink-0 group-hover:bg-teal-200 dark:group-hover:bg-teal-900 transition-colors">
                    <Pencil className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-base">Single repair quote</p>
                    <p className="text-sm text-muted-foreground mt-0.5">One repair approach with a cost estimate</p>
                  </div>
                </button>
                <button
                  onClick={() => handleRepairTypeChoice("multiple")}
                  className="flex items-start gap-4 p-4 rounded-lg border-2 border-border hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all text-left group"
                  data-testid="btn-repair-multiple"
                >
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900 transition-colors">
                    <ClipboardList className="w-5 h-5 text-indigo-700 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-base">Multiple repair options</p>
                    <p className="text-sm text-muted-foreground mt-0.5">Give the owner different choices (vendors, approaches, price points)</p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItemDialog} onOpenChange={(open) => !open && setEditItemDialog(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Report Item</DialogTitle>
          </DialogHeader>
          {editItemDialog && (() => {
            const isVendor = isVendorCategory(editItemDialog);
            return (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">{editItemDialog.roomName} — {editItemDialog.itemName}</Label>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={editPriority} onValueChange={(v) => setEditPriority(v as "HIGH" | "LOWER")}>
                  <SelectTrigger data-testid="select-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIGH">High Priority</SelectItem>
                    <SelectItem value="LOWER">Lower Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  data-testid="input-edit-description"
                />
              </div>

              {isVendor ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Vendor</Label>
                    <Select value={editVendorName} onValueChange={setEditVendorName}>
                      <SelectTrigger data-testid="select-vendor">
                        <SelectValue placeholder="Select a vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Amazon">Amazon</SelectItem>
                        <SelectItem value="Structube">Structube</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {editVendorName && (
                    <>
                      <div className="space-y-2">
                        <Label>{editVendorName === "Other" ? "Product Link" : `${editVendorName} Link`}</Label>
                        <Input
                          value={editVendorLink}
                          onChange={(e) => setEditVendorLink(e.target.value)}
                          placeholder={`Paste ${editVendorName.toLowerCase()} product link`}
                          data-testid="input-vendor-link"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Item Price ($)</Label>
                        <Input
                          value={editItemPrice}
                          onChange={(e) => setEditItemPrice(e.target.value)}
                          placeholder="e.g., 299"
                          data-testid="input-item-price"
                        />
                      </div>
                    </>
                  )}

                  {editVendorName === "Structube" && (
                    <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Our handyman can pick up this item from Structube, install it, and dispose of the old one.
                      </p>
                      <div className="space-y-2">
                        <Label className="text-sm">Handyman Quote</Label>
                        <Select value={editHandymanQuoteType} onValueChange={(v) => setEditHandymanQuoteType(v as "fixed" | "range")}>
                          <SelectTrigger data-testid="select-handyman-quote-type" className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">Fixed Price</SelectItem>
                            <SelectItem value="range">Price Range</SelectItem>
                          </SelectContent>
                        </Select>
                        {editHandymanQuoteType === "fixed" ? (
                          <Input
                            value={editHandymanFixed}
                            onChange={(e) => setEditHandymanFixed(e.target.value)}
                            placeholder="e.g., 150"
                            data-testid="input-handyman-fixed"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editHandymanMin}
                              onChange={(e) => setEditHandymanMin(e.target.value)}
                              placeholder="Min (e.g., 100)"
                              data-testid="input-handyman-min"
                            />
                            <span className="text-muted-foreground">–</span>
                            <Input
                              value={editHandymanMax}
                              onChange={(e) => setEditHandymanMax(e.target.value)}
                              placeholder="Max (e.g., 200)"
                              data-testid="input-handyman-max"
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="vendor-service-fee"
                          checked={editVendorServiceFee}
                          onCheckedChange={(checked) => setEditVendorServiceFee(checked === true)}
                          data-testid="checkbox-vendor-service-fee"
                        />
                        <Label htmlFor="vendor-service-fee" className="text-sm cursor-pointer">
                          Add $50 service fee
                        </Label>
                      </div>
                      {(editHandymanFixed || editHandymanMin) && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 italic">
                          Preview: {buildHandymanQuoteText()}
                        </p>
                      )}
                    </div>
                  )}

                  {editVendorName && editVendorName !== "Structube" && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="vendor-service-fee-other"
                        checked={editVendorServiceFee}
                        onCheckedChange={(checked) => setEditVendorServiceFee(checked === true)}
                        data-testid="checkbox-vendor-service-fee"
                      />
                      <Label htmlFor="vendor-service-fee-other" className="text-sm cursor-pointer">
                        Add $50 service fee
                      </Label>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Note to Owner (optional)</Label>
                    <Textarea
                      value={editPmOwnerNote}
                      onChange={(e) => setEditPmOwnerNote(e.target.value)}
                      placeholder="e.g., Bear in mind we need to book the elevator and drop off the cheque deposit"
                      rows={2}
                      data-testid="input-pm-owner-note"
                    />
                  </div>

                  {editItemPrice && (
                    <div className="p-3 bg-muted/50 rounded-md">
                      <Label className="text-xs text-muted-foreground">Estimated Total for Owner</Label>
                      <p className="text-lg font-semibold text-foreground" data-testid="text-vendor-total">
                        ${buildVendorEstimatedCost() || "0"} +HST
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Item: ${editItemPrice}
                        {editVendorName === "Structube" && (editHandymanFixed || editHandymanMax) && (
                          <> + Handyman: ${editHandymanQuoteType === "fixed" ? editHandymanFixed : editHandymanMax}</>
                        )}
                        {editVendorServiceFee && <> + $50 service fee</>}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <Label>Repair Quote</Label>
                    <Select value={quotePreset} onValueChange={handlePresetChange}>
                      <SelectTrigger data-testid="select-quote-preset">
                        <SelectValue placeholder="Select a quote preset" />
                      </SelectTrigger>
                      <SelectContent>
                        {QUOTE_PRESETS.map((preset) => (
                          <SelectItem key={preset.value} value={preset.value}>
                            {preset.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {quotePreset === "small_jobs" && (
                      <div className="space-y-2 p-3 bg-muted/50 rounded-md">
                        <Label className="text-xs text-muted-foreground">Part Details (optional)</Label>
                        <Input
                          value={partName}
                          onChange={(e) => handlePartFieldChange("name", e.target.value)}
                          placeholder="Item name (e.g., Faucet cartridge)"
                          data-testid="input-part-name"
                        />
                        <Input
                          value={partPrice}
                          onChange={(e) => handlePartFieldChange("price", e.target.value)}
                          placeholder="Price (e.g., 35)"
                          data-testid="input-part-price"
                        />
                        <Input
                          value={partLink}
                          onChange={(e) => handlePartFieldChange("link", e.target.value)}
                          placeholder="Amazon link"
                          data-testid="input-part-link"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="service-fee"
                        checked={addServiceFee}
                        onCheckedChange={(checked) => handleServiceFeeToggle(checked === true)}
                        data-testid="checkbox-service-fee"
                      />
                      <Label htmlFor="service-fee" className="text-sm cursor-pointer">
                        Add $50 service fee
                      </Label>
                    </div>

                    <Textarea
                      value={editRepairQuote}
                      onChange={(e) => {
                        setEditRepairQuote(e.target.value);
                        if (quotePreset !== "custom") setQuotePreset("custom");
                      }}
                      placeholder="e.g., $150 for replacement"
                      rows={2}
                      data-testid="input-edit-repair-quote"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Estimated Cost Range ($)</Label>
                    <p className="text-xs text-muted-foreground break-words">The owner will see this range when selecting "Please fix" or "Proceed with purchase". Enter numeric values (e.g., 150 and 250).</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Min ($)</Label>
                        <Input
                          value={editEstimatedCostMin}
                          onChange={(e) => setEditEstimatedCostMin(e.target.value)}
                          placeholder="e.g., 150"
                          data-testid="input-edit-estimated-cost-min"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Max ($)</Label>
                        <Input
                          value={editEstimatedCostMax}
                          onChange={(e) => setEditEstimatedCostMax(e.target.value)}
                          placeholder="e.g., 250"
                          data-testid="input-edit-estimated-cost-max"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-semibold">Repair Options for Owner</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">Give the owner choices — each option is a different approach, vendor, or price point.</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1.5 border-teal-300 text-teal-700 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-400 dark:hover:bg-teal-950"
                        onClick={() => setEditRepairOptions([...editRepairOptions, { id: crypto.randomUUID(), label: "", cost: "", vendor: "", description: "" }])}
                        data-testid="btn-add-repair-option"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Option
                      </Button>
                    </div>
                    {editRepairOptions.length === 0 && (
                      <div className="flex items-center justify-center py-4 border-2 border-dashed rounded-lg text-muted-foreground">
                        <p className="text-sm">No repair options yet — click "Add Option" above</p>
                      </div>
                    )}
                    <div className="space-y-3">
                      {editRepairOptions.map((opt, idx) => (
                        <div key={opt.id} className="rounded-lg border bg-muted/30 overflow-hidden" data-testid={`repair-option-${idx}`}>
                          <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
                            <span className="text-xs font-semibold text-foreground">Option {String.fromCharCode(65 + idx)}</span>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => setEditRepairOptions(editRepairOptions.filter((_, i) => i !== idx))}
                              data-testid={`btn-remove-repair-option-${idx}`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          <div className="p-3 space-y-2.5">
                            <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">What's this option?</Label>
                                <Input
                                  value={opt.label}
                                  onChange={(e) => {
                                    const updated = [...editRepairOptions];
                                    updated[idx] = { ...updated[idx], label: e.target.value };
                                    setEditRepairOptions(updated);
                                  }}
                                  placeholder="e.g., Replace with standard model"
                                  className="h-9"
                                  data-testid={`input-repair-option-label-${idx}`}
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">Cost</Label>
                                <Input
                                  value={opt.cost}
                                  onChange={(e) => {
                                    const updated = [...editRepairOptions];
                                    updated[idx] = { ...updated[idx], cost: e.target.value };
                                    setEditRepairOptions(updated);
                                  }}
                                  placeholder="$150"
                                  className="h-9 w-28"
                                  data-testid={`input-repair-option-cost-${idx}`}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">Vendor</Label>
                                <Input
                                  value={opt.vendor || ""}
                                  onChange={(e) => {
                                    const updated = [...editRepairOptions];
                                    updated[idx] = { ...updated[idx], vendor: e.target.value };
                                    setEditRepairOptions(updated);
                                  }}
                                  placeholder="e.g., Home Depot"
                                  className="h-9"
                                  data-testid={`input-repair-option-vendor-${idx}`}
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">Details</Label>
                                <Input
                                  value={opt.description || ""}
                                  onChange={(e) => {
                                    const updated = [...editRepairOptions];
                                    updated[idx] = { ...updated[idx], description: e.target.value };
                                    setEditRepairOptions(updated);
                                  }}
                                  placeholder="Extra info (optional)"
                                  className="h-9"
                                  data-testid={`input-repair-option-desc-${idx}`}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Note to Owner (optional)</Label>
                    <Textarea
                      value={editPmOwnerNote}
                      onChange={(e) => setEditPmOwnerNote(e.target.value)}
                      placeholder="e.g., Bear in mind we need to book the elevator and drop off the cheque deposit"
                      rows={2}
                      data-testid="input-pm-owner-note"
                    />
                  </div>
                </>
              )}
            </div>
            );
          })()}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditItemDialog(null)} data-testid="button-edit-cancel">
              Cancel
            </Button>
            <Button onClick={handleEditSave} data-testid="button-edit-save">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showOwnerResponses} onOpenChange={setShowOwnerResponses}>
        <DialogContent className="max-w-full sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Owner Responses
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">
                    {ownerRespondedCount} of {totalActionable} items reviewed
                  </span>
                  {ownerRespondedCount === totalActionable && totalActionable > 0 && (
                    <Badge variant="outline" className="border-green-300 text-green-700 dark:border-green-700 dark:text-green-400 text-xs">
                      Complete
                    </Badge>
                  )}
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${ownerRespondedCount === totalActionable && totalActionable > 0 ? "bg-green-500" : "bg-primary"}`}
                    style={{ width: `${totalActionable > 0 ? Math.round((ownerRespondedCount / totalActionable) * 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {(() => {
              const sectionOrder = ["Damage", "Cosmetic", "Missing", "Replacement"];

              const groupedByCat: Record<string, OwnerReportItem[]> = {};
              for (const item of actionableItems) {
                const cat = categories.find((c) => c.id === item.categoryId);
                const catName = cat?.name || "Other";
                if (!groupedByCat[catName]) groupedByCat[catName] = [];
                groupedByCat[catName].push(item);
              }

              return (
                <>
                  {[...sectionOrder, ...Object.keys(groupedByCat).filter((k) => !sectionOrder.includes(k))].map((sectionName) => {
                    const sectionItems = groupedByCat[sectionName];
                    if (!sectionItems || sectionItems.length === 0) return null;
                    const cat = categories.find((c) => c.name === sectionName);

                    return (
                      <div key={sectionName} data-testid={`owner-response-section-${sectionName.toLowerCase()}`}>
                        <h3
                          className="text-sm font-bold uppercase tracking-wide pb-1.5 mb-3"
                          style={{ borderBottom: `2px solid ${cat?.color || "#6b7280"}`, color: cat?.color }}
                        >
                          {sectionName}
                        </h3>
                        <div className="space-y-2">
                          {sectionItems.map((item) => {
                            const responseInfo = item.ownerResponse ? OWNER_RESPONSE_LABELS[item.ownerResponse] : null;
                            return (
                              <div key={item.id} className="p-3 border rounded-lg" data-testid={`owner-response-item-${item.id}`}>
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm font-medium">{item.roomName} — {item.itemName}</span>
                                    {item.description && (
                                      <span className="text-xs text-muted-foreground ml-1">: {item.description}</span>
                                    )}
                                  </div>
                                  {responseInfo ? (
                                    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${responseInfo.color}`}>
                                      <CheckCircle2 className="w-3 h-3" />
                                      {responseInfo.label}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-muted text-muted-foreground whitespace-nowrap">
                                      <AlertTriangle className="w-3 h-3" />
                                      No response
                                    </span>
                                  )}
                                </div>
                                {item.ownerComment && (
                                  <div className="mt-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-md px-3 py-2">
                                    <p className="text-xs text-blue-700 dark:text-blue-300">
                                      <MessageSquare className="w-3 h-3 inline mr-1" />
                                      {item.ownerComment}
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Bundle Dialog */}
      <Dialog open={bundleDialogOpen} onOpenChange={setBundleDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBundle ? "Edit Service Bundle" : "Create Service Bundle"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Bundle Type</Label>
              <Select
                value={bundleTypePreset}
                onValueChange={(val) => {
                  setBundleTypePreset(val);
                  const preset = BUNDLE_PRESETS.find(p => p.value === val);
                  if (preset && val !== "custom") {
                    setBundleName(preset.label);
                    if (preset.quotes.length > 0) {
                      setBundleRepairQuote(preset.quotes[0]);
                    }
                  } else {
                    setBundleName("");
                    setBundleRepairQuote("");
                  }
                }}
              >
                <SelectTrigger data-testid="select-bundle-type">
                  <SelectValue placeholder="Select bundle type..." />
                </SelectTrigger>
                <SelectContent>
                  {BUNDLE_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {bundleTypePreset === "custom" && (
                <Input
                  value={bundleName}
                  onChange={(e) => setBundleName(e.target.value)}
                  placeholder="Enter custom bundle name..."
                  className="mt-2"
                  data-testid="input-bundle-name-custom"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={bundleCategoryId} onValueChange={setBundleCategoryId}>
                <SelectTrigger data-testid="select-bundle-category">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.filter(c => ["Damage", "Cosmetic", "Missing", "Replacement"].includes(c.name)).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Repair Quote</Label>
              {(() => {
                const activePreset = BUNDLE_PRESETS.find(p => p.value === bundleTypePreset);
                if (activePreset && activePreset.quotes.length > 1) {
                  return (
                    <Select
                      value={activePreset.quotes.includes(bundleRepairQuote) ? bundleRepairQuote : ""}
                      onValueChange={(val) => setBundleRepairQuote(val)}
                    >
                      <SelectTrigger className="mb-2" data-testid="select-bundle-quote-preset">
                        <SelectValue placeholder="Select a quote preset..." />
                      </SelectTrigger>
                      <SelectContent>
                        {activePreset.quotes.map((q, idx) => (
                          <SelectItem key={idx} value={q}>
                            {q.length > 60 ? q.substring(0, 60) + "..." : q}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                }
                return null;
              })()}
              <Textarea
                value={bundleRepairQuote}
                onChange={(e) => setBundleRepairQuote(e.target.value)}
                placeholder="e.g., Handyman visit: pickup, assembly & install. Fixed rate or range pricing."
                className="min-h-[60px]"
                data-testid="input-bundle-repair-quote"
              />
            </div>
            <div className="space-y-2">
              <Label>Estimated Cost Range ($)</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Min ($)</Label>
                  <Input
                    value={bundleCostMin}
                    onChange={(e) => setBundleCostMin(e.target.value)}
                    placeholder="e.g., 135"
                    data-testid="input-bundle-cost-min"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Max ($)</Label>
                  <Input
                    value={bundleCostMax}
                    onChange={(e) => setBundleCostMax(e.target.value)}
                    placeholder="e.g., 180"
                    data-testid="input-bundle-cost-max"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Select Items</Label>
              <p className="text-xs text-muted-foreground">Choose which report items to include in this bundle.</p>
              <div className="border rounded-md max-h-60 overflow-y-auto divide-y">
                {["Damage", "Cosmetic", "Missing", "Replacement"].map((catName) => {
                  const catItems = (groupedByCategory[catName] || []);
                  if (catItems.length === 0) return null;
                  return (
                    <div key={catName} className="p-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{catName}</p>
                      {catItems.map((item) => {
                        const isInOtherBundle = item.bundleId && (!editingBundle || item.bundleId !== editingBundle.id);
                        const otherBundle = isInOtherBundle ? bundles.find(b => b.id === item.bundleId) : null;
                        return (
                          <label
                            key={item.id}
                            className={`flex items-center gap-2 py-1 px-1 rounded cursor-pointer hover:bg-muted/50 text-sm ${isInOtherBundle ? "opacity-50" : ""}`}
                            data-testid={`bundle-item-checkbox-${item.id}`}
                          >
                            <Checkbox
                              checked={bundleSelectedItems.includes(item.id)}
                              disabled={!!isInOtherBundle}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setBundleSelectedItems(prev => [...prev, item.id]);
                                } else {
                                  setBundleSelectedItems(prev => prev.filter(id => id !== item.id));
                                }
                              }}
                            />
                            <span className="flex-1 truncate">
                              <span className="text-muted-foreground">{item.roomName}</span>
                              {" — "}
                              <span className="font-medium">{item.itemName}</span>
                            </span>
                            {otherBundle && (
                              <Badge variant="outline" className="text-[10px] shrink-0">
                                In: {otherBundle.name}
                              </Badge>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setBundleDialogOpen(false); setEditingBundle(null); resetBundleForm(); }} data-testid="button-bundle-cancel">
              Cancel
            </Button>
            <Button
              onClick={handleBundleSave}
              disabled={!bundleTypePreset || !bundleName.trim() || !bundleCategoryId || bundleSelectedItems.length === 0 || createBundleMutation.isPending || updateBundleMutation.isPending}
              data-testid="button-bundle-save"
            >
              {(createBundleMutation.isPending || updateBundleMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingBundle ? "Update Bundle" : "Create Bundle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={publishConfirmOpen} onOpenChange={setPublishConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              Missing Cost Information
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              The following {itemsMissingCostInfo.length} item{itemsMissingCostInfo.length !== 1 ? "s" : ""} {itemsMissingCostInfo.length !== 1 ? "are" : "is"} missing repair quote or estimated cost:
            </p>
            <div className="max-h-48 overflow-y-auto border rounded-md divide-y">
              {itemsMissingCostInfo.map(item => {
                const info = isItemMissingCostInfo(item);
                return (
                  <div key={item.id} className="px-3 py-2 text-sm flex items-center justify-between gap-2" data-testid={`publish-warn-item-${item.id}`}>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{item.roomName}</span>
                      <span className="text-muted-foreground"> — </span>
                      <span>{item.itemName}</span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {info.missingQuote && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-600">No quote</Badge>
                      )}
                      {info.missingCost && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-600">No cost</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to publish without updating these items?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishConfirmOpen(false)} data-testid="button-publish-cancel">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
              data-testid="button-publish-anyway"
            >
              {publishMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Publish Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  const liveReportPanel = (() => {
    const actionableItems = reportItems.filter((ri) => {
      const cat = categories.find((c) => c.id === ri.categoryId);
      return cat?.name !== "Good";
    });

    const groupByRoom = (list: OwnerReportItem[]) => {
      const rooms: Record<string, OwnerReportItem[]> = {};
      list.forEach((item) => {
        const room = item.roomName || "General";
        if (!rooms[room]) rooms[room] = [];
        rooms[room].push(item);
      });
      return Object.entries(rooms).sort(([a], [b]) => a.localeCompare(b));
    };

    const getResultBadgeForItem = (item: OwnerReportItem) => {
      const resp = allResponses.find(r => r.id === item.checklistResponseId);
      if (!resp) return null;
      const result = resp.result;
      switch (result) {
        case "FAIL":
          return <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">Fail</Badge>;
        case "MISSING":
          return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-0 text-[10px] px-1.5 py-0 h-5">Missing</Badge>;
        case "NEED_REPLACEMENT":
          return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-[10px] px-1.5 py-0 h-5">Needs Replacement</Badge>;
        case "PASS":
        case "GOOD":
          return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-[10px] px-1.5 py-0 h-5">Pass</Badge>;
        default:
          return null;
      }
    };

    return (
      <div className="space-y-4" data-testid="live-report-panel">
        <div className="flex items-center justify-between pt-1">
          <div>
            <h3 className="font-semibold text-lg">Owner Report Preview</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {actionableItems.length} item{actionableItems.length !== 1 ? "s" : ""} ready for report
            </p>
          </div>
          {report && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => window.open(`/api/owner-reports/${report.id}/pdf`, "_blank")}
                title="Download PDF"
                data-testid="split-btn-download-pdf"
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => window.open(`/report/${report.shareToken}`, "_blank")}
                title="Open public link"
                data-testid="split-btn-public-link"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={copyShareLink}
                title="Copy share link"
                data-testid="split-btn-copy-link"
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
              {report.publishedAt ? (
                <Badge className="bg-green-100 text-green-700 border-green-200 gap-1 text-xs ml-1" data-testid="split-badge-published">
                  <Check className="w-3 h-3" />
                  Published
                </Badge>
              ) : (
                <Button
                  size="icon"
                  className="h-7 w-7 bg-teal-600 hover:bg-teal-700 ml-1"
                  onClick={() => {
                    const missingCostItems = reportItems.filter(ri => {
                      const cat = categories.find(c => c.id === ri.categoryId);
                      return cat?.name !== "Good" && isItemMissingCostInfo(ri).missing;
                    });
                    if (missingCostItems.length > 0) {
                      setPublishConfirmOpen(true);
                    } else {
                      publishMutation.mutate();
                    }
                  }}
                  disabled={publishMutation.isPending}
                  title="Publish to owner"
                  data-testid="split-btn-publish"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>

        {actionableItems.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-base font-medium">No items categorized yet</p>
            <p className="text-sm mt-1">Categorize items on the left to build the report</p>
          </div>
        ) : (
          <div className="space-y-3">
            {["Damage", "Cosmetic", "Missing", "Replacement"].map((sectionName) => {
              const cat = categories.find((c) => c.name === sectionName);
              if (!cat) return null;
              const sectionItems = reportItems.filter(ri => ri.categoryId === cat.id);
              if (sectionItems.length === 0) return null;

              const isExpanded = expandedSections.has(sectionName);
              const roomGroupsList = groupByRoom(sectionItems);

              return (
                <div key={sectionName} className="rounded-lg border overflow-hidden" data-testid={`live-section-${sectionName.toLowerCase()}`}>
                  <button
                    onClick={() => toggleSection(sectionName)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                    style={{ borderLeft: `4px solid ${cat.color}` }}
                    data-testid={`live-section-toggle-${sectionName.toLowerCase()}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
                      <span className="font-semibold text-base">{sectionName}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs px-2 py-0.5">{sectionItems.length}</Badge>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4">
                      {roomGroupsList.map(([roomName, roomItems]) => (
                        <div key={roomName}>
                          <div className="flex items-center gap-2 py-2 mt-2">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{roomName}</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{roomItems.length}</Badge>
                          </div>
                          <div className="space-y-1.5">
                            {roomItems.map((item) => {
                              const isHighlighted = highlightedItemId === item.id;
                              const costInfo = isItemMissingCostInfo(item);
                              const itemBundle = getBundleForItem(item.id);
                              return (
                                <div
                                  key={item.id}
                                  ref={isHighlighted ? highlightedItemRef : undefined}
                                  className={`py-3 px-3.5 rounded-lg border group transition-colors duration-700 ${isHighlighted ? "bg-teal-50 dark:bg-teal-900/30 border-teal-300 dark:border-teal-700" : "bg-card hover:bg-muted/30"}`}
                                  data-testid={`live-item-${item.id}`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-sm">{item.itemName}</span>
                                      {getResultBadgeForItem(item)}
                                      {itemBundle && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-teal-300 text-teal-700 dark:text-teal-400 gap-0.5 h-5">
                                          <Package className="w-3 h-3" />
                                          {itemBundle.name}
                                        </Badge>
                                      )}
                                      {costInfo.missing && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-600 dark:text-amber-400 gap-0.5 h-5">
                                          <AlertTriangle className="w-3 h-3" />
                                          {costInfo.missingQuote && costInfo.missingCost ? "No quote & cost" : costInfo.missingQuote ? "No quote" : "No cost"}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button className="p-1 rounded hover:bg-muted hover:text-primary" onClick={() => openEditDialog(item)} data-testid={`live-edit-${item.id}`}>
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button className="p-1 rounded hover:bg-muted hover:text-destructive" onClick={() => deleteItemMutation.mutate(item.id)} data-testid={`live-delete-${item.id}`}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {item.description && (
                                    <div className="mt-2">
                                      <StructuredDescription description={item.description} />
                                    </div>
                                  )}

                                  {item.vendorName && (
                                    <div className="mt-2 space-y-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Badge className="text-xs px-1.5 py-0 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-0 h-5">
                                          {item.vendorName}
                                        </Badge>
                                        {item.itemPrice && (
                                          <span className="text-xs text-muted-foreground">Item: ${item.itemPrice}</span>
                                        )}
                                        {item.estimatedCost && (
                                          <span className="text-xs font-semibold text-teal-700 dark:text-teal-400">Total: ${item.estimatedCost} +HST</span>
                                        )}
                                      </div>
                                      {item.vendorLink && (
                                        <a href={item.vendorLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1">
                                          <ExternalLink className="w-3 h-3" /> View product
                                        </a>
                                      )}
                                      {item.handymanQuote && (
                                        <p className="text-xs text-blue-600 dark:text-blue-400 italic">{item.handymanQuote}</p>
                                      )}
                                    </div>
                                  )}

                                  {!item.vendorName && (item.repairQuote || item.estimatedCost) && (
                                    <div className="mt-2 flex items-baseline gap-3 flex-wrap text-sm">
                                      {item.repairQuote && (
                                        <span className="text-muted-foreground"><span className="font-medium">Repair:</span> {item.repairQuote}</span>
                                      )}
                                      {item.estimatedCost && (
                                        <span><span className="font-medium text-muted-foreground">Est. Cost:</span> <span className="font-semibold text-teal-700 dark:text-teal-400">${item.estimatedCost}</span></span>
                                      )}
                                    </div>
                                  )}

                                  {(item.repairOptions as any)?.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      <span className="text-xs font-medium text-muted-foreground">Repair Options:</span>
                                      {(item.repairOptions as { id: string; label: string; vendor?: string; cost: string; description?: string }[]).map((opt, oi) => (
                                        <div key={opt.id || oi} className="flex items-center gap-2 text-xs bg-muted/40 rounded-md px-2.5 py-1.5 border border-border/50">
                                          <span className="text-[10px] font-bold text-teal-600 w-4 shrink-0">{String.fromCharCode(65 + oi)}</span>
                                          <span className="font-medium">{opt.label}</span>
                                          {opt.vendor && <span className="text-muted-foreground">({opt.vendor})</span>}
                                          {opt.cost && <span className="font-semibold text-teal-700 dark:text-teal-400 ml-auto">{opt.cost.startsWith("$") ? opt.cost : `$${opt.cost}`}</span>}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {item.pmOwnerNote && (
                                    <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-md text-xs text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                      <span className="font-medium">Note:</span> {item.pmOwnerNote}
                                    </div>
                                  )}

                                  <OwnerResponseBadge item={item} />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  })();

  if (embedded && splitView) {
    return (
      <div className="flex flex-col h-full" data-testid="split-view-container">
        <div className="md:hidden flex border-b bg-card shrink-0">
          <button
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${mobileSplitTab === "review" ? "text-teal-700 border-b-2 border-teal-600 bg-teal-50/50" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setMobileSplitTab("review")}
            data-testid="mobile-tab-review"
          >
            <ClipboardList className="w-4 h-4 inline mr-1.5" />
            Review & Categorize
          </button>
          <button
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${mobileSplitTab === "report" ? "text-teal-700 border-b-2 border-teal-600 bg-teal-50/50" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setMobileSplitTab("report")}
            data-testid="mobile-tab-report"
          >
            <Eye className="w-4 h-4 inline mr-1.5" />
            Owner Report
          </button>
        </div>

        <div className="md:hidden flex-1 overflow-y-auto p-3">
          {mobileSplitTab === "review" ? reviewTabContent : liveReportPanel}
        </div>

        <div className="hidden md:flex flex-1 min-h-0">
          <div className="flex-1 min-w-0 overflow-y-auto pr-3 pl-2" data-testid="split-view-left">
            <div className="flex items-center gap-2.5 mb-3 px-1 pt-1">
              <ClipboardList className="w-5 h-5 text-teal-600" />
              <h3 className="text-base font-semibold text-foreground">Review & Categorize</h3>
            </div>
            {reviewTabContent}
          </div>
          <div className="w-px bg-border shrink-0" />
          <div className="flex-1 min-w-0 overflow-y-auto pl-3 pr-2" data-testid="split-view-right">
            {liveReportPanel}
          </div>
        </div>
        {dialogs}
      </div>
    );
  }

  if (embedded) {
    return (
      <div>
        {activeTab === "review" && reviewTabContent}
        {activeTab === "report" && reportTabContent}
        {activeTab === "responses" && responsesTabContent}
        {dialogs}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation(`/pm/inspection/${inspectionId}`)}
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold" data-testid="text-page-title">
                  Owner Report Builder
                </h1>
                <p className="text-sm text-muted-foreground">
                  {unit ? `${unit.propertyName} - ${unit.unitNumber}` : "Unknown Unit"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="gap-1" data-testid="badge-progress">
                <CheckCircle2 className="w-3 h-3" />
                {categorizedCount}/{totalItems} categorized
              </Badge>
              {report && (
                <>
                  <Button variant="outline" size="sm" onClick={() => window.open(`/api/owner-reports/${report.id}/pdf`, "_blank")} data-testid="button-download-pdf">
                    <Download className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">PDF</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyShareLink} data-testid="button-copy-link">
                    {linkCopied ? <Check className="w-4 h-4 mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
                    <span className="hidden sm:inline">{linkCopied ? "Copied" : "Share Link"}</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-full sm:max-w-md" data-testid="tabs-main">
            <TabsTrigger value="review" data-testid="tab-review">
              <FileText className="w-4 h-4 mr-2" />
              Review & Categorize
            </TabsTrigger>
            <TabsTrigger value="report" data-testid="tab-report">
              <Eye className="w-4 h-4 mr-2" />
              Owner Report
            </TabsTrigger>
          </TabsList>

          <TabsContent value="review" className="space-y-4">
            {reviewTabContent}
          </TabsContent>

          <TabsContent value="report" className="space-y-6">
            {reportTabContent}
          </TabsContent>
        </Tabs>
      </div>

      {dialogs}
    </div>
  );
}

export default function OwnerReportBuilderPage() {
  const [, params] = useRoute("/pm/owner-report/:inspectionId");
  const [, setLocation] = useLocation();
  const inspectionId = params?.inspectionId;

  useEffect(() => {
    if (inspectionId) {
      setLocation(`/pm/inspection/${inspectionId}?phase=1`);
    }
  }, [inspectionId, setLocation]);

  if (!inspectionId) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="p-6 text-center">
      <p className="text-muted-foreground">Redirecting to inspection report...</p>
    </div>
  );
}
