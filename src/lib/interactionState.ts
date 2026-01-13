// src/lib/interactionState.ts
// State machine for navigation with back navigation support

import type { Volume } from './data/library';

export type Mode = 'portal' | 'wall' | 'shelf' | 'project';

export interface InteractionState {
  mode: Mode;
  currentWallIndex: number | null;
  currentShelfIndex: number | null;
  currentVolumeId: string | null;
  currentVolumeData: Volume | null;
}

export type StateChangeCallback = (state: InteractionState, previousMode: Mode) => void;

export class InteractionController {
  state: InteractionState = {
    mode: 'portal',
    currentWallIndex: null,
    currentShelfIndex: null,
    currentVolumeId: null,
    currentVolumeData: null,
  };

  private listeners: StateChangeCallback[] = [];

  // Subscribe to state changes
  onStateChange(callback: StateChangeCallback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private notifyListeners(previousMode: Mode) {
    this.listeners.forEach(cb => cb(this.state, previousMode));
  }

  // Set mode and clear downstream state
  setMode(mode: Mode) {
    const previousMode = this.state.mode;
    this.state.mode = mode;
    
    if (mode === 'portal') {
      this.state.currentWallIndex = null;
      this.state.currentShelfIndex = null;
      this.state.currentVolumeId = null;
      this.state.currentVolumeData = null;
    }
    if (mode === 'wall') {
      this.state.currentShelfIndex = null;
      this.state.currentVolumeId = null;
      this.state.currentVolumeData = null;
    }
    if (mode === 'shelf') {
      this.state.currentVolumeId = null;
      this.state.currentVolumeData = null;
    }
    
    this.notifyListeners(previousMode);
  }

  // Navigate to wall
  selectWall(wallIndex: number) {
    const previousMode = this.state.mode;
    this.state.currentWallIndex = wallIndex;
    this.state.currentShelfIndex = null;
    this.state.currentVolumeId = null;
    this.state.currentVolumeData = null;
    this.state.mode = 'wall';
    this.notifyListeners(previousMode);
  }

  // Navigate to shelf
  selectShelf(shelfIndex: number) {
    const previousMode = this.state.mode;
    this.state.currentShelfIndex = shelfIndex;
    this.state.currentVolumeId = null;
    this.state.currentVolumeData = null;
    this.state.mode = 'shelf';
    this.notifyListeners(previousMode);
  }

  // Navigate to project/volume
  selectProject(volumeId: string, volumeData: Volume | null) {
    const previousMode = this.state.mode;
    this.state.currentVolumeId = volumeId;
    this.state.currentVolumeData = volumeData;
    this.state.mode = 'project';
    this.notifyListeners(previousMode);
  }

  // Go back one level in navigation hierarchy
  goBack(): Mode | null {
    const previousMode = this.state.mode;
    
    switch (this.state.mode) {
      case 'project':
        this.state.currentVolumeId = null;
        this.state.currentVolumeData = null;
        this.state.mode = 'shelf';
        break;
      case 'shelf':
        this.state.currentShelfIndex = null;
        this.state.mode = 'wall';
        break;
      case 'wall':
        this.state.currentWallIndex = null;
        this.state.mode = 'portal';
        break;
      case 'portal':
        return null; // Already at top level
    }
    
    this.notifyListeners(previousMode);
    return this.state.mode;
  }

  // Reset to portal view
  reset() {
    this.setMode('portal');
  }

  // Check what type of object is clickable in current mode
  getClickableType(): 'wall' | 'shelf' | 'volume' | null {
    switch (this.state.mode) {
      case 'portal':
        return 'wall';
      case 'wall':
        return 'shelf';
      case 'shelf':
        return 'volume';
      case 'project':
        return null; // Nothing clickable in project view
    }
  }

  // Check if a specific object type is clickable
  isClickable(objectType: string): boolean {
    return objectType === this.getClickableType();
  }

  // Get current breadcrumb path for UI
  getBreadcrumb(): string[] {
    const crumbs: string[] = ['Library'];
    
    if (this.state.currentWallIndex !== null) {
      crumbs.push(`Wall ${this.state.currentWallIndex + 1}`);
    }
    if (this.state.currentShelfIndex !== null) {
      crumbs.push(`Shelf ${this.state.currentShelfIndex + 1}`);
    }
    if (this.state.currentVolumeData) {
      crumbs.push(this.state.currentVolumeData.title);
    }
    
    return crumbs;
  }
}
