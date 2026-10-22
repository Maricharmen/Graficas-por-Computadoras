// =========================================================================
// 1. FUNCIONES DE CARGA
// =========================================================================

// Pide un archivo de texto al servidor y, cuando llega, se lo pasa al callback.
// Le agrego un número aleatorio a la URL para que el navegador no use una copia
// guardada en caché y siempre traiga la versión más nueva del archivo.
var loadTextResource = function (url, callback) {
    var request = new XMLHttpRequest();
    request.open('GET', url + '?please-dont-cache=' + Math.random(), true);
    request.onload = function () {
        if (request.status < 200 || request.status > 299) {
            callback('Error. HTTP Status ' + request.status + ' on resource ' + url);
        } else {
            callback(null, request.responseText);
        }
    };
    request.send();
};

// Usa la función de arriba para traer el archivo y luego lo convierte de texto
// a un objeto de JavaScript. Si el JSON viene mal escrito, regresa el error.
var loadJSONResource = function (url, callback) {
    loadTextResource(url, function (err, result) {
        if (err) {
            callback(err);
        } else {
            try {
                callback(null, JSON.parse(result));
            } catch (e) {
                callback(e);
            }
        }
    });
};

// =========================================================================
// 2. SHADERS
// =========================================================================

// Vertex shader: se ejecuta una vez por cada vértice. Recibe su posición y su
// color, y multiplica la posición por las matrices de mundo, vista y proyección
// para saber en qué lugar de la pantalla tiene que aparecer.
var vertexShaderText = `
precision mediump float;
attribute vec3 vertPosition;
attribute vec4 vertColor;

uniform mat4 mWorld;
uniform mat4 mView;
uniform mat4 mProj;

varying vec4 fragColor;

void main() {
    fragColor = vertColor;
    gl_Position = mProj * mView * mWorld * vec4(vertPosition, 1.0);
}
`;

// Fragment shader: se ejecuta por cada píxel y solo lo pinta con el color que
// le mandó el vertex shader.
var fragmentShaderText = `
precision mediump float;

varying vec4 fragColor;

void main() {
    gl_FragColor = fragColor;
}
`;

// =========================================================================
// 3. INICIALIZACIÓN PRINCIPAL
// =========================================================================

// Primero carga el modelo del terreno y, ya que lo tiene, arranca todo lo demás.
// Si quiero ver otro modelo, solo cambio el nombre del archivo aquí.
var iniciarDemo = function () {
    loadJSONResource('./terreno_montana.json', function (errorModelo, modelo) {
        if (errorModelo) {
            console.error(errorModelo);
        } else {
            ejecutarDemo(vertexShaderText, fragmentShaderText, modelo);
        }
    });
};

// =========================================================================
// 4. EJECUCIÓN Y CONSTRUCCIÓN DEL ÁRBOL
// =========================================================================
var ejecutarDemo = function (vertexShaderText, fragmentShaderText, modelo) {
    // Tomo el canvas del HTML y le pido el contexto de WebGL. Algunos
    // navegadores viejos solo lo dan con el nombre 'experimental-webgl'.
    var canvas = document.getElementById('game-surface');
    var gl = canvas.getContext('webgl');

    if (!gl) {
        gl = canvas.getContext('experimental-webgl');
    }
    if (!gl) {
        alert('WebGL no soportado');
        return;
    }

    // Fondo negro. El depth test hace que lo que está más cerca tape a lo que
    // está atrás, y el blending permite que la malla se vea transparente.
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Creo los dos shaders, les paso su código, los compilo y los junto en un
    // solo programa, que es el que la tarjeta de video va a usar para dibujar.
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(vertexShader, vertexShaderText);
    gl.shaderSource(fragmentShader, fragmentShaderText);
    gl.compileShader(vertexShader);
    gl.compileShader(fragmentShader);

    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    // ---------------------------------------------------------------------
    // A. EXTRACCIÓN DE VÉRTICES E ÍNDICES DEL MODELO
    // ---------------------------------------------------------------------

    // Los vértices vienen en una sola lista [x, y, z, x, y, z, ...], así que
    // cada 3 números son un punto. Las caras vienen como [[a, b, c], ...] y las
    // aplano en una sola lista; cada 3 índices forman un triángulo.
    var verticesMalla = modelo.meshes[0].vertices;
    var indicesMalla = [].concat.apply([], modelo.meshes[0].faces);
    var numVertices = verticesMalla.length / 3;

    // Mando las posiciones de los vértices a la tarjeta de video
    var bufferPosicionesMalla = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferPosicionesMalla);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verticesMalla), gl.STATIC_DRAW);

    // Mando los índices, que le dicen qué vértices se unen para formar cada triángulo
    var bufferIndicesMalla = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferIndicesMalla);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indicesMalla), gl.STATIC_DRAW);

    // A todos los vértices de la malla les doy el mismo azul oscuro con poca
    // opacidad (0.45), para que la superficie se vea apagada y el árbol resalte
    var coloresMalla = [];
    for (var i = 0; i < numVertices; i++) {
        coloresMalla.push(0.18, 0.22, 0.32, 0.45);
    }
    var bufferColoresMalla = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferColoresMalla);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coloresMalla), gl.STATIC_DRAW);

    // Busco dónde quedaron los atributos de posición y color dentro del shader
    var positionAttribLocation = gl.getAttribLocation(program, 'vertPosition');
    var colorAttribLocation = gl.getAttribLocation(program, 'vertColor');

    // ---------------------------------------------------------------------
    // B. CONSTRUCCIÓN DEL GRAFO DE ADYACENCIA Y ÁRBOL DE VÉRTICES
    // ---------------------------------------------------------------------

    // Convierto la malla en un grafo: para cada vértice guardo una lista con
    // sus vecinos. Si tres vértices forman un triángulo, cada uno es vecino de
    // los otros dos. Un vecino puede repetirse si comparten varios triángulos,
    // pero no importa porque luego reviso si ya lo visité.
    var adyacencia = Array.from({ length: numVertices }, function () { return []; });

    for (var cara = 0; cara < indicesMalla.length; cara += 3) {
        var v0 = indicesMalla[cara];
        var v1 = indicesMalla[cara + 1];
        var v2 = indicesMalla[cara + 2];

        adyacencia[v0].push(v1, v2);
        adyacencia[v1].push(v0, v2);
        adyacencia[v2].push(v0, v1);
    }

    // El árbol empieza en el vértice 0. Sus líneas van en buffers aparte para
    // poder reconstruirlas cada vez que cambie la raíz.
    var verticeRaiz = 0;
    var bufferPosicionesArbol = gl.createBuffer();
    var bufferColoresArbol = gl.createBuffer();
    var numVerticesArbol = 0;

    // Arma el árbol con un recorrido en anchura (BFS): empieza en la raíz,
    // visita a todos sus vecinos, luego a los vecinos de esos, y así hasta
    // llegar a todos los vértices. Cada vez que llego a un vértice nuevo,
    // guardo la línea desde el vértice de donde vine; esas líneas son las
    // ramas del árbol. Como nunca regreso a un vértice ya visitado, no se
    // forman ciclos.
    function construirArbolDesdeRaiz(raiz) {
        var visitados = new Uint8Array(numVertices);
        var cola = [raiz];
        visitados[raiz] = 1;

        var posicionesLineas = [];
        var coloresLineas = [];

        // En vez de sacar elementos de la cola con shift() (que es lento),
        // solo muevo este índice hacia adelante
        var frente = 0;
        while (frente < cola.length) {
            var u = cola[frente++];

            for (var k = 0; k < adyacencia[u].length; k++) {
                var v = adyacencia[u][k];
                if (!visitados[v]) {
                    visitados[v] = 1;
                    cola.push(v);

                    // Guardo la rama de u a v como dos puntos 3D (inicio y fin de la línea)
                    posicionesLineas.push(
                        verticesMalla[u * 3], verticesMalla[u * 3 + 1], verticesMalla[u * 3 + 2],
                        verticesMalla[v * 3], verticesMalla[v * 3 + 1], verticesMalla[v * 3 + 2]
                    );

                    // Las ramas que salen de la raíz van en rojo para ubicarla
                    // fácil; todas las demás van en verde
                    var esRaiz = (u === raiz || v === raiz);
                    var color = esRaiz ? [1.0, 0.28, 0.35, 1.0] : [0.2, 0.9, 0.3, 1.0];

                    // Un color por cada punto de la línea (son dos)
                    coloresLineas.push(
                        color[0], color[1], color[2], color[3],
                        color[0], color[1], color[2], color[3]
                    );
                }
            }
        }

        // Cuántos puntos tengo que dibujar en total para las líneas
        numVerticesArbol = posicionesLineas.length / 3;

        // Mando las líneas y sus colores a la tarjeta de video
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferPosicionesArbol);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(posicionesLineas), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, bufferColoresArbol);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coloresLineas), gl.STATIC_DRAW);
    }

    construirArbolDesdeRaiz(verticeRaiz);

    // Al presionar el botón se elige un vértice al azar como nueva raíz y se
    // vuelve a armar el árbol, que crece de forma distinta desde ese punto
    document.getElementById('btnNuevaRaiz').addEventListener('click', function () {
        verticeRaiz = Math.floor(Math.random() * numVertices);
        construirArbolDesdeRaiz(verticeRaiz);
    });

    // ---------------------------------------------------------------------
    // C. CÁMARA ORBITAL Y MATRICES
    // ---------------------------------------------------------------------

    // Busco dónde están las matrices dentro del shader para poder mandarles valores
    var matWorldUniformLocation = gl.getUniformLocation(program, 'mWorld');
    var matViewUniformLocation = gl.getUniformLocation(program, 'mView');
    var matProjUniformLocation = gl.getUniformLocation(program, 'mProj');

    // worldMatrix: cómo se mueve o gira el modelo
    // viewMatrix: desde dónde lo está viendo la cámara
    // projMatrix: la perspectiva (lo lejano se ve más chico)
    var worldMatrix = new Float32Array(16);
    var viewMatrix = new Float32Array(16);
    var projMatrix = new Float32Array(16);

    mat4.identity(worldMatrix);

    // La cámara gira alrededor del modelo:
    // yaw es el giro hacia los lados, pitch qué tan arriba o abajo está, y
    // distancia qué tan lejos está del centro
    var yaw = 0.6;
    var pitch = 0.35;
    var distancia = 4.2;
    var arrastrando = false;
    var ultimoMouseX = 0, ultimoMouseY = 0;

    // Al hacer clic empiezo a arrastrar y guardo dónde estaba el mouse
    canvas.addEventListener('mousedown', function (e) {
        arrastrando = true;
        ultimoMouseX = e.clientX;
        ultimoMouseY = e.clientY;
    });
    // Escucho en toda la ventana para que deje de arrastrar aunque suelte
    // el botón fuera del canvas
    window.addEventListener('mouseup', function () { arrastrando = false; });

    // Mientras arrastro, lo que se mueve el mouse se convierte en giro de la
    // cámara. El pitch lo limito para que la cámara no se dé la vuelta por
    // arriba o por abajo del modelo.
    canvas.addEventListener('mousemove', function (e) {
        if (!arrastrando) return;
        var dx = e.clientX - ultimoMouseX;
        var dy = e.clientY - ultimoMouseY;
        ultimoMouseX = e.clientX;
        ultimoMouseY = e.clientY;

        yaw += dx * 0.007;
        pitch += dy * 0.007;
        pitch = Math.max(-1.4, Math.min(1.4, pitch));
    });

    // La rueda del mouse acerca o aleja la cámara, con un mínimo y un máximo.
    // preventDefault evita que la página haga scroll al mismo tiempo (para eso
    // se necesita passive: false).
    canvas.addEventListener('wheel', function (e) {
        distancia += e.deltaY * 0.003;
        distancia = Math.max(2.0, Math.min(9.0, distancia));
        e.preventDefault();
    }, { passive: false });

    // ---------------------------------------------------------------------
    // D. BUCLE DE RENDERIZADO
    // ---------------------------------------------------------------------

    // Esta función se repite en cada cuadro de la animación
    var angulo = 0;
    var bucle = function () {
        // Un poquito más de giro en cada cuadro para que el modelo rote solo
        angulo += 0.008;

        // Ajusto el área de dibujo al tamaño del canvas y borro lo del cuadro anterior
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Perspectiva con un campo de visión de 45 grados
        mat4.perspective(projMatrix, glMatrix.toRadian(45), canvas.width / canvas.height, 0.1, 1000.0);

        // Con yaw, pitch y distancia calculo en qué punto está la cámara y la
        // pongo a mirar hacia el centro (0, 0, 0)
        var camaraX = distancia * Math.cos(pitch) * Math.sin(yaw);
        var camaraY = distancia * Math.sin(pitch);
        var camaraZ = distancia * Math.cos(pitch) * Math.cos(yaw);
        mat4.lookAt(viewMatrix, [camaraX, camaraY, camaraZ], [0, 0, 0], [0, 1, 0]);

        // Giro el modelo sobre el eje Y (vertical)
        mat4.identity(worldMatrix);
        mat4.rotateY(worldMatrix, worldMatrix, angulo);

        // Mando las tres matrices al shader
        gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
        gl.uniformMatrix4fv(matViewUniformLocation, gl.FALSE, viewMatrix);
        gl.uniformMatrix4fv(matProjUniformLocation, gl.FALSE, projMatrix);

        // 1. Dibujo la malla: conecto los buffers de posiciones y colores de la
        // malla al shader y dibujo los triángulos usando los índices
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferPosicionesMalla);
        gl.vertexAttribPointer(positionAttribLocation, 3, gl.FLOAT, gl.FALSE, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
        gl.enableVertexAttribArray(positionAttribLocation);

        gl.bindBuffer(gl.ARRAY_BUFFER, bufferColoresMalla);
        gl.vertexAttribPointer(colorAttribLocation, 4, gl.FLOAT, gl.FALSE, 4 * Float32Array.BYTES_PER_ELEMENT, 0);
        gl.enableVertexAttribArray(colorAttribLocation);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferIndicesMalla);
        gl.drawElements(gl.TRIANGLES, indicesMalla.length, gl.UNSIGNED_SHORT, 0);

        // 2. Dibujo el árbol encima: cambio los mismos atributos para que ahora
        // lean de los buffers del árbol y dibujo cada par de puntos como una línea
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferPosicionesArbol);
        gl.vertexAttribPointer(positionAttribLocation, 3, gl.FLOAT, gl.FALSE, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
        gl.enableVertexAttribArray(positionAttribLocation);

        gl.bindBuffer(gl.ARRAY_BUFFER, bufferColoresArbol);
        gl.vertexAttribPointer(colorAttribLocation, 4, gl.FLOAT, gl.FALSE, 4 * Float32Array.BYTES_PER_ELEMENT, 0);
        gl.enableVertexAttribArray(colorAttribLocation);

        gl.drawArrays(gl.LINES, 0, numVerticesArbol);

        // Le pido al navegador que vuelva a llamar a esta función en el siguiente cuadro
        requestAnimationFrame(bucle);
    };

    requestAnimationFrame(bucle);
};

iniciarDemo();
