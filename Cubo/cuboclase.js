const vertexShaderSource = `#version 300 es
#pragma vscode_glsllint_stage: vert

layout(location=0) in vec4 aPosition;
uniform mat4 matrix;
//uniform vec4 translation;
void main()
{
    gl_Position = matrix*aPosition;
}`;

const fragmentShaderSource = `#version 300 es
#pragma vscode_glsllint_stage: frag

precision mediump float;
out vec4 fragColor;

void main()
{
    fragColor = vec4(1,0,0,1);
}`;

const canvas = document.querySelector('canvas');
const gl = canvas.getContext('webgl2');
const program = gl.createProgram();

const vertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertexShader, vertexShaderSource);
gl.compileShader(vertexShader);
gl.attachShader(program, vertexShader);

const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragmentShader, fragmentShaderSource);
gl.compileShader(fragmentShader);
gl.attachShader(program, fragmentShader);

gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.log(gl.getShaderInfoLog(vertexShader));
    console.log(gl.getShaderInfoLog(fragmentShader));
}

gl.useProgram(program);

const arrayVertexData = new Float32Array([
	0,0,				
	0.00000,1.00000,	
	0.95106,0.30902,	

	0,0,				
	0.95106,0.30902,	
	0.58779,-.80902,	

	0,0,				
	0.58779,-.80902,	
	-.58779,-.80902,	

	0,0,				
	-.58779,-.80902,	
	-.95106,0.30902,	

	0,0,				
	-.95106,0.30902,	
	0.00000,1.00000,	
]);
const elementVertexData = new Float32Array([
	0,0,				
	0.00000,1.00000,	
	0.95106,0.30902,	
	0.58779,-.80902,	
	-.58779,-.80902,	
	-.95106,0.30902,	
]);
const elementIndexData = new Uint8Array([
	0,1,2,
	0,2,3,
	0,3,4,
	0,4,5,
	0,5,1,
]);

//const matrix = mat4.create();

//mat4.translate(matrix, matrix, [0.2, 0.5, 0]);
//mat4.scale(matrix, matrix, [0.25, 0.25, 0.25]);
//mat4.rotateZ(matrix, matrix, Math.PI/2);
//console.log(matrix);

const elementVertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, elementVertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, elementVertexData, gl.STATIC_DRAW);

const elementIndexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementIndexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, elementIndexData, gl.STATIC_DRAW);	


gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
//gl.vertexAttrib4f(1,1,0,0,1 );
gl.enableVertexAttribArray(0);

//=====================translation
//var Tx=0.0, Ty=0.5, Tz=0.5;
//var translation = gl.getUniformLocation(program, 'translation');
//gl.uniform4f(translation, Tx, Ty, Tz, 0.0);
const uniformLocations = {
	matrix:gl.getUniformLocation(program,'matrix')
};
const matrix = mat4.create();
mat4.translate(matrix, matrix, [0.2, 0.5, 0]);
mat4.scale(matrix, matrix, [0.25, 0.25, 0.25]);
//gl.uniformMatrix4fv(uniformLocations.matrix, false, matrix);
function animate() {
    requestAnimationFrame(animate);
    mat4.rotateZ(matrix, matrix, Math.PI/2 / 70);
    gl.uniformMatrix4fv(uniformLocations.matrix, false, matrix);
    //gl.drawArrays(gl.TRIANGLES, 0, 3);
	gl.drawElements(gl.TRIANGLES, 12, gl.UNSIGNED_BYTE, 0);
}
animate();
//gl.drawArrays(gl.TRIANGLES, 0, 15);
//gl.drawElements(gl.TRIANGLES, 12, gl.UNSIGNED_BYTE, 0);