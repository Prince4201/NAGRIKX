import { useEffect, useRef } from 'react';
import type { MotionValue } from 'motion/react';
import cityPoster from '@/assets/civic-city.jpg';
import livingCityVideo from '@/assets/living-city.mp4';

const FRAME_COUNT = 240;
const WIDTH = 1920;
const HEIGHT = 1080;

interface Particle {
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  alpha: number;
  baseAlpha: number;
  offset: number;
}

export function CityFrameSequence({ progress, reduced }: { progress: MotionValue<number>; reduced: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (reduced) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    let active = true;
    let raf = 0;
    let lastTime = 0;
    let currentProgress = progress.get();
    let targetProgress = currentProgress;
    let isSeeking = false;
    let pendingSeek: number | null = null;
    let hasRenderedFirstFrame = false;

    // Generate lightweight atmospheric dust motes / civic light sparks
    const particles: Particle[] = Array.from({ length: 36 }, () => ({
      x: Math.random() * WIDTH,
      y: Math.random() * HEIGHT,
      r: 1.2 + Math.random() * 2.2,
      vy: -(0.25 + Math.random() * 0.45),
      vx: (Math.random() - 0.5) * 0.3,
      baseAlpha: 0.25 + Math.random() * 0.45,
      alpha: 0.3,
      offset: Math.random() * Math.PI * 2,
    }));

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    function drawFrame(now = performance.now()) {
      if (!active || !canvas || !video || !ctx) return;
      if (video.readyState < 2) return;

      // Draw high-resolution video frame
      ctx.drawImage(video, 0, 0, WIDTH, HEIGHT);

      // Atmospheric time-of-day illumination shift based on chapter/scroll progress
      // Progress 0.0 -> 0.35: Crisp morning daylight
      // Progress 0.35 -> 0.70: Clear midday vibrancy
      // Progress 0.70 -> 1.00: Radiant golden hour sunset glow
      if (currentProgress > 0.35) {
        const warmIntensity = Math.min(1, (currentProgress - 0.35) / 0.65);
        const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
        grad.addColorStop(0, `rgba(255, 170, 70, ${warmIntensity * 0.22})`);
        grad.addColorStop(0.55, `rgba(240, 120, 50, ${warmIntensity * 0.16})`);
        grad.addColorStop(1, `rgba(215, 60, 40, ${warmIntensity * 0.24})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      } else {
        // Morning cool sunrise tint
        const morningGlow = (1 - currentProgress / 0.35) * 0.12;
        ctx.fillStyle = `rgba(240, 245, 255, ${morningGlow})`;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      }

      // Cinematic radial vignette to frame content and give photographic depth
      const vig = ctx.createRadialGradient(WIDTH * 0.62, HEIGHT * 0.48, WIDTH * 0.25, WIDTH * 0.55, HEIGHT * 0.5, WIDTH * 0.78);
      vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vig.addColorStop(0.7, 'rgba(12, 24, 20, 0.16)');
      vig.addColorStop(1, 'rgba(8, 16, 14, 0.42)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Render floating golden dust motes / civic light motes
      const t = now * 0.0015;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]!;
        p.y += p.vy;
        p.x += Math.sin(t + p.offset) * 0.5 + p.vx;
        p.alpha = p.baseAlpha * (0.65 + 0.35 * Math.sin(t * 1.8 + p.offset));

        if (p.y < -10) {
          p.y = HEIGHT + 10;
          p.x = Math.random() * WIDTH;
        }
        if (p.x < -10) p.x = WIDTH + 10;
        else if (p.x > WIDTH + 10) p.x = -10;

        ctx.fillStyle = `rgba(255, 230, 165, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      const frameNumber = Math.max(0, Math.min(FRAME_COUNT - 1, Math.round(currentProgress * (FRAME_COUNT - 1))));
      canvas.dataset['frame'] = String(frameNumber);

      if (!hasRenderedFirstFrame) {
        hasRenderedFirstFrame = true;
        canvas.dataset['ready'] = 'true';
      }
    }

    function requestSeek(targetTime: number) {
      if (!video) return;
      const duration = video.duration || 10.027;
      const clamped = Math.max(0, Math.min(duration - 0.02, targetTime));

      if (isSeeking) {
        pendingSeek = clamped;
        return;
      }

      if (Math.abs(video.currentTime - clamped) < 0.02) {
        return;
      }

      isSeeking = true;
      if ('fastSeek' in video && typeof (video as any).fastSeek === 'function') {
        try {
          (video as any).fastSeek(clamped);
        } catch {
          video.currentTime = clamped;
        }
      } else {
        video.currentTime = clamped;
      }
    }

    const onSeeked = () => {
      isSeeking = false;
      drawFrame();
      if (pendingSeek !== null) {
        const next = pendingSeek;
        pendingSeek = null;
        if (Math.abs(video.currentTime - next) >= 0.02) {
          requestSeek(next);
        }
      }
    };

    const onLoadedData = () => {
      const duration = video.duration || 10.027;
      requestSeek(currentProgress * duration);
    };

    video.addEventListener('seeked', onSeeked);
    video.addEventListener('loadeddata', onLoadedData);
    video.addEventListener('canplay', onLoadedData);

    function tick(now: number) {
      raf = 0;
      if (!active) return;

      const delta = lastTime ? Math.min(64, now - lastTime) : 16;
      lastTime = now;

      // Responsive, smooth exponential damping
      const smoothingFactor = 1 - Math.exp(-delta / 70);
      currentProgress += (targetProgress - currentProgress) * smoothingFactor;

      if (Math.abs(targetProgress - currentProgress) < 0.0008) {
        currentProgress = targetProgress;
      }

      const duration = video?.duration || 10.027;
      const wantedTime = currentProgress * duration;
      requestSeek(wantedTime);

      // Repaint frame and live particles
      drawFrame(now);

      // Keep animation loop alive if animating or if particles are floating
      if (Math.abs(targetProgress - currentProgress) > 0.0005 || !hasRenderedFirstFrame) {
        schedule();
      } else {
        // Run at gentler cadence for ambient motes when idle
        raf = requestAnimationFrame(tick);
      }
    }

    function schedule() {
      if (active && !raf) {
        raf = requestAnimationFrame(tick);
      }
    }

    const unsubscribe = progress.on('change', (value) => {
      targetProgress = Math.max(0, Math.min(1, value));
      schedule();
    });

    if (video.readyState >= 2) {
      onLoadedData();
    } else {
      video.load();
    }
    schedule();

    return () => {
      active = false;
      unsubscribe();
      cancelAnimationFrame(raf);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('loadeddata', onLoadedData);
      video.removeEventListener('canplay', onLoadedData);
    };
  }, [progress, reduced]);

  return (
    <div className="hero-art pointer-events-none absolute inset-0 -z-20 overflow-hidden">
      {/* Crisp fallback poster while loading or for reduced motion */}
      <img
        src={cityPoster}
        width={1920}
        height={1080}
        alt="An illustrated Indian riverside city with green neighbourhoods, markets and an arched bridge"
        className="h-full w-full object-cover"
        fetchPriority="high"
      />

      {/* Hidden hardware-decoded video stream for frame scrubbing */}
      {!reduced && (
        <video
          ref={videoRef}
          src={livingCityVideo}
          playsInline
          muted
          preload="auto"
          aria-hidden="true"
          className="hidden"
        />
      )}

      {/* High-fidelity animated canvas with dynamic lighting & motes */}
      {!reduced && (
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          data-frame="0"
          data-frame-count={FRAME_COUNT}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700 ease-out data-[ready=true]:opacity-100"
        />
      )}
    </div>
  );
}
