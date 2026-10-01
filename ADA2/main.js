// ==========================================
// 1. INICIALIZACIÓN DEL CONTEXTO WEBGL 2
// ==========================================
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');

if (!gl) {
    alert('WebGL 2 no está disponible en tu navegador');
}

gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LEQUAL);
gl.viewport(0, 0, canvas.width, canvas.height);

// ==========================================
// 2. SHADERS 
// ==========================================
const vertexShaderSource = `#version 300 es
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aColor;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

out vec3 vColor;

void main() {
    vColor = aColor;
    gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
}
`;

const fragmentShaderSource = `#version 300 es
precision mediump float;

in vec3 vColor;
out vec4 fragColor;

void main() {
    fragColor = vec4(vColor, 1.0);
}
`;

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

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
}
gl.useProgram(program);

const uModelLoc = gl.getUniformLocation(program, 'uModelMatrix');
const uViewLoc = gl.getUniformLocation(program, 'uViewMatrix');
const uProjLoc = gl.getUniformLocation(program, 'uProjectionMatrix');

// ==========================================
// 3. GEOMETRÍAS (CUBO Y PIRÁMIDE)
// ==========================================
const cubeVertices = new Float32Array([
    // Cara Frontal (Rojo)
    -1.0, -1.0,  1.0,  0.9, 0.2, 0.2,
     1.0, -1.0,  1.0,  0.9, 0.2, 0.2,
     1.0,  1.0,  1.0,  0.9, 0.2, 0.2,
    -1.0,  1.0,  1.0,  0.9, 0.2, 0.2,
    // Cara Trasera (Naranja)
    -1.0, -1.0, -1.0,  0.9, 0.5, 0.1,
    -1.0,  1.0, -1.0,  0.9, 0.5, 0.1,
     1.0,  1.0, -1.0,  0.9, 0.5, 0.1,
     1.0, -1.0, -1.0,  0.9, 0.5, 0.1,
    // Cara Superior (Azul)
    -1.0,  1.0, -1.0,  0.2, 0.5, 0.9,
    -1.0,  1.0,  1.0,  0.2, 0.5, 0.9,
     1.0,  1.0,  1.0,  0.2, 0.5, 0.9,
     1.0,  1.0, -1.0,  0.2, 0.5, 0.9,
    // Cara Inferior (Amarillo)
    -1.0, -1.0, -1.0,  0.9, 0.8, 0.2,
     1.0, -1.0, -1.0,  0.9, 0.8, 0.2,
     1.0, -1.0,  1.0,  0.9, 0.8, 0.2,
    -1.0, -1.0,  1.0,  0.9, 0.8, 0.2,
    // Cara Derecha (Verde)
     1.0, -1.0, -1.0,  0.2, 0.8, 0.3,
     1.0,  1.0, -1.0,  0.2, 0.8, 0.3,
     1.0,  1.0,  1.0,  0.2, 0.8, 0.3,
     1.0, -1.0,  1.0,  0.2, 0.8, 0.3,
    // Cara Izquierda (Morado)
    -1.0, -1.0, -1.0,  0.6, 0.2, 0.8,
    -1.0, -1.0,  1.0,  0.6, 0.2, 0.8,
    -1.0,  1.0,  1.0,  0.6, 0.2, 0.8,
    -1.0,  1.0, -1.0,  0.6, 0.2, 0.8
]);

const cubeIndices = new Uint16Array([
     0,  1,  2,      0,  2,  3,
     4,  5,  6,      4,  6,  7,
     8,  9, 10,      8, 10, 11,
    12, 13, 14,     12, 14, 15,
    16, 17, 18,     16, 18, 19,
    20, 21, 22,     20, 22, 23
]);

const pyramidVertices = new Float32Array([
    // Base
    -1.0, 0.0, -1.0,  0.3, 0.3, 0.3,
     1.0, 0.0, -1.0,  0.3, 0.3, 0.3,
     1.0, 0.0,  1.0,  0.3, 0.3, 0.3,
    -1.0, 0.0,  1.0,  0.3, 0.3, 0.3,
    // Cara Frontal (Cian)
    -1.0, 0.0,  1.0,  0.1, 0.8, 0.8,
     1.0, 0.0,  1.0,  0.1, 0.8, 0.8,
     0.0, 1.8,  0.0,  0.1, 0.8, 0.8,
    // Cara Derecha (Magenta)
     1.0, 0.0,  1.0,  0.9, 0.2, 0.6,
     1.0, 0.0, -1.0,  0.9, 0.2, 0.6,
     0.0, 1.8,  0.0,  0.9, 0.2, 0.6,
    // Cara Trasera (Azul)
     1.0, 0.0, -1.0,  0.2, 0.4, 0.9,
    -1.0, 0.0, -1.0,  0.2, 0.4, 0.9,
     0.0, 1.8,  0.0,  0.2, 0.4, 0.9,
    // Cara Izquierda (Verde)
    -1.0, 0.0, -1.0,  0.4, 0.9, 0.3,
    -1.0, 0.0,  1.0,  0.4, 0.9, 0.3,
     0.0, 1.8,  0.0,  0.4, 0.9, 0.3
]);

const pyramidIndices = new Uint16Array([
    0, 1, 2,   0, 2, 3,
    4, 5, 6,
    7, 8, 9,
    10, 11, 12,
    13, 14, 15
]);

function createMeshVAO(vertices, indices) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    const stride = 6 * Float32Array.BYTES_PER_ELEMENT;
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);

    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);

    gl.bindVertexArray(null);
    return { vao, count: indices.length };
}

const cubeMesh = createMeshVAO(cubeVertices, cubeIndices);
const pyramidMesh = createMeshVAO(pyramidVertices, pyramidIndices);

// ==========================================
// 4. CÁMARA ORBITAL
// ==========================================
// En lugar de vuelo libre que puede perder de vista los objetos,
// la cámara orbita alrededor del centro de la escena con límites de distancia y altura.
const cameraOrbit = {
    target: vec3.fromValues(0.0, 0.0, 0.0), // Centro exacto entre el cubo y la pirámide
    distance: 7.0,                          // Distancia actual
    minDistance: 4.2,                       // Límite mínimo: no choca con las figuras
    maxDistance: 11.0,                      // Límite máximo: las figuras siempre son visibles
    azimuth: 0.0,                           // Giro horizontal
    elevation: 0.35,                        // Inclinación vertical
    minElevation: -0.6,                     // No ir demasiado abajo
    maxElevation: 1.2,                      // No ir demasiado arriba
    speed: 0.12,
    mouseSensitivity: 0.005
};

const keys = {};
window.addEventListener('keydown', (e) => { keys[e.code] = true; });
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

let isMouseDown = false;
let lastMouseX = 0;
let lastMouseY = 0;

canvas.addEventListener('mousedown', (e) => {
    isMouseDown = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
});

window.addEventListener('mouseup', () => { isMouseDown = false; });

canvas.addEventListener('mousemove', (e) => {
    if (!isMouseDown) return;
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;

    cameraOrbit.azimuth += dx * cameraOrbit.mouseSensitivity;
    cameraOrbit.elevation += dy * cameraOrbit.mouseSensitivity;

    // Confinar inclinación
    if (cameraOrbit.elevation > cameraOrbit.maxElevation) cameraOrbit.elevation = cameraOrbit.maxElevation;
    if (cameraOrbit.elevation < cameraOrbit.minElevation) cameraOrbit.elevation = cameraOrbit.minElevation;
});

// Soporte de rueda de ratón para acercar / alejar con límites
canvas.addEventListener('wheel', (e) => {
    cameraOrbit.distance += e.deltaY * 0.005;
    if (cameraOrbit.distance < cameraOrbit.minDistance) cameraOrbit.distance = cameraOrbit.minDistance;
    if (cameraOrbit.distance > cameraOrbit.maxDistance) cameraOrbit.distance = cameraOrbit.maxDistance;
    e.preventDefault();
}, { passive: false });

function updateCamera() {
    // Teclado con límites:
    // W/S: Zoom adelante / atrás respetando el rango [minDistance, maxDistance]
    if (keys['KeyW']) cameraOrbit.distance -= cameraOrbit.speed;
    if (keys['KeyS']) cameraOrbit.distance += cameraOrbit.speed;

    // A/D: Rotación horizontal alrededor de los objetos
    if (keys['KeyA']) cameraOrbit.azimuth -= 0.03;
    if (keys['KeyD']) cameraOrbit.azimuth += 0.03;

    // Espacio/Shift: Altura vertical con límites [minElevation, maxElevation]
    if (keys['Space']) cameraOrbit.elevation += 0.02;
    if (keys['ShiftLeft'] || keys['ShiftRight']) cameraOrbit.elevation -= 0.02;

    // Aplicar clamp estricto a la distancia
    if (cameraOrbit.distance < cameraOrbit.minDistance) cameraOrbit.distance = cameraOrbit.minDistance;
    if (cameraOrbit.distance > cameraOrbit.maxDistance) cameraOrbit.distance = cameraOrbit.maxDistance;

    // Aplicar clamp estricto a la elevación
    if (cameraOrbit.elevation > cameraOrbit.maxElevation) cameraOrbit.elevation = cameraOrbit.maxElevation;
    if (cameraOrbit.elevation < cameraOrbit.minElevation) cameraOrbit.elevation = cameraOrbit.minElevation;
}

// ==========================================
// 5. BUCLE DE RENDER
// ==========================================
const projMatrix = mat4.create();
const viewMatrix = mat4.create();
const modelMatrix = mat4.create();
const eyePosition = vec3.create();

mat4.perspective(
    projMatrix,
    glMatrix.toRadian(55),
    canvas.width / canvas.height,
    0.1,
    100.0
);
gl.uniformMatrix4fv(uProjLoc, false, projMatrix);

let angle = 0;

function render() {
    updateCamera();

    // Calcular posición esférica de la cámara sobre el objetivo (0, 0, 0)
    const horizDist = cameraOrbit.distance * Math.cos(cameraOrbit.elevation);
    eyePosition[0] = cameraOrbit.target[0] + horizDist * Math.sin(cameraOrbit.azimuth);
    eyePosition[1] = cameraOrbit.target[1] + cameraOrbit.distance * Math.sin(cameraOrbit.elevation);
    eyePosition[2] = cameraOrbit.target[2] + horizDist * Math.cos(cameraOrbit.azimuth);

    // LookAt siempre apunta al centro de las figuras (0, 0, 0)
    mat4.lookAt(viewMatrix, eyePosition, cameraOrbit.target, vec3.fromValues(0, 1, 0));
    gl.uniformMatrix4fv(uViewLoc, false, viewMatrix);

    gl.clearColor(0.12, 0.12, 0.15, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    angle += 0.015;

    // --- OBJETO 1: CUBO ---
    mat4.identity(modelMatrix);
    mat4.translate(modelMatrix, modelMatrix, [-2.2, 0.0, 0.0]);
    mat4.rotateY(modelMatrix, modelMatrix, angle);
    mat4.rotateX(modelMatrix, modelMatrix, angle * 0.5);
    mat4.scale(modelMatrix, modelMatrix, [0.8, 0.8, 0.8]);
    gl.uniformMatrix4fv(uModelLoc, false, modelMatrix);

    gl.bindVertexArray(cubeMesh.vao);
    gl.drawElements(gl.TRIANGLES, cubeMesh.count, gl.UNSIGNED_SHORT, 0);

    // --- OBJETO 2: PIRÁMIDE ---
    mat4.identity(modelMatrix);
    mat4.translate(modelMatrix, modelMatrix, [2.2, -0.6, 0.0]);
    mat4.rotateY(modelMatrix, modelMatrix, -angle * 0.8);
    mat4.scale(modelMatrix, modelMatrix, [1.0, 1.0, 1.0]);
    gl.uniformMatrix4fv(uModelLoc, false, modelMatrix);

    gl.bindVertexArray(pyramidMesh.vao);
    gl.drawElements(gl.TRIANGLES, pyramidMesh.count, gl.UNSIGNED_SHORT, 0);

    gl.bindVertexArray(null);

    requestAnimationFrame(render);
}

requestAnimationFrame(render);