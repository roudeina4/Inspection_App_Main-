import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/portal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Image as ImageIcon, Video, Calendar } from "lucide-react";
import { useState } from "react";
import type { Media } from "@shared/schema";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Play } from "lucide-react";

export default function MediaLibraryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const { data: allMedia, isLoading } = useQuery<Media[]>({
    queryKey: ["/api/media"],
  });

  const filteredMedia = allMedia?.filter((item) => {
    if (filterType !== "all" && item.type !== filterType) return false;
    return true;
  }) || [];

  const photoCount = allMedia?.filter((m) => m.type === "PHOTO").length || 0;
  const videoCount = allMedia?.filter((m) => m.type === "VIDEO").length || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Media Library"
        description="View and manage all uploaded photos and videos"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="card-total-media">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Media</CardTitle>
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{allMedia?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Files uploaded</p>
          </CardContent>
        </Card>

        <Card data-testid="card-photos">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Photos</CardTitle>
            <ImageIcon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{photoCount}</div>
            <p className="text-xs text-muted-foreground">Image files</p>
          </CardContent>
        </Card>

        <Card data-testid="card-videos">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Videos</CardTitle>
            <Video className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{videoCount}</div>
            <p className="text-xs text-muted-foreground">Video files</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>All Media</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search media..."
                  className="pl-9 w-full sm:w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-media"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-32" data-testid="select-filter-type">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="PHOTO">Photos</SelectItem>
                  <SelectItem value="VIDEO">Videos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ImageIcon className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">No media found</p>
              <p className="text-sm">Upload photos or videos through inspections or quick reports</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredMedia.map((item) => (
                <MediaThumbnail key={item.id} item={item} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MediaThumbnail({ item }: { item: Media }) {
  const isVideo = item.type === "VIDEO";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="relative aspect-square rounded-lg overflow-hidden bg-muted hover-elevate cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary group"
          data-testid={`media-item-${item.id}`}
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
                <div className="h-10 w-10 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="h-5 w-5 text-foreground ml-0.5" />
                </div>
              </div>
            </>
          ) : (
            <img
              src={item.url}
              alt="Media"
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-1 text-white text-xs">
              <Calendar className="h-3 w-3" />
              {new Date(item.uploadedAt).toLocaleDateString()}
            </div>
          </div>
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
            alt="Media"
            className="w-full max-h-[80vh] object-contain"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
