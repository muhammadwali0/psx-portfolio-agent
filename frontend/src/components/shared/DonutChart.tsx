import { useEffect, useRef } from 'react';
import { useStore } from '../../store/store';

interface Segment {
  value: number;
  color: string;
  label?: string;
}

interface Props {
  segments: Segment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  className?: string;
}

export default function DonutChart({ segments, size = 160, thickness = 18, centerLabel, centerValue, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const theme = useStore((s) => s.theme);
  const shariahMode = useStore((s) => s.shariahMode);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const radius = (size - thickness) / 2;
    const total = segments.reduce((sum, s) => sum + s.value, 0);
    if (total === 0) return;

    let startTime: number;
    const animDuration = 900;

    const draw = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / animDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      ctx.clearRect(0, 0, size, size);

      // Background ring
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = thickness;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Segments
      let currentAngle = -Math.PI / 2;
      segments.forEach((seg) => {
        const segAngle = (seg.value / total) * Math.PI * 2 * eased;
        const gap = segments.length > 1 ? 0.04 : 0;
        
        ctx.beginPath();
        ctx.arc(cx, cy, radius, currentAngle + gap / 2, currentAngle + segAngle - gap / 2);
        ctx.strokeStyle = seg.color;
        ctx.lineWidth = thickness;
        ctx.lineCap = 'round';
        ctx.stroke();

        currentAngle += segAngle;
      });

      // Center text
      if (centerValue) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Premium accent color for value, matching active mode
        ctx.fillStyle = shariahMode ? '#2D9F6F' : '#22C55E';
        ctx.font = `700 ${size * 0.15}px "Plus Jakarta Sans", "Inter", sans-serif`;
        ctx.fillText(centerValue, cx, centerLabel ? cy - 6 : cy);
        
        if (centerLabel) {
          ctx.fillStyle = theme === 'light' ? '#71717A' : '#A1A1AA';
          ctx.font = `500 ${size * 0.075}px "Inter", sans-serif`;
          ctx.fillText(centerLabel, cx, cy + 14);
        }
      }

      if (progress < 1) {
        animRef.current = requestAnimationFrame(draw);
      }
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [segments, size, thickness, centerLabel, centerValue, theme, shariahMode]);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="block"
      />
      {segments.length > 0 && (
        <div className="flex flex-wrap justify-center gap-3 mt-4">
          {segments.map((seg) => (
            <div key={seg.label || seg.color} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }} />
              <span className="text-[10px] font-medium text-psx-300">
                {seg.label} {seg.value > 0 && <span className="text-psx-200 font-semibold">{seg.value.toFixed(1)}%</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
