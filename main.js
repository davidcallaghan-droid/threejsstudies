import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- Scene Setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
const canvas = document.querySelector('#c');
scene.fog = new THREE.Fog( 0x1B1B1B, 1, 1000 );

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    canvas,
    alpha: true,
  });

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxDistance = 40;
controls.minDistance = 0.29;
controls.maxPolarAngle = 1.55;
controls.rotateSpeed = 0.55;

camera.position.set(0, 0.2, 0.4);

const clock = new THREE.Clock();
let mixer = null;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hoveredObject = null;

let rotatingMesh = null;

// --- Bobbing settings ---
const bobAmplitude = 0.05;
const bobSpeed = 3;
const returnSpeed = 0.05;

// --- Load GLTF Model ---
const loader = new GLTFLoader();
loader.load('https://davidcallaghan-droid.github.io/threejsstudies/public/webrevamp1.glb', (gltf) => {
  const model = gltf.scene;
  scene.add(model);

  mixer = new THREE.AnimationMixer(model);

  model.traverse((child) => {
    if (!child.isMesh) return; // Only process meshes

    // Assign URLs to sleeves
    if (child.name === 'Sleeve1') child.userData.url = 'https://www.facebook.com/profile.php?id=100064057596926';
    if (child.name === 'Sleeve2') child.userData.url = 'https://bsky.app/profile/davidcallaghan.bsky.social';
    if (child.name === 'Sleeve3') child.userData.url = 'https://www.instagram.com/callaghandlethis/';
    if (child.name === 'Sleeve4') child.userData.url = 'mailto:david.callaghan@hotmail.co.uk';

    // Identify sleeves
    if (child.name.startsWith('Sleeve')) {
      child.userData.isSleeve = true;
      child.userData.originalPosition = child.position.clone();
      child.userData.originalColor = child.material.color.clone();
      child.userData.hovering = false;
    }

    // Rotating record
    if (child.name === 'PlayingRecord') rotatingMesh = child;
  });
});

// --- Pointer & Click ---
function onPointerMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onClick() {
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
    const mesh = intersects[0].object;
    if (mesh.userData && mesh.userData.url) {
      window.open(mesh.userData.url, '_blank');
    }
  }
}

window.addEventListener('pointermove', onPointerMove);
window.addEventListener('click', onClick);

// --- Light & Background ---
const light = new THREE.AmbientLight(0xf0f4f9, 5);
scene.add(light);



// --- Animation Loop ---
renderer.setAnimationLoop(() => {
  controls.update();

  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);

  // --- Hover Detection ---
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
    const mesh = intersects[0].object;

    if (mesh !== hoveredObject) {
      // Reset previous hovered sleeve
      if (hoveredObject && hoveredObject.userData?.isSleeve) {
        hoveredObject.userData.hovering = false;
        if (hoveredObject.material?.color && hoveredObject.userData.originalColor) {
          hoveredObject.material.color.copy(hoveredObject.userData.originalColor);
        }
      }

      hoveredObject = mesh;

      // Start hovering if sleeve
      if (mesh.userData?.isSleeve) mesh.userData.hovering = true;



      document.body.style.cursor = 'pointer';
    }
  } else {
    // Nothing hovered
    if (hoveredObject && hoveredObject.userData?.isSleeve) {
      hoveredObject.userData.hovering = false;
      if (hoveredObject.material?.color && hoveredObject.userData.originalColor) {
        hoveredObject.material.color.copy(hoveredObject.userData.originalColor);
      }
    }
    hoveredObject = null;
    document.body.style.cursor = 'default';
  }

  // --- Bobbing animation ---
  scene.traverse((child) => {
    if (!child.isMesh || !child.userData?.isSleeve) return;

    const origY = child.userData.originalPosition.y;

    if (child.userData.hovering) {
      const time = clock.getElapsedTime();
      const targetY = origY + Math.sin(time * bobSpeed) * bobAmplitude;
      child.position.y = THREE.MathUtils.lerp(child.position.y, targetY, 0.2);
    } else {
      child.position.y = THREE.MathUtils.lerp(child.position.y, origY, returnSpeed);
    }
  });

  // --- Rotating Record ---
  if (rotatingMesh) rotatingMesh.rotation.z += 0.03;

  renderer.render(scene, camera);
});
