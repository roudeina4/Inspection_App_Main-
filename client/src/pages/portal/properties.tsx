import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Home, MapPin, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Property {
  id: string;
  nickname: string;
  title: string;
  address: string;
  tags: string[];
  photoUrl: string | null;
  importedById: string | null;
  createdAt: string;
}

const PAGE_SIZE = 5;

export default function PropertiesPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data: properties, isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
    refetchOnMount: "always",
  });

  const filteredProperties = (properties || []).filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return p.nickname.toLowerCase().includes(q) || p.address.toLowerCase().includes(q);
  });

  const totalItems = filteredProperties.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filteredProperties.slice(startIdx, startIdx + PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 tracking-tight" data-testid="text-properties-title">
            Properties
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {user?.role === "ADMIN"
              ? "All properties across teams"
              : "Properties assigned to you"}
          </p>
        </div>
        {totalItems > 0 && (
          <span className="text-xs text-gray-400 bg-white border border-gray-100 rounded-md px-3 py-1.5 font-medium">
            {totalItems} {totalItems === 1 ? "property" : "properties"}
          </span>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by nickname or address..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-9 pr-9 h-10 bg-white border-gray-200 text-sm"
          data-testid="input-search-properties"
        />
        {search && (
          <button
            onClick={() => { setSearch(""); setPage(1); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            data-testid="button-clear-search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-100 px-6 py-16 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-5 w-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-400">Loading properties...</span>
          </div>
        </div>
      ) : totalItems === 0 && !search.trim() ? (
        <div className="bg-white rounded-xl border border-gray-100 px-6 py-16 flex flex-col items-center justify-center gap-4">
          <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center">
            <Home className="h-6 w-6 text-gray-300" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500" data-testid="text-properties-empty">No properties yet</p>
            <p className="text-xs text-gray-400 mt-1">Import properties using the Import Property page.</p>
          </div>
        </div>
      ) : totalItems === 0 && search.trim() ? (
        <div className="bg-white rounded-xl border border-gray-100 px-6 py-16 flex flex-col items-center justify-center gap-4">
          <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center">
            <Search className="h-6 w-6 text-gray-300" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500" data-testid="text-properties-no-results">No properties match "{search}"</p>
            <p className="text-xs text-gray-400 mt-1">Try a different nickname or address.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full" data-testid="table-properties">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Nickname</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Address</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((property, idx) => (
                  <tr
                    key={property.id}
                    className={`border-b border-gray-50 last:border-b-0 transition-colors hover:bg-teal-50/30 cursor-pointer ${idx % 2 === 1 ? "bg-gray-50/20" : ""}`}
                    onClick={() => setLocation(`/portal/properties/${property.id}`)}
                    data-testid={`row-property-${property.id}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {property.photoUrl ? (
                          <div className="h-9 w-9 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            <img
                              src={property.photoUrl}
                              alt={property.nickname}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          </div>
                        ) : (
                          <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <Home className="h-4 w-4 text-gray-300" />
                          </div>
                        )}
                        <span className="text-sm font-medium text-gray-900" data-testid={`text-property-nickname-${property.id}`}>
                          {property.nickname}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-gray-300 flex-shrink-0" />
                        <span className="text-xs text-gray-500 truncate max-w-[250px]">{property.address}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Showing {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, totalItems)} of {totalItems}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    variant={p === currentPage ? "default" : "outline"}
                    size="icon"
                    className={`h-8 w-8 text-xs ${p === currentPage ? "bg-teal-600 hover:bg-teal-700" : ""}`}
                    onClick={() => setPage(p)}
                    data-testid={`button-page-${p}`}
                  >
                    {p}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage >= totalPages}
                  data-testid="button-next-page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
