import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  MessageSquare,
  Shield,
  Eye,
  Package,
  DollarSign,
  Send,
  Check,
  X,
  Play,
  ExternalLink,
  AlertTriangle,
  ClipboardCheck,
  Building2,
  CalendarDays,
  Circle,
  Camera,
  Wrench,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type {
  OwnerReportBundle,
  IssueCategory,
  OwnerResponseType,
} from "@shared/schema";

const RESPONSE_OPTIONS: {
  value: OwnerResponseType;
  label: string;
  shortLabel: string;
  missingOnly?: boolean;
  repairOnly?: boolean;
}[] = [
  { value: "LEAVE_AS_IS", label: "Leave as is", shortLabel: "Leave" },
  { value: "ILL_REPLACE", label: "I'll handle it", shortLabel: "I'll handle" },
  { value: "PLEASE_FIX", label: "Please fix", shortLabel: "Fix", repairOnly: true },
  { value: "PROCEED_PURCHASE", label: "Proceed with purchase", shortLabel: "Purchase", missingOnly: true },
];

function parseCostRange(cost: string | null | undefined): { min: number; max: number } {
  if (!cost) return { min: 0, max: 0 };
  if (cost.includes(" - ")) {
    const parts = cost.split(" - ");
    const minMatch = parts[0].match(/[\d,.]+/);
    const maxMatch = parts[parts.length - 1].match(/[\d,.]+/);
    return {
      min: minMatch ? parseFloat(minMatch[0].replace(/,/g, "")) || 0 : 0,
      max: maxMatch ? parseFloat(maxMatch[0].replace(/,/g, "")) || 0 : 0,
    };
  }
  const match = cost.match(/[\d,.]+/);
  const val = match ? parseFloat(match[0].replace(/,/g, "")) || 0 : 0;
  return { min: val, max: val };
}

function formatCost(amount: number): string {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function ImageLightbox({ src, alt, open, onClose, allUrls, onNavigate }: { src: string; alt: string; open: boolean; onClose: () => void; allUrls?: string[]; onNavigate?: (url: string) => void }) {
  if (!open) return null;
  const isVideo = src.match(/\.(mp4|mov|webm)$/i);
  const currentIndex = allUrls?.indexOf(src) ?? -1;
  const hasPrev = allUrls && currentIndex > 0;
  const hasNext = allUrls && currentIndex < (allUrls.length - 1);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
        data-testid="lightbox-close"
      >
        <X className="w-5 h-5 text-white" />
      </button>

      {allUrls && allUrls.length > 1 && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-10 text-white/60 text-[13px] font-medium">
          {currentIndex + 1} / {allUrls.length}
        </div>
      )}

      {hasPrev && onNavigate && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onNavigate(allUrls[currentIndex - 1]); }}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
      )}
      {hasNext && onNavigate && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onNavigate(allUrls[currentIndex + 1]); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      )}

      <div className="relative z-10" onClick={(e) => e.stopPropagation()}>
        {isVideo ? (
          <video src={src} controls autoPlay className="max-w-[85vw] max-h-[85vh] rounded-2xl shadow-2xl" style={{ aspectRatio: "9/16", objectFit: "contain", maxWidth: "min(85vw, 420px)" }} />
        ) : (
          <img src={src} alt={alt} className="max-h-[85vh] rounded-2xl shadow-2xl object-contain" style={{ maxWidth: "min(85vw, 520px)" }} />
        )}
      </div>
    </div>
  );
}

function MediaThumbs({ urls, itemName }: { urls: string[]; itemName: string }) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  if (!urls || urls.length === 0) return null;

  return (
    <>
      <div className="flex gap-1.5 flex-wrap mt-2">
        {urls.map((url, i) => {
          const isVideo = url.match(/\.(mp4|mov|webm)$/i);
          return (
            <button
              key={i}
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightboxUrl(url); }}
              className="relative w-14 h-14 rounded-lg overflow-hidden bg-[#f3f4f6] border border-[#e5e7eb] hover:border-teal-400 transition-all cursor-pointer group"
              data-testid={`media-thumb-${i}`}
            >
              {isVideo ? (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                  <Play className="w-4 h-4 text-white/80" />
                </div>
              ) : (
                <img src={url} alt={`${itemName} ${i + 1}`} className="w-full h-full object-cover" />
              )}
            </button>
          );
        })}
      </div>
      <ImageLightbox
        src={lightboxUrl || ""}
        alt={itemName}
        open={!!lightboxUrl}
        onClose={() => setLightboxUrl(null)}
        allUrls={urls}
        onNavigate={setLightboxUrl}
      />
    </>
  );
}

function ItemMediaPreview({ urls, itemName }: { urls: string[]; itemName: string }) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const firstImageUrl = urls.find(u => !u.match(/\.(mp4|mov|webm)$/i));
  const firstVideoUrl = urls.find(u => !!u.match(/\.(mp4|mov|webm)$/i));
  const previewUrl = firstImageUrl || null;
  const hasVideo = !!firstVideoUrl;
  const extraCount = urls.length - 1;

  return (
    <>
      <div className="w-[90px] h-[90px] sm:w-[100px] sm:h-[100px] shrink-0 m-3 mr-0 relative">
        {previewUrl ? (
          <button
            type="button"
            onClick={() => setLightboxUrl(previewUrl)}
            className="w-full h-full rounded-xl overflow-hidden cursor-pointer bg-[#f3f4f6]"
            data-testid={`media-preview-${itemName}`}
          >
            <img src={previewUrl} alt={itemName} className="w-full h-full object-cover" />
          </button>
        ) : hasVideo ? (
          <button
            type="button"
            onClick={() => setLightboxUrl(firstVideoUrl!)}
            className="w-full h-full rounded-xl overflow-hidden bg-slate-800 flex items-center justify-center cursor-pointer"
            data-testid={`media-preview-video-${itemName}`}
          >
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
            </div>
          </button>
        ) : null}

        {extraCount > 0 && (
          <button
            type="button"
            onClick={() => setLightboxUrl(urls[1] || urls[0])}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#1f2937] text-white text-[11px] font-bold flex items-center justify-center shadow-md border-2 border-white"
            data-testid={`media-count-${itemName}`}
          >
            +{extraCount}
          </button>
        )}

        {hasVideo && previewUrl && (
          <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
            <Play className="w-2.5 h-2.5 text-white ml-px" fill="white" />
          </div>
        )}
      </div>

      <ImageLightbox
        src={lightboxUrl || ""}
        alt={itemName}
        open={!!lightboxUrl}
        onClose={() => setLightboxUrl(null)}
        allUrls={urls}
        onNavigate={setLightboxUrl}
      />
    </>
  );
}

function NoMediaPlaceholder() {
  return (
    <div className="w-[90px] h-[90px] sm:w-[100px] sm:h-[100px] shrink-0 m-3 mr-0 rounded-xl bg-[#f3f4f6] border border-[#e5e7eb] flex flex-col items-center justify-center">
      <Camera className="w-5 h-5 text-[#d1d5db]" />
      <span className="text-[9px] text-[#9ca3af] mt-1 font-medium">No visual</span>
    </div>
  );
}

function parseDescription(desc: string | null | undefined): { condition?: string; issues?: string; action?: string; notes?: string; exists?: string; working?: string; location?: string; count?: string } {
  if (!desc || desc === "GOOD") return {};
  const result: any = {};
  const condMatch = desc.match(/Condition:\s*([^.]+)\./i);
  if (condMatch) result.condition = condMatch[1].trim();
  const issueMatch = desc.match(/Issues:\s*([^.]+)\./i);
  if (issueMatch) result.issues = issueMatch[1].trim();
  const actionMatch = desc.match(/Action:\s*([^.]+)\./i);
  if (actionMatch) result.action = actionMatch[1].trim();
  const existsMatch = desc.match(/Exists:\s*([^.]+)\./i);
  if (existsMatch) result.exists = existsMatch[1].trim();
  const workingMatch = desc.match(/Working:\s*([^.]+)\./i);
  if (workingMatch) result.working = workingMatch[1].trim();
  const locationMatch = desc.match(/Location:\s*([^.]+)\./i);
  if (locationMatch) result.location = locationMatch[1].trim();
  const countMatch = desc.match(/Count:\s*([^.,]+)/i);
  if (countMatch) result.count = countMatch[1].trim();
  const notesMatch = desc.match(/Notes:\s*(.+)/i);
  if (notesMatch) result.notes = notesMatch[1].trim();
  if (!result.condition && !result.issues && !result.action && !result.notes && !result.exists && !result.working && !result.location) {
    result.notes = desc;
  }
  return result;
}

export function OwnerReportContent({ reportId, onBack, sidebarWidth }: { reportId: string; onBack: () => void; sidebarWidth?: string }) {
  const { toast } = useToast();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [responseMap, setResponseMap] = useState<Map<string, string | null>>(new Map());
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [highlightedBundleItemId, setHighlightedBundleItemId] = useState<string | null>(null);
  const [noteItemId, setNoteItemId] = useState<string | null>(null);
  const [itemNote, setItemNote] = useState("");
  const [openBundleId, setOpenBundleId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bundleHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToItem = useCallback((itemId: string, catName: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.add(catName);
      return next;
    });
    setTimeout(() => {
      const el = document.querySelector(`[data-testid="issue-item-${itemId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedItemId(itemId);
        if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = setTimeout(() => setHighlightedItemId(null), 2000);
      }
    }, 100);
  }, []);

  const scrollToBundleItem = useCallback((itemId: string, bundleId: string) => {
    const bundleEl = document.querySelector(`[data-testid="bundle-card-${bundleId}"]`);
    if (bundleEl) {
      bundleEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setHighlightedBundleItemId(itemId);
    if (bundleHighlightTimerRef.current) clearTimeout(bundleHighlightTimerRef.current);
    bundleHighlightTimerRef.current = setTimeout(() => setHighlightedBundleItemId(null), 2000);
  }, []);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/owner/reports", reportId],
    enabled: !!reportId,
    queryFn: async () => {
      const res = await fetch(`/api/owner/reports/${reportId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("jwt_token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch report");
      return res.json();
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ itemId, response }: { itemId: string; response: OwnerResponseType }) => {
      const token = data?.report?.shareToken;
      if (!token) throw new Error("No share token");
      await apiRequest("POST", `/api/public/owner-report/${token}/items/${itemId}/respond`, { ownerResponse: response });
    },
    onSuccess: (_data, variables) => {
      setResponseMap(prev => {
        const next = new Map(prev);
        next.set(variables.itemId, variables.response);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/reports", reportId] });
    },
  });

  const handleResponse = useCallback((itemId: string, response: OwnerResponseType) => {
    setResponseMap(prev => {
      const next = new Map(prev);
      next.set(itemId, response);
      return next;
    });
    respondMutation.mutate({ itemId, response });
  }, [respondMutation]);

  useEffect(() => {
    if (data?.items) {
      setResponseMap(prev => {
        const next = new Map(prev);
        data.items.forEach((item: any) => {
          if (item.ownerResponse && !next.has(item.id)) {
            next.set(item.id, item.ownerResponse);
          }
          if (item.ownerResponse && next.get(item.id) !== item.ownerResponse) {
            if (!respondMutation.isPending) {
              next.set(item.id, item.ownerResponse);
            }
          }
        });
        return next;
      });
    }
  }, [data]);

  useEffect(() => {
    if (data?.categories) {
      const catNames = data.categories
        .filter((c: any) => c.name !== "Good")
        .map((c: any) => c.name);
      setExpandedCategories(new Set(catNames));
    }
  }, [data]);

  const items: Array<{ categoryId?: string; [key: string]: unknown }> = data?.items || [];
  const categories: IssueCategory[] = data?.categories || [];
  const bundles: OwnerReportBundle[] = data?.bundles || [];

  const categoryMap = useMemo(
    () => new Map<string, IssueCategory>(categories.map((c) => [c.id, c])),
    [categories],
  );

  const bundleMap = useMemo(() => {
    const m = new Map<string, OwnerReportBundle>();
    bundles.forEach((b: OwnerReportBundle) => m.set(b.id, b));
    return m;
  }, [bundles]);

  const bundleItemsMap = useMemo(() => {
    const m = new Map<string, any[]>();
    items.forEach((item: any) => {
      if (item.bundleId) {
        if (!m.has(item.bundleId)) m.set(item.bundleId, []);
        m.get(item.bundleId)!.push(item);
      }
    });
    return m;
  }, [items]);

  const goodResults = ["PASS", "GOOD", "YES", "OK"];
  const isGoodItem = (item: any) => item.checklistResult && goodResults.includes(item.checklistResult);

  const issueItems = items.filter((item: any) => !isGoodItem(item));

  const groupedByCategory: Record<string, any[]> = {};
  for (const item of issueItems) {
    if (!item.categoryId) continue;
    const cat = categoryMap.get(item.categoryId);
    const catName = cat?.name || "Other";
    if (!groupedByCategory[catName]) groupedByCategory[catName] = [];
    groupedByCategory[catName].push(item);
  }

  const actionableCategories = ["Damage", "Cosmetic", "Missing", "Replacement", "Cleaning"];
  const orderedCategories = actionableCategories.filter(name => (groupedByCategory[name]?.length || 0) > 0);
  const otherCategories = Object.keys(groupedByCategory).filter(n => !actionableCategories.includes(n) && n !== "Good");
  const allVisibleCategories = [...orderedCategories, ...otherCategories];

  const totalIssueItems = allVisibleCategories.reduce((sum, cat) => sum + (groupedByCategory[cat]?.length || 0), 0);

  const { totalMin, totalMax, selectedCount, hasHST, respondedCount } = useMemo(() => {
    let tMin = 0, tMax = 0, count = 0, hst = false, responded = 0;
    const processedBundles = new Set<string>();

    issueItems.forEach((item: any) => {
      const response = responseMap.get(item.id) ?? item.ownerResponse;
      if (response) responded++;
      if (response !== "PLEASE_FIX" && response !== "PROCEED_PURCHASE") return;

      if (item.bundleId && !processedBundles.has(item.bundleId)) {
        processedBundles.add(item.bundleId);
        const bundle = bundleMap.get(item.bundleId);
        if (bundle?.estimatedCost) {
          const range = parseCostRange(bundle.estimatedCost);
          tMin += range.min;
          tMax += range.max;
          if (bundle.estimatedCost.toLowerCase().includes("hst")) hst = true;
        }
      }

      if (!item.bundleId && item.estimatedCost) {
        const range = parseCostRange(item.estimatedCost);
        tMin += range.min;
        tMax += range.max;
        if (item.estimatedCost.toLowerCase().includes("hst")) hst = true;
      }

      count++;
    });

    return { totalMin: tMin, totalMax: tMax, selectedCount: count, hasHST: hst, respondedCount: responded };
  }, [issueItems, responseMap, bundleMap]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-[#9ca3af]" />
          <p className="text-[13px] text-[#9ca3af]">Loading report...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-sm w-full border border-[#e5e7eb] rounded-2xl p-10 text-center bg-white">
          <FileText className="h-8 w-8 mx-auto text-[#d1d5db] mb-3" />
          <h2 className="text-[15px] font-semibold text-[#1f2937]">Report Not Found</h2>
          <p className="text-[13px] text-[#9ca3af] mt-1">This report may not be published yet.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={onBack}>Back</Button>
        </div>
      </div>
    );
  }

  const { report, unit, task } = data;
  const ownerName = data.ownerName || "Owner";

  const toggleCategory = (name: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const inspectionType = task?.type === "ONBOARDING" ? "Onboarding Inspection" : "Post-Stay Inspection";
  const inspectionDate = task?.createdAt
    ? new Date(task.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "";

  const getCategoryIcon = (name: string) => {
    switch (name) {
      case "Damage": return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "Cosmetic": return <Eye className="w-4 h-4 text-amber-500" />;
      case "Missing": return <Package className="w-4 h-4 text-violet-500" />;
      case "Replacement": return <ClipboardCheck className="w-4 h-4 text-blue-500" />;
      case "Cleaning": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      default: return <Circle className="w-4 h-4 text-[#9ca3af]" />;
    }
  };

  const getCategoryColor = (name: string) => {
    switch (name) {
      case "Damage": return { badge: "bg-red-100 text-red-700", accent: "border-l-red-500" };
      case "Cosmetic": return { badge: "bg-amber-100 text-amber-700", accent: "border-l-amber-500" };
      case "Missing": return { badge: "bg-violet-100 text-violet-700", accent: "border-l-violet-500" };
      case "Replacement": return { badge: "bg-blue-100 text-blue-700", accent: "border-l-blue-500" };
      case "Cleaning": return { badge: "bg-emerald-100 text-emerald-700", accent: "border-l-emerald-500" };
      default: return { badge: "bg-[#f3f4f6] text-[#6b7280]", accent: "border-l-[#9ca3af]" };
    }
  };

  const getResponseStyle = (value: string | null) => {
    switch (value) {
      case "PLEASE_FIX": return "bg-amber-50 text-amber-700 border-amber-300 ring-1 ring-amber-200";
      case "PROCEED_PURCHASE": return "bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-200";
      case "ILL_REPLACE": return "bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-200";
      case "LEAVE_AS_IS": return "bg-[#f3f4f6] text-[#6b7280] border-[#d1d5db] ring-1 ring-[#e5e7eb]";
      default: return "bg-white text-[#6b7280] border-[#e5e7eb]";
    }
  };

  const formatConditionDisplay = (parsed: any, item: any) => {
    const parts: string[] = [];
    if (parsed.condition) parts.push(`Condition: ${parsed.condition}`);
    if (parsed.working) parts.push(`Working: ${parsed.working}`);
    if (parsed.exists) parts.push(`Exists: ${parsed.exists}`);
    if (parsed.location) parts.push(`Location: ${parsed.location}`);
    if (parsed.issues) parts.push(`Issues: ${parsed.issues}`);
    if (parsed.action) parts.push(`Action: ${parsed.action}`);
    if (parsed.notes) parts.push(parsed.notes);
    if (parts.length === 0 && item.description) return item.description;
    return parts.join(". ");
  };

  const renderItemCard = (item: any) => {
    const mediaUrls = (item.mediaUrls || []) as string[];
    const currentResponse = responseMap.get(item.id) ?? item.ownerResponse;
    const parsed = parseDescription(item.description);
    const isInBundle = !!item.bundleId;
    const bundle = isInBundle ? bundleMap.get(item.bundleId) : null;
    const cat = categoryMap.get(item.categoryId);
    const catName = cat?.name || "";

    const isMissingOrReplacement = catName === "Missing" || catName === "Replacement";
    const options = RESPONSE_OPTIONS.filter(opt => {
      if (opt.missingOnly && !isMissingOrReplacement) return false;
      if (opt.repairOnly && isMissingOrReplacement) return false;
      return true;
    });

    const isApproved = currentResponse === "PLEASE_FIX" || currentResponse === "PROCEED_PURCHASE";
    const conditionText = formatConditionDisplay(parsed, item);

    return (
      <div
        key={item.id}
        className={`bg-white transition-all duration-500 relative rounded-xl overflow-hidden ${isApproved ? "ring-1 ring-teal-200" : "border border-[#e5e7eb]"} ${highlightedItemId === item.id ? "ring-2 ring-teal-400 bg-teal-50/30" : ""} ${isInBundle ? "cursor-pointer" : ""}`}
        data-testid={`issue-item-${item.id}`}
        onClick={isInBundle && item.bundleId ? () => scrollToBundleItem(item.id, item.bundleId) : undefined}
      >
        <div className="flex items-stretch">
          {mediaUrls.length > 0 ? (
            <ItemMediaPreview urls={mediaUrls} itemName={item.itemName} />
          ) : (
            <NoMediaPlaceholder />
          )}

          <div className="flex-1 min-w-0 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[15px] font-semibold text-[#1f2937]">{item.itemName}</span>
                  {item.roomName && (
                    <span className="text-[12px] text-[#9ca3af] font-medium bg-[#f3f4f6] px-1.5 py-0.5 rounded">{item.roomName}</span>
                  )}
                  {item.priority === "HIGH" && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded font-semibold uppercase tracking-wide">High Priority</span>
                  )}
                  {isInBundle && bundle && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-teal-50 text-teal-600 border border-teal-100 rounded font-medium">
                      {bundle.name}
                    </span>
                  )}
                </div>

                {conditionText && (
                  <p className="mt-1.5 text-[13px] text-[#4b5563] leading-relaxed">
                    {conditionText}
                  </p>
                )}

                {item.repairQuote && (
                  <div className="mt-2 text-[12px] text-[#6b7280] bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-relaxed">
                    <span className="font-semibold text-amber-700">Repair estimate: </span>
                    {item.repairQuote}
                  </div>
                )}

                {item.pmOwnerNote && (
                  <div className="flex items-start gap-2 text-[12px] text-[#4b5563] mt-2 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2">
                    <MessageSquare className="h-3.5 w-3.5 mt-0.5 text-teal-500 shrink-0" />
                    <span>{item.pmOwnerNote}</span>
                  </div>
                )}

                {item.vendorName && (
                  <div className="mt-2 flex items-center gap-2 text-[13px]">
                    <span className="font-semibold text-[#1f2937]">{item.vendorName}</span>
                    {item.vendorLink && (
                      <a href={item.vendorLink} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:text-teal-700 font-semibold inline-flex items-center gap-1 underline underline-offset-2">
                        View product <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {item.itemPrice && (
                      <span className="text-[12px] text-[#6b7280]">${item.itemPrice}</span>
                    )}
                  </div>
                )}

                {item.handymanCost && (
                  <div className="mt-1 text-[12px] text-[#6b7280]">
                    <span className="font-medium">Handyman service: </span>${item.handymanCost}
                  </div>
                )}
                {item.vendorServiceFee && (
                  <div className="mt-0.5 text-[12px] text-[#6b7280]">
                    <span className="font-medium">Service fee: </span>$50
                  </div>
                )}
              </div>

              {item.estimatedCost && !isInBundle && (
                <div className="text-right shrink-0">
                  <span className="text-[17px] font-bold text-[#1f2937] whitespace-nowrap">${item.estimatedCost}</span>
                </div>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-[#f3f4f6]">
              {!isInBundle && (
                <div className="flex flex-wrap items-center gap-2">
                  {options.map(opt => {
                    const isSelected = currentResponse === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleResponse(item.id, opt.value)}
                        className={`px-3.5 py-2 rounded-lg text-[12px] font-medium border transition-all ${
                          isSelected
                            ? getResponseStyle(opt.value)
                            : "bg-white text-[#6b7280] border-[#e5e7eb] hover:border-[#d1d5db] hover:bg-[#f9fafb]"
                        }`}
                        data-testid={`response-${opt.value}-${item.id}`}
                      >
                        {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                        {opt.shortLabel}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setNoteItemId(noteItemId === item.id ? null : item.id)}
                    className="px-2.5 py-2 rounded-lg text-[11px] font-medium text-[#9ca3af] hover:text-teal-600 hover:bg-teal-50 transition-colors"
                    data-testid={`add-note-${item.id}`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
                    Note
                  </button>
                </div>
              )}

              {isInBundle && currentResponse && (
                <div className="inline-flex items-center gap-1 text-[12px] font-medium text-teal-600">
                  <Check className="w-3.5 h-3.5" />
                  {RESPONSE_OPTIONS.find(o => o.value === currentResponse)?.shortLabel}
                </div>
              )}

              {noteItemId === item.id && (
                <div className="mt-2">
                  <Textarea
                    value={itemNote}
                    onChange={(e) => setItemNote(e.target.value)}
                    placeholder="Add a note for your property manager..."
                    className="min-h-[60px] text-[13px] resize-none bg-[#f9fafb] border-[#e5e7eb] text-[#1f2937] placeholder:text-[#9ca3af]"
                    data-testid={`note-input-${item.id}`}
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <Button variant="ghost" size="sm" onClick={() => { setNoteItemId(null); setItemNote(""); }} className="text-[12px] h-8">Cancel</Button>
                    <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-[12px] h-8 gap-1" onClick={() => {
                      toast({ title: "Note sent", description: `Your note about ${item.itemName} has been sent.` });
                      setNoteItemId(null);
                      setItemNote("");
                    }} data-testid={`send-note-${item.id}`}>
                      <Send className="w-3 h-3" /> Send
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="pb-20" data-testid="owner-report-view">
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="text-[#6b7280] hover:text-[#374151] h-8 w-8 rounded-lg"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-[13px] text-[#9ca3af]">Back to reports</span>
      </div>

      <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden mb-6" data-testid="report-header">
        <div className="px-5 py-5">
          <p className="text-[15px] text-[#374151] leading-relaxed">
            Hi <span className="font-semibold text-[#1f2937]">{ownerName}</span>,
          </p>
          <p className="text-[13px] text-[#9ca3af] mt-2 leading-relaxed">
            Following the inspection of your unit, we've identified items that need your attention.
            Review each item and select your preferred action. Costs are added to your total when you select "Please fix" or "Proceed with purchase."
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-[#f3f4f6]">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-[#9ca3af]" />
              <div>
                <p className="text-[10px] text-[#9ca3af] uppercase tracking-wider font-medium">Unit</p>
                <p className="text-[13px] font-semibold text-[#1f2937]">{unit?.propertyName || unit?.unitNumber || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <CalendarDays className="w-4 h-4 text-[#9ca3af]" />
              <div>
                <p className="text-[10px] text-[#9ca3af] uppercase tracking-wider font-medium">Date</p>
                <p className="text-[13px] font-semibold text-[#1f2937]">{inspectionDate || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              {task?.type === "ONBOARDING" ? <Shield className="w-4 h-4 text-indigo-500" /> : <Eye className="w-4 h-4 text-teal-500" />}
              <div>
                <p className="text-[10px] text-[#9ca3af] uppercase tracking-wider font-medium">Type</p>
                <p className="text-[13px] font-semibold text-[#1f2937]">{inspectionType}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <div>
                <p className="text-[10px] text-[#9ca3af] uppercase tracking-wider font-medium">Issues</p>
                <p className="text-[13px] font-semibold text-[#1f2937]">{totalIssueItems}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        <div className="flex-1 min-w-0 space-y-4">
          {allVisibleCategories.map(catName => {
            const catItems = groupedByCategory[catName] || [];
            const isExpanded = expandedCategories.has(catName);
            const colors = getCategoryColor(catName);

            return (
              <div key={catName} data-testid={`category-section-${catName}`}>
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-3 bg-white border border-[#e5e7eb] hover:bg-[#f9fafb] transition-colors"
                  onClick={() => toggleCategory(catName)}
                  style={isExpanded ? { borderRadius: '12px 12px 0 0' } : { borderRadius: '12px' }}
                >
                  <div className="flex items-center gap-3">
                    {getCategoryIcon(catName)}
                    <span className="text-[15px] font-semibold text-[#1f2937]">{catName}</span>
                    <Badge className={`text-[11px] px-1.5 py-0 ${colors.badge} border-0`}>
                      {catItems.length}
                    </Badge>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-[#9ca3af]" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-[#9ca3af]" />
                  )}
                </button>

                {isExpanded && (
                  <div className="bg-[#f9fafb] border border-t-0 border-[#e5e7eb] rounded-b-xl p-3 space-y-3">
                    {catItems.map((item: any) => renderItemCard(item))}
                  </div>
                )}
              </div>
            );
          })}

        </div>

        <div className="w-full lg:w-[320px] shrink-0">
          <div className="lg:sticky lg:top-6 space-y-4">
            <div className="bg-white border border-[#e5e7eb] rounded-xl p-5" data-testid="cost-summary-panel">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-4 h-4 text-teal-600" />
                <h3 className="text-[14px] font-semibold text-[#1f2937]">Cost Summary</h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#9ca3af]">Items reviewed</span>
                  <span className="text-[13px] font-semibold text-[#374151]">{respondedCount}/{totalIssueItems}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#9ca3af]">Items to fix/purchase</span>
                  <span className="text-[13px] font-semibold text-teal-700">{selectedCount}</span>
                </div>
                <div className="h-px bg-[#f3f4f6]" />
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-[#374151]">Estimated Total</span>
                  {(totalMax > 0 || totalMin > 0) ? (
                    <span className="text-[18px] font-bold text-[#1f2937]" data-testid="text-running-total">
                      {totalMin !== totalMax ? `$${formatCost(totalMin)} – $${formatCost(totalMax)}` : `$${formatCost(totalMax)}`}
                      {hasHST && <span className="text-[11px] text-[#9ca3af] font-normal ml-1">+HST</span>}
                    </span>
                  ) : (
                    <span className="text-[13px] text-[#9ca3af]">$0</span>
                  )}
                </div>
              </div>

            </div>

            {bundles.length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-3 px-1">Service Packages</h3>
                <div className="space-y-3">
                  {bundles.map((bundle: OwnerReportBundle) => {
                    const bItems = bundleItemsMap.get(bundle.id) || [];
                    return (
                      <div
                        key={bundle.id}
                        className="bg-white border border-[#e5e7eb] rounded-xl p-4 hover:border-teal-200 transition-colors"
                        data-testid={`bundle-card-${bundle.id}`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                              <Package className="w-4 h-4 text-teal-600" />
                            </div>
                            <div>
                              <p className="text-[13px] font-semibold text-[#1f2937]">{bundle.name}</p>
                              <p className="text-[11px] text-[#9ca3af]">{bItems.length} item{bItems.length !== 1 ? "s" : ""}</p>
                            </div>
                          </div>
                        </div>

                        {bundle.estimatedCost && (
                          <p className="text-[16px] font-bold text-teal-700 mb-1">${bundle.estimatedCost}</p>
                        )}

                        {bundle.repairQuote && (
                          <p className="text-[11px] text-[#6b7280] mb-3 leading-relaxed">{bundle.repairQuote}</p>
                        )}

                        <div className="space-y-1 mb-3">
                          {bItems.map((item: any) => {
                            const r = responseMap.get(item.id) ?? item.ownerResponse;
                            const itemCat = categoryMap.get(item.categoryId);
                            const itemCatName = itemCat?.name || "Other";
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => scrollToItem(item.id, itemCatName)}
                                className={`w-full flex items-center justify-between text-[12px] py-1.5 px-2.5 rounded transition-all cursor-pointer text-left ${highlightedBundleItemId === item.id ? "bg-teal-100 ring-2 ring-teal-400 text-teal-800 font-medium" : "bg-[#f9fafb] hover:bg-teal-50 hover:text-teal-700"}`}
                                data-testid={`bundle-item-link-${item.id}`}
                              >
                                <span className="text-[#6b7280] truncate">{item.roomName} — {item.itemName}</span>
                                {r && (
                                  <span className={r === "PLEASE_FIX" || r === "PROCEED_PURCHASE" ? "text-teal-600 font-medium" : "text-[#9ca3af]"}>
                                    {r === "PLEASE_FIX" || r === "PROCEED_PURCHASE" ? "✓" : "—"}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => setOpenBundleId(bundle.id)}
                          className="w-full flex items-center justify-center gap-1.5 text-[12px] font-medium text-teal-600 hover:text-teal-700 py-2 border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors"
                          data-testid={`bundle-details-${bundle.id}`}
                        >
                          <Eye className="w-3.5 h-3.5" /> More details
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {openBundleId && (() => {
              const bundle = bundles.find((b: OwnerReportBundle) => b.id === openBundleId);
              if (!bundle) return null;
              const bItems = bundleItemsMap.get(bundle.id) || [];

              const quoteParts: { label: string; detail: string }[] = [];
              if (bundle.repairQuote) {
                const parts = bundle.repairQuote.split(/\.\s*/);
                parts.forEach((p: string) => {
                  const trimmed = p.trim();
                  if (!trimmed) return;
                  const colonIdx = trimmed.indexOf(":");
                  if (colonIdx > 0 && colonIdx < 40) {
                    quoteParts.push({ label: trimmed.substring(0, colonIdx).trim(), detail: trimmed.substring(colonIdx + 1).trim() });
                  } else {
                    quoteParts.push({ label: "", detail: trimmed });
                  }
                });
              }

              return (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setOpenBundleId(null)}>
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                  <div
                    className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-6 pt-5 pb-4 border-b border-[#f3f4f6]">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                            <Wrench className="w-5 h-5 text-teal-600" />
                          </div>
                          <div>
                            <h2 className="text-[16px] font-bold text-[#1f2937]">{bundle.name}</h2>
                            <p className="text-[12px] text-[#9ca3af]">{bItems.length} item{bItems.length !== 1 ? "s" : ""} included</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setOpenBundleId(null)}
                          className="w-8 h-8 rounded-lg hover:bg-[#f3f4f6] flex items-center justify-center transition-colors"
                          data-testid="close-bundle-popup"
                        >
                          <X className="w-4 h-4 text-[#6b7280]" />
                        </button>
                      </div>

                      {bundle.estimatedCost && (
                        <div className="mt-3 flex items-baseline gap-2">
                          <span className="text-[22px] font-bold text-teal-700">${bundle.estimatedCost}</span>
                          <span className="text-[12px] text-[#9ca3af]">+HST</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                      {quoteParts.length > 0 && (
                        <div className="bg-[#f9fafb] rounded-xl p-4 space-y-2">
                          <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">Quote Details</p>
                          {quoteParts.map((part, i) => (
                            <div key={i} className="flex items-start gap-2 text-[13px]">
                              {part.label ? (
                                <>
                                  <span className="font-semibold text-[#374151] shrink-0">{part.label}:</span>
                                  <span className="text-[#6b7280]">{part.detail}</span>
                                </>
                              ) : (
                                <span className="text-[#6b7280]">{part.detail}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div>
                        <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-3">Items in this package</p>
                        {(() => {
                          const grouped = new Map<string, { cat: IssueCategory | undefined; items: any[] }>();
                          bItems.forEach((item: any) => {
                            const itemCat = categoryMap.get(item.categoryId);
                            const catName = itemCat?.name || "Other";
                            if (!grouped.has(catName)) grouped.set(catName, { cat: itemCat, items: [] });
                            grouped.get(catName)!.items.push(item);
                          });
                          return Array.from(grouped.entries()).map(([catName, { cat, items: catItems }]) => (
                            <div key={catName} className="mb-4 last:mb-0">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat?.color || "#9ca3af" }} />
                                <span className="text-[12px] font-semibold" style={{ color: cat?.color || "#6b7280" }}>{catName}</span>
                                <span className="text-[11px] text-[#9ca3af]">({catItems.length})</span>
                              </div>
                              <div className="space-y-2">
                                {catItems.map((item: any) => {
                                  const parsed = parseDescription(item.description);
                                  const r = responseMap.get(item.id) ?? item.ownerResponse;
                                  return (
                                    <div
                                      key={item.id}
                                      className="bg-white border border-[#e5e7eb] rounded-xl p-3.5 hover:border-teal-200 transition-colors"
                                      data-testid={`bundle-popup-item-${item.id}`}
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[14px] font-semibold text-[#1f2937]">{item.itemName}</span>
                                            {item.roomName && (
                                              <span className="text-[11px] text-[#9ca3af] bg-[#f3f4f6] px-1.5 py-0.5 rounded">{item.roomName}</span>
                                            )}
                                          </div>
                                          {item.description && (
                                            <p className="mt-1 text-[12px] text-[#6b7280] leading-relaxed">
                                              {formatConditionDisplay(parsed, item)}
                                            </p>
                                          )}
                                        </div>
                                        {r && (
                                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                                            r === "PLEASE_FIX" || r === "PROCEED_PURCHASE"
                                              ? "bg-teal-50 text-teal-700"
                                              : r === "LEAVE_AS_IS" ? "bg-[#f3f4f6] text-[#9ca3af]"
                                              : "bg-blue-50 text-blue-700"
                                          }`}>
                                            {RESPONSE_OPTIONS.find(o => o.value === r)?.shortLabel || r}
                                          </span>
                                        )}
                                      </div>
                                      {(item.mediaUrls || []).length > 0 && (
                                        <div className="mt-2">
                                          <MediaThumbs urls={item.mediaUrls} itemName={item.itemName} />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    <div className="px-6 py-4 border-t border-[#f3f4f6] bg-[#f9fafb]">
                      <Button
                        className="w-full bg-teal-600 hover:bg-teal-700 h-10 text-[13px] font-semibold"
                        onClick={() => setOpenBundleId(null)}
                        data-testid="close-bundle-popup-btn"
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      <div
        className="fixed bottom-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-[#e5e7eb] shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
        style={{ left: sidebarWidth || "0px" }}
        data-testid="sticky-total-bar"
      >
        <div className="w-full px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[13px] text-[#6b7280]">
              <ClipboardCheck className="w-4 h-4 text-[#9ca3af]" />
              <span>{respondedCount}/{totalIssueItems} reviewed</span>
            </div>
            {selectedCount > 0 && (
              <span className="text-[13px] font-medium text-teal-600">{selectedCount} selected</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {(totalMax > 0 || totalMin > 0) ? (
              <div className="text-right">
                <p className="text-[10px] text-[#9ca3af] uppercase tracking-wider font-medium">Estimated Total</p>
                <p className="text-[18px] font-bold text-[#1f2937]">
                  {totalMin !== totalMax ? `$${formatCost(totalMin)} – $${formatCost(totalMax)}` : `$${formatCost(totalMax)}`}
                  {hasHST && <span className="text-[11px] text-[#9ca3af] font-normal ml-1">+HST</span>}
                </p>
              </div>
            ) : (
              <p className="text-[13px] text-[#9ca3af]">Select actions to see costs</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OwnerReportView() {
  return null;
}
