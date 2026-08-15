"use client";

import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import { useEffect, useRef } from "react";

export type UniverseDomainProjection = {
  id: string;
  x: number;
  y: number;
};

type Props = {
  domains: UniverseDomainProjection[];
  fingerprint: string;
  morph: number;
  onWheel: (event: ReactWheelEvent<HTMLCanvasElement>) => void;
  opacity: number;
};

type Renderer = {
  dispose: () => void;
  draw: (time: number, rotationX: number, rotationY: number, morph: number) => void;
};

const PARTICLE_LIMIT = 240;
const CONNECTION_LIMIT = 320;

export function KnowledgeUniverseWebGl({ domains, fingerprint, morph, onWheel, opacity }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const frameRef = useRef<number | null>(null);
  const rotationRef = useRef({ x: -0.08, y: 0 });
  const morphRef = useRef(morph);
  const dragRef = useRef<{ id: number; x: number; y: number; rotationX: number; rotationY: number } | null>(null);
  const enabled = opacity > 0.01;

  useEffect(() => {
    morphRef.current = morph;
  }, [morph]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled) return;

    let active = true;
    let lastFrame = 0;
    const gl = canvas.getContext("webgl", { alpha: true, antialias: false });

    if (!gl) {
      canvas.dataset.fallback = "true";
      drawFallback(canvas, fingerprint);
      return;
    }

    try {
      rendererRef.current = createRenderer(gl, domains, fingerprint);
    } catch {
      canvas.dataset.fallback = "true";
      drawFallback(canvas, fingerprint);
      return;
    }

    const render = (time: number) => {
      if (!active) return;
      if (time - lastFrame >= 1000 / 30) {
        lastFrame = time;
        const rotation = rotationRef.current;
        rendererRef.current?.draw(time / 1000, rotation.x, rotation.y, morphRef.current);
      }
      frameRef.current = requestAnimationFrame(render);
    };
    frameRef.current = requestAnimationFrame(render);

    return () => {
      active = false;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, [domains, enabled, fingerprint]);

  function pointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      rotationX: rotationRef.current.x,
      rotationY: rotationRef.current.y,
    };
  }

  function pointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    rotationRef.current = {
      x: clamp(drag.rotationX + (event.clientY - drag.y) * 0.004, -0.65, 0.65),
      y: drag.rotationY + (event.clientX - drag.x) * 0.005,
    };
  }

  function pointerEnd(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (dragRef.current?.id === event.pointerId) dragRef.current = null;
  }

  return (
    <canvas
      aria-label="Räumliche Wissensuniversumskugel"
      className="universe-webgl-canvas"
      onPointerCancel={pointerEnd}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerEnd}
      onWheel={onWheel}
      ref={canvasRef}
      style={{ opacity, pointerEvents: opacity > 0.08 ? "auto" : "none" }}
    />
  );
}

function createRenderer(gl: WebGLRenderingContext, domains: UniverseDomainProjection[], fingerprint: string): Renderer {
  const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
  const scene = projectScene(domains, fingerprint);
  const particleBuffer = createBuffer(gl, scene.particles);
  const lineBuffer = createBuffer(gl, scene.lines);
  const sphere = gl.getAttribLocation(program, "sphere");
  const cluster = gl.getAttribLocation(program, "cluster");
  const details = gl.getAttribLocation(program, "details");
  const rotation = gl.getUniformLocation(program, "rotation");
  const time = gl.getUniformLocation(program, "time");
  const sceneMorph = gl.getUniformLocation(program, "sceneMorph");
  const mode = gl.getUniformLocation(program, "mode");
  const pixelRatio = gl.getUniformLocation(program, "pixelRatio");
  if (sphere < 0 || cluster < 0 || details < 0 || !rotation || !time || !sceneMorph || !mode || !pixelRatio) throw new Error("WebGL bindings unavailable");

  gl.useProgram(program);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.disable(gl.DEPTH_TEST);

  const bind = (buffer: WebGLBuffer) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(sphere);
    gl.vertexAttribPointer(sphere, 3, gl.FLOAT, false, 9 * 4, 0);
    gl.enableVertexAttribArray(cluster);
    gl.vertexAttribPointer(cluster, 3, gl.FLOAT, false, 9 * 4, 3 * 4);
    gl.enableVertexAttribArray(details);
    gl.vertexAttribPointer(details, 3, gl.FLOAT, false, 9 * 4, 6 * 4);
  };

  return {
    dispose: () => {
      gl.deleteBuffer(particleBuffer);
      gl.deleteBuffer(lineBuffer);
      gl.deleteProgram(program);
    },
    draw: (seconds, rotationX, rotationY, morph) => {
      resizeCanvas(gl.canvas as HTMLCanvasElement);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform2f(rotation, rotationX, rotationY);
      gl.uniform1f(time, seconds * 0.035);
      gl.uniform1f(sceneMorph, morph);
      gl.uniform1f(pixelRatio, Math.min(window.devicePixelRatio || 1, 2));
      gl.uniform1f(mode, 1);
      bind(lineBuffer);
      gl.drawArrays(gl.LINES, 0, scene.lineCount * 2);
      gl.uniform1f(mode, 0);
      bind(particleBuffer);
      gl.drawArrays(gl.POINTS, 0, scene.particleCount);
    },
  };
}

function projectScene(domains: UniverseDomainProjection[], fingerprint: string) {
  const points: number[][] = [];
  const ordered = [...domains].sort((a, b) => a.id.localeCompare(b.id));
  for (const domain of ordered) {
    for (let index = 0; index < 14 && points.length < PARTICLE_LIMIT; index += 1) {
      const seed = `${fingerprint}:${domain.id}:${index}`;
      const z = hash(`${seed}:z`) * 2 - 1;
      const angle = hash(`${seed}:angle`) * Math.PI * 2;
      const radius = hash(`${seed}:outside`) > 0.94
        ? 1.03 + hash(`${seed}:drift`) * 0.18
        : hash(`${seed}:core`) < 0.24
          ? 0.08 + hash(`${seed}:coreRadius`) * 0.42
          : Math.pow(hash(`${seed}:radius`), 0.34);
      const ring = Math.sqrt(Math.max(0, 1 - z * z));
      const clusterX = (domain.x / 1800) * 2 - 1;
      const clusterY = 1 - (domain.y / 1150) * 2;
      points.push([
        Math.cos(angle) * ring * radius * 0.66,
        Math.sin(angle) * ring * radius * 0.66,
        z * radius,
        clusterX + (hash(`${seed}:cx`) - 0.5) * 0.085,
        clusterY + (hash(`${seed}:cy`) - 0.5) * 0.085,
        hash(`${seed}:cz`) * 1.2 - 0.6,
        3.2 + hash(`${seed}:size`) * 4.8,
        hash(`${seed}:core`) < 0.24 ? 2.4 : 0.8 + hash(`${seed}:light`) * 0.8,
        0,
      ]);
    }
  }
  const connections: [number, number][] = [];
  for (let source = 0; source < points.length; source += 1) {
    const nearest = points.map((point, index) => ({ index, distance: index === source ? Infinity : distance3(points[source]!, point) }))
      .sort((a, b) => a.distance - b.distance || a.index - b.index).slice(0, 2);
    for (const target of nearest) {
      const pair: [number, number] = source < target.index ? [source, target.index] : [target.index, source];
      if (!connections.some(([a, b]) => a === pair[0] && b === pair[1])) connections.push(pair);
    }
  }
  const lines = connections.slice(0, CONNECTION_LIMIT).flatMap(([a, b]) => {
    const left = points[a]!;
    const right = points[b]!;
    return [[...left.slice(0, 6), 1, 0.28, 0], [...right.slice(0, 6), 1, 0.28, 0]];
  });
  return {
    particles: new Float32Array(points.flat()),
    lines: new Float32Array(lines.flat()),
    particleCount: points.length,
    lineCount: lines.length / 2,
  };
}

function createProgram(gl: WebGLRenderingContext, vertex: string, fragment: string) {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Shader allocation failed");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || "Shader compile failed");
    return shader;
  };
  const vertexShader = compile(gl.VERTEX_SHADER, vertex);
  const fragmentShader = compile(gl.FRAGMENT_SHADER, fragment);
  const program = gl.createProgram();
  if (!program) throw new Error("Program allocation failed");
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "Program link failed");
  return program;
}

function createBuffer(gl: WebGLRenderingContext, data: Float32Array) {
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error("Buffer allocation failed");
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buffer;
}

function resizeCanvas(canvas: HTMLCanvasElement) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
  const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
}

function drawFallback(canvas: HTMLCanvasElement, seed: string) {
  resizeCanvas(canvas);
  const context = canvas.getContext("2d");
  if (!context) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = Math.min(canvas.width, canvas.height) * 0.32;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(96,220,255,.72)";
  for (let index = 0; index < 180; index += 1) {
    const angle = hash(`${seed}:${index}:a`) * Math.PI * 2;
    const r = Math.sqrt(hash(`${seed}:${index}:r`)) * radius;
    context.beginPath();
    context.arc(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, (1 + hash(`${seed}:${index}:s`) * 2) * ratio, 0, Math.PI * 2);
    context.fill();
  }
}

function hash(value: string) { let result = 2166136261; for (let i = 0; i < value.length; i += 1) { result ^= value.charCodeAt(i); result = Math.imul(result, 16777619); } return (result >>> 0) / 4294967295; }
function distance3(a: number[], b: number[]) { return (a[0]! - b[0]!) ** 2 + (a[1]! - b[1]!) ** 2 + ((a[2]! - b[2]!) * 0.7) ** 2; }
function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }

const VERTEX_SHADER = `
attribute vec3 sphere; attribute vec3 cluster; attribute vec3 details;
uniform vec2 rotation; uniform float time; uniform float sceneMorph; uniform float mode; uniform float pixelRatio;
varying float light; varying float renderMode;
void main() {
  vec3 p = mix(sphere, cluster, sceneMorph);
  float cy = cos(rotation.y + time), sy = sin(rotation.y + time);
  float cx = cos(rotation.x + sin(time * .7) * .025), sx = sin(rotation.x + sin(time * .7) * .025);
  vec3 py = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
  vec3 pr = vec3(py.x, py.y * cx - py.z * sx, py.y * sx + py.z * cx);
  float depth = 1.55 + (pr.z + 1.0) * .38;
  gl_Position = vec4(pr.xy / depth, pr.z * .3, 1.0);
  gl_PointSize = max(1.2, details.x * pixelRatio / depth * mix(2.2, 1.0, sceneMorph));
  float core = 1.0 - smoothstep(.04, .55, length(sphere.xy));
  light = (details.y + core * (1.0 - sceneMorph) * 1.35) * (1.2 - depth * .15);
  renderMode = mode;
}`;

const FRAGMENT_SHADER = `
precision mediump float; varying float light; varying float renderMode;
void main() {
  vec3 color = vec3(.22, .82, .98);
  if (renderMode > .5) { gl_FragColor = vec4(color, light); return; }
  float radius = length(gl_PointCoord - vec2(.5));
  float alpha = max(.04, smoothstep(.65, .05, radius)) * light;
  gl_FragColor = vec4(color, alpha);
}`;
