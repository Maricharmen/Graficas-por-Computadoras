const canvas = document.querySelector('#glCanvas');
const gl = canvas.getContext('webgl2');

// Shaders
const vs = `#version 300 es
layout(location = 0) in vec2 aPosition;

void main() {
    gl_PointSize = 30.0; // <-- Agrega esta línea (tamaño en píxeles)
    gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const fs = `#version 300 es
precision mediump float;
out vec4 fragColor;
void main() {
    fragColor = vec4(1.0, 0.0, 0.0, 1.0); // Rojo
}`;

function compilar(tipo, src) {
  const s = gl.createShader(tipo);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(s));
  }
  return s;
}

const program = gl.createProgram();
gl.attachShader(program, compilar(gl.VERTEX_SHADER, vs));
gl.attachShader(program, compilar(gl.FRAGMENT_SHADER, fs));
gl.linkProgram(program);
gl.useProgram(program);

// 3 vértices: Arriba (0, 0.5), Abajo-Izq (-0.5, -0.5), Abajo-Der (0.5, -0.5)
const vertices = new Float32Array([
   0.0,  0.5,
  -0.5, -0.5,
   0.5, -0.5
]);

const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

// Limpiar fondo
gl.clearColor(0.2, 0.2, 0.2, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

// DIBUJAR: 3 vértices POINTS TRIANGLES
gl.drawArrays(gl.POINTS, 0, 3);