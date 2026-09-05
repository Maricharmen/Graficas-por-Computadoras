// 1. Obtener contexto de WebGL2
const canvas = document.querySelector('#glCanvas');
const gl = canvas.getContext('webgl2');

if (!gl) {
  alert('WebGL2 no está disponible');
}

// 2. Shaders
const vertexShaderSource = `#version 300 es
layout(location = 0) in vec2 aPosition;

void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const fragmentShaderSource = `#version 300 es
precision mediump float;
out vec4 fragColor;

void main() {
    fragColor = vec4(0.2, 0.6, 1.0, 1.0); // Azul claro
}`;

// Función auxiliar para compilar shaders y reportar errores
function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Error compilando shader:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
  console.error('Error enlazando programa:', gl.getProgramInfoLog(program));
}

gl.useProgram(program);

// 3. Geometría: 4 vértices únicos de un cuadrado centrado
const vertices = new Float32Array([
  -0.5,  0.5, // Vértice 0: Arriba - Izquierda
  -0.5, -0.5, // Vértice 1: Abajo  - Izquierda
   0.5, -0.5, // Vértice 2: Abajo  - Derecha
   0.5,  0.5  // Vértice 3: Arriba - Derecha
]);

// 4. Índices: Conectamos los 4 vértices formando 2 triángulos
// Triángulo 1: (0, 1, 2)
// Triángulo 2: (0, 2, 3)
const indices = new Uint16Array([
  0, 1, 2,
  0, 2, 3
]);

// 5. Buffer de Vértices (ARRAY_BUFFER)
const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

// Conectar buffer al atributo aPosition (location = 0)
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

// 6. Buffer de Índices (ELEMENT_ARRAY_BUFFER)
const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

// 7. Limpiar la pantalla y dibujar
gl.clearColor(0.1, 0.1, 0.1, 1.0); // Fondo gris oscuro
gl.clear(gl.COLOR_BUFFER_BIT);

// CRÍTICO: el segundo parámetro es el TOTAL de índices a procesar (6)
gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);