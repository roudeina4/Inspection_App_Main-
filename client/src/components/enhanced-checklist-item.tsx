import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageEditor } from "@/components/image-editor";
import {
  Camera,
  Video,
  X,
  Check,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Minus as MinusIcon,
  AlertTriangle,
  CircleCheck,
} from "lucide-react";

interface MediaPreview {
  id: string;
  file: File;
  type: "PHOTO" | "VIDEO";
  url: string;
  timestamp: Date;
}

export type EnhancedInputType =
  | "COUNT_CONDITION"
  | "CONDITIONAL_YESNO"
  | "CONDITION_PRESET"
  | "EXISTS_CONDITION"
  | "PASS_FAIL"
  | "YES_NO";

export interface EnhancedItemDef {
  key: string;
  label: string;
  required: boolean;
  inputType: EnhancedInputType;
  presetConditions?: string[];
  hasSpareCount?: boolean;
  countLabel?: string;
  spareLabel?: string;
  dismissable?: boolean;
  yesIsBad?: boolean;
  hasLocation?: boolean;
}

export interface EnhancedItemResponse {
  result?: string;
  notes?: string;
  media?: MediaPreview[];
  count?: number;
  goodCount?: number;
  spareCount?: number;
  conditions?: string[];
  customCondition?: string;
  dismissed?: boolean;
  location?: string;
}

interface EnhancedChecklistItemProps {
  item: EnhancedItemDef;
  roomKey: string;
  response: EnhancedItemResponse;
  onChange: (data: Partial<EnhancedItemResponse>) => void;
  highlightIncomplete?: boolean;
}

function isItemComplete(item: EnhancedItemDef, response: EnhancedItemResponse): boolean {
  if (!item.required) return true;
  if (response.dismissed) return true;

  switch (item.inputType) {
    case "COUNT_CONDITION": {
      if (response.count === undefined || response.count <= 0) return false;
      if (response.goodCount === undefined) return false;
      const notGood = Math.max(0, (response.count ?? 0) - (response.goodCount ?? 0));
      if (notGood > 0 && (!response.media || response.media.length === 0)) return false;
      return true;
    }
    case "CONDITIONAL_YESNO": {
      if (!response.result) return false;
      const isBad = item.yesIsBad ? response.result === "YES" : response.result === "NO";
      if (isBad && (!response.media || response.media.length === 0)) return false;
      return true;
    }
    case "CONDITION_PRESET": {
      if (!response.result) return false;
      if (response.result === "FAIL" && (!response.media || response.media.length === 0)) return false;
      return true;
    }
    case "EXISTS_CONDITION": {
      if (!response.result) return false;
      return true;
    }
    case "PASS_FAIL": {
      if (!response.result) return false;
      if (response.result !== "NA" && (!response.media || response.media.length === 0)) return false;
      return true;
    }
    case "YES_NO": {
      if (!response.result) return false;
      if (response.result === "NO" && (!response.media || response.media.length === 0)) return false;
      return true;
    }
    default:
      return !!response.result;
  }
}

export { isItemComplete };

function MediaSection({
  media,
  onAdd,
  onRemove,
  onEdit,
  required,
}: {
  media: MediaPreview[];
  onAdd: (files: FileList) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
  required: boolean;
}) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onAdd(e.target.files);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => photoInputRef.current?.click()}
          className="flex-1 min-w-0"
          data-testid="button-photo"
        >
          <Camera className="mr-1.5 h-4 w-4 flex-shrink-0" />
          <span className="truncate">Photo</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => videoInputRef.current?.click()}
          className="flex-1 min-w-0"
          data-testid="button-video"
        >
          <Video className="mr-1.5 h-4 w-4 flex-shrink-0" />
          <span className="truncate">Video</span>
        </Button>
      </div>
      {required && media.length === 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">Photo or video required</p>
      )}
      {media.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {media.map((m) => (
            <div key={m.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
              {m.type === "PHOTO" ? (
                <img
                  src={m.url}
                  alt="Preview"
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => onEdit(m.id)}
                />
              ) : (
                <video src={m.url} className="w-full h-full object-cover" />
              )}
              <button
                type="button"
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md"
                onClick={() => onRemove(m.id)}
                data-testid={`button-remove-media-${m.id}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {m.type === "PHOTO" && (
                <button
                  type="button"
                  className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center"
                  onClick={() => onEdit(m.id)}
                  data-testid={`button-edit-media-${m.id}`}
                >
                  <Pencil className="h-2.5 w-2.5 text-white" />
                </button>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-1 py-0.5 flex items-center gap-0.5">
                <Clock className="h-2 w-2" />
                {(m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp)).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 99,
  label,
  testId,
  disabled,
  variant,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label?: string;
  testId?: string;
  disabled?: boolean;
  variant?: "default" | "readonly";
}) {
  if (variant === "readonly") {
    return (
      <div className="flex flex-col items-center gap-1.5" data-testid={testId}>
        {label && <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>}
        <div className="h-10 w-12 flex items-center justify-center rounded-lg bg-background border">
          <span className={`text-base font-bold tabular-nums ${disabled ? "text-muted-foreground" : ""}`} data-testid={testId ? `${testId}-value` : undefined}>{value}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5" data-testid={testId}>
      {label && <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>}
      <div className="flex items-center">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-8 sm:w-9 rounded-r-none border-r-0"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={disabled || value <= min}
          data-testid={testId ? `${testId}-minus` : undefined}
        >
          <MinusIcon className="h-3.5 w-3.5" />
        </Button>
        <div className="h-10 w-9 sm:w-10 flex items-center justify-center border bg-background">
          <span className={`text-base font-bold tabular-nums ${disabled ? "text-muted-foreground" : ""}`} data-testid={testId ? `${testId}-value` : undefined}>{value}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-8 sm:w-9 rounded-l-none border-l-0"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={disabled || value >= max}
          data-testid={testId ? `${testId}-plus` : undefined}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function ConditionSelector({
  presetConditions,
  selectedConditions,
  onToggle,
  onAddCustom,
  onRemoveCustom,
  itemKey,
  label,
}: {
  presetConditions: string[];
  selectedConditions: string[];
  onToggle: (c: string) => void;
  onAddCustom: (c: string) => void;
  onRemoveCustom: (c: string) => void;
  itemKey: string;
  label?: string;
}) {
  const [dropdownValue, setDropdownValue] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInput, setCustomInput] = useState("");

  const handleDropdownSelect = (val: string) => {
    if (val === "__add_custom__") {
      setShowCustomInput(true);
      setDropdownValue("");
      return;
    }
    if (!selectedConditions.includes(val)) {
      onToggle(val);
    }
    setDropdownValue("");
  };

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (trimmed && !selectedConditions.includes(trimmed)) {
      onAddCustom(trimmed);
      setCustomInput("");
      setShowCustomInput(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm text-muted-foreground">{label || "What's the issue?"}</Label>
      <Select value={dropdownValue} onValueChange={handleDropdownSelect}>
        <SelectTrigger data-testid={`select-condition-${itemKey}`} className="h-9">
          <SelectValue placeholder="Select issue..." />
        </SelectTrigger>
        <SelectContent>
          {presetConditions.map((c) => (
            <SelectItem key={c} value={c} disabled={selectedConditions.includes(c)}>
              {c} {selectedConditions.includes(c) ? "✓" : ""}
            </SelectItem>
          ))}
          <SelectItem value="__add_custom__" className="text-primary font-medium border-t mt-1 pt-1">
            + Add custom...
          </SelectItem>
        </SelectContent>
      </Select>

      {showCustomInput && (
        <div className="flex gap-2">
          <Input
            placeholder="Type custom issue..."
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCustom(); } }}
            className="h-9 text-sm flex-1 min-w-0"
            autoFocus
            data-testid={`input-custom-condition-${itemKey}`}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddCustom}
            disabled={!customInput.trim()}
            className="h-9 px-3 flex-shrink-0"
            data-testid={`button-add-condition-${itemKey}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => { setShowCustomInput(false); setCustomInput(""); }}
            className="h-9 px-2 flex-shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {selectedConditions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedConditions.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/50"
            >
              {c}
              <button
                type="button"
                onClick={() => {
                  if (presetConditions.includes(c)) {
                    onToggle(c);
                  } else {
                    onRemoveCustom(c);
                  }
                }}
                className="ml-0.5 rounded-full p-0.5"
                data-testid={`button-remove-condition-${itemKey}-${c.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function useMediaHandlers(media: MediaPreview[], onChange: (data: Partial<EnhancedItemResponse>) => void) {
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null);

  const handleAddMedia = (files: FileList) => {
    const newMedia: MediaPreview[] = [];
    Array.from(files).forEach((file) => {
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      if (isVideo || isImage) {
        newMedia.push({
          id: Math.random().toString(36).slice(2),
          file,
          type: isVideo ? "VIDEO" : "PHOTO",
          url: URL.createObjectURL(file),
          timestamp: new Date(),
        });
      }
    });
    onChange({ media: [...media, ...newMedia] });
  };

  const handleRemoveMedia = (id: string) => {
    const m = media.find((x) => x.id === id);
    if (m) URL.revokeObjectURL(m.url);
    onChange({ media: media.filter((x) => x.id !== id) });
  };

  const handleSaveEdit = (editedFile: File) => {
    if (!editingMediaId) return;
    const old = media.find((m) => m.id === editingMediaId);
    if (old) URL.revokeObjectURL(old.url);
    const newUrl = URL.createObjectURL(editedFile);
    onChange({
      media: media.map((m) =>
        m.id === editingMediaId ? { ...m, file: editedFile, url: newUrl } : m
      ),
    });
    setEditingMediaId(null);
  };

  const editingMedia = editingMediaId ? media.find((m) => m.id === editingMediaId) : null;

  return { editingMediaId, setEditingMediaId, handleAddMedia, handleRemoveMedia, handleSaveEdit, editingMedia };
}

function CountConditionItem({ item, roomKey, response, onChange, highlightIncomplete }: EnhancedChecklistItemProps) {
  const [showNotes, setShowNotes] = useState(!!response.notes);
  const media = response.media || [];
  const count = response.count ?? 0;
  const goodCount = response.goodCount ?? 0;
  const notGoodCount = Math.max(0, count - goodCount);
  const conditions = response.conditions || [];
  const complete = isItemComplete(item, response);
  const mediaRequired = notGoodCount > 0;
  const showError = highlightIncomplete && !complete && item.required;
  const { editingMediaId, setEditingMediaId, handleAddMedia, handleRemoveMedia, handleSaveEdit, editingMedia } = useMediaHandlers(media, onChange);

  const toggleCondition = (c: string) => {
    if (conditions.includes(c)) {
      onChange({ conditions: conditions.filter((x) => x !== c) });
    } else {
      onChange({ conditions: [...conditions, c] });
    }
  };

  return (
    <Card
      className={`transition-colors ${showError ? "border-red-400 dark:border-red-600 border-l-4 border-l-red-500 bg-red-50/30 dark:bg-red-900/10" : ""}`}
      data-testid={`checklist-item-${roomKey}-${item.key}`}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <Label className="text-base font-medium flex items-center gap-2">
            {item.label}
            {item.required && <span className={showError ? "text-red-500" : "text-muted-foreground"}>*</span>}
          </Label>
          {complete && <Check className="h-5 w-5 text-chart-2 flex-shrink-0" />}
        </div>

        <MediaSection
          media={media}
          onAdd={handleAddMedia}
          onRemove={handleRemoveMedia}
          onEdit={setEditingMediaId}
          required={mediaRequired}
        />

        <div className="bg-muted/30 rounded-xl p-3 sm:p-4">
          <div className="grid grid-cols-3 gap-1 sm:gap-4">
            <NumberStepper
              value={count}
              onChange={(v) => {
                const newGood = response.goodCount !== undefined ? Math.min(response.goodCount, v) : v;
                onChange({ count: v, goodCount: newGood });
              }}
              label={item.countLabel || "Total"}
              testId={`stepper-count-${item.key}`}
            />
            <NumberStepper
              value={goodCount}
              onChange={(v) => onChange({ goodCount: v })}
              max={count}
              label="Good"
              testId={`stepper-good-${item.key}`}
              disabled={count === 0}
            />
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Not Good</span>
              <div className="h-10 w-full max-w-[3.5rem] flex items-center justify-center rounded-lg bg-background border">
                <span className={`text-base font-bold tabular-nums ${notGoodCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {notGoodCount}
                </span>
              </div>
            </div>
          </div>

          {item.hasSpareCount && (
            <div className="pt-3 mt-3 border-t border-border/40 flex justify-center">
              <NumberStepper
                value={response.spareCount ?? 0}
                onChange={(v) => onChange({ spareCount: v })}
                label={item.spareLabel || "Spares (new)"}
                testId={`stepper-spare-${item.key}`}
              />
            </div>
          )}
        </div>

        {notGoodCount > 0 && item.presetConditions && item.presetConditions.length > 0 && (
          <ConditionSelector
            presetConditions={item.presetConditions}
            selectedConditions={conditions}
            onToggle={toggleCondition}
            onAddCustom={(c) => onChange({ conditions: [...conditions, c] })}
            onRemoveCustom={(c) => onChange({ conditions: conditions.filter(x => x !== c) })}
            itemKey={item.key}
          />
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setShowNotes(!showNotes)}
          data-testid={`toggle-notes-${item.key}`}
        >
          {showNotes ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
          {showNotes ? "Hide Notes" : "Add Notes"}
        </Button>

        {showNotes && (
          <Textarea
            placeholder="Add notes..."
            value={response.notes || ""}
            onChange={(e) => onChange({ notes: e.target.value })}
            className="min-h-16"
            data-testid={`input-notes-${item.key}`}
          />
        )}
      </CardContent>

      {editingMedia && editingMedia.type === "PHOTO" && (
        <ImageEditor
          imageUrl={editingMedia.url}
          onSave={handleSaveEdit}
          onCancel={() => setEditingMediaId(null)}
        />
      )}
    </Card>
  );
}

function ConditionalYesNoItem({ item, roomKey, response, onChange, highlightIncomplete }: EnhancedChecklistItemProps) {
  const [showNotes, setShowNotes] = useState(!!response.notes);
  const media = response.media || [];
  const result = response.result;
  const isBad = item.yesIsBad ? result === "YES" : result === "NO";
  const isGood = result && !isBad;
  const mediaRequired = isBad;
  const complete = isItemComplete(item, response);
  const conditions = response.conditions || [];
  const showError = highlightIncomplete && !complete && item.required;
  const { editingMediaId, setEditingMediaId, handleAddMedia, handleRemoveMedia, handleSaveEdit, editingMedia } = useMediaHandlers(media, onChange);

  const toggleCondition = (c: string) => {
    if (conditions.includes(c)) {
      onChange({ conditions: conditions.filter((x) => x !== c) });
    } else {
      onChange({ conditions: [...conditions, c] });
    }
  };

  return (
    <Card
      className={`transition-colors ${showError ? "border-red-400 dark:border-red-600 border-l-4 border-l-red-500 bg-red-50/30 dark:bg-red-900/10" : ""}`}
      data-testid={`checklist-item-${roomKey}-${item.key}`}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <Label className="text-base font-medium flex items-center gap-2">
            {item.label}
            {item.required && <span className={showError ? "text-red-500" : "text-muted-foreground"}>*</span>}
          </Label>
          {complete && <Check className="h-5 w-5 text-chart-2 flex-shrink-0" />}
        </div>

        <MediaSection
          media={media}
          onAdd={handleAddMedia}
          onRemove={handleRemoveMedia}
          onEdit={setEditingMediaId}
          required={mediaRequired}
        />

        <div className="flex gap-2">
          <Button
            type="button"
            variant={result === "YES" ? "default" : "outline"}
            size="lg"
            className="flex-1 min-w-0"
            onClick={() => onChange({ result: "YES" })}
            data-testid={`button-yes-${item.key}`}
          >
            {item.yesIsBad ? (
              <AlertTriangle className={`mr-1.5 h-4 w-4 flex-shrink-0 ${result === "YES" ? "" : "text-amber-600"}`} />
            ) : (
              <CircleCheck className={`mr-1.5 h-4 w-4 flex-shrink-0 ${result === "YES" ? "" : "text-emerald-600"}`} />
            )}
            <span className="truncate">{item.yesIsBad ? "Yes" : "Yes"}</span>
          </Button>
          <Button
            type="button"
            variant={result === "NO" ? "default" : "outline"}
            size="lg"
            className="flex-1 min-w-0"
            onClick={() => onChange({ result: "NO" })}
            data-testid={`button-no-${item.key}`}
          >
            {item.yesIsBad ? (
              <CircleCheck className={`mr-1.5 h-4 w-4 flex-shrink-0 ${result === "NO" ? "" : "text-emerald-600"}`} />
            ) : (
              <XCircle className={`mr-1.5 h-4 w-4 flex-shrink-0 ${result === "NO" ? "" : "text-amber-600"}`} />
            )}
            <span className="truncate">{item.yesIsBad ? "No" : "No"}</span>
          </Button>
        </div>

        {isGood && (
          <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
            <CircleCheck className="h-4 w-4 flex-shrink-0" />
            Good condition — photo optional
          </div>
        )}

        {isBad && (
          <>
            {item.presetConditions && item.presetConditions.length > 0 && (
              <ConditionSelector
                presetConditions={item.presetConditions}
                selectedConditions={conditions}
                onToggle={toggleCondition}
                onAddCustom={(c) => onChange({ conditions: [...conditions, c] })}
                onRemoveCustom={(c) => onChange({ conditions: conditions.filter(x => x !== c) })}
                itemKey={item.key}
              />
            )}

            {(!item.presetConditions || item.presetConditions.length === 0) && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Describe the issue</Label>
                <Input
                  placeholder="What's the issue?"
                  value={response.notes || ""}
                  onChange={(e) => onChange({ notes: e.target.value })}
                  className="h-9 text-sm"
                  data-testid={`input-issue-${item.key}`}
                />
              </div>
            )}
          </>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setShowNotes(!showNotes)}
          data-testid={`toggle-notes-${item.key}`}
        >
          {showNotes ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
          {showNotes ? "Hide Notes" : "Add Notes"}
        </Button>

        {showNotes && (
          <Textarea
            placeholder="Add notes..."
            value={response.notes || ""}
            onChange={(e) => onChange({ notes: e.target.value })}
            className="min-h-16"
            data-testid={`input-notes-${item.key}`}
          />
        )}
      </CardContent>

      {editingMedia && editingMedia.type === "PHOTO" && (
        <ImageEditor
          imageUrl={editingMedia.url}
          onSave={handleSaveEdit}
          onCancel={() => setEditingMediaId(null)}
        />
      )}
    </Card>
  );
}

function ExistsConditionItem({ item, roomKey, response, onChange, highlightIncomplete }: EnhancedChecklistItemProps) {
  const [showNotes, setShowNotes] = useState(!!response.notes);
  const media = response.media || [];
  const result = response.result;
  const exists = result === "YES";
  const notExists = result === "NO";
  const complete = isItemComplete(item, response);
  const conditions = response.conditions || [];
  const showError = highlightIncomplete && !complete && item.required;
  const { editingMediaId, setEditingMediaId, handleAddMedia, handleRemoveMedia, handleSaveEdit, editingMedia } = useMediaHandlers(media, onChange);

  const toggleCondition = (c: string) => {
    if (conditions.includes(c)) {
      onChange({ conditions: conditions.filter((x) => x !== c) });
    } else {
      onChange({ conditions: [...conditions, c] });
    }
  };

  return (
    <Card
      className={`transition-colors ${showError ? "border-red-400 dark:border-red-600 border-l-4 border-l-red-500 bg-red-50/30 dark:bg-red-900/10" : ""}`}
      data-testid={`checklist-item-${roomKey}-${item.key}`}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <Label className="text-base font-medium flex items-center gap-2">
            {item.label}
            {item.required && <span className={showError ? "text-red-500" : "text-muted-foreground"}>*</span>}
          </Label>
          {complete && <Check className="h-5 w-5 text-chart-2 flex-shrink-0" />}
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant={result === "YES" ? "default" : "outline"}
            size="lg"
            className="flex-1 min-w-0"
            onClick={() => onChange({ result: "YES", conditions: [] })}
            data-testid={`button-yes-${item.key}`}
          >
            <CircleCheck className={`mr-1.5 h-4 w-4 flex-shrink-0 ${result === "YES" ? "" : "text-emerald-600"}`} />
            <span className="truncate">Exists</span>
          </Button>
          <Button
            type="button"
            variant={result === "NO" ? "default" : "outline"}
            size="lg"
            className="flex-1 min-w-0"
            onClick={() => onChange({ result: "NO", conditions: [], location: "" })}
            data-testid={`button-no-${item.key}`}
          >
            <XCircle className={`mr-1.5 h-4 w-4 flex-shrink-0 ${result === "NO" ? "" : "text-amber-600"}`} />
            <span className="truncate">Missing</span>
          </Button>
        </div>

        {exists && (
          <>
            {item.hasLocation && (
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Location</Label>
                <Input
                  placeholder="Where is this item located?"
                  value={response.location || ""}
                  onChange={(e) => onChange({ location: e.target.value })}
                  className="h-9 text-sm"
                  data-testid={`input-location-${item.key}`}
                />
              </div>
            )}

            {item.presetConditions && item.presetConditions.length > 0 && (
              <ConditionSelector
                presetConditions={item.presetConditions}
                selectedConditions={conditions}
                onToggle={toggleCondition}
                onAddCustom={(c) => onChange({ conditions: [...conditions, c] })}
                onRemoveCustom={(c) => onChange({ conditions: conditions.filter(x => x !== c) })}
                itemKey={item.key}
                label="Condition (optional)"
              />
            )}

            <MediaSection
              media={media}
              onAdd={handleAddMedia}
              onRemove={handleRemoveMedia}
              onEdit={setEditingMediaId}
              required={false}
            />
          </>
        )}

        {notExists && (
          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            Item is missing — noted
          </div>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setShowNotes(!showNotes)}
          data-testid={`toggle-notes-${item.key}`}
        >
          {showNotes ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
          {showNotes ? "Hide Notes" : "Add Notes"}
        </Button>

        {showNotes && (
          <Textarea
            placeholder="Add notes..."
            value={response.notes || ""}
            onChange={(e) => onChange({ notes: e.target.value })}
            className="min-h-16"
            data-testid={`input-notes-${item.key}`}
          />
        )}
      </CardContent>

      {editingMedia && editingMedia.type === "PHOTO" && (
        <ImageEditor
          imageUrl={editingMedia.url}
          onSave={handleSaveEdit}
          onCancel={() => setEditingMediaId(null)}
        />
      )}
    </Card>
  );
}

function ConditionPresetItem({ item, roomKey, response, onChange, highlightIncomplete }: EnhancedChecklistItemProps) {
  const [showNotes, setShowNotes] = useState(!!response.notes);
  const media = response.media || [];
  const result = response.result;
  const conditions = response.conditions || [];
  const needsAttention = result === "FAIL";
  const isGood = result === "PASS";
  const mediaRequired = needsAttention;
  const complete = isItemComplete(item, response);
  const showError = highlightIncomplete && !complete && item.required && !response.dismissed;
  const { editingMediaId, setEditingMediaId, handleAddMedia, handleRemoveMedia, handleSaveEdit, editingMedia } = useMediaHandlers(media, onChange);

  const toggleCondition = (c: string) => {
    if (conditions.includes(c)) {
      onChange({ conditions: conditions.filter((x) => x !== c) });
    } else {
      onChange({ conditions: [...conditions, c] });
    }
  };

  if (response.dismissed) {
    return (
      <Card className="opacity-50" data-testid={`checklist-item-${roomKey}-${item.key}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium text-muted-foreground line-through">{item.label}</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange({ dismissed: false })}
              className="text-xs"
              data-testid={`button-restore-${item.key}`}
            >
              Restore
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`transition-colors ${showError ? "border-red-400 dark:border-red-600 border-l-4 border-l-red-500 bg-red-50/30 dark:bg-red-900/10" : ""}`}
      data-testid={`checklist-item-${roomKey}-${item.key}`}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <Label className="text-base font-medium flex items-center gap-2">
            {item.label}
            {item.required && <span className={showError ? "text-red-500" : "text-muted-foreground"}>*</span>}
          </Label>
          <div className="flex items-center gap-1">
            {complete && <Check className="h-5 w-5 text-chart-2 flex-shrink-0" />}
            {item.dismissable && (
              <button
                type="button"
                onClick={() => onChange({ dismissed: true })}
                className="rounded-full p-1 bg-muted/50 transition-colors"
                data-testid={`button-dismiss-${item.key}`}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        <MediaSection
          media={media}
          onAdd={handleAddMedia}
          onRemove={handleRemoveMedia}
          onEdit={setEditingMediaId}
          required={mediaRequired}
        />

        <div className="flex gap-2">
          <Button
            type="button"
            variant={result === "PASS" ? "default" : "outline"}
            size="lg"
            className="flex-1 min-w-0"
            onClick={() => onChange({ result: "PASS", conditions: [] })}
            data-testid={`button-good-${item.key}`}
          >
            <CircleCheck className={`mr-1.5 h-4 w-4 flex-shrink-0 ${result === "PASS" ? "" : "text-emerald-600"}`} />
            <span className="truncate">Good</span>
          </Button>
          <Button
            type="button"
            variant={result === "FAIL" ? "default" : "outline"}
            size="lg"
            className="flex-1 min-w-0"
            onClick={() => onChange({ result: "FAIL" })}
            data-testid={`button-attention-${item.key}`}
          >
            <AlertTriangle className={`mr-1.5 h-4 w-4 flex-shrink-0 ${result === "FAIL" ? "" : "text-amber-600"}`} />
            <span className="truncate">Needs Attention</span>
          </Button>
        </div>

        {isGood && (
          <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
            <CircleCheck className="h-4 w-4 flex-shrink-0" />
            Good condition — photo optional
          </div>
        )}

        {needsAttention && item.presetConditions && item.presetConditions.length > 0 && (
          <ConditionSelector
            presetConditions={item.presetConditions}
            selectedConditions={conditions}
            onToggle={toggleCondition}
            onAddCustom={(c) => onChange({ conditions: [...conditions, c] })}
            onRemoveCustom={(c) => onChange({ conditions: conditions.filter(x => x !== c) })}
            itemKey={item.key}
          />
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setShowNotes(!showNotes)}
          data-testid={`toggle-notes-${item.key}`}
        >
          {showNotes ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
          {showNotes ? "Hide Notes" : "Add Notes"}
        </Button>

        {showNotes && (
          <Textarea
            placeholder="Add notes..."
            value={response.notes || ""}
            onChange={(e) => onChange({ notes: e.target.value })}
            className="min-h-16"
            data-testid={`input-notes-${item.key}`}
          />
        )}
      </CardContent>

      {editingMedia && editingMedia.type === "PHOTO" && (
        <ImageEditor
          imageUrl={editingMedia.url}
          onSave={handleSaveEdit}
          onCancel={() => setEditingMediaId(null)}
        />
      )}
    </Card>
  );
}

export function EnhancedChecklistItem(props: EnhancedChecklistItemProps) {
  switch (props.item.inputType) {
    case "COUNT_CONDITION":
      return <CountConditionItem {...props} />;
    case "CONDITIONAL_YESNO":
      return <ConditionalYesNoItem {...props} />;
    case "CONDITION_PRESET":
      return <ConditionPresetItem {...props} />;
    case "EXISTS_CONDITION":
      return <ExistsConditionItem {...props} />;
    default:
      return <ConditionPresetItem {...props} />;
  }
}
