<script lang="ts">
  import { onMount } from 'svelte';
  import { shelves, type Volume } from '$lib/data/library';

  type DrawerState = {
    shelfLabel: string;
    volume: Volume;
  } | null;

  let drawer: DrawerState = null;
  let activeShelf = shelves[0]?.id ?? '';
  let shelfRefs: HTMLElement[] = [];
  let observer: IntersectionObserver | null = null;

  const openDrawer = (volume: Volume, shelfLabel: string) => {
    drawer = { shelfLabel, volume };
  };

  const closeDrawer = () => {
    drawer = null;
  };

  const trackShelf = (node: HTMLElement, index: number) => {
    shelfRefs[index] = node;
    observer?.observe(node);
    return {
      destroy() {
        observer?.unobserve(node);
        shelfRefs = shelfRefs.filter((ref) => ref !== node);
      }
    };
  };

  onMount(() => {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            activeShelf = entry.target.id;
          }
        });
      },
      {
        rootMargin: '-30% 0px -60% 0px',
        threshold: 0
      }
    );

    shelfRefs.forEach((section) => observer?.observe(section));

    return () => {
      observer?.disconnect();
      observer = null;
    };
  });
</script>

<svelte:head>
  <title>Milestone 2 · Systems Library Portfolio</title>
  <meta
    name="description"
    content="Structural wireframe for the Systems Library portfolio: landing, shelves, and drawer plan."
  />
</svelte:head>

<svelte:window
  on:keydown={(event) => {
    if (event.key === 'Escape') closeDrawer();
  }}
/>

<main class="library-page">
  <section class="entry-screen" id="top">
    <div class="entry-content">
      <p class="entry-label">Milestone 2 · Structural Wireframe</p>
      <h1>Systems Library Portfolio</h1>
      <p class="entry-subtitle">
        Shelves represent domains, volumes capture singular systems. The layout prioritizes vertical shelf
        stacking and horizontal browsing within each track.
      </p>
      <p class="entry-instruction">Scroll to browse volumes.</p>
    </div>
  </section>

  <div class="library-body">
    <section class="shelves" aria-label="Project shelves">
      {#each shelves as shelf, index}
        <section class="shelf" id={shelf.id} use:trackShelf={index}>
          <header class="shelf-header">
            <p class="shelf-order">Shelf {String(index + 1).padStart(2, '0')}</p>
            <div class="shelf-heading">
              <h2>{shelf.label}</h2>
              <p class="shelf-descriptor">{shelf.descriptor}</p>
              <p class="shelf-focus">{shelf.focus}</p>
            </div>
            <p class="shelf-count">{shelf.volumes.length} volumes</p>
          </header>
          <ul class="volume-row" aria-label={`${shelf.label} volumes`}>
            {#each shelf.volumes as volume}
              <li class="volume-item" role="listitem">
                <button
                  type="button"
                  class="volume-card"
                  on:click={() => openDrawer(volume, shelf.label)}
                >
                  <p class="volume-meta">{volume.metadata}</p>
                  <h3 class="volume-title">{volume.title}</h3>
                  <p class="volume-stack">{volume.stack}</p>
                  <p class="volume-summary">{volume.summary}</p>
                  <div class="volume-links" aria-label="Volume links">
                    {#if volume.links?.github}
                      <a
                        class="volume-link"
                        href={volume.links.github}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`${volume.title} repository`}
                      >
                        GH
                      </a>
                    {/if}
                    {#if volume.links?.demo}
                      <a
                        class="volume-link"
                        href={volume.links.demo}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`${volume.title} live demo`}
                      >
                        ↗
                      </a>
                    {/if}
                  </div>
                </button>
              </li>
            {/each}
          </ul>
        </section>
      {/each}
    </section>

    <aside class="shelf-index" aria-label="Shelf index">
      <p class="index-label">Shelves</p>
      <ul>
        {#each shelves as shelf}
          <li>
            <a
              href={`#${shelf.id}`}
              class:active={shelf.id === activeShelf}
              aria-current={shelf.id === activeShelf ? 'true' : undefined}
            >
              {shelf.label}
            </a>
          </li>
        {/each}
      </ul>
    </aside>
  </div>
</main>

<div class="drawer-backdrop" class:visible={!!drawer} on:click={closeDrawer} aria-hidden="true"></div>
<section class="volume-drawer" class:open={!!drawer} aria-hidden={!drawer} aria-live="polite">
  <button class="drawer-close" type="button" aria-label="Close details" on:click={closeDrawer}>
    ×
  </button>
  {#if drawer}
    <p class="drawer-shelf">{drawer.shelfLabel}</p>
    <h3 class="drawer-title">{drawer.volume.title}</h3>
    <p class="drawer-stack">{drawer.volume.stack}</p>
    <p class="drawer-meta">{drawer.volume.metadata}</p>
    <p class="drawer-details">{drawer.volume.details}</p>
    <div class="drawer-links">
      {#if drawer.volume.links?.github}
        <a href={drawer.volume.links.github} target="_blank" rel="noreferrer">Repository</a>
      {/if}
      {#if drawer.volume.links?.demo}
        <a href={drawer.volume.links.demo} target="_blank" rel="noreferrer">Live Demo</a>
      {/if}
    </div>
  {/if}
</section>
