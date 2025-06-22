const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let score = 0;
let gameStarted = false;
let gameOver = false;
let lastTime = 0;
let explosion = null;
let invulnerable = false;
let invulnTimer = 0;
let lives = 3;
let nextLifeScore = 1500;
let selectedOption = 0;
const menuOptions = ['retry', 'exit'];
let meteorShowerWaveSchedule = [0, 7000, 14000];
let meteorShowerWavesLaunched = 0;
let isMeteorShower = false;
let meteorShowerTimer = 0;
let meteorShowerCooldown = 0;
let nextMeteorShowerScore = 5000;
let showMeteorWarning = false;
let meteorWarningTimer = 0;
let scoreAtMeteorShowerEnd = 0;
let chargeCooldown = 0;
const maxChargeCooldown = 2000;

let backgroundMusic = new Audio('Music/Human_Impact.mp3');
let meteorMusic = new Audio('Music/Electroman_Adventures.mp3');
backgroundMusic.loop = true;
meteorMusic.loop = true;
backgroundMusic.volume = 0.5;
meteorMusic.volume = 0.5;

const stars = [];
const STAR_COUNT = 100;
for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.5 + 0.5,
        speed: Math.random() * 0.5 + 0.2
    });
}

const ship = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 15,
    angle: 90 * Math.PI / 180,
    rotation: 0,
    thrusting: false,
    thrust: { x: 0, y: 0 },
    velocity: 0.1,
    friction: 0.99
};

const bullets = [];
const chargedShots = [];
const asteroids = [];
const ASTEROID_COUNT = 5;

function createAsteroid(x = null, y = null, size = 3) {
    const radiusMap = { 3: 40, 2: 25, 1: 15 };
    const speedMap = { 3: 1, 2: 1.5, 1: 2.5 };
    const radius = radiusMap[size];
    const speed = speedMap[size];
    const angle = Math.random() * Math.PI * 2;
    return {
        x: x ?? Math.random() * canvas.width,
        y: y ?? Math.random() * canvas.height,
        radius,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        size
    };
}

for (let i = 0; i < ASTEROID_COUNT; i++) {
    asteroids.push(createAsteroid());
}

const keys = {};
document.addEventListener('keydown', (e) => {
    if (!gameStarted) {
        startGame();
        return;
    }
    if (gameOver) {
    if (e.key === 'ArrowUp' || e.key === 'w') {
        selectedOption = (selectedOption + menuOptions.length - 1) % menuOptions.length;
        updateMenu();
    } else if (e.key === 'ArrowDown' || e.key === 's') {
        selectedOption = (selectedOption + 1) % menuOptions.length;
        updateMenu();
    } else if (e.code === 'Space' || e.key === 'Enter') {
        if (menuOptions[selectedOption] === 'retry') {
            resetGame();
            document.getElementById('game-over-screen').style.display = 'none';
        } else if (menuOptions[selectedOption] === 'exit') {
            document.getElementById('game-over-screen').style.display = 'none';
            document.getElementById('start-screen').style.display = 'block';
            document.getElementById('controls').style.display = 'none';
            resetGame();
            gameStarted = false;
        }
    }
    return;
}
    keys[e.key.toLowerCase()] = true;

    if (e.code === 'Space') shootBullet();
    if (e.key.toLowerCase() === 'x') shootChargedShot();
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousedown', (e) => {
    if (!gameStarted) return;
    if (gameOver) return;
    if (e.button === 0) shootBullet();        // click izquierdo
    if (e.button === 2) shootChargedShot();   // click derecho
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault()); // evitar menú contextual en click derecho

function shootBullet() {
    const bullet = {
        x: ship.x + Math.cos(ship.angle) * ship.radius,
        y: ship.y + Math.sin(ship.angle) * ship.radius,
        dx: Math.cos(ship.angle) * 7,
        dy: Math.sin(ship.angle) * 7
    };
    bullets.push(bullet);
}

function shootChargedShot() {
    if (chargeCooldown > 0) return;

    const beam = {
        x: ship.x,
        y: ship.y,
        angle: ship.angle,
        width: 20,
        length: 300,
        duration: 14,
        alpha: 1 // Transparencia inicial completa
    };
    chargedShots.push(beam);
    chargeCooldown = maxChargeCooldown;
}

function startMeteorShower() {
    isMeteorShower = true;
    meteorShowerTimer = 20000; // 20 segundos
    meteorShowerWavesLaunched = 0;

    backgroundMusic.pause();
    meteorMusic.currentTime = 0;
    meteorMusic.play();
    showMeteorWarning = false;
    meteorWarningTimer = 0;
}

function endMeteorShower() {
    isMeteorShower = false;
    meteorMusic.pause();
    backgroundMusic.currentTime = 0;
    backgroundMusic.play();

    scoreAtMeteorShowerEnd = score;  // Guardamos el score al terminar
}

function update(deltaTime) {
    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });

    if (keys['arrowleft'] || keys['a']) ship.rotation = -0.07;
    else if (keys['arrowright'] || keys['d']) ship.rotation = 0.07;
    else ship.rotation = 0;

    ship.angle += ship.rotation;
    ship.thrusting = keys['arrowup'] || keys['w'];

    if (ship.thrusting) {
        ship.thrust.x += Math.cos(ship.angle) * ship.velocity;
        ship.thrust.y += Math.sin(ship.angle) * ship.velocity;
    } else {
        ship.thrust.x *= ship.friction;
        ship.thrust.y *= ship.friction;
    }

    const maxSpeed = 4;
    const speed = Math.sqrt(ship.thrust.x ** 2 + ship.thrust.y ** 2);
    if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        ship.thrust.x *= scale;
        ship.thrust.y *= scale;
    }

    ship.x += ship.thrust.x;
    ship.y += ship.thrust.y;

    if (ship.x < 0) ship.x = canvas.width;
    if (ship.x > canvas.width) ship.x = 0;
    if (ship.y < 0) ship.y = canvas.height;
    if (ship.y > canvas.height) ship.y = 0;

    bullets.forEach(b => {
        b.x += b.dx;
        b.y += b.dy;
    });
    chargedShots.forEach(c => {
        c.duration--;
        c.alpha -= 1 / 20;
        if (c.alpha < 0) c.alpha = 0;
    });
for (let i = chargedShots.length - 1; i >= 0; i--) {
    if (chargedShots[i].duration <= 0 || chargedShots[i].alpha <= 0) {
        chargedShots.splice(i, 1);
    }
}

    asteroids.forEach(a => {
        a.x += a.dx;
        a.y += a.dy;
        if (a.x < 0) a.x = canvas.width;
        if (a.x > canvas.width) a.x = 0;
        if (a.y < 0) a.y = canvas.height;
        if (a.y > canvas.height) a.y = 0;
    });

    if (!isMeteorShower && score >= scoreAtMeteorShowerEnd + 5000 && !showMeteorWarning) {
    showMeteorWarning = true;
    meteorWarningTimer = 3000;
}

    if (showMeteorWarning) {
        meteorWarningTimer -= deltaTime;
        if (meteorWarningTimer <= 0) {
            showMeteorWarning = false;
            startMeteorShower();
            nextMeteorShowerScore += 5000;
        }
    }
    if (isMeteorShower) {
    meteorShowerTimer -= deltaTime;

    // Lanzar oleadas de meteoritos grandes según el schedule
    while (meteorShowerWavesLaunched < meteorShowerWaveSchedule.length &&
           meteorShowerTimer <= 20000 - meteorShowerWaveSchedule[meteorShowerWavesLaunched]) {
        
        let meteorsToSpawn = 0;
        if (meteorShowerWavesLaunched === 0) meteorsToSpawn = 2;
        else if (meteorShowerWavesLaunched === 1) meteorsToSpawn = 2;
        else if (meteorShowerWavesLaunched === 2) meteorsToSpawn = 4;

        for (let i = 0; i < meteorsToSpawn; i++) {
            const meteor = createAsteroid(null, null, 3);
            meteor.fromMeteorShower = true;
            asteroids.push(meteor);
        }

        meteorShowerWavesLaunched++;
    }

    // Meteoritos medianos que aparecen durante la lluvia, baja probabilidad
    if (meteorShowerTimer > 0 && Math.random() < 0.015) {
        const meteor = createAsteroid(null, null, 2);
        meteor.fromMeteorShower = true;
        asteroids.push(meteor);
    }

    // La lluvia no termina hasta que no queden meteoritos de la lluvia
    const remainingMeteorShower = asteroids.some(a => a.fromMeteorShower);
    if (meteorShowerTimer <= 0 && !remainingMeteorShower) {
        endMeteorShower();
    }
}


    // Colisiones balas normales
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const a = asteroids[i];
        for (let j = bullets.length - 1; j >= 0; j--) {
            const b = bullets[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < a.radius) {
                bullets.splice(j, 1);
                destroyAsteroid(i, a);
                break;
            }
        }
    }

    // Colisiones del rayo
    chargedShots.forEach(beam => {
        asteroids.forEach((a, i) => {
            const dx = a.x - beam.x;
            const dy = a.y - beam.y;
            const proj = dx * Math.cos(beam.angle) + dy * Math.sin(beam.angle);
            const perp = Math.abs(dx * Math.sin(beam.angle) - dy * Math.cos(beam.angle));
            if (proj > 0 && proj < beam.length && perp < a.radius + beam.width) {
                destroyAsteroid(i, a);
            }
        });
    });

    if (invulnerable) {
        invulnTimer -= deltaTime;
        if (invulnTimer <= 0) invulnerable = false;
    }

    if (!invulnerable && !gameOver) {
        for (let i = 0; i < asteroids.length; i++) {
            const dx = ship.x - asteroids[i].x;
            const dy = ship.y - asteroids[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < ship.radius + asteroids[i].radius) {
                lives--;
                invulnerable = true;
                invulnTimer = 2000; // 2 segundos de invulnerabilidad
                if (lives <= 0) {
                    gameOver = true;
                    explosion = { x: ship.x, y: ship.y, radius: 0, alpha: 1 };
                }
                break;
            }
        }
    }

    if (explosion) {
        explosion.radius += 3;
        explosion.alpha -= 0.02;
        if (explosion.alpha <= 0) {
            explosion = null;
            document.getElementById('game-over-screen').style.display = 'block';
            updateMenu();
        }
    }

    if (asteroids.length === 0 && !gameOver && !isMeteorShower) {
        for (let i = 0; i < ASTEROID_COUNT; i++) asteroids.push(createAsteroid());
    }

    if (chargeCooldown > 0) {
        chargeCooldown -= deltaTime;
        if (chargeCooldown < 0) chargeCooldown = 0;
    }
}

function destroyAsteroid(i, asteroid) {
    if (asteroid.size > 1) {
        const newSize = asteroid.size - 1;
        for (let j = 0; j < 2; j++) {
            const fragment = createAsteroid(asteroid.x, asteroid.y, newSize);
            if (asteroid.fromMeteorShower) fragment.fromMeteorShower = true;
            asteroids.push(fragment);
        }
    }
    asteroids.splice(i, 1);
    score += asteroid.size === 3 ? 150 : asteroid.size === 2 ? 100 : 50;

    if (score >= nextLifeScore && lives < 5) {
        lives++;
        nextLifeScore += 1500;
    }
}

function draw() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    // Balas normales en cyan
    ctx.fillStyle = 'cyan';
    bullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 2, 0, Math.PI * 2);
        ctx.fill();
    });
    
    chargedShots.forEach(c => {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.angle);
        ctx.globalAlpha = c.alpha; // Transparencia progresiva
        ctx.fillStyle = 'cyan';
        ctx.fillRect(0, -c.width / 2, c.length, c.width);
        ctx.restore();
        ctx.globalAlpha = 1;
    });

    // Asteroides
    asteroids.forEach(asteroid => {
        ctx.strokeStyle = asteroid.size === 3 ? '#888' : asteroid.size === 2 ? '#00aaff' : '#ff5050';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(asteroid.x, asteroid.y, asteroid.radius, 0, Math.PI * 2);
        ctx.stroke();
    });

    // Diseño original de la nave
    if (!gameOver && (!invulnerable || Math.floor(invulnTimer / 10) % 2 === 0)) {
        const angle = ship.angle;
        const r = ship.radius;
        const tip = {
            x: ship.x + Math.cos(angle) * r,
            y: ship.y + Math.sin(angle) * r
        };
        const left = {
            x: ship.x + Math.cos(angle + Math.PI * 2 / 3) * r,
            y: ship.y + Math.sin(angle + Math.PI * 2 / 3) * r
        };
        const right = {
            x: ship.x + Math.cos(angle + Math.PI * 4 / 3) * r,
            y: ship.y + Math.sin(angle + Math.PI * 4 / 3) * r
        };
        if (ship.thrusting) {
            ctx.fillStyle = 'orange';
            ctx.beginPath();
            ctx.moveTo(
                ship.x + Math.cos(angle + Math.PI) * r * 1.2,
                ship.y + Math.sin(angle + Math.PI) * r * 1.2
            );
            ctx.lineTo(left.x, left.y);
            ctx.lineTo(right.x, right.y);
            ctx.closePath();
            ctx.fill();
        }
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.moveTo(tip.x, tip.y);
        ctx.lineTo(left.x, left.y);
        ctx.lineTo(right.x, right.y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.moveTo(tip.x, tip.y);
        ctx.lineTo(
            ship.x + Math.cos(angle + Math.PI * 5 / 6) * r * 0.7,
            ship.y + Math.sin(angle + Math.PI * 5 / 6) * r * 0.7
        );
        ctx.lineTo(
            ship.x + Math.cos(angle + Math.PI * 7 / 6) * r * 0.7,
            ship.y + Math.sin(angle + Math.PI * 7 / 6) * r * 0.7
        );
        ctx.closePath();
        ctx.fill();
    }

    // Explosión
    if (explosion) {
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,100,0,${explosion.alpha})`;
        ctx.fill();
    }

    // Barra de enfriamiento del rayo
    const barWidth = 120, barHeight = 12;
    ctx.fillStyle = 'grey';
    ctx.fillRect(10, 40, barWidth, barHeight);
    const filledWidth = barWidth * (1 - chargeCooldown / maxChargeCooldown);
    ctx.fillStyle = 'cyan';
    ctx.fillRect(10, 40, filledWidth, barHeight);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 40, barWidth, barHeight);
    ctx.fillStyle = 'white';
    ctx.font = '14px monospace';
    ctx.fillText('Enfriamiento de rayo', 10, 35);

    // Vidas y puntos
    ctx.fillStyle = 'white';
    ctx.font = '16px monospace';
    ctx.fillText(`Vidas: ${lives}`, 10, 20);
    ctx.fillText(`Puntos: ${score}`, canvas.width - 120, 20);

    // Advertencia lluvia de estrellas
    if (showMeteorWarning) {
        ctx.fillStyle = 'yellow';
        ctx.font = '20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('¡Se aproxima la lluvia de estrellas!', canvas.width / 2, 50);
        ctx.textAlign = 'start';
    }
}

function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    update(deltaTime);
    draw();
    requestAnimationFrame(gameLoop);
}

function startGame() {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('controls').style.display = 'block';  // aquí muestras controles
    gameStarted = true;
    resetGame();
    backgroundMusic.currentTime = 0;
    backgroundMusic.play();
}

function updateMenu() {
    const retry = document.getElementById('retry-option');
    const exit = document.getElementById('exit-option');
    retry.textContent = (selectedOption === 0 ? '▶ ' : '') + 'Reintentar';
    exit.textContent = (selectedOption === 1 ? '▶ ' : '') + 'Salir';
}

function resetGame() {
    gameOver = false;
    lives = 3;
    score = 0;
    explosion = null;
    invulnerable = false;
    invulnTimer = 0;
    selectedOption = 0;
    ship.x = canvas.width / 2;
    ship.y = canvas.height / 2;
    ship.thrust = { x: 0, y: 0 };
    ship.angle = 90 * Math.PI / 180;
    bullets.length = 0;
    chargedShots.length = 0;
    asteroids.length = 0;
    isMeteorShower = false;
    /*meteorShowerTimer = 0;*/
    nextMeteorShowerScore = 5000;
    showMeteorWarning = false;
    meteorWarningTimer = 0;
    chargeCooldown = 0;
    backgroundMusic.currentTime = 0;
    backgroundMusic.play();
    meteorMusic.pause();
    for (let i = 0; i < ASTEROID_COUNT; i++) asteroids.push(createAsteroid());
    updateMenu();
}

requestAnimationFrame(gameLoop);
