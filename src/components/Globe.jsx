import { useRef, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';

const generateSpherePoints = (count, radius) => {
  const points = [];
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  for (let i = 0; i < count; i++) {
    const theta = (2 * Math.PI * i) / goldenRatio;
    const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
    points.push({
      x: radius * Math.sin(phi) * Math.cos(theta),
      y: radius * Math.cos(phi),
      z: radius * Math.sin(phi) * Math.sin(theta),
    });
  }
  return points;
};

const profiles = [
  { name: 'Sarah Chen', title: 'CEO of JAYSTACK', x: '12%', y: '28%', seed: 'Sarah' },
  { name: 'Michael Obi', title: 'CEO of JAYSTACK', x: '75%', y: '20%', seed: 'Michael' },
  { name: 'Lisa Park', title: 'CEO of JAYSTACK', x: '5%', y: '60%', seed: 'Lisa' },
  { name: 'James Adler', title: 'CEO of JAYSTACK', x: '50%', y: '45%', seed: 'James' },
  { name: 'Amara Diallo', title: 'CEO of JAYSTACK', x: '30%', y: '55%', seed: 'Amara' },
  { name: 'David Kim', title: 'CEO of JAYSTACK', x: '82%', y: '55%', seed: 'David' },
];

const Globe = () => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const angleRef = useRef(0);
  const basePoints = useMemo(() => generateSpherePoints(500, 1), []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height * 0.55;
    const radius = Math.min(width * 0.45, height * 0.42);
    const fov = 800;

    const angle = angleRef.current;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // Tilt the globe so we see it from slightly above
    const tiltAngle = -0.4;
    const cosT = Math.cos(tiltAngle);
    const sinT = Math.sin(tiltAngle);

    const projected = basePoints.map((p) => {
      // Scale to current radius
      let x = p.x * radius;
      let y = p.y * radius;
      let z = p.z * radius;

      // Rotate around Y axis
      const rx = x * cosA - z * sinA;
      const rz = x * sinA + z * cosA;

      // Tilt around X axis
      const ry = y * cosT - rz * sinT;
      const rz2 = y * sinT + rz * cosT;

      const scale = fov / (fov + rz2);
      return {
        px: centerX + rx * scale,
        py: centerY + ry * scale,
        z: rz2,
        scale,
      };
    });

    // Draw connection lines
    const maxDist = radius * 0.28;
    ctx.lineWidth = 0.5;

    for (let i = 0; i < projected.length; i++) {
      const pi = projected[i];
      if (pi.z < -radius * 0.2) continue; // skip back-facing

      for (let j = i + 1; j < projected.length; j++) {
        const pj = projected[j];
        if (pj.z < -radius * 0.2) continue;

        const dx = pi.px - pj.px;
        const dy = pi.py - pj.py;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxDist * pi.scale) {
          const depthI = (pi.z + radius) / (2 * radius);
          const depthJ = (pj.z + radius) / (2 * radius);
          const alpha = 0.18 * depthI * depthJ;

          if (alpha > 0.01) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(pi.px, pi.py);
            ctx.lineTo(pj.px, pj.py);
            ctx.stroke();
          }
        }
      }
    }

    // Draw points
    for (const p of projected) {
      if (p.z < -radius * 0.2) continue;
      const depth = (p.z + radius) / (2 * radius);
      const alpha = 0.15 + 0.6 * depth;
      const size = 1.2 * p.scale;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.px, p.py, size, 0, Math.PI * 2);
      ctx.fill();
    }

    angleRef.current += 0.001;
    animationRef.current = requestAnimationFrame(draw);
  }, [basePoints]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(draw);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [draw]);

  return (
    <div className="relative w-full -mt-8" style={{ height: '65vh', maxHeight: '650px' }}>
      {/* Gradient fade at top to blend with hero */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-navy-900 to-transparent z-10 pointer-events-none" />

      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
        aria-label="Network globe visualization"
      />

      {/* Profile avatars */}
      {profiles.map((profile, i) => (
        <motion.div
          key={profile.name}
          className="absolute flex flex-col items-center pointer-events-none hidden sm:flex"
          style={{ left: profile.x, top: profile.y }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: [0, -6, 0],
          }}
          transition={{
            opacity: { duration: 0.6, delay: 0.3 + i * 0.15 },
            scale: { duration: 0.6, delay: 0.3 + i * 0.15 },
            y: {
              duration: 3 + i * 0.3,
              repeat: Infinity,
              delay: i * 0.5,
              ease: 'easeInOut',
            },
          }}
        >
          <div className="relative">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-white/20 overflow-hidden shadow-lg shadow-accent/10 bg-navy-700">
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc`}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-accent rounded-full border-2 border-navy-900" />
          </div>
          <span className="mt-1.5 text-[11px] text-gray-400 font-medium whitespace-nowrap">
            {profile.title}
          </span>
        </motion.div>
      ))}
    </div>
  );
};

export default Globe;
