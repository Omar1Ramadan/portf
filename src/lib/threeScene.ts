// src/lib/threeScene.ts
// Sets up the Three.js scene, camera, renderer, and lighting for hybrid aesthetic
import * as THREE from 'three';

export function createScene(canvas: HTMLCanvasElement) {
  const scene = new THREE.Scene();
  
  // Warm off-white background matching the page
  scene.background = new THREE.Color(0xfbfaf7);

  // Camera - perspective with good depth perception
  const camera = new THREE.PerspectiveCamera(
    50, // Slightly narrower FOV for less distortion
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  
  // Initial position will be set by CameraController
  camera.position.set(0, 14, 12);
  camera.lookAt(0, 0, 0);

  // Renderer with antialiasing for crisp edges
  const renderer = new THREE.WebGLRenderer({ 
    canvas, 
    antialias: true,
    alpha: false,
  });
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for performance
  
  // Tone mapping for subtle depth
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1.0;

  // Lighting - soft and neutral for library aesthetic
  // Main ambient light - provides base illumination
  const ambient = new THREE.AmbientLight(0xffffff, 0.85);
  scene.add(ambient);
  
  // Soft directional light from above-front
  const mainLight = new THREE.DirectionalLight(0xffffff, 0.3);
  mainLight.position.set(0, 15, 10);
  scene.add(mainLight);
  
  // Fill light from below to reduce harsh shadows
  const fillLight = new THREE.DirectionalLight(0xfaf8f5, 0.15);
  fillLight.position.set(0, -5, 0);
  scene.add(fillLight);

  // Subtle hemisphere light for ambient variation
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xf0ede5, 0.2);
  scene.add(hemiLight);

  return { scene, camera, renderer };
}
