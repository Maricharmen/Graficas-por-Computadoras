// =========================================================================
// 1. INICIALIZACIÓN DEL CONTEXTO 
// =========================================================================
const canvas = document.querySelector('#glCanvas');
const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

if (!gl) {
    alert('WebGL no disponible en tu navegador');
}

// Configuración de profundidad y culling 
gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LEQUAL);
gl.enable(gl.CULL_FACE);
gl.frontFace(gl.CCW);
gl.cullFace(gl.BACK);

// =========================================================================
// 2. SHADERS 
// =========================================================================
const vertexShaderText = `#version 300 es
precision mediump float;

layout(location = 0) in vec3 vertPosition;
layout(location = 1) in vec2 vertTexCoord;
layout(location = 2) in vec3 vertNormal;

out vec2 fragTexCoord;
out vec3 fragNormal;

uniform mat4 mWorld;
uniform mat4 mView;
uniform mat4 mProj;

void main() {
    fragTexCoord = vertTexCoord;
    fragNormal = mat3(mWorld) * vertNormal;
    // Multiplicación MVP estándar: Proyección * Vista * Mundo * Posición
    gl_Position = mProj * mView * mWorld * vec4(vertPosition, 1.0);
}
`;

const fragmentShaderText = `#version 300 es
precision mediump float;

in vec2 fragTexCoord;
in vec3 fragNormal;

out vec4 fragColor;

// Uniform de textura 2D
uniform sampler2D sampler;

void main() {
    vec4 texColor = texture(sampler, fragTexCoord);

    // Iluminación direccional difusa básica para dar volumen 3D
    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.8));
    float diff = max(dot(normalize(fragNormal), lightDir), 0.35);

    fragColor = vec4(texColor.rgb * diff, texColor.a);
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
gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vertexShaderText));
gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderText));
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
}
gl.useProgram(program);

// Uniform locations de matrices y sampler
const matWorldUniformLocation = gl.getUniformLocation(program, 'mWorld');
const matViewUniformLocation  = gl.getUniformLocation(program, 'mView');
const matProjUniformLocation  = gl.getUniformLocation(program, 'mProj');
const samplerUniformLocation  = gl.getUniformLocation(program, 'sampler');

// =========================================================================
// 3. CARGA DE TEXTURAS 
// =========================================================================
// Función loadImage 
const loadImage = (url) => new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (err) => reject(err));
    image.src = url;
});

// Función de creación y configuración de textura en la GPU
function createTextureFromImage(gl, image) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Invertir el eje Y para alinear con el sistema de coordenadas WebGL
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    // Parámetros de envoltura y filtrado
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Subir imagen a la textura activa con texImage2D
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image
    );

    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
}

// =========================================================================
// 4. MODELOS 3D
// =========================================================================
// OBJETO 1: Jarrón / Cáliz 3D
function generateVaseModel(slices = 32, stacks = 24) {
    const vertices = [];
    const texcoords = [];
    const normals = [];
    const indices = [];

    for (let i = 0; i <= stacks; i++) {
        const v = i / stacks;
        const y = (v - 0.5) * 2.2;
        const r = 0.55 + 0.35 * Math.sin(v * Math.PI * 1.5) + 0.15 * Math.cos(v * Math.PI * 2.0);

        for (let j = 0; j <= slices; j++) {
            const u = j / slices;
            const theta = u * Math.PI * 2;
            const cosT = Math.cos(theta);
            const sinT = Math.sin(theta);

            vertices.push(r * cosT, y, r * sinT);
            texcoords.push(u * 2.0, v); // Repetición horizontal de textura
            normals.push(cosT, 0.2, sinT);
        }
    }

    for (let i = 0; i < stacks; i++) {
        for (let j = 0; j < slices; j++) {
            const first = i * (slices + 1) + j;
            const second = first + slices + 1;
            indices.push(first, second, first + 1);
            indices.push(second, second + 1, first + 1);
        }
    }
    return { vertices, texcoords, normals, indices };
}

// OBJETO 2: Toroide (Dona) 3D
function generateTorusModel(majorR = 0.85, minorR = 0.35, segR = 32, segT = 24) {
    const vertices = [];
    const texcoords = [];
    const normals = [];
    const indices = [];

    for (let i = 0; i <= segR; i++) {
        const u = i / segR;
        const theta = u * Math.PI * 2;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        for (let j = 0; j <= segT; j++) {
            const v = j / segT;
            const phi = v * Math.PI * 2;
            const cosP = Math.cos(phi);
            const sinP = Math.sin(phi);

            vertices.push((majorR + minorR * cosP) * cosT, minorR * sinP, (majorR + minorR * cosP) * sinT);
            texcoords.push(u * 3.0, v * 2.0); // Repetición de textura sobre el toroide
            normals.push(cosP * cosT, sinP, cosP * sinT);
        }
    }

    for (let i = 0; i < segR; i++) {
        for (let j = 0; j < segT; j++) {
            const first = i * (segT + 1) + j;
            const second = first + segT + 1;
            indices.push(first, first + 1, second);
            indices.push(second, first + 1, second + 1);
        }
    }
    return { vertices, texcoords, normals, indices };
}

// Configuración de Vertex Array Objects (VAO) para cada objeto
function initObjectBuffers(gl, model) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // Buffer de Posiciones
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.vertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    // Buffer de Coordenadas de Textura
    const texBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.texcoords), gl.STATIC_DRAW);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(1);

    // Buffer de Normales
    const normBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.normals), gl.STATIC_DRAW);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(2);

    // Buffer de Índices (IBO)
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(model.indices), gl.STATIC_DRAW);

    gl.bindVertexArray(null);

    return { vao, count: model.indices.length };
}

// =========================================================================
// 5. CÁMARA ORBITAL Y CONTROL DE RATÓN
// =========================================================================
let yaw = 0.45;
let pitch = 0.25;
let dist = 6.2;
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

    yaw += dx * 0.006;
    pitch += dy * 0.006;
    pitch = Math.max(-1.4, Math.min(1.4, pitch));
});
canvas.addEventListener('wheel', e => {
    dist += e.deltaY * 0.004;
    dist = Math.max(3.0, Math.min(12.0, dist));
    e.preventDefault();
}, { passive: false });

const projMatrix = new Float32Array(16);
const viewMatrix = new Float32Array(16);
const worldMatrix1 = new Float32Array(16);
const worldMatrix2 = new Float32Array(16);

// =========================================================================
// 6. FUNCIÓN PRINCIPAL Y RENDERIZADO 
// =========================================================================
const run = async () => {
    try {
        // Carga de imágenes PNG desde disco según las notas
        const img1 = await loadImage('./texture1.png');
        const img2 = await loadImage('./texture2.png');

        // Subida y configuración de textura en GPU
        const texture1 = createTextureFromImage(gl, img1);
        const texture2 = createTextureFromImage(gl, img2);

        // Inicializar geometrías de los dos objetos
        const object1 = initObjectBuffers(gl, generateVaseModel());
        const object2 = initObjectBuffers(gl, generateTorusModel());

        let angle = 0;

        const loop = function () {
            angle += 0.015;

            // Limpiar buffers de color y profundidad
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clearColor(0.10, 0.11, 0.15, 1.0);
            gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

            // Proyección y vista de la cámara
            mat4.perspective(projMatrix, glMatrix.toRadian(45), canvas.width / canvas.height, 0.1, 100.0);

            const eyeX = dist * Math.cos(pitch) * Math.sin(yaw);
            const eyeY = dist * Math.sin(pitch);
            const eyeZ = dist * Math.cos(pitch) * Math.cos(yaw);
            mat4.lookAt(viewMatrix, [eyeX, eyeY, eyeZ], [0, 0, 0], [0, 1, 0]);

            gl.uniformMatrix4fv(matProjUniformLocation, false, projMatrix);
            gl.uniformMatrix4fv(matViewUniformLocation, false, viewMatrix);

            // -------------------------------------------------------------
            // DIBUJAR OBJETO 1: Jarrón (X = -1.8) con texture1
            // -------------------------------------------------------------
            mat4.identity(worldMatrix1);
            mat4.translate(worldMatrix1, worldMatrix1, [-1.8, 0.0, 0.0]);
            mat4.rotateY(worldMatrix1, worldMatrix1, angle);
            gl.uniformMatrix4fv(matWorldUniformLocation, false, worldMatrix1);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture1);
            gl.uniform1i(samplerUniformLocation, 0);

            gl.bindVertexArray(object1.vao);
            gl.drawElements(gl.TRIANGLES, object1.count, gl.UNSIGNED_SHORT, 0);

            // -------------------------------------------------------------
            // DIBUJAR OBJETO 2: Toroide (X = +1.8) con texture2
            // -------------------------------------------------------------
            mat4.identity(worldMatrix2);
            mat4.translate(worldMatrix2, worldMatrix2, [1.8, 0.0, 0.0]);
            mat4.rotateX(worldMatrix2, worldMatrix2, angle * 0.8);
            mat4.rotateZ(worldMatrix2, worldMatrix2, angle * 0.5);
            gl.uniformMatrix4fv(matWorldUniformLocation, false, worldMatrix2);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture2);
            gl.uniform1i(samplerUniformLocation, 0);

            gl.bindVertexArray(object2.vao);
            gl.drawElements(gl.TRIANGLES, object2.count, gl.UNSIGNED_SHORT, 0);

            gl.bindVertexArray(null);

            requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
    } catch (err) {
        console.error('Error al cargar las texturas. Recuerda abrir el proyecto mediante un servidor local (Live Server):', err);
    }
};

run();