/* Main script for the magical 3D birthday room */
const container = document.getElementById("scene-container");
const loadingScreen = document.getElementById("loading-screen");
const messageOverlay = document.getElementById("message-overlay");
const messageCard = messageOverlay.querySelector(".message-card");
const closeMessageBtn = document.getElementById("close-message");
const messageText = document.getElementById("message-text");
const prevMessageBtn = document.getElementById("prev-message");
const nextMessageBtn = document.getElementById("next-message");
const messageIndicator = document.getElementById("message-indicator");
const sceneDim = document.getElementById("scene-dim");
const wishText = document.getElementById("wish-text");
const releaseBtn = document.getElementById("release-balloons");
const musicToggle = document.getElementById("music-toggle");
const bgMusic = document.getElementById("bg-music");

const messages = [
  "Thank you for being the light in my life. You make every day feel magical.",
  "My favorite memories are the ones we create together. I cherish every laugh and every adventure.",
  "My wish for you: endless joy, gentle days, and a heart that always feels loved."
];
let currentMessageIndex = 0;

let scene;
let camera;
let renderer;

let giftBox;
let cakeGroup;
let particlesGroup;
let balloons = [];
let sparkleGroup;
let starField;
let pinkLight;
let blueLight;
let movingLight;

const flameMeshes = [];

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clock = new THREE.Clock();

const isDesktop = window.matchMedia("(pointer: fine)").matches;

let orbitAngle = 0;
const orbitRadius = 8;
let orbitActive = true;
let isZooming = false;
let returningToOrbit = false;
let zoomStart = 0;
const zoomDuration = 1200;
const startCamPos = new THREE.Vector3();
const targetCamPos = new THREE.Vector3(3, 2.2, 3);
let returnStart = 0;
const returnDuration = 1400;
const returnFrom = new THREE.Vector3();
const returnTo = new THREE.Vector3();

let burstActive = false;
let burstStartTime = 0;
const particleLifetime = 2.2;

let sparkleActive = false;
let sparkleStart = 0;

let candlesLit = true;
let wishTimeout = null;
let releaseInProgress = false;
let isMessageOpen = false;
let musicMuted = false;

let desktopDragging = false;
let suppressClick = false;
let lastPointerX = 0;

initScene();
animate();

/* -------- Scene setup -------- */
function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02010a);

  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 120);
  camera.position.set(8, 4, 8);
  camera.lookAt(0, 1.5, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  addLights();
  createRoom();
  createBackgroundField();
  createCake();
  createBalloons();
  createGiftBox();
  createParticles();
  createCakeSparkles();
  createPhotoCorner();

  updateMessageContent();
  updateMusicIcon();

  /* Event listeners */
  window.addEventListener("resize", onWindowResize);
  renderer.domElement.addEventListener("click", onClick);
  renderer.domElement.addEventListener("touchend", onTouchEnd, { passive: false });
  renderer.domElement.addEventListener("dblclick", releaseBalloons);

  if (isDesktop) {
    renderer.domElement.addEventListener("pointerdown", onPointerDownDrag);
    window.addEventListener("pointermove", onPointerMoveDrag);
    window.addEventListener("pointerup", onPointerUpDrag);
  }

  prevMessageBtn.addEventListener("click", () => changeMessage(-1));
  nextMessageBtn.addEventListener("click", () => changeMessage(1));
  closeMessageBtn.addEventListener("click", hideMessageOverlay);
  releaseBtn.addEventListener("click", releaseBalloons);
  musicToggle.addEventListener("click", toggleMusic);

  // Gentle fake loading delay so the overlay always shows briefly
  setTimeout(() => fadeOutLoadingScreen(), 1500);
}

function addLights() {
  const ambient = new THREE.AmbientLight(0xfdf2ff, 0.7);
  scene.add(ambient);

  const spot = new THREE.SpotLight(0xfff9e8, 1.2, 40, Math.PI / 4, 0.35);
  spot.position.set(6, 9, 6);
  spot.target.position.set(0, 0, 0);
  scene.add(spot);
  scene.add(spot.target);

  pinkLight = new THREE.PointLight(0xff8dd6, 1.3, 18);
  pinkLight.position.set(0.5, 2.4, 0.6);
  scene.add(pinkLight);

  blueLight = new THREE.PointLight(0x7ab8ff, 1.2, 18);
  blueLight.position.set(-2.5, 3.5, -1.2);
  scene.add(blueLight);

  movingLight = new THREE.PointLight(0xfff6b3, 0.6, 9);
  movingLight.position.set(0, 4, 0);
  scene.add(movingLight);
}

/* -------- Room + decor -------- */
function createRoom() {
  const roomSize = 14;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(roomSize, roomSize),
    new THREE.MeshStandardMaterial({
      color: 0x1b1a2f,
      roughness: 0.7,
      metalness: 0.1
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  const gradientTexture = createVerticalGradientTexture("#0a0613", "#1a1440");
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.85,
    map: gradientTexture
  });

  const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(roomSize, roomSize * 0.7),
    wallMaterial
  );
  backWall.position.set(0, (roomSize * 0.7) / 2, -roomSize / 2);
  scene.add(backWall);

  const sideWall = new THREE.Mesh(
    new THREE.PlaneGeometry(roomSize, roomSize * 0.7),
    wallMaterial.clone()
  );
  sideWall.rotation.y = Math.PI / 2;
  sideWall.position.set(-roomSize / 2, (roomSize * 0.7) / 2, 0);
  scene.add(sideWall);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(roomSize, roomSize),
    new THREE.MeshStandardMaterial({
      color: 0x211b4a,
      roughness: 0.8
    })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, roomSize * 0.7, 0);
  scene.add(ceiling);
}

function createBackgroundField() {
  const starCount = 400;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * 40;
    positions[i3 + 1] = 2 + Math.random() * 15;
    positions[i3 + 2] = -10 - Math.random() * 25;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.08,
    transparent: true,
    opacity: 0.7
  });
  starField = new THREE.Points(starGeo, starMat);
  scene.add(starField);
}

function createCake() {
  cakeGroup = new THREE.Group();
  cakeGroup.name = "cakeInteract";

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 0.7, 32),
    new THREE.MeshStandardMaterial({
      color: 0xffc6d7,
      roughness: 0.7
    })
  );
  cakeGroup.add(base);

  const topLayer = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 0.5, 32),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5
    })
  );
  topLayer.position.y = 0.6;
  cakeGroup.add(topLayer);

  const candleGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.65, 12);
  const candleMat = new THREE.MeshStandardMaterial({ color: 0xfff1a8 });

  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const candle = new THREE.Mesh(candleGeo, candleMat);
    candle.position.set(Math.cos(angle) * 0.55, 1.1, Math.sin(angle) * 0.55);
    cakeGroup.add(candle);

    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffdd66 })
    );
    flame.position.set(
      candle.position.x,
      candle.position.y + 0.4,
      candle.position.z
    );
    flame.userData = { targetScale: 1 };
    flameMeshes.push(flame);
    cakeGroup.add(flame);
  }

  cakeGroup.position.set(0, 0.4, 0);
  scene.add(cakeGroup);
}

function createBalloons() {
  const colors = [0xff6b6b, 0xffd93d, 0x7cf7d4, 0x7ab8ff, 0xd987ff];

  for (let i = 0; i < 9; i++) {
    const color = colors[i % colors.length];
    const balloon = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 20, 20),
      new THREE.MeshStandardMaterial({
        color,
        metalness: 0.3,
        roughness: 0.25,
        emissive: color,
        emissiveIntensity: 0.25,
        transparent: true,
        opacity: 1
      })
    );

    resetBalloon(balloon);
    balloons.push(balloon);
    scene.add(balloon);
  }
}

function createGiftBox() {
  giftBox = new THREE.Mesh(
    new THREE.BoxGeometry(1.05, 0.85, 1.05),
    new THREE.MeshStandardMaterial({
      color: 0xa86bff,
      roughness: 0.55,
      metalness: 0.25
    })
  );
  giftBox.position.set(2, 0.45, 1.4);
  giftBox.name = "giftBox";

  const ribbonMat = new THREE.MeshStandardMaterial({
    color: 0xffd1f3,
    metalness: 0.4,
    roughness: 0.2
  });
  const ribbonWide = new THREE.BoxGeometry(1.15, 0.08, 0.18);
  const ribbonLong = new THREE.BoxGeometry(0.18, 0.08, 1.15);

  const ribbonA = new THREE.Mesh(ribbonWide, ribbonMat);
  ribbonA.position.y = 0.5;
  giftBox.add(ribbonA);

  const ribbonB = new THREE.Mesh(ribbonLong, ribbonMat);
  ribbonB.position.y = 0.5;
  giftBox.add(ribbonB);

  scene.add(giftBox);
}

function createParticles() {
  particlesGroup = new THREE.Group();
  const particleGeo = new THREE.SphereGeometry(0.06, 8, 8);

  for (let i = 0; i < 180; i++) {
    const particle = new THREE.Mesh(
      particleGeo,
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(Math.random(), Math.random(), Math.random())
      })
    );
    randomizeBurstParticle(particle);
    particlesGroup.add(particle);
  }

  particlesGroup.visible = false;
  scene.add(particlesGroup);
}

function createCakeSparkles() {
  sparkleGroup = new THREE.Group();
  const sparkleGeo = new THREE.SphereGeometry(0.04, 6, 6);

  for (let i = 0; i < 60; i++) {
    const sparkle = new THREE.Mesh(
      sparkleGeo,
      new THREE.MeshBasicMaterial({
        color: 0xfff6a0
      })
    );
    sparkle.userData = { velocity: new THREE.Vector3() };
    sparkleGroup.add(sparkle);
  }

  sparkleGroup.visible = false;
  scene.add(sparkleGroup);
}

function createPhotoCorner() {
  const frameGroup = new THREE.Group();
  const frameGeo = new THREE.BoxGeometry(2.2, 1.5, 0.08);
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0xf8d7ff,
    metalness: 0.3,
    roughness: 0.4
  });
  const frame = new THREE.Mesh(frameGeo, frameMat);
  frameGroup.add(frame);

  const photoGeo = new THREE.PlaneGeometry(1.9, 1.2);
  const photoMat = new THREE.MeshStandardMaterial({
    color: 0xffffff
    // To use your own photo, load a texture:
    // const texture = new THREE.TextureLoader().load("assets/us-photo.jpg");
    // photoMat.map = texture;
  });
  const photo = new THREE.Mesh(photoGeo, photoMat);
  photo.position.z = 0.045;
  frameGroup.add(photo);

  frameGroup.position.set(-2.8, 2.4, -5.8);
  frameGroup.rotation.y = Math.PI / 16;
  scene.add(frameGroup);

  const textCanvas = document.createElement("canvas");
  textCanvas.width = 512;
  textCanvas.height = 256;
  const ctx = textCanvas.getContext("2d");
  ctx.fillStyle = "#00000000";
  ctx.fillRect(0, 0, textCanvas.width, textCanvas.height);
  ctx.font = "bold 80px Poppins";
  ctx.fillStyle = "#ffd6ff";
  ctx.textAlign = "center";
  ctx.fillText("Our Memories", textCanvas.width / 2, textCanvas.height / 2 + 25);
  const textTexture = new THREE.CanvasTexture(textCanvas);

  const textPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 0.7),
    new THREE.MeshBasicMaterial({ map: textTexture, transparent: true })
  );
  textPlane.position.set(-2.5, 1.2, -5.7);
  textPlane.rotation.y = Math.PI / 16;
  scene.add(textPlane);
}

/* -------- Events -------- */
function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function onClick(event) {
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  setPointerFromEvent(event);
  handleInteraction();
}

function onTouchEnd(event) {
  if (!event.changedTouches || event.changedTouches.length === 0) return;
  const touch = event.changedTouches[0];
  setPointerFromEvent(touch);
  event.preventDefault();
  handleInteraction();
}

function setPointerFromEvent(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function handleInteraction() {
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects([giftBox, cakeGroup], true);
  if (!intersects.length) return;

  const hitGift = intersects.some(({ object }) => belongsTo(object, "giftBox"));
  const hitCake = intersects.some(({ object }) =>
    belongsTo(object, "cakeInteract")
  );

  if (hitGift) {
    triggerGiftAnimation();
  }
  if (hitCake) {
    toggleCandles();
  }
}

function belongsTo(object, name) {
  let current = object;
  while (current) {
    if (current.name === name) return true;
    current = current.parent;
  }
  return false;
}

/* -------- Camera helpers -------- */
function updateOrbitCamera(elapsed) {
  const bobbing = Math.sin(elapsed * 0.5) * 0.2;
  camera.position.set(
    Math.cos(orbitAngle) * orbitRadius,
    4 + bobbing,
    Math.sin(orbitAngle) * orbitRadius
  );
  camera.lookAt(0, 1.5, 0);
}

function startCameraReturn() {
  returningToOrbit = true;
  orbitActive = false;
  returnStart = performance.now();
  returnFrom.copy(camera.position);
  returnTo.set(
    Math.cos(orbitAngle) * orbitRadius,
    4,
    Math.sin(orbitAngle) * orbitRadius
  );
}

/* -------- Gift interaction -------- */
function triggerGiftAnimation() {
  if (isZooming || isMessageOpen) return;
  isZooming = true;
  orbitActive = false;
  returningToOrbit = false;
  zoomStart = performance.now();
  startCamPos.copy(camera.position);

  resetBurstParticles();
  particlesGroup.visible = true;
  burstActive = true;
  burstStartTime = performance.now() / 1000;

  playMusicOnce();

  setTimeout(() => {
    showMessageOverlay();
  }, 1200);
}

function resetBurstParticles() {
  particlesGroup.children.forEach((particle) =>
    randomizeBurstParticle(particle)
  );
}

function randomizeBurstParticle(particle) {
  particle.position.copy(giftBox ? giftBox.position : new THREE.Vector3());
  const direction = new THREE.Vector3(
    (Math.random() - 0.5) * 2,
    Math.random() * 2,
    (Math.random() - 0.5) * 2
  ).normalize();
  const speed = 2 + Math.random() * 2;
  particle.userData = { direction, speed };
}

function showMessageOverlay() {
  if (isMessageOpen) return;
  isMessageOpen = true;
  messageOverlay.style.display = "flex";
  requestAnimationFrame(() => {
    messageOverlay.classList.add("visible");
    messageCard.classList.add("visible");
  });
  sceneDim.classList.add("active");
}

function hideMessageOverlay() {
  if (!isMessageOpen) return;
  isMessageOpen = false;
  messageOverlay.classList.remove("visible");
  messageCard.classList.remove("visible");
  sceneDim.classList.remove("active");
  setTimeout(() => {
    if (!isMessageOpen) {
      messageOverlay.style.display = "none";
    }
  }, 350);
  startCameraReturn();
}

function updateMessageContent() {
  messageText.textContent = messages[currentMessageIndex];
  messageIndicator.textContent = `Message ${currentMessageIndex + 1} of ${
    messages.length
  }`;
  prevMessageBtn.disabled = currentMessageIndex === 0;
  nextMessageBtn.disabled = currentMessageIndex === messages.length - 1;
}

function changeMessage(direction) {
  const nextIndex = currentMessageIndex + direction;
  if (nextIndex < 0 || nextIndex >= messages.length) return;
  currentMessageIndex = nextIndex;
  updateMessageContent();
}

/* -------- Cake interaction -------- */
function toggleCandles() {
  candlesLit = !candlesLit;
  flameMeshes.forEach((flame) => {
    flame.userData.targetScale = candlesLit ? 1 : 0;
  });
  triggerCakeSparkles();
  showWishText();
}

function triggerCakeSparkles() {
  sparkleGroup.visible = true;
  sparkleActive = true;
  sparkleStart = clock.getElapsedTime();
  sparkleGroup.children.forEach((sparkle) => {
    sparkle.position.set(
      (Math.random() - 0.5) * 1.2,
      1.6 + Math.random() * 0.4,
      (Math.random() - 0.5) * 1.2
    );
    sparkle.material.opacity = 1;
    sparkle.material.transparent = true;
    sparkle.userData.velocity.set(
      (Math.random() - 0.5) * 0.2,
      0.05 + Math.random() * 0.08,
      (Math.random() - 0.5) * 0.2
    );
  });
}

function showWishText() {
  wishText.classList.add("visible");
  clearTimeout(wishTimeout);
  wishTimeout = setTimeout(() => {
    wishText.classList.remove("visible");
  }, 2200);
}

/* -------- Balloons interaction -------- */
function releaseBalloons() {
  if (releaseInProgress) return;
  releaseInProgress = true;
  balloons.forEach((balloon) => {
    if (!balloon.userData.released) {
      balloon.userData.released = true;
      balloon.userData.releaseStart = clock.getElapsedTime();
      balloon.userData.releaseSpeed = 0.6 + Math.random() * 0.6;
    }
  });

  setTimeout(() => {
    balloons.forEach((balloon) => resetBalloon(balloon));
    releaseInProgress = false;
  }, 4500);
}

function resetBalloon(balloon) {
  const x = (Math.random() - 0.5) * 6;
  const z = (Math.random() - 0.5) * 6;
  const baseY = 3 + Math.random() * 2;
  balloon.position.set(x, baseY, z);
  balloon.material.opacity = 1;
  balloon.userData = {
    baseY,
    floatSpeed: 0.8 + Math.random() * 0.8,
    offset: Math.random() * Math.PI * 2,
    released: false,
    releaseSpeed: 0
  };
}

/* -------- Music -------- */
function playMusicOnce() {
  if (!bgMusic) return;
  bgMusic.play().catch(() => {
    /* ignore autoplay blocking */
  });
}

function toggleMusic() {
  musicMuted = !musicMuted;
  bgMusic.muted = musicMuted;
  updateMusicIcon();
}

function updateMusicIcon() {
  musicToggle.textContent = bgMusic.muted ? "🔇" : "🔊";
}

/* -------- Desktop drag -------- */
function onPointerDownDrag(event) {
  if (isZooming || returningToOrbit || isMessageOpen) return;
  desktopDragging = true;
  lastPointerX = event.clientX;
  suppressClick = false;
  orbitActive = false;
}

function onPointerMoveDrag(event) {
  if (!desktopDragging) return;
  const deltaX = event.clientX - lastPointerX;
  if (Math.abs(deltaX) > 3) {
    suppressClick = true;
  }
  lastPointerX = event.clientX;
  orbitAngle -= deltaX * 0.002;
  camera.position.set(
    Math.cos(orbitAngle) * orbitRadius,
    camera.position.y,
    Math.sin(orbitAngle) * orbitRadius
  );
  camera.lookAt(0, 1.5, 0);
}

function onPointerUpDrag() {
  if (!desktopDragging) return;
  desktopDragging = false;
  if (!isZooming && !returningToOrbit && !isMessageOpen) {
    setTimeout(() => {
      if (!isZooming && !returningToOrbit && !isMessageOpen) {
        orbitActive = true;
      }
    }, 350);
  }
}

/* -------- Animation loop -------- */
function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();

  if (orbitActive && !isZooming && !returningToOrbit) {
    orbitAngle += 0.12 * 0.01;
    updateOrbitCamera(elapsed);
  }

  if (isZooming) {
    const t = Math.min(1, (performance.now() - zoomStart) / zoomDuration);
    const eased = easeOutCubic(t);
    camera.position.lerpVectors(startCamPos, targetCamPos, eased);
    camera.lookAt(0.4, 1.2, 1);
    if (t >= 1) {
      isZooming = false;
    }
  }

  if (returningToOrbit) {
    const t = Math.min(1, (performance.now() - returnStart) / returnDuration);
    const eased = easeOutCubic(t);
    camera.position.lerpVectors(returnFrom, returnTo, eased);
    camera.lookAt(0, 1.5, 0);
    if (t >= 1) {
      returningToOrbit = false;
      orbitActive = true;
    }
  }

  balloons.forEach((balloon) => {
    if (balloon.userData.released) {
      balloon.position.y += 0.04 + balloon.userData.releaseSpeed * 0.03;
      balloon.position.x += (Math.random() - 0.5) * 0.01;
      balloon.position.z += (Math.random() - 0.5) * 0.01;
      balloon.material.opacity = Math.max(
        0,
        balloon.material.opacity - 0.01
      );
    } else {
      const { baseY, floatSpeed, offset } = balloon.userData;
      balloon.position.y =
        baseY + Math.sin(elapsed * floatSpeed + offset) * 0.35;
    }
  });

  flameMeshes.forEach((flame) => {
    const target = flame.userData.targetScale ?? 1;
    const current = flame.scale.x;
    const next = THREE.MathUtils.lerp(current, target, 0.2);
    flame.scale.set(next, next, next);
    flame.visible = next > 0.02;
  });

  if (sparkleActive) {
    const sparkleElapsed = elapsed - sparkleStart;
    sparkleGroup.children.forEach((sparkle) => {
      sparkle.position.add(sparkle.userData.velocity);
      sparkle.material.opacity = Math.max(
        0,
        sparkle.material.opacity - 0.02
      );
    });
    if (sparkleElapsed > 1.6) {
      sparkleActive = false;
      sparkleGroup.visible = false;
    }
  }

  if (burstActive) {
    const elapsedBurst = performance.now() / 1000 - burstStartTime;
    particlesGroup.children.forEach((particle) => {
      particle.position.addScaledVector(
        particle.userData.direction,
        particle.userData.speed * 0.02
      );
    });
    if (elapsedBurst > particleLifetime) {
      burstActive = false;
      particlesGroup.visible = false;
    }
  }

  if (starField) {
    starField.rotation.y += 0.0004;
  }
  if (movingLight) {
    movingLight.position.set(
      Math.cos(elapsed * 0.7) * 2,
      3.5 + Math.sin(elapsed * 0.5) * 0.5,
      Math.sin(elapsed * 0.7) * 2
    );
  }

  renderer.render(scene, camera);
}

/* -------- Utilities -------- */
function createVerticalGradientTexture(topColor, bottomColor) {
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, topColor);
  gradient.addColorStop(1, bottomColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function fadeOutLoadingScreen() {
  loadingScreen.classList.add("fade-out");
  setTimeout(() => {
    loadingScreen.style.display = "none";
  }, 600);
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

