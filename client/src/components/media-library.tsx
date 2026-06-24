import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Video, Image, Download, Play, ChevronRight } from "lucide-react";
import type { Media, MediaCategory } from "@shared/schema";

interface MediaTask {
  category: MediaCategory;
  label: string;
  type: "VIDEO" | "PHOTO";
  conditional?: boolean;
}

const VIDEO_TASKS: MediaTask[] = [
  { category: "VIDEO_WALKTHROUGH", label: "Full unit walkthrough", type: "VIDEO" },
  { category: "VIDEO_ENTRANCE_ELEVATOR", label: "Entrance to elevator", type: "VIDEO" },
  { category: "VIDEO_PARKING_ENTRANCE", label: "Parking garage entrance", type: "VIDEO" },
  { category: "VIDEO_PARKING_ACCESS", label: "Access designated parking", type: "VIDEO" },
  { category: "VIDEO_THERMOSTAT", label: "Thermostat how-to", type: "VIDEO" },
  { category: "VIDEO_GARBAGE_RECYCLING", label: "Garbage/recycling access", type: "VIDEO" },
  { category: "VIDEO_SPECIAL_INSTRUCTIONS", label: "Special instructions", type: "VIDEO" },
  { category: "VIDEO_TV_DEMO", label: "TV working demo", type: "VIDEO" },
  { category: "VIDEO_BALCONY_DOORS", label: "Balcony doors", type: "VIDEO", conditional: true },
  { category: "VIDEO_WINDOWS_OPENING", label: "Windows opening", type: "VIDEO" },
];

const PHOTO_TASKS: MediaTask[] = [
  { category: "PHOTO_AC_FILTER", label: "AC filter wide angle", type: "PHOTO" },
  { category: "PHOTO_FAUCET_BRANDS", label: "Faucet brand names", type: "PHOTO" },
  { category: "PHOTO_APPLIANCE_MODELS", label: "Appliance model number stickers", type: "PHOTO" },
  { category: "PHOTO_WIFI_MODEM", label: "WiFi modem back (SSID/password)", type: "PHOTO" },
  { category: "PHOTO_FUSE_BOX", label: "Fuse box open/closed", type: "PHOTO" },
  { category: "PHOTO_VACUUM", label: "Vacuum photo", type: "PHOTO" },
  { category: "PHOTO_KEY_FOB", label: "Key/fob set", type: "PHOTO" },
  { category: "PHOTO_BALCONY_OUTDOOR", label: "Balcony/outdoor", type: "PHOTO", conditional: true },
];

const ALL_TASKS = [...VIDEO_TASKS, ...PHOTO_TASKS];

interface MediaLibraryProps {
  unitId: string;
  unitName?: string;
  compact?: boolean;
}

export function MediaLibrary({ unitId, unitName, compact = false }: MediaLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<MediaCategory | null>(null);

  const { data: mediaItems = [], isLoading } = useQuery<Media[]>({
    queryKey: ["/api/units", unitId, "media-library"],
    enabled: !!unitId,
  });

  const mediaByCategory = mediaItems.reduce((acc, item) => {
    const cat = item.category || "OTHER";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, Media[]>);

  const completedTasks = ALL_TASKS.filter(task => 
    mediaByCategory[task.category]?.length > 0
  );

  const totalTasks = ALL_TASKS.length;
  const completedCount = completedTasks.length;
  const completionPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const selectedMedia = selectedCategory ? (mediaByCategory[selectedCategory] || []) : [];

  const handleDownload = (url: string, filename?: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || url.split("/").pop() || "media";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 h-full">
        <div className="w-80 space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
        <div className="flex-1">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const renderTaskList = (tasks: MediaTask[], title: string, icon: React.ReactNode) => (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
        {icon}
        <span>{title}</span>
      </div>
      <div className="space-y-1">
        {tasks.map(task => {
          const hasMedia = (mediaByCategory[task.category]?.length || 0) > 0;
          const mediaCount = mediaByCategory[task.category]?.length || 0;
          const isSelected = selectedCategory === task.category;

          return (
            <button
              key={task.category}
              onClick={() => setSelectedCategory(task.category)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors ${
                isSelected 
                  ? "bg-primary text-primary-foreground" 
                  : "hover-elevate"
              }`}
              data-testid={`task-${task.category}`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                hasMedia 
                  ? "bg-green-500 text-white" 
                  : "border-2 border-muted-foreground/30"
              }`}>
                {hasMedia && <Check className="w-3 h-3" />}
              </div>
              <span className="flex-1 truncate">{task.label}</span>
              {task.conditional && (
                <Badge variant="outline" className="text-xs">Optional</Badge>
              )}
              {mediaCount > 0 && (
                <Badge variant="secondary" className="text-xs">{mediaCount}</Badge>
              )}
              <ChevronRight className={`w-4 h-4 text-muted-foreground ${isSelected ? "text-primary-foreground" : ""}`} />
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={`flex gap-4 ${compact ? "h-[500px]" : "h-full min-h-[600px]"}`}>
      <Card className="w-80 flex-shrink-0 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base" data-testid="text-media-library-title">
              {unitName ? `${unitName} Media` : "Part 1 Tasks"}
            </CardTitle>
            <Badge 
              variant={completionPercent === 100 ? "default" : "secondary"}
              data-testid="badge-completion"
            >
              {completionPercent}% complete
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            {completedCount} of {totalTasks} tasks completed
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full px-4 pb-4">
            {renderTaskList(VIDEO_TASKS, "Videos", <Video className="w-4 h-4" />)}
            {renderTaskList(PHOTO_TASKS, "Photos", <Image className="w-4 h-4" />)}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-base" data-testid="text-selected-task">
            {selectedCategory 
              ? ALL_TASKS.find(t => t.category === selectedCategory)?.label || selectedCategory
              : "Select a task to view media"
            }
          </CardTitle>
          {selectedCategory && (
            <div className="text-sm text-muted-foreground">
              {selectedMedia.length} item{selectedMedia.length !== 1 ? "s" : ""} uploaded
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          {!selectedCategory ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Select a task from the list to view media</p>
              </div>
            </div>
          ) : selectedMedia.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No media uploaded for this task yet</p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {selectedMedia.map(item => (
                  <div 
                    key={item.id} 
                    className="relative group rounded-lg overflow-hidden border bg-muted"
                    data-testid={`media-item-${item.id}`}
                  >
                    {item.type === "VIDEO" ? (
                      <div className="aspect-video bg-black flex items-center justify-center">
                        <video 
                          src={item.url} 
                          className="w-full h-full object-cover"
                          preload="metadata"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center">
                            <Play className="w-6 h-6 text-white ml-1" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-square">
                        <img 
                          src={item.url} 
                          alt="Inspection photo"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Button 
                        size="icon" 
                        variant="secondary"
                        onClick={() => handleDownload(item.url)}
                        data-testid={`button-download-${item.id}`}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                      <div className="flex items-center gap-1 text-white text-xs">
                        {item.type === "VIDEO" ? <Video className="w-3 h-3" /> : <Image className="w-3 h-3" />}
                        <span>{item.type}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
