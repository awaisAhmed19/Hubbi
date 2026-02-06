// Assumes:
// - THREE is global
// - Ammo WASM build is loaded
// - window.__DOM_TEXTURE__ exists
// - <canvas id="stage"></canvas> exists

let physicsWorld;
let cloth;
let clothSoftBody;

// ---------------- PHYSICS ----------------
function initPhysics() {
  const collisionConfig = new Ammo.btSoftBodyRigidBodyCollisionConfiguration();
  const dispatcher = new Ammo.btCollisionDispatcher(collisionConfig);
  const broadphase = new Ammo.btDbvtBroadphase();
  const solver = new Ammo.btSequentialImpulseConstraintSolver();
  const softSolver = new Ammo.btDefaultSoftBodySolver();

  physicsWorld = new Ammo.btSoftRigidDynamicsWorld(
    dispatcher,
    broadphase,
    solver,
    collisionConfig,
    softSolver,
  );

  const g = new Ammo.btVector3(0, -9.8, 0);
  physicsWorld.setGravity(g);
  physicsWorld.getWorldInfo().set_m_gravity(g);
}

// ---------------- FLOOR ----------------
function createFloor() {
  const shape = new Ammo.btBoxShape(new Ammo.btVector3(50, 0.1, 50));
  const transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin(new Ammo.btVector3(0, -3, 0));

  const motionState = new Ammo.btDefaultMotionState(transform);
  const rbInfo = new Ammo.btRigidBodyConstructionInfo(
    0,
    motionState,
    shape,
    new Ammo.btVector3(0, 0, 0),
  );

  physicsWorld.addRigidBody(new Ammo.btRigidBody(rbInfo));
}

// ---------------- SCENE ----------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.z = 3;

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById("stage"),
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);

scene.add(new THREE.AmbientLight(0xffffff, 1));

// ---------------- CLOTH ----------------
function createCloth() {
  const width = 6;
  const height = 4;
  const segX = 30;
  const segY = 20;

  const geometry = new THREE.PlaneGeometry(width, height, segX, segY);
  geometry.computeBoundingBox();
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1000);

  const material = new THREE.MeshStandardMaterial({
    map: new THREE.CanvasTexture(window.__DOM_TEXTURE__),
    side: THREE.DoubleSide,
  });

  cloth = new THREE.Mesh(geometry, material);
  cloth.position.y = 2;
  scene.add(cloth);

  const softBodyHelpers = new Ammo.btSoftBodyHelpers();

  const c00 = new Ammo.btVector3(-width / 2, height / 2, 0);
  const c01 = new Ammo.btVector3(width / 2, height / 2, 0);
  const c10 = new Ammo.btVector3(-width / 2, -height / 2, 0);
  const c11 = new Ammo.btVector3(width / 2, -height / 2, 0);

  clothSoftBody = softBodyHelpers.CreatePatch(
    physicsWorld.getWorldInfo(),
    c00,
    c01,
    c10,
    c11,
    segX + 1,
    segY + 1,
    0,
    true,
  );

  const cfg = clothSoftBody.get_m_cfg();
  cfg.set_viterations(10);
  cfg.set_piterations(10);
  cfg.set_kDP(0.02);
  cfg.set_kDF(0.3);
  cfg.set_kPR(200);
  cfg.set_kCHR(0.9);
  cfg.set_kSHR(0.9);

  clothSoftBody.setTotalMass(0.9, false);
  physicsWorld.addSoftBody(clothSoftBody, 1, -1);

  cloth.userData.physicsBody = clothSoftBody;

  const anchors = [];
  for (let y = 0; y <= segY; y++) {
    const left = y * (segX + 1);
    const right = left + segX;

    clothSoftBody.appendAnchor(left, null, false, 1);
    clothSoftBody.appendAnchor(right, null, false, 1);

    anchors.push({ index: left, influence: 1 });
    anchors.push({ index: right, influence: 1 });
  }

  cloth.userData.anchors = anchors;
  setTimeout(releaseSidesGradually, 600);
}

// ---------------- RELEASE ----------------
function releaseSidesGradually() {
  const anchors = cloth.userData.anchors;

  const interval = setInterval(() => {
    let alive = false;

    for (const a of anchors) {
      if (a.influence > 0) {
        a.influence = Math.max(0, a.influence - 0.05);
        alive = true;
      }
    }

    if (!alive) {
      clearInterval(interval);
      return;
    }

    for (const a of anchors) {
      clothSoftBody.appendAnchor(a.index, null, false, a.influence);
    }
  }, 40);
}

// ---------------- SYNC ----------------
function updateClothFromPhysics() {
  if (!clothSoftBody) return;

  const nodes = clothSoftBody.get_m_nodes();
  const posAttr = cloth.geometry.attributes.position;
  const arr = posAttr.array;

  const count = Math.min(nodes.size(), posAttr.count);
  let i3 = 0;

  for (let i = 0; i < count; i++) {
    const p = nodes.at(i).get_m_x();
    const x = p.x();
    const y = p.y();
    const z = p.z();

    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      continue;
    }

    arr[i3++] = x;
    arr[i3++] = y;
    arr[i3++] = z;
  }

  posAttr.needsUpdate = true;
  cloth.geometry.computeVertexNormals();
}

// ---------------- LOOP ----------------
function animate() {
  requestAnimationFrame(animate);

  physicsWorld.stepSimulation(1 / 60, 10);
  updateClothFromPhysics();

  renderer.render(scene, camera);
}

// ---------------- BOOT ----------------
Ammo().then(() => {
  initPhysics();
  createFloor();
  createCloth();
  animate();
});
