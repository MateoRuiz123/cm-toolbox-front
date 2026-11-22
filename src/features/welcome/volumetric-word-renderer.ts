export interface VolumetricWordOptions {
  readonly reducedMotion?: boolean;
  readonly anchorElement?: HTMLElement | null;
}

export interface VolumetricWordController {
  readonly isWebGL2Supported: boolean;
  readonly cleanup: () => void;
}

type RgbTuple = readonly [number, number, number];

interface ThemeShaderPalette {
  readonly bg: RgbTuple;
  readonly slab: RgbTuple;
  readonly primary: RgbTuple;
  readonly primaryDark: RgbTuple;
  readonly primaryLight: RgbTuple;
  readonly text: RgbTuple;
  readonly isDark: boolean;
}

const FALLBACK_PRIMARY: RgbTuple = [0, 102 / 255, 204 / 255];
const FALLBACK_PRIMARY_DARK: RgbTuple = [0, 82 / 255, 163 / 255];
const FALLBACK_PRIMARY_LIGHT_LIGHT: RgbTuple = [51 / 255, 133 / 255, 214 / 255];
const FALLBACK_PRIMARY_LIGHT_DARK: RgbTuple = [74 / 255, 148 / 255, 224 / 255];
const FALLBACK_BG_LIGHT: RgbTuple = [244 / 255, 243 / 255, 239 / 255];
const FALLBACK_SLAB_LIGHT: RgbTuple = [252 / 255, 251 / 255, 249 / 255];
const FALLBACK_TEXT_LIGHT: RgbTuple = [51 / 255, 51 / 255, 51 / 255];
const FALLBACK_BG_DARK: RgbTuple = [22 / 255, 24 / 255, 29 / 255];
const FALLBACK_SLAB_DARK: RgbTuple = [32 / 255, 35 / 255, 43 / 255];
const FALLBACK_TEXT_DARK: RgbTuple = [228 / 255, 231 / 255, 238 / 255];

/**
 * Convierte un color CSS en formato #rgb, #rrggbb o rgb(...) a RGB normalizado [0..1].
 */
export const parseCssColorToRgb01 = (
  raw: string,
  fallback: RgbTuple,
): RgbTuple => {
  const value = raw.trim();
  if (!value) return fallback;

  const hexMatch = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (hexMatch) {
    const hex = hexMatch[1];
    const fullHex =
      hex.length === 3
        ? `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
        : hex;
    const r = Number.parseInt(fullHex.slice(0, 2), 16) / 255;
    const g = Number.parseInt(fullHex.slice(2, 4), 16) / 255;
    const b = Number.parseInt(fullHex.slice(4, 6), 16) / 255;
    return [r, g, b];
  }

  const rgbMatch =
    /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(value);
  if (rgbMatch) {
    const clampByte = (n: string) =>
      Math.max(0, Math.min(255, Number.parseFloat(n))) / 255;
    return [
      clampByte(rgbMatch[1]),
      clampByte(rgbMatch[2]),
      clampByte(rgbMatch[3]),
    ];
  }

  return fallback;
};

const readThemeShaderPalette = (): ThemeShaderPalette => {
  const isDarkClass =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

  const styles =
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    typeof window.getComputedStyle === "function"
      ? window.getComputedStyle(document.documentElement)
      : null;

  const readToken = (name: string): string =>
    styles?.getPropertyValue(name).trim() ?? "";

  const bg = parseCssColorToRgb01(
    readToken("--surface-app"),
    isDarkClass ? FALLBACK_BG_DARK : FALLBACK_BG_LIGHT,
  );
  const slab = parseCssColorToRgb01(
    readToken("--surface-card"),
    isDarkClass ? FALLBACK_SLAB_DARK : FALLBACK_SLAB_LIGHT,
  );
  const primary = parseCssColorToRgb01(
    readToken("--azul-coordinadora"),
    FALLBACK_PRIMARY,
  );
  const primaryDark = parseCssColorToRgb01(
    readToken("--azul-dark"),
    FALLBACK_PRIMARY_DARK,
  );
  const primaryLight = parseCssColorToRgb01(
    isDarkClass
      ? readToken("--color-primary") || readToken("--azul-400")
      : readToken("--azul-light") || readToken("--azul-400"),
    isDarkClass ? FALLBACK_PRIMARY_LIGHT_DARK : FALLBACK_PRIMARY_LIGHT_LIGHT,
  );
  const text = parseCssColorToRgb01(
    readToken("--text-body"),
    isDarkClass ? FALLBACK_TEXT_DARK : FALLBACK_TEXT_LIGHT,
  );

  const luma = 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2];
  const isDark = isDarkClass || luma < 0.42;

  return { bg, slab, primary, primaryDark, primaryLight, text, isDark };
};

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

// Toda la paleta llega vía uniforms desde tokens SIGO en CSS.
// Los rayos, halo y brillo de borde usan exclusivamente rampa azul corporativo -> blanco azulado
// para garantizar R <= G <= B en todo píxel (cero tonos rosa, malva o violeta).
const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision highp float;

uniform sampler2D uMask;
uniform sampler2D uNoise;
uniform vec2 uRes;
uniform float uAspect;
uniform vec2 uLight;
uniform float uTime;
uniform float uReveal;
uniform vec3 uBgColor;
uniform vec3 uSlabColor;
uniform vec3 uPrimaryColor;
uniform vec3 uPrimaryDarkColor;
uniform vec3 uPrimaryLightColor;
uniform vec3 uTextColor;
uniform float uIsDark;
uniform vec2 uOoRange;

in vec2 vUv;
out vec4 fragColor;

float hashNoise(vec2 uv) {
  return texture(uNoise, uv * (uRes / 64.0)).r;
}

vec3 toLinear(vec3 srgb) {
  return pow(max(srgb, 0.0), vec3(2.2));
}

void main() {
  vec2 uv = clamp(vUv, 0.001, 0.999);
  vec2 pt = vec2((uv.x - 0.5) * uAspect, uv.y - 0.5);

  vec4 maskSample = texture(uMask, uv);
  float sharp = maskSample.r;
  float halo = maskSample.b;
  float ooMask = smoothstep(uOoRange.x - 0.003, uOoRange.x + 0.003, uv.x) *
    (1.0 - smoothstep(uOoRange.y - 0.003, uOoRange.y + 0.003, uv.x));

  vec2 eps = vec2(1.5 / max(uRes.x, 1.0), 1.5 / max(uRes.y, 1.0));
  float gradX = texture(uMask, uv + vec2(eps.x, 0.0)).g - texture(uMask, uv - vec2(eps.x, 0.0)).g;
  float gradY = texture(uMask, uv + vec2(0.0, eps.y)).g - texture(uMask, uv - vec2(0.0, eps.y)).g;
  vec2 edgeNormal = vec2(-gradX, -gradY);

  vec2 toLight = uLight - pt;
  float distToLight = length(toLight);
  vec2 lightDir = distToLight > 0.0001 ? toLight / distToLight : vec2(0.0, 1.0);
  float edgeFacing = max(dot(edgeNormal, lightDir) * 32.0, 0.0);

  vec3 bgLin = toLinear(uBgColor);
  vec3 slabLin = toLinear(uSlabColor);
  vec3 primaryLin = toLinear(uPrimaryColor);
  vec3 primaryDarkLin = toLinear(uPrimaryDarkColor);
  vec3 primaryLightLin = toLinear(uPrimaryLightColor);
  vec3 textLin = toLinear(uTextColor);

  vec3 coolWhiteLin = uIsDark > 0.5
    ? mix(primaryLightLin, textLin, 0.85)
    : mix(primaryLightLin, slabLin, 0.88);

  float jitter = hashNoise(uv + fract(uTime * 0.137));

  vec3 accumRays = vec3(0.0);
  float accumShadow = 0.0;
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
    float rayEnergy = falloff * transm * tapWeight * 0.26;
    float rayBlocked = falloff * (1.0 - transm) * tapWeight * 0.26;

    float coreMix = smoothstep(0.45, 0.95, 1.0 - r * 1.15);
    vec3 beamColor = mix(primaryLin * 1.25, mix(primaryLightLin, coolWhiteLin, 0.7), coreMix);
    accumRays += beamColor * rayEnergy;
    accumShadow += rayBlocked;
  }

  float rMain = max(distToLight - 0.03, 0.0);
  float mainFalloff = exp(-rMain * 1.8) / (1.0 + rMain * rMain * 24.0);
  float vig = smoothstep(1.38, 0.28, length((uv - 0.5) * vec2(uAspect, 1.0)));
  float coreProx = smoothstep(0.55, 0.96, 1.0 - rMain * 0.9);
  vec3 color;

  if (uIsDark > 0.5) {
    // Fondo oscuro con sutil matiz azul corporativo
    vec3 baseDark = mix(bgLin, primaryDarkLin * 0.14, 0.35);

    vec3 bgColor = baseDark;
    bgColor += accumRays * 1.45;
    bgColor += primaryLin * halo * (0.22 + mainFalloff * 0.32);
    float localGlow = exp(-distToLight * 5.2) * 0.10;
    bgColor += mix(primaryLin, primaryLightLin, 0.65) * localGlow;

    // La viñeta aplica solo al fondo para no lavar ni oscurecer los extremos de COORDINADORA
    bgColor = mix(bgLin, bgColor, mix(0.55, 1.0, vig));

    // Relleno de letras con azul corporativo luminoso (>5:1 frente a baseDark) en toda la palabra
    vec3 letterFillDark = mix(primaryLightLin, textLin, 0.32);
    vec3 rimTint = mix(primaryLightLin * 1.25, coolWhiteLin, 0.55 + coreProx * 0.35);
    vec3 letterRim = rimTint * edgeFacing * (0.28 + mainFalloff * 0.72);
    vec3 letterSurface = letterFillDark + primaryLightLin * mainFalloff * 0.16 + letterRim;

    color = mix(bgColor, letterSurface, sharp);
    color = mix(bgLin, color, uReveal);
    color = color / (1.0 + max(color - 1.0, 0.0) * 0.7);
  } else {
    // Modo claro SIGO (--surface-app):
    // 1. Abanico de rayos volumétricos azules (accumRays) que contrastan con los conos de sombra marfil (accumShadow)
    // 2. Letras fieles al logo Coordinadora (C y RDINADORA en negro sólido, OO en azul corporativo)
    // 3. Reflejo azul brillante acotado con mix() para que el bisel iluminado nunca se vuelva blanco ni se pierda contra el fondo claro
    // Degradado radial continuo (sin meseta por clamp) que se difumina suavemente hacia --surface-app
    float rawRay = length(accumRays);
    float rayGrad = 1.0 - exp(-rawRay * 1.35);
    float shadowSoft = 1.0 - exp(-accumShadow * 1.6);
    float softAura = exp(-distToLight * 1.55) * (1.0 - shadowSoft * 0.68);
    float lightField = clamp(rayGrad * 0.68 + softAura * 0.36 + halo * 0.16, 0.0, 1.0);
    lightField = pow(lightField, 1.15);

    vec3 blueBeamColor = mix(bgLin, mix(primaryLin, primaryLightLin, 0.42), 0.46);
    vec3 bgColor = mix(bgLin, blueBeamColor, lightField);

    // Viñeta inversa suave en la atmósfera para fundir bordes con --surface-app
    bgColor = mix(bgLin, bgColor, mix(0.45, 1.0, vig));

    // Cuerpo base fiel al logo Coordinadora: C y RDINADORA en negro sólido, OO en azul corporativo vibrante
    vec3 inkBody = textLin * 0.025;
    vec3 blueLogoBody = mix(primaryDarkLin, primaryLin, 0.82);

    // Reflejo 3D en biseles al mover el cursor: mantiene el relleno negro puro en C/RDINADORA y azul en OO
    float bevelLight = clamp(edgeFacing * (0.55 + mainFalloff * 1.95), 0.0, 1.0);
    float cursorSpec = exp(-distToLight * 6.0);

    vec3 inkHighlightColor = mix(primaryLin * 1.25, primaryLightLin * 1.35, 0.55);
    vec3 blueHighlightColor = mix(primaryLightLin * 1.35, coolWhiteLin, 0.48);

    vec3 inkReflected = mix(inkBody, inkHighlightColor, clamp(bevelLight * 0.92 + cursorSpec * 0.22, 0.0, 0.94));
    vec3 blueReflected = mix(blueLogoBody, blueHighlightColor, clamp(bevelLight * 0.88 + cursorSpec * 0.45, 0.0, 0.92));
    vec3 letterSurface = mix(inkReflected, blueReflected, ooMask);

    color = mix(bgColor, letterSurface, sharp);
    color = mix(bgLin, color, uReveal);
    color = color / (1.0 + max(color - 1.0, 0.0));
  }

  color = pow(max(color, 0.0), vec3(1.0 / 2.2));
  float grain = (hashNoise(uv * 1.7 + vec2(fract(uTime * 0.31), fract(uTime * 0.19))) - 0.5) * 0.012;
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
  centerY: number,
  blurPx: number,
): HTMLCanvasElement => {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d");
  if (!ctx) return c;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "white";
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (blurPx > 0 && "filter" in ctx) {
    ctx.filter = `blur(${blurPx.toFixed(1)}px)`;
  }
  ctx.fillText(word, width * 0.5, centerY);
  ctx.filter = "none";
  return c;
};

const createWordMaskCanvas = (
  width: number,
  height: number,
  word: string,
  centerYRatio: number,
  anchorHeightPx: number,
): {
  readonly maskCanvas: HTMLCanvasElement;
  readonly ooStartUvX: number;
  readonly ooEndUvX: number;
} => {
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = Math.max(1, Math.floor(width));
  maskCanvas.height = Math.max(1, Math.floor(height));
  const ctx = maskCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return { maskCanvas, ooStartUvX: 0.2, ooEndUvX: 0.36 };
  }

  const anchorCap =
    anchorHeightPx > 0 ? anchorHeightPx * 0.85 : height * 0.24;
  let fontSize = Math.min(anchorCap, width * 0.14);
  const weight = "700";
  const family =
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.font = `${weight} ${fontSize}px ${family}`;

  const measured = ctx.measureText(word).width;
  const maxAllowedWidth = width * 0.84;
  if (measured > maxAllowedWidth && measured > 0) {
    fontSize = fontSize * (maxAllowedWidth / measured);
  }
  fontSize = Math.max(20, fontSize);

  const font = `${weight} ${fontSize}px ${family}`;
  ctx.font = font;
  const centerY = maskCanvas.height * centerYRatio + fontSize * 0.04;

  // Rango horizontal UV [0..1] de las letras "OO" en "COORDINADORA" para aplicar el azul del logotipo oficial
  const fullWordWidth = ctx.measureText(word).width;
  const wordLeftX = maskCanvas.width * 0.5 - fullWordWidth * 0.5;
  const wordRightX = maskCanvas.width * 0.5 + fullWordWidth * 0.5;
  const cEndLeft = wordLeftX + ctx.measureText(word.slice(0, 1)).width;
  const oStartRight = wordRightX - ctx.measureText(word.slice(1)).width;
  const ooStartX = (cEndLeft + oStartRight) * 0.5;

  const cooEndLeft = wordLeftX + ctx.measureText(word.slice(0, 3)).width;
  const rStartRight = wordRightX - ctx.measureText(word.slice(3)).width;
  const ooEndX = (cooEndLeft + rStartRight) * 0.5;

  const ooStartUvX = Math.max(0, Math.min(1, ooStartX / maskCanvas.width));
  const ooEndUvX = Math.max(0, Math.min(1, ooEndX / maskCanvas.width));

  const sharpCanvas = drawBlurredChannel(
    maskCanvas.width,
    maskCanvas.height,
    word,
    font,
    centerY,
    0,
  );
  const midBlurCanvas = drawBlurredChannel(
    maskCanvas.width,
    maskCanvas.height,
    word,
    font,
    centerY,
    Math.max(1.5, height * 0.006),
  );
  const haloBlurCanvas = drawBlurredChannel(
    maskCanvas.width,
    maskCanvas.height,
    word,
    font,
    centerY,
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
  return { maskCanvas, ooStartUvX, ooEndUvX };
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

const REVEAL_DURATION_SEC = 1.25;
const POINTER_SETTLE_EPSILON = 0.0012;

/**
 * Inicializa el shader WebGL2 de luz volumétrica corporativa SIGO para la pantalla de bienvenida.
 * Optimizado: powerPreference "default", DPR acotado (1.0 en móvil, ≤1.25 en desktop),
 * pausa en segundo plano/fuera de viewport, sin tonos rosa/malva y con contraste ≥ 3:1 en claro/oscuro.
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
    powerPreference: "default",
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
  const uBgColor = gl.getUniformLocation(program, "uBgColor");
  const uSlabColor = gl.getUniformLocation(program, "uSlabColor");
  const uPrimaryColor = gl.getUniformLocation(program, "uPrimaryColor");
  const uPrimaryDarkColor = gl.getUniformLocation(program, "uPrimaryDarkColor");
  const uPrimaryLightColor = gl.getUniformLocation(
    program,
    "uPrimaryLightColor",
  );
  const uTextColor = gl.getUniformLocation(program, "uTextColor");
  const uIsDark = gl.getUniformLocation(program, "uIsDark");
  const uOoRange = gl.getUniformLocation(program, "uOoRange");

  let viewWidth = 1;
  let viewHeight = 1;
  let aspect = 1;
  let centerYRatio = 0.5;
  let ooStartUv = 0.2;
  let ooEndUv = 0.36;
  let palette = readThemeShaderPalette();
  const anchorEl = options.anchorElement ?? null;

  const rebuildMaskAndViewport = () => {
    const rect = canvas.getBoundingClientRect();
    const cssWidth = Math.max(1, rect.width || window.innerWidth || 800);
    const cssHeight = Math.max(1, rect.height || window.innerHeight || 600);
    const maxDpr = cssWidth < 768 ? 1.0 : 1.25;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    viewWidth = Math.max(1, Math.round(cssWidth * dpr));
    viewHeight = Math.max(1, Math.round(cssHeight * dpr));
    aspect = viewWidth / viewHeight;

    let anchorHeightPx = 0;
    if (anchorEl && rect.height > 0) {
      const anchorRect = anchorEl.getBoundingClientRect();
      if (anchorRect.height > 0) {
        const anchorCenterCssY =
          anchorRect.top - rect.top + anchorRect.height * 0.5;
        centerYRatio = Math.max(
          0.22,
          Math.min(0.78, anchorCenterCssY / cssHeight),
        );
        anchorHeightPx = anchorRect.height * dpr;
      }
    } else {
      centerYRatio = 0.5;
    }

    canvas.width = viewWidth;
    canvas.height = viewHeight;
    gl.viewport(0, 0, viewWidth, viewHeight);

    const { maskCanvas, ooStartUvX, ooEndUvX } = createWordMaskCanvas(
      viewWidth,
      viewHeight,
      word,
      centerYRatio,
      anchorHeightPx,
    );
    ooStartUv = ooStartUvX;
    ooEndUv = ooEndUvX;
    gl.bindTexture(gl.TEXTURE_2D, maskTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maskCanvas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  };

  rebuildMaskAndViewport();

  const reduced = Boolean(options.reducedMotion);
  const startTime = performance.now();
  let lastFrame = startTime;
  const initialLightY = 0.5 - centerYRatio + 0.04;
  let currentX = 0.08;
  let currentY = initialLightY;
  let targetX = 0.08;
  let targetY = initialLightY;
  let rafId = 0;
  let disposed = false;
  let isDocumentHidden =
    typeof document !== "undefined" ? Boolean(document.hidden) : false;
  let isIntersecting = true;

  const drawFrameAt = (now: number, revealOverride?: number) => {
    const elapsed = (now - startTime) * 0.001;
    const dt = Math.min(Math.max((now - lastFrame) * 0.001, 0), 0.05);
    lastFrame = now;

    if (reduced) {
      currentX = targetX;
      currentY = targetY;
    } else {
      const alpha = 1 - Math.exp(-5.0 * dt);
      currentX += (targetX - currentX) * alpha;
      currentY += (targetY - currentY) * alpha;
    }

    const reveal =
      revealOverride ??
      (reduced ? 1 : Math.pow(Math.min(elapsed / REVEAL_DURATION_SEC, 1), 2));

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
    gl.uniform3f(uBgColor, palette.bg[0], palette.bg[1], palette.bg[2]);
    gl.uniform3f(uSlabColor, palette.slab[0], palette.slab[1], palette.slab[2]);
    gl.uniform3f(
      uPrimaryColor,
      palette.primary[0],
      palette.primary[1],
      palette.primary[2],
    );
    gl.uniform3f(
      uPrimaryDarkColor,
      palette.primaryDark[0],
      palette.primaryDark[1],
      palette.primaryDark[2],
    );
    gl.uniform3f(
      uPrimaryLightColor,
      palette.primaryLight[0],
      palette.primaryLight[1],
      palette.primaryLight[2],
    );
    gl.uniform3f(uTextColor, palette.text[0], palette.text[1], palette.text[2]);
    gl.uniform1f(uIsDark, palette.isDark ? 1 : 0);
    gl.uniform2f(uOoRange, ooStartUv, ooEndUv);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return reveal;
  };

  const pauseRaf = () => {
    if (rafId !== 0) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
  };

  const renderFrame = (now: number) => {
    rafId = 0;
    if (disposed || isDocumentHidden || !isIntersecting) return;

    const reveal = drawFrameAt(now);
    const settled =
      reveal >= 1 &&
      Math.hypot(targetX - currentX, targetY - currentY) < POINTER_SETTLE_EPSILON;

    if (!reduced && !settled) {
      rafId = window.requestAnimationFrame(renderFrame);
    }
  };

  const scheduleRender = () => {
    if (disposed || isDocumentHidden || !isIntersecting) return;
    if (reduced) {
      drawFrameAt(performance.now(), 1);
      return;
    }
    if (rafId === 0) {
      lastFrame = performance.now();
      rafId = window.requestAnimationFrame(renderFrame);
    }
  };

  const updatePointerTarget = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width || 1);
    const height = Math.max(1, rect.height || 1);
    const xNorm = (clientX - rect.left) / width;
    const yNorm = (clientY - rect.top) / height;
    targetX = (xNorm - 0.5) * aspect;
    targetY = 0.5 - yNorm;
    scheduleRender();
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
    scheduleRender();
  };

  const handleVisibilityChange = () => {
    isDocumentHidden = Boolean(document.hidden);
    if (isDocumentHidden) {
      pauseRaf();
    } else {
      scheduleRender();
    }
  };

  if (!reduced) {
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
  }
  window.addEventListener("resize", handleResize);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  const resizeObserver =
    anchorEl && typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          rebuildMaskAndViewport();
          scheduleRender();
        })
      : null;
  if (anchorEl) {
    resizeObserver?.observe(anchorEl);
  }

  const intersectionObserver =
    typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            if (!entry) return;
            isIntersecting = entry.isIntersecting;
            if (!isIntersecting) {
              pauseRaf();
            } else {
              scheduleRender();
            }
          },
          { threshold: 0.01 },
        )
      : null;
  intersectionObserver?.observe(canvas);

  const themeObserver =
    typeof MutationObserver !== "undefined"
      ? new MutationObserver(() => {
          palette = readThemeShaderPalette();
          scheduleRender();
        })
      : null;
  themeObserver?.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-descanso"],
  });

  if (reduced) {
    if (!isDocumentHidden && isIntersecting) {
      drawFrameAt(startTime, 1);
    }
  } else {
    scheduleRender();
  }

  return {
    isWebGL2Supported: true,
    cleanup: () => {
      if (disposed) return;
      disposed = true;
      pauseRaf();
      if (!reduced) {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerdown", handlePointerDown);
        window.removeEventListener("touchmove", handleTouchMove);
      }
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      themeObserver?.disconnect();
      gl.deleteTexture(maskTex);
      gl.deleteTexture(noiseTex);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
};
