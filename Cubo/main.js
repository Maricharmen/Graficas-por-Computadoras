const vertexShaderSource = `#version 300 es
layout(location = 0) in vec3 aPosition;
uniform mat4 matrix;

void main() {
    gl_Position = matrix * vec4(aPosition, 1.0);
}`;

const fragmentShaderSource = `#version 300 es
precision mediump float;
out vec4 fragColor;

void main() {
    fragColor = vec4(0.9, 0.1, 0.1, 1.0);
}`;

const canvas = document.querySelector('#glCanvas');
const gl = canvas.getContext('webgl2');

if (!gl) {
    throw new Error('WebGL2 no está disponible en este navegador.');
}

const { mat4 } = glMatrix;

function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(message);
    }

    return shader;
}

const program = gl.createProgram();
gl.attachShader(program, createShader(gl.VERTEX_SHADER, vertexShaderSource));
gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fragmentShaderSource));
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
}

gl.useProgram(program);

const vertexData = new Float32Array([
    -1, -1, -1,  1, -1, -1,  1,  1, -1, -1,  1, -1,
    -1, -1,  1,  1, -1,  1,  1,  1,  1, -1,  1,  1,
]);

const indexData = new Uint8Array([
    0, 1, 2,  0, 2, 3,
    4, 6, 5,  4, 7, 6,
    0, 4, 5,  0, 5, 1,
    3, 2, 6,  3, 6, 7,
    1, 5, 6,  1, 6, 2,
    0, 3, 7,  0, 7, 4,
]);

const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(0);

const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);

const matrixLocation = gl.getUniformLocation(program, 'matrix');
const projection = mat4.create();
const view = mat4.create();
const model = mat4.create();
const matrix = mat4.create();

mat4.perspective(projection, Math.PI / 4, canvas.width / canvas.height, 0.1, 100);
mat4.lookAt(view, [3, 3, 4], [0, 0, 0], [0, 1, 0]);
gl.enable(gl.DEPTH_TEST);

function render(time) {
    const seconds = time * 0.001;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.95, 0.96, 0.98, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.identity(model);
    mat4.rotateY(model, model, seconds);
    mat4.rotateX(model, model, seconds * 0.7);
    mat4.multiply(matrix, view, model);
    mat4.multiply(matrix, projection, matrix);

    gl.uniformMatrix4fv(matrixLocation, false, matrix);
    gl.drawElements(gl.TRIANGLES, indexData.length, gl.UNSIGNED_BYTE, 0);
    requestAnimationFrame(render);
}

requestAnimationFrame(render);
