<script lang="ts">
  import { onMount, tick } from 'svelte';
  import {
    portfolioContent,
    type Achievement,
    type LinkItem,
    type Project,
    type SkillGroup
  } from '$lib/data/portfolio';

  type HistoryEntry =
    | { id: number; type: 'system'; lines: string[] }
    | { id: number; type: 'command'; value: string }
    | { id: number; type: 'help'; commands: string[] }
    | {
        id: number;
        type: 'about';
        title: string;
        summary: string;
        note: string;
        stats: Array<{ label: string; value: string }>;
      }
    | { id: number; type: 'projects'; projects: Project[] }
    | { id: number; type: 'project'; project: Project }
    | { id: number; type: 'skills'; groups: SkillGroup[] }
    | { id: number; type: 'proof'; items: Achievement[] }
    | { id: number; type: 'contact'; title: string; note: string; links: LinkItem[] }
    | { id: number; type: 'error'; message: string };

  const { hero, projects, skills, achievements, about } = portfolioContent;

  const supportedCommands = [
    '/help',
    '/about',
    '/projects',
    '/project <slug|number>',
    '/skills',
    '/proof',
    '/contact',
    '/clear'
  ];

  const taskbarApps = [
    { id: 'start', label: 'Start', kind: 'windows' },
    { id: 'browser', label: 'Browser', kind: 'chrome' },
    { id: 'files', label: 'Files', kind: 'folder' },
    { id: 'music', label: 'Music', kind: 'music' },
    { id: 'docs', label: 'Docs', kind: 'word' },
    { id: 'chat', label: 'Chat', kind: 'chat' },
    { id: 'terminal', label: 'Terminal', kind: 'terminal' }
  ] as const;

  let history: HistoryEntry[] = [];
  let command = '';
  let nextId = 1;
  let terminalOpen = false;
  let taskbarVisible = false;
  let inputEl: HTMLInputElement;
  let historyEl: HTMLDivElement;

  onMount(() => {
    resetHistory();
  });

  function resetHistory() {
    history = [
      createSystemEntry([
        'portfolio-terminal v1.0.0 booted',
        'Type /help to inspect available commands.'
      ])
    ];
  }

  function createSystemEntry(lines: string[]): HistoryEntry {
    return { id: nextId++, type: 'system', lines };
  }

  function createHelpEntry(): HistoryEntry {
    return { id: nextId++, type: 'help', commands: supportedCommands };
  }

  async function openTerminal() {
    terminalOpen = true;
    await tick();
    await scrollToBottom();
    inputEl?.focus();
  }

  function closeTerminal() {
    terminalOpen = false;
  }

  async function submitCommand(rawValue = command) {
    const trimmed = rawValue.trim();
    if (!trimmed) return;

    history = [...history, { id: nextId++, type: 'command', value: trimmed }];
    command = '';

    const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    const [cmd, ...args] = normalized.split(/\s+/);
    const payload = args.join(' ').trim();

    switch (cmd.toLowerCase()) {
      case '/help':
        history = [...history, createHelpEntry()];
        break;
      case '/about':
        history = [
          ...history,
          {
            id: nextId++,
            type: 'about',
            title: hero.role,
            summary: hero.summary,
            note: about.summary,
            stats: hero.stats
          }
        ];
        break;
      case '/projects':
        history = [...history, { id: nextId++, type: 'projects', projects }];
        break;
      case '/project':
        pushProjectEntry(payload);
        break;
      case '/skills':
        history = [...history, { id: nextId++, type: 'skills', groups: skills }];
        break;
      case '/proof':
        history = [...history, { id: nextId++, type: 'proof', items: achievements }];
        break;
      case '/contact':
        history = [
          ...history,
          {
            id: nextId++,
            type: 'contact',
            title: about.title,
            note: about.contactNote,
            links: [...hero.links, ...about.links]
          }
        ];
        break;
      case '/clear':
        resetHistory();
        break;
      default:
        history = [
          ...history,
          {
            id: nextId++,
            type: 'error',
            message: `Unknown command "${trimmed}". Type /help for valid commands.`
          }
        ];
        break;
    }

    await scrollToBottom();
    inputEl?.focus();
  }

  function pushProjectEntry(payload: string) {
    if (!payload) {
      history = [
        ...history,
        {
          id: nextId++,
          type: 'error',
          message: 'Missing project reference. Use /projects first, then /project <slug|number>.'
        }
      ];
      return;
    }

    const numericIndex = Number(payload);
    const project =
      Number.isInteger(numericIndex) && numericIndex > 0
        ? projects[numericIndex - 1]
        : projects.find((item) => item.slug === payload.toLowerCase());

    if (!project) {
      history = [
        ...history,
        {
          id: nextId++,
          type: 'error',
          message: `Project "${payload}" was not found.`
        }
      ];
      return;
    }

    history = [...history, { id: nextId++, type: 'project', project }];
  }

  async function scrollToBottom() {
    await tick();
    if (historyEl) historyEl.scrollTop = historyEl.scrollHeight;
  }
</script>

<svelte:head>
  <title>Omar | Desktop Terminal Portfolio</title>
  <meta
    name="description"
    content="A desktop-style portfolio that reveals a taskbar and opens into a command-driven terminal."
  />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<svelte:window
  on:keydown={(event) => {
    if (event.key === 'Escape' && terminalOpen) closeTerminal();
  }}
/>

<main
  class="desktop"
  on:mousemove={(event) => {
    taskbarVisible = event.clientY > window.innerHeight - 120;
  }}
  on:mouseleave={() => {
    if (!terminalOpen) taskbarVisible = false;
  }}
>
  <div class="desktop-wallpaper">
    <div class="wallpaper-glow wallpaper-glow-left"></div>
    <div class="wallpaper-glow wallpaper-glow-right"></div>
    <div class="wallpaper-lines" aria-hidden="true"></div>
  </div>

  <div class="hover-zone" on:mouseenter={() => (taskbarVisible = true)}></div>

  <nav
    class="taskbar"
    class:visible={taskbarVisible || terminalOpen}
    on:mouseenter={() => (taskbarVisible = true)}
    aria-label="Desktop taskbar"
  >
    <div class="taskbar-inner">
      {#each taskbarApps as app}
        <button
          type="button"
          class="taskbar-app"
          class:active={app.id === 'terminal' && terminalOpen}
          aria-label={app.label}
          on:click={() => {
            if (app.id === 'terminal') {
              openTerminal();
            }
          }}
        >
          <span class={`app-icon ${app.kind}`}></span>
        </button>
      {/each}
    </div>
  </nav>

  {#if terminalOpen}
    <section class="terminal-window" aria-label="Portfolio terminal">
      <header class="window-bar">
        <div class="window-tabs">
          <div class="window-tab">
            <span class="tab-icon icon-blue"></span>
            <span>Windows PowerShell</span>
          </div>
          <div class="window-tab active">
            <span class="tab-icon icon-green"></span>
            <span>MINGW64:/c/Users/OMAR</span>
          </div>
        </div>

        <div class="window-controls">
          <button type="button" aria-label="Minimize"></button>
          <button type="button" aria-label="Maximize"></button>
          <button type="button" aria-label="Close terminal" on:click={closeTerminal}></button>
        </div>
      </header>

      <div class="terminal-surface">
        <div class="terminal-history" bind:this={historyEl} aria-live="polite">
          {#each history as entry (entry.id)}
            {#if entry.type === 'system'}
              <article class="entry entry-system">
                {#each entry.lines as line}
                  <p>{line}</p>
                {/each}
              </article>
            {:else if entry.type === 'command'}
              <article class="entry entry-command">
                <span class="entry-prompt">visitor@portfolio:~$</span>
                <span>{entry.value}</span>
              </article>
            {:else if entry.type === 'help'}
              <article class="entry entry-block">
                <p class="entry-label">command index</p>
                <ul class="command-list">
                  {#each entry.commands as item}
                    <li>{item}</li>
                  {/each}
                </ul>
              </article>
            {:else if entry.type === 'about'}
              <article class="entry entry-block">
                <p class="entry-label">about</p>
                <h1>{hero.name}</h1>
                <p class="entry-title">{entry.title}</p>
                <p>{entry.summary}</p>
                <p>{entry.note}</p>
                <div class="stat-grid">
                  {#each entry.stats as stat}
                    <div class="stat-card">
                      <span>{stat.label}</span>
                      <strong>{stat.value}</strong>
                    </div>
                  {/each}
                </div>
              </article>
            {:else if entry.type === 'projects'}
              <article class="entry entry-block">
                <p class="entry-label">projects</p>
                <div class="project-list">
                  {#each entry.projects as project, index}
                    <button
                      type="button"
                      class="project-row"
                      on:click={() => submitCommand(`/project ${project.slug}`)}
                    >
                      <span class="project-index">{String(index + 1).padStart(2, '0')}</span>
                      <span class="project-main">
                        <strong>{project.title}</strong>
                        <span>{project.summary}</span>
                      </span>
                      <span class="project-meta">{project.status}</span>
                    </button>
                  {/each}
                </div>
              </article>
            {:else if entry.type === 'project'}
              <article class="entry entry-block">
                <p class="entry-label">{entry.project.kicker}</p>
                <h2>{entry.project.title}</h2>
                <div class="inline-meta">
                  <span>{entry.project.status}</span>
                  <span>{entry.project.year}</span>
                </div>
                <p>{entry.project.details}</p>
                <p class="entry-accent">{entry.project.impact}</p>

                <div class="token-row">
                  {#each entry.project.stack as item}
                    <span class="token">{item}</span>
                  {/each}
                </div>

                <ul class="detail-list">
                  {#each entry.project.highlights as item}
                    <li>{item}</li>
                  {/each}
                </ul>

                {#if entry.project.links.length}
                  <div class="link-row">
                    {#each entry.project.links as link}
                      <a href={link.href}>{link.label}</a>
                    {/each}
                  </div>
                {/if}
              </article>
            {:else if entry.type === 'skills'}
              <article class="entry entry-block">
                <p class="entry-label">skills</p>
                <div class="skill-grid">
                  {#each entry.groups as group}
                    <section class="skill-card">
                      <h2>{group.title}</h2>
                      <p>{group.summary}</p>
                      <ul class="detail-list">
                        {#each group.items as item}
                          <li>{item}</li>
                        {/each}
                      </ul>
                    </section>
                  {/each}
                </div>
              </article>
            {:else if entry.type === 'proof'}
              <article class="entry entry-block">
                <p class="entry-label">proof</p>
                <div class="proof-list">
                  {#each entry.items as item}
                    <section class="proof-card">
                      <div class="inline-meta">
                        <span>{item.context}</span>
                        <span>{item.year}</span>
                      </div>
                      <h2>{item.title}</h2>
                      <p>{item.note}</p>
                    </section>
                  {/each}
                </div>
              </article>
            {:else if entry.type === 'contact'}
              <article class="entry entry-block">
                <p class="entry-label">contact</p>
                <h2>{entry.title}</h2>
                <p>{entry.note}</p>
                <div class="link-row">
                  {#each entry.links as link}
                    <a href={link.href}>{link.label}</a>
                  {/each}
                </div>
              </article>
            {:else if entry.type === 'error'}
              <article class="entry entry-error">
                <p>{entry.message}</p>
              </article>
            {/if}
          {/each}
        </div>

        <form class="terminal-inputbar" on:submit|preventDefault={() => submitCommand()}>
          <label class="sr-only" for="command-input">Enter a portfolio command</label>
          <span class="entry-prompt">visitor@portfolio:~$</span>
          <input
            id="command-input"
            bind:this={inputEl}
            bind:value={command}
            type="text"
            autocomplete="off"
            spellcheck="false"
            placeholder="Type /help"
          />
        </form>
      </div>
    </section>
  {/if}
</main>

<style>
  .desktop {
    position: relative;
    min-height: 100vh;
    overflow: hidden;
    background: #030504;
    color: #d8ffe5;
  }

  .desktop-wallpaper {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 18% 22%, rgba(31, 82, 136, 0.32), transparent 28%),
      radial-gradient(circle at 82% 12%, rgba(92, 255, 151, 0.1), transparent 22%),
      linear-gradient(180deg, #08110d 0%, #040705 100%);
  }

  .wallpaper-glow {
    position: absolute;
    inset: auto;
    width: 38vw;
    height: 38vw;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.22;
  }

  .wallpaper-glow-left {
    left: -8vw;
    top: -10vw;
    background: #174c8b;
  }

  .wallpaper-glow-right {
    right: -10vw;
    top: -8vw;
    background: #0f6c4f;
  }

  .wallpaper-lines {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 44px 44px;
    mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.7), transparent 85%);
  }

  .hover-zone {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    height: 120px;
    z-index: 15;
  }

  .taskbar {
    position: fixed;
    left: 50%;
    bottom: 18px;
    z-index: 20;
    transform: translate(-50%, 120%);
    transition: transform 0.22s ease;
  }

  .taskbar.visible {
    transform: translate(-50%, 0);
  }

  .taskbar-inner {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.7rem 0.95rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    background: rgba(17, 24, 20, 0.82);
    backdrop-filter: blur(18px);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
  }

  .taskbar-app {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 46px;
    height: 46px;
    padding: 0;
    border: 0;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.02);
    cursor: pointer;
    transition:
      transform 0.18s ease,
      background-color 0.18s ease;
  }

  .taskbar-app:hover,
  .taskbar-app:focus-visible,
  .taskbar-app.active {
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.08);
  }

  .app-icon {
    position: relative;
    width: 26px;
    height: 26px;
    border-radius: 6px;
    display: inline-block;
  }

  .app-icon.windows {
    border-radius: 4px;
    background:
      linear-gradient(90deg, transparent 46%, rgba(255, 255, 255, 0.18) 46%, rgba(255, 255, 255, 0.18) 54%, transparent 54%),
      linear-gradient(transparent 46%, rgba(255, 255, 255, 0.18) 46%, rgba(255, 255, 255, 0.18) 54%, transparent 54%),
      linear-gradient(135deg, #79c8ff, #2a7ff1);
  }

  .app-icon.chrome {
    border-radius: 50%;
    background:
      radial-gradient(circle at center, #3f7cff 0 25%, #ffffff 26% 34%, transparent 35%),
      conic-gradient(#e94f3d 0 33%, #f2be42 33% 66%, #25a45a 66% 100%);
  }

  .app-icon.folder {
    background: linear-gradient(180deg, #f2c142 0 40%, #d8a52f 40% 100%);
  }

  .app-icon.folder::before {
    content: '';
    position: absolute;
    left: 2px;
    top: -2px;
    width: 12px;
    height: 7px;
    border-radius: 4px 4px 0 0;
    background: #e1b43f;
  }

  .app-icon.music {
    background: linear-gradient(135deg, #ff6077, #d93c5f);
  }

  .app-icon.music::before,
  .app-icon.music::after {
    content: '';
    position: absolute;
    background: white;
  }

  .app-icon.music::before {
    width: 3px;
    height: 12px;
    right: 8px;
    top: 5px;
  }

  .app-icon.music::after {
    width: 10px;
    height: 3px;
    right: 8px;
    top: 5px;
  }

  .app-icon.word {
    background: linear-gradient(135deg, #377cf6, #1f4cbf);
  }

  .app-icon.word::before {
    content: 'W';
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: white;
    font: 700 14px/1 'IBM Plex Mono', monospace;
  }

  .app-icon.chat {
    background: linear-gradient(135deg, #7f74ff, #5964ff);
  }

  .app-icon.chat::before {
    content: '';
    position: absolute;
    left: 5px;
    top: 6px;
    width: 16px;
    height: 12px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.9);
  }

  .app-icon.chat::after {
    content: '';
    position: absolute;
    left: 8px;
    bottom: 4px;
    width: 6px;
    height: 6px;
    transform: rotate(45deg);
    background: rgba(255, 255, 255, 0.9);
  }

  .app-icon.terminal {
    background: linear-gradient(180deg, #2d3531, #151917);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }

  .app-icon.terminal::before {
    content: '>_';
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: #d8ffe5;
    font: 600 10px/1 'IBM Plex Mono', monospace;
  }

  .terminal-window {
    position: fixed;
    inset: 18px 18px 92px;
    z-index: 30;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    background: #050906;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 30px 100px rgba(0, 0, 0, 0.5);
    overflow: hidden;
  }

  .window-bar {
    min-height: 50px;
    display: flex;
    justify-content: space-between;
    align-items: stretch;
    gap: 1rem;
    padding: 0 0.6rem;
    background: #2c2b2b;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .window-tabs {
    display: flex;
    gap: 0.35rem;
    min-width: 0;
  }

  .window-tab {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    min-width: 0;
    padding: 0 1rem;
    color: #dadada;
    background: #353334;
    border-radius: 10px 10px 0 0;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.95rem;
  }

  .window-tab.active {
    background: #111211;
    color: #f2f2f2;
  }

  .tab-icon {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    flex: 0 0 auto;
  }

  .icon-blue {
    background: linear-gradient(135deg, #5ba6ff, #3567d8);
  }

  .icon-green {
    background: linear-gradient(135deg, #4efa7b, #198a55);
  }

  .window-controls {
    display: flex;
    align-items: center;
    gap: 0.2rem;
  }

  .window-controls button {
    width: 42px;
    border: 0;
    background: transparent;
    cursor: pointer;
    position: relative;
  }

  .window-controls button::before {
    content: '';
    position: absolute;
    inset: 50% auto auto 50%;
    transform: translate(-50%, -50%);
    border: 1px solid rgba(255, 255, 255, 0.66);
    width: 10px;
    height: 10px;
  }

  .window-controls button:first-child::before {
    width: 10px;
    height: 1px;
    border: 0;
    background: rgba(255, 255, 255, 0.72);
  }

  .window-controls button:last-child:hover {
    background: #d14444;
  }

  .terminal-surface {
    min-height: 0;
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    background:
      linear-gradient(rgba(78, 250, 123, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(78, 250, 123, 0.04) 1px, transparent 1px),
      #050906;
    background-size: 24px 24px, 24px 24px, auto;
  }

  .terminal-history,
  .terminal-inputbar {
    padding-inline: clamp(0.75rem, 1.8vw, 1.5rem);
  }

  .terminal-history {
    padding-top: 1rem;
    padding-bottom: 1rem;
    overflow: auto;
  }

  .entry,
  .entry-system p,
  .entry-command,
  .entry-block p,
  .entry-error p,
  .project-row span,
  .skill-card p,
  .proof-card p,
  .detail-list {
    margin: 0;
  }

  .entry {
    margin-bottom: 1rem;
  }

  .entry-system {
    color: #8fb49c;
    line-height: 1.7;
  }

  .entry-command {
    display: flex;
    gap: 0.7rem;
    align-items: center;
    color: #f5fff8;
  }

  .entry-prompt,
  .entry-label,
  .inline-meta,
  .project-meta,
  .project-index,
  .token,
  .terminal-inputbar input {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.75rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .entry-prompt {
    color: #4efa7b;
    text-transform: none;
  }

  .entry-label,
  .inline-meta,
  .project-meta,
  .project-index {
    color: #8fb49c;
  }

  .entry-block,
  .entry-error {
    padding: 1rem 0;
    border-top: 1px solid rgba(92, 255, 151, 0.12);
    background: transparent;
  }

  .entry-error {
    border-top-color: rgba(255, 107, 107, 0.28);
    color: #ffd1d1;
  }

  .entry-block h1,
  .entry-block h2 {
    margin: 0 0 0.65rem;
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    letter-spacing: -0.04em;
    color: #effff4;
  }

  .entry-block h1 {
    font-size: clamp(2rem, 5vw, 3rem);
  }

  .entry-block h2 {
    font-size: 1.25rem;
  }

  .entry-title,
  .entry-block p {
    color: #b8d5c0;
    line-height: 1.75;
  }

  .entry-accent {
    color: #f6ffc4 !important;
  }

  .command-list,
  .detail-list {
    padding-left: 1.1rem;
    color: #d8ffe5;
  }

  .command-list li,
  .detail-list li {
    margin-bottom: 0.45rem;
  }

  .stat-grid,
  .skill-grid,
  .proof-list {
    display: grid;
    gap: 0.9rem;
    margin-top: 1rem;
  }

  .stat-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }

  .stat-card,
  .skill-card,
  .proof-card {
    padding: 0.9rem;
    border: 1px solid rgba(92, 255, 151, 0.12);
    border-radius: 8px;
    background: rgba(10, 18, 13, 0.72);
  }

  .stat-card span {
    display: block;
    margin-bottom: 0.4rem;
    color: #8fb49c;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .stat-card strong {
    color: #effff4;
    font-size: 1rem;
  }

  .project-list {
    display: grid;
    gap: 0.7rem;
  }

  .project-row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 0.9rem;
    align-items: start;
    width: 100%;
    padding: 0.9rem;
    border: 1px solid rgba(92, 255, 151, 0.1);
    border-radius: 8px;
    background: rgba(10, 18, 13, 0.76);
    color: #d8ffe5;
    cursor: pointer;
    text-align: left;
    transition:
      transform 0.18s ease,
      border-color 0.18s ease;
  }

  .project-row:hover,
  .project-row:focus-visible {
    transform: translateY(-1px);
    border-color: rgba(92, 255, 151, 0.3);
  }

  .project-main {
    display: grid;
    gap: 0.35rem;
  }

  .project-main strong {
    color: #effff4;
    font-size: 1rem;
  }

  .project-main span {
    color: #a9c5b1;
    line-height: 1.55;
    text-transform: none;
    letter-spacing: 0;
    font-family: 'Space Grotesk', sans-serif;
  }

  .inline-meta {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.85rem;
  }

  .token-row,
  .link-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.7rem;
    margin-top: 0.9rem;
  }

  .token {
    padding: 0.38rem 0.55rem;
    border: 1px solid rgba(92, 255, 151, 0.12);
    border-radius: 999px;
    color: #f6ffc4;
    background: rgba(22, 36, 28, 0.78);
  }

  .link-row a {
    color: #7fd895;
    text-decoration: none;
  }

  .link-row a:hover,
  .link-row a:focus-visible {
    color: #f6ffc4;
  }

  .skill-grid {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .skill-card h2,
  .proof-card h2 {
    margin-top: 0;
  }

  .terminal-inputbar {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.85rem;
    align-items: center;
    min-height: 70px;
    border-top: 1px solid rgba(92, 255, 151, 0.12);
    background: rgba(6, 10, 8, 0.94);
  }

  .terminal-inputbar input {
    width: 100%;
    min-height: 44px;
    padding: 0 0.1rem;
    border: 0;
    outline: 0;
    background: transparent;
    color: #effff4;
    text-transform: none;
    letter-spacing: 0;
    font-size: 1rem;
  }

  .terminal-inputbar input::placeholder {
    color: #6f8d78;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @media (max-width: 720px) {
    .taskbar {
      bottom: 10px;
    }

    .taskbar-inner {
      gap: 0.35rem;
      padding: 0.55rem 0.7rem;
    }

    .taskbar-app {
      width: 40px;
      height: 40px;
    }

    .terminal-window {
      inset: 8px 8px 78px;
    }

    .window-tab {
      font-size: 0.8rem;
      padding-inline: 0.7rem;
    }

    .project-row {
      grid-template-columns: 1fr;
    }
  }
</style>
