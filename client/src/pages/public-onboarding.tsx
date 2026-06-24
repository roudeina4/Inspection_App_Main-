import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Home,
  Building2,
  Wifi,
  ParkingSquare,
  Shield,
  Thermometer,
  Trash2,
  FileText,
  CheckCircle2,
  Loader2,
  ClipboardList,
  BedDouble,
  MessageSquare,
  Phone,
  Eye,
  Send,
  Clock,
  AlertTriangle,
  Circle,
  Minus,
  Plus,
  X,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

interface OnboardingData {
  onboarding: {
    id: string;
    ownerName: string;
    status: string;
    propertyType: string | null;
    currentStep: number;
    responses: Record<string, any>;
    completedAt: string | null;
  };
  unit: {
    propertyName: string;
    unitNumber: string;
    address: string;
  } | null;
}

type TimeSlot = { date: string; timeWindows: string[] };

const TIME_WINDOWS = [
  "9:00 AM - 11:00 AM",
  "11:00 AM - 1:00 PM",
  "1:00 PM - 3:00 PM",
  "3:00 PM - 5:00 PM",
];

const STEP_COLORS: Record<string, { bg: string; text: string; border: string; icon: string; activeBg: string }> = {
  scheduling: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: "text-blue-600", activeBg: "bg-blue-600" },
  property_type: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", icon: "text-indigo-600", activeBg: "bg-indigo-600" },
  bedrooms_linens: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", icon: "text-violet-600", activeBg: "bg-violet-600" },
  wifi: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200", icon: "text-cyan-600", activeBg: "bg-cyan-600" },
  building_stay: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: "text-emerald-600", activeBg: "bg-emerald-600" },
  access_parking: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: "text-amber-600", activeBg: "bg-amber-600" },
  special_instructions: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", icon: "text-orange-600", activeBg: "bg-orange-600" },
  ac_smoke: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: "text-red-600", activeBg: "bg-red-600" },
  thermostat_fuse: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", icon: "text-rose-600", activeBg: "bg-rose-600" },
  warranty: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", icon: "text-slate-600", activeBg: "bg-slate-600" },
  bins: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200", icon: "text-teal-600", activeBg: "bg-teal-600" },
  review: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", icon: "text-green-600", activeBg: "bg-green-600" },
};

function getStepColor(id: string) {
  return STEP_COLORS[id] || STEP_COLORS.scheduling;
}

export default function PublicOnboardingPage({ token: propToken, onComplete }: { token?: string; onComplete?: () => void } = {}) {
  const [, params] = useRoute("/onboarding/:token");
  const token = propToken || params?.token;

  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [propertyType, setPropertyType] = useState<string | null>(null);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [isAnimating, setIsAnimating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data, isLoading, error } = useQuery<OnboardingData>({
    queryKey: ["/api/public/onboarding", token],
    queryFn: async () => {
      const res = await fetch(`/api/public/onboarding/${token}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!token,
  });

  useEffect(() => {
    if (data?.onboarding) {
      setResponses(data.onboarding.responses || {});
      setCurrentStep(data.onboarding.currentStep || 0);
      setPropertyType(data.onboarding.propertyType || null);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: { currentStep?: number; responses?: Record<string, any>; propertyType?: string }) => {
      return apiRequest("PATCH", `/api/public/onboarding/${token}`, payload);
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/public/onboarding/${token}/submit`);
    },
  });

  const autoSave = useCallback(
    (newResponses: Record<string, any>, step?: number, pt?: string) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        const payload: any = { responses: newResponses };
        if (step !== undefined) payload.currentStep = step;
        if (pt) payload.propertyType = pt;
        saveMutation.mutate(payload);
      }, 500);
    },
    [token]
  );

  const updateField = useCallback(
    (key: string, value: any) => {
      setResponses((prev) => {
        const updated = { ...prev, [key]: value };
        autoSave(updated);
        return updated;
      });
    },
    [autoSave]
  );

  const getSteps = useCallback(() => {
    const steps = [
      { id: "scheduling", title: "Inspection Scheduling", icon: CalendarIcon, subtitle: "Pick your preferred dates" },
      { id: "property_type", title: "Property Type", icon: Building2, subtitle: "House or condo unit" },
      { id: "bedrooms_linens", title: "Bedrooms & Linens", icon: BedDouble, subtitle: "Room count and supplies" },
      { id: "wifi", title: "WiFi Information", icon: Wifi, subtitle: "Network and provider details" },
      { id: "building_stay", title: "Building & Stay Info", icon: ClipboardList, subtitle: "Stay requirements" },
      { id: "access_parking", title: "Access & Parking", icon: ParkingSquare, subtitle: "Keys and parking details" },
      { id: "special_instructions", title: "Special Instructions", icon: MessageSquare, subtitle: "Important property notes" },
      { id: "ac_smoke", title: "AC & Smoke Detectors", icon: Shield, subtitle: "Safety equipment details" },
      { id: "thermostat_fuse", title: "Thermostat & Fusebox", icon: Thermometer, subtitle: "Climate and electrical info" },
      { id: "warranty", title: "Warranty", icon: FileText, subtitle: "Appliance warranty info" },
    ];
    if (propertyType === "HOUSE") {
      steps.push({ id: "bins", title: "Bins Service", icon: Trash2, subtitle: "Waste collection setup" });
    }
    steps.push({ id: "review", title: "Review & Submit", icon: Send, subtitle: "Final review" });
    return steps;
  }, [propertyType]);

  const steps = getSteps();
  const totalSteps = steps.length;
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  const isStepFilled = (stepId: string) => {
    if (stepId === "review") return false;
    if (stepId === "property_type") return !!propertyType;
    if (stepId === "scheduling") return (responses.scheduling_dates || []).length > 0;
    const keys = Object.keys(responses).filter((k) => k.startsWith(stepId.split("_")[0]));
    return keys.some((k) => {
      const val = responses[k];
      return val !== "" && val !== null && val !== undefined && !(Array.isArray(val) && val.length === 0);
    });
  };

  const goToStep = (nextStep: number) => {
    if (isAnimating || nextStep < 0 || nextStep >= totalSteps) return;
    setDirection(nextStep > currentStep ? "right" : "left");
    setIsAnimating(true);
    setSidebarOpen(false);
    setTimeout(() => {
      setCurrentStep(nextStep);
      autoSave(responses, nextStep, propertyType || undefined);
      setIsAnimating(false);
    }, 200);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
            <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
          </div>
          <p className="text-sm text-slate-500 font-medium">Loading questionnaire...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-red-100 p-8 text-center">
          <div className="h-16 w-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Link Not Found</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            This onboarding link is invalid or has expired. Please contact your property manager for a new link.
          </p>
        </div>
      </div>
    );
  }

  if (data.onboarding.status === "COMPLETED") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-green-100 p-8 text-center">
          <div className="h-16 w-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Thank You!</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Your onboarding questionnaire has been submitted successfully. Our team will review your responses and get back to you soon.
          </p>
          {data.unit && (
            <div className="mt-5 inline-flex items-center gap-2 bg-slate-50 rounded-lg px-4 py-2 text-sm text-slate-600">
              <Building2 className="h-4 w-4" />
              {data.unit.propertyName} — Unit {data.unit.unitNumber}
            </div>
          )}
        </div>
      </div>
    );
  }

  const renderCard = () => {
    const step = steps[currentStep];
    if (!step) return null;
    const colors = getStepColor(step.id);

    switch (step.id) {
      case "scheduling":
        return <SchedulingCard responses={responses} updateField={updateField} colors={colors} />;
      case "property_type":
        return (
          <PropertyTypeCard
            propertyType={propertyType}
            onSelect={(type) => {
              setPropertyType(type);
              autoSave(responses, currentStep, type);
            }}
            colors={colors}
          />
        );
      case "bedrooms_linens":
        return <BedroomsLinensCard responses={responses} updateField={updateField} colors={colors} />;
      case "wifi":
        return <WiFiCard responses={responses} updateField={updateField} colors={colors} />;
      case "building_stay":
        return <BuildingStayCard responses={responses} updateField={updateField} colors={colors} />;
      case "access_parking":
        return <AccessParkingCard responses={responses} updateField={updateField} colors={colors} />;
      case "special_instructions":
        return <SpecialInstructionsCard responses={responses} updateField={updateField} colors={colors} />;
      case "ac_smoke":
        return <ACSmokeCard responses={responses} updateField={updateField} colors={colors} />;
      case "thermostat_fuse":
        return <ThermostatFuseCard responses={responses} updateField={updateField} colors={colors} />;
      case "warranty":
        return <WarrantyCard responses={responses} updateField={updateField} colors={colors} />;
      case "bins":
        return <BinsCard responses={responses} updateField={updateField} colors={colors} />;
      case "review":
        return (
          <ReviewCard
            responses={responses}
            propertyType={propertyType}
            steps={steps}
            isStepFilled={isStepFilled}
            onGoToStep={goToStep}
            onSubmit={() => {
              submitMutation.mutate(undefined, {
                onSuccess: () => {
                  if (onComplete) {
                    onComplete();
                  } else {
                    window.location.reload();
                  }
                },
              });
            }}
            isSubmitting={submitMutation.isPending}
            colors={colors}
          />
        );
      default:
        return null;
    }
  };

  const isEmbedded = !!propToken;
  const currentStepData = steps[currentStep];
  const currentColors = currentStepData ? getStepColor(currentStepData.id) : getStepColor("scheduling");
  const completedCount = steps.filter((s) => s.id !== "review" && isStepFilled(s.id)).length;

  if (isEmbedded) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-slate-50/80">
        <div className="bg-white border-b border-slate-100 px-4 py-2 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${currentColors.activeBg}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <span className="text-[11px] font-medium text-slate-400 tabular-nums shrink-0" data-testid="text-step-counter">
              {currentStep + 1}/{totalSteps}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className={`${currentStepData?.id === "scheduling" ? "max-w-4xl" : "max-w-2xl"} mx-auto px-3 py-4 sm:px-6 sm:py-5 transition-all duration-200`}>
            <div
              className={`transition-all duration-200 ease-out ${
                isAnimating
                  ? direction === "right"
                    ? "opacity-0 translate-x-4"
                    : "opacity-0 -translate-x-4"
                  : "opacity-100 translate-x-0"
              }`}
            >
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className={`px-5 pt-5 pb-4 sm:px-6 sm:pt-6 border-b border-slate-100`}>
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${currentColors.activeBg} text-white shadow-sm shrink-0`}>
                      {currentStepData && <currentStepData.icon className="h-[18px] w-[18px]" />}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-[15px] sm:text-base font-bold text-slate-900 leading-tight" data-testid="text-step-title">
                        {currentStepData?.title}
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">{currentStepData?.subtitle}</p>
                    </div>
                  </div>
                </div>
                <div className="px-5 py-5 sm:px-6 sm:py-6">
                  {renderCard()}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border-t border-slate-100 shrink-0 mt-auto sticky bottom-0 z-10">
          <div className={`${currentStepData?.id === "scheduling" ? "max-w-4xl" : "max-w-2xl"} mx-auto px-3 py-3 sm:px-6 flex items-center justify-between gap-3 transition-all duration-200`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goToStep(currentStep - 1)}
              disabled={currentStep === 0 || isAnimating}
              className="gap-1 text-slate-500 hover:text-slate-700 h-9 px-3"
              data-testid="button-prev-step"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>

            <div className="flex items-center gap-1">
              {steps.map((s, i) => (
                <button
                  key={i}
                  onClick={() => goToStep(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === currentStep
                      ? `h-2 w-6 ${currentColors.activeBg}`
                      : isStepFilled(s.id)
                      ? "h-2 w-2 bg-green-400 hover:bg-green-500"
                      : "h-2 w-2 bg-slate-200 hover:bg-slate-300"
                  }`}
                  data-testid={`dot-step-${i}`}
                />
              ))}
            </div>

            {currentStep < totalSteps - 1 ? (
              <Button
                size="sm"
                onClick={() => goToStep(currentStep + 1)}
                disabled={isAnimating}
                className={`gap-1 h-9 px-4 ${currentColors.activeBg} hover:opacity-90 shadow-sm`}
                data-testid="button-next-step"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <div className="w-[52px] sm:w-[76px]" />
            )}
          </div>
        </div>

        {saveMutation.isPending && (
          <div className="fixed top-4 right-4 bg-slate-800 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 z-50 shadow-lg">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving...
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight" data-testid="text-onboarding-title">
              Property Onboarding
            </h1>
            {data.unit && (
              <p className="text-xs text-slate-500 mt-0.5" data-testid="text-unit-info">
                {data.unit.propertyName} — Unit {data.unit.unitNumber}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-blue-600">{completedCount}</span>
              <span>of {totalSteps - 1} sections completed</span>
            </div>
            <div className="h-2 w-24 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${(completedCount / (totalSteps - 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden max-w-6xl mx-auto w-full">
        <button
          className="lg:hidden fixed bottom-20 left-4 z-40 h-10 w-10 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          data-testid="button-toggle-steps"
        >
          <ClipboardList className="h-4 w-4" />
        </button>

        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <aside className={`
          fixed lg:static inset-y-0 left-0 z-40 w-72 bg-slate-50 border-r border-slate-200 flex flex-col transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          top-[53px]
        `}>
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Progress</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">
                Step {currentStep + 1} of {totalSteps}
              </p>
            </div>
            <button
              className="lg:hidden h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-4 py-2">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 bg-blue-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5" data-testid="steps-sidebar">
            {steps.map((step, i) => {
              const isActive = i === currentStep;
              const isFilled = isStepFilled(step.id);
              const stepColors = getStepColor(step.id);
              return (
                <button
                  key={step.id}
                  onClick={() => goToStep(i)}
                  className={`w-full rounded-xl text-left transition-all group relative ${
                    isActive
                      ? `bg-white shadow-md border ${stepColors.border} ring-1 ring-opacity-20 ${stepColors.border.replace("border-", "ring-")}`
                      : isFilled
                      ? "bg-white shadow-sm border border-green-100 hover:shadow-md hover:border-green-200"
                      : "bg-white border border-slate-100 hover:shadow-sm hover:border-slate-200"
                  }`}
                  data-testid={`step-nav-${step.id}`}
                >
                  {isActive && (
                    <div className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full ${stepColors.activeBg}`} />
                  )}
                  <div className="flex items-center gap-3 px-3.5 py-2.5">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                      isActive
                        ? `${stepColors.activeBg} text-white shadow-sm`
                        : isFilled
                        ? "bg-green-50 text-green-600 border border-green-100"
                        : "bg-slate-50 text-slate-400 border border-slate-100 group-hover:bg-slate-100"
                    }`}>
                      {isFilled && !isActive ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <span className="text-xs font-bold">{i + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${
                        isActive ? stepColors.text : isFilled ? "text-slate-700" : "text-slate-500"
                      }`}>
                        {step.title}
                      </p>
                      <p className={`text-[10px] truncate mt-0.5 ${
                        isActive ? "text-slate-400" : isFilled ? "text-green-500" : "text-slate-400"
                      }`}>
                        {isFilled && !isActive ? "Completed" : step.subtitle}
                      </p>
                    </div>
                    {isFilled && !isActive && (
                      <div className="h-5 w-5 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      </div>
                    )}
                    {isActive && (
                      <div className={`h-2 w-2 rounded-full ${stepColors.activeBg} animate-pulse flex-shrink-0`} />
                    )}
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 sm:px-8 py-4 border-b border-slate-100 bg-white">
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${currentColors.activeBg} text-white`}>
                {currentStepData && <currentStepData.icon className="h-4.5 w-4.5" />}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900" data-testid="text-step-title">
                  {currentStepData?.title}
                </h2>
                <p className="text-xs text-slate-500">{currentStepData?.subtitle}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="px-4 sm:px-8 py-6 max-w-2xl">
              <div
                className={`transition-all duration-200 ${
                  isAnimating
                    ? direction === "right"
                      ? "opacity-0 translate-x-6"
                      : "opacity-0 -translate-x-6"
                    : "opacity-100 translate-x-0"
                }`}
              >
                {renderCard()}
              </div>
            </div>
          </div>

          <div className="bg-white border-t border-slate-200 px-4 sm:px-8 py-3 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => goToStep(currentStep - 1)}
              disabled={currentStep === 0 || isAnimating}
              className="gap-1.5"
              data-testid="button-prev-step"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>

            <div className="flex items-center gap-1">
              {steps.map((s, i) => (
                <button
                  key={i}
                  onClick={() => goToStep(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === currentStep
                      ? `w-6 ${currentColors.activeBg}`
                      : isStepFilled(s.id)
                      ? "w-1.5 bg-green-400"
                      : "w-1.5 bg-slate-200 hover:bg-slate-300"
                  }`}
                  data-testid={`dot-step-${i}`}
                />
              ))}
            </div>

            {currentStep < totalSteps - 1 ? (
              <Button
                onClick={() => goToStep(currentStep + 1)}
                disabled={isAnimating}
                className={`gap-1.5 ${currentColors.activeBg} hover:opacity-90`}
                data-testid="button-next-step"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <div className="w-[88px]" />
            )}
          </div>
        </main>
      </div>

      {saveMutation.isPending && (
        <div className="fixed top-4 right-4 bg-slate-800 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 z-50 shadow-lg">
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving...
        </div>
      )}
    </div>
  );
}

interface StepColors {
  bg: string;
  text: string;
  border: string;
  icon: string;
  activeBg: string;
}

function SectionBlock({ children, title, description }: { children: React.ReactNode; title?: string; description?: string }) {
  return (
    <div className="space-y-3">
      {title && (
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

function InfoBox({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "warning" | "info" }) {
  const styles = {
    default: "bg-slate-50 border-slate-200 text-slate-600",
    warning: "bg-amber-50 border-amber-200 text-amber-700",
    info: "bg-blue-50 border-blue-200 text-blue-700",
  };
  return (
    <div className={`rounded-xl border p-4 text-sm ${styles[variant]}`}>
      {children}
    </div>
  );
}

function TogglePill({ options, value, onChange, testIdPrefix }: { options: string[]; value: string | null; onChange: (v: string) => void; testIdPrefix: string }) {
  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            value === opt
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
          data-testid={`${testIdPrefix}-${opt.toLowerCase().replace(/[^a-z]/g, "")}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-sm font-semibold text-slate-700">{label}</Label>
      {hint && <p className="text-xs text-slate-400 mt-0.5 mb-1.5">{hint}</p>}
      {!hint && <div className="mt-1.5" />}
      {children}
    </div>
  );
}

function SchedulingCard({ responses, updateField, colors }: { responses: Record<string, any>; updateField: (k: string, v: any) => void; colors: StepColors }) {
  const selectedDates: string[] = responses.scheduling_dates || [];
  const timeSlots: TimeSlot[] = responses.scheduling_timeSlots || [];
  const [calendarOpen, setCalendarOpen] = useState(false);

  const toggleTimeWindow = (dateStr: string, window: string) => {
    const newSlots = timeSlots.map((s) => {
      if (s.date !== dateStr) return s;
      const windows = s.timeWindows.includes(window)
        ? s.timeWindows.filter((w) => w !== window)
        : [...s.timeWindows, window];
      return { ...s, timeWindows: windows };
    });
    updateField("scheduling_timeSlots", newSlots);
  };

  const removeDate = (dateStr: string) => {
    const newDates = selectedDates.filter((d) => d !== dateStr);
    const newSlots = timeSlots.filter((s) => s.date !== dateStr);
    updateField("scheduling_dates", newDates);
    updateField("scheduling_timeSlots", newSlots);
  };

  return (
    <div className="flex flex-col md:flex-row md:gap-0">
      <div className="md:w-[45%] md:pr-5 md:border-r md:border-slate-100 pb-5 md:pb-0">
        <InfoBox variant="info">
          <p className="font-semibold text-blue-800 mb-2">What happens during the inspection?</p>
          <p className="text-blue-600 text-sm leading-relaxed mb-2">
            Our inspector will check for pre-existing damages, missing items, and the overall state of the unit. Based on the results we'll proceed to:
          </p>
          <div className="flex gap-3 mt-2 flex-wrap">
            <div className="flex items-center gap-2 bg-blue-100 rounded-lg px-3 py-1.5 text-xs font-medium text-blue-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Professional Cleaning
            </div>
            <div className="flex items-center gap-2 bg-blue-100 rounded-lg px-3 py-1.5 text-xs font-medium text-blue-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Professional Photos
            </div>
          </div>
          <p className="text-blue-500 text-xs mt-3">
            Don't worry if there are damages — we'll offer suggestions and work with you to get the unit fully ready.
          </p>
        </InfoBox>
      </div>

      <div className="md:w-[55%] md:pl-5 space-y-5">
        <SectionBlock title="Select Available Dates" description="Choose one or more dates when you're available">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`w-full justify-between h-11 text-left font-medium ${
                  selectedDates.length > 0
                    ? "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    : "hover:bg-slate-50"
                }`}
                data-testid="button-choose-dates"
              >
                <span className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {selectedDates.length > 0
                    ? `${selectedDates.length} date${selectedDates.length > 1 ? "s" : ""} selected`
                    : "Choose your available dates"}
                </span>
                <ChevronRight className={`h-4 w-4 transition-transform ${calendarOpen ? "rotate-90" : ""}`} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="multiple"
                selected={selectedDates.map((d) => new Date(d + "T00:00:00"))}
                onSelect={(dates) => {
                  if (!dates) return;
                  const dateStrs = dates.map((d) => format(d, "yyyy-MM-dd"));
                  const newSlots = dateStrs.map((ds) => {
                    const existing = timeSlots.find((s) => s.date === ds);
                    return existing || { date: ds, timeWindows: [] };
                  });
                  updateField("scheduling_dates", dateStrs);
                  updateField("scheduling_timeSlots", newSlots);
                }}
                disabled={(date) => date < new Date()}
                className="rounded-xl"
                data-testid="calendar-scheduling"
              />
            </PopoverContent>
          </Popover>
        </SectionBlock>

        {selectedDates.length > 0 && (
          <SectionBlock title="Preferred Time Windows" description="Select your available time slots for each date">
            <div className="space-y-3">
              {selectedDates.sort().map((dateStr) => {
                const slot = timeSlots.find((s) => s.date === dateStr);
                const selectedCount = slot?.timeWindows.length || 0;
                return (
                  <div key={dateStr} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-xs font-semibold text-slate-700">
                          {format(new Date(dateStr + "T00:00:00"), "EEE, MMM d, yyyy")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedCount > 0 && (
                          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                            {selectedCount} slot{selectedCount > 1 ? "s" : ""}
                          </span>
                        )}
                        <button
                          onClick={() => removeDate(dateStr)}
                          className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors"
                          data-testid={`button-remove-date-${dateStr}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="p-2.5 grid grid-cols-2 gap-1.5">
                      {TIME_WINDOWS.map((tw) => {
                        const isSelected = slot?.timeWindows.includes(tw);
                        return (
                          <button
                            key={tw}
                            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                              isSelected
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                            }`}
                            onClick={() => toggleTimeWindow(dateStr, tw)}
                            data-testid={`badge-time-${dateStr}-${tw}`}
                          >
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            {tw}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionBlock>
        )}
      </div>
    </div>
  );
}

function PropertyTypeCard({ propertyType, onSelect, colors }: { propertyType: string | null; onSelect: (type: string) => void; colors: StepColors }) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500 leading-relaxed">
        Please select the type of property being onboarded. This helps us tailor the questionnaire to your needs.
      </p>
      <div className="grid grid-cols-2 gap-4">
        {[
          { type: "HOUSE", icon: Home, label: "House", desc: "Standalone property", color: "indigo" },
          { type: "UNIT", icon: Building2, label: "Unit / Condo", desc: "Building unit", color: "blue" },
        ].map(({ type, icon: Icon, label, desc }) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className={`relative p-6 rounded-2xl border-2 text-center transition-all group ${
              propertyType === type
                ? "border-indigo-500 bg-indigo-50 shadow-sm"
                : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
            }`}
            data-testid={`button-property-${type.toLowerCase()}`}
          >
            {propertyType === type && (
              <div className="absolute top-3 right-3">
                <CheckCircle2 className="h-5 w-5 text-indigo-500" />
              </div>
            )}
            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-colors ${
              propertyType === type ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
            }`}>
              <Icon className="h-6 w-6" />
            </div>
            <p className={`font-bold text-sm ${propertyType === type ? "text-indigo-700" : "text-slate-700"}`}>{label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function BedroomsLinensCard({ responses, updateField, colors }: { responses: Record<string, any>; updateField: (k: string, v: any) => void; colors: StepColors }) {
  const bedroomCount = responses.bedroom_count || 1;

  return (
    <div className="space-y-6">
      <SectionBlock title="Number of Bedrooms">
        <div className="flex items-center gap-4">
          <button
            className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 text-slate-600 transition-colors"
            onClick={() => updateField("bedroom_count", Math.max(1, bedroomCount - 1))}
            data-testid="button-bedroom-minus"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="text-2xl font-bold text-slate-800 w-8 text-center" data-testid="text-bedroom-count">{bedroomCount}</span>
          <button
            className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 text-slate-600 transition-colors"
            onClick={() => updateField("bedroom_count", bedroomCount + 1)}
            data-testid="button-bedroom-plus"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </SectionBlock>

      <SectionBlock title="Required Items Per Bedroom" description="Please ensure these items are available before the inspection">
        <div className="bg-violet-50 rounded-xl p-4 space-y-2.5 border border-violet-100">
          {[
            { text: "2 sets of brand new towels per bed", sub: "1 body towel, 1 hand towel, 1 face towel per set" },
            { text: "2 sets of brand new linens per bed", sub: "1 fitted sheet, 1 duvet, 1 duvet cover, 2 pillow cases per set" },
            { text: "A mattress protector per bed", sub: null },
            { text: "2 brand new pillows per bed", sub: null },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
              <div>
                <span className="text-sm font-medium text-violet-800">{item.text}</span>
                {item.sub && <span className="text-xs text-violet-500 block">{item.sub}</span>}
              </div>
            </div>
          ))}
        </div>
      </SectionBlock>

      <FieldGroup label="Confirmation / Notes">
        <Textarea
          value={responses.linens_notes || ""}
          onChange={(e) => updateField("linens_notes", e.target.value)}
          placeholder="e.g., I will provide all items before inspection, or any questions..."
          className="min-h-[80px] rounded-xl"
          data-testid="input-linens-notes"
        />
      </FieldGroup>
    </div>
  );
}

function WiFiCard({ responses, updateField, colors }: { responses: Record<string, any>; updateField: (k: string, v: any) => void; colors: StepColors }) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500 leading-relaxed">
        We need WiFi details so guests can get connected easily.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldGroup label="Network Name (SSID)">
          <Input
            value={responses.wifi_ssid || ""}
            onChange={(e) => updateField("wifi_ssid", e.target.value)}
            placeholder="Network name"
            className="rounded-xl"
            data-testid="input-wifi-ssid"
          />
        </FieldGroup>
        <FieldGroup label="WiFi Password">
          <Input
            value={responses.wifi_password || ""}
            onChange={(e) => updateField("wifi_password", e.target.value)}
            placeholder="Password"
            className="rounded-xl"
            data-testid="input-wifi-password"
          />
        </FieldGroup>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldGroup label="Internet Provider">
          <Input
            value={responses.wifi_provider || ""}
            onChange={(e) => updateField("wifi_provider", e.target.value)}
            placeholder="e.g., Bell, Rogers, Telus"
            className="rounded-xl"
            data-testid="input-wifi-provider"
          />
        </FieldGroup>
        <FieldGroup label="Account Number">
          <Input
            value={responses.wifi_account || ""}
            onChange={(e) => updateField("wifi_account", e.target.value)}
            placeholder="Account number"
            className="rounded-xl"
            data-testid="input-wifi-account"
          />
        </FieldGroup>
      </div>
      <FieldGroup label="Modem Location">
        <Input
          value={responses.wifi_modem_location || ""}
          onChange={(e) => updateField("wifi_modem_location", e.target.value)}
          placeholder="e.g., Living room closet, bedroom desk"
          className="rounded-xl"
          data-testid="input-wifi-modem"
        />
      </FieldGroup>
      <InfoBox variant="warning">
        <div className="flex items-start gap-2.5">
          <Phone className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-amber-800">Action Required</p>
            <p className="text-amber-600 text-sm mt-1">
              Please call your provider to add us as an authorized user so we can troubleshoot issues on your behalf without disturbing you.
            </p>
          </div>
        </div>
      </InfoBox>
    </div>
  );
}

function BuildingStayCard({ responses, updateField, colors }: { responses: Record<string, any>; updateField: (k: string, v: any) => void; colors: StepColors }) {
  return (
    <div className="space-y-5">
      <FieldGroup label="Building Minimum Stay" hint="Please clarify the minimum stay required by the building">
        <Input
          value={responses.minimum_stay || ""}
          onChange={(e) => updateField("minimum_stay", e.target.value)}
          placeholder="e.g., 30 days, no minimum, etc."
          className="rounded-xl"
          data-testid="input-minimum-stay"
        />
      </FieldGroup>
      <FieldGroup label="Unique Selling Points" hint="What makes your property stand out?">
        <Textarea
          value={responses.selling_points || ""}
          onChange={(e) => updateField("selling_points", e.target.value)}
          placeholder="e.g., newly furnished, recently renovated, luxury finishes, great view, etc."
          className="min-h-[80px] rounded-xl"
          data-testid="input-selling-points"
        />
      </FieldGroup>
    </div>
  );
}

function AccessParkingCard({ responses, updateField, colors }: { responses: Record<string, any>; updateField: (k: string, v: any) => void; colors: StepColors }) {
  return (
    <div className="space-y-5">
      <FieldGroup label="Mailbox Access" hint="Will guests be provided access to the mailbox?">
        <TogglePill
          options={["Yes", "No"]}
          value={responses.mailbox_access || null}
          onChange={(v) => updateField("mailbox_access", v)}
          testIdPrefix="badge-mailbox"
        />
      </FieldGroup>
      <FieldGroup label="Parking Information" hint="Parking spot number, level, and any special access info">
        <Textarea
          value={responses.parking_info || ""}
          onChange={(e) => updateField("parking_info", e.target.value)}
          placeholder="e.g., Spot P2-45, Level 2, use FOB to enter garage"
          className="min-h-[80px] rounded-xl"
          data-testid="input-parking-info"
        />
      </FieldGroup>
    </div>
  );
}

function SpecialInstructionsCard({ responses, updateField, colors }: { responses: Record<string, any>; updateField: (k: string, v: any) => void; colors: StepColors }) {
  return (
    <div className="space-y-5">
      <FieldGroup label="Special Instructions" hint="Any property-specific or building-specific notes we should be aware of (think blinds, TV, doors etc.)">
        <Textarea
          value={responses.special_instructions || ""}
          onChange={(e) => updateField("special_instructions", e.target.value)}
          placeholder="e.g., TV requires specific remote, balcony door needs to be lifted slightly to lock..."
          rows={4}
          className="rounded-xl"
          data-testid="input-special-instructions"
        />
      </FieldGroup>
      <FieldGroup label="Building Management Contact" hint="We will reach out to introduce ourselves and retrieve all registration paperwork needed">
        <Textarea
          value={responses.building_management_contact || ""}
          onChange={(e) => updateField("building_management_contact", e.target.value)}
          placeholder="Name, phone number, email..."
          className="rounded-xl"
          data-testid="input-building-management"
        />
      </FieldGroup>
    </div>
  );
}

function ACSmokeCard({ responses, updateField, colors }: { responses: Record<string, any>; updateField: (k: string, v: any) => void; colors: StepColors }) {
  return (
    <div className="space-y-6">
      <SectionBlock title="AC Filters">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldGroup label="Location">
            <Input
              value={responses.ac_filter_location || ""}
              onChange={(e) => updateField("ac_filter_location", e.target.value)}
              placeholder="Where are the AC filters located?"
              className="rounded-xl"
              data-testid="input-ac-location"
            />
          </FieldGroup>
          <FieldGroup label="Quantity">
            <Input
              type="number"
              min={0}
              value={responses.ac_filter_quantity || ""}
              onChange={(e) => updateField("ac_filter_quantity", e.target.value)}
              placeholder="How many?"
              className="rounded-xl"
              data-testid="input-ac-quantity"
            />
          </FieldGroup>
        </div>
      </SectionBlock>

      <div className="border-t border-slate-100 pt-6">
        <SectionBlock title="Smoke Detectors">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldGroup label="Locations">
              <Input
                value={responses.smoke_detector_locations || ""}
                onChange={(e) => updateField("smoke_detector_locations", e.target.value)}
                placeholder="Where are the smoke detectors?"
                className="rounded-xl"
                data-testid="input-smoke-locations"
              />
            </FieldGroup>
            <FieldGroup label="Quantity">
              <Input
                type="number"
                min={0}
                value={responses.smoke_detector_quantity || ""}
                onChange={(e) => updateField("smoke_detector_quantity", e.target.value)}
                placeholder="How many?"
                className="rounded-xl"
                data-testid="input-smoke-quantity"
              />
            </FieldGroup>
          </div>
          <FieldGroup label="Type">
            <TogglePill
              options={["Battery", "Plugin"]}
              value={responses.smoke_detector_type || null}
              onChange={(v) => updateField("smoke_detector_type", v)}
              testIdPrefix="badge-smoke-type"
            />
          </FieldGroup>
          <FieldGroup label="Installation Company" hint="Did you contract installation via a company? If yes, what's the name and contact?">
            <Input
              value={responses.smoke_detector_company || ""}
              onChange={(e) => updateField("smoke_detector_company", e.target.value)}
              placeholder="Company name and contact info"
              className="rounded-xl"
              data-testid="input-smoke-company"
            />
          </FieldGroup>
        </SectionBlock>
      </div>
    </div>
  );
}

function ThermostatFuseCard({ responses, updateField, colors }: { responses: Record<string, any>; updateField: (k: string, v: any) => void; colors: StepColors }) {
  return (
    <div className="space-y-6">
      <SectionBlock title="Thermostat">
        <div className="space-y-4">
          <FieldGroup label="Location">
            <Input
              value={responses.thermostat_location || ""}
              onChange={(e) => updateField("thermostat_location", e.target.value)}
              placeholder="Where is the thermostat?"
              className="rounded-xl"
              data-testid="input-thermostat-location"
            />
          </FieldGroup>
          <FieldGroup label="Special Notes">
            <Textarea
              value={responses.thermostat_notes || ""}
              onChange={(e) => updateField("thermostat_notes", e.target.value)}
              placeholder="Any special notes about the thermostat?"
              className="rounded-xl"
              data-testid="input-thermostat-notes"
            />
          </FieldGroup>
        </div>
      </SectionBlock>

      <div className="border-t border-slate-100 pt-6">
        <SectionBlock title="Fusebox">
          <FieldGroup label="Fusebox Location">
            <Input
              value={responses.fusebox_location || ""}
              onChange={(e) => updateField("fusebox_location", e.target.value)}
              placeholder="Where is the fusebox/electrical panel?"
              className="rounded-xl"
              data-testid="input-fusebox-location"
            />
          </FieldGroup>
        </SectionBlock>
      </div>
    </div>
  );
}

function WarrantyCard({ responses, updateField, colors }: { responses: Record<string, any>; updateField: (k: string, v: any) => void; colors: StepColors }) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500 leading-relaxed">
        Are any appliances under warranty? If so, please provide details and upload warranty documentation.
      </p>
      <FieldGroup label="Appliances Under Warranty">
        <TogglePill
          options={["Yes", "No"]}
          value={responses.has_warranty || null}
          onChange={(v) => updateField("has_warranty", v)}
          testIdPrefix="badge-warranty"
        />
      </FieldGroup>
      {responses.has_warranty === "Yes" && (
        <FieldGroup label="Warranty Details" hint="Please list which appliances are under warranty and provide documentation per machine">
          <Textarea
            value={responses.warranty_details || ""}
            onChange={(e) => updateField("warranty_details", e.target.value)}
            placeholder="e.g., Dishwasher - Samsung warranty valid until 2026, Washer - LG 3-year warranty..."
            rows={4}
            className="rounded-xl"
            data-testid="input-warranty-details"
          />
        </FieldGroup>
      )}
    </div>
  );
}

function BinsCard({ responses, updateField, colors }: { responses: Record<string, any>; updateField: (k: string, v: any) => void; colors: StepColors }) {
  return (
    <div className="space-y-5">
      <InfoBox>
        <p className="text-slate-600">
          For houses, we charge <strong className="text-slate-800">$150 + HST monthly</strong> to put bins to the curb and back. Can you kindly confirm how many bins you have?
        </p>
      </InfoBox>
      <FieldGroup label="Number of Bins">
        <Input
          type="number"
          min={0}
          value={responses.bins_count || ""}
          onChange={(e) => updateField("bins_count", e.target.value)}
          placeholder="How many bins?"
          className="rounded-xl"
          data-testid="input-bins-count"
        />
      </FieldGroup>
      <FieldGroup label="Confirm Bin Service">
        <TogglePill
          options={["Yes, I confirm", "No, I'll handle it"]}
          value={responses.bins_confirm || null}
          onChange={(v) => updateField("bins_confirm", v)}
          testIdPrefix="badge-bins"
        />
      </FieldGroup>
    </div>
  );
}

function ReviewCard({
  responses,
  propertyType,
  steps,
  isStepFilled,
  onGoToStep,
  onSubmit,
  isSubmitting,
  colors,
}: {
  responses: Record<string, any>;
  propertyType: string | null;
  steps: { id: string; title: string; icon: any }[];
  isStepFilled: (id: string) => boolean;
  onGoToStep: (i: number) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  colors: StepColors;
}) {
  const totalSections = steps.filter((s) => s.id !== "review").length;
  const filledCount = steps.filter((s) => s.id !== "review" && isStepFilled(s.id)).length;

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500 leading-relaxed">
        Please review your answers below. You can click on any section to go back and make changes before submitting.
      </p>

      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="relative h-12 w-12 flex-shrink-0">
          <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e2e8f0" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.5" fill="none"
              stroke={filledCount === totalSections ? "#22c55e" : "#3b82f6"}
              strokeWidth="3" strokeLinecap="round"
              strokeDasharray={`${(filledCount / totalSections) * 97.4} 97.4`}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">
            {filledCount}/{totalSections}
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">
            {filledCount === totalSections ? "All sections complete!" : `${totalSections - filledCount} section${totalSections - filledCount > 1 ? "s" : ""} remaining`}
          </p>
          <p className="text-xs text-slate-500">
            {filledCount === totalSections ? "You're ready to submit." : "Complete all sections for best results."}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        {steps
          .filter((s) => s.id !== "review")
          .map((s, i) => {
            const isFilled = isStepFilled(s.id);
            const stepColors = getStepColor(s.id);
            return (
              <button
                key={s.id}
                onClick={() => onGoToStep(i)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left group hover:shadow-sm ${
                  isFilled ? "border-green-200 bg-green-50/50" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
                data-testid={`review-section-${s.id}`}
              >
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isFilled ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400"
                }`}>
                  {isFilled ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                </div>
                <span className={`flex-1 text-sm ${isFilled ? "font-semibold text-slate-700" : "text-slate-500"}`}>
                  {s.title}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
              </button>
            );
          })}
      </div>

      <Button
        onClick={onSubmit}
        disabled={isSubmitting}
        className="w-full h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold"
        data-testid="button-submit-onboarding"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Submit Questionnaire
          </>
        )}
      </Button>
    </div>
  );
}
