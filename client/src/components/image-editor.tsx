import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  X,
  Pencil,
  Circle,
  ArrowRight,
  Square,
  Undo2,
  Redo2,
  RotateCcw,
  Crop,
  Check,
  Palette,
  Minus,
  Plus,
  Type,
} from "lucide-react";

type Tool = "draw" | "circle" | "arrow" | "rectangle" | "text";

interface Point {
  x: number;
  y: number;
}

interface DrawAction {
  type: Tool;
  color: string;
  lineWidth: number;
  points?: Point[];
  startPoint?: Point;
  endPoint?: Point;
  text?: string;
}

interface ImageEditorProps {
  imageUrl: string;
  onSave: (editedFile: File) => void;
  onCancel: () => void;
}

const COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ffffff",
  "#000000",
];

export function ImageEditor({ imageUrl, onSave, onCancel }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>("draw");
  const [color, setColor] = useState("#ef4444");
  const [lineWidth, setLineWidth] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [actions, setActions] = useState<DrawAction[]>([]);
  const [redoStack, setRedoStack] = useState<DrawAction[]>([]);
  const [currentAction, setCurrentAction] = useState<DrawAction | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [cropStart, setCropStart] = useState<Point | null>(null);
  const [cropEnd, setCropEnd] = useState<Point | null>(null);
  const [showColors, setShowColors] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);
      fitImageToContainer(img);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const fitImageToContainer = useCallback((img: HTMLImageElement) => {
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const imgRatio = img.width / img.height;
    const containerRatio = containerWidth / containerHeight;

    let drawWidth: number, drawHeight: number;
    if (imgRatio > containerRatio) {
      drawWidth = containerWidth;
      drawHeight = containerWidth / imgRatio;
    } else {
      drawHeight = containerHeight;
      drawWidth = containerHeight * imgRatio;
    }

    const s = drawWidth / img.width;
    setScale(s);
    setCanvasSize({ width: Math.round(drawWidth), height: Math.round(drawHeight) });
    setImageOffset({
      x: Math.round((containerWidth - drawWidth) / 2),
      y: Math.round((containerHeight - drawHeight) / 2),
    });
  }, []);

  useEffect(() => {
    if (!image) return;
    const handleResize = () => fitImageToContainer(image);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [image, fitImageToContainer]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !image) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    actions.forEach((action) => drawActionOnCanvas(ctx, action));

    if (currentAction) {
      drawActionOnCanvas(ctx, currentAction);
    }

    if (isCropping && cropStart && cropEnd) {
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const x = Math.min(cropStart.x, cropEnd.x);
      const y = Math.min(cropStart.y, cropEnd.y);
      const w = Math.abs(cropEnd.x - cropStart.x);
      const h = Math.abs(cropEnd.y - cropStart.y);

      ctx.clearRect(x, y, w, h);
      ctx.drawImage(
        image,
        x / scale,
        y / scale,
        w / scale,
        h / scale,
        x,
        y,
        w,
        h
      );
      actions.forEach((action) => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        drawActionOnCanvas(ctx, action);
        ctx.restore();
      });

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);

      const cornerSize = 10;
      ctx.fillStyle = "#ffffff";
      [
        [x, y],
        [x + w, y],
        [x, y + h],
        [x + w, y + h],
      ].forEach(([cx, cy]) => {
        ctx.fillRect(cx - cornerSize / 2, cy - cornerSize / 2, cornerSize, cornerSize);
      });

      ctx.restore();
    }
  }, [image, actions, currentAction, isCropping, cropStart, cropEnd, scale]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasSize.width === 0) return;
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    redrawCanvas();
  }, [canvasSize, redrawCanvas]);

  const drawActionOnCanvas = (ctx: CanvasRenderingContext2D, action: DrawAction) => {
    ctx.strokeStyle = action.color;
    ctx.fillStyle = action.color;
    ctx.lineWidth = action.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    switch (action.type) {
      case "draw":
        if (action.points && action.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(action.points[0].x, action.points[0].y);
          for (let i = 1; i < action.points.length; i++) {
            ctx.lineTo(action.points[i].x, action.points[i].y);
          }
          ctx.stroke();
        }
        break;
      case "circle":
        if (action.startPoint && action.endPoint) {
          const cx = (action.startPoint.x + action.endPoint.x) / 2;
          const cy = (action.startPoint.y + action.endPoint.y) / 2;
          const rx = Math.abs(action.endPoint.x - action.startPoint.x) / 2;
          const ry = Math.abs(action.endPoint.y - action.startPoint.y) / 2;
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      case "rectangle":
        if (action.startPoint && action.endPoint) {
          const w = action.endPoint.x - action.startPoint.x;
          const h = action.endPoint.y - action.startPoint.y;
          ctx.beginPath();
          ctx.strokeRect(action.startPoint.x, action.startPoint.y, w, h);
        }
        break;
      case "arrow":
        if (action.startPoint && action.endPoint) {
          const dx = action.endPoint.x - action.startPoint.x;
          const dy = action.endPoint.y - action.startPoint.y;
          const angle = Math.atan2(dy, dx);
          const headLength = Math.min(20, Math.sqrt(dx * dx + dy * dy) * 0.3);

          ctx.beginPath();
          ctx.moveTo(action.startPoint.x, action.startPoint.y);
          ctx.lineTo(action.endPoint.x, action.endPoint.y);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(action.endPoint.x, action.endPoint.y);
          ctx.lineTo(
            action.endPoint.x - headLength * Math.cos(angle - Math.PI / 6),
            action.endPoint.y - headLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(action.endPoint.x, action.endPoint.y);
          ctx.lineTo(
            action.endPoint.x - headLength * Math.cos(angle + Math.PI / 6),
            action.endPoint.y - headLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
        }
        break;
      case "text":
        if (action.startPoint && action.text) {
          ctx.font = `${action.lineWidth * 4}px sans-serif`;
          ctx.fillText(action.text, action.startPoint.x, action.startPoint.y);
        }
        break;
    }
  };

  const getCanvasPoint = (e: React.TouchEvent | React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX: number, clientY: number;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const point = getCanvasPoint(e);
    setIsDrawing(true);

    if (isCropping) {
      setCropStart(point);
      setCropEnd(point);
      return;
    }

    if (tool === "text") {
      const text = prompt("Enter text:");
      if (text) {
        const action: DrawAction = {
          type: "text",
          color,
          lineWidth,
          startPoint: point,
          text,
        };
        setActions((prev) => [...prev, action]);
        setRedoStack([]);
      }
      return;
    }

    if (tool === "draw") {
      setCurrentAction({
        type: "draw",
        color,
        lineWidth,
        points: [point],
      });
    } else {
      setCurrentAction({
        type: tool,
        color,
        lineWidth,
        startPoint: point,
        endPoint: point,
      });
    }
  };

  const handlePointerMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const point = getCanvasPoint(e);

    if (isCropping) {
      setCropEnd(point);
      return;
    }

    if (!currentAction) return;

    if (tool === "draw") {
      setCurrentAction((prev) => {
        if (!prev) return prev;
        return { ...prev, points: [...(prev.points || []), point] };
      });
    } else {
      setCurrentAction((prev) => {
        if (!prev) return prev;
        return { ...prev, endPoint: point };
      });
    }
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (isCropping) return;

    if (currentAction) {
      setActions((prev) => [...prev, currentAction]);
      setRedoStack([]);
      setCurrentAction(null);
    }
  };

  const handleUndo = () => {
    if (actions.length === 0) return;
    const lastAction = actions[actions.length - 1];
    setActions((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [lastAction, ...prev]);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextAction = redoStack[0];
    setRedoStack((prev) => prev.slice(1));
    setActions((prev) => [...prev, nextAction]);
  };

  const handleReset = () => {
    setActions([]);
    setRedoStack([]);
    setCurrentAction(null);
    setIsCropping(false);
    setCropStart(null);
    setCropEnd(null);
  };

  const applyCrop = () => {
    if (!cropStart || !cropEnd || !image) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const x = Math.min(cropStart.x, cropEnd.x);
    const y = Math.min(cropStart.y, cropEnd.y);
    const w = Math.abs(cropEnd.x - cropStart.x);
    const h = Math.abs(cropEnd.y - cropStart.y);

    if (w < 10 || h < 10) {
      setIsCropping(false);
      setCropStart(null);
      setCropEnd(null);
      return;
    }

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;

    tempCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h);

    const croppedImg = new Image();
    croppedImg.onload = () => {
      setImage(croppedImg);
      setActions([]);
      setRedoStack([]);
      setIsCropping(false);
      setCropStart(null);
      setCropEnd(null);
      fitImageToContainer(croppedImg);
    };
    croppedImg.src = tempCanvas.toDataURL("image/png");
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = image.width;
    exportCanvas.height = image.height;
    const exportCtx = exportCanvas.getContext("2d");
    if (!exportCtx) return;

    exportCtx.drawImage(image, 0, 0);

    const exportScale = image.width / canvas.width;
    exportCtx.save();
    exportCtx.scale(exportScale, exportScale);
    actions.forEach((action) => drawActionOnCanvas(exportCtx, action));
    exportCtx.restore();

    exportCanvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `edited_${Date.now()}.png`, { type: "image/png" });
      onSave(file);
    }, "image/png");
  };

  const tools: { id: Tool; icon: typeof Pencil; label: string }[] = [
    { id: "draw", icon: Pencil, label: "Draw" },
    { id: "circle", icon: Circle, label: "Circle" },
    { id: "arrow", icon: ArrowRight, label: "Arrow" },
    { id: "rectangle", icon: Square, label: "Box" },
    { id: "text", icon: Type, label: "Text" },
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col" data-testid="image-editor">
      <header className="flex items-center justify-between gap-2 px-3 py-2 bg-black/90 border-b border-white/10 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="text-white"
          data-testid="button-editor-cancel"
        >
          <X className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleUndo}
            disabled={actions.length === 0}
            className="text-white disabled:text-white/30"
            data-testid="button-undo"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="text-white disabled:text-white/30"
            data-testid="button-redo"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            className="text-white"
            data-testid="button-reset"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
        {isCropping ? (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsCropping(false);
                setCropStart(null);
                setCropEnd(null);
              }}
              className="text-white text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={applyCrop}
              disabled={!cropStart || !cropEnd}
              className="text-xs"
              data-testid="button-apply-crop"
            >
              <Check className="h-3 w-3 mr-1" />
              Apply
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            onClick={handleSave}
            className="text-xs"
            data-testid="button-editor-save"
          >
            <Check className="h-3 w-3 mr-1" />
            Save
          </Button>
        )}
      </header>

      <div
        ref={containerRef}
        className="flex-1 overflow-hidden flex items-center justify-center bg-black relative"
      >
        {canvasSize.width > 0 && (
          <canvas
            ref={canvasRef}
            className="touch-none"
            style={{
              width: canvasSize.width,
              height: canvasSize.height,
              cursor: isCropping ? "crosshair" : tool === "draw" ? "crosshair" : "crosshair",
            }}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          />
        )}
      </div>

      {showColors && (
        <div className="absolute bottom-24 left-0 right-0 flex justify-center z-10 px-4">
          <div className="bg-black/90 backdrop-blur rounded-lg p-3 border border-white/10">
            <div className="flex gap-2 mb-3 flex-wrap justify-center">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    color === c ? "border-white scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => {
                    setColor(c);
                    setShowColors(false);
                  }}
                  data-testid={`button-color-${c.replace("#", "")}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 px-1">
              <Minus className="h-3 w-3 text-white/60" />
              <Slider
                value={[lineWidth]}
                min={1}
                max={12}
                step={1}
                onValueChange={(v) => setLineWidth(v[0])}
                className="flex-1"
                data-testid="slider-line-width"
              />
              <Plus className="h-3 w-3 text-white/60" />
            </div>
          </div>
        </div>
      )}

      <footer className="bg-black/90 border-t border-white/10 px-2 py-2 shrink-0">
        <div className="flex items-center justify-center gap-1">
          {tools.map((t) => {
            const Icon = t.icon;
            const isActive = !isCropping && tool === t.id;
            return (
              <Button
                key={t.id}
                variant="ghost"
                size="sm"
                className={`flex-col h-auto py-1.5 px-2.5 gap-0.5 text-[10px] ${
                  isActive ? "bg-white/20 text-white" : "text-white/60"
                }`}
                onClick={() => {
                  setTool(t.id);
                  setIsCropping(false);
                }}
                data-testid={`button-tool-${t.id}`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </Button>
            );
          })}
          <Button
            variant="ghost"
            size="sm"
            className={`flex-col h-auto py-1.5 px-2.5 gap-0.5 text-[10px] ${
              isCropping ? "bg-white/20 text-white" : "text-white/60"
            }`}
            onClick={() => {
              setIsCropping(!isCropping);
              setCropStart(null);
              setCropEnd(null);
            }}
            data-testid="button-tool-crop"
          >
            <Crop className="h-4 w-4" />
            Crop
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-col h-auto py-1.5 px-2.5 gap-0.5 text-[10px] text-white/60"
            onClick={() => setShowColors(!showColors)}
            data-testid="button-color-picker"
          >
            <div className="h-4 w-4 rounded-full border border-white/40" style={{ backgroundColor: color }} />
            Color
          </Button>
        </div>
      </footer>
    </div>
  );
}
