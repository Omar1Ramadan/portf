// src/lib/cameraController.ts
// Handles smooth camera transitions using GSAP
import * as THREE from 'three';
import gsap from 'gsap';

export interface CameraState {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export class CameraController {
  camera: THREE.PerspectiveCamera;
  target: THREE.Vector3;
  private currentTween: gsap.core.Timeline | null = null;
  
  // Predefined camera states
  private portalState: CameraState;
  
  // Configuration
  private readonly transitionDuration = 0.8;
  private readonly easing = 'power2.inOut';

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.target = new THREE.Vector3(0, 2, 0);
    
    // Portal view: bird's eye view looking down at the hexagon at ~45 degrees
    this.portalState = {
      position: new THREE.Vector3(0, 14, 12),
      target: new THREE.Vector3(0, 0, 0),
    };
    
    // Set initial position
    this.camera.position.copy(this.portalState.position);
    this.target.copy(this.portalState.target);
    this.camera.lookAt(this.target);
  }

  // Kill any ongoing animation
  private killCurrentTween() {
    if (this.currentTween) {
      this.currentTween.kill();
      this.currentTween = null;
    }
  }

  // Animate to portal view (overview of hexagon)
  toPortal(): Promise<void> {
    return this.animateTo(this.portalState.position, this.portalState.target);
  }

  // Animate to wall view - face the selected wall
  toWall(wallGroup: THREE.Group): Promise<void> {
    // Get wall's world position and rotation
    const wallPosition = new THREE.Vector3();
    wallGroup.getWorldPosition(wallPosition);
    
    // Calculate camera position: in front of the wall, facing it
    const wallRotation = wallGroup.rotation.y;
    
    // Position camera to face the wall from inside the hexagon
    const distance = 5;
    const cameraX = wallPosition.x - Math.sin(wallRotation + Math.PI) * distance;
    const cameraZ = wallPosition.z - Math.cos(wallRotation + Math.PI) * distance;
    
    const newPosition = new THREE.Vector3(cameraX, 3, cameraZ);
    const newTarget = new THREE.Vector3(wallPosition.x, 3, wallPosition.z);
    
    return this.animateTo(newPosition, newTarget);
  }

  // Animate to shelf view - zoom closer to the shelf
  toShelf(shelfObject: THREE.Object3D, wallGroup: THREE.Group): Promise<void> {
    // Get shelf's world position
    const shelfWorldPos = new THREE.Vector3();
    shelfObject.getWorldPosition(shelfWorldPos);
    
    // Get wall rotation to position camera correctly
    const wallRotation = wallGroup.rotation.y;
    
    // Position camera closer to the shelf
    const distance = 2.5;
    const cameraX = shelfWorldPos.x - Math.sin(wallRotation + Math.PI) * distance;
    const cameraZ = shelfWorldPos.z - Math.cos(wallRotation + Math.PI) * distance;
    
    const newPosition = new THREE.Vector3(cameraX, shelfWorldPos.y + 0.3, cameraZ);
    const newTarget = new THREE.Vector3(shelfWorldPos.x, shelfWorldPos.y, shelfWorldPos.z);
    
    return this.animateTo(newPosition, newTarget);
  }

  // Animate to project view - focus on the volume
  toProject(volumeObject: THREE.Object3D, wallGroup: THREE.Group): Promise<void> {
    // Get volume's world position
    const volumeWorldPos = new THREE.Vector3();
    volumeObject.getWorldPosition(volumeWorldPos);
    
    // Get wall rotation
    const wallRotation = wallGroup.rotation.y;
    
    // Position camera very close to the volume
    const distance = 1.2;
    const cameraX = volumeWorldPos.x - Math.sin(wallRotation + Math.PI) * distance;
    const cameraZ = volumeWorldPos.z - Math.cos(wallRotation + Math.PI) * distance;
    
    const newPosition = new THREE.Vector3(cameraX, volumeWorldPos.y + 0.1, cameraZ);
    const newTarget = new THREE.Vector3(volumeWorldPos.x, volumeWorldPos.y, volumeWorldPos.z);
    
    return this.animateTo(newPosition, newTarget, 0.6); // Slightly faster for subtle push-in
  }

  // Core animation method
  private animateTo(
    newPosition: THREE.Vector3, 
    newTarget: THREE.Vector3, 
    duration: number = this.transitionDuration
  ): Promise<void> {
    this.killCurrentTween();
    
    return new Promise((resolve) => {
      // Create a timeline for coordinated animation
      this.currentTween = gsap.timeline({
        onComplete: () => {
          this.currentTween = null;
          resolve();
        },
      });
      
      // Animate camera position
      this.currentTween.to(
        this.camera.position,
        {
          x: newPosition.x,
          y: newPosition.y,
          z: newPosition.z,
          duration,
          ease: this.easing,
        },
        0
      );
      
      // Animate look-at target
      this.currentTween.to(
        this.target,
        {
          x: newTarget.x,
          y: newTarget.y,
          z: newTarget.z,
          duration,
          ease: this.easing,
        },
        0
      );
    });
  }

  // Update method - call in animation loop
  update() {
    this.camera.lookAt(this.target);
  }

  // Get current camera state for debugging
  getState(): CameraState {
    return {
      position: this.camera.position.clone(),
      target: this.target.clone(),
    };
  }
}
