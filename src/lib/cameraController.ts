// src/lib/cameraController.ts
// Handles camera transitions (separate from interaction state)
import * as THREE from 'three';
// import gsap from 'gsap'; // Uncomment if using GSAP for tweening

export class CameraController {
  camera: THREE.PerspectiveCamera;
  target: THREE.Vector3;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.target = new THREE.Vector3(0, 2, 0);
  }

  // Example transition methods (replace with tweening as needed)
  toPortal() {
    // Animate camera to portal position
    this.camera.position.set(0, 2, 12);
    this.target.set(0, 2, 0);
  }

  toWall(wallPos: THREE.Vector3) {
    // Animate camera to wall
    this.camera.position.copy(wallPos.clone().add(new THREE.Vector3(0, 0, 3)));
    this.target.copy(wallPos);
  }

  toShelf(shelfPos: THREE.Vector3) {
    // Animate camera to shelf
    this.camera.position.copy(shelfPos.clone().add(new THREE.Vector3(0, 0, 1.5)));
    this.target.copy(shelfPos);
  }

  toProject(volumePos: THREE.Vector3) {
    // Animate camera to project
    this.camera.position.copy(volumePos.clone().add(new THREE.Vector3(0, 0, 0.7)));
    this.target.copy(volumePos);
  }

  update() {
    this.camera.lookAt(this.target);
  }
}
