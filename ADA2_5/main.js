// =========================================================================
// 1. INICIALIZACIÓN DE WEBGL 2
// =========================================================================
const canvas = document.querySelector('#glCanvas');
const gl = canvas.getContext('webgl2');

if (!gl) {
    alert('WebGL 2 no disponible');
}

gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LEQUAL);

// =========================================================================
// 2. SHADERS (GLSL 300 es)
// =========================================================================
const vertexShaderSrc = `#version 300 es
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aBarycentric;
layout(location = 2) in vec3 aColor;

uniform mat4 uMatrix;

out vec3 vColor;
out vec3 vBarycentric;

void main() {
    vColor = aColor;
    vBarycentric = aBarycentric;
    gl_Position = uMatrix * vec4(aPosition, 1.0);
}
`;

const fragmentShaderSrc = `#version 300 es
precision mediump float;

in vec3 vColor;
in vec3 vBarycentric;

out vec4 fragColor;

void main() {
    // Cálculo de aristas alámbricas (wireframe) mediante coordenadas baricéntricas
    float minBary = min(vBarycentric.x, min(vBarycentric.y, vBarycentric.z));
    float edge = smoothstep(0.0, 0.04, minBary);

    // Si está en el borde, oscurece para demarcar la arista del triángulo
    vec3 col = mix(vec3(0.08, 0.09, 0.12), vColor, edge);
    fragColor = vec4(col, 1.0);
}
`;

function compileShader(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
    }
    return s;
}

const program = gl.createProgram();
gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vertexShaderSrc));
gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc));
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
}
gl.useProgram(program);

const uMatrixLoc = gl.getUniformLocation(program, 'uMatrix');

// =========================================================================
// 3. GENERACIÓN DE MALLA 3D (> 500 VÉRTICES)
// Generamos una esfera paramétrica de 30x30 subdivisiones (961 vértices, 1800 triángulos)
// =========================================================================
const latBands = 30;
const lonBands = 30;
const radius = 1.35;

const rawVertices = [];
const rawIndices = [];

for (let lat = 0; lat <= latBands; lat++) {
    const theta = (lat * Math.PI) / latBands;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let lon = 0; lon <= lonBands; lon++) {
        const phi = (lon * 2 * Math.PI) / lonBands;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        const x = radius * cosPhi * sinTheta;
        const y = radius * cosTheta;
        const z = radius * sinPhi * sinTheta;

        rawVertices.push(x, y, z);
    }
}

for (let lat = 0; lat < latBands; lat++) {
    for (let lon = 0; lon < lonBands; lon++) {
        const first = lat * (lonBands + 1) + lon;
        const second = first + lonBands + 1;

        // Dos triángulos por cada celda de la cuadrícula esférica
        rawIndices.push(first, second, first + 1);
        rawIndices.push(second, second + 1, first + 1);
    }
}

const numTriangles = rawIndices.length / 3;
console.log(`Vértices únicos: ${rawVertices.length / 3}, Triángulos: ${numTriangles}`);

// =========================================================================
// 4. GRAFO DE ADYACENCIA ENTRE TRIÁNGULOS
// =========================================================================
// Dos triángulos son vecinos si comparten exactamente 2 vértices (1 arista común)
const edgeToTriangles = new Map();

function makeEdgeKey(i1, i2) {
    return i1 < i2 ? `${i1}_${i2}` : `${i2}_${i1}`;
}

for (let t = 0; t < numTriangles; t++) {
    const i0 = rawIndices[t * 3];
    const i1 = rawIndices[t * 3 + 1];
    const i2 = rawIndices[t * 3 + 2];

    const edges = [
        makeEdgeKey(i0, i1),
        makeEdgeKey(i1, i2),
        makeEdgeKey(i2, i0)
    ];

    for (const edge of edges) {
        if (!edgeToTriangles.has(edge)) {
            edgeToTriangles.set(edge, []);
        }
        edgeToTriangles.get(edge).push(t);
    }
}

// Lista de adyacencia de triángulos
const neighbors = Array.from({ length: numTriangles }, () => []);
for (const [edge, tris] of edgeToTriangles.entries()) {
    if (tris.length === 2) {
        const [t1, t2] = tris;
        neighbors[t1].push(t2);
        neighbors[t2].push(t1);
    }
}

// =========================================================================
// 5. ALGORITMO BFS (BREADTH-FIRST SEARCH) PARA ENCONTRAR EL CAMINO
// =========================================================================
function findShortestPath(startTri, endTri) {
    if (startTri === endTri) return [startTri];

    const visited = new Uint8Array(numTriangles);
    const parent = new Int32Array(numTriangles).fill(-1);
    const queue = [startTri];
    visited[startTri] = 1;

    let found = false;
    let head = 0;

    while (head < queue.length) {
        const curr = queue[head++];
        if (curr === endTri) {
            found = true;
            break;
        }

        for (const next of neighbors[curr]) {
            if (!visited[next]) {
                visited[next] = 1;
                parent[next] = curr;
                queue.push(next);
            }
        }
    }

    if (!found) return [];

    const path = [];
    let step = endTri;
    while (step !== -1) {
        path.push(step);
        step = parent[step];
    }
    return path.reverse();
}

// =========================================================================
// 6. GENERACIÓN DEL BUFFER CON COLORES POR TRIÁNGULO
// =========================================================================
let startTriangle = 120;
let endTriangle = 1680;

// Paleta de colores para el marcado
const COLOR_DEFAULT = [0.75, 0.77, 0.82]; // Gris metálico de la malla
const COLOR_PATH    = [0.15, 0.78, 0.52]; // Verde esmeralda (camino)
const COLOR_START   = [0.92, 0.18, 0.24]; // Rojo inicial
const COLOR_END     = [0.92, 0.18, 0.24]; // Rojo final

let vboData = null;
const vbo = gl.createBuffer();

function updateMeshColors() {
    const path = findShortestPath(startTriangle, endTriangle);
    const pathSet = new Set(path);

    // 3 vértices por triángulo desplegados sin indexación para permitir
    // coordenadas baricéntricas independientes por triángulo (wireframe limpio)
    const totalFloatsPerVertex = 3 + 3 + 3; // Pos(3) + Bary(3) + Color(3) = 9
    vboData = new Float32Array(numTriangles * 3 * totalFloatsPerVertex);

    let offset = 0;
    const baryCoords = [
        1.0, 0.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 0.0, 1.0
    ];

    for (let t = 0; t < numTriangles; t++) {
        let triColor = COLOR_DEFAULT;
        if (t === startTriangle) {
            triColor = COLOR_START;
        } else if (t === endTriangle) {
            triColor = COLOR_END;
        } else if (pathSet.has(t)) {
            triColor = COLOR_PATH;
        }

        const idx0 = rawIndices[t * 3];
        const idx1 = rawIndices[t * 3 + 1];
        const idx2 = rawIndices[t * 3 + 2];

        const triIndices = [idx0, idx1, idx2];

        for (let v = 0; v < 3; v++) {
            const vIdx = triIndices[v];
            // Posición X, Y, Z
            vboData[offset++] = rawVertices[vIdx * 3];
            vboData[offset++] = rawVertices[vIdx * 3 + 1];
            vboData[offset++] = rawVertices[vIdx * 3 + 2];

            // Coordenada baricéntrica local (1,0,0), (0,1,0), (0,0,1)
            vboData[offset++] = baryCoords[v * 3];
            vboData[offset++] = baryCoords[v * 3 + 1];
            vboData[offset++] = baryCoords[v * 3 + 2];

            // Color RGB asignado
            vboData[offset++] = triColor[0];
            vboData[offset++] = triColor[1];
            vboData[offset++] = triColor[2];
        }
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vboData, gl.STATIC_DRAW);
}

// Configuración de punteros de atributos
const stride = 9 * Float32Array.BYTES_PER_ELEMENT; // 36 bytes

gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
// aPosition (loc 0)
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);

// aBarycentric (loc 1)
gl.enableVertexAttribArray(1);
gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);

// aColor (loc 2)
gl.enableVertexAttribArray(2);
gl.vertexAttribPointer(2, 3, gl.FLOAT, false, stride, 6 * Float32Array.BYTES_PER_ELEMENT);

updateMeshColors();

// Botón para elegir nuevos puntos aleatorios
document.getElementById('btnRecalcular').addEventListener('click', () => {
    startTriangle = Math.floor(Math.random() * numTriangles);
    do {
        endTriangle = Math.floor(Math.random() * numTriangles);
    } while (endTriangle === startTriangle);

    updateMeshColors();
});

// =========================================================================
// 7. CÁMARA ORBITAL
// =========================================================================
let yaw = 0.6;
let pitch = 0.3;
let distance = 3.8;
let isDragging = false;
let lastX = 0, lastY = 0;

canvas.addEventListener('mousedown', e => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
});

window.addEventListener('mouseup', () => { isDragging = false; });

canvas.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    yaw += dx * 0.006;
    pitch += dy * 0.006;
    pitch = Math.max(-1.5, Math.min(1.5, pitch));
});

canvas.addEventListener('wheel', e => {
    distance += e.deltaY * 0.003;
    distance = Math.max(1.8, Math.min(7.0, distance));
    e.preventDefault();
}, { passive: false });

const projMatrix = mat4.create();
const viewMatrix = mat4.create();
const mvpMatrix = mat4.create();

function render() {
    mat4.perspective(projMatrix, glMatrix.toRadian(45), canvas.width / canvas.height, 0.1, 100.0);

    const eyeX = distance * Math.cos(pitch) * Math.sin(yaw);
    const eyeY = distance * Math.sin(pitch);
    const eyeZ = distance * Math.cos(pitch) * Math.cos(yaw);

    mat4.lookAt(viewMatrix, [eyeX, eyeY, eyeZ], [0, 0, 0], [0, 1, 0]);
    mat4.multiply(mvpMatrix, projMatrix, viewMatrix);

    gl.uniformMatrix4fv(uMatrixLoc, false, mvpMatrix);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.06, 0.07, 0.09, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Dibuja los 3 vértices de cada uno de los triángulos de la malla
    gl.drawArrays(gl.TRIANGLES, 0, numTriangles * 3);

    requestAnimationFrame(render);
}

requestAnimationFrame(render);