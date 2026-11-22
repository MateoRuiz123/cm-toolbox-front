export interface VolumetricWordOptions {
  readonly reducedMotion?: boolean;
}

export interface VolumetricWordController {
  readonly isWebGL2Supported: boolean;
  readonly cleanup: () => void;
}

const VERTEX_SHADER_SOURCE = `#version 300 es
precision highp float;

out vec2 vUv;

void main() {
  float x = (gl_VertexID & 1) == 1 ? 3.0 : -1.0;
  float y = (gl_VertexID & 2) == 2 ? 3.0 : -1.0;
  vUv = vec2(x * 0.5 + 0.5, y * 0.5 + 0.5);
  gl_Position = vec4(x, y, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision highp float;

uniform sampler2D uMask;
uniform sampler2D uNoise;
uniform vec2 uRes;
uniform float uAspect;
uniform vec2 uLight;
uniform float uTime;
uniform float uReveal;

in vec2 vUv;
out vec4 fragColor;

float hashNoise(vec2 uv) {
  return texture(uNoise, uv * (uRes / 64.0)).r;
}

void main() {
  vec2 uv = clamp(vUv, 0.001, 0.999);
  vec2 pt = vec2((uv.x - 0.5) * uAspect, uv.y - 0.5);

  vec4 maskSample = texture(uMask, uv);
  float sharp = maskSample.r;
  float halo = maskSample.b;

  vec2 eps = vec2(1.5 / max(uRes.x, 1.0), 1.5 / max(uRes.y, 1.0));
  float gradX = texture(uMask, uv + vec2(eps.x, 0.0)).g - texture(uMask, uv - vec2(eps.x, 0.0)).g;
  float gradY = texture(uMask, uv + vec2(0.0, eps.y)).g - texture(uMask, uv - vec2(0.0, eps.y)).g;
  vec2 edgeNormal = vec2(-gradX, -gradY);

  vec2 toLight = uLight - pt;
  float distToLight = length(toLight);
  vec2 lightDir = distToLight > 0.0001 ? toLight / distToLight : vec2(0.0, 1.0);
  float edgeFacing = max(dot(edgeNormal, lightDir) * 32.0, 0.0);

  float jitter = hashNoise(uv + fract(uTime * 0.137));

  vec3 accumRays = vec3(0.0);
  const int STEPS = 36;
  const float BAR_SPAN = 0.28;

  for (int t = 0; t < 5; t++) {
    float ft = (float(t) - 2.0) * 0.25;
    float tapWeight = max(1.0 - abs(ft) * 1.2, 0.0);
    vec2 lightTap = uLight + vec2(0.0, ft * BAR_SPAN);

    vec2 tapVec = lightTap - pt;
    float r = max(length(tapVec) - 0.03, 0.0);
    float falloff = exp(-r * 1.8) / (1.0 + r * r * 24.0);

    float thickness = 0.0;
    for (int s = 0; s < STEPS; s++) {
      float frac = (float(s) + jitter) / float(STEPS);
      vec2 samplePt = mix(pt, lightTap, frac * 0.92);
      vec2 sampleUv = vec2(samplePt.x / uAspect + 0.5, samplePt.y + 0.5);
      if (sampleUv.x >= 0.0 && sampleUv.x <= 1.0 && sampleUv.y >= 0.0 && sampleUv.y <= 1.0) {
        thickness += texture(uMask, sampleUv).g / float(STEPS);
      }
    }

    float transm = exp(-thickness * 26.0);
    vec3 beamColor = mix(vec3(1.0, 0.94, 0.85), vec3(0.92, 0.365, 0.17), clamp(r * 1.15, 0.0, 1.0));
    accumRays += beamColor * falloff * transm * tapWeight * 0.26;
  }

  float rMain = max(distToLight - 0.03, 0.0);
  float mainFalloff = exp(-rMain * 1.8) / (1.0 + rMain * rMain * 24.0);
  vec3 warmPalette = mix(vec3(1.0, 0.95, 0.86), vec3(0.92, 0.365, 0.17), clamp(rMain * 1.05, 0.0, 1.0));

  vec3 bgDark = vec3(0.008, 0.009, 0.012);
  vec3 slabDark = vec3(0.025, 0.024, 0.028);

  vec3 color = bgDark;
  color += accumRays * (1.0 - sharp * 0.85) * 1.45;
  color += warmPalette * halo * mainFalloff * 0.55;
  color += vec3(0.0, 0.18, 0.42) * halo * 0.09;

  vec3 letterRim = warmPalette * edgeFacing * (0.28 + mainFalloff * 0.95);
  vec3 letterSurface = slabDark + warmPalette * mainFalloff * 0.22 + letterRim;
  color = mix(color, letterSurface, sharp);

  float localGlow = exp(-distToLight * 4.5) * 0.22;
  color += vec3(1.0, 0.9, 0.76) * localGlow * (1.0 - sharp * 0.72);

  float vig = smoothstep(1.38, 0.28, length((uv - 0.5) * vec2(uAspect, 1.0)));
  color *= mix(0.62, 1.0, vig);

  color *= uReveal;
  color = color / (1.0 + color * 0.8);
  color = pow(max(color, 0.0), vec3(1.0 / 2.2));

  float grain = (hashNoise(uv * 1.7 + vec2(fract(uTime * 0.31), fract(uTime * 0.19))) - 0.5) * 0.028;
  color = clamp(color + grain, 0.0, 1.0);

  fragColor = vec4(color, 1.0);
}
`;

const createBlueNoiseBytes = (): Uint8Array => {
  const size = 64;
  const bytes = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Interleaved Gradient Noise determinista para jitter suave sin archivo externo
      const ign =
        (52.9829189 * ((0.06711056 * x + 0.00583715 * y) % 1)) % 1;
      const value = Math.max(0, Math.min(255, Math.round(ign * 255)));
      const idx = (y * size + x) * 4;
      bytes[idx] = value;
      bytes[idx + 1] = value;
      bytes[idx + 2] = value;
      bytes[idx + 3] = 255;
    }
  }
  return bytes;
};

const drawBlurredChannel = (
  width: number,
  height: number,
  word: string,
  font: string,
  verticalOffset: number,
  blurPx: number,
): HTMLCanvasElement => {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d");
  if (!ctx) return c;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (blurPx > 0 && "filter" in ctx) {
    ctx.filter = `blur(${blurPx.toFixed(1)}px)`;
  }
  ctx.fillText(word, width * 0.5, height * 0.5 + verticalOffset);
  ctx.filter = "none";
  return c;
};

const createWordMaskCanvas = (
  width: number,
  height: number,
  word: string,
): HTMLCanvasElement => {
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = Math.max(1, Math.floor(width));
  maskCanvas.height = Math.max(1, Math.floor(height));
  const ctx = maskCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return maskCanvas;

  let fontSize = Math.min(height * 0.28, width * 0.15);
  const weight = "700";
  const family =
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.font = `${weight} ${fontSize}px ${family}`;

  const measured = ctx.measureText(word).width;
  const maxAllowedWidth = width * 0.86;
  if (measured > maxAllowedWidth && measured > 0) {
    fontSize = fontSize * (maxAllowedWidth / measured);
  }
  fontSize = Math.max(20, fontSize);

  const font = `${weight} ${fontSize}px ${family}`;
  const verticalOffset = fontSize * 0.04;

  const sharpCanvas = drawBlurredChannel(
    maskCanvas.width,
    maskCanvas.height,
    word,
    font,
    verticalOffset,
    0,
  );
  const midBlurCanvas = drawBlurredChannel(
    maskCanvas.width,
    maskCanvas.height,
    word,
    font,
    verticalOffset,
    Math.max(1.5, height * 0.006),
  );
  const haloBlurCanvas = drawBlurredChannel(
    maskCanvas.width,
    maskCanvas.height,
    word,
    font,
    verticalOffset,
    Math.max(5, height * 0.03),
  );

  const sData = sharpCanvas
    .getContext("2d")
    ?.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data;
  const mData = midBlurCanvas
    .getContext("2d")
    ?.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data;
  const hData = haloBlurCanvas
    .getContext("2d")
    ?.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data;

  const out = ctx.createImageData(maskCanvas.width, maskCanvas.height);
  const pixels = maskCanvas.width * maskCanvas.height;
  for (let i = 0; i < pixels; i++) {
    const idx = i * 4;
    out.data[idx] = sData ? sData[idx + 3] : 0;
    out.data[idx + 1] = mData ? mData[idx + 3] : 0;
    out.data[idx + 2] = hData ? hData[idx + 3] : 0;
    out.data[idx + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
  return maskCanvas;
};

const compileShader = (
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader | null => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
};

/**
 * Inicializa el shader WebGL2 de luz volumétrica interactiva para la pantalla de bienvenida.
 */
export const startVolumetricWord = (
  canvas: HTMLCanvasElement,
  word: string,
  options: VolumetricWordOptions = {},
): VolumetricWordController => {
  const gl = canvas.getContext("webgl2", {
    antialias: false,
    premultipliedAlpha: false,
    alpha: false,
    powerPreference: "high-performance",
  });

  if (!gl) {
    return {
      isWebGL2Supported: false,
      cleanup: () => undefined,
    };
  }

  const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
  if (!vs || !fs) {
    if (vs) gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
    return {
      isWebGL2Supported: false,
      cleanup: () => undefined,
    };
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return {
      isWebGL2Supported: false,
      cleanup: () => undefined,
    };
  }

  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return {
      isWebGL2Supported: false,
      cleanup: () => undefined,
    };
  }

  const vao = gl.createVertexArray();
  const noiseTex = gl.createTexture();
  const maskTex = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_2D, noiseTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    64,
    64,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    createBlueNoiseBytes(),
  );

  gl.bindTexture(gl.TEXTURE_2D, maskTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const uMask = gl.getUniformLocation(program, "uMask");
  const uNoise = gl.getUniformLocation(program, "uNoise");
  const uRes = gl.getUniformLocation(program, "uRes");
  const uAspect = gl.getUniformLocation(program, "uAspect");
  const uLight = gl.getUniformLocation(program, "uLight");
  const uTime = gl.getUniformLocation(program, "uTime");
  const uReveal = gl.getUniformLocation(program, "uReveal");

  let viewWidth = 1;
  let viewHeight = 1;
  let aspect = 1;

  const rebuildMaskAndViewport = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    const cssWidth = Math.max(1, rect.width || window.innerWidth || 800);
    const cssHeight = Math.max(1, rect.height || window.innerHeight || 600);
    viewWidth = Math.max(1, Math.round(cssWidth * dpr));
    viewHeight = Math.max(1, Math.round(cssHeight * dpr));
    aspect = viewWidth / viewHeight;

    canvas.width = viewWidth;
    canvas.height = viewHeight;
    gl.viewport(0, 0, viewWidth, viewHeight);

    const maskCanvas = createWordMaskCanvas(viewWidth, viewHeight, word);
    gl.bindTexture(gl.TEXTURE_2D, maskTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maskCanvas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  };

  rebuildMaskAndViewport();

  const reduced = Boolean(options.reducedMotion);
  const startTime = performance.now();
  let lastFrame = startTime;
  let lastInteractionAt = startTime - 5000;
  let currentX = 0.06;
  let currentY = 0.16;
  let targetX = 0.06;
  let targetY = 0.16;
  let rafId = 0;
  let disposed = false;

  const updatePointerTarget = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width || 1);
    const height = Math.max(1, rect.height || 1);
    const xNorm = (clientX - rect.left) / width;
    const yNorm = (clientY - rect.top) / height;
    targetX = (xNorm - 0.5) * aspect;
    targetY = 0.5 - yNorm;
    lastInteractionAt = performance.now();
  };

  const handlePointerMove = (event: PointerEvent) => {
    updatePointerTarget(event.clientX, event.clientY);
  };

  const handlePointerDown = (event: PointerEvent) => {
    updatePointerTarget(event.clientX, event.clientY);
  };

  const handleTouchMove = (event: TouchEvent) => {
    const first = event.touches[0];
    if (first) {
      updatePointerTarget(first.clientX, first.clientY);
    }
  };

  const handleResize = () => {
    rebuildMaskAndViewport();
  };

  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerdown", handlePointerDown);
  window.addEventListener("touchmove", handleTouchMove, { passive: true });
  window.addEventListener("resize", handleResize);

  const renderFrame = (now: number) => {
    if (disposed) return;

    const elapsed = (now - startTime) * 0.001;
    const dt = Math.min(Math.max((now - lastFrame) * 0.001, 0), 0.05);
    lastFrame = now;

    let goalX = targetX;
    let goalY = targetY;
    if (!reduced) {
      const idleSec = (now - lastInteractionAt) * 0.001;
      if (idleSec > 4) {
        const blend = Math.min((idleSec - 4) / 6, 1);
        goalX += Math.sin(elapsed * 0.23) * 0.22 * blend;
        goalY += Math.sin(elapsed * 0.17 + 1.3) * 0.12 * blend;
      }
    }

    const damping = reduced ? 30 : 3.2;
    const alpha = 1 - Math.exp(-damping * dt);
    currentX += (goalX - currentX) * alpha;
    currentY += (goalY - currentY) * alpha;

    const reveal = reduced ? 1 : Math.pow(Math.min(elapsed / 1.6, 1), 2);

    gl.useProgram(program);
    gl.bindVertexArray(vao);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, maskTex);
    gl.uniform1i(uMask, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, noiseTex);
    gl.uniform1i(uNoise, 1);

    gl.uniform2f(uRes, viewWidth, viewHeight);
    gl.uniform1f(uAspect, aspect);
    gl.uniform2f(uLight, currentX, currentY);
    gl.uniform1f(uTime, elapsed);
    gl.uniform1f(uReveal, reveal);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    rafId = window.requestAnimationFrame(renderFrame);
  };

  rafId = window.requestAnimationFrame(renderFrame);

  return {
    isWebGL2Supported: true,
    cleanup: () => {
      if (disposed) return;
      disposed = true;
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("resize", handleResize);
      gl.deleteTexture(maskTex);
      gl.deleteTexture(noiseTex);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
};
