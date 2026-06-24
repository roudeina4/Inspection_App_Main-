import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Camera, 
  Video, 
  X, 
  Check, 
  XCircle, 
  Minus,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Pencil,
} from "lucide-react";
import { ImageEditor } from "@/components/image-editor";
import type { TemplateItem, ChecklistResult, Severity } from "@shared/schema";

interface MediaPreview {
  id: string;
  file: File;
  type: "PHOTO" | "VIDEO";
  url: string;
  timestamp: Date;
}

interface ChecklistItemProps {
  item: TemplateItem;
  roomKey: string;
  value?: ChecklistResult;
  notes?: string;
  severity?: Severity;
  media?: MediaPreview[];
  onChange: (data: {
    result?: ChecklistResult;
    notes?: string;
    severity?: Severity;
    media?: MediaPreview[];
  }) => void;
  inspectionType: "FULL_INSPECTION" | "ONBOARDING";
}

export function ChecklistItem({
  item,
  roomKey,
  value,
  notes = "",
  severity,
  media = [],
  onChange,
  inspectionType,
}: ChecklistItemProps) {
  const [showNotes, setShowNotes] = useState(!!notes || value === "FAIL" || value === "NEED_REPLACEMENT");
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

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
    e.target.value = "";
  };

  const removeMedia = (id: string) => {
    const mediaItem = media.find((m) => m.id === id);
    if (mediaItem) URL.revokeObjectURL(mediaItem.url);
    onChange({ media: media.filter((m) => m.id !== id) });
  };

  const handleSaveEdit = (editedFile: File) => {
    if (!editingMediaId) return;
    const oldItem = media.find((m) => m.id === editingMediaId);
    if (oldItem) URL.revokeObjectURL(oldItem.url);
    const newUrl = URL.createObjectURL(editedFile);
    onChange({
      media: media.map((m) =>
        m.id === editingMediaId
          ? { ...m, file: editedFile, url: newUrl }
          : m
      ),
    });
    setEditingMediaId(null);
  };

  const editingMedia = editingMediaId ? media.find((m) => m.id === editingMediaId) : null;

  const getResultOptions = () => {
    if (inspectionType === "ONBOARDING") {
      return [
        { value: "MISSING", label: "Missing", icon: XCircle, color: "text-chart-4" },
        { value: "NEED_REPLACEMENT", label: "Need Replacement", icon: AlertTriangle, color: "text-destructive" },
        { value: "GOOD", label: "Good Condition", icon: Check, color: "text-chart-2" },
      ];
    }
    if (item.inputType === "YES_NO") {
      return [
        { value: "YES", label: "Yes", icon: Check, color: "text-chart-2" },
        { value: "NO", label: "No", icon: XCircle, color: "text-destructive" },
      ];
    }
    return [
      { value: "PASS", label: "Pass", icon: Check, color: "text-chart-2" },
      { value: "FAIL", label: "Fail", icon: XCircle, color: "text-destructive" },
      { value: "NA", label: "N/A", icon: Minus, color: "text-muted-foreground" },
    ];
  };

  const options = getResultOptions();
  // N/A items don't require media for Full Inspection
  const mediaRequired = inspectionType === "ONBOARDING" 
    ? (value === "GOOD" || value === "NEED_REPLACEMENT") 
    : (item.requiresMedia && value !== "NA");
  const isComplete = value && (mediaRequired ? media.length > 0 : true);
  const showSeverity = value === "FAIL" || value === "NO" || value === "NEED_REPLACEMENT";
  const needsMedia = mediaRequired;

  return (
    <Card 
      className={`transition-colors ${!isComplete && item.required ? "border-l-4 border-l-destructive" : ""}`}
      data-testid={`checklist-item-${roomKey}-${item.key}`}
    >
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <Label className="text-base font-medium flex items-center gap-2">
              {item.label}
              {item.required && <span className="text-destructive">*</span>}
            </Label>
            {needsMedia && media.length === 0 && (
              <p className="text-xs text-destructive mt-1">Photo/video required</p>
            )}
          </div>
          {isComplete && (
            <Check className="h-5 w-5 text-chart-2" />
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {options.map((opt) => {
            const Icon = opt.icon;
            const isSelected = value === opt.value;
            return (
              <Button
                key={opt.value}
                type="button"
                variant={isSelected ? "default" : "outline"}
                size="lg"
                className={`flex-1 min-w-24 ${isSelected ? "" : `hover:${opt.color}`}`}
                onClick={() => {
                  onChange({ result: opt.value as ChecklistResult });
                  if (opt.value === "FAIL" || opt.value === "NEED_REPLACEMENT" || opt.value === "NO") {
                    setShowNotes(true);
                  }
                }}
                data-testid={`button-${opt.value.toLowerCase()}`}
              >
                <Icon className={`mr-2 h-4 w-4 ${isSelected ? "" : opt.color}`} />
                {opt.label}
              </Button>
            );
          })}
        </div>

        {showSeverity && (
          <div className="space-y-2">
            <Label className="text-sm">Severity</Label>
            <Select value={severity || ""} onValueChange={(v) => onChange({ severity: v as Severity })}>
              <SelectTrigger data-testid="select-severity">
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MED">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />

          {media.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {media.map((m) => (
                <div key={m.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                  {m.type === "PHOTO" ? (
                    <img
                      src={m.url}
                      alt="Preview"
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setEditingMediaId(m.id)}
                      data-testid={`media-edit-${m.id}`}
                    />
                  ) : (
                    <video src={m.url} className="w-full h-full object-cover" />
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-0.5 right-0.5 h-5 w-5"
                    onClick={() => removeMedia(m.id)}
                  >
                    <X className="h-2.5 w-2.5" />
                  </Button>
                  {m.type === "PHOTO" && (
                    <button
                      type="button"
                      className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center"
                      onClick={() => setEditingMediaId(m.id)}
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

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1"
              data-testid="button-photo"
            >
              <Camera className="mr-2 h-4 w-4" />
              Photo
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1"
              data-testid="button-video"
            >
              <Video className="mr-2 h-4 w-4" />
              Video
            </Button>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setShowNotes(!showNotes)}
        >
          {showNotes ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
          {showNotes ? "Hide Notes" : "Add Notes"}
        </Button>

        {showNotes && (
          <Textarea
            placeholder="Add notes..."
            value={notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            className="min-h-20"
            data-testid="input-notes"
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
