import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, MapPin, User2 } from "lucide-react";
import type { User } from "@shared/schema";

interface PropertyDetail {
  id: string;
  nickname: string;
  title: string;
  address: string;
  tags: string[];
  photoUrl: string | null;
  assignedPmId: string | null;
  assignedPm: { id: string; name: string; email: string } | null;
}

export default function PropertyDetailPage() {
  const [, params] = useRoute("/portal/properties/:id");
  const propertyId = params?.id;

  const { data: property, isLoading } = useQuery<PropertyDetail>({
    queryKey: ["/api/properties", propertyId],
    enabled: !!propertyId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-5 w-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-gray-500">Property not found</p>
        <Link href="/portal/properties">
          <Button variant="outline" className="mt-4" data-testid="button-back-properties">Back to Properties</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/portal/properties">
          <button className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-gray-900 tracking-tight" data-testid="text-property-detail-title">
            {property.nickname}
          </h1>
          <p className="text-sm text-gray-400">{property.title}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">Property Details</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-gray-500 uppercase tracking-wider">Nickname</Label>
              <p className="text-sm font-medium text-gray-900 mt-1" data-testid="text-detail-nickname">{property.nickname}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500 uppercase tracking-wider">Title</Label>
              <p className="text-sm font-medium text-gray-900 mt-1" data-testid="text-detail-title">{property.title}</p>
            </div>
          </div>
          <div>
            <Label className="text-xs text-gray-500 uppercase tracking-wider">Address</Label>
            <div className="flex items-center gap-1.5 mt-1">
              <MapPin className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
              <p className="text-sm text-gray-700" data-testid="text-detail-address">{property.address}</p>
            </div>
          </div>
          <div>
            <Label className="text-xs text-gray-500 uppercase tracking-wider">Assigned PM</Label>
            <div className="flex items-center gap-1.5 mt-1">
              <User2 className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
              <p className="text-sm text-gray-700" data-testid="text-detail-pm">
                {property.assignedPm ? property.assignedPm.name : "Not assigned"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
