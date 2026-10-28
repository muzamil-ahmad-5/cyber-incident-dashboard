import React, { useEffect, useRef } from 'react';

interface CyberBackgroundProps {
  matrixEnabled?: boolean;
  scanlinesEnabled?: boolean;
}

export const CyberBackground: React.FC<CyberBackgroundProps> = ({
  matrixEnabled = true,
  scanlinesEnabled = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Mouse coordinates for interactive glow & magnetic node pull
    const mouse = { x: -1000, y: -1000, targetX: -1000, targetY: -1000 };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      if (mouse.x < 0) {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
      }
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Tactical Floating Constellation Nodes
    const nodeCount = Math.min(36, Math.floor(width / 45));
    const nodes: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      pulse: number;
      pulseSpeed: number;
    }[] = [];

    const cyberColors = ['#06B6D4', '#22D3EE', '#10B981', '#38BDF8', '#818CF8'];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: 1 + Math.random() * 2,
        color: cyberColors[Math.floor(Math.random() * cyberColors.length)],
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.025,
      });
    }

    // Cybersecurity Hex & Opcode Matrix Drops
    const cyberTokens = [
      '01', '00', '0x7F', '0x4A', 'SYN', 'ACK', 'RST', 'TLS', 'SHA256', 
      'EDR', 'VLAN', 'SOC', 'CVE', 'AES', 'ETH0', 'DNS', 'PKT', 'HEUR'
    ];
    const fontSize = 12;
    const columns = Math.floor(width / (fontSize * 2.5));
    const drops: { y: number; speed: number; token: string }[] = [];
    for (let i = 0; i < columns; i++) {
      drops.push({
        y: Math.random() * -100,
        speed: 0.6 + Math.random() * 0.8,
        token: cyberTokens[Math.floor(Math.random() * cyberTokens.length)],
      });
    }

    let radarAngle = 0;
    let gridOffset = 0;

    // Main Canvas Render Loop
    const render = (_time: number) => {
      // Smooth mouse interpolation for fluid aura
      mouse.x += (mouse.targetX - mouse.x) * 0.1;
      mouse.y += (mouse.targetY - mouse.y) * 0.1;

      // Clear Canvas
      ctx.clearRect(0, 0, width, height);

      // 1. Perspective 3D Cyber Wireframe Grid (Horizon Ground)
      const horizonY = height * 0.68;
      gridOffset = (gridOffset + 0.35) % 40;

      ctx.save();
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.09)';
      ctx.lineWidth = 1;

      // Vanishing Perspective Rays
      const centerX = width * 0.5;
      const rayCount = 28;
      for (let i = -rayCount; i <= rayCount; i++) {
        const xBottom = centerX + i * 70;
        ctx.beginPath();
        ctx.moveTo(centerX + (i * 4), horizonY);
        ctx.lineTo(xBottom, height);
        ctx.stroke();
      }

      // Horizontal Scrolling Grid Lines with Exponential Depth
      for (let yOffset = 0; yOffset < height - horizonY; yOffset += 24) {
        const lineY = horizonY + Math.pow((yOffset + gridOffset) / (height - horizonY), 1.7) * (height - horizonY);
        if (lineY <= height) {
          const alpha = Math.min(0.18, ((lineY - horizonY) / (height - horizonY)) * 0.18);
          ctx.strokeStyle = `rgba(34, 211, 238, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(0, lineY);
          ctx.lineTo(width, lineY);
          ctx.stroke();
        }
      }
      ctx.restore();

      // 2. Ambient Tactical Radar in Background (Right Quadrant)
      radarAngle += 0.015;
      const radarCenterX = width * 0.82;
      const radarCenterY = height * 0.28;
      const radarRadius = Math.min(180, width * 0.16);

      ctx.save();
      // Concentric Rings
      for (let r = 0.33; r <= 1.0; r += 0.33) {
        ctx.beginPath();
        ctx.arc(radarCenterX, radarCenterY, radarRadius * r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Crosshairs & Cardinal Degree Hashmarks
      ctx.beginPath();
      ctx.moveTo(radarCenterX - radarRadius, radarCenterY);
      ctx.lineTo(radarCenterX + radarRadius, radarCenterY);
      ctx.moveTo(radarCenterX, radarCenterY - radarRadius);
      ctx.lineTo(radarCenterX, radarCenterY + radarRadius);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.06)';
      ctx.stroke();

      // Sweeping Beam Wedge
      ctx.beginPath();
      ctx.moveTo(radarCenterX, radarCenterY);
      ctx.arc(radarCenterX, radarCenterY, radarRadius, radarAngle, radarAngle + 0.5);
      ctx.closePath();
      const radarGrad = ctx.createRadialGradient(
        radarCenterX, radarCenterY, 5,
        radarCenterX, radarCenterY, radarRadius
      );
      radarGrad.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
      radarGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.fillStyle = radarGrad;
      ctx.fill();

      // Radar Azimuth Pointer
      ctx.beginPath();
      ctx.moveTo(radarCenterX, radarCenterY);
      ctx.lineTo(
        radarCenterX + Math.cos(radarAngle + 0.5) * radarRadius,
        radarCenterY + Math.sin(radarAngle + 0.5) * radarRadius
      );
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.4)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();

      // 3. Cyber Matrix Hex Streams (If Enabled)
      if (matrixEnabled) {
        ctx.save();
        ctx.font = `${fontSize}px "JetBrains Mono", monospace`;

        for (let i = 0; i < drops.length; i++) {
          const drop = drops[i];
          const x = i * (fontSize * 2.5) + 10;
          const y = drop.y * fontSize;

          // Head token (bright cyan)
          ctx.fillStyle = 'rgba(34, 211, 238, 0.28)';
          ctx.fillText(drop.token, x, y);

          // Faint trail
          ctx.fillStyle = 'rgba(6, 182, 212, 0.10)';
          ctx.fillText(cyberTokens[(i + 3) % cyberTokens.length], x, y - fontSize * 1.5);
          ctx.fillText(cyberTokens[(i + 7) % cyberTokens.length], x, y - fontSize * 3);

          drop.y += drop.speed;
          if (drop.y * fontSize > height) {
            drop.y = Math.random() * -20;
            drop.token = cyberTokens[Math.floor(Math.random() * cyberTokens.length)];
          }
        }
        ctx.restore();
      }

      // 4. Interactive Constellation Nodes & Vector Connections
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;
        n.pulse += n.pulseSpeed;

        if (n.x < 0) n.x = width;
        if (n.x > width) n.x = 0;
        if (n.y < 0) n.y = height;
        if (n.y > height) n.y = 0;

        // Reactive pull toward mouse cursor
        const dxMouse = mouse.x - n.x;
        const dyMouse = mouse.y - n.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        if (distMouse < 180 && distMouse > 1) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(6, 182, 212, ${0.45 * (1 - distMouse / 180)})`;
          ctx.lineWidth = 1;
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();

          // Magnetic gentle attraction
          n.x += (dxMouse / distMouse) * 0.3;
          n.y += (dyMouse / distMouse) * 0.3;
        }

        // Draw connections between nearby nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n.x - n2.x;
          const dy = n.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 125) {
            const alpha = 0.22 * (1 - dist / 125);
            ctx.beginPath();
            ctx.strokeStyle = `rgba(34, 211, 238, ${alpha})`;
            ctx.lineWidth = 0.75;
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();

            // Animated telemetry packet pulse traveling along vector
            if (dist < 80) {
              const packetPos = (Math.sin(n.pulse * 2) + 1) / 2;
              const px = n.x + (n2.x - n.x) * packetPos;
              const py = n.y + (n2.y - n.y) * packetPos;
              ctx.beginPath();
              ctx.arc(px, py, 1.2, 0, Math.PI * 2);
              ctx.fillStyle = '#A5F3FC';
              ctx.shadowColor = '#22D3EE';
              ctx.shadowBlur = 6;
              ctx.fill();
              ctx.shadowBlur = 0;
            }
          }
        }

        // Glowing Node Circle
        const currentRadius = n.radius + Math.sin(n.pulse) * 0.8;
        ctx.beginPath();
        ctx.arc(n.x, n.y, Math.max(1, currentRadius), 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = n.color;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 5. Interactive Magnetic Mouse Aura (Glowing Cyan/Violet Halo Under Glass Cards)
      if (mouse.x > 0 && mouse.y > 0) {
        ctx.save();
        const auraGrad = ctx.createRadialGradient(
          mouse.x, mouse.y, 0,
          mouse.x, mouse.y, 220
        );
        auraGrad.addColorStop(0, 'rgba(6, 182, 212, 0.12)');
        auraGrad.addColorStop(0.5, 'rgba(99, 102, 241, 0.05)');
        auraGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 220, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [matrixEnabled]);

  return (
    <>
      {/* Dynamic Hardware Accelerated WebGL/2D Cyber Canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0 opacity-75 select-none transition-opacity duration-500"
      />

      {/* CRT Scanline Overlay Texture */}
      {scanlinesEnabled && (
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none z-10 scanline-bg opacity-20 select-none"
        />
      )}

      {/* Subtle Ambient Radial Vignette & Glow Corners */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0 select-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/20 via-transparent to-slate-950/80"
      />
    </>
  );
};
