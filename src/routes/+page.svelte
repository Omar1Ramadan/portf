<script lang="ts">
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import { createScene } from '$lib/threeScene';
  import { LibraryModule } from '$lib/LibraryModule';
  import { InteractionController, type Mode } from '$lib/interactionState';
  import { CameraController } from '$lib/cameraController';
  import type { Volume } from '$lib/data/library';

  let canvasEl: HTMLCanvasElement;
  let drawerOpen = false;
  let selectedVolume: Volume | null = null;
  let currentMode: Mode = 'portal';
  let breadcrumbs: string[] = ['Library'];

  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let library: LibraryModule;
  let interaction: InteractionController;
  let cameraCtrl: CameraController;
  let raycaster: THREE.Raycaster;
  let mouse: THREE.Vector2;
  let lastHovered: THREE.Object3D | null = null;

  onMount(() => {
    // Initialize Three.js scene
    const { scene: s, camera: c, renderer: r } = createScene(canvasEl);
    scene = s;
    camera = c;
    renderer = r;

    // Create library geometry
    library = new LibraryModule({
      wallCount: 6,
      shelvesPerWall: 5,
      radius: 8,
      wallHeight: 6,
      wallWidth: 7,
    });
    scene.add(library.group);

    // State machine and camera controller
    interaction = new InteractionController();
    cameraCtrl = new CameraController(camera);
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Subscribe to state changes
    interaction.onStateChange((state) => {
      currentMode = state.mode;
      breadcrumbs = interaction.getBreadcrumb();
      
      if (state.mode === 'project' && state.currentVolumeData) {
        selectedVolume = state.currentVolumeData;
        drawerOpen = true;
      } else {
        drawerOpen = false;
        selectedVolume = null;
      }
    });

    // Animation loop
    function animate() {
      cameraCtrl.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    animate();

    // Resize handler
    function handleResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight, false);
    }
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial size

    // Mouse move for hover effects
    canvasEl.addEventListener('mousemove', handleMouseMove);
    canvasEl.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvasEl.removeEventListener('mousemove', handleMouseMove);
      canvasEl.removeEventListener('click', handleClick);
    };
  });

  function updateMouse(event: MouseEvent) {
    const rect = canvasEl.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function getClickables() {
    const clickableType = interaction.getClickableType();
    if (!clickableType) return [];

    // Filter clickables based on current navigation state
    const wallIndex = interaction.state.currentWallIndex ?? undefined;
    const shelfIndex = interaction.state.currentShelfIndex ?? undefined;

    if (clickableType === 'wall') {
      return library.getMeshesByType('wall');
    } else if (clickableType === 'shelf') {
      return library.getMeshesByType('shelf', wallIndex);
    } else if (clickableType === 'volume') {
      return library.getMeshesByType('volume', wallIndex, shelfIndex);
    }
    return [];
  }

  function handleMouseMove(event: MouseEvent) {
    updateMouse(event);
    raycaster.setFromCamera(mouse, camera);

    const clickableType = interaction.getClickableType();
    if (!clickableType) {
      // Clear any hover state
      if (lastHovered && 'material' in lastHovered) {
        library.highlightMesh(lastHovered as THREE.Mesh, false);
        lastHovered = null;
      }
      canvasEl.style.cursor = 'default';
      return;
    }

    // Get clickable meshes (filtered by current state)
    const clickables = getClickables();
    const intersects = raycaster.intersectObjects(clickables, true);

    // Clear previous hover
    if (lastHovered && 'material' in lastHovered) {
      library.highlightMesh(lastHovered as THREE.Mesh, false);
    }

    if (intersects.length > 0) {
      // Find the actual clickable object (might be nested)
      let target = intersects[0].object;
      while (target && target.userData.type !== clickableType) {
        target = target.parent as THREE.Object3D;
      }

      if (target && target.userData.type === clickableType && 'material' in target) {
        library.highlightMesh(target as THREE.Mesh, true);
        lastHovered = target;
        canvasEl.style.cursor = 'pointer';
      } else {
        lastHovered = null;
        canvasEl.style.cursor = 'default';
      }
    } else {
      lastHovered = null;
      canvasEl.style.cursor = 'default';
    }
  }

  function handleClick(event: MouseEvent) {
    updateMouse(event);
    raycaster.setFromCamera(mouse, camera);

    const clickableType = interaction.getClickableType();
    if (!clickableType) return;

    const clickables = getClickables();
    const intersects = raycaster.intersectObjects(clickables, true);

    if (intersects.length > 0) {
      // Find the actual clickable object
      let target = intersects[0].object;
      while (target && target.userData.type !== clickableType) {
        target = target.parent as THREE.Object3D;
      }

      if (!target || target.userData.type !== clickableType) return;

      const userData = target.userData;

      if (clickableType === 'wall') {
        const wallIndex = userData.wallIndex;
        interaction.selectWall(wallIndex);
        const wallGroup = library.getWallGroup(wallIndex);
        if (wallGroup) {
          cameraCtrl.toWall(wallGroup);
        }
      } else if (clickableType === 'shelf') {
        const shelfIndex = userData.shelfIndex;
        interaction.selectShelf(shelfIndex);
        const wallGroup = library.getWallGroup(interaction.state.currentWallIndex!);
        if (wallGroup) {
          cameraCtrl.toShelf(target, wallGroup);
        }
      } else if (clickableType === 'volume') {
        const volumeId = userData.id;
        const volumeData = userData.metadata as Volume;
        interaction.selectProject(volumeId, volumeData);
        const wallGroup = library.getWallGroup(interaction.state.currentWallIndex!);
        if (wallGroup) {
          cameraCtrl.toProject(target, wallGroup);
        }
      }
    }
  }

  function goBack() {
    const newMode = interaction.goBack();
    if (newMode === null) return;

    // Animate camera based on where we're going back to
    if (newMode === 'portal') {
      cameraCtrl.toPortal();
    } else if (newMode === 'wall') {
      const wallGroup = library.getWallGroup(interaction.state.currentWallIndex!);
      if (wallGroup) {
        cameraCtrl.toWall(wallGroup);
      }
    } else if (newMode === 'shelf') {
      // Re-focus on the current shelf
      const wallGroup = library.getWallGroup(interaction.state.currentWallIndex!);
      if (wallGroup) {
        // Find the shelf mesh
        const shelfMeshes = library.getMeshesByType('shelf');
        const currentShelf = shelfMeshes.find(
          (m) => m.userData.shelfIndex === interaction.state.currentShelfIndex
        );
        if (currentShelf) {
          cameraCtrl.toShelf(currentShelf, wallGroup);
        }
      }
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      goBack();
    }
  }
</script>

<svelte:head>
  <title>Library of Babel · Portfolio</title>
  <meta
    name="description"
    content="An interactive 3D library portfolio inspired by the spatial logic of the Library of Babel."
  />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;600&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<svelte:window on:keydown={handleKeydown} />

<main class="library-container">
  <canvas bind:this={canvasEl}></canvas>

  <!-- Navigation hint - only visible at portal -->
  {#if currentMode === 'portal'}
    <div class="portal-hint">
      <span class="hint-text">Click a wall to explore</span>
    </div>
  {/if}

  <!-- Back button - visible when not at portal -->
  {#if currentMode !== 'portal'}
    <button class="back-button" on:click={goBack} aria-label="Go back">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      <span>Back</span>
    </button>
  {/if}

  <!-- Breadcrumb trail -->
  {#if breadcrumbs.length > 1}
    <nav class="breadcrumb" aria-label="Navigation">
      {#each breadcrumbs as crumb, i}
        <span class="crumb">{crumb}</span>
        {#if i < breadcrumbs.length - 1}
          <span class="crumb-separator">/</span>
        {/if}
      {/each}
    </nav>
  {/if}

  <!-- Project drawer -->
  <div class="drawer-backdrop" class:visible={drawerOpen} on:click={goBack} role="presentation"></div>
  <aside class="volume-drawer" class:open={drawerOpen} aria-hidden={!drawerOpen}>
    {#if selectedVolume}
      <button class="drawer-close" on:click={goBack} aria-label="Close drawer">×</button>
      
      <span class="drawer-shelf">
        {breadcrumbs.slice(0, -1).join(' / ')}
      </span>
      
      <h2 class="drawer-title">{selectedVolume.title}</h2>
      
      <p class="drawer-stack">{selectedVolume.stack}</p>
      
      <p class="drawer-meta">{selectedVolume.metadata}</p>
      
      <p class="drawer-summary">{selectedVolume.summary}</p>
      
      {#if selectedVolume.details}
        <p class="drawer-details">{selectedVolume.details}</p>
      {/if}
      
      {#if selectedVolume.links}
        <div class="drawer-links">
          {#if selectedVolume.links.github}
            <a href={selectedVolume.links.github} target="_blank" rel="noopener noreferrer" class="drawer-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </a>
          {/if}
          {#if selectedVolume.links.demo}
            <a href={selectedVolume.links.demo} target="_blank" rel="noopener noreferrer" class="drawer-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
              </svg>
              Demo
            </a>
          {/if}
        </div>
      {/if}
    {/if}
  </aside>
</main>

<style>
  .library-container {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: var(--bg, #fbfaf7);
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  /* Portal hint */
  .portal-hint {
    position: absolute;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    pointer-events: none;
  }

  .hint-text {
    font-family: var(--mono, 'IBM Plex Mono', monospace);
    font-size: 0.85rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted, #6a6964);
    background: var(--bg, #fbfaf7);
    padding: 0.5rem 1rem;
    border: 1px solid var(--line, #d9d7d0);
  }

  /* Back button */
  .back-button {
    position: absolute;
    top: 1.5rem;
    left: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: var(--mono, 'IBM Plex Mono', monospace);
    font-size: 0.85rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--fg, #0f0f0d);
    background: var(--bg, #fbfaf7);
    padding: 0.6rem 1rem;
    border: 1px solid var(--line, #d9d7d0);
    cursor: pointer;
    transition: all 0.2s ease;
    z-index: 10;
  }

  .back-button:hover,
  .back-button:focus-visible {
    background: var(--fg, #0f0f0d);
    color: var(--bg, #fbfaf7);
    border-color: var(--fg, #0f0f0d);
  }

  .back-button svg {
    width: 18px;
    height: 18px;
  }

  /* Breadcrumb */
  .breadcrumb {
    position: absolute;
    top: 1.5rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: var(--mono, 'IBM Plex Mono', monospace);
    font-size: 0.75rem;
    letter-spacing: 0.05em;
    color: var(--muted, #6a6964);
    background: var(--bg, #fbfaf7);
    padding: 0.5rem 1rem;
    border: 1px solid var(--line, #d9d7d0);
    z-index: 5;
  }

  .crumb {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .crumb-separator {
    opacity: 0.5;
  }

  /* Drawer backdrop */
  .drawer-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 15, 13, 0.4);
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s ease, visibility 0.3s ease;
    z-index: 90;
  }

  .drawer-backdrop.visible {
    opacity: 1;
    visibility: visible;
  }

  /* Volume drawer */
  .volume-drawer {
    position: fixed;
    top: 0;
    right: 0;
    width: min(400px, 90vw);
    height: 100vh;
    background: var(--bg, #fbfaf7);
    border-left: 1px solid var(--line, #d9d7d0);
    padding: 2.5rem 2rem;
    transform: translateX(100%);
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    overflow-y: auto;
    z-index: 100;
  }

  .volume-drawer.open {
    transform: translateX(0);
  }

  .drawer-close {
    position: absolute;
    top: 1rem;
    right: 1rem;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    color: var(--muted, #6a6964);
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.2s ease;
  }

  .drawer-close:hover {
    color: var(--fg, #0f0f0d);
    border-color: var(--line, #d9d7d0);
  }

  .drawer-shelf {
    font-family: var(--mono, 'IBM Plex Mono', monospace);
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted, #6a6964);
    margin-top: 1rem;
  }

  .drawer-title {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 600;
    line-height: 1.2;
    color: var(--fg, #0f0f0d);
  }

  .drawer-stack {
    font-family: var(--mono, 'IBM Plex Mono', monospace);
    font-size: 0.9rem;
    color: var(--muted, #6a6964);
    margin: 0;
  }

  .drawer-meta {
    font-family: var(--mono, 'IBM Plex Mono', monospace);
    font-size: 0.85rem;
    color: var(--muted, #6a6964);
    margin: 0;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--line, #d9d7d0);
  }

  .drawer-summary {
    font-size: 1rem;
    line-height: 1.6;
    color: var(--fg, #0f0f0d);
    margin: 0.5rem 0;
  }

  .drawer-details {
    font-size: 0.95rem;
    line-height: 1.6;
    color: var(--muted, #6a6964);
    margin: 0;
  }

  .drawer-links {
    display: flex;
    gap: 1rem;
    margin-top: auto;
    padding-top: 1.5rem;
  }

  .drawer-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-family: var(--mono, 'IBM Plex Mono', monospace);
    font-size: 0.85rem;
    text-decoration: none;
    color: var(--fg, #0f0f0d);
    padding: 0.6rem 1rem;
    border: 1px solid var(--line, #d9d7d0);
    transition: all 0.2s ease;
  }

  .drawer-link:hover,
  .drawer-link:focus-visible {
    background: var(--fg, #0f0f0d);
    color: var(--bg, #fbfaf7);
    border-color: var(--fg, #0f0f0d);
  }

  /* Mobile adjustments */
  @media (max-width: 640px) {
    .breadcrumb {
      font-size: 0.7rem;
      padding: 0.4rem 0.8rem;
    }

    .back-button {
      padding: 0.5rem 0.8rem;
      font-size: 0.8rem;
    }

    .back-button span {
      display: none;
    }

    .volume-drawer {
      width: 100vw;
      padding: 2rem 1.5rem;
    }
  }
</style>
