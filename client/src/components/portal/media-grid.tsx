import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Play, Image as ImageIcon } from "lucide-react";

interface MediaItem {
  id: string;
  url: string;
  type: "PHOTO" | "VIDEO";
  caption?: string;
}

interface MediaGridProps {
  items: MediaItem[];
  className?: string;
  columns?: 2 | 3 | 4;
}

export function MediaGrid({ items, className, columns = 3 }: MediaGridProps) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <ImageIcon className="h-12 w-12 mb-2 opacity-50" />
        <p className="text-sm">No media attached</p>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-3", gridCols[columns], className)}>
      {items.map((item) => (
        <MediaThumbnail key={item.id} item={item} />
      ))}
    </div>
  );
}

function MediaThumbnail({ item }: { item: MediaItem }) {
  const isVideo = item.type === "VIDEO";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="relative aspect-square rounded-lg overflow-hidden bg-muted hover-elevate cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
          data-testid={`media-thumbnail-${item.id}`}
        >
          {isVideo ? (
            <>
              <video
                src={item.url}
                className="w-full h-full object-cover"
                muted
                preload="metadata"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="h-12 w-12 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="h-6 w-6 text-foreground ml-1" />
                </div>
              </div>
            </>
          ) : (
            <img
              src={item.url}
              alt={item.caption || "Media"}
              className="w-full h-full object-cover"
            />
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        {isVideo ? (
          <video
            src={item.url}
            controls
            autoPlay
            className="w-full max-h-[80vh]"
          />
        ) : (
          <img
            src={item.url}
            alt={item.caption || "Media"}
            className="w-full max-h-[80vh] object-contain"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
