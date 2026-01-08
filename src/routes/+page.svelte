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
  let hasEntered = false;

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

  const enterLibrary = () => {
    hasEntered = true;
    if (typeof document !== 'undefined') {
      setTimeout(() => {
        document.getElementById('top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  };
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

{#if !hasEntered}
  <section class="start-screen" aria-labelledby="start-title">
    <div class="start-panel">
      <p class="start-label">Systems Archive</p>
      <h1 id="start-title">
        <span>THE INFINITE</span>
        <span>LIBRARY</span>
      </h1>
      <p class="start-role">Software Engineer</p>
      <p class="start-focus">Systems • AI • Web</p>
      <button class="enter-button" type="button" on:click={enterLibrary}>
        Enter Library
      </button>
    </div>
  </section>
{:else}
  <main class="library-page">
    <section class="entry-screen" id="top">
      <div class="entry-content">
        <p class="entry-label">Systems Portfolio</p>
        <h1>Systems Library</h1>
        <p class="entry-subtitle">
          Vertical shelves extend upward and downward. Each horizontal row is a catalog of self-contained
          volumes spanning distributed systems, data, automation, and experiments.
        </p>
        <p class="entry-instruction">Scroll vertically to navigate shelves. Swipe horizontally to scan volumes.</p>
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
{/if}
