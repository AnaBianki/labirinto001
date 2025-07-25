// Variáveis globais
let scene, camera, renderer, controls, clock, startTime, victory = false;
const cellSize = 10;
const maze = [
    "111111111111111",
    "100010000000001",
    "101110111111101",
    "101000001000101",
    "101011101011101",
    "100010101010101",
    "111010101010101",
    "100010101010101",
    "101110101011101",
    "101000001000101",
    "101011101010101",
    "100010101010101",
    "101110101010101",
    "100000000000001",
    "111111111111111"
].map(row => row.split('').map(Number));
const player = { x: 1.5, z: 1.5 };
const exit = { x: 13.5, z: 13.5 };
const keys = {};
const walkSpeed = 5;
const runSpeed = 15;
const headBobbingAmount = 0.2;
const headBobbingSpeed = 8;
let totalTime = 0;

const timerElem = document.getElementById("timer");

const openingScreen = document.createElement("div");
openingScreen.style = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(10,10,30,0.9); color: white;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    font-family: sans-serif; padding: 20px; z-index: 100;
    text-align: center;
`;
openingScreen.innerHTML = `
    <h1>Labirinto 3D</h1>
    <p>Você tem 6 minutos para sair do labirinto.</p>
    <p>Use WASD ou setas para andar e mouse para olhar.</p>
    <p>Pressione espaço para correr e R para reiniciar.</p>
    <button id="startBtn" style="padding:15px 30px; font-size:1.2em; cursor:pointer;">Começar</button>
`;
document.body.appendChild(openingScreen);
document.getElementById("startBtn").onclick = () => {
    openingScreen.style.display = "none";
    startGame();
};

function startGame() {
    init();
    startTime = Date.now();
    animate();
}

document.addEventListener("keydown", e => {
    keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === "r") location.reload();
});
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

function init() {
    scene = new THREE.Scene();

    const loader = new THREE.TextureLoader();
    loader.load("img/ceu8.jpg", (texture) => {
        scene.background = texture;
    }, undefined, () => {
        scene.background = new THREE.Color(0xADD8E6);
    });

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new THREE.PointerLockControls(camera, document.body);
    scene.add(controls.getObject());
    camera.position.set(player.x * cellSize, cellSize / 2, player.z * cellSize);

    document.body.addEventListener('click', () => {
        if (!controls.isLocked) controls.lock();
    });

    const ambient = new THREE.AmbientLight(0xcccccc);
    const directional = new THREE.DirectionalLight(0xffffff, 0.7);
    directional.position.set(1, 2, 1);
    scene.add(ambient, directional);

    loader.load("img/piso11.jpg", (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;

        const floorWidth = maze[0].length * cellSize + 100;
        const floorDepth = maze.length * cellSize + 100;

        texture.repeat.set(floorWidth / cellSize, floorDepth / cellSize);

        const floorMat = new THREE.MeshLambertMaterial({
            map: texture,
            side: THREE.DoubleSide
        });

        const floorGeo = new THREE.PlaneGeometry(floorWidth, floorDepth);
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(
            (maze[0].length * cellSize) / 2 - cellSize / 2,
            -0.01,
            (maze.length * cellSize) / 2 - cellSize / 2
        );

        scene.add(floor);
    }, undefined, () => {
        const floorWidth = maze[0].length * cellSize + 100;
        const floorDepth = maze.length * cellSize + 100;

        const fallbackFloor = new THREE.Mesh(
            new THREE.PlaneGeometry(floorWidth, floorDepth),
            new THREE.MeshLambertMaterial({
                color: 0x999999,
                side: THREE.DoubleSide
            })
        );
        fallbackFloor.rotation.x = -Math.PI / 2;
        fallbackFloor.position.y = 0.1;
        scene.add(fallbackFloor);
    });

    loader.load("img/sqd.jpg", (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1,1);
        const wallMat = new THREE.MeshLambertMaterial({ map: texture });
        const wallGroup = new THREE.Group();

        for (let z = 0; z < maze.length; z++) {
            for (let x = 0; x < maze[z].length; x++) {
                if (maze[z][x] === 1) {
                    const wall = new THREE.Mesh(new THREE.BoxGeometry(cellSize, cellSize, cellSize), wallMat);
                    wall.position.set(x * cellSize, cellSize / 2, z * cellSize);
                    wallGroup.add(wall);
                }
            }
        }
        scene.add(wallGroup);
    }, undefined, () => {
        const wallMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
        const wallGroup = new THREE.Group();

        for (let z = 0; z < maze.length; z++) {
            for (let x = 0; x < maze[z].length; x++) {
                if (maze[z][x] === 1) {
                    const wall = new THREE.Mesh(new THREE.BoxGeometry(cellSize, cellSize, cellSize), wallMat);
                    wall.position.set(x * cellSize, cellSize / 2, z * cellSize);
                    wallGroup.add(wall);
                }
            }
        }
        scene.add(wallGroup);
    });

    loader.load("img/porta5.jpg", (texture) => {
        const doorMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
        const door = new THREE.Mesh(
            new THREE.PlaneGeometry(6, 8),
            doorMat
        );
        const offset = -0.1;
        door.position.set(exit.x * cellSize, 4, exit.z * cellSize + offset);
        door.rotation.y = Math.PI;
        scene.add(door);
    });

    clock = new THREE.Clock();

    // --- Criar obstáculos vermelhos ---
    createRedObstacles();

    // --- Criar dicas azuis ---
    createBlueHints();
}

function updateMovement(delta) {
    if (!controls || !controls.isLocked) return;

    let currentMoveSpeed = walkSpeed * delta;
    let isMoving = false;

    if (keys[" "]) currentMoveSpeed = runSpeed * delta;

    if (keys["w"] || keys["arrowup"] || keys["s"] || keys["arrowdown"] ||
        keys["a"] || keys["arrowleft"] || keys["d"] || keys["arrowright"]) {
        isMoving = true;
    }

    if (keys["w"] || keys["arrowup"]) controls.moveForward(currentMoveSpeed);
    if (keys["s"] || keys["arrowdown"]) controls.moveForward(-currentMoveSpeed);
    if (keys["a"] || keys["arrowleft"]) controls.moveRight(-currentMoveSpeed);
    if (keys["d"] || keys["arrowright"]) controls.moveRight(currentMoveSpeed);

    const originalCameraY = cellSize / 2;
    if (isMoving) {
        totalTime += delta * headBobbingSpeed;
        const bobAmount = Math.sin(totalTime) * headBobbingAmount;
        camera.position.y = originalCameraY + bobAmount;
    } else {
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, originalCameraY, 0.1);
    }

    // Colisão simples
    const pos = controls.getObject().position;
    const cellX = Math.floor(pos.x / cellSize + 0.5);
    const cellZ = Math.floor(pos.z / cellSize + 0.5);
    if (maze[cellZ]?.[cellX] === 1) {
        pos.x = player.x * cellSize;
        pos.z = player.z * cellSize;
    }
}

function checkVictory() {
    if (victory) return;

    const pos = controls.getObject().position;
    const dx = pos.x - exit.x * cellSize;
    const dz = pos.z - exit.z * cellSize;

    if (Math.sqrt(dx*dx + dz*dz) < 3) {
        victory = true;
        alert("Parabéns! Você venceu!");
        location.reload();
    }
}

function createRedObstacles() {
    window.redSpheres = [];
    const redObstacles = [
        { x: 11.5 * cellSize, z: 11 * cellSize, speed: 2, direction: 1, label: "333" },
        { x: 11.5 * cellSize, z: 12 * cellSize, speed: 1.5, direction: -1, label: "124" }
    ];

    redObstacles.forEach(ob => {
        const geo = new THREE.SphereGeometry(2, 32, 32);
        const mat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const sphere = new THREE.Mesh(geo, mat);
        sphere.position.set(ob.x, 2, ob.z);

        // Número
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ob.label, 32, 32);
        const texture = new THREE.CanvasTexture(canvas);
        const labelMat = new THREE.SpriteMaterial({ map: texture });
        const label = new THREE.Sprite(labelMat);
        label.scale.set(4, 4, 1);
        label.position.set(0, 3, 0);
        sphere.add(label);

        scene.add(sphere);
        window.redSpheres.push({ mesh: sphere, ...ob });
    });
}

function createBlueHints() {
    window.blueSpheres = [];
    const blueHints = [
        { x: 3.5 * cellSize, z: 12.5 * cellSize, label: "120", msg: "Dica: siga sempre pela esquerda perto do final!" },
        { x: 5.5 * cellSize, z: 13.5 * cellSize, label: "222", msg: "Coragem! A saída está próxima, mas cuidado com as armadilhas vermelhas!" }
    ];

    blueHints.forEach(hint => {
        const geo = new THREE.SphereGeometry(2, 32, 32);
        const mat = new THREE.MeshBasicMaterial({ color: 0x0000ff });
        const sphere = new THREE.Mesh(geo, mat);
        sphere.position.set(hint.x, 2, hint.z);

        // Número
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(hint.label, 32, 32);
        const texture = new THREE.CanvasTexture(canvas);
        const labelMat = new THREE.SpriteMaterial({ map: texture });
        const label = new THREE.Sprite(labelMat);
        label.scale.set(4, 4, 1);
        label.position.set(0, 3, 0);
        sphere.add(label);

        scene.add(sphere);
        window.blueSpheres.push({ mesh: sphere, msg: hint.msg });
    });
}

function updateObstaclesAndCheckCollisions(delta) {
    // Movimenta obstáculos vermelhos
    window.redSpheres.forEach(ob => {
        ob.mesh.position.x += ob.direction * ob.speed * delta;
        if (ob.mesh.position.x > 13 * cellSize || ob.mesh.position.x < 10 * cellSize) {
            ob.direction *= -1;
        }

        const dx = ob.mesh.position.x - camera.position.x;
        const dz = ob.mesh.position.z - camera.position.z;
        if (Math.sqrt(dx*dx + dz*dz) < 3) {
            alert("Você colidiu com um obstáculo vermelho! Recomeçando...");
            location.reload();
        }
    });

    // Checa bolas azuis
    window.blueSpheres.forEach(ob => {
        if (ob.mesh.position.y < 0) return;
        const dx = ob.mesh.position.x - camera.position.x;
        const dz = ob.mesh.position.z - camera.position.z;
        if (Math.sqrt(dx*dx + dz*dz) < 3) {
            alert(ob.msg);
            ob.mesh.position.y = -1000; // remove da cena
        }
    });
}

function animate() {
    if (!clock) return;
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (!victory) {
        updateMovement(delta);
        checkVictory();

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        timerElem.textContent = elapsed;

        if (elapsed >= 360) {
            alert("Tempo esgotado! Você perdeu.");
            location.reload();
        }
    }

    updateObstaclesAndCheckCollisions(delta);

    renderer.render(scene, camera);
}
const minimap = document.getElementById("minimap");
const ctx = minimap.getContext("2d");

function drawMinimap() {
  ctx.clearRect(0, 0, minimap.width, minimap.height);

  const scaleX = minimap.width / maze[0].length;
  const scaleZ = minimap.height / maze.length;

  // Desenha paredes
  for (let z = 0; z < maze.length; z++) {
    for (let x = 0; x < maze[z].length; x++) {
      if (maze[z][x] === 1) {
        ctx.fillStyle = "white";
        ctx.fillRect(x * scaleX, z * scaleZ, scaleX, scaleZ);
      }
    }
  }

  // Desenha saída (porta)
  ctx.fillStyle = "green";
  ctx.fillRect(exit.x * scaleX - scaleX/2, exit.z * scaleZ - scaleZ/2, scaleX, scaleZ);

  // Desenha player
  if (controls && controls.isLocked) {
    const pos = controls.getObject().position;
    const px = pos.x / cellSize * scaleX;
    const pz = pos.z / cellSize * scaleZ;

    ctx.fillStyle = "yellow";
    ctx.beginPath();
    ctx.arc(px, pz, scaleX / 3, 0, 2 * Math.PI);
    ctx.fill();
  }
}

function update() {
  drawMinimap();
  requestAnimationFrame(update);
}

update();
function drawMinimap() {
    const canvas = document.getElementById("minimap");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scaleX = canvas.width / maze[0].length;
    const scaleZ = canvas.height / maze.length;

    for (let z = 0; z < maze.length; z++) {
        for (let x = 0; x < maze[z].length; x++) {
            ctx.fillStyle = maze[z][x] === 1 ? "#888" : "#222";
            ctx.fillRect(x * scaleX, z * scaleZ, scaleX, scaleZ);
        }
    }
    // Jogador
    ctx.fillStyle = "cyan";
    ctx.beginPath();
    ctx.arc(player.x * scaleX, player.z * scaleZ, Math.min(scaleX, scaleZ)/4, 0, Math.PI * 2);
    ctx.fill();

    // Saída
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(exit.x * scaleX, exit.z * scaleZ, Math.min(scaleX, scaleZ)/4, 0, Math.PI * 2);
    ctx.fill();
}
