// src/lib/interactionState.ts
// State machine for navigation (separate from camera logic)

export type Mode = 'portal' | 'wall' | 'shelf' | 'project';

export interface InteractionState {
  mode: Mode;
  currentWall: number | null;
  currentShelf: number | null;
  currentProject: string | null;
}

export class InteractionController {
  state: InteractionState = {
    mode: 'portal',
    currentWall: null,
    currentShelf: null,
    currentProject: null,
  };

  setMode(mode: Mode) {
    this.state.mode = mode;
    if (mode === 'portal') {
      this.state.currentWall = null;
      this.state.currentShelf = null;
      this.state.currentProject = null;
    }
    if (mode === 'wall') {
      this.state.currentShelf = null;
      this.state.currentProject = null;
    }
    if (mode === 'shelf') {
      this.state.currentProject = null;
    }
  }

  selectWall(wall: number) {
    this.state.currentWall = wall;
    this.setMode('wall');
  }

  selectShelf(shelf: number) {
    this.state.currentShelf = shelf;
    this.setMode('shelf');
  }

  selectProject(projectId: string) {
    this.state.currentProject = projectId;
    this.setMode('project');
  }
}
