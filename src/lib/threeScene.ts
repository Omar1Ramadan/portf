// src/lib/threeScene.ts
// Sets up the Three.js scene, camera, renderer, and lighting
import * as THREE from 'three';

export function createScene(canvas: HTMLCanvasElement) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x181818);

  // Camera
  const camera = new THREE.PerspectiveCamera(
    60,
    canvas.width / canvas.height,
    0.1,
    1000
  );
  camera.position.set(0, 2, 12);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height, false);
  renderer.setPixelRatio(window.devicePixelRatio);

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 0.5);
  dir.position.set(5, 10, 7);
  scene.add(dir);

  return { scene, camera, renderer };
}
