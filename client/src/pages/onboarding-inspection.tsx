import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  ArrowLeft, 
  ArrowRight, 
  Loader2, 
  Upload,
  CheckCircle2,
  Plus,
  Minus,
  Trash2,
  Camera,
  X,
  Home,
  BedDouble,
  Bath,
  Key,
  MapPin,
  Check,
  Circle,
  Settings,
  Utensils,
  Sofa,
  DoorOpen,
  Shirt,
  Refrigerator,
  Package,
  Wrench,
  Video
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { User as UserType, ChecklistResult, Severity } from "@shared/schema";
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
import { cn } from "@/lib/utils";
import { ImageEditor } from "@/components/image-editor";
import { Pencil } from "lucide-react";

interface Prediction {
  description: string;
  place_id: string;
}

function AddressAutocomplete({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const serviceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: mapsConfig } = useQuery<{ key: string }>({
    queryKey: ["/api/config/maps-key"],
    retry: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!mapsConfig?.key) return;
    if (window.google?.maps?.places) return;
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) return;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsConfig.key}&libraries=places`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, [mapsConfig?.key]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchPredictions = useCallback((input: string) => {
    if (!input || input.length < 3) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }
    if (!window.google?.maps?.places) return;
    if (!serviceRef.current) {
      serviceRef.current = new window.google.maps.places.AutocompleteService();
    }
    serviceRef.current.getPlacePredictions(
      { input, types: ["address"], componentRestrictions: { country: "ca" } },
      (results, status) => {
        if (status === window.google!.maps.places.PlacesServiceStatus.OK && results) {
          setPredictions(results.map((r) => ({ description: r.description, place_id: r.place_id })));
          setShowDropdown(true);
        } else {
          setPredictions([]);
        }
      }
    );
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(val), 300);
  };

  const selectPrediction = (pred: Prediction) => {
    onChange(pred.description);
    setPredictions([]);
    setShowDropdown(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        placeholder={placeholder || "Start typing an address..."}
        value={value}
        onChange={handleInputChange}
        onFocus={() => { if (predictions.length > 0) setShowDropdown(true); }}
        data-testid="input-address"
      />
      {showDropdown && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {predictions.map((pred) => (
            <button
              key={pred.place_id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors border-b last:border-b-0"
              onClick={() => selectPrediction(pred)}
              data-testid={`suggestion-${pred.place_id}`}
            >
              {pred.description}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface MediaPreview {
  id: string;
  file: File;
  type: "PHOTO" | "VIDEO";
  url: string;
  timestamp: Date;
  uploadedUrl?: string;
  uploading?: boolean;
}

interface ChecklistItemData {
  id: string;
  name: string;
  condition: string;
  count?: number;
  damagedCount?: number;
  issues: string[];
  notes: string;
  media: MediaPreview[];
  exists?: boolean;
  location?: string;
  locations?: string[];
  isRemoved?: boolean;
  brand?: string;
  working?: boolean;
}

interface ComplementaryItem {
  id: string;
  description: string;
  notes: string;
  media: MediaPreview[];
}

interface AreaData {
  checklist: ChecklistItemData[];
  complementary: ComplementaryItem[];
  isComplete: boolean;
}

interface AllAreasData {
  [areaKey: string]: AreaData;
}

interface KeyCount {
  type: string;
  count: number;
}

interface PropertyDetails {
  unitId: string;
  unitNumber: string;
  address: string;
  ownerName: string;
  pmId: string;
  bedroomCount: number;
  bathroomCount: number;
  keySetsProvided: number;
  hasDen: boolean;
  bathroomTypes: string[];
  keyTypes: string[];
  keyCounts: KeyCount[];
}



interface EditingImageInfo {
  areaKey: string;
  itemId: string;
  mediaId: string;
  url: string;
  isComplementary?: boolean;
}

function ChecklistItemCard({ item, config, areaKey, onUpdate, onAddMedia, onRemoveMedia, onRemove, onEditImage, roomAreas, onBeforeCapture }: {
  item: ChecklistItemData;
  config: ChecklistItemConfig;
  areaKey: string;
  onUpdate: (areaKey: string, itemId: string, updates: Partial<ChecklistItemData>) => void;
  onAddMedia: (areaKey: string, itemId: string, media: MediaPreview) => void;
  onRemoveMedia: (areaKey: string, itemId: string, mediaId: string) => void;
  onRemove: (areaKey: string, itemId: string) => void;
  onEditImage: (info: EditingImageInfo) => void;
  roomAreas?: { key: string; name: string }[];
  onBeforeCapture?: () => void;
}) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customCondition, setCustomCondition] = useState("");

  if (item.isRemoved) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, forceType?: "PHOTO" | "VIDEO") => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const isVideo = forceType === "VIDEO" || file.type.startsWith("video/");
      const media: MediaPreview = {
        id: Math.random().toString(36).slice(2),
        file,
        type: isVideo ? "VIDEO" : "PHOTO",
        url: URL.createObjectURL(file),
        timestamp: new Date(),
      };
      onAddMedia(areaKey, item.id, media);
    });

    if (photoInputRef.current) photoInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const handleAddCustomCondition = () => {
    if (customCondition.trim()) {
      onUpdate(areaKey, item.id, { condition: customCondition.trim() });
      setCustomCondition("");
      setShowCustomInput(false);
    }
  };

  const allConditions = config.conditions || [];
  const isCountOnly = config.countOnly;
  const isLocationOnly = config.locationOnly;
  const isWorkingYesNo = config.workingYesNo;
  const conditionNotGood = item.condition !== undefined && item.condition !== "" && item.condition !== "Good" && item.condition !== "N/A" && !item.condition.startsWith("Good (");
  const hasDamage = item.damagedCount !== undefined && item.damagedCount > 0;
  const needsMedia = !config.noMediaRequired && (conditionNotGood || hasDamage || (isWorkingYesNo && item.working === false));
  const mediaMissing = needsMedia && item.media.length === 0 && item.exists !== false;
  const canRemove = config.isRemovable && !config.isCoreItem;
  const showExistsField = config.hasExistsField && !isCountOnly;
  const isHangers = item.name === "Hangers";
  const showDetails = showExistsField ? item.exists === true : true;
  const showStandardFields = !isCountOnly && !isLocationOnly && !isWorkingYesNo;

  const notesField = (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">Notes</Label>
      <Textarea
        placeholder={config.notesHint || "Add notes..."}
        value={item.notes || ""}
        onChange={(e) => {
          e.stopPropagation();
          onUpdate(areaKey, item.id, { notes: e.target.value });
        }}
        onClick={(e) => e.stopPropagation()}
        className="min-h-[50px] resize-none text-sm"
        data-testid={`textarea-notes-${item.id}`}
      />
    </div>
  );

  return (
    <Card className={cn("transition-all relative border-border/60")}>
      {canRemove && (
        <button
          className="absolute top-2 right-2 h-6 w-6 rounded-full bg-muted/80 hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors z-10"
          onClick={() => onRemove(areaKey, item.id)}
          data-testid={`button-remove-${item.id}`}
          title="Remove item"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      <CardContent className={cn("p-3 sm:p-4 space-y-3", canRemove && "pr-10")}>
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-sm flex-1 min-w-0">{item.name}</h3>
          <div className="flex items-center gap-2 shrink-0">
            {item.media.length > 0 && (
              <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 text-muted-foreground">
                <Camera className="h-2.5 w-2.5" /> {item.media.length}
              </Badge>
            )}
            <Button
              variant={mediaMissing ? "default" : "ghost"}
              size="sm"
              onClick={() => { onBeforeCapture?.(); photoInputRef.current?.click(); }}
              className={cn("h-7 px-2 text-xs", mediaMissing && "animate-pulse")}
              data-testid={`button-photo-${item.id}`}
            >
              <Camera className="h-3 w-3 mr-1" />
              Photo
            </Button>
            <Button
              variant={mediaMissing ? "default" : "ghost"}
              size="sm"
              onClick={() => { onBeforeCapture?.(); videoInputRef.current?.click(); }}
              className={cn("h-7 px-2 text-xs", mediaMissing && "animate-pulse")}
              data-testid={`button-video-${item.id}`}
            >
              <Video className="h-3 w-3 mr-1" />
              Video
            </Button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e, "PHOTO")}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFileSelect(e, "VIDEO")}
            />
          </div>
        </div>

        {item.media.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {item.media.map(m => (
              <div key={m.id} className="relative group">
                {m.type === "VIDEO" ? (
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-black">
                    <video src={m.url} className="w-full h-full object-cover" muted />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Video className="h-5 w-5 text-white" />
                    </div>
                  </div>
                ) : (
                  <img
                    src={m.url}
                    alt=""
                    className="w-14 h-14 object-cover rounded-lg cursor-pointer"
                    onClick={() => onEditImage({ areaKey, itemId: item.id, mediaId: m.id, url: m.url })}
                  />
                )}
                {m.uploading && (
                  <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  </div>
                )}
                {m.uploadedUrl && !m.uploading && (
                  <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="h-2 w-2 text-white" />
                  </div>
                )}
                <button
                  onClick={() => onRemoveMedia(areaKey, item.id, m.id)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
                {m.type === "PHOTO" && (
                  <button
                    onClick={() => onEditImage({ areaKey, itemId: item.id, mediaId: m.id, url: m.url })}
                    className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Pencil className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {isCountOnly && (
          <div className="space-y-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Present in Unit?</Label>
              <div className="flex gap-2">
                <Button
                  variant={item.exists === true ? "default" : "outline"}
                  size="sm"
                  onClick={() => onUpdate(areaKey, item.id, { exists: true })}
                  className="flex-1 h-8"
                >
                  Yes
                </Button>
                <Button
                  variant={item.exists === false ? "default" : "outline"}
                  size="sm"
                  onClick={() => onUpdate(areaKey, item.id, { exists: false, count: 0 })}
                  className="flex-1 h-8"
                >
                  No
                </Button>
              </div>
            </div>
            {item.exists === true && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">How many?</Label>
                <Input
                  type="number"
                  min="1"
                  value={item.count || ""}
                  onChange={(e) => onUpdate(areaKey, item.id, { count: parseInt(e.target.value) || 0 })}
                  className="h-9"
                  placeholder="Enter count"
                />
              </div>
            )}
            {notesField}
          </div>
        )}

        {isLocationOnly && (
          <div className="space-y-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Location</Label>
              {config.locationInput ? (
                <Input
                  placeholder="Type location (e.g. hallway closet, utility room)..."
                  value={item.location || ""}
                  onChange={(e) => onUpdate(areaKey, item.id, { location: e.target.value })}
                  className="h-9"
                  data-testid={`input-location-${item.id}`}
                />
              ) : (
                <Select
                  value={item.location || ""}
                  onValueChange={(v) => onUpdate(areaKey, item.id, { location: v })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select location..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="N/A">N/A</SelectItem>
                    {roomAreas && roomAreas.map(r => (
                      <SelectItem key={r.key} value={r.name}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {notesField}
          </div>
        )}

        {isWorkingYesNo && (
          <div className="space-y-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Is it working?</Label>
              <div className="flex gap-2">
                <Button
                  variant={item.working === true ? "default" : "outline"}
                  size="sm"
                  onClick={() => onUpdate(areaKey, item.id, { working: true, condition: "Good" })}
                  className="flex-1 h-8"
                >
                  Yes
                </Button>
                <Button
                  variant={item.working === false ? "default" : "outline"}
                  size="sm"
                  onClick={() => onUpdate(areaKey, item.id, { working: false, condition: "Not Working" })}
                  className="flex-1 h-8"
                >
                  No
                </Button>
              </div>
            </div>
            {item.working === false && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">What is the issue?</Label>
                <Input
                  placeholder="e.g. Not heating, Not cooling..."
                  value={(item.issues && item.issues.length > 0) ? item.issues[0] : ""}
                  onChange={(e) => onUpdate(areaKey, item.id, { issues: e.target.value ? [e.target.value] : [] })}
                  className="h-9"
                  data-testid={`input-issue-${item.id}`}
                />
              </div>
            )}
            {item.working === false && config.workingLocationDropdown && roomAreas && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Where? (location)</Label>
                <Select
                  value={item.location || ""}
                  onValueChange={(v) => onUpdate(areaKey, item.id, { location: v })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select location..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Unit">All Unit</SelectItem>
                    <SelectItem value="Kitchen">Kitchen</SelectItem>
                    {roomAreas.filter(r => r.key.startsWith("bathroom_") || r.key.startsWith("bedroom_")).map(r => (
                      <SelectItem key={r.key} value={r.name}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {notesField}
          </div>
        )}

        {showExistsField && showStandardFields && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {isHangers ? "Minimum provided?" : "Present in Unit?"}
            </Label>
            <div className="flex gap-2">
              <Button
                variant={item.exists === true ? "default" : "outline"}
                size="sm"
                onClick={() => onUpdate(areaKey, item.id, { exists: true })}
                className="flex-1 h-8"
              >
                Yes
              </Button>
              <Button
                variant={item.exists === false ? "default" : "outline"}
                size="sm"
                onClick={() => onUpdate(areaKey, item.id, { exists: false, condition: "N/A" })}
                className="flex-1 h-8"
              >
                No
              </Button>
            </div>
          </div>
        )}

        {isHangers && item.exists === false && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">How many are there?</Label>
            <Input
              type="number"
              min="0"
              value={item.count || 0}
              onChange={(e) => onUpdate(areaKey, item.id, { count: parseInt(e.target.value) || 0 })}
              className="h-9"
            />
          </div>
        )}

        {showDetails && !isHangers && showStandardFields && (
          <>
            {config.hasBrandInput && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Brand</Label>
                <Input
                  placeholder="Enter brand..."
                  value={item.brand || ""}
                  onChange={(e) => onUpdate(areaKey, item.id, { brand: e.target.value })}
                  className="h-9"
                  data-testid={`input-brand-${item.id}`}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Condition</Label>
              <div className="flex flex-wrap gap-1">
                {allConditions.map(c => (
                  <Badge
                    key={c}
                    variant={item.condition === c ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer text-[11px] py-0.5 px-2",
                      item.condition === c && (c === "Good" || c.startsWith("Good (") ? "bg-green-600 hover:bg-green-700" : "bg-amber-600 hover:bg-amber-700")
                    )}
                    onClick={() => onUpdate(areaKey, item.id, { condition: item.condition === c ? "" : c })}
                    data-testid={`condition-${item.id}-${c.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {c}
                  </Badge>
                ))}
                {item.condition && !allConditions.includes(item.condition) && (
                  <Badge
                    variant="default"
                    className="text-xs py-1 px-2.5 bg-amber-600"
                  >
                    {item.condition}
                  </Badge>
                )}
                {!showCustomInput ? (
                  <Badge
                    variant="outline"
                    className="cursor-pointer text-xs py-1 px-2.5 border-dashed"
                    onClick={() => setShowCustomInput(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Badge>
                ) : (
                  <div className="flex gap-1 w-full mt-1">
                    <Input
                      placeholder="Type custom condition..."
                      value={customCondition}
                      onChange={(e) => setCustomCondition(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddCustomCondition()}
                      className="h-8 text-xs flex-1"
                      autoFocus
                    />
                    <Button size="sm" className="h-8 px-2" onClick={handleAddCustomCondition}>
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => { setShowCustomInput(false); setCustomCondition(""); }}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {config.hasLocationDropdown && roomAreas && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Location(s)</Label>
                <div className="flex flex-wrap gap-1">
                  {[{ key: "all", name: "All Unit" }, ...roomAreas].map(r => {
                    const locs = item.locations || (item.location ? [item.location] : []);
                    const isSelected = locs.includes(r.name);
                    return (
                      <Badge
                        key={r.key}
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer text-[11px] py-0.5 px-2",
                          isSelected && "bg-blue-600 hover:bg-blue-700"
                        )}
                        onClick={() => {
                          let newLocs: string[];
                          if (r.name === "All Unit") {
                            newLocs = isSelected ? [] : ["All Unit"];
                          } else {
                            const filtered = locs.filter(l => l !== "All Unit");
                            newLocs = isSelected
                              ? filtered.filter(l => l !== r.name)
                              : [...filtered, r.name];
                          }
                          onUpdate(areaKey, item.id, {
                            locations: newLocs,
                            location: newLocs.join(", ")
                          });
                        }}
                        data-testid={`location-${item.id}-${r.key}`}
                      >
                        {r.name}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {config.hasLocation && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Location</Label>
                <Input
                  placeholder="Enter location..."
                  value={item.location || ""}
                  onChange={(e) => onUpdate(areaKey, item.id, { location: e.target.value })}
                  className="h-9"
                  data-testid={`input-location-${item.id}`}
                />
              </div>
            )}

            {config.hasCount && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Total Count</Label>
                  <Input
                    type="number"
                    min="0"
                    value={item.count ?? 0}
                    onChange={(e) => onUpdate(areaKey, item.id, { count: parseInt(e.target.value) || 0 })}
                    className="h-9"
                    data-testid={`input-count-${item.id}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Damaged Count</Label>
                  <Input
                    type="number"
                    min="0"
                    value={item.damagedCount ?? 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      const maxVal = item.count ?? 0;
                      onUpdate(areaKey, item.id, { damagedCount: maxVal > 0 ? Math.min(val, maxVal) : val });
                    }}
                    className="h-9"
                    data-testid={`input-damaged-${item.id}`}
                  />
                </div>
              </div>
            )}

            {notesField}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ComplementaryItemCardComponent({ item, areaKey, onUpdate, onRemove, onEditImage, onBeforeCapture, onAddMedia }: {
  item: ComplementaryItem;
  areaKey: string;
  onUpdate: (areaKey: string, itemId: string, updates: Partial<ComplementaryItem>) => void;
  onRemove: (areaKey: string, itemId: string) => void;
  onEditImage: (info: EditingImageInfo) => void;
  onBeforeCapture?: () => void;
  onAddMedia?: (areaKey: string, itemId: string, media: MediaPreview) => void;
}) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, forceType?: "PHOTO" | "VIDEO") => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const isVideo = forceType === "VIDEO" || file.type.startsWith("video/");
      const media: MediaPreview = {
        id: Math.random().toString(36).slice(2),
        file,
        type: isVideo ? "VIDEO" : "PHOTO",
        url: URL.createObjectURL(file),
        timestamp: new Date(),
      };
      if (onAddMedia) {
        onAddMedia(areaKey, item.id, media);
      } else {
        onUpdate(areaKey, item.id, { media: [...item.media, media] });
      }
    });

    if (photoInputRef.current) photoInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  return (
    <Card className="border-dashed">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Unlisted Item</Label>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            onClick={() => onRemove(areaKey, item.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <Input
          placeholder="Describe the item..."
          value={item.description || ""}
          onChange={(e) => {
            e.stopPropagation();
            onUpdate(areaKey, item.id, { description: e.target.value });
          }}
          onClick={(e) => e.stopPropagation()}
        />

        <Textarea
          placeholder="Add notes..."
          value={item.notes || ""}
          onChange={(e) => {
            e.stopPropagation();
            onUpdate(areaKey, item.id, { notes: e.target.value });
          }}
          onClick={(e) => e.stopPropagation()}
          className="min-h-[60px] resize-none"
        />

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { onBeforeCapture?.(); photoInputRef.current?.click(); }}
            className="h-8"
            data-testid={`button-comp-photo-${item.id}`}
          >
            <Camera className="h-3.5 w-3.5 mr-1.5" />
            Photo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { onBeforeCapture?.(); videoInputRef.current?.click(); }}
            className="h-8"
            data-testid={`button-comp-video-${item.id}`}
          >
            <Video className="h-3.5 w-3.5 mr-1.5" />
            Video
          </Button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e, "PHOTO")}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFileSelect(e, "VIDEO")}
          />

          {item.media.length > 0 && (
            <div className="flex gap-1.5">
              {item.media.map(m => (
                <div key={m.id} className="relative group">
                  {m.type === "VIDEO" ? (
                    <div className="relative w-10 h-10 rounded overflow-hidden bg-black">
                      <video src={m.url} className="w-full h-full object-cover" muted />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Video className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  ) : (
                    <img
                      src={m.url}
                      alt=""
                      className="w-10 h-10 object-cover rounded cursor-pointer"
                      onClick={() => onEditImage({ areaKey, itemId: item.id, mediaId: m.id, url: m.url, isComplementary: true })}
                    />
                  )}
                  {m.type === "PHOTO" && (
                    <button
                      onClick={() => onEditImage({ areaKey, itemId: item.id, mediaId: m.id, url: m.url, isComplementary: true })}
                      className="absolute -top-1 -left-1 w-4 h-4 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Pencil className="h-2 w-2" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ChecklistItemConfig {
  name: string;
  hasCount?: boolean;
  conditions: string[];
  section?: string;
  hasExistsField?: boolean;
  hasLocation?: boolean;
  hasLocationDropdown?: boolean;
  isRemovable?: boolean;
  isCoreItem?: boolean;
  hasBrandInput?: boolean;
  countOnly?: boolean;
  locationOnly?: boolean;
  locationInput?: boolean;
  workingYesNo?: boolean;
  workingLocationDropdown?: boolean;
  notesHint?: string;
  minCount?: number;
  noMediaRequired?: boolean;
}

const AREA_CHECKLIST_CONFIG: Record<string, ChecklistItemConfig[]> = {
  living_room: [
    { name: "Couch", hasCount: true, conditions: ["Good", "Stained", "Ripped/Torn", "Sagging", "Worn", "Damaged"], isCoreItem: true },
    { name: "Coffee Table", hasCount: true, conditions: ["Good", "Scratched", "Wobbly", "Chipped", "Water rings"], isRemovable: true },
    { name: "TV", conditions: ["Good", "Not working", "No WiFi connection", "Screen damaged", "Remote missing", "Cracked screen"], isCoreItem: true },
    { name: "Armchairs", hasCount: true, conditions: ["Good", "Stained", "Worn", "Wobbly", "Fabric damaged"], hasExistsField: true },
    { name: "Side Tables", hasCount: true, conditions: ["Good", "Scratched", "Wobbly", "Water rings"], isRemovable: true },
    { name: "Lamps", hasCount: true, conditions: ["Good", "Not working", "Shade damaged", "Missing bulb", "Cord damaged"], isRemovable: true },
    { name: "Rug", conditions: ["Good", "Stained", "Worn", "Frayed edges", "Wrinkled", "Odor"], hasExistsField: true },
    { name: "TV Remote", conditions: ["Good", "Not working", "Missing", "Buttons stuck", "Battery dead"], hasExistsField: true },
  ],
  dining_room: [
    { name: "Dining Table", conditions: ["Good", "Scratched", "Wobbly", "Stained", "Chipped", "Water rings"], isCoreItem: true },
    { name: "Dining Chairs", hasCount: true, conditions: ["Good", "Wobbly", "Stained", "Scratched", "Broken legs", "Fabric damaged"], isCoreItem: true },
  ],
  kitchen: [
    { name: "Sink", conditions: ["Good", "Leaking", "Slow drain", "Chipped/Cracked", "Stained"] },
    { name: "Faucet", conditions: ["Good", "Leaking", "Low pressure", "Hard to turn", "Sprayer broken"] },
    { name: "Cabinets", conditions: ["Good", "Doors won't close", "Missing handles", "Shelves broken", "Water damage", "Hinges broken"] },
    { name: "Countertops", conditions: ["Good", "Scratched", "Stained", "Chipped", "Burn marks"] },
    { name: "Kitchen Bin", conditions: ["Good", "Broken lid", "Damaged"], hasExistsField: true },
  ],
  closet: [
    { name: "Iron", conditions: ["Good", "Not working", "Dirty plate", "Cord damaged", "Leaking"], hasExistsField: true },
    { name: "Iron Board", conditions: ["Good", "Wobbly", "Cover stained", "Cover torn", "Broken legs"], hasExistsField: true },
    { name: "Vacuum", conditions: ["Good", "Not working", "Weak suction", "Broken attachments", "Full bag/bin"], hasExistsField: true },
    { name: "Hangers", conditions: [], hasExistsField: true, hasCount: true },
    { name: "Closet Door", conditions: ["Good", "Won't close", "Squeaky", "Damaged", "Off track"], isRemovable: true },
  ],
  appliances: [
    { name: "Fridge", conditions: ["Good", "Not cooling", "Noisy", "Ice maker broken", "Door seal damaged", "Dirty"] },
    { name: "Oven", conditions: ["Good", "Not heating", "Knobs missing", "Timer broken", "Dirty"], hasExistsField: true },
    { name: "Microwave", conditions: ["Good", "Not heating", "Turntable broken", "Door damaged", "Buttons not working"], hasExistsField: true },
    { name: "Dishwasher", conditions: ["Good", "Not cleaning", "Leaking", "Noisy", "Won't drain", "Door broken"], hasExistsField: true },
    { name: "Washer", conditions: ["Good", "Not working", "Leaking", "Noisy", "Won't drain", "Won't spin"], hasExistsField: true },
    { name: "Dryer", conditions: ["Good", "Not heating", "Not working", "Noisy", "Won't tumble", "Lint trap damaged"], hasExistsField: true },
    { name: "Kettle", conditions: ["Good", "Not heating", "Leaking", "Lid broken", "Scale buildup"], hasExistsField: true },
    { name: "Coffee Machine", conditions: ["Good", "Not working", "Leaking", "Dirty", "Missing parts"], hasExistsField: true, hasBrandInput: true },
    { name: "Kitchen Exhaust Fan", conditions: ["Good", "Not working", "Noisy", "Filter dirty", "Light broken"], hasExistsField: true },
    { name: "Heater", conditions: ["Good", "Not heating", "Noisy", "Thermostat broken"], hasExistsField: true },
    { name: "Smoke Detectors", conditions: [], hasExistsField: true, countOnly: true },
  ],
  general_fixtures: [
    { name: "Walls", conditions: ["Good", "Stained", "Peeling paint", "Holes", "Cracks", "Scuff marks"], hasLocationDropdown: true },
    { name: "Flooring", conditions: ["Good", "Scratched", "Stained", "Loose boards", "Worn carpet", "Loose tiles", "Grout damage"], hasLocationDropdown: true },
    { name: "Lights", conditions: ["Good", "Not working", "Flickering", "Fixture damaged", "Missing bulbs"], hasLocationDropdown: true },
    { name: "Outlets", conditions: ["Good", "Not working", "Loose", "Damaged cover"], hasLocationDropdown: true },
    { name: "Windows", conditions: ["Good", "Won't open", "Cracked glass", "Broken lock", "Drafty", "Dirty"], hasLocationDropdown: true },
    { name: "Blinds/Curtains", conditions: ["Good", "Broken slats", "Won't open/close", "Stained", "Missing"], hasLocationDropdown: true, isRemovable: true },
    { name: "Silicone", conditions: ["Good", "Peeling", "Moldy", "Cracked", "Missing"], hasLocationDropdown: true },
    { name: "Fuse Box", conditions: [], locationOnly: true, locationInput: true },
    { name: "Hot Water", conditions: [], workingYesNo: true, workingLocationDropdown: true, noMediaRequired: true },
    { name: "Cold Water", conditions: [], workingYesNo: true, workingLocationDropdown: true, noMediaRequired: true },
    { name: "Thermostat", conditions: [], workingYesNo: true, notesHint: "AC filter: Clean or Needs Replacement" },
  ],
  bedroom: [
    { name: "Bed Frame", conditions: ["Good", "Squeaky", "Broken slats", "Wobbly", "Scratched"], isCoreItem: true },
    { name: "Mattress", conditions: ["Good", "Stained", "Sagging", "Worn", "Odor"], isCoreItem: true },
    { name: "Nightstands", hasCount: true, conditions: ["Good", "Scratched", "Drawer broken", "Wobbly", "Water rings"], isRemovable: true },
    { name: "Closet", conditions: ["Good", "Doors damaged", "Shelves broken", "Rod bent", "Light not working", "Drawers stuck", "Missing handles"] },
    { name: "Lamps", hasCount: true, conditions: ["Good", "Not working", "Shade damaged", "Missing bulb"], isRemovable: true },
  ],
  bathroom: [
    { name: "Toilet", conditions: ["Good", "Running water", "Loose seat", "Stained", "Won't flush", "Leaking base"], isCoreItem: true },
    { name: "Sink", conditions: ["Good", "Chipped/Cracked", "Stained", "Cabinet damaged", "Drawer broken"], isCoreItem: true },
    { name: "Faucet", conditions: ["Good", "Leaking", "Low pressure", "Hard to turn", "Handles loose"] },
    { name: "Shower/Tub", conditions: ["Good", "Slow drain", "Chipped/Cracked", "Stained", "Grout damage", "Caulk peeling"], isCoreItem: true },
    { name: "Showerhead", conditions: ["Good", "Low pressure", "Leaking", "Clogged", "Broken mount"] },
    { name: "Mirror", conditions: ["Good", "Cracked", "Peeling edges", "Cloudy", "Loose mount"] },
    { name: "Exhaust Fan", conditions: ["Good", "Not working", "Noisy", "Dirty"], hasExistsField: true },
    { name: "Hair Dryer", conditions: ["Good", "Not working", "Cord damaged"], hasExistsField: true, isRemovable: true },
    { name: "Shower Curtain", conditions: ["Good", "Dirty", "Mold", "Torn", "Missing rings"], hasExistsField: true },
  ],
  kitchen_inventory: [
    { name: "Mugs", conditions: ["Good", "Chipped", "Cracked", "Stained"], hasExistsField: true, isRemovable: true },
    { name: "Wine Glasses", conditions: ["Good", "Chipped", "Cracked"], hasExistsField: true, isRemovable: true },
    { name: "Plates", conditions: ["Good", "Chipped", "Cracked", "Stained"], hasExistsField: true },
    { name: "Bowls", conditions: ["Good", "Chipped", "Cracked", "Stained"], hasExistsField: true },
    { name: "Utensils Set", conditions: ["Good", "Missing pieces", "Damaged"], hasExistsField: true },
    { name: "Pots & Pans", conditions: ["Good", "Missing pieces", "Scratched", "Burnt", "Missing lids", "Damaged handles"], hasExistsField: true },
    { name: "Cutting Boards", conditions: ["Good", "Cracked", "Stained", "Warped"], hasExistsField: true, isRemovable: true },
    { name: "Knives Set", conditions: ["Good", "Missing pieces", "Dull", "Damaged"], hasExistsField: true, isRemovable: true },
  ],
};

export default function OnboardingInspectionPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState<"details" | "inspection" | "complete">("details");
  const [propertyDetails, setPropertyDetails] = useState<PropertyDetails>({
    unitId: "",
    unitNumber: "",
    address: "",
    ownerName: "",
    pmId: "",
    bedroomCount: 1,
    bathroomCount: 1,
    keySetsProvided: 1,
    hasDen: false,
    bathroomTypes: ["full"],
    keyTypes: [],
    keyCounts: [],
  });
  const [currentAreaIndex, setCurrentAreaIndex] = useState(0);
  const [areasData, setAreasData] = useState<AllAreasData>({});
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [editingImage, setEditingImage] = useState<{ areaKey: string; itemId: string; mediaId: string; url: string; isComplementary?: boolean } | null>(null);
  const [validationErrors, setValidationErrors] = useState<Array<{ areaName: string; itemName: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: pms } = useQuery<UserType[]>({ queryKey: ["/api/users/pms"] });

  const generateAreas = () => {
    const areas: { key: string; name: string; icon: React.ReactNode }[] = [
      { key: "living_room", name: "Living Room", icon: <Sofa className="h-4 w-4" /> },
      { key: "dining_room", name: "Dining Room", icon: <Utensils className="h-4 w-4" /> },
      { key: "kitchen", name: "Kitchen", icon: <Utensils className="h-4 w-4" /> },
    ];

    for (let i = 1; i <= propertyDetails.bedroomCount; i++) {
      areas.push({
        key: `bedroom_${i}`,
        name: `Bedroom ${i}`,
        icon: <BedDouble className="h-4 w-4" />,
      });
    }

    for (let i = 1; i <= propertyDetails.bathroomCount; i++) {
      areas.push({
        key: `bathroom_${i}`,
        name: `Bathroom ${i}`,
        icon: <Bath className="h-4 w-4" />,
      });
    }

    areas.push({ key: "closet", name: "Closet", icon: <Shirt className="h-4 w-4" /> });
    areas.push({ key: "appliances", name: "Appliances", icon: <Refrigerator className="h-4 w-4" /> });
    areas.push({ key: "general_fixtures", name: "General Fixtures", icon: <Wrench className="h-4 w-4" /> });
    areas.push({ key: "kitchen_inventory", name: "Kitchen Inventory", icon: <Package className="h-4 w-4" /> });

    return areas;
  };

  const areas = generateAreas();
  const currentArea = areas[currentAreaIndex];

  const getAreaBaseKey = (areaKey: string): string => {
    if (areaKey.startsWith("bedroom_")) return "bedroom";
    if (areaKey.startsWith("bathroom_")) return "bathroom";
    return areaKey;
  };

  const getAreaChecklistConfig = (areaKey: string) => {
    const baseKey = getAreaBaseKey(areaKey);
    return AREA_CHECKLIST_CONFIG[baseKey] || [];
  };

  const initializeAreaData = (areaKey: string): AreaData => {
    const config = getAreaChecklistConfig(areaKey);
    return {
      checklist: config.map((item, idx) => ({
        id: `${areaKey}_${idx}`,
        name: item.name,
        condition: (item.hasExistsField || item.countOnly || item.locationOnly || item.workingYesNo) ? "" : "",
        count: (item.hasCount || item.countOnly) ? 0 : undefined,
        damagedCount: item.hasCount ? 0 : undefined,
        issues: [],
        notes: "",
        media: [],
        exists: item.hasExistsField ? undefined : undefined,
        location: (item.hasLocation || item.hasLocationDropdown || item.locationOnly || item.workingLocationDropdown) ? "" : undefined,
        isRemoved: false,
        brand: item.hasBrandInput ? "" : undefined,
        working: item.workingYesNo ? undefined : undefined,
      })),
      complementary: [],
      isComplete: false,
    };
  };

  const serverSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftLoadedRef = useRef(false);

  const restoreDraftData = (data: any) => {
    if (data.propertyDetails) setPropertyDetails({
      unitId: "",
      unitNumber: "",
      address: "",
      ownerName: "",
      pmId: "",
      bedroomCount: 1,
      bathroomCount: 1,
      keySetsProvided: 1,
      hasDen: false,
      bathroomTypes: ["full"],
      keyTypes: [],
      keyCounts: [],
      ...data.propertyDetails,
    });
    if (data.areasData) {
      const restoredAreas: AllAreasData = {};
      for (const areaKey in data.areasData) {
        restoredAreas[areaKey] = {
          ...data.areasData[areaKey],
          checklist: data.areasData[areaKey].checklist?.map((item: ChecklistItemData) => ({
            ...item,
            media: (item.media || [])
              .filter((m: MediaPreview) => m.uploadedUrl || (m.file instanceof File && m.file.size > 0))
              .map((m: MediaPreview & { timestamp: string | Date }) => ({
                ...m,
                url: m.uploadedUrl || m.url,
                timestamp: typeof m.timestamp === 'string' ? new Date(m.timestamp) : m.timestamp,
                uploading: false,
              })),
          })) || [],
          complementary: data.areasData[areaKey].complementary?.map((item: ComplementaryItem) => ({
            ...item,
            media: (item.media || [])
              .filter((m: MediaPreview) => m.uploadedUrl || (m.file instanceof File && m.file.size > 0))
              .map((m: MediaPreview & { timestamp: string | Date }) => ({
                ...m,
                url: m.uploadedUrl || m.url,
                timestamp: typeof m.timestamp === 'string' ? new Date(m.timestamp) : m.timestamp,
                uploading: false,
              })),
          })) || [],
        };
      }
      setAreasData(restoredAreas);
    }
    if (data.step) setStep(data.step);
    if (typeof data.currentAreaIndex === "number") setCurrentAreaIndex(data.currentAreaIndex);
  };

  useEffect(() => {
    const isFreshStart = new URLSearchParams(window.location.search).get("fresh") === "1";
    if (isFreshStart) {
      window.history.replaceState({}, "", window.location.pathname);
      draftLoadedRef.current = true;
      return;
    }
    const loadDraft = async () => {
      let serverDraftData: any = null;
      let serverUpdatedAt = 0;
      try {
        const token = localStorage.getItem("jwt_token");
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch("/api/inspection-drafts", { credentials: "include", headers });
        if (res.ok) {
          const drafts = await res.json();
          const onboardingDraft = drafts.find((d: any) => d.inspectionType === "ONBOARDING");
          if (onboardingDraft?.draftData) {
            serverDraftData = onboardingDraft.draftData;
            serverUpdatedAt = new Date(onboardingDraft.updatedAt || onboardingDraft.createdAt || 0).getTime();
          }
        }
      } catch (e) {
        console.error("Failed to load server draft:", e);
      }

      localStorage.removeItem("onboardingInspectionDraftV3");
      let localDraftData: any = null;
      let localSavedAt = 0;
      const saved = localStorage.getItem("onboardingInspectionDraftV4");
      if (saved) {
        try {
          localDraftData = JSON.parse(saved);
          localSavedAt = localDraftData?.savedAt || 0;
        } catch (e) {
          console.error("Failed to parse local draft:", e);
        }
      }

      if (localDraftData && localSavedAt > serverUpdatedAt) {
        restoreDraftData(localDraftData);
      } else if (serverDraftData) {
        restoreDraftData(serverDraftData);
      } else if (localDraftData) {
        restoreDraftData(localDraftData);
      }
      draftLoadedRef.current = true;
    };
    loadDraft();
  }, []);

  const latestDraftRef = useRef<any>(null);

  useEffect(() => {
    latestDraftRef.current = { propertyDetails, areasData, step, currentAreaIndex };
  });

  const scheduleDraftSave = useCallback(() => {
    if (localSaveTimerRef.current) clearTimeout(localSaveTimerRef.current);
    localSaveTimerRef.current = setTimeout(() => {
      if (!draftLoadedRef.current || !latestDraftRef.current) return;
      if (latestDraftRef.current.step === "complete") return;
      try {
        const payload = { ...latestDraftRef.current, savedAt: Date.now() };
        localStorage.setItem("onboardingInspectionDraftV4", JSON.stringify(payload));
      } catch (e) {
        console.error("Failed to save local draft:", e);
      }
    }, 500);

    if (serverSyncTimerRef.current) clearTimeout(serverSyncTimerRef.current);
    serverSyncTimerRef.current = setTimeout(async () => {
      if (!draftLoadedRef.current || !latestDraftRef.current) return;
      if (latestDraftRef.current.step === "complete") return;
      try {
        const token = localStorage.getItem("jwt_token");
        const hdrs: Record<string, string> = { "Content-Type": "application/json" };
        if (token) hdrs["Authorization"] = `Bearer ${token}`;
        await fetch("/api/inspection-drafts", {
          method: "PUT",
          headers: hdrs,
          credentials: "include",
          body: JSON.stringify({ inspectionType: "ONBOARDING", draftData: latestDraftRef.current }),
        });
      } catch (e) {
        console.error("Failed to sync draft to server:", e);
      }
    }, 3000);
  }, []);

  const saveDraftNow = useCallback(() => {
    if (!draftLoadedRef.current || !latestDraftRef.current) return;
    if (latestDraftRef.current.step === "complete") return;
    try {
      const payload = { ...latestDraftRef.current, savedAt: Date.now() };
      localStorage.setItem("onboardingInspectionDraftV4", JSON.stringify(payload));
    } catch (e) {
      console.error("Failed to save draft immediately:", e);
    }
  }, []);

  useEffect(() => {
    const handleVisChange = () => {
      if (document.visibilityState === "hidden") saveDraftNow();
    };
    const handlePageHide = () => saveDraftNow();
    const handleBeforeUnload = () => saveDraftNow();
    document.addEventListener("visibilitychange", handleVisChange);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisChange);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [saveDraftNow]);

  useEffect(() => {
    if (draftLoadedRef.current) {
      scheduleDraftSave();
    }
  }, [areasData, propertyDetails, step, currentAreaIndex]);

  const updatePropertyDetails = (field: keyof PropertyDetails, value: string | number | boolean | string[]) => {
    setPropertyDetails(prev => {
      const next = { ...prev, [field]: value };
      if (field === "bathroomCount") {
        const count = value as number;
        const current = prev.bathroomTypes;
        if (count > current.length) {
          next.bathroomTypes = [...current, ...Array(count - current.length).fill("full")];
        } else if (count < current.length) {
          next.bathroomTypes = current.slice(0, count);
        }
      }
      return next;
    });
    scheduleDraftSave();
  };

  const ensureAreaInitialized = (areaKey: string) => {
    const config = getAreaChecklistConfig(areaKey);
    const existing = areasData[areaKey];
    const needsInit = !existing || 
      existing.checklist.length !== config.length ||
      existing.checklist.some((item, idx) => item.name !== config[idx]?.name);
    if (needsInit) {
      setAreasData(prev => ({
        ...prev,
        [areaKey]: initializeAreaData(areaKey),
      }));
    }
  };

  const itemHasIssues = (item: ChecklistItemData): boolean => {
    return (item.condition !== undefined && item.condition !== "" && item.condition !== "Good" && item.condition !== "N/A") ||
      item.issues.length > 0 ||
      (item.exists === false) ||
      (item.damagedCount !== undefined && item.damagedCount > 0);
  };

  const isAreaComplete = (areaKey: string): boolean => {
    const data = areasData[areaKey];
    if (!data) return false;
    const config = getAreaChecklistConfig(areaKey);
    const allItemsDocumented = data.checklist.every((item, idx) => {
      if (item.isRemoved) return true;
      const itemConfig = config[idx];
      if (item.name === "Hangers") {
        return item.exists !== undefined;
      }
      if (itemConfig?.countOnly) {
        if (item.exists === undefined) return false;
        if (item.exists === true) return (item.count !== undefined && item.count >= 1);
        return true;
      }
      if (itemConfig?.locationOnly) {
        return !!item.location;
      }
      if (itemConfig?.workingYesNo) {
        if (item.working === undefined) return false;
        if (item.working === false && itemConfig.workingLocationDropdown) return !!item.location;
        return true;
      }
      if (itemConfig?.hasExistsField) {
        if (item.exists === undefined) return false;
        if (item.exists === false) return true;
      }
      if (!item.condition || item.condition === "") return false;
      if (!itemConfig?.noMediaRequired && itemHasIssues(item) && item.media.length === 0) return false;
      return true;
    });
    return allItemsDocumented && data.checklist.length > 0;
  };

  const getUnfilledItems = (): Array<{ areaName: string; itemName: string }> => {
    const unfilled: Array<{ areaName: string; itemName: string }> = [];
    areas.forEach(area => {
      const data = areasData[area.key];
      const config = getAreaChecklistConfig(area.key);
      if (data?.checklist) {
        data.checklist.forEach((item, idx) => {
          if (item.isRemoved) return;
          const itemConfig = config[idx];
          if (itemConfig?.countOnly) {
            if (item.exists === undefined) {
              unfilled.push({ areaName: area.name, itemName: item.name });
            } else if (item.exists === true && (!item.count || item.count < 1)) {
              unfilled.push({ areaName: area.name, itemName: `${item.name} (count required)` });
            }
            return;
          }
          if (itemConfig?.locationOnly) {
            if (!item.location) {
              unfilled.push({ areaName: area.name, itemName: item.name });
            }
            return;
          }
          if (itemConfig?.workingYesNo) {
            if (item.working === undefined) {
              unfilled.push({ areaName: area.name, itemName: item.name });
            } else if (item.working === false && itemConfig.workingLocationDropdown && !item.location) {
              unfilled.push({ areaName: area.name, itemName: `${item.name} (location required)` });
            }
            return;
          }
          if (itemConfig?.hasExistsField) {
            if (item.exists === undefined) {
              unfilled.push({ areaName: area.name, itemName: item.name });
            }
          } else {
            if (!item.condition || item.condition === "") {
              unfilled.push({ areaName: area.name, itemName: item.name });
            }
          }
          if (!itemConfig?.noMediaRequired && itemHasIssues(item) && item.media.length === 0 && !(item.exists === false)) {
            unfilled.push({ areaName: area.name, itemName: `${item.name} (photo/video required)` });
          }
        });
      }
    });
    return unfilled;
  };

  const updateChecklistItem = (areaKey: string, itemId: string, updates: Partial<ChecklistItemData>) => {
    setAreasData(prev => ({
      ...prev,
      [areaKey]: {
        ...prev[areaKey],
        checklist: prev[areaKey]?.checklist.map(item =>
          item.id === itemId ? { ...item, ...updates } : item
        ) || [],
      },
    }));
  };

  const uploadMediaImmediately = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("jwt_token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/media/upload-temp", {
        method: "POST",
        body: formData,
        headers,
        credentials: "include",
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.url as string;
    } catch {
      return null;
    }
  };

  const addMediaToChecklistItem = (areaKey: string, itemId: string, media: MediaPreview) => {
    const mediaWithUploading = { ...media, uploading: true };
    setAreasData(prev => ({
      ...prev,
      [areaKey]: {
        ...prev[areaKey],
        checklist: prev[areaKey]?.checklist.map(item =>
          item.id === itemId ? { ...item, media: [...item.media, mediaWithUploading] } : item
        ) || [],
      },
    }));

    uploadMediaImmediately(media.file).then(uploadedUrl => {
      setAreasData(prev => ({
        ...prev,
        [areaKey]: {
          ...prev[areaKey],
          checklist: prev[areaKey]?.checklist.map(item =>
            item.id === itemId ? {
              ...item,
              media: item.media.map(m =>
                m.id === media.id ? { ...m, uploadedUrl: uploadedUrl || undefined, uploading: false } : m
              ),
            } : item
          ) || [],
        },
      }));
      if (uploadedUrl) {
        console.log(`Media ${media.id} uploaded to ${uploadedUrl}`);
      } else {
        console.warn(`Media ${media.id} upload failed — will retry on submission`);
      }
    });
  };

  const removeMediaFromChecklistItem = (areaKey: string, itemId: string, mediaId: string) => {
    const item = areasData[areaKey]?.checklist.find(i => i.id === itemId);
    const media = item?.media.find(m => m.id === mediaId);
    if (media) URL.revokeObjectURL(media.url);
    
    setAreasData(prev => ({
      ...prev,
      [areaKey]: {
        ...prev[areaKey],
        checklist: prev[areaKey]?.checklist.map(item =>
          item.id === itemId ? { ...item, media: item.media.filter(m => m.id !== mediaId) } : item
        ) || [],
      },
    }));
  };

  const handleSaveEditedImage = (editedFile: File) => {
    if (!editingImage) return;
    const { areaKey, itemId, mediaId, isComplementary } = editingImage;
    const newUrl = URL.createObjectURL(editedFile);

    const updateMedia = (m: MediaPreview): MediaPreview => {
      if (m.id === mediaId) {
        URL.revokeObjectURL(m.url);
        return { ...m, file: editedFile, url: newUrl, uploadedUrl: undefined, uploading: true };
      }
      return m;
    };

    if (isComplementary) {
      setAreasData(prev => ({
        ...prev,
        [areaKey]: {
          ...prev[areaKey],
          complementary: (prev[areaKey]?.complementary || []).map((item: ComplementaryItem) =>
            item.id === itemId ? { ...item, media: item.media.map(updateMedia) } : item
          ),
        },
      }));
    } else {
      setAreasData(prev => ({
        ...prev,
        [areaKey]: {
          ...prev[areaKey],
          checklist: prev[areaKey]?.checklist.map(item =>
            item.id === itemId ? { ...item, media: item.media.map(updateMedia) } : item
          ) || [],
        },
      }));
    }
    setEditingImage(null);

    uploadMediaImmediately(editedFile).then(uploadedUrl => {
      const markUploaded = (m: MediaPreview): MediaPreview =>
        m.id === mediaId ? { ...m, uploadedUrl: uploadedUrl || undefined, uploading: false } : m;

      if (isComplementary) {
        setAreasData(prev => ({
          ...prev,
          [areaKey]: {
            ...prev[areaKey],
            complementary: (prev[areaKey]?.complementary || []).map((item: ComplementaryItem) =>
              item.id === itemId ? { ...item, media: item.media.map(markUploaded) } : item
            ),
          },
        }));
      } else {
        setAreasData(prev => ({
          ...prev,
          [areaKey]: {
            ...prev[areaKey],
            checklist: prev[areaKey]?.checklist.map(item =>
              item.id === itemId ? { ...item, media: item.media.map(markUploaded) } : item
            ) || [],
          },
        }));
      }
    });
  };

  const addComplementaryItem = (areaKey: string) => {
    setAreasData(prev => ({
      ...prev,
      [areaKey]: {
        ...prev[areaKey],
        complementary: [
          ...(prev[areaKey]?.complementary || []),
          {
            id: Math.random().toString(36).slice(2),
            description: "",
            notes: "",
            media: [],
          },
        ],
      },
    }));
  };

  const addMediaToComplementaryItem = (areaKey: string, itemId: string, media: MediaPreview) => {
    const mediaWithUploading = { ...media, uploading: true };
    setAreasData(prev => ({
      ...prev,
      [areaKey]: {
        ...prev[areaKey],
        complementary: (prev[areaKey]?.complementary || []).map((item: ComplementaryItem) =>
          item.id === itemId ? { ...item, media: [...item.media, mediaWithUploading] } : item
        ),
      },
    }));

    uploadMediaImmediately(media.file).then(uploadedUrl => {
      setAreasData(prev => ({
        ...prev,
        [areaKey]: {
          ...prev[areaKey],
          complementary: (prev[areaKey]?.complementary || []).map((item: ComplementaryItem) =>
            item.id === itemId ? {
              ...item,
              media: item.media.map(m =>
                m.id === media.id ? { ...m, uploadedUrl: uploadedUrl || undefined, uploading: false } : m
              ),
            } : item
          ),
        },
      }));
    });
  };

  const updateComplementaryItem = (areaKey: string, itemId: string, updates: Partial<ComplementaryItem>) => {
    setAreasData(prev => ({
      ...prev,
      [areaKey]: {
        ...prev[areaKey],
        complementary: prev[areaKey]?.complementary.map(item =>
          item.id === itemId ? { ...item, ...updates } : item
        ) || [],
      },
    }));
  };

  const removeComplementaryItem = (areaKey: string, itemId: string) => {
    const item = areasData[areaKey]?.complementary.find(i => i.id === itemId);
    item?.media.forEach(m => URL.revokeObjectURL(m.url));
    setAreasData(prev => ({
      ...prev,
      [areaKey]: {
        ...prev[areaKey],
        complementary: prev[areaKey]?.complementary.filter(item => item.id !== itemId) || [],
      },
    }));
  };



  const canStartInspection = (propertyDetails.unitNumber || "").trim() && (propertyDetails.address || "").trim() && propertyDetails.pmId && propertyDetails.bedroomCount > 0 && propertyDetails.bathroomCount > 0 && (propertyDetails.keyTypes || []).length > 0;

  const allAreasComplete = areas.every(area => isAreaComplete(area.key));

  const handleStartInspection = () => {
    if (!canStartInspection) return;
    areas.forEach(area => ensureAreaInitialized(area.key));
    setStep("inspection");
  };

  const handleBackToDetails = () => {
    setStep("details");
  };

  const handleNavigateToArea = (index: number) => {
    ensureAreaInitialized(areas[index].key);
    setCurrentAreaIndex(index);
    window.scrollTo(0, 0);
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("propertyName", propertyDetails.unitNumber.trim());
      formData.append("unitNumber", propertyDetails.unitNumber.trim());
      formData.append("address", propertyDetails.address.trim());
      formData.append("ownerName", (propertyDetails.ownerName || "").trim());
      formData.append("responsiblePmId", propertyDetails.pmId);
      formData.append("createdById", user?.id || "");
      formData.append("type", "ONBOARDING");
      formData.append("bedroomCount", propertyDetails.bedroomCount.toString());
      formData.append("bathroomCount", propertyDetails.bathroomCount.toString());
      formData.append("keySetsProvided", (propertyDetails.keyCounts || []).reduce((sum, k) => sum + k.count, 0).toString());
      formData.append("keyCounts", JSON.stringify(propertyDetails.keyCounts));
      formData.append("hasDen", propertyDetails.hasDen.toString());
      formData.append("bathroomTypes", JSON.stringify(propertyDetails.bathroomTypes));
      formData.append("keyTypes", JSON.stringify(propertyDetails.keyTypes));

      const checklistData: Array<{
        roomKey: string;
        itemKey: string;
        result: ChecklistResult;
        notes?: string;
        severity?: Severity;
        mediaIndices: number[];
      }> = [];

      let mediaIndex = 0;
      
      areas.forEach(area => {
        const areaData = areasData[area.key];
        if (areaData?.checklist) {
          areaData.checklist.forEach((item) => {
            if (item.isRemoved) return;

            const mediaIndices: number[] = [];
            item.media.forEach(m => {
              if (m.uploadedUrl) {
                formData.append(`mediaUrl_${mediaIndex}`, m.uploadedUrl);
              } else if (m.file instanceof File && m.file.size > 0) {
                formData.append(`media_${mediaIndex}`, m.file);
              } else {
                return;
              }
              formData.append(`mediaType_${mediaIndex}`, m.type);
              formData.append(`mediaTimestamp_${mediaIndex}`, m.timestamp instanceof Date ? m.timestamp.toISOString() : new Date(m.timestamp).toISOString());
              mediaIndices.push(mediaIndex);
              mediaIndex++;
            });

            const countInfo = item.count !== undefined ? `Count: ${item.count}, Damaged: ${item.damagedCount || 0}. ` : "";
            const issuesInfo = item.issues.length > 0 ? `Issues: ${item.issues.join(", ")}. ` : "";
            const notesInfo = item.notes ? `Notes: ${item.notes}` : "";
            const locationInfo = item.location ? `Location: ${item.location}. ` : "";
            const existsInfo = item.exists !== undefined ? `Exists: ${item.exists ? "Yes" : "No"}. ` : "";
            const brandInfo = item.brand ? `Brand: ${item.brand}. ` : "";
            const workingInfo = item.working !== undefined ? `Working: ${item.working ? "Yes" : "No"}. ` : "";

            let result: ChecklistResult = "GOOD";
            if (item.condition === "Missing" || (item.exists === false)) {
              result = "MISSING";
            } else if (item.condition === "Broken" || item.condition === "Damaged" || item.condition === "Not Working") {
              result = "NEED_REPLACEMENT";
            } else if (item.working === false) {
              result = "FAIL";
            } else if (item.damagedCount !== undefined && item.damagedCount > 0) {
              result = "FAIL";
            } else if (item.condition !== "Good" && item.condition !== "") {
              result = "FAIL";
            }

            const conditionPart = item.condition ? `Condition: ${item.condition}. ` : "";
            checklistData.push({
              roomKey: area.key,
              itemKey: item.name.toLowerCase().replace(/\s+/g, "_"),
              result,
              notes: `${conditionPart}${existsInfo}${workingInfo}${brandInfo}${countInfo}${issuesInfo}${locationInfo}${notesInfo}`.trim(),
              severity: result === "GOOD" ? undefined : "MED",
              mediaIndices,
            });
          });
        }
        
        if (areaData?.complementary) {
          areaData.complementary.forEach((item, idx) => {
            if (item.description) {
              const mediaIndices: number[] = [];
              item.media.forEach(m => {
                if (m.uploadedUrl) {
                  formData.append(`mediaUrl_${mediaIndex}`, m.uploadedUrl);
                } else if (m.file instanceof File && m.file.size > 0) {
                  formData.append(`media_${mediaIndex}`, m.file);
                } else {
                  return;
                }
                formData.append(`mediaType_${mediaIndex}`, m.type);
                formData.append(`mediaTimestamp_${mediaIndex}`, m.timestamp instanceof Date ? m.timestamp.toISOString() : new Date(m.timestamp).toISOString());
                mediaIndices.push(mediaIndex);
                mediaIndex++;
              });
              
              checklistData.push({
                roomKey: area.key,
                itemKey: `complementary_${idx}`,
                result: "FAIL" as ChecklistResult,
                notes: `${item.description}${item.notes ? `. Notes: ${item.notes}` : ""}`,
                severity: "MED",
                mediaIndices,
              });
            }
          });
        }
      });

      formData.append("checklistData", JSON.stringify(checklistData));
      formData.append("issuesData", JSON.stringify([]));
      formData.append("mediaCount", mediaIndex.toString());

      const token = localStorage.getItem("jwt_token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/inspections/onboarding", {
        method: "POST",
        body: formData,
        headers,
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Submission failed");
      }
      return res.json();
    },
    onSuccess: async () => {
      localStorage.removeItem("onboardingInspectionDraftV4");
      const token = localStorage.getItem("jwt_token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      try {
        await fetch("/api/inspection-drafts/ONBOARDING", { method: "DELETE", credentials: "include", headers });
      } catch {}
      queryClient.invalidateQueries({ queryKey: ["/api/inspection-drafts"] });
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

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await submitMutation.mutateAsync();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === "complete") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-full bg-chart-2/20 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-chart-2" />
          </div>
          <h1 className="text-2xl font-bold">Onboarding Complete!</h1>
          <p className="text-muted-foreground">Report has been generated and sent to the PM.</p>
          <Button onClick={() => setLocation("/home")} data-testid="button-done">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  if (step === "details") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-50 flex items-center gap-4 p-4 border-b bg-background/95 backdrop-blur">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/home")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-lg">Onboarding Inspection</h1>
            <p className="text-xs text-muted-foreground">Property Details</p>
          </div>
          <ThemeToggle />
        </header>

        <main className="flex-1 p-4 pb-24 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Property Assignment
              </CardTitle>
              <CardDescription>Select the property and PM for this inspection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Unit Number <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="e.g. 2420 Gerrard"
                  value={propertyDetails.unitNumber}
                  onChange={(e) => updatePropertyDetails("unitNumber", e.target.value)}
                  data-testid="input-unit-number"
                />
              </div>

              <div className="space-y-2">
                <Label>Address <span className="text-destructive">*</span></Label>
                <AddressAutocomplete
                  placeholder="e.g. 2420 Gerrard St E, Toronto, ON"
                  value={propertyDetails.address}
                  onChange={(v) => updatePropertyDetails("address", v)}
                />
              </div>

              <div className="space-y-2">
                <Label>Assigned PM <span className="text-destructive">*</span></Label>
                <Select value={propertyDetails.pmId} onValueChange={(v) => updatePropertyDetails("pmId", v)}>
                  <SelectTrigger data-testid="select-pm">
                    <SelectValue placeholder="Select PM" />
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5 text-primary" />
                Property Configuration
              </CardTitle>
              <CardDescription>Set up the property layout</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <BedDouble className="h-4 w-4" />
                    Bedrooms <span className="text-destructive">*</span>
                  </Label>
                  <Select 
                    value={propertyDetails.bedroomCount.toString()} 
                    onValueChange={(v) => updatePropertyDetails("bedroomCount", parseInt(v))}
                  >
                    <SelectTrigger data-testid="select-bedrooms">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DoorOpen className="h-4 w-4" />
                    Den
                  </Label>
                  <Select
                    value={propertyDetails.hasDen ? "yes" : "no"}
                    onValueChange={(v) => updatePropertyDetails("hasDen", v === "yes")}
                  >
                    <SelectTrigger data-testid="select-den">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Bath className="h-4 w-4" />
                    Bathrooms <span className="text-destructive">*</span>
                  </Label>
                  <Select 
                    value={propertyDetails.bathroomCount.toString()} 
                    onValueChange={(v) => updatePropertyDetails("bathroomCount", parseInt(v))}
                  >
                    <SelectTrigger data-testid="select-bathrooms">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map((n) => (
                        <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {propertyDetails.bathroomCount > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Bathroom Types</Label>
                  <div className="space-y-2">
                    {propertyDetails.bathroomTypes.map((type, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground min-w-[80px]">Bathroom {idx + 1}</span>
                        <Select
                          value={type}
                          onValueChange={(v) => {
                            const updated = [...propertyDetails.bathroomTypes];
                            updated[idx] = v;
                            updatePropertyDetails("bathroomTypes", updated);
                          }}
                        >
                          <SelectTrigger data-testid={`select-bathroom-type-${idx}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full">Full Bathroom</SelectItem>
                            <SelectItem value="half">Half Bathroom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Key Types <span className="text-destructive">*</span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "front_door", label: "Front Door" },
                    { value: "fob", label: "Fob" },
                    { value: "parking_clicker", label: "Parking Clicker" },
                    { value: "mail_key", label: "Mail Key" },
                  ].map((keyType) => {
                    const isSelected = propertyDetails.keyTypes.includes(keyType.value);
                    return (
                      <Badge
                        key={keyType.value}
                        variant={isSelected ? "default" : "outline"}
                        className={cn("cursor-pointer toggle-elevate", isSelected && "toggle-elevated")}
                        onClick={() => {
                          const updated = isSelected
                            ? propertyDetails.keyTypes.filter(k => k !== keyType.value)
                            : [...propertyDetails.keyTypes, keyType.value];
                          const currentCounts = propertyDetails.keyCounts || [];
                          const updatedCounts = isSelected
                            ? currentCounts.filter(k => k.type !== keyType.value)
                            : [...currentCounts, { type: keyType.value, count: 1 }];
                          setPropertyDetails(prev => ({ ...prev, keyTypes: updated, keyCounts: updatedCounts }));
                        }}
                        data-testid={`badge-key-type-${keyType.value}`}
                      >
                        {keyType.label}
                      </Badge>
                    );
                  })}
                </div>
                {(propertyDetails.keyCounts || []).length > 0 && (
                  <div className="space-y-2 mt-2 pl-1">
                    {(propertyDetails.keyCounts || []).map((kc) => {
                      const label = { front_door: "Front Door", fob: "Fob", parking_clicker: "Parking Clicker", mail_key: "Mail Key" }[kc.type] || kc.type;
                      return (
                        <div key={kc.type} className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground w-32">{label}</span>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setPropertyDetails(prev => ({
                                  ...prev,
                                  keyCounts: prev.keyCounts.map(k =>
                                    k.type === kc.type ? { ...k, count: Math.max(1, k.count - 1) } : k
                                  ),
                                }));
                              }}
                              data-testid={`btn-key-minus-${kc.type}`}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-medium w-6 text-center" data-testid={`text-key-count-${kc.type}`}>{kc.count}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setPropertyDetails(prev => ({
                                  ...prev,
                                  keyCounts: prev.keyCounts.map(k =>
                                    k.type === kc.type ? { ...k, count: k.count + 1 } : k
                                  ),
                                }));
                              }}
                              data-testid={`btn-key-plus-${kc.type}`}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </CardContent>
          </Card>
        </main>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          <div className="flex gap-3 max-w-lg mx-auto">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setLocation("/home")}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              className="flex-1"
              disabled={!canStartInspection}
              onClick={handleStartInspection}
              data-testid="button-start"
            >
              Start Inspection
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const checklistConfig = getAreaChecklistConfig(currentArea?.key || "");
  const currentAreaData = areasData[currentArea?.key] || initializeAreaData(currentArea?.key || "");

  const removeChecklistItem = (areaKey: string, itemId: string) => {
    setAreasData(prev => ({
      ...prev,
      [areaKey]: {
        ...prev[areaKey],
        checklist: prev[areaKey]?.checklist.map(item =>
          item.id === itemId ? { ...item, isRemoved: true } : item
        ) || [],
      },
    }));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <aside className="hidden lg:flex flex-col w-64 border-r bg-card fixed top-0 left-0 h-screen z-40">
        <div className="p-4 border-b">
          <Button variant="ghost" size="sm" onClick={handleBackToDetails} className="mb-2" data-testid="button-edit-details">
            <Settings className="h-4 w-4 mr-2" />
            Edit Property Details
          </Button>
          <h2 className="font-semibold text-lg">Areas</h2>
          <p className="text-xs text-muted-foreground">
            {areas.filter(a => isAreaComplete(a.key)).length} of {areas.length} documented
          </p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {areas.map((area, idx) => (
              <button
                key={area.key}
                onClick={() => handleNavigateToArea(idx)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                  currentAreaIndex === idx
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
                data-testid={`nav-area-${area.key}`}
              >
                {area.icon}
                <span className="flex-1 text-sm font-medium">{area.name}</span>
                {isAreaComplete(area.key) && (
                  <CheckCircle2 className={cn(
                    "h-4 w-4",
                    currentAreaIndex === idx ? "text-primary-foreground" : "text-blue-500"
                  )} />
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
        <div className="p-4 border-t space-y-2">
          <Button 
            className="w-full" 
            variant={allAreasComplete ? "default" : "outline"}
            onClick={handleSubmit}
            disabled={isSubmitting}
            data-testid="button-submit-sidebar"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Inspection"
            )}
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col lg:ml-64">
        <header className="sticky top-0 z-50 flex items-center gap-2 p-4 border-b bg-background/95 backdrop-blur lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setShowExitDialog(true)} data-testid="button-exit">
            <X className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold">{currentArea?.name}</h1>
            <p className="text-xs text-muted-foreground">
              Area {currentAreaIndex + 1} of {areas.length}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleBackToDetails} data-testid="button-back-to-details-mobile">
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span className="text-xs">Settings</span>
          </Button>
          <ThemeToggle />
        </header>

        <div className="lg:hidden overflow-x-auto border-b bg-muted/30">
          <div className="flex p-2 gap-1 min-w-max">
            {areas.map((area, idx) => (
              <button
                key={area.key}
                onClick={() => handleNavigateToArea(idx)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                  currentAreaIndex === idx
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted"
                )}
              >
                {area.icon}
                {area.name}
                {isAreaComplete(area.key) && (
                  <CheckCircle2 className={cn(
                    "h-3.5 w-3.5",
                    currentAreaIndex === idx ? "text-primary-foreground" : "text-blue-500"
                  )} />
                )}
              </button>
            ))}
          </div>
        </div>

        <main className="flex-1 p-3 sm:p-4 lg:px-5 lg:py-4 pb-32 lg:pb-6 overflow-auto">
          <div className="space-y-3">
            <div className="hidden lg:block mb-3">
              <h1 className="text-xl font-bold">{currentArea?.name}</h1>
              <p className="text-sm text-muted-foreground">Document the condition of items in this area</p>
            </div>

            {currentAreaData.checklist.map((item, idx) => {
              const config = checklistConfig[idx];
              if (!config) return null;
              return <ChecklistItemCard key={item.id} item={item} config={config} areaKey={currentArea.key} onUpdate={updateChecklistItem} onAddMedia={addMediaToChecklistItem} onRemoveMedia={removeMediaFromChecklistItem} onRemove={removeChecklistItem} onEditImage={setEditingImage} roomAreas={areas.filter(a => !["appliances", "general_fixtures", "kitchen_inventory", "closet"].includes(a.key))} onBeforeCapture={saveDraftNow} />;
            })}

            <div className="pt-3 border-t">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-sm">Complementary Items</h3>
                  <p className="text-xs text-muted-foreground">Document items not listed above</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addComplementaryItem(currentArea.key)}
                  data-testid="button-add-complementary"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Item
                </Button>
              </div>
              
              <div className="space-y-3">
                {currentAreaData.complementary.map(item => (
                  <ComplementaryItemCardComponent key={item.id} item={item} areaKey={currentArea.key} onUpdate={updateComplementaryItem} onRemove={removeComplementaryItem} onEditImage={setEditingImage} onBeforeCapture={saveDraftNow} onAddMedia={addMediaToComplementaryItem} />
                ))}
                {currentAreaData.complementary.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No complementary items added
                  </p>
                )}
              </div>
            </div>
          </div>
        </main>

        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => currentAreaIndex === 0 ? handleBackToDetails() : handleNavigateToArea(currentAreaIndex - 1)}
              data-testid="button-previous-area"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {currentAreaIndex === 0 ? "Property Settings" : "Previous"}
            </Button>
            {currentAreaIndex < areas.length - 1 ? (
              <Button
                className="flex-1"
                onClick={() => handleNavigateToArea(currentAreaIndex + 1)}
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                className="flex-1"
                variant={allAreasComplete ? "default" : "outline"}
                onClick={handleSubmit}
                disabled={isSubmitting}
                data-testid="button-submit"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Inspection?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress will be saved. You can continue later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => setLocation("/home")}>
              Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <AlertDialogContent className="max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Incomplete Inspection</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Please complete the following items before submitting:</p>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {validationErrors.slice(0, 10).map((error, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="text-destructive font-medium">{error.areaName}:</span>
                      <span>{error.itemName} - condition not set</span>
                    </div>
                  ))}
                  {validationErrors.length > 10 && (
                    <p className="text-sm text-muted-foreground">
                      ... and {validationErrors.length - 10} more items
                    </p>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowValidationDialog(false)}>
              Go Back & Complete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editingImage && (
        <ImageEditor
          imageUrl={editingImage.url}
          onSave={handleSaveEditedImage}
          onCancel={() => setEditingImage(null)}
        />
      )}
    </div>
  );
}
