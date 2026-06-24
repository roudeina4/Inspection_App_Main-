import { useState, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

interface ParsedRow {
  nickname: string;
  title: string;
  address: string;
  tags: string;
  photoUrl: string;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const headers = headerLine.split(",").map(h => h.trim().replace(/^["']|["']$/g, "").toLowerCase());

  const nicknameIdx = headers.findIndex(h => h === "nickname");
  const titleIdx = headers.findIndex(h => h === "title");
  const addressIdx = headers.findIndex(h => h === "address");
  const tagsIdx = headers.findIndex(h => h === "tags");
  const photoIdx = headers.findIndex(h => h === "photo url" || h === "photourl" || h === "photo_url");

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = splitCSVLine(lines[i]);
    rows.push({
      nickname: nicknameIdx >= 0 ? (vals[nicknameIdx] || "").trim() : "",
      title: titleIdx >= 0 ? (vals[titleIdx] || "").trim() : "",
      address: addressIdx >= 0 ? (vals[addressIdx] || "").trim() : "",
      tags: tagsIdx >= 0 ? (vals[tagsIdx] || "").trim() : "",
      photoUrl: photoIdx >= 0 ? (vals[photoIdx] || "").trim() : "",
    });
  }
  return rows.filter(r => r.nickname || r.title || r.address);
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      if (i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = false;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export default function ImportPropertyPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [phase, setPhase] = useState<"idle" | "preview" | "uploading" | "done">("idle");
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);

  const importMutation = useMutation({
    mutationFn: async (rows: ParsedRow[]) => {
      setPhase("uploading");
      setUploadProgress(10);

      const interval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 15, 85));
      }, 300);

      const res = await apiRequest("POST", "/api/properties/import", { rows });
      clearInterval(interval);
      setUploadProgress(100);
      return res.json();
    },
    onSuccess: (data) => {
      setImportResult(data);
      setPhase("done");
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Import Complete",
        description: `${data.created} properties imported, ${data.skipped} skipped.`,
      });
    },
    onError: (error) => {
      setPhase("preview");
      setUploadProgress(0);
      toast({ variant: "destructive", title: "Import Failed", description: error.message });
    },
  });

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast({ variant: "destructive", title: "Invalid File", description: "Please upload a CSV file." });
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      setParsedRows(rows);
      setPhase("preview");
    };
    reader.readAsText(file);
  }, [toast]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setPhase("idle");
    setUploadProgress(0);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight" data-testid="text-import-title">
          Import Property
        </h1>
        <p className="text-sm text-gray-400 mt-1">Upload a CSV file to import properties</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">Upload CSV</h2>
          {phase !== "idle" && (
            <button
              onClick={handleReset}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              data-testid="button-close-upload"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="p-6">
          {phase === "idle" && (
            <div className="space-y-5">
              <div
                className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${
                  dragActive
                    ? "border-teal-400 bg-teal-50/30"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/30"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                data-testid="dropzone-csv"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileInput}
                  className="hidden"
                  data-testid="input-csv-file"
                />
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <FileSpreadsheet className="h-12 w-12 text-gray-300" />
                    <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-teal-500 flex items-center justify-center">
                      <Upload className="h-2.5 w-2.5 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Select a CSV file to upload</p>
                    <p className="text-xs text-gray-400 mt-1">or drag and drop it here</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-500 mb-2">Expected CSV format</p>
                <div className="font-mono text-[11px] text-gray-400 leading-relaxed">
                  <p className="text-gray-500">Nickname, Title, Address, Tags, Photo URL</p>
                  <p>sunset-villa, Sunset Villa, 123 Beach Dr, user3 user4, https://...</p>
                </div>
              </div>
            </div>
          )}

          {phase === "uploading" && (
            <div className="py-10 flex flex-col items-center gap-5">
              <div className="relative h-20 w-20">
                <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#f1f5f9" strokeWidth="6" />
                  <circle
                    cx="40" cy="40" r="34" fill="none"
                    stroke="#14b8a6" strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - uploadProgress / 100)}`}
                    className="transition-all duration-300"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-gray-700">
                  {uploadProgress}%
                </span>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">Uploading file...</p>
                <p className="text-xs text-gray-400 mt-1">{selectedFile?.name}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="text-xs"
                data-testid="button-cancel-upload"
              >
                Cancel
              </Button>
            </div>
          )}

          {phase === "preview" && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <FileSpreadsheet className="h-8 w-8 text-teal-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{selectedFile?.name}</p>
                  <p className="text-xs text-gray-400">{parsedRows.length} rows found</p>
                </div>
                <button
                  onClick={handleReset}
                  className="text-gray-400 hover:text-gray-600"
                  data-testid="button-remove-file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {parsedRows.length > 0 && (
                <div className="rounded-lg border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                    <table className="w-full text-xs" data-testid="table-csv-preview">
                      <thead className="sticky top-0">
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider">#</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider">Nickname</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider">Address</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider">Tags</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider">Photo URL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.map((row, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"} data-testid={`row-preview-${idx}`}>
                            <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                            <td className="px-3 py-2 text-gray-700 font-medium">{row.nickname}</td>
                            <td className="px-3 py-2 text-gray-600">{row.title}</td>
                            <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate">{row.address}</td>
                            <td className="px-3 py-2">
                              <div className="flex gap-1 flex-wrap">
                                {row.tags.split(",").filter(t => t.trim()).map((tag, ti) => (
                                  <span key={ti} className="inline-block px-1.5 py-0.5 bg-teal-50 text-teal-600 rounded text-[10px] font-medium">
                                    {tag.trim()}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-gray-400 max-w-[120px] truncate">{row.photoUrl || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  data-testid="button-cancel-import"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => importMutation.mutate(parsedRows)}
                  disabled={parsedRows.length === 0 || importMutation.isPending}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                  data-testid="button-confirm-import"
                >
                  {importMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Import {parsedRows.length} Properties
                </Button>
              </div>
            </div>
          )}

          {phase === "done" && importResult && (
            <div className="py-8 flex flex-col items-center gap-5">
              <div className="h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-gray-900">Import Complete</p>
                <div className="flex items-center justify-center gap-4 mt-3">
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-emerald-600">{importResult.created}</p>
                    <p className="text-[11px] text-gray-400 uppercase tracking-wider mt-0.5">Created</p>
                  </div>
                  {importResult.skipped > 0 && (
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-amber-500">{importResult.skipped}</p>
                      <p className="text-[11px] text-gray-400 uppercase tracking-wider mt-0.5">Skipped</p>
                    </div>
                  )}
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="w-full max-w-md bg-amber-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-amber-700 mb-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Warnings
                  </div>
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="text-xs text-amber-600 pl-5">{err}</p>
                  ))}
                </div>
              )}

              <Button
                onClick={handleReset}
                variant="outline"
                className="mt-2"
                data-testid="button-import-another"
              >
                Import Another File
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
