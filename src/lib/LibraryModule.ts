// src/lib/LibraryModule.ts
// Builds the library: 5 walls in a pentagon, each with 5 shelves (placeholder geometry)
import * as THREE from 'three';

export interface LibraryConfig {
  wallCount: number;
  shelvesPerWall: number;
  volumesPerShelf: number;
}

export class LibraryModule {
  group: THREE.Group;
  config: LibraryConfig;

  constructor(config: LibraryConfig) {
    this.config = config;
    this.group = new THREE.Group();
    this.createWalls();
  }

  createWalls() {
    const { wallCount, shelvesPerWall } = this.config;
    const radius = 6;
    const wallWidth = 6;
    const wallHeight = 4;
    for (let i = 0; i < wallCount; i++) {
      const angle = (i / wallCount) * Math.PI * 2;
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;
      const wall = this.createWall(i, wallWidth, wallHeight, shelvesPerWall);
      wall.position.set(x, wallHeight / 2, z);
      wall.rotation.y = -angle;
      this.group.add(wall);
    }
  }

  createWall(wallIndex: number, width: number, height: number, shelves: number) {
    const wallGroup = new THREE.Group();
    wallGroup.name = `wall-${wallIndex}`;
    // Wall plane
    const wallGeom = new THREE.PlaneGeometry(width, height);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x333333, side: THREE.DoubleSide });
    const wallMesh = new THREE.Mesh(wallGeom, wallMat);
    wallMesh.userData = { id: `wall-${wallIndex}` };
    wallGroup.add(wallMesh);
    // Shelves
    for (let s = 0; s < shelves; s++) {
      const shelf = this.createShelf(wallIndex, s, width);
      shelf.position.y = -height / 2 + (s + 0.5) * (height / shelves);
      wallGroup.add(shelf);
      // Add placeholder volumes to shelf
      const volumesPerShelf = this.config.volumesPerShelf;
      for (let v = 0; v < volumesPerShelf; v++) {
        const volume = this.createVolume(wallIndex, s, v);
        // Arrange volumes along the shelf
        const spacing = width * 0.8 / volumesPerShelf;
        volume.position.x = -width * 0.4 + (v + 0.5) * spacing;
        volume.position.y = shelf.position.y + 0.18;
        wallGroup.add(volume);
      }
    }
    return wallGroup;
  }

  createShelf(wallIndex: number, shelfIndex: number, width: number) {
    const shelfGeom = new THREE.BoxGeometry(width * 0.95, 0.12, 0.3);
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
    const shelfMesh = new THREE.Mesh(shelfGeom, shelfMat);
    shelfMesh.userData = { id: `wall-${wallIndex}-shelf-${shelfIndex}` };
    return shelfMesh;
  }

  createVolume(wallIndex: number, shelfIndex: number, volumeIndex: number) {
    const volGeom = new THREE.BoxGeometry(0.28, 0.38, 0.18);
    const volMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const volMesh = new THREE.Mesh(volGeom, volMat);
    volMesh.userData = {
      id: `wall-${wallIndex}-shelf-${shelfIndex}-vol-${volumeIndex}`,
      wall: wallIndex,
      shelf: shelfIndex,
      volume: volumeIndex,
      // metadata: null // To be filled with project data later
    };
    return volMesh;
  }
}
