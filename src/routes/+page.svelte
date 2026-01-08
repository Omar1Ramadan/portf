<script lang="ts">
  import { walls, type Volume } from '$lib/data/library';

  type DrawerState = {
    wallLabel: string;
    volume: Volume;
  } | null;

  let drawer: DrawerState = null;
  let hasEntered = false;
  let activeWall = walls[0]?.id ?? '';

  const openDrawer = (volume: Volume, wallLabel: string) => {
    drawer = { wallLabel, volume };
  };

  const closeDrawer = () => {
    drawer = null;
  };

  const registerWall = (node: HTMLElement, wallId: string) => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            activeWall = wallId;
          }
        });
      },
      {
        rootMargin: '-40% 0px -40% 0px',
        threshold: 0
      }
    );

    observer.observe(node);

    return {
      destroy() {
        observer.disconnect();
      }
    };
  };

  const enterLibrary = () => {
    hasEntered = true;
  };
</script>

<svelte:head>
  <title>Systems Library · Hexagonal Archive</title>
  <meta
    name="description"
    content="Hexagonal archive of engineered systems arranged across six repeating walls."
  />
</svelte:head>

<svelte:window
  on:keydown={(event) => {
    if (event.key === 'Escape') closeDrawer();
  }}
/>

{#if !hasEntered}
  <section class="start-screen" aria-labelledby="start-title">
    <div class="start-panel">
      <p class="start-label">Systems Archive</p>
      <h1 id="start-title">
        <span>HEXAGONAL</span>
        <span>INFINITE LIBRARY</span>
      </h1>
      <p class="start-role">Software Engineer</p>
      <p class="start-focus">Systems · AI · Web</p>
      <button class="enter-button" type="button" on:click={enterLibrary}>
        Enter Library
      </button>
    </div>
  </section>
{:else}
  <main class="library-shell">
    <section class="core-panel" id="core">
      <div class="core-heading">
        <p class="core-label">Library Core</p>
        <h1>Systems Archive</h1>
        <p class="core-summary">
          Six walls of engineered systems. Each shelf is a category, each volume a single project. Scroll
          vertically to move between walls and horizontally to scan the volumes within.
        </p>
      </div>
      <div class="core-meta">
        <p>Walls: {walls.length}</p>
        <p>Volumes: {walls.reduce((count, wall) => count + wall.volumes.length, 0)}</p>
      </div>
    </section>

    <aside class="wall-index" aria-label="Wall index">
      <p class="index-label">Walls</p>
      <ul>
        {#each walls as wall}
          <li>
            <a
              href={`#${wall.id}`}
              class:active={activeWall === wall.id}
              aria-current={activeWall === wall.id ? 'true' : undefined}
            >
              {wall.label}
            </a>
          </li>
        {/each}
      </ul>
    </aside>

    <section class="walls">
      {#each walls as wall, index}
        <article class="wall-section" id={wall.id} use:registerWall={wall.id}>
          <header class="wall-header">
            <div>
              <p class="wall-order">Wall {String(index + 1).padStart(2, '0')}</p>
              <h2>{wall.label}</h2>
            </div>
            <div class="wall-description">
              <p class="wall-descriptor">{wall.descriptor}</p>
              <p class="wall-focus">{wall.focus}</p>
            </div>
          </header>
          <div class="volume-track" aria-label={`${wall.label} volumes`} role="list">
            {#each wall.volumes as volume}
              <button
                type="button"
                class="volume-card"
                role="listitem"
                on:click={() => openDrawer(volume, wall.label)}
              >
                <p class="volume-title">{volume.title}</p>
                <p class="volume-stack">{volume.stack}</p>
                <p class="volume-summary">{volume.summary}</p>
                <p class="volume-meta">{volume.metadata}</p>
              </button>
            {/each}
          </div>
        </article>
      {/each}
    </section>
  </main>

  <div class="drawer-backdrop" class:visible={!!drawer} on:click={closeDrawer} aria-hidden="true"></div>
  <section class="volume-drawer" class:open={!!drawer} aria-hidden={!drawer} aria-live="polite">
    <button class="drawer-close" type="button" aria-label="Close details" on:click={closeDrawer}>
      ×
    </button>
    {#if drawer}
      <p class="drawer-shelf">{drawer.wallLabel}</p>
      <h3 class="drawer-title">{drawer.volume.title}</h3>
      <p class="drawer-stack">{drawer.volume.stack}</p>
      <p class="drawer-meta">{drawer.volume.metadata}</p>
      <p class="drawer-details">{drawer.volume.details}</p>
    {/if}
  </section>
{/if}
