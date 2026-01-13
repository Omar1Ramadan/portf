// src/lib/LibraryModule.ts
// Builds the library: 6 walls in a hexagon, each with shelves and volumes linked to project data
import * as THREE from 'three';
import { walls as wallData, type Wall, type Volume } from './data/library';

export interface LibraryConfig {
  wallCount: number;
  shelvesPerWall: number;
  radius: number;
  wallHeight: number;
  wallWidth: number;
}

const DEFAULT_CONFIG: LibraryConfig = {
  wallCount: 6,
  shelvesPerWall: 5,
  radius: 8,
  wallHeight: 6,
  wallWidth: 7,
};

export class LibraryModule {
  group: THREE.Group;
  config: LibraryConfig;
  wallGroups: THREE.Group[] = [];
  
  // Materials for hybrid aesthetic
  private wallMaterial: THREE.MeshBasicMaterial;
  private wallEdgeMaterial: THREE.LineBasicMaterial;
  private shelfMaterial: THREE.MeshBasicMaterial;
  private shelfEdgeMaterial: THREE.LineBasicMaterial;
  private volumeMaterial: THREE.MeshBasicMaterial;
  private volumeEdgeMaterial: THREE.LineBasicMaterial;
  private volumeHoverMaterial: THREE.MeshBasicMaterial;

  constructor(config: Partial<LibraryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.group = new THREE.Group();
    
    // Initialize materials for hybrid aesthetic
    // Wall: subtle warm gray fill with black edges
    this.wallMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xf5f3ef,
      side: THREE.DoubleSide,
    });
    this.wallEdgeMaterial = new THREE.LineBasicMaterial({ 
      color: 0x1a1a18,
      linewidth: 1,
    });
    
    // Shelf: slightly darker fill
    this.shelfMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xe8e5de,
    });
    this.shelfEdgeMaterial = new THREE.LineBasicMaterial({ 
      color: 0x2a2a28,
      linewidth: 1,
    });
    
    // Volume (books): light fill with dark edges
    this.volumeMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xfaf9f6,
    });
    this.volumeEdgeMaterial = new THREE.LineBasicMaterial({ 
      color: 0x0f0f0d,
      linewidth: 1,
    });
    this.volumeHoverMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xe0ddd5,
    });
    
    this.createHexagon();
    this.createFloor();
  }

  private createFloor() {
    // Hexagonal floor to anchor the space
    const floorRadius = this.config.radius * 1.3;
    const floorGeom = new THREE.CircleGeometry(floorRadius, 6);
    const floorMat = new THREE.MeshBasicMaterial({ 
      color: 0xfbfaf7,
      side: THREE.DoubleSide,
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.userData = { type: 'floor', id: 'floor' };
    this.group.add(floor);
    
    // Floor edge
    const floorEdgeGeom = new THREE.EdgesGeometry(floorGeom);
    const floorEdge = new THREE.LineSegments(floorEdgeGeom, this.wallEdgeMaterial);
    floorEdge.rotation.x = -Math.PI / 2;
    floorEdge.position.y = 0.01;
    this.group.add(floorEdge);
  }

  private createHexagon() {
    const { wallCount, radius, wallHeight, wallWidth } = this.config;
    
    for (let i = 0; i < wallCount; i++) {
      // Calculate angle for this wall - walls face inward
      const angle = (i / wallCount) * Math.PI * 2;
      
      // Get wall data
      const data = wallData[i] || null;
      
      // Create wall group
      const wallGroup = this.createWall(i, wallWidth, wallHeight, data);
      
      // Position wall on hexagon perimeter
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;
      wallGroup.position.set(x, wallHeight / 2, z);
      
      // Rotate wall to face center (inward)
      wallGroup.rotation.y = -angle + Math.PI;
      
      this.wallGroups.push(wallGroup);
      this.group.add(wallGroup);
    }
  }

  private createWall(wallIndex: number, width: number, height: number, wallData: Wall | null): THREE.Group {
    const wallGroup = new THREE.Group();
    wallGroup.name = `wall-${wallIndex}`;
    wallGroup.userData = { 
      type: 'wall', 
      id: `wall-${wallIndex}`,
      wallIndex,
      label: wallData?.label || `Wall ${wallIndex}`,
      descriptor: wallData?.descriptor || '',
    };
    
    // Wall back panel (the main clickable surface)
    const wallGeom = new THREE.PlaneGeometry(width, height);
    const wallMesh = new THREE.Mesh(wallGeom, this.wallMaterial.clone());
    wallMesh.userData = { 
      type: 'wall', 
      id: `wall-${wallIndex}`,
      wallIndex,
      label: wallData?.label || `Wall ${wallIndex}`,
    };
    wallGroup.add(wallMesh);
    
    // Wall edges for definition
    const wallEdgeGeom = new THREE.EdgesGeometry(wallGeom);
    const wallEdge = new THREE.LineSegments(wallEdgeGeom, this.wallEdgeMaterial);
    wallGroup.add(wallEdge);
    
    // Add frame/border for depth
    this.addWallFrame(wallGroup, width, height);
    
    // Create shelves
    const shelfCount = this.config.shelvesPerWall;
    const shelfSpacing = height / (shelfCount + 1);
    const volumes = wallData?.volumes || [];
    
    for (let s = 0; s < shelfCount; s++) {
      const shelfY = -height / 2 + (s + 1) * shelfSpacing;
      const shelf = this.createShelf(wallIndex, s, width * 0.9, shelfY);
      wallGroup.add(shelf);
    }
    
    // Place volumes (projects) on shelves - distribute across shelves
    volumes.forEach((volume, volIndex) => {
      // Distribute volumes across shelves
      const shelfIndex = volIndex % shelfCount;
      const shelfY = -height / 2 + (shelfIndex + 1) * shelfSpacing;
      
      // Position within shelf
      const volumesOnThisShelf = volumes.filter((_, i) => i % shelfCount === shelfIndex).length;
      const positionInShelf = Math.floor(volIndex / shelfCount);
      
      const volumeMesh = this.createVolume(wallIndex, shelfIndex, volIndex, volume);
      
      // Calculate x position - spread volumes across shelf width
      const shelfUsableWidth = width * 0.8;
      const volumeSpacing = shelfUsableWidth / (volumesOnThisShelf + 1);
      const xOffset = -shelfUsableWidth / 2 + (positionInShelf + 1) * volumeSpacing;
      
      volumeMesh.position.set(xOffset, shelfY + 0.25, 0.15);
      wallGroup.add(volumeMesh);
    });
    
    return wallGroup;
  }

  private addWallFrame(wallGroup: THREE.Group, width: number, height: number) {
    const frameDepth = 0.3;
    const frameThickness = 0.15;
    
    // Top frame
    const topGeom = new THREE.BoxGeometry(width + frameThickness * 2, frameThickness, frameDepth);
    const topFrame = new THREE.Mesh(topGeom, this.shelfMaterial.clone());
    topFrame.position.set(0, height / 2 + frameThickness / 2, frameDepth / 2);
    topFrame.userData = { type: 'frame' };
    wallGroup.add(topFrame);
    
    const topEdgeGeom = new THREE.EdgesGeometry(topGeom);
    const topEdge = new THREE.LineSegments(topEdgeGeom, this.shelfEdgeMaterial);
    topEdge.position.copy(topFrame.position);
    wallGroup.add(topEdge);
    
    // Bottom frame
    const bottomFrame = topFrame.clone();
    bottomFrame.position.set(0, -height / 2 - frameThickness / 2, frameDepth / 2);
    wallGroup.add(bottomFrame);
    
    const bottomEdge = new THREE.LineSegments(topEdgeGeom, this.shelfEdgeMaterial);
    bottomEdge.position.copy(bottomFrame.position);
    wallGroup.add(bottomEdge);
    
    // Left frame
    const sideGeom = new THREE.BoxGeometry(frameThickness, height, frameDepth);
    const leftFrame = new THREE.Mesh(sideGeom, this.shelfMaterial.clone());
    leftFrame.position.set(-width / 2 - frameThickness / 2, 0, frameDepth / 2);
    leftFrame.userData = { type: 'frame' };
    wallGroup.add(leftFrame);
    
    const sideEdgeGeom = new THREE.EdgesGeometry(sideGeom);
    const leftEdge = new THREE.LineSegments(sideEdgeGeom, this.shelfEdgeMaterial);
    leftEdge.position.copy(leftFrame.position);
    wallGroup.add(leftEdge);
    
    // Right frame
    const rightFrame = leftFrame.clone();
    rightFrame.position.set(width / 2 + frameThickness / 2, 0, frameDepth / 2);
    wallGroup.add(rightFrame);
    
    const rightEdge = new THREE.LineSegments(sideEdgeGeom, this.shelfEdgeMaterial);
    rightEdge.position.copy(rightFrame.position);
    wallGroup.add(rightEdge);
  }

  private createShelf(wallIndex: number, shelfIndex: number, width: number, yPosition: number): THREE.Group {
    const shelfGroup = new THREE.Group();
    shelfGroup.name = `wall-${wallIndex}-shelf-${shelfIndex}`;
    
    const shelfDepth = 0.35;
    const shelfThickness = 0.08;
    
    // Shelf surface
    const shelfGeom = new THREE.BoxGeometry(width, shelfThickness, shelfDepth);
    const shelfMesh = new THREE.Mesh(shelfGeom, this.shelfMaterial.clone());
    shelfMesh.userData = { 
      type: 'shelf', 
      id: `wall-${wallIndex}-shelf-${shelfIndex}`,
      wallIndex,
      shelfIndex,
    };
    shelfGroup.add(shelfMesh);
    
    // Shelf edges
    const shelfEdgeGeom = new THREE.EdgesGeometry(shelfGeom);
    const shelfEdge = new THREE.LineSegments(shelfEdgeGeom, this.shelfEdgeMaterial);
    shelfGroup.add(shelfEdge);
    
    // Position the shelf
    shelfGroup.position.set(0, yPosition, shelfDepth / 2);
    
    return shelfGroup;
  }

  private createVolume(wallIndex: number, shelfIndex: number, volumeIndex: number, volumeData: Volume): THREE.Mesh {
    // Randomize book dimensions for visual interest
    const bookWidth = 0.15 + Math.random() * 0.15;
    const bookHeight = 0.35 + Math.random() * 0.2;
    const bookDepth = 0.08 + Math.random() * 0.06;
    
    const volGeom = new THREE.BoxGeometry(bookWidth, bookHeight, bookDepth);
    const volMesh = new THREE.Mesh(volGeom, this.volumeMaterial.clone());
    
    volMesh.userData = {
      type: 'volume',
      id: `wall-${wallIndex}-shelf-${shelfIndex}-vol-${volumeIndex}`,
      wallIndex,
      shelfIndex,
      volumeIndex,
      metadata: volumeData,
    };
    
    // Add edges to volume
    const volEdgeGeom = new THREE.EdgesGeometry(volGeom);
    const volEdge = new THREE.LineSegments(volEdgeGeom, this.volumeEdgeMaterial);
    volMesh.add(volEdge);
    
    return volMesh;
  }

  // Get all meshes of a specific type for raycasting
  // Optionally filter by wall index and shelf index
  getMeshesByType(
    type: 'wall' | 'shelf' | 'volume',
    wallIndex?: number,
    shelfIndex?: number
  ): THREE.Object3D[] {
    const meshes: THREE.Object3D[] = [];
    
    this.group.traverse((child) => {
      if (child.userData.type === type) {
        // Filter by wall if specified
        if (wallIndex !== undefined && child.userData.wallIndex !== wallIndex) {
          return;
        }
        // Filter by shelf if specified
        if (shelfIndex !== undefined && child.userData.shelfIndex !== shelfIndex) {
          return;
        }
        meshes.push(child);
      }
    });
    
    return meshes;
  }

  // Get wall group by index
  getWallGroup(wallIndex: number): THREE.Group | undefined {
    return this.wallGroups[wallIndex];
  }

  // Highlight a mesh (for hover)
  highlightMesh(mesh: THREE.Mesh, highlight: boolean) {
    if (mesh.userData.type === 'volume') {
      (mesh.material as THREE.MeshBasicMaterial).color.set(
        highlight ? 0xe0ddd5 : 0xfaf9f6
      );
    } else if (mesh.userData.type === 'shelf') {
      (mesh.material as THREE.MeshBasicMaterial).color.set(
        highlight ? 0xdad7ce : 0xe8e5de
      );
    } else if (mesh.userData.type === 'wall') {
      (mesh.material as THREE.MeshBasicMaterial).color.set(
        highlight ? 0xeae7e0 : 0xf5f3ef
      );
    }
  }
}
