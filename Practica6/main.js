const canvas = document.querySelector('#glCanvas');
const gl = canvas.getContext('webgl2');
gl.viewport(0, 0, canvas.width, canvas.height);

const vertexShaderSource = `#version 300 es
layout(location = 0) in vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }`;

const fragmentShaderSource = `#version 300 es
precision mediump float;
out vec4 fragColor;
void main() { fragColor = vec4(0.0, 0.0, 0.0, 1.0); }`;

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

const vertices = [];

// --- PARÁMETROS DE LA PISTA (STADIUM) ---
const straightLen = 0.9;         // Largo de las secciones rectas horizontales
const curveRadius = 0.45;        // Radio de las curvas laterales
const spacing = 0.06;            // Separación entre las 3 líneas
const offsets = [spacing, 0, -spacing];

// Geometría del circuito cerrado
const arcPerimeter = Math.PI * curveRadius * 2;
const totalPerimeter = straightLen * 2 + arcPerimeter;

// Módulo de repetición: Debe ser múltiplo de 3 para asegurar el empalme continuo
const numModules = 30;           // Cantidad total de cruces en la pista
const stepLen = totalPerimeter / numModules;

// Permutación cíclica básica (1->2, 2->3, 3->1)
const pattern = [
    [0, 1, 2],
    [1, 2, 0],
    [2, 0, 1]
];

// --- EVALUACIÓN DE LA TRAYECTORIA (PISTA DE ATLETISMO) ---
function getStadiumPoint(dist, offset) {
    // Normalizar distancia dentro del perímetro total
    let d = ((dist % totalPerimeter) + totalPerimeter) % totalPerimeter;

    let x = 0, y = 0, nx = 0, ny = 0;

    if (d < straightLen) {
        // 1. Tramo recto superior (de izquierda a derecha)
        x = -straightLen / 2 + d;
        y = curveRadius;
        nx = 0; ny = 1;
    } else if (d < straightLen + Math.PI * curveRadius) {
        // 2. Semicírculo derecho
        const arcD = d - straightLen;
        const angle = Math.PI / 2 - (arcD / curveRadius);
        x = straightLen / 2 + Math.cos(angle) * curveRadius;
        y = Math.sin(angle) * curveRadius;
        nx = Math.cos(angle);
        ny = Math.sin(angle);
    } else if (d < straightLen * 2 + Math.PI * curveRadius) {
        // 3. Tramo recto inferior (de derecha a izquierda)
        const rectD = d - (straightLen + Math.PI * curveRadius);
        x = straightLen / 2 - rectD;
        y = -curveRadius;
        nx = 0; ny = -1;
    } else {
        // 4. Semicírculo izquierdo
        const arcD = d - (straightLen * 2 + Math.PI * curveRadius);
        const angle = -Math.PI / 2 - (arcD / curveRadius);
        x = -straightLen / 2 + Math.cos(angle) * curveRadius;
        y = Math.sin(angle) * curveRadius;
        nx = Math.cos(angle);
        ny = Math.sin(angle);
    }

    // Aplicar el desplazamiento perpendicular exacto para que no queden huecos
    return [x + nx * offset, y + ny * offset];
}

function addLine(p1, p2) {
    vertices.push(p1[0], p1[1], p2[0], p2[1]);
}

// --- GENERACIÓN DE VÉRTICES CONTINUOS (ALTERNADO CON CORTE SIMÉTRICO) ---
for (let m = 0; m < numModules; m++) {
    const dStart = m * stepLen;
    const dMid   = dStart + stepLen * 0.45; // 45% recto
    const dEnd   = dStart + stepLen;        // 55% diagonal

    let currPos, nextPos;
    if (m % 2 === 0) {
        currPos = pattern[m % 3];
        nextPos = pattern[(m + 1) % 3];
    } else {
        currPos = pattern[m % 3];
        nextPos = pattern[(m - 1 + 3) % 3];
    }

    for (let h = 0; h < 3; h++) {
        const off1 = offsets[currPos[h]];
        const off2 = offsets[nextPos[h]];

        // Puntos exactos sin huecos
        const p1 = getStadiumPoint(dStart, off1);
        const p2 = getStadiumPoint(dMid,   off1);
        const p3 = getStadiumPoint(dEnd,   off2);

        // Tramo recto del módulo siempre se dibuja completo
        addLine(p1, p2);

        // --- CORTE INTELIGENTE ADAPTADO AL SENTIDO DEL CRUCE ---
        const currentIndexAtStart = currPos[h];
        let shouldCut = false;

        // Dependiendo de la dirección del módulo, la línea que va por debajo cambia de carril inicial
        if (m % 2 === 0) {
            if (currentIndexAtStart === 2) shouldCut = true; // Sube de abajo hacia arriba
        } else {
            if (currentIndexAtStart === 0) shouldCut = true; // Baja de arriba hacia abajo
        }

        if (shouldCut) {
            const gapStart_x = p2[0] + (p3[0] - p2[0]) * 0.35;
            const gapStart_y = p2[1] + (p3[1] - p2[1]) * 0.35;

            const gapEnd_x = p2[0] + (p3[0] - p2[0]) * 0.65;
            const gapEnd_y = p2[1] + (p3[1] - p2[1]) * 0.65;

            addLine(p2, [gapStart_x, gapStart_y]);
            addLine([gapEnd_x, gapEnd_y], p3);
        } else {
            addLine(p2, p3);
        }
    }
}

// --- RENDER EN CANVAS ---
const vBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

gl.clearColor(1.0, 1.0, 1.0, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);
gl.drawArrays(gl.LINES, 0, vertices.length / 2);