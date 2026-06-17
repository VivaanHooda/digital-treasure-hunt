"use client";

import { useEffect, useRef } from "react";

/** Global canvas particle field + gradient/grid overlays (ported from legacy). */
export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const particlesRef = useRef<Array<{ x: number; y: number; update: () => void; draw: () => void }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    class Particle {
      x = 0; y = 0; size = 1; speedX = 0; speedY = 0; opacity = 0.3;
      color = "rgba(56, 189, 248, "; life = 1; decay = 0.002;
      constructor() {
        const rect = canvas!.getBoundingClientRect();
        this.x = Math.random() * rect.width;
        this.y = Math.random() * rect.height;
        this.size = Math.random() * 1.5 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.speedY = (Math.random() - 0.5) * 0.3;
        this.opacity = Math.random() * 0.4 + 0.2;
        this.color = this.getRandomColor();
        this.decay = Math.random() * 0.003 + 0.001;
      }
      getRandomColor() {
        const colors = [
          "rgba(56, 189, 248, ", "rgba(139, 92, 246, ", "rgba(59, 130, 246, ",
          "rgba(168, 85, 247, ", "rgba(34, 197, 94, ",
        ];
        return colors[Math.floor(Math.random() * colors.length)];
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= this.decay;
        const rect = canvas!.getBoundingClientRect();
        if (this.x < 0) this.x = rect.width;
        if (this.x > rect.width) this.x = 0;
        if (this.y < 0) this.y = rect.height;
        if (this.y > rect.height) this.y = 0;
        if (this.life <= 0) {
          this.x = Math.random() * rect.width;
          this.y = Math.random() * rect.height;
          this.life = 1;
          this.opacity = Math.random() * 0.4 + 0.2;
          this.color = this.getRandomColor();
        }
      }
      draw() {
        const finalOpacity = this.opacity * this.life;
        ctx!.globalAlpha = finalOpacity;
        ctx!.fillStyle = this.color + finalOpacity + ")";
        ctx!.beginPath();
        ctx!.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx!.fill();
        if (finalOpacity > 0.3) {
          ctx!.shadowBlur = 10;
          ctx!.shadowColor = this.color + "0.3)";
          ctx!.fill();
          ctx!.shadowBlur = 0;
        }
      }
    }

    const initParticles = () => {
      particlesRef.current = [];
      const rect = canvas.getBoundingClientRect();
      const area = rect.width * rect.height;
      const isMobile = window.innerWidth < 768;
      const baseCount = isMobile ? 30 : 60;
      const densityFactor = Math.min(area / 500000, 1.5);
      const particleCount = Math.floor(baseCount * densityFactor);
      for (let i = 0; i < particleCount; i++) particlesRef.current.push(new Particle());
    };

    let lastTime = 0;
    const targetFPS = window.innerWidth < 768 ? 30 : 60;
    const animate = (currentTime: number) => {
      if (currentTime - lastTime < 1000 / targetFPS) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      lastTime = currentTime;
      const rect = canvas.getBoundingClientRect();
      ctx.fillStyle = "rgba(17, 24, 39, 0.05)";
      ctx.fillRect(0, 0, rect.width, rect.height);
      const maxConnections = window.innerWidth < 768 ? 50 : 100;
      const connectionDistance = window.innerWidth < 768 ? 80 : 100;
      let connectionCount = 0;
      particlesRef.current.forEach((particle, index) => {
        particle.update();
        if (connectionCount < maxConnections) {
          const startIndex = Math.max(0, index - 5);
          particlesRef.current.slice(startIndex, index).forEach((other) => {
            const dx = particle.x - other.x;
            const dy = particle.y - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < connectionDistance) {
              const opacity = 0.1 * (1 - distance / connectionDistance);
              ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`;
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(other.x, other.y);
              ctx.stroke();
              connectionCount++;
            }
          });
        }
        particle.draw();
      });
      animationRef.current = requestAnimationFrame(animate);
    };

    initParticles();
    const startTimer = setTimeout(() => animate(0), 100);
    const handleResize = () => {
      resizeCanvas();
      initParticles();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(startTimer);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("resize", handleResize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0 pointer-events-none w-full h-full"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}
      />
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-gray-900/95 to-black/90" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-cyan-500/5" />
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-transparent" />
      </div>
    </>
  );
}
