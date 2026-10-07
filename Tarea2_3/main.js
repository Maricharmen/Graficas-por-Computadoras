// =========================================================================
// 1. SHADERS 
// =========================================================================
const vertexShaderSrc = `#version 300 es
layout(location=0) in vec3 aPosition; // Vértices del triángulo base en 3D
layout(location=1) in vec3 aOffset;   // Posición del triángulo en el espacio 3D
layout(location=2) in float aScale;   // Escala del triángulo
layout(location=3) in vec4 aColor;    // Color de la faceta del Rubik
layout(location=4) in vec3 aNormal;   // Vector normal para orientar el triángulo en su cara

uniform mat4 uViewProj;

out vec4 vColor;
out vec3 vLocalPos;

void main()
{
    vColor = aColor;
    vLocalPos = aPosition;

    // Matriz ortonormal según la normal de la cara del cubo
    vec3 N = normalize(aNormal);
    vec3 up = (abs(N.y) > 0.99) ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
    vec3 T = normalize(cross(up, N));
    vec3 B = cross(N, T);
    mat3 orientMat = mat3(T, B, N);

    // Transformación local del triángulo hacia la cara del cubito
    vec3 worldPos = (orientMat * (aPosition * aScale)) + aOffset;

    gl_Position = uViewProj * vec4(worldPos, 1.0);
}
`;

const fragmentShaderSrc = `#version 300 es
precision mediump float;

in vec4 vColor;
in vec3 vLocalPos;
out vec4 fragColor;

void main()
{
    // =====================================================================
    // TEXTURA DE ARISTA: Resalta la unión de los 2 triángulos en cada cara
    // =====================================================================
    // Distancia a las aristas del triángulo rectángulo base (-0.5 a 0.5)
    float dX = 0.5 - abs(vLocalPos.x);
    float dY = 0.5 - abs(vLocalPos.y);
    float dDiag = 0.5 * (1.0 - abs(vLocalPos.x - vLocalPos.y));
    float edge = min(dX, min(dY, dDiag));

    // Bisel oscuro en los bordes y en la diagonal central
    float border = smoothstep(0.015, 0.08, edge);

    vec3 finalRgb = vColor.rgb * (border * 0.78 + 0.22);
    fragColor = vec4(finalRgb, 1.0);
}
`;

const canvas = document.querySelector('#glCanvas');
const gl = canvas.getContext('webgl2');

if (!gl) {
    alert('WebGL 2 no disponible');
}

// Activar prueba de profundidad para correcta oclusión 3D
gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LEQUAL);

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

const uViewProjLoc = gl.getUniformLocation(program, 'uViewProj');

// =========================================================================
// 2. GEOMETRÍA BASE 
// =========================================================================
// Triángulo rectángulo unitario (media cara cuadrada)
const modelData = new Float32Array([
    -0.5, -0.5, 0.0,
     0.5, -0.5, 0.0,
     0.5,  0.5, 0.0
]);

// =========================================================================
// 3. COLORES OFICIALES DEL CUBO DE RUBIK
// =========================================================================
const RUBIK_WHITE  = [0.95, 0.95, 0.95]; // Superior (+Y)
const RUBIK_YELLOW = [0.95, 0.88, 0.05]; // Inferior (-Y)
const RUBIK_GREEN  = [0.05, 0.65, 0.25]; // Frente (+Z)
const RUBIK_BLUE   = [0.05, 0.35, 0.85]; // Atrás (-Z)
const RUBIK_RED    = [0.85, 0.10, 0.10]; // Derecha (+X)
const RUBIK_ORANGE = [0.95, 0.45, 0.05]; // Izquierda (-X)
const RUBIK_BLACK  = [0.08, 0.08, 0.10]; // Caras internas ocultas

// Configuración de las 6 caras por cubito (cada cara = 2 triángulos)
const half = 0.5;
const baseFaces = [
    // Cara Frontal (+Z) -> Verde
    { dir: 'Z+', norm: [0, 0, 1], offset: [0, 0, half], color: RUBIK_GREEN },
    { dir: 'Z+', norm: [0, 0, 1], offset: [0, 0, half], color: RUBIK_GREEN, flip: true },

    // Cara Trasera (-Z) -> Azul
    { dir: 'Z-', norm: [0, 0, -1], offset: [0, 0, -half], color: RUBIK_BLUE },
    { dir: 'Z-', norm: [0, 0, -1], offset: [0, 0, -half], color: RUBIK_BLUE, flip: true },

    // Cara Superior (+Y) -> Blanco
    { dir: 'Y+', norm: [0, 1, 0], offset: [0, half, 0], color: RUBIK_WHITE },
    { dir: 'Y+', norm: [0, 1, 0], offset: [0, half, 0], color: RUBIK_WHITE, flip: true },

    // Cara Inferior (-Y) -> Amarillo
    { dir: 'Y-', norm: [0, -1, 0], offset: [0, -half, 0], color: RUBIK_YELLOW },
    { dir: 'Y-', norm: [0, -1, 0], offset: [0, -half, 0], color: RUBIK_YELLOW, flip: true },

    // Cara Derecha (+X) -> Rojo
    { dir: 'X+', norm: [1, 0, 0], offset: [half, 0, 0], color: RUBIK_RED },
    { dir: 'X+', norm: [1, 0, 0], offset: [half, 0, 0], color: RUBIK_RED, flip: true },

    // Cara Izquierda (-X) -> Naranja
    { dir: 'X-', norm: [-1, 0, 0], offset: [-half, 0, 0], color: RUBIK_ORANGE },
    { dir: 'X-', norm: [-1, 0, 0], offset: [-half, 0, 0], color: RUBIK_ORANGE, flip: true }
];

// =========================================================================
// 4. GENERACIÓN DE INSTANCIAS 
// =========================================================================
const cubeSize = 0.42;    // Tamaño de cada cubito
const spacing  = 0.45;    // Separación para dejar la ranura negra típica del Rubik
const transformList = [];

for (let gx = -1; gx <= 1; gx++) {
    for (let gy = -1; gy <= 1; gy++) {
        for (let gz = -1; gz <= 1; gz++) {
            // El núcleo interno central (0,0,0) no es visible, se descarta
            if (gx === 0 && gy === 0 && gz === 0) continue;

            const cx = gx * spacing;
            const cy = gy * spacing;
            const cz = gz * spacing;

            // Ensamblar los 12 triángulos del cubito actual
            for (let f = 0; f < baseFaces.length; f++) {
                const face = baseFaces[f];
                const sign = face.flip ? -1.0 : 1.0;

                // Determinar si la cara da al exterior del Rubik o es cara interna
                let isExterior = false;
                if (face.dir === 'X+' && gx === 1)  isExterior = true;
                if (face.dir === 'X-' && gx === -1) isExterior = true;
                if (face.dir === 'Y+' && gy === 1)  isExterior = true;
                if (face.dir === 'Y-' && gy === -1) isExterior = true;
                if (face.dir === 'Z+' && gz === 1)  isExterior = true;
                if (face.dir === 'Z-' && gz === -1) isExterior = true;

                // Cara exterior lleva su color del Rubik; cara interior queda en negro
                const chosenColor = isExterior ? face.color : RUBIK_BLACK;

                // Ligera modulación (factor 1.0 y 0.90) entre el par de triángulos de la cara
                // para resaltar visualmente que cada cuadrado está compuesto de dos triángulos
                const toneMod = face.flip ? 0.90 : 1.0;
                const r = chosenColor[0] * toneMod;
                const g = chosenColor[1] * toneMod;
                const b = chosenColor[2] * toneMod;

                const posX = cx + face.offset[0] * cubeSize;
                const posY = cy + face.offset[1] * cubeSize;
                const posZ = cz + face.offset[2] * cubeSize;

                // Empaquetado por instancia:
                // aOffset(3), aScale(1), aColor(4), aNormal(3) = 11 floats
                transformList.push(
                    posX, posY, posZ,          // aOffset (loc 1)
                    cubeSize * sign,           // aScale  (loc 2)
                    r, g, b, 1.0,              // aColor  (loc 3)
                    face.norm[0], face.norm[1], face.norm[2] // aNormal (loc 4)
                );
            }
        }
    }
}

const totalInstances = transformList.length / 11; 
const transformData = new Float32Array(transformList);

// =========================================================================
// 5. BUFFERS Y ATRIBUTOS DE INSTANCIA 
// =========================================================================
const modelBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, modelBuffer);
gl.bufferData(gl.ARRAY_BUFFER, modelData, gl.STATIC_DRAW);

// aPosition (location = 0, size = 3)
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);

const transformBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, transformBuffer);
gl.bufferData(gl.ARRAY_BUFFER, transformData, gl.STATIC_DRAW);

const stride = 11 * Float32Array.BYTES_PER_ELEMENT; 

// aOffset (location = 1, size = 3)
gl.enableVertexAttribArray(1);
gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 0);

// aScale (location = 2, size = 1)
gl.enableVertexAttribArray(2);
gl.vertexAttribPointer(2, 1, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);

// aColor (location = 3, size = 4)
gl.enableVertexAttribArray(3);
gl.vertexAttribPointer(3, 4, gl.FLOAT, false, stride, 4 * Float32Array.BYTES_PER_ELEMENT);

// aNormal (location = 4, size = 3)
gl.enableVertexAttribArray(4);
gl.vertexAttribPointer(4, 3, gl.FLOAT, false, stride, 8 * Float32Array.BYTES_PER_ELEMENT);

// Divisores: 1 paso por instancia (núcleo de instance.js)
gl.vertexAttribDivisor(1, 1);
gl.vertexAttribDivisor(2, 1);
gl.vertexAttribDivisor(3, 1);
gl.vertexAttribDivisor(4, 1);

// =========================================================================
// 6. CÁMARA ORBITAL 3D Y BUCLE DE RENDER
// =========================================================================
let yaw = 0.75;
let pitch = 0.50;
let dist = 3.8;
let isDragging = false;
let lastMouseX = 0, lastMouseY = 0;

canvas.addEventListener('mousedown', e => {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
});

window.addEventListener('mouseup', () => { isDragging = false; });

canvas.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;

    yaw += dx * 0.008;
    pitch += dy * 0.008;
    pitch = Math.max(-1.5, Math.min(1.5, pitch));
});

canvas.addEventListener('wheel', e => {
    dist += e.deltaY * 0.003;
    dist = Math.max(1.8, Math.min(8.0, dist));
    e.preventDefault();
}, { passive: false });

const projMatrix = mat4.create();
const viewMatrix = mat4.create();
const viewProj = mat4.create();

function render() {
    mat4.perspective(projMatrix, glMatrix.toRadian(45), canvas.width / canvas.height, 0.1, 100.0);

    const camX = dist * Math.cos(pitch) * Math.sin(yaw);
    const camY = dist * Math.sin(pitch);
    const camZ = dist * Math.cos(pitch) * Math.cos(yaw);

    mat4.lookAt(viewMatrix, [camX, camY, camZ], [0, 0, 0], [0, 1, 0]);
    mat4.multiply(viewProj, projMatrix, viewMatrix);

    gl.uniformMatrix4fv(uViewProjLoc, false, viewProj);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.06, 0.07, 0.09, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Un único draw call dibuja las 312 facetas triangulares del Cubo de Rubik
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, totalInstances);

    requestAnimationFrame(render);
}

requestAnimationFrame(render);