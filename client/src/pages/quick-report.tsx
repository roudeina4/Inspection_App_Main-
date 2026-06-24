import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { ImageEditor } from "@/components/image-editor";
import { 
  ArrowLeft, 
  Camera, 
  Video, 
  X, 
  Upload, 
  Loader2, 
  CheckCircle2,
  AlertTriangle,
  Clock,
  LogOut,
  Pencil,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

interface MediaPreview {
  id: string;
  file: File;
  type: "PHOTO" | "VIDEO";
  url: string;
  timestamp: Date;
}

const LOCATIONS = [
  { value: "KITCHEN", label: "Kitchen" },
  { value: "BATHROOM", label: "Bathroom" },
  { value: "BEDROOM", label: "Bedroom" },
  { value: "LIVING_ROOM", label: "Living Room" },
  { value: "HALLWAY", label: "Hallway" },
  { value: "BALCONY", label: "Balcony" },
  { value: "EXTERIOR", label: "Exterior" },
  { value: "OTHER", label: "Other" },
];

const SEVERITIES = [
  { value: "MINOR", label: "Minor", color: "text-chart-2" },
  { value: "MODERATE", label: "Moderate", color: "text-chart-4" },
  { value: "SEVERE", label: "Severe", color: "text-destructive" },
];

export default function QuickReportPage() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [unitNumber, setUnitNumber] = useState("");
  const [pmId, setPmId] = useState("");
  const [location, setLocationValue] = useState("");
  const [locationDetails, setLocationDetails] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("");
  const [pmNotes, setPmNotes] = useState("");
  const [cleaningNotes, setCleaningNotes] = useState("");
  const [mediaFiles, setMediaFiles] = useState<MediaPreview[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null);

  const { data: pms } = useQuery<User[]>({
    queryKey: ["/api/users/pms"],
  });

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

    setMediaFiles((prev) => [...prev, ...newMedia]);
    e.target.value = "";
  };

  const removeMedia = (id: string) => {
    setMediaFiles((prev) => {
      const item = prev.find((m) => m.id === id);
      if (item) URL.revokeObjectURL(item.url);
      return prev.filter((m) => m.id !== id);
    });
  };

  const handleSaveEdit = (editedFile: File) => {
    if (!editingMediaId) return;
    setMediaFiles((prev) => {
      const oldItem = prev.find((m) => m.id === editingMediaId);
      if (oldItem) URL.revokeObjectURL(oldItem.url);
      const newUrl = URL.createObjectURL(editedFile);
      return prev.map((m) =>
        m.id === editingMediaId
          ? { ...m, file: editedFile, url: newUrl }
          : m
      );
    });
    setEditingMediaId(null);
  };

  const editingMedia = editingMediaId ? mediaFiles.find((m) => m.id === editingMediaId) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!unitNumber.trim()) {
      toast({ variant: "destructive", title: "Unit Required", description: "Please enter a unit number" });
      return;
    }
    if (!pmId) {
      toast({ variant: "destructive", title: "PM Required", description: "Please select a responsible PM" });
      return;
    }
    if (!location) {
      toast({ variant: "destructive", title: "Location Required", description: "Please select a damage location" });
      return;
    }
    if (description.length < 5) {
      toast({ variant: "destructive", title: "Description Required", description: "Please add a description (min 5 characters)" });
      return;
    }
    if (!severity) {
      toast({ variant: "destructive", title: "Severity Required", description: "Please select a severity level" });
      return;
    }
    if (mediaFiles.length === 0) {
      toast({ variant: "destructive", title: "Evidence Required", description: "Please add at least one photo or video" });
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("unitNumber", unitNumber.trim());
    formData.append("responsiblePmId", pmId);
    formData.append("location", location);
    if (locationDetails.trim()) {
      formData.append("locationDetails", locationDetails.trim());
    }
    formData.append("description", description);
    formData.append("severity", severity);
    if (pmNotes.trim()) {
      formData.append("pmNotes", pmNotes.trim());
    }
    if (cleaningNotes.trim()) {
      formData.append("cleaningNotes", cleaningNotes.trim());
    }
    formData.append("createdById", user?.id || "");
    
    mediaFiles.forEach((media, index) => {
      formData.append(`media_${index}`, media.file);
      formData.append(`mediaType_${index}`, media.type);
      formData.append(`mediaTimestamp_${index}`, media.timestamp.toISOString());
    });
    formData.append("mediaCount", mediaFiles.length.toString());

    try {
      const token = typeof localStorage !== "undefined" ? localStorage.getItem("jwt_token") : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/quick-reports", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to submit report");
      }

      toast({
        title: "Report Submitted",
        description: "Your quick report has been submitted successfully.",
      });
      setLocation("/home");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Could not submit report",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = unitNumber.trim() && pmId && location && description.length >= 5 && severity && mediaFiles.length > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 flex items-center gap-4 p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/home")} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-semibold text-lg">Quick Report</h1>
          <p className="text-xs text-muted-foreground">Report damage with evidence</p>
        </div>
        <ThemeToggle />
        <Button variant="ghost" size="icon" onClick={() => logout()} data-testid="button-logout">
          <LogOut className="h-5 w-5" />
        </Button>
      </header>

      <main className="flex-1 p-4 pb-24">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="unitNumber" className="flex items-center gap-1">
              Unit Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="unitNumber"
              placeholder="Enter unit number (e.g., 2204)"
              value={unitNumber}
              onChange={(e) => setUnitNumber(e.target.value)}
              data-testid="input-unit"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pm" className="flex items-center gap-1">
              Responsible PM <span className="text-destructive">*</span>
            </Label>
            <Select value={pmId} onValueChange={setPmId}>
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

          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              Location of Damage <span className="text-destructive">*</span>
            </Label>
            <Select value={location} onValueChange={setLocationValue}>
              <SelectTrigger data-testid="select-location">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {LOCATIONS.map((loc) => (
                  <SelectItem key={loc.value} value={loc.value}>
                    {loc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Additional location details (optional)"
              value={locationDetails}
              onChange={(e) => setLocationDetails(e.target.value)}
              data-testid="input-location-details"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-1">
              Description of Damage <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Describe the damage (min 5 characters)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-24"
              data-testid="input-description"
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/5 minimum
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              Severity <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {SEVERITIES.map((sev) => (
                <Button
                  key={sev.value}
                  type="button"
                  variant={severity === sev.value ? "default" : "outline"}
                  className={severity === sev.value ? "" : sev.color}
                  onClick={() => setSeverity(sev.value)}
                  data-testid={`button-severity-${sev.value.toLowerCase()}`}
                >
                  {sev.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Evidence <span className="text-destructive">*</span>
              {mediaFiles.length === 0 && (
                <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">Required</span>
              )}
            </Label>
            
            <Card className="border-dashed">
              <CardContent className="p-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  data-testid="input-media"
                />

                {mediaFiles.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {mediaFiles.map((media) => (
                      <div key={media.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                        {media.type === "PHOTO" ? (
                          <img
                            src={media.url}
                            alt="Preview"
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => setEditingMediaId(media.id)}
                            data-testid={`media-edit-${media.id}`}
                          />
                        ) : (
                          <video src={media.url} className="w-full h-full object-cover" />
                        )}
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => removeMedia(media.id)}
                          data-testid={`button-remove-media-${media.id}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        {media.type === "PHOTO" && (
                          <button
                            type="button"
                            className="absolute top-1 left-1 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center"
                            onClick={() => setEditingMediaId(media.id)}
                            data-testid={`button-edit-media-${media.id}`}
                          >
                            <Pencil className="h-3 w-3 text-white" />
                          </button>
                        )}
                        <div className="absolute bottom-1 left-1 right-1">
                          <div className="flex items-center gap-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                            <Clock className="h-2.5 w-2.5" />
                            {media.timestamp instanceof Date 
                              ? media.timestamp.toLocaleTimeString() 
                              : new Date(media.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-add-media"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Photo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-add-video"
                  >
                    <Video className="mr-2 h-4 w-4" />
                    Video
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pmNotes">Notes for Property Manager (optional)</Label>
            <Textarea
              id="pmNotes"
              placeholder="Any specific notes for the PM..."
              value={pmNotes}
              onChange={(e) => setPmNotes(e.target.value)}
              className="min-h-16"
              data-testid="input-pm-notes"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cleaningNotes">Notes for Upcoming Cleaning (optional)</Label>
            <Textarea
              id="cleaningNotes"
              placeholder="Any notes for cleaners..."
              value={cleaningNotes}
              onChange={(e) => setCleaningNotes(e.target.value)}
              className="min-h-16"
              data-testid="input-cleaning-notes"
            />
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-chart-4" />
              Submission Checklist
            </h4>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                {unitNumber.trim() ? (
                  <CheckCircle2 className="h-4 w-4 text-chart-2" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                )}
                <span className={unitNumber.trim() ? "text-foreground" : "text-muted-foreground"}>Unit number entered</span>
              </div>
              <div className="flex items-center gap-2">
                {pmId ? (
                  <CheckCircle2 className="h-4 w-4 text-chart-2" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                )}
                <span className={pmId ? "text-foreground" : "text-muted-foreground"}>PM assigned</span>
              </div>
              <div className="flex items-center gap-2">
                {location ? (
                  <CheckCircle2 className="h-4 w-4 text-chart-2" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                )}
                <span className={location ? "text-foreground" : "text-muted-foreground"}>Location selected</span>
              </div>
              <div className="flex items-center gap-2">
                {description.length >= 5 ? (
                  <CheckCircle2 className="h-4 w-4 text-chart-2" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                )}
                <span className={description.length >= 5 ? "text-foreground" : "text-muted-foreground"}>
                  Description provided
                </span>
              </div>
              <div className="flex items-center gap-2">
                {severity ? (
                  <CheckCircle2 className="h-4 w-4 text-chart-2" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                )}
                <span className={severity ? "text-foreground" : "text-muted-foreground"}>Severity selected</span>
              </div>
              <div className="flex items-center gap-2">
                {mediaFiles.length > 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-chart-2" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                )}
                <span className={mediaFiles.length > 0 ? "text-foreground" : "text-muted-foreground"}>
                  Evidence attached ({mediaFiles.length})
                </span>
              </div>
            </div>
          </div>
        </form>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={!canSubmit || isSubmitting}
          onClick={handleSubmit}
          data-testid="button-submit"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Submit Report
            </>
          )}
        </Button>
      </div>

      {editingMedia && editingMedia.type === "PHOTO" && (
        <ImageEditor
          imageUrl={editingMedia.url}
          onSave={handleSaveEdit}
          onCancel={() => setEditingMediaId(null)}
        />
      )}
    </div>
  );
}
