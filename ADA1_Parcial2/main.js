const canvas = document.querySelector('#glCanvas');
const gl = canvas.getContext('webgl2');

gl.viewport(0, 0, canvas.width, canvas.height);

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
    return s;
}

const program = gl.createProgram();
gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vertexShaderSource));
gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource));
gl.linkProgram(program);
gl.useProgram(program);

const lineVertices = [];       // [x, y, r, g, b, ...]
const triangleVertices = [];   // [x, y, r, g, b, ...]

function addLine(p1, p2, color = [0.0, 0.0, 0.0]) {
    lineVertices.push(
        p1[0], p1[1], color[0], color[1], color[2],
        p2[0], p2[1], color[0], color[1], color[2]
    );
}

function addTriangle(p1, p2, p3, color = [0.85, 0.1, 0.1]) {
    triangleVertices.push(
        p1[0], p1[1], color[0], color[1], color[2],
        p2[0], p2[1], color[0], color[1], color[2],
        p3[0], p3[1], color[0], color[1], color[2]
    );
}

// ==========================================
// 1. CIRCUNFERENCIA PRINCIPAL
// ==========================================
const R = 0.60;                  // Radio de la circunferencia
const circleSegments = 240;

for (let i = 0; i < circleSegments; i++) {
    const a1 = (i / circleSegments) * Math.PI * 2;
    const a2 = ((i + 1) / circleSegments) * Math.PI * 2;
    addLine(
        [Math.cos(a1) * R, Math.sin(a1) * R],
        [Math.cos(a2) * R, Math.sin(a2) * R],
        [0.0, 0.0, 0.0]
    );
}

// ==========================================
// 2. TRIÁNGULOS ISÓSCELES CON GIRO EN SU EJE
// ==========================================
const numTriangles = 24;          // Triángulos que completan la circunferencia
const deltaAngle = (Math.PI * 2) / numTriangles;

// Dimensiones del triángulo isósceles:
// La base coincide exactamente con la longitud de la cuerda del arco correspondiente
const baseChordLength = 2 * R * Math.sin(deltaAngle / 2);
const halfBase = baseChordLength / 2;
const triangleHeight = halfBase * 1.5; // Altura del isósceles

// Baricentro / centro de rotación del triángulo
const yCenter = triangleHeight / 3; 
const localApex  = [0.0, triangleHeight - yCenter];
const localBaseL = [-halfBase, -yCenter];
const localBaseR = [ halfBase, -yCenter];

// Sub-triángulo en la punta para el relleno rojo identificador
const tipFraction = 0.40; // Porción de la punta pintada de rojo
const localTipL = [
    localApex[0] + (localBaseL[0] - localApex[0]) * tipFraction,
    localApex[1] + (localBaseL[1] - localApex[1]) * tipFraction
];
const localTipR = [
    localApex[0] + (localBaseR[0] - localApex[0]) * tipFraction,
    localApex[1] + (localBaseR[1] - localApex[1]) * tipFraction
];

// El segundo triángulo (i = 1) ahora rota el grado que antes correspondía al triángulo #8 (8 * 2π / 24 = 120°)
const spinStepPerTriangle = (8 * Math.PI * 2) / numTriangles;

for (let i = 0; i < numTriangles; i++) {
    // 1. Ángulo de posición orbital sobre la circunferencia (inicia arriba en PI/2 y avanza hacia la derecha)
    const orbitAngle = Math.PI / 2 - (i * deltaAngle);

    // Centro posicionado sobre la circunferencia
    const cx = Math.cos(orbitAngle) * (R + yCenter);
    const cy = Math.sin(orbitAngle) * (R + yCenter);

    // 2. Orientación tangencial base perpendicular al radio
    const tangentAngle = orbitAngle - Math.PI / 2;

    // 3. Rotación en su propio eje:
    // El triángulo 0 tiene 0° de rotación relativa.
    // El triángulo 1 tiene exactamente la rotación del anterior triángulo #8 (120° a la derecha),
    // y cada triángulo siguiente continúa sumando este mismo grado de rotación.
    const spinAngle = -(i * spinStepPerTriangle);
    const totalAngle = tangentAngle + spinAngle;

    const cosA = Math.cos(totalAngle);
    const sinA = Math.sin(totalAngle);

    // Transformación afín 2D (rotación propia + traslación a la órbita)
    const transform = ([lx, ly]) => [
        cx + (lx * cosA - ly * sinA),
        cy + (lx * sinA + ly * cosA)
    ];

    const apex  = transform(localApex);
    const baseL = transform(localBaseL);
    const baseR = transform(localBaseR);

    const tipL = transform(localTipL);
    const tipR = transform(localTipR);

    // --- Relleno rojo en la punta para identificar claramente el giro ---
    addTriangle(apex, tipL, tipR, [0.92, 0.12, 0.12]);

    // Línea divisoria y de detalle interno en la punta roja
    const midTip = [(tipL[0] + tipR[0]) * 0.5, (tipL[1] + tipR[1]) * 0.5];
    addLine(apex, midTip, [0.75, 0.05, 0.05]);
    addLine(tipL, tipR,   [0.75, 0.05, 0.05]);

    // --- Contorno negro del triángulo isósceles ---
    addLine(apex, baseL, [0.0, 0.0, 0.0]);
    addLine(baseL, baseR, [0.0, 0.0, 0.0]);
    addLine(baseR, apex,  [0.0, 0.0, 0.0]);
}

// ==========================================
// 3. RENDERIZADO 
// ==========================================
function setupAndDraw(data, drawMode) {
    if (data.length === 0) return;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

    const stride = 5 * Float32Array.BYTES_PER_ELEMENT;

    // aPosition: vec2 (x, y)
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0);

    // aColor: vec3 (r, g, b)
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);

    gl.drawArrays(drawMode, 0, data.length / 5);
}

// Fondo blanco 
gl.clearColor(1.0, 1.0, 1.0, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

// 1. Dibujar los interiores rojos en las puntas de los triángulos
setupAndDraw(triangleVertices, gl.TRIANGLES);

// 2. Dibujar las aristas negras de los triángulos y la circunferencia
setupAndDraw(lineVertices, gl.LINES);