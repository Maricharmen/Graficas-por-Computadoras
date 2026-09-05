// 1. Obtener contexto WebGL2
const canvas = document.querySelector('#glCanvas');
const gl = canvas.getContext('webgl2');

if (!gl) {
  alert('WebGL2 no está disponible');
}

// 2. Shaders GLSL ES 3.00 (WebGL2)
const vertexShaderSource = `#version 300 es
layout(location = 0) in vec2 aPosition;
layout(location = 1) in vec3 aColor;
out vec3 vColor;
void main() {
    vColor = aColor;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const fragmentShaderSource = `#version 300 es
precision mediump float;
in vec3 vColor;
out vec4 fragColor;
void main() {
    fragColor = vec4(vColor, 1.0);
}`;

function createShader(gl, type, source) {
  const s = gl.createShader(type);
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

const program = gl.createProgram();
gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vertexShaderSource));
gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource));
gl.linkProgram(program);
gl.useProgram(program);

// 3. Paleta cromática 
const vitralPalette = [
  [0.85, 0.20, 0.25], // Rubí
  [0.12, 0.50, 0.90], // Azul Cobalto
  [0.98, 0.72, 0.05], // Dorado
  [0.10, 0.75, 0.55], // Esmeralda
  [0.60, 0.20, 0.80], // Amatista
  [0.95, 0.42, 0.12], // Mandarina
  [0.20, 0.82, 0.40], // Jade
  [0.92, 0.18, 0.60], // Magenta
  [0.15, 0.75, 0.88], // Celeste
  [0.95, 0.55, 0.70], // Rosa Cuarzo
  [0.32, 0.35, 0.85], // Zafiro
  [0.82, 0.88, 0.18]  // Lima
];

let colorIdx = 0;
const vertexData = [];

// Agrega un triángulo 
function addTriangle(p1, p2, p3) {
  const c = vitralPalette[colorIdx % vitralPalette.length];
  colorIdx++;
  vertexData.push(
    p1[0], p1[1], c[0], c[1], c[2],
    p2[0], p2[1], c[0], c[1], c[2],
    p3[0], p3[1], c[0], c[1], c[2]
  );
}

// Agrega un cuadrilátero dividiéndolo en 2 triángulos
function addQuad(p1, p2, p3, p4) {
  addTriangle(p1, p2, p3);
  addTriangle(p1, p3, p4);
}

// Genera un abanico curvo concéntrico que empalma con barras horizontales
function buildSemicircle(cx, cy, rOut, rIn, segments) {
  const startAngle = Math.PI / 2;
  const endAngle = -Math.PI / 2;
  const step = (endAngle - startAngle) / segments;

  for (let i = 0; i < segments; i++) {
    const a1 = startAngle + i * step;
    const a2 = startAngle + (i + 1) * step;

    const pOut1 = [cx + rOut * Math.cos(a1), cy + rOut * Math.sin(a1)];
    const pIn1  = [cx + rIn  * Math.cos(a1), cy + rIn  * Math.sin(a1)];
    const pOut2 = [cx + rOut * Math.cos(a2), cy + rOut * Math.sin(a2)];
    const pIn2  = [cx + rIn  * Math.cos(a2), cy + rIn  * Math.sin(a2)];

    addQuad(pOut1, pOut2, pIn2, pIn1);
  }
}

// ==========================================
// PARÁMETROS GLOBALES DE TIPOGRAFÍA
// ==========================================
const Y_TOP = 0.65;
const Y_BOT = -0.65;
const STEM = 0.085; // Grosor de los postes y trazos

// ==========================================
// 1. LETRA M 
// ==========================================
const mX1 = -0.88;
const mX2 = -0.34;
const mMidX = (mX1 + mX2) / 2;
const mDipY = -0.15;

// Postes verticales
addQuad([mX1, Y_BOT], [mX1 + STEM, Y_BOT], [mX1 + STEM, Y_TOP], [mX1, Y_TOP]);
addQuad([mX2 - STEM, Y_BOT], [mX2, Y_BOT], [mX2, Y_TOP], [mX2 - STEM, Y_TOP]);

// Diagonales con biselado interior
addQuad(
  [mX1 + STEM, Y_TOP],
  [mMidX, mDipY + 0.12],
  [mMidX, mDipY],
  [mX1 + STEM, Y_TOP - 0.14]
);
addQuad(
  [mMidX, mDipY],
  [mMidX, mDipY + 0.12],
  [mX2 - STEM, Y_TOP],
  [mX2 - STEM, Y_TOP - 0.14]
);

// ==========================================
// 2. LETRA B
// ==========================================
const bX = -0.22;
const bExtX = -0.07; // Punto de corte entre barras y curvas
const bMidY = 0.02;  // Altura exacta del travesaño medio

// 1. Poste vertical principal
addQuad([bX, Y_BOT], [bX + STEM, Y_BOT], [bX + STEM, Y_TOP], [bX, Y_TOP]);

// 2. Barras horizontales (Superior, Central, Inferior)
// Barra superior
addQuad([bX + STEM, Y_TOP], [bExtX, Y_TOP], [bExtX, Y_TOP - STEM], [bX + STEM, Y_TOP - STEM]);
// Travesaño medio (centrado con respecto a bMidY)
addQuad([bX + STEM, bMidY + STEM/2], [bExtX, bMidY + STEM/2], [bExtX, bMidY - STEM/2], [bX + STEM, bMidY - STEM/2]);
// Barra inferior
addQuad([bX + STEM, Y_BOT + STEM], [bExtX, Y_BOT + STEM], [bExtX, Y_BOT], [bX + STEM, Y_BOT]);

// 3. Lóbulo Superior (va exactamente desde Y_TOP hasta bMidY + STEM/2)
const bTopRout = (Y_TOP - (bMidY - STEM/2)) / 2;
const bTopRin  = bTopRout - STEM;
const bTopCy   = (Y_TOP + (bMidY - STEM/2)) / 2;
buildSemicircle(bExtX, bTopCy, bTopRout, bTopRin, 10);

// 4. Lóbulo Inferior (va exactamente desde bMidY + STEM/2 hasta Y_BOT)
const bBotRout = ((bMidY + STEM/2) - Y_BOT) / 2;
const bBotRin  = bBotRout - STEM;
const bBotCy   = ((bMidY + STEM/2) + Y_BOT) / 2;
buildSemicircle(bExtX, bBotCy, bBotRout, bBotRin, 10);

// ==========================================
// 3. LETRA P 
// ==========================================
const pX = 0.36;
const pMidY = 0.05;
const pExtX = 0.52; // Donde inician las curvas

// Poste vertical completo
addQuad([pX, Y_BOT], [pX + STEM, Y_BOT], [pX + STEM, Y_TOP], [pX, Y_TOP]);

// Barras horizontales superior e intermedia
addQuad([pX + STEM, Y_TOP], [pExtX, Y_TOP], [pExtX, Y_TOP - STEM], [pX + STEM, Y_TOP - STEM]);
addQuad([pX + STEM, pMidY + STEM], [pExtX, pMidY + STEM], [pExtX, pMidY], [pX + STEM, pMidY]);

// Cabeza redondeada semicircular (concéntrica y continua)
const pRout = (Y_TOP - pMidY) / 2;
const pRin  = pRout - STEM;
const pCy   = Y_TOP - pRout;
buildSemicircle(pExtX, pCy, pRout, pRin, 12);

// --- 4. ENVÍO DE BUFFERS A LA GPU ---
const floatArray = new Float32Array(vertexData);
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, floatArray, gl.STATIC_DRAW);

// Layout intercalado: 5 floats (X, Y, R, G, B) -> 20 bytes por vértice
const STRIDE = 5 * 4;
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, STRIDE, 0);

gl.enableVertexAttribArray(1);
gl.vertexAttribPointer(1, 3, gl.FLOAT, false, STRIDE, 2 * 4);

// --- 5. RENDERIZADO ---
gl.viewport(0, 0, canvas.width, canvas.height);
gl.clearColor(0.18, 0.18, 0.18, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

gl.drawArrays(gl.TRIANGLES, 0, vertexData.length / 5);