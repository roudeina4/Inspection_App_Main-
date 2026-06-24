import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  FileSearch, Search, Download, Eye, Filter, Calendar, Building2, 
  User as UserIcon, FileText, CheckCircle2, AlertCircle, XCircle,
  Sofa, UtensilsCrossed, Bed, Bath, ChefHat, Warehouse, Package, Home,
  Image as ImageIcon, Video, X, MoreVertical, Pencil, Share2
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { InspectionTask, Unit, User, ChecklistResponse, Media } from "@shared/schema";

interface InspectionWithDetails extends InspectionTask {
  unit?: Unit;
  assignedUser?: User;
}

interface InspectionDetails {
  task: InspectionTask;
  unit: Unit | null;
  responses: ChecklistResponse[];
  media: Media[];
  inspector: { id: string; name: string; email: string; role: string } | null;
  pm: { id: string; name: string; email: string; role: string } | null;
  template: any;
}

const ROOM_ICONS: Record<string, any> = {
  living_room: Sofa,
  dining_room: UtensilsCrossed,
  kitchen: ChefHat,
  bedroom: Bed,
  bathroom: Bath,
  closet: Warehouse,
  appliances: Package,
  kitchen_inventory: UtensilsCrossed,
  unit_supplies: Package,
};

const ROOM_LABELS: Record<string, string> = {
  living_room: "Living Room",
  dining_room: "Dining Room",
  kitchen: "Kitchen",
  bedroom: "Bedroom",
  bathroom: "Bathroom",
  closet: "Closet",
  appliances: "Appliances",
  kitchen_inventory: "Kitchen Inventory",
  unit_supplies: "Unit Supplies",
};

const formatItemKey = (key: string) => {
  return key
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const getConditionBadge = (result: string | null) => {
  if (!result) return null;
  
  const variants: Record<string, { className: string; icon: any }> = {
    GOOD: { className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", icon: CheckCircle2 },
    PASS: { className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", icon: CheckCircle2 },
    YES: { className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", icon: CheckCircle2 },
    FAIR: { className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300", icon: AlertCircle },
    FAIL: { className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", icon: XCircle },
    NO: { className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300", icon: XCircle },
    MISSING: { className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", icon: XCircle },
    NEED_REPLACEMENT: { className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300", icon: AlertCircle },
    NA: { className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", icon: null },
  };
  
  const variant = variants[result] || variants.FAIR;
  const Icon = variant.icon;
  
  return (
    <Badge className={`${variant.className} gap-1`}>
      {Icon && <Icon className="h-3 w-3" />}
      {result.replace("_", " ")}
    </Badge>
  );
};

export default function FullInspectionsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedInspectionId, setSelectedInspectionId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: inspections, isLoading } = useQuery<InspectionWithDetails[]>({
    queryKey: ["/api/inspection-tasks"],
  });

  const { data: units } = useQuery<Unit[]>({ queryKey: ["/api/units"] });
  const { data: users } = useQuery<User[]>({ queryKey: ["/api/users"] });

  const { data: inspectionDetails, isLoading: isDetailsLoading } = useQuery<InspectionDetails>({
    queryKey: [`/api/inspection-tasks/${selectedInspectionId}/details`],
    enabled: !!selectedInspectionId && isSheetOpen,
  });

  useEffect(() => {
    if (!isSheetOpen) {
      setSelectedInspectionId(null);
      setSelectedMedia(null);
    }
  }, [isSheetOpen]);

  const mediaByResponseId = useMemo(() => {
    const map: Record<string, Media[]> = {};
    if (inspectionDetails?.media) {
      inspectionDetails.media.forEach(m => {
        if (m.checklistResponseId) {
          if (!map[m.checklistResponseId]) {
            map[m.checklistResponseId] = [];
          }
          map[m.checklistResponseId].push(m);
        }
      });
    }
    return map;
  }, [inspectionDetails?.media]);

  const getUnitName = (unitId: string) => {
    const unit = units?.find(u => u.id === unitId);
    return unit ? `${unit.propertyName} - ${unit.unitNumber}` : `Unit #${unitId}`;
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return "Unassigned";
    const user = users?.find(u => u.id === userId);
    return user?.name || `User #${userId}`;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      ASSIGNED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      IN_PROGRESS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      SUBMITTED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      REVIEWED: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      ARCHIVED: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    };
    return (
      <Badge className={variants[status] || variants.ASSIGNED}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const fullInspections = inspections?.filter(i => i.type === "FULL_INSPECTION") || [];

  const handleRowClick = (inspection: InspectionWithDetails) => {
    if (inspection.status === "SUBMITTED" || inspection.status === "REVIEWED" || inspection.status === "ARCHIVED") {
      setSelectedInspectionId(inspection.id);
      setIsSheetOpen(true);
    }
  };

  const filteredInspections = fullInspections.filter(inspection => {
    const matchesSearch = 
      getUnitName(inspection.unitId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getUserName(inspection.assignedToUserId).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || inspection.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const groupResponsesByRoom = (responses: ChecklistResponse[]) => {
    const grouped: Record<string, ChecklistResponse[]> = {};
    responses.forEach(response => {
      const room = response.roomKey || "other";
      if (!grouped[room]) {
        grouped[room] = [];
      }
      grouped[room].push(response);
    });
    return grouped;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Full Inspections</h1>
          <p className="text-muted-foreground">View and manage full inspection reports</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by unit or inspector..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]" data-testid="select-status-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="REVIEWED">Reviewed</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredInspections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileSearch className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No full inspections found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all" 
                  ? "Try adjusting your search or filter"
                  : "Full inspections will appear here once created"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unit</TableHead>
                    <TableHead>Inspector</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInspections.map((inspection) => {
                    const isCompleted = inspection.status === "SUBMITTED" || inspection.status === "REVIEWED" || inspection.status === "ARCHIVED";
                    return (
                      <TableRow 
                        key={inspection.id} 
                        data-testid={`row-inspection-${inspection.id}`}
                        className={isCompleted ? "cursor-pointer" : ""}
                        onClick={() => handleRowClick(inspection)}
                      >
                        <TableCell className="font-medium">
                          {getUnitName(inspection.unitId)}
                        </TableCell>
                        <TableCell>{getUserName(inspection.assignedToUserId)}</TableCell>
                        <TableCell>{getStatusBadge(inspection.status)}</TableCell>
                        <TableCell>
                          {inspection.createdAt 
                            ? new Date(inspection.createdAt).toLocaleDateString()
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <Link href={`/pm/inspection/${inspection.id}`}>
                              <Button size="sm" variant="ghost" data-testid={`button-view-${inspection.id}`}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            {isCompleted && (
                              <a href={`/api/pm/inspections/${inspection.id}/pdf`} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" variant="ghost" data-testid={`button-pdf-${inspection.id}`}>
                                  <Download className="h-4 w-4" />
                                </Button>
                              </a>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl p-0" data-testid="inspection-detail-sheet">
          <div className="flex flex-col h-full">
            <div className="p-6 border-b bg-gradient-to-r from-primary/10 to-primary/5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">
                  View completed form #{selectedInspectionId?.slice(-6).toUpperCase() || "---"}
                </p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid="button-form-menu">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => {
                        setIsSheetOpen(false);
                        setLocation(`/portal/form-template?type=FULL_INSPECTION&inspectionId=${selectedInspectionId}`);
                      }}
                      data-testid="menu-edit"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        window.open(`/api/pm/inspections/${selectedInspectionId}/pdf`, '_blank');
                      }}
                      data-testid="menu-download-pdf"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        const shareUrl = `${window.location.origin}/pm/inspection/${selectedInspectionId}`;
                        navigator.clipboard.writeText(shareUrl);
                        toast({
                          title: "Link copied",
                          description: "The inspection link has been copied to your clipboard.",
                        });
                      }}
                      data-testid="menu-share-link"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share Link
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  Full Inspection Report
                </SheetTitle>
              </SheetHeader>
              
              {inspectionDetails && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Unit:</span>
                    <span className="font-medium" data-testid="text-unit-number">
                      {inspectionDetails.unit?.unitNumber || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-medium" data-testid="text-completed-date">
                      {inspectionDetails.task.createdAt 
                        ? new Date(inspectionDetails.task.createdAt).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Inspector:</span>
                    <span className="font-medium" data-testid="text-assignee-name">
                      {inspectionDetails.inspector?.name || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Property:</span>
                    <span className="font-medium" data-testid="text-property-name">
                      {inspectionDetails.unit?.propertyName || "N/A"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <ScrollArea className="flex-1 p-6">
              {isDetailsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : inspectionDetails?.responses && inspectionDetails.responses.length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(groupResponsesByRoom(inspectionDetails.responses)).map(([roomKey, items]) => {
                    const RoomIcon = ROOM_ICONS[roomKey] || Home;
                    const roomLabel = ROOM_LABELS[roomKey] || formatItemKey(roomKey);
                    
                    return (
                      <div key={roomKey} className="space-y-3" data-testid={`section-${roomKey}`}>
                        <div className="flex items-center gap-2 sticky top-0 bg-background py-2">
                          <div className="p-1.5 rounded-md bg-primary/10">
                            <RoomIcon className="h-4 w-4 text-primary" />
                          </div>
                          <h3 className="font-semibold text-lg">{roomLabel}</h3>
                          <Badge variant="secondary" className="ml-auto">
                            {items.length} items
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 pl-2">
                          {items.map((item, index) => {
                            const itemMedia = item.id ? mediaByResponseId[item.id] || [] : [];
                            
                            return (
                              <div 
                                key={item.id || index} 
                                className="p-3 rounded-lg border bg-card"
                                data-testid={`item-${roomKey}-${item.itemKey}`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="space-y-1 flex-1">
                                    <p className="font-medium text-sm">
                                      {formatItemKey(item.itemKey || "Unknown")}
                                    </p>
                                    {item.notes && (
                                      <p className="text-xs text-muted-foreground">
                                        {item.notes}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {item.severity && (
                                      <Badge 
                                        variant="outline" 
                                        className={
                                          item.severity === "HIGH" ? "border-red-500 text-red-500" :
                                          item.severity === "MED" ? "border-yellow-500 text-yellow-500" :
                                          "border-gray-400 text-gray-400"
                                        }
                                      >
                                        {item.severity}
                                      </Badge>
                                    )}
                                    {getConditionBadge(item.result)}
                                  </div>
                                </div>
                                
                                {itemMedia.length > 0 && (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {itemMedia.map((media) => (
                                      <button
                                        key={media.id}
                                        onClick={() => setSelectedMedia(media)}
                                        className="relative w-16 h-16 rounded-md overflow-hidden border bg-muted"
                                        data-testid={`media-thumbnail-${media.id}`}
                                      >
                                        {media.type === "VIDEO" ? (
                                          <div className="w-full h-full flex items-center justify-center bg-muted">
                                            <Video className="h-6 w-6 text-muted-foreground" />
                                          </div>
                                        ) : (
                                          <img 
                                            src={media.url} 
                                            alt="Inspection photo"
                                            className="w-full h-full object-cover"
                                          />
                                        )}
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-0.5">
                                          {media.type === "VIDEO" ? (
                                            <Video className="h-3 w-3 text-white mx-auto" />
                                          ) : (
                                            <ImageIcon className="h-3 w-3 text-white mx-auto" />
                                          )}
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <Separator className="mt-4" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileSearch className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No checklist data</h3>
                  <p className="text-muted-foreground">
                    No checklist responses found for this inspection
                  </p>
                </div>
              )}
            </ScrollArea>

            <div className="p-4 border-t bg-muted/30">
              <div className="flex gap-2">
                <Link href={`/pm/inspection/${selectedInspectionId}`} className="flex-1">
                  <Button className="w-full" data-testid="button-view-full-report">
                    <Eye className="h-4 w-4 mr-2" />
                    View Full Page
                  </Button>
                </Link>
                <a 
                  href={`/api/pm/inspections/${selectedInspectionId}/pdf`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full" data-testid="button-download-pdf">
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!selectedMedia} onOpenChange={(open) => !open && setSelectedMedia(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden" data-testid="media-dialog">
          <DialogTitle className="sr-only">
            {selectedMedia?.type === "VIDEO" ? "Video" : "Photo"} Preview
          </DialogTitle>
          <DialogDescription className="sr-only">
            Full-size view of inspection {selectedMedia?.type === "VIDEO" ? "video" : "photo"}
          </DialogDescription>
          <div className="relative">
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-2 right-2 z-10 bg-black/50 text-white"
              onClick={() => setSelectedMedia(null)}
              data-testid="button-close-media"
            >
              <X className="h-4 w-4" />
            </Button>
            {selectedMedia?.type === "VIDEO" ? (
              <video 
                src={selectedMedia.url} 
                controls 
                className="w-full max-h-[80vh]"
                autoPlay
              />
            ) : selectedMedia ? (
              <img 
                src={selectedMedia.url} 
                alt="Inspection media"
                className="w-full max-h-[80vh] object-contain"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
