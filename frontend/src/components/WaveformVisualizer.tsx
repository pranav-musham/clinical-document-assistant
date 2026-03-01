/**
 * WaveformVisualizer Component
 * Real-time waveform visualization using Canvas and Web Audio API
 */

import { useEffect, useRef } from 'react';

interface WaveformVisualizerProps {
  analyserNode: AnalyserNode | null;
  isActive?: boolean;
  height?: number;
  barCount?: number;
  barColor?: string;
  barGap?: number;
  className?: string;
}

export default function WaveformVisualizer({
  analyserNode,
  isActive = false,
  height = 100,
  barCount = 32,
  barColor = '#3b82f6',
  barGap = 2,
  className = ''
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const canvasWidth = rect.width;
    const canvasHeight = rect.height;

    /**
     * Draw the waveform
     */
    const draw = () => {
      if (!ctx || !canvas) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // If not active or no analyser, draw idle state
      if (!isActive || !analyserNode) {
        drawIdleState(ctx, canvasWidth, canvasHeight, barCount, barGap);
        if (isActive) {
          animationFrameRef.current = requestAnimationFrame(draw);
        }
        return;
      }

      // Get frequency data
      const bufferLength = analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserNode.getByteFrequencyData(dataArray);

      // Calculate bar width
      const barWidth = (canvasWidth - (barCount - 1) * barGap) / barCount;

      // Draw bars
      for (let i = 0; i < barCount; i++) {
        // Get frequency value (sample from the data array)
        const dataIndex = Math.floor((i / barCount) * bufferLength);
        const value = dataArray[dataIndex];

        // Calculate bar height (normalize to canvas height)
        const barHeight = (value / 255) * canvasHeight;
        const minHeight = 4; // Minimum bar height
        const finalHeight = Math.max(barHeight, minHeight);

        // Calculate bar position
        const x = i * (barWidth + barGap);
        const y = canvasHeight - finalHeight;

        // Draw bar with gradient
        const gradient = ctx.createLinearGradient(0, y, 0, canvasHeight);
        gradient.addColorStop(0, barColor);
        gradient.addColorStop(1, adjustColorBrightness(barColor, 40));

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, finalHeight);
      }

      // Continue animation
      animationFrameRef.current = requestAnimationFrame(draw);
    };

    // Start drawing
    draw();

    // Cleanup
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [analyserNode, isActive, barCount, barColor, barGap]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full rounded ${className}`}
      style={{ height: `${height}px` }}
    />
  );
}

/**
 * Draw idle state (static bars with gentle animation)
 */
function drawIdleState(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  barCount: number,
  barGap: number
) {
  const barWidth = (width - (barCount - 1) * barGap) / barCount;
  const idleColor = '#e5e7eb'; // gray-200

  for (let i = 0; i < barCount; i++) {
    // Random height for idle state
    const randomHeight = Math.random() * 0.3 * height + 4;

    const x = i * (barWidth + barGap);
    const y = height - randomHeight;

    ctx.fillStyle = idleColor;
    ctx.fillRect(x, y, barWidth, randomHeight);
  }
}

/**
 * Adjust color brightness
 */
function adjustColorBrightness(color: string, amount: number): string {
  // If color is hex format
  if (color.startsWith('#')) {
    let hex = color.replace('#', '');

    // Convert 3-digit hex to 6-digit
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }

    // Parse RGB
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    // Adjust brightness
    r = Math.min(255, Math.max(0, r + amount));
    g = Math.min(255, Math.max(0, g + amount));
    b = Math.min(255, Math.max(0, b + amount));

    // Convert back to hex
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  // If color is rgb/rgba format
  if (color.startsWith('rgb')) {
    const matches = color.match(/\d+/g);
    if (!matches || matches.length < 3) return color;

    let [r, g, b] = matches.map(Number);

    r = Math.min(255, Math.max(0, r + amount));
    g = Math.min(255, Math.max(0, g + amount));
    b = Math.min(255, Math.max(0, b + amount));

    if (matches.length === 4) {
      return `rgba(${r}, ${g}, ${b}, ${matches[3]})`;
    }
    return `rgb(${r}, ${g}, ${b})`;
  }

  return color;
}
