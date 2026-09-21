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

const triVBO = gl.createBuffer();
const lineVBO = gl.createBuffer();
const STRIDE = 5 * Float32Array.BYTES_PER_ELEMENT;

function drawGeometry(buffer, data, drawMode) {
    if (data.length === 0) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, STRIDE, 0);

    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, STRIDE, 2 * Float32Array.BYTES_PER_ELEMENT);

    gl.drawArrays(drawMode, 0, data.length / 5);
}

const R = 0.60;                       // Radio de la circunferencia
const circleSegments = 240;
const numTriangles = 24;              // Cantidad total de triángulos alrededor de la circunferencia
const deltaAngle = (Math.PI * 2) / numTriangles;

// Dimensiones exactas del triángulo isósceles para coincidir con la cuerda
const baseChordLength = 2 * R * Math.sin(deltaAngle / 2);
const halfBase = baseChordLength / 2;
const triangleHeight = halfBase * 1.5;

// Baricentro / centro de giro en su propio eje
const yCenter = triangleHeight / 3;
const localApex  = [0.0, triangleHeight - yCenter];
const localBaseL = [-halfBase, -yCenter];
const localBaseR = [ halfBase, -yCenter];

// Sub-triángulo rojo en la punta (ápice)
const tipFraction = 0.40;
const localTipL = [
    localApex[0] + (localBaseL[0] - localApex[0]) * tipFraction,
    localApex[1] + (localBaseL[1] - localApex[1]) * tipFraction
];
const localTipR = [
    localApex[0] + (localBaseR[0] - localApex[0]) * tipFraction,
    localApex[1] + (localBaseR[1] - localApex[1]) * tipFraction
];

// Paso de rotación relativa entre triángulos adyacentes: 120° (grado del triángulo #8)
const spinStepPerTriangle = (8 * Math.PI * 2) / numTriangles;

// Velocidad del movimiento orbital (radianes por segundo)
const orbitSpeed = 0.5;

let startTime = performance.now();

function render() {
    const elapsed = (performance.now() - startTime) / 1000;
    
    // Desplazamiento angular global en el tiempo
    const timeOffset = elapsed * orbitSpeed;

    const lineVertices = [];
    const triangleVertices = [];

    function addLine(p1, p2, color = [0.0, 0.0, 0.0]) {
        lineVertices.push(
            p1[0], p1[1], color[0], color[1], color[2],
            p2[0], p2[1], color[0], color[1], color[2]
        );
    }

    function addTri(p1, p2, p3, color = [0.92, 0.12, 0.12]) {
        triangleVertices.push(
            p1[0], p1[1], color[0], color[1], color[2],
            p2[0], p2[1], color[0], color[1], color[2],
            p3[0], p3[1], color[0], color[1], color[2]
        );
    }

    // 1. Circunferencia base estática
    for (let i = 0; i < circleSegments; i++) {
        const a1 = (i / circleSegments) * Math.PI * 2;
        const a2 = ((i + 1) / circleSegments) * Math.PI * 2;
        addLine(
            [Math.cos(a1) * R, Math.sin(a1) * R],
            [Math.cos(a2) * R, Math.sin(a2) * R],
            [0.0, 0.0, 0.0]
        );
    }

    // 2. Triángulos en movimiento orbital y rotación intrínseca sobre su propio eje
    for (let i = 0; i < numTriangles; i++) {
        // Posición orbital que avanza en el tiempo hacia la derecha
        const orbitAngle = Math.PI / 2 - (i * deltaAngle) - timeOffset;

        // Posición del centro del triángulo
        const cx = Math.cos(orbitAngle) * (R + yCenter);
        const cy = Math.sin(orbitAngle) * (R + yCenter);

        // Alineación tangencial con la circunferencia
        const tangentAngle = orbitAngle - Math.PI / 2;

        // Rotación en su propio eje:
        // - Cada triángulo tiene el salto de 120° (spinStepPerTriangle) respecto a su vecino.
        // - Además, gira continuamente en su eje sincronizado con el avance temporal.
        const spinAngle = -(i * spinStepPerTriangle) - (timeOffset * 8.0);
        const totalAngle = tangentAngle + spinAngle;

        const cosA = Math.cos(totalAngle);
        const sinA = Math.sin(totalAngle);

        const transform = ([lx, ly]) => [
            cx + (lx * cosA - ly * sinA),
            cy + (lx * sinA + ly * cosA)
        ];

        const apex  = transform(localApex);
        const baseL = transform(localBaseL);
        const baseR = transform(localBaseR);

        const tipL = transform(localTipL);
        const tipR = transform(localTipR);

        // Relleno rojo identificador en la punta
        addTri(apex, tipL, tipR, [0.92, 0.12, 0.12]);

        // Nervadura interna en la punta
        const midTip = [(tipL[0] + tipR[0]) * 0.5, (tipL[1] + tipR[1]) * 0.5];
        addLine(apex, midTip, [0.75, 0.05, 0.05]);
        addLine(tipL, tipR,   [0.75, 0.05, 0.05]);

        // Contorno negro del triángulo isósceles
        addLine(apex, baseL, [0.0, 0.0, 0.0]);
        addLine(baseL, baseR, [0.0, 0.0, 0.0]);
        addLine(baseR, apex,  [0.0, 0.0, 0.0]);
    }

    // 3. Dibujo en pantalla
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    drawGeometry(triVBO, triangleVertices, gl.TRIANGLES);
    drawGeometry(lineVBO, lineVertices, gl.LINES);

    requestAnimationFrame(render);
}

// Iniciar bucle de animación
requestAnimationFrame(render);