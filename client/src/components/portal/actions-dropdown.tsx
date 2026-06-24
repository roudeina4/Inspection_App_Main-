import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Download, CheckSquare, Send } from "lucide-react";

interface ActionsDropdownProps {
  taskId: string;
  status?: string;
  onView?: () => void;
  onDownload?: () => void;
  onMarkReviewed?: () => void;
  onMarkSent?: () => void;
}

export function ActionsDropdown({ 
  taskId, 
  status,
  onView, 
  onDownload, 
  onMarkReviewed, 
  onMarkSent 
}: ActionsDropdownProps) {
  const isDraft = status === "ASSIGNED" || status === "IN_PROGRESS";
  const isSubmitted = status === "SUBMITTED";
  const isReviewed = status === "REVIEWED";
  const isSent = status === "ARCHIVED";
  const canDownload = isSubmitted || isReviewed || isSent;

  const handleView = () => {
    if (onView) {
      onView();
    } else {
      window.location.href = `/pm/inspection/${taskId}`;
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      window.open(`/api/tasks/${taskId}/pdf`, "_blank");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8"
          data-testid={`button-actions-${taskId}`}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleView} className="cursor-pointer" data-testid="action-view">
          <Eye className="mr-2 h-4 w-4" />
          View
        </DropdownMenuItem>
        
        {canDownload && (
          <DropdownMenuItem onClick={handleDownload} className="cursor-pointer" data-testid="action-download">
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </DropdownMenuItem>
        )}
        
        {isSubmitted && onMarkReviewed && (
          <DropdownMenuItem onClick={onMarkReviewed} className="cursor-pointer" data-testid="action-mark-reviewed">
            <CheckSquare className="mr-2 h-4 w-4" />
            Mark Reviewed
          </DropdownMenuItem>
        )}
        
        {isReviewed && onMarkSent && (
          <DropdownMenuItem onClick={onMarkSent} className="cursor-pointer" data-testid="action-mark-sent">
            <Send className="mr-2 h-4 w-4" />
            Mark Sent to Owner
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
