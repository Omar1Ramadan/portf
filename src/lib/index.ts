// src/lib/index.ts
// Re-export all library modules for easy importing

export { createScene } from './threeScene';
export { LibraryModule, type LibraryConfig } from './LibraryModule';
export { CameraController, type CameraState } from './cameraController';
export { 
  InteractionController, 
  type Mode, 
  type InteractionState, 
  type StateChangeCallback 
} from './interactionState';
export { walls, type Wall, type Volume, type VolumeLink } from './data/library';
