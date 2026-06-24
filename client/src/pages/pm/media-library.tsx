import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2 } from "lucide-react";
import { MediaLibrary } from "@/components/media-library";
import type { Unit } from "@shared/schema";

export default function MediaLibraryPage() {
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const { data: units = [], isLoading: unitsLoading } = useQuery<Unit[]>({
    queryKey: ["/api/units"],
  });

  const activeUnits = units.filter(u => u.isActive);
  const selectedUnit = activeUnits.find(u => u.id === selectedUnitId);

  return (
    <div className="h-full flex flex-col p-4 md:p-6" data-testid="page-media-library">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Media Library</h1>
          <p className="text-muted-foreground">Browse Part 1 inspection media by unit</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-full sm:w-72">
            {unitsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select 
                value={selectedUnitId || ""} 
                onValueChange={(v) => setSelectedUnitId(v || null)}
              >
                <SelectTrigger data-testid="select-unit">
                  <SelectValue placeholder="Select a unit..." />
                </SelectTrigger>
                <SelectContent>
                  {activeUnits.map(unit => (
                    <SelectItem key={unit.id} value={unit.id} data-testid={`unit-option-${unit.id}`}>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        <span>{unit.propertyName} - {unit.unitNumber}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {selectedUnit && (
            <Badge variant="outline" className="text-sm">
              {selectedUnit.address}
            </Badge>
          )}
        </div>
      </div>

      {!selectedUnitId ? (
        <Card className="flex-1 flex items-center justify-center">
          <CardContent className="text-center py-12">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">Select a Unit</h3>
            <p className="text-muted-foreground max-w-md">
              Choose a unit from the dropdown above to view its Part 1 inspection media library.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex-1 overflow-hidden">
          <MediaLibrary 
            unitId={selectedUnitId}
            unitName={selectedUnit ? `${selectedUnit.propertyName} ${selectedUnit.unitNumber}` : undefined}
          />
        </div>
      )}
    </div>
  );
}
