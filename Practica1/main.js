// 1. Obtener el contexto de WebGL2 del canvas
const canvas = document.querySelector('#glCanvas');
const gl = canvas.getContext('webgl2');

if (!gl) {
  alert('WebGL2 no está soportado en este navegador');
}

// 2. Código fuente de los dos shaders (GLSL ES 3.00)
// Vertex Shader: Fija la posición en el centro (0,0) y tamaño de 40px
const vertexShaderSource = `#version 300 es
void main() {
    gl_PointSize = 40.0;
    gl_Position = vec4(0.5, 0.5, 0.0, 1.0); // (X, Y, Z, W)
}`;

// Fragment Shader: Pinta el punto de color rojo (R, G, B, Alfa)
const fragmentShaderSource = `#version 300 es
precision mediump float;
out vec4 fragColor;
void main() {
    fragColor = vec4(0.0, 0.0, 1.0, 1.0); // Rojo puro
}`;

// 3. Compilar Vertex Shader en la GPU
const vertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertexShader, vertexShaderSource);
gl.compileShader(vertexShader);

// 4. Compilar Fragment Shader en la GPU
const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragmentShader, fragmentShaderSource);
gl.compileShader(fragmentShader);

// 5. Enlazar ambos shaders en un "Programa" ejecutable
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

// 6. Usar el programa y ordenar a la GPU que dibuje 1 solo punto
gl.useProgram(program);
gl.drawArrays(gl.POINTS, 0, 1);