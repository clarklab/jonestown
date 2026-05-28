import { useEffect, useRef } from "react";
import { Mesh, Program, Renderer, Triangle } from "ogl";

const VERT = /* glsl */ `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// Animated soft gradient blobs — runs entirely on GPU.
// Warm "supper club" palette: ember, gold, mulberry on near-black.
const FRAG = /* glsl */ `
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform float uIntensity;

varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

float noise(in vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv;
  vec2 p = uv;
  p.x *= uResolution.x / uResolution.y;

  float t = uTime * 0.08;

  // animated coordinates for the fbm field
  vec2 q = vec2(fbm(p + t), fbm(p - t * 0.7 + 3.1));
  vec2 r = vec2(fbm(p + q + vec2(1.7, 9.2) + t * 0.5), fbm(p + q + vec2(8.3, 2.8) - t * 0.6));
  float f = fbm(p + r);

  // base palette
  vec3 dark      = vec3(0.05, 0.04, 0.04);          // near black
  vec3 ember     = vec3(0.93, 0.45, 0.16);          // orange ember
  vec3 mulberry  = vec3(0.40, 0.10, 0.20);          // deep wine
  vec3 gold      = vec3(0.95, 0.78, 0.40);          // gold

  vec3 color = mix(dark, mulberry, smoothstep(0.0, 0.55, f));
  color = mix(color, ember, smoothstep(0.35, 0.85, length(q)));
  color = mix(color, gold, smoothstep(0.7, 0.98, length(r)) * 0.75);

  // vignette
  float vig = smoothstep(1.15, 0.45, length(uv - 0.5) * 1.6);
  color *= mix(0.55, 1.0, vig);

  // subtle film grain
  float g = (hash(uv * uResolution + uTime) - 0.5) * 0.06;
  color += g;

  // global intensity (lets us crossfade in)
  color *= uIntensity;

  gl_FragColor = vec4(color, 1.0);
}
`;

export function HeroShader({
  className = "",
  intensity = 1,
}: {
  className?: string;
  intensity?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;

    const renderer = new Renderer({
      alpha: false,
      antialias: false,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
    });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 1);
    host.appendChild(gl.canvas);
    gl.canvas.style.display = "block";
    gl.canvas.style.width = "100%";
    gl.canvas.style.height = "100%";

    const geometry = new Triangle(gl);

    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [host.clientWidth, host.clientHeight] },
        uIntensity: { value: intensity },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });

    let frame = 0;
    let last = performance.now();

    const resize = () => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      renderer.setSize(w, h);
      program.uniforms.uResolution.value = [w, h];
      // Render immediately on resize so we never display a blank frame
      renderer.render({ scene: mesh });
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!document.hidden) {
        program.uniforms.uTime.value += dt;
        renderer.render({ scene: mesh });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      if (gl.canvas.parentNode === host) host.removeChild(gl.canvas);
      const extension = gl.getExtension("WEBGL_lose_context");
      extension?.loseContext();
    };
  }, [intensity]);

  return <div ref={ref} className={className} aria-hidden="true" />;
}
