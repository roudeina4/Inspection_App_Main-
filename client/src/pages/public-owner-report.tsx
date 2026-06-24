import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Play,
  MessageSquare,
  Send,
  Check,
  X,
  DollarSign,
  Receipt,
  ChevronDown,
  Loader2,
  Package,
} from "lucide-react";
import { StructuredDescription } from "@/components/structured-description";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type {
  OwnerReport,
  OwnerReportItem,
  OwnerReportBundle,
  IssueCategory,
  Unit,
  InspectionTask,
  OwnerResponseType,
} from "@shared/schema";

interface PublicReportData {
  report: OwnerReport;
  items: OwnerReportItem[];
  categories: IssueCategory[];
  unit: Unit | null;
  task: InspectionTask | null;
  bundles?: OwnerReportBundle[];
}

const RESPONSE_OPTIONS: {
  value: OwnerResponseType;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  missingOnly?: boolean;
  repairOnly?: boolean;
}[] = [
  { value: "LEAVE_AS_IS", label: "Leave as is", color: "text-gray-700", bgColor: "bg-gray-100", borderColor: "border-gray-300" },
  { value: "ILL_REPLACE", label: "I'll replace", color: "text-blue-700", bgColor: "bg-blue-50", borderColor: "border-blue-300" },
  { value: "PLEASE_FIX", label: "Please fix", color: "text-amber-700", bgColor: "bg-amber-50", borderColor: "border-amber-300", repairOnly: true },
  { value: "PROCEED_PURCHASE", label: "Please proceed with the purchase", color: "text-green-700", bgColor: "bg-green-50", borderColor: "border-green-300", missingOnly: true },
];

function parseCostRange(cost: string | null | undefined): { min: number; max: number } {
  if (!cost) return { min: 0, max: 0 };
  if (cost.includes(" - ")) {
    const parts = cost.split(" - ");
    const minMatch = parts[0].match(/[\d,.]+/);
    const maxMatch = parts[parts.length - 1].match(/[\d,.]+/);
    const min = minMatch ? parseFloat(minMatch[0].replace(/,/g, "")) || 0 : 0;
    const max = maxMatch ? parseFloat(maxMatch[0].replace(/,/g, "")) || 0 : 0;
    return { min, max };
  }
  const match = cost.match(/[\d,.]+/);
  const val = match ? parseFloat(match[0].replace(/,/g, "")) || 0 : 0;
  return { min: val, max: val };
}

function parseCostNumeric(cost: string | null | undefined): number {
  return parseCostRange(cost).max;
}

function formatCost(amount: number): string {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function getResponseLabel(value: string): string {
  return RESPONSE_OPTIONS.find(o => o.value === value)?.label || value;
}

function OwnerItemResponse({ item, token, isMissingOrReplacement, onResponseChange }: {
  item: OwnerReportItem;
  token: string;
  isMissingOrReplacement: boolean;
  onResponseChange: (itemId: string, response: string | null) => void;
}) {
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState(item.ownerComment || "");
  const [selectedResponse, setSelectedResponse] = useState<string | null>(item.ownerResponse || null);
  const [saved, setSaved] = useState(!!item.ownerResponse || !!item.ownerComment);
  const [isCommentSubmit, setIsCommentSubmit] = useState(false);
  const { toast } = useToast();

  const respondMutation = useMutation({
    mutationFn: async ({ ownerResponse, ownerComment }: { ownerResponse?: string | null; ownerComment?: string | null }) => {
      const res = await apiRequest("POST", `/api/public/owner-report/${token}/items/${item.id}/respond`, {
        ownerResponse: ownerResponse || null,
        ownerComment: ownerComment !== undefined ? ownerComment : null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/owner-report", token] });
      setSaved(true);
      if (isCommentSubmit) {
        setShowComment(false);
        setIsCommentSubmit(false);
        toast({ title: "Comment saved", description: "Your comment has been submitted." });
      }
    },
    onError: (error: Error) => {
      setIsCommentSubmit(false);
      toast({ title: "Failed to save", description: error.message || "Please try again.", variant: "destructive" });
    },
  });

  const handleResponseClick = (response: string) => {
    const newResponse = selectedResponse === response ? null : response;
    setSelectedResponse(newResponse);
    setSaved(false);
    setIsCommentSubmit(false);
    onResponseChange(item.id, newResponse);
    respondMutation.mutate({ ownerResponse: newResponse, ownerComment: comment || item.ownerComment || undefined });
  };

  const handleCommentSubmit = () => {
    if (comment.trim()) {
      setIsCommentSubmit(true);
      respondMutation.mutate({ ownerResponse: selectedResponse, ownerComment: comment });
    }
  };

  const availableOptions = RESPONSE_OPTIONS.filter(
    opt => (!opt.missingOnly || isMissingOrReplacement) && (!opt.repairOnly || !isMissingOrReplacement)
  );

  const hasCost = !!item.estimatedCost;
  const costNumeric = parseCostNumeric(item.estimatedCost);
  const costDisplay = item.estimatedCost || "";

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        {availableOptions.map((opt) => {
          const addsCost = hasCost && (opt.value === "PLEASE_FIX" || opt.value === "PROCEED_PURCHASE");
          const btn = (
            <button
              key={opt.value}
              onClick={() => handleResponseClick(opt.value)}
              disabled={respondMutation.isPending}
              data-testid={`btn-response-${opt.value}-${item.id}`}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                selectedResponse === opt.value
                  ? `${opt.bgColor} ${opt.borderColor} ${opt.color} ring-2 ring-offset-1 ring-current`
                  : `bg-white border-gray-200 text-gray-600 hover:bg-gray-50`
              }`}
            >
              {selectedResponse === opt.value && saved && (
                <Check className="w-3 h-3 inline mr-1" />
              )}
              {opt.label}
              {addsCost && selectedResponse !== opt.value && (
                <span className="ml-1 opacity-60">
                  <DollarSign className="w-3 h-3 inline" />
                </span>
              )}
            </button>
          );

          if (addsCost) {
            const hasVendorBreakdown = item.vendorName && item.itemPrice;
            return (
              <Tooltip key={opt.value}>
                <TooltipTrigger asChild>
                  {btn}
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-gray-900 text-white text-xs px-3 py-2">
                  {hasVendorBreakdown ? (
                    <div className="space-y-0.5">
                      <p>Item: ${item.itemPrice}</p>
                      {item.handymanCost && <p>Handyman: ${item.handymanCost}</p>}
                      {item.vendorServiceFee && <p>Service fee: $50</p>}
                      <p className="font-semibold border-t border-gray-600 pt-0.5 mt-0.5">Total: ${costDisplay} +HST</p>
                    </div>
                  ) : (
                    <p>Adds ${costDisplay} to total</p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          }
          return btn;
        })}
      </div>
      
      {!showComment && (
        <button
          onClick={() => setShowComment(true)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          data-testid={`btn-add-comment-${item.id}`}
        >
          <MessageSquare className="w-3 h-3" />
          {item.ownerComment ? "Edit comment" : "Add comment"}
        </button>
      )}

      {showComment && (
        <div className="flex gap-2 items-end">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add your comment..."
            className="text-sm min-h-[60px] flex-1"
            data-testid={`input-comment-${item.id}`}
          />
          <div className="flex flex-col gap-1">
            <Button
              size="icon"
              variant="default"
              onClick={handleCommentSubmit}
              disabled={respondMutation.isPending || !comment.trim()}
              data-testid={`btn-submit-comment-${item.id}`}
            >
              {respondMutation.isPending && isCommentSubmit ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowComment(false)}
              data-testid={`btn-cancel-comment-${item.id}`}
            >
              &times;
            </Button>
          </div>
        </div>
      )}

      {item.ownerComment && !showComment && (
        <div className="bg-blue-50 border border-blue-100 rounded-md px-3 py-2">
          <p className="text-xs text-blue-700" data-testid={`text-owner-comment-${item.id}`}>
            <MessageSquare className="w-3 h-3 inline mr-1" />
            {item.ownerComment}
          </p>
        </div>
      )}
    </div>
  );
}

function MediaLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  const isVideo = url.match(/\.(mp4|mov|webm)$/i);
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
      onClick={onClose}
      data-testid="media-lightbox"
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 z-10"
        data-testid="button-close-lightbox"
      >
        <X className="w-6 h-6" />
      </button>
      <div className="max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        {isVideo ? (
          <video
            src={url}
            controls
            autoPlay
            className="max-w-full max-h-[85vh] rounded-lg"
            data-testid="lightbox-video"
          />
        ) : (
          <img
            src={url}
            alt="Evidence"
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
            data-testid="lightbox-image"
          />
        )}
      </div>
    </div>
  );
}

function MediaThumbnails({ mediaUrls }: { mediaUrls: string[] }) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (!mediaUrls || mediaUrls.length === 0) return null;
  return (
    <>
      <div className="flex gap-2 mt-2 flex-wrap">
        {mediaUrls.map((url, idx) => (
          <button
            key={idx}
            onClick={() => setLightboxUrl(url)}
            className="block w-16 h-16 rounded-lg overflow-hidden border cursor-pointer"
            data-testid={`btn-media-${idx}`}
          >
            {url.match(/\.(mp4|mov|webm)$/i) ? (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <Play className="w-5 h-5 text-gray-400" />
              </div>
            ) : (
              <img src={url} alt="Evidence" className="w-full h-full object-cover" />
            )}
          </button>
        ))}
      </div>
      {lightboxUrl && (
        <MediaLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}
    </>
  );
}

function AmazonCartSection({ amazonCartLink }: { amazonCartLink: string }) {
  return (
    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
      <p className="text-sm text-gray-700">
        Here is the Amazon cart link with the missing items compiled for your approval:
      </p>
      <a
        href={amazonCartLink}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 text-sm underline flex items-center gap-1 mt-1"
        data-testid="link-amazon-cart"
      >
        <ExternalLink className="w-3 h-3" />
        View Amazon Cart
      </a>
    </div>
  );
}

function StickyTotalBar({ totalMin, totalMax, itemCount, hasHST }: { totalMin: number; totalMax: number; itemCount: number; hasHST: boolean }) {
  const prevTotal = useRef(totalMax);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (prevTotal.current !== totalMax) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 600);
      prevTotal.current = totalMax;
      return () => clearTimeout(timer);
    }
  }, [totalMax]);

  if (totalMax === 0 && totalMin === 0) return null;

  const isRange = totalMin !== totalMax;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t shadow-lg"
      style={{ background: "linear-gradient(135deg, #63A1A0 0%, #4d8a89 100%)" }}
      data-testid="sticky-total-bar"
    >
      <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white/80 text-sm">
          <Receipt className="w-4 h-4" />
          <span>{itemCount} item{itemCount !== 1 ? "s" : ""} selected</span>
        </div>
        <div className="flex items-center gap-2 text-white">
          <span className="text-sm font-medium">Estimated Total:</span>
          <span
            className={`text-xl font-bold transition-all duration-300 ${animate ? "scale-110" : "scale-100"}`}
            data-testid="text-running-total"
          >
            {isRange ? `$${formatCost(totalMin)} - $${formatCost(totalMax)}` : `$${formatCost(totalMax)}`}
          </span>
          {hasHST && <span className="text-white/70 text-xs">+HST</span>}
        </div>
      </div>
    </div>
  );
}

function CostSummaryCard({ items, responseMap }: { items: OwnerReportItem[]; responseMap: Map<string, string | null> }) {
  const selectedItems = items.filter(item => {
    const response = responseMap.get(item.id) ?? item.ownerResponse;
    return (response === "PLEASE_FIX" || response === "PROCEED_PURCHASE") && item.estimatedCost;
  });

  if (selectedItems.length === 0) return null;

  const totalRange = selectedItems.reduce(
    (acc, item) => {
      const range = parseCostRange(item.estimatedCost);
      return { min: acc.min + range.min, max: acc.max + range.max };
    },
    { min: 0, max: 0 }
  );
  const hasHST = selectedItems.some(item => item.estimatedCost?.toLowerCase().includes("hst"));
  const isRange = totalRange.min !== totalRange.max;

  return (
    <Card className="p-6 bg-white border-2" style={{ borderColor: "#63A1A0" }} data-testid="section-cost-summary">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#63A1A0" }}>
          <DollarSign className="w-4 h-4 text-white" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Cost Summary</h2>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Review your selections below. These are estimated costs for items you've approved for repair or purchase.
      </p>
      <div className="space-y-2 mb-4">
        {selectedItems.map(item => (
          <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0" data-testid={`summary-item-${item.id}`}>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-900">{item.roomName} — {item.itemName}</span>
              <span className="text-xs text-gray-500 ml-2">
                ({getResponseLabel((responseMap.get(item.id) ?? item.ownerResponse) || "")})
              </span>
            </div>
            <span className="text-sm font-semibold text-gray-900 ml-4 whitespace-nowrap" data-testid={`summary-cost-${item.id}`}>
              ${item.estimatedCost}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-3 border-t-2 border-gray-200">
        <span className="text-base font-bold text-gray-900">Estimated Total</span>
        <span className="text-xl font-bold" style={{ color: "#63A1A0" }} data-testid="text-summary-total">
          {isRange ? `$${formatCost(totalRange.min)} - $${formatCost(totalRange.max)}` : `$${formatCost(totalRange.max)}`}{hasHST ? " +HST" : ""}
        </span>
      </div>
    </Card>
  );
}

export default function PublicOwnerReportPage() {
  const [, params] = useRoute("/report/:token");
  const token = params?.token;
  const [responseMap, setResponseMap] = useState<Map<string, string | null>>(new Map());
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionName: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionName)) {
        next.delete(sectionName);
      } else {
        next.add(sectionName);
      }
      return next;
    });
  };

  const { data, isLoading, error } = useQuery<PublicReportData>({
    queryKey: ["/api/public/owner-report", token],
    enabled: !!token,
  });

  const handleResponseChange = (itemId: string, response: string | null) => {
    setResponseMap(prev => {
      const next = new Map(prev);
      next.set(itemId, response);
      return next;
    });
  };

  const items = data?.items || [];
  const bundles = data?.bundles || [];

  const { runningTotalMin, runningTotalMax, selectedCount, hasHST } = useMemo(() => {
    let totalMin = 0;
    let totalMax = 0;
    let count = 0;
    let hst = false;
    const bundledItemIds = new Set<string>();

    for (const bundle of bundles) {
      const bundleItems = items.filter(i => i.bundleId === bundle.id);
      const selectedBundleItems = bundleItems.filter(i => {
        const response = responseMap.get(i.id) ?? i.ownerResponse;
        return response === "PLEASE_FIX" || response === "PROCEED_PURCHASE";
      });
      if (selectedBundleItems.length > 0) {
        if (bundle.estimatedCost) {
          const range = parseCostRange(bundle.estimatedCost);
          totalMin += range.min;
          totalMax += range.max;
          if (bundle.estimatedCost.toLowerCase().includes("hst")) hst = true;
        } else {
          for (const item of selectedBundleItems) {
            if (item.estimatedCost) {
              const range = parseCostRange(item.estimatedCost);
              totalMin += range.min;
              totalMax += range.max;
              if (item.estimatedCost.toLowerCase().includes("hst")) hst = true;
            }
          }
        }
        count += selectedBundleItems.length;
        bundleItems.forEach(i => bundledItemIds.add(i.id));
      }
    }

    for (const item of items) {
      if (bundledItemIds.has(item.id)) continue;
      const response = responseMap.get(item.id) ?? item.ownerResponse;
      if ((response === "PLEASE_FIX" || response === "PROCEED_PURCHASE") && item.estimatedCost) {
        const range = parseCostRange(item.estimatedCost);
        totalMin += range.min;
        totalMax += range.max;
        count++;
        if (item.estimatedCost.toLowerCase().includes("hst")) hst = true;
      }
    }
    return { runningTotalMin: totalMin, runningTotalMax: totalMax, selectedCount: count, hasHST: hst };
  }, [items, responseMap, bundles]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-3xl mx-auto p-6">
          <div className="h-10 w-64 bg-gray-200 rounded mx-auto" />
          <div className="h-6 w-48 bg-gray-200 rounded mx-auto" />
          <div className="h-96 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Report Not Found</h2>
          <p className="text-gray-500">This report link may be invalid or has expired.</p>
        </Card>
      </div>
    );
  }

  const { report, categories, unit, task } = data;
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const groupedByCategory: Record<string, OwnerReportItem[]> = {};
  for (const item of items) {
    const cat = categoryMap.get(item.categoryId);
    const catName = cat?.name || "Other";
    if (!groupedByCategory[catName]) groupedByCategory[catName] = [];
    groupedByCategory[catName].push(item);
  }

  const damageItems = groupedByCategory["Damage"] || [];
  const highPriority = damageItems.filter((i) => i.priority === "HIGH" && !i.bundleId);
  const lowerPriority = damageItems.filter((i) => i.priority !== "HIGH" && !i.bundleId);
  const missingItems = groupedByCategory["Missing"] || [];
  const replacementItems = groupedByCategory["Replacement"] || [];

  const ownerName = report.ownerName || "Owner";

  const respondedCount = items.filter(i => {
    const cat = categoryMap.get(i.categoryId);
    return cat?.name !== "Good" && (responseMap.get(i.id) !== undefined ? responseMap.get(i.id) : i.ownerResponse);
  }).length;
  const totalActionableItems = items.filter(i => {
    const cat = categoryMap.get(i.categoryId);
    return cat?.name !== "Good";
  }).length;

  const hasCostItems = items.some(i => !!i.estimatedCost);

  return (
    <TooltipProvider delayDuration={200}>
    <div className="min-h-screen bg-gray-50" style={{ paddingBottom: (runningTotalMax > 0 || runningTotalMin > 0) ? "72px" : "0" }}>
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-6 pt-6 pb-0">
          <div className="flex items-center gap-4 mb-4">
            <img
              src="/images/tba-logo.jpeg"
              alt="Toronto Boutique Apartments"
              className="h-16 w-auto object-contain"
              data-testid="img-tba-logo"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-wide" data-testid="text-report-header">
                TORONTO BOUTIQUE
              </h1>
              <p className="text-sm font-medium tracking-widest" style={{ color: "#63A1A0" }}>
                APARTMENTS
              </p>
            </div>
          </div>
        </div>
        <div className="w-full py-3" style={{ background: "linear-gradient(135deg, #63A1A0 0%, #8BBCBB 50%, #B5D5D4 100%)" }}>
          <p className="text-center text-white font-semibold text-base italic max-w-3xl mx-auto px-6" data-testid="text-report-subtitle">
            Inspection Report for Property Owner
          </p>
        </div>
        {totalActionableItems > 0 && (
          <div className="text-center py-3 bg-white">
            <Badge
              variant="outline"
              className={respondedCount === totalActionableItems ? "border-green-300 text-green-700" : "border-gray-300 text-gray-600"}
              data-testid="badge-response-progress"
            >
              {respondedCount === totalActionableItems ? (
                <><Check className="w-3 h-3 mr-1" /> All items reviewed</>
              ) : (
                <>{respondedCount} of {totalActionableItems} items reviewed</>
              )}
            </Badge>
          </div>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <Card className="p-6 space-y-4 bg-white" data-testid="section-intro">
          <p className="text-base text-gray-900">
            Hi {ownerName},
          </p>
          <p className="text-sm text-gray-600">
            Following the inspection of your unit, we've identified both damages and missing items.
            Please review each item below and select your preferred action.
          </p>
          {hasCostItems && (
            <div className="flex items-start gap-3 p-3 rounded-lg border" style={{ backgroundColor: "#f0f7f7", borderColor: "#63A1A0" }} data-testid="cost-guidance-note">
              <DollarSign className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#63A1A0" }} />
              <p className="text-sm text-gray-700">
                Some items include estimated repair or replacement costs. When you select <strong>"Please fix"</strong> or <strong>"Proceed with purchase"</strong>, the cost will be added to your running total at the bottom of the page. You can review a full breakdown before finalizing.
              </p>
            </div>
          )}
          {unit && (
            <div className="flex gap-6 text-sm text-gray-500 mt-2 flex-wrap">
              <span>
                <span className="font-medium text-gray-700">Unit:</span>{" "}
                {unit.propertyName} - {unit.unitNumber}
              </span>
              {task && (
                <span>
                  <span className="font-medium text-gray-700">Inspection Date:</span>{" "}
                  {new Date(task.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </Card>

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

          const getBundleName = (bundleId: string | null) => {
            if (!bundleId) return null;
            return bundles.find(b => b.id === bundleId)?.name || null;
          };

          const renderItemCard = (item: OwnerReportItem, borderColor: string, isMissing: boolean, testIdPrefix: string) => (
            <div key={item.id} className="py-4" data-testid={`${testIdPrefix}-${item.id}`}>
              <div className={`pl-5 border-l-2`} style={{ borderLeftColor: borderColor }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 text-sm">{item.itemName}</p>
                  {item.bundleId && getBundleName(item.bundleId) && testIdPrefix !== "bundle-item" && (
                    <Badge className="text-[10px] bg-teal-50 text-teal-600 border border-teal-200 font-normal" data-testid={`badge-bundle-${item.id}`}>
                      <Package className="w-3 h-3 mr-1" />
                      {getBundleName(item.bundleId)}
                    </Badge>
                  )}
                </div>
                {item.description && (
                  <StructuredDescription description={item.description} />
                )}
                {item.vendorName && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="text-xs bg-indigo-100 text-indigo-700 border-0">
                        {item.vendorName}
                      </Badge>
                      {item.itemPrice && (
                        <Badge variant="outline" className="text-xs border-teal-300 text-teal-700" data-testid={`badge-price-${item.id}`}>
                          ${item.itemPrice}
                        </Badge>
                      )}
                    </div>
                    {item.vendorLink && (
                      <a href={item.vendorLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1" data-testid={`link-vendor-${item.id}`}>
                        <ExternalLink className="w-3 h-3" /> View product on {item.vendorName}
                      </a>
                    )}
                    {item.handymanQuote && (
                      <p className="text-xs text-blue-600 italic" data-testid={`text-handyman-${item.id}`}>{item.handymanQuote}</p>
                    )}
                  </div>
                )}
                {item.pmOwnerNote && (
                  <div className="mt-2 p-2 bg-amber-50 rounded text-xs text-amber-700 border border-amber-200" data-testid={`text-pm-note-${item.id}`}>
                    <span className="font-medium">Note from your property manager:</span> {item.pmOwnerNote}
                  </div>
                )}
                {!item.vendorName && (item.repairQuote || item.estimatedCost) && (
                  <div className="mt-2 space-y-1 text-sm">
                    {item.repairQuote && (
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 font-medium min-w-[70px]">Repair</span>
                        <span className="text-gray-700">{item.repairQuote}</span>
                      </div>
                    )}
                    {item.estimatedCost && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 font-medium min-w-[70px]">Est. Cost</span>
                        <span className="font-semibold text-teal-700" data-testid={`badge-cost-${item.id}`}>${item.estimatedCost}</span>
                      </div>
                    )}
                  </div>
                )}
                <MediaThumbnails mediaUrls={(item.mediaUrls as string[]) || []} />
                <OwnerItemResponse item={item} token={token!} isMissingOrReplacement={isMissing} onResponseChange={handleResponseChange} />
              </div>
            </div>
          );

          const renderRoomGroupedItems = (list: OwnerReportItem[], borderColor: string, isMissing: boolean, testIdPrefix: string) => {
            const roomGroups = groupByRoom(list);
            return (
              <div className="space-y-2">
                {roomGroups.map(([roomName, roomItems]) => (
                  <div key={roomName}>
                    <div className="flex items-center gap-2 mt-4 mb-1">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{roomName}</span>
                      <span className="text-xs text-gray-400">({roomItems.length})</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {roomItems.map((item) => renderItemCard(item, borderColor, isMissing, testIdPrefix))}
                    </div>
                  </div>
                ))}
              </div>
            );
          };

          const renderBundleCard = (bundle: OwnerReportBundle, isMissingOrReplacement: boolean) => {
            const bundleItems = items.filter(i => i.bundleId === bundle.id);
            if (bundleItems.length === 0) return null;
            const isBundleCollapsed = collapsedSections.has(`bundle-${bundle.id}`);
            return (
              <Card key={`bundle-${bundle.id}`} className="overflow-hidden mb-4 border-teal-200" data-testid={`public-bundle-${bundle.id}`}>
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer bg-teal-50 border-b border-teal-100"
                  onClick={() => toggleSection(`bundle-${bundle.id}`)}
                >
                  <Package className="w-5 h-5 text-teal-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base text-teal-800">{bundle.name}</h3>
                    {bundle.repairQuote && (
                      <p className="text-sm text-gray-600 mt-0.5">{bundle.repairQuote}</p>
                    )}
                    {bundle.estimatedCost && (
                      <p className="text-sm text-teal-600 font-medium mt-0.5">
                        Estimated cost: ${bundle.estimatedCost} +HST
                      </p>
                    )}
                  </div>
                  <Badge className="bg-teal-100 text-teal-700 border-0 shrink-0">
                    {bundleItems.length} item{bundleItems.length !== 1 ? "s" : ""}
                  </Badge>
                  <ChevronDown className={`w-5 h-5 text-teal-500 transition-transform ${isBundleCollapsed ? "" : "rotate-180"}`} />
                </div>
                {!isBundleCollapsed && (
                  <div className="p-4 space-y-3">
                    <div className="flex gap-2 mb-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-teal-300 text-teal-700 hover:bg-teal-50"
                        onClick={() => {
                          for (const item of bundleItems) {
                            const bCat = categoryMap.get(item.categoryId);
                            const bCatName = bCat?.name || "";
                            const isMR = bCatName === "Missing" || bCatName === "Replacement";
                            const resp = isMR ? "PROCEED_PURCHASE" : "PLEASE_FIX";
                            handleResponseChange(item.id, resp as OwnerResponseType);
                            apiRequest("POST", `/api/public/owner-report/${token}/items/${item.id}/respond`, {
                              ownerResponse: resp,
                            });
                          }
                        }}
                        data-testid={`bundle-approve-all-${bundle.id}`}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Approve All Items
                      </Button>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {bundleItems.map((item) => {
                        const bCat = categoryMap.get(item.categoryId);
                        const bCatName = bCat?.name || "";
                        const isMR = bCatName === "Missing" || bCatName === "Replacement";
                        return renderItemCard(item, bCat?.color || "#6b7280", isMR, `bundle-item`);
                      })}
                    </div>
                  </div>
                )}
              </Card>
            );
          };

          return ["Damage", "Cosmetic", "Missing", "Replacement"].map((sectionName) => {
            const allSectionItems = groupedByCategory[sectionName] || [];
            const cat = categories.find((c) => c.name === sectionName);
            const sectionBundles = bundles.filter(b => b.categoryId === cat?.id);
            const sectionItems = allSectionItems.filter(i => !i.bundleId);
            if (sectionItems.length === 0 && sectionBundles.length === 0) return null;
            const isMissingOrReplacement = sectionName === "Missing" || sectionName === "Replacement";

            if (sectionName === "Damage") {
              const isCollapsed = collapsedSections.has("Damage");
              return (
                <Card key={sectionName} className="bg-white overflow-hidden" data-testid="section-damages">
                  <button
                    onClick={() => toggleSection("Damage")}
                    className="w-full p-6 pb-0 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                    data-testid="toggle-section-damages"
                  >
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-bold text-gray-900">Damages</h2>
                      <Badge variant="outline" className="text-xs border-red-300 text-red-600">{allSectionItems.length}</Badge>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`} />
                  </button>
                  <div className="border-b-2 border-red-500 mx-6 mt-2" />
                  {!isCollapsed && (
                    <div className="p-6 pt-4">
                      <p className="text-sm text-gray-600 mb-4">
                        I'll start with the damages in order of priority:
                      </p>

                      {sectionBundles.map(b => renderBundleCard(b, false))}

                      {highPriority.length > 0 && (
                        <div className="mb-6">
                          <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            <p className="font-semibold text-sm text-gray-900">
                              High priority (must be fixed before we go live):
                            </p>
                          </div>
                          {renderRoomGroupedItems(highPriority, "#fca5a5", false, "public-damage-high")}
                        </div>
                      )}

                      {lowerPriority.length > 0 && (
                        <div>
                          <p className="font-semibold text-sm text-gray-900 mb-3">
                            Lower priority (cosmetic, not deal-breakers but recommended):
                          </p>
                          {renderRoomGroupedItems(lowerPriority, "#fcd34d", false, "public-damage-lower")}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            }

            if (sectionName === "Missing") {
              const isCollapsed = collapsedSections.has("Missing");
              return (
                <Card key={sectionName} className="bg-white overflow-hidden" data-testid="section-missing">
                  <button
                    onClick={() => toggleSection("Missing")}
                    className="w-full p-6 pb-0 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                    data-testid="toggle-section-missing"
                  >
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-bold text-gray-900">Missing Items</h2>
                      <Badge variant="outline" className="text-xs border-purple-300 text-purple-600">{allSectionItems.length}</Badge>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`} />
                  </button>
                  <div className="border-b-2 border-purple-500 mx-6 mt-2" />
                  {!isCollapsed && (
                    <div className="p-6 pt-4">
                      <p className="text-sm text-gray-600 mb-3">
                        Here's the list of items identified as missing:
                      </p>
                      {sectionBundles.map(b => renderBundleCard(b, true))}
                      {renderRoomGroupedItems(sectionItems, "#c4b5fd", true, "public-missing")}
                      {report.amazonCartLink && (
                        <AmazonCartSection amazonCartLink={report.amazonCartLink} />
                      )}
                    </div>
                  )}
                </Card>
              );
            }

            const isCollapsed = collapsedSections.has(sectionName);
            const sectionColor = cat?.color || "#6b7280";
            return (
              <Card key={sectionName} className="bg-white overflow-hidden" data-testid={`section-${sectionName.toLowerCase()}`}>
                <button
                  onClick={() => toggleSection(sectionName)}
                  className="w-full p-6 pb-0 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                  data-testid={`toggle-section-${sectionName.toLowerCase()}`}
                >
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-gray-900">{sectionName}</h2>
                    <Badge variant="outline" className="text-xs" style={{ borderColor: sectionColor, color: sectionColor }}>{allSectionItems.length}</Badge>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`} />
                </button>
                <div className="mx-6 mt-2" style={{ borderBottom: `2px solid ${sectionColor}` }} />
                {!isCollapsed && (
                  <div className="p-6 pt-4">
                    {sectionBundles.map(b => renderBundleCard(b, isMissingOrReplacement))}
                    {renderRoomGroupedItems(sectionItems, `${sectionColor}60`, isMissingOrReplacement, `public-${sectionName.toLowerCase()}`)}
                    {isMissingOrReplacement && report.amazonCartLink && (
                      <AmazonCartSection amazonCartLink={report.amazonCartLink} />
                    )}
                  </div>
                )}
              </Card>
            );
          });
        })()}

        {items.filter((i) => {
          const cat = categoryMap.get(i.categoryId);
          return cat?.name !== "Good";
        }).length === 0 && (
          <Card className="p-8 text-center bg-white">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">All Clear</h3>
            <p className="text-gray-500">No issues to report for this inspection.</p>
          </Card>
        )}

        <CostSummaryCard items={items} responseMap={responseMap} />

        {report.closingMessage && items.filter((i) => {
          const cat = categoryMap.get(i.categoryId);
          return cat?.name !== "Good";
        }).length > 0 && (
          <Card className="p-6 bg-white" data-testid="section-closing">
            <p className="text-sm text-gray-700">{report.closingMessage}</p>
          </Card>
        )}

        <div className="text-center text-xs text-gray-400 py-4">
          <p>Generated by Toronto Boutique Apartments Inspection System</p>
          <p>Report generated on {new Date(report.updatedAt).toLocaleDateString()}</p>
        </div>
      </div>

      <StickyTotalBar totalMin={runningTotalMin} totalMax={runningTotalMax} itemCount={selectedCount} hasHST={hasHST} />
    </div>
    </TooltipProvider>);
}
