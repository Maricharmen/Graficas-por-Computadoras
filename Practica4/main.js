const canvas = document.querySelector('#glCanvas');
const gl = canvas.getContext('webgl2');

const vertexShaderSource = `#version 300 es
layout(location = 0) in vec2 aPosition;
void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const fragmentShaderSource = `#version 300 es
precision mediump float;
out vec4 fragColor;
void main() {
    // Azul similar al de la diapositiva
    fragColor = vec4(0.25, 0.45, 0.85, 1.0);
}`;

function createShader(gl, type, source) {
  const s = gl.createShader(type);
  gl.shaderSource(s, source);
  gl.compileShader(s);
  return s;
}

const program = gl.createProgram();
gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vertexShaderSource));
gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource));
gl.linkProgram(program);
gl.useProgram(program);

// --- CÁLCULO DE VÉRTICES DE LA ESTRELLA ---
const numPoints = 5;
const outerRadius = 0.8;
const innerRadius = 0.35;
const vertexList = [0.0, 0.0]; // Vértice 0: Centro

// Generamos los 10 puntos del contorno alternando radios
for (let i = 0; i < 10; i++) {
  const radius = (i % 2 === 0) ? outerRadius : innerRadius;
  // Ángulo en radianes (iniciamos en PI/2 para que la punta apunte arriba)
  const angle = (Math.PI / 2) + (i * Math.PI / numPoints);
  const x = radius * Math.cos(angle);
  const y = radius * Math.sin(angle);
  vertexList.push(x, y);
}

const vertices = new Float32Array(vertexList);

// --- CONSTRUCCIÓN DE ÍNDICES (10 triángulos en abanico) ---
const indexList = [];
for (let i = 1; i <= 10; i++) {
  const next = (i === 10) ? 1 : i + 1;
  indexList.push(0, i, next); // Conecta centro con el vértice actual y el siguiente
}
const indices = new Uint16Array(indexList);

// --- BUFFERS Y RENDER ---
const vBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

const iBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

// Limpiar fondo a negro o gris oscuro y dibujar
gl.clearColor(0.1, 0.1, 0.1, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);