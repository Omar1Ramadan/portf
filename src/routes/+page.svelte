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

  type SearchResult = {
    title: string;
    url: string;
    snippet: string;
  };

  type BrowserPage =
    | { type: 'google-home'; title: string; url: string }
    | { type: 'search-results'; title: string; url: string; query: string; results: SearchResult[] }
    | { type: 'portfolio-home'; title: string; url: string }
    | { type: 'portfolio-projects'; title: string; url: string }
    | { type: 'portfolio-project'; title: string; url: string; project: Project }
    | { type: 'terminal-info'; title: string; url: string }
    | { type: 'dogs-gallery'; title: string; url: string; images: string[] }
    | { type: 'not-found'; title: string; url: string; attempted: string };

  type BrowserTab = {
    id: number;
    label: string;
    history: BrowserPage[];
    historyIndex: number;
  };

  type WindowBox = {
    x: number;
    y: number;
    width: number;
    height: number;
    maximized: boolean;
    minimized: boolean;
  };

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
  const dogImages = [
    'https://placedog.net/640/640?id=11',
    'https://placedog.net/640/640?id=22',
    'https://placedog.net/640/640?id=33',
    'https://placedog.net/640/640?id=44',
    'https://placedog.net/640/640?id=55',
    'https://placedog.net/640/640?id=66'
  ];

  let history: HistoryEntry[] = [];
  let command = '';
  let nextId = 1;
  let terminalOpen = false;
  let browserOpen = false;
  let taskbarVisible = false;
  let browserAddress = 'google.local';
  let browserTabs: BrowserTab[] = [];
  let activeBrowserTabId = 1;
  let nextBrowserTabId = 2;
  let browserWarning = '';
  let browserWarningTimer: ReturnType<typeof setTimeout> | null = null;
  let browserHomeQuery = '';
  let inputEl: HTMLInputElement;
  let historyEl: HTMLDivElement;
  let activeBrowserTab: BrowserTab | undefined;
  let activeBrowserPage: BrowserPage | undefined;
  let canGoBack = false;
  let canGoForward = false;
  let browserWindow: WindowBox = {
    x: 120,
    y: 42,
    width: 920,
    height: 640,
    maximized: false,
    minimized: false
  };
  let terminalWindow: WindowBox = {
    x: 18,
    y: 18,
    width: 1200,
    height: 720,
    maximized: false,
    minimized: false
  };
  let browserRestoreBox: WindowBox | null = null;
  let terminalRestoreBox: WindowBox | null = null;
  let activeDrag:
    | {
        kind: 'move' | 'resize';
        window: 'browser' | 'terminal';
        edge?: 'left' | 'right' | 'bottom' | 'bottom-right' | 'bottom-left';
        startX: number;
        startY: number;
        startBox: WindowBox;
      }
    | null = null;
  let windowOrder: Array<'browser' | 'terminal'> = ['browser', 'terminal'];

  $: activeBrowserTab = browserTabs.find((tab) => tab.id === activeBrowserTabId);
  $: activeBrowserPage = activeBrowserTab ? activeBrowserTab.history[activeBrowserTab.historyIndex] : undefined;
  $: canGoBack = !!activeBrowserTab && activeBrowserTab.historyIndex > 0;
  $: canGoForward = !!activeBrowserTab && activeBrowserTab.historyIndex < activeBrowserTab.history.length - 1;
  $: browserZIndex = windowOrder.indexOf('browser') === -1 ? 26 : 26 + windowOrder.indexOf('browser');
  $: terminalZIndex = windowOrder.indexOf('terminal') === -1 ? 26 : 26 + windowOrder.indexOf('terminal');

  onMount(() => {
    resetHistory();
    browserTabs = [createBrowserTab(1, createGoogleHomePage())];
    fitWindowsToViewport();
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
    focusWindow('terminal');
    await tick();
    await scrollToBottom();
    inputEl?.focus();
  }

  function closeTerminal() {
    terminalOpen = false;
  }

  function openBrowser() {
    browserOpen = true;
    fitWindowsToViewport();
    focusWindow('browser');
    syncBrowserAddress();
  }

  function closeBrowser() {
    browserOpen = false;
    clearBrowserWarning();
  }

  function createGoogleHomePage(): BrowserPage {
    return { type: 'google-home', title: 'New Tab', url: 'google.local' };
  }

  function createBrowserTab(id: number, page: BrowserPage): BrowserTab {
    return {
      id,
      label: page.title,
      history: [page],
      historyIndex: 0
    };
  }

  function syncBrowserAddress() {
    const page = activeBrowserPage;
    browserAddress = page?.url ?? 'google.local';
  }

  function normalizeInput(value: string) {
    return value.trim().toLowerCase();
  }

  function buildSearchResults(query: string): SearchResult[] {
    const q = query.toLowerCase();
    const results: SearchResult[] = [];

    if ('portfolio'.includes(q) || q.includes('portfolio')) {
      results.push({
        title: 'Portfolio Home',
        url: 'portfolio.local',
        snippet: 'Local portfolio landing page with project, skills, and contact shortcuts.'
      });
    }

    if ('projects'.includes(q) || q.includes('project')) {
      results.push({
        title: 'Portfolio Projects',
        url: 'portfolio.local/projects',
        snippet: 'Browse featured projects and jump into individual project records.'
      });
    }

    if ('terminal'.includes(q) || q.includes('shell')) {
      results.push({
        title: 'Portfolio Terminal',
        url: 'portfolio.local/terminal',
        snippet: 'Open the command-driven portfolio terminal from inside the browser.'
      });
    }

    for (const project of projects) {
      const haystack = `${project.title} ${project.summary} ${project.kicker}`.toLowerCase();
      if (haystack.includes(q)) {
        results.push({
          title: project.title,
          url: `portfolio.local/project/${project.slug}`,
          snippet: project.summary
        });
      }
    }

    return results.slice(0, 8);
  }

  function createBrowserPage(input: string): BrowserPage {
    const raw = input.trim();
    const normalized = normalizeInput(input);

    if (!normalized || normalized === 'google.local' || normalized === 'google' || normalized === 'new tab') {
      return createGoogleHomePage();
    }

    if (
      normalized === 'portfolio.local' ||
      normalized === 'portfolio' ||
      normalized === 'portfolio.local/home'
    ) {
      return { type: 'portfolio-home', title: 'Portfolio Home', url: 'portfolio.local' };
    }

    if (normalized === 'portfolio.local/projects' || normalized === 'projects') {
      return { type: 'portfolio-projects', title: 'Projects', url: 'portfolio.local/projects' };
    }

    if (normalized === 'portfolio.local/terminal' || normalized === 'terminal') {
      return { type: 'terminal-info', title: 'Terminal', url: 'portfolio.local/terminal' };
    }

    if (normalized === 'dogs.local' || normalized === 'dogs' || normalized === 'dog pics') {
      return { type: 'dogs-gallery', title: 'Dogs', url: 'dogs.local', images: dogImages };
    }

    if (normalized.startsWith('portfolio.local/project/')) {
      const slug = normalized.split('/').at(-1) ?? '';
      const project = projects.find((item) => item.slug === slug);
      if (project) {
        return {
          type: 'portfolio-project',
          title: project.title,
          url: `portfolio.local/project/${project.slug}`,
          project
        };
      }
      return { type: 'not-found', title: 'Not Found', url: raw, attempted: raw };
    }

    const results = buildSearchResults(raw);
    return {
      type: 'search-results',
      title: `Search: ${raw}`,
      url: `google.local/search?q=${encodeURIComponent(raw)}`,
      query: raw,
      results
    };
  }

  function navigateBrowser(input: string) {
    const tab = activeBrowserTab;
    if (!tab) return;

    const nextPage = createBrowserPage(input);
    tab.history = [...tab.history.slice(0, tab.historyIndex + 1), nextPage];
    tab.historyIndex = tab.history.length - 1;
    tab.label = nextPage.title;
    browserTabs = [...browserTabs];
    syncBrowserAddress();
  }

  function openBrowserPage(input: string) {
    navigateBrowser(input);
  }

  function submitBrowserHomeSearch() {
    const value = browserHomeQuery.trim();
    if (!value) return;
    navigateBrowser(value);
    browserHomeQuery = '';
  }

  function browserBack() {
    const tab = activeBrowserTab;
    if (!tab || tab.historyIndex === 0) return;
    tab.historyIndex -= 1;
    tab.label = tab.history[tab.historyIndex].title;
    browserTabs = [...browserTabs];
    syncBrowserAddress();
  }

  function browserForward() {
    const tab = activeBrowserTab;
    if (!tab || tab.historyIndex >= tab.history.length - 1) return;
    tab.historyIndex += 1;
    tab.label = tab.history[tab.historyIndex].title;
    browserTabs = [...browserTabs];
    syncBrowserAddress();
  }

  function openNewBrowserTab() {
    if (browserTabs.length >= 4) {
      showBrowserWarning('Tab limit reached. Opening a fifth tab may cause your RAM to explode.');
      return;
    }
    const tab = createBrowserTab(nextBrowserTabId++, createGoogleHomePage());
    browserTabs = [...browserTabs, tab];
    activeBrowserTabId = tab.id;
    browserWarning = '';
    syncBrowserAddress();
  }

  function switchBrowserTab(id: number) {
    activeBrowserTabId = id;
    clearBrowserWarning();
    syncBrowserAddress();
  }

  function closeBrowserTab(id: number) {
    if (browserTabs.length === 1) {
      closeBrowser();
      return;
    }

    const currentIndex = browserTabs.findIndex((tab) => tab.id === id);
    browserTabs = browserTabs.filter((tab) => tab.id !== id);

    if (activeBrowserTabId === id) {
      const nextTab = browserTabs[Math.max(0, currentIndex - 1)] ?? browserTabs[0];
      activeBrowserTabId = nextTab.id;
    }

    clearBrowserWarning();
    syncBrowserAddress();
  }

  function clearBrowserWarning() {
    browserWarning = '';
    if (browserWarningTimer) {
      clearTimeout(browserWarningTimer);
      browserWarningTimer = null;
    }
  }

  function showBrowserWarning(message: string) {
    clearBrowserWarning();
    browserWarning = message;
    browserWarningTimer = setTimeout(() => {
      browserWarning = '';
      browserWarningTimer = null;
    }, 5000);
  }

  function focusWindow(name: 'browser' | 'terminal') {
    windowOrder = [...windowOrder.filter((item) => item !== name), name];
  }

  function fitWindowsToViewport() {
    const maxWidth = typeof window === 'undefined' ? 1280 : window.innerWidth;
    const maxHeight = typeof window === 'undefined' ? 800 : window.innerHeight;

    browserWindow = {
      ...browserWindow,
      width: Math.min(browserWindow.width, maxWidth - 24),
      height: Math.min(browserWindow.height, maxHeight - 110),
      x: Math.max(8, Math.min(browserWindow.x, maxWidth - browserWindow.width - 8)),
      y: Math.max(8, Math.min(browserWindow.y, maxHeight - browserWindow.height - 76))
    };

    terminalWindow = {
      ...terminalWindow,
      width: Math.min(terminalWindow.width, maxWidth - 16),
      height: Math.min(terminalWindow.height, maxHeight - 86),
      x: Math.max(8, Math.min(terminalWindow.x, maxWidth - terminalWindow.width - 8)),
      y: Math.max(8, Math.min(terminalWindow.y, maxHeight - terminalWindow.height - 76))
    };
  }

  function startMove(windowName: 'browser' | 'terminal', event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (target?.closest('button, input')) return;
    const box = windowName === 'browser' ? browserWindow : terminalWindow;
    if (box.maximized) return;
    activeDrag = {
      kind: 'move',
      window: windowName,
      startX: event.clientX,
      startY: event.clientY,
      startBox: { ...box }
    };
  }

  function startResize(
    windowName: 'browser' | 'terminal',
    edge: 'left' | 'right' | 'bottom' | 'bottom-right' | 'bottom-left',
    event: MouseEvent
  ) {
    event.stopPropagation();
    const box = windowName === 'browser' ? browserWindow : terminalWindow;
    if (box.maximized) return;
    activeDrag = {
      kind: 'resize',
      window: windowName,
      edge,
      startX: event.clientX,
      startY: event.clientY,
      startBox: { ...box }
    };
  }

  function updateWindowBox(name: 'browser' | 'terminal', nextBox: WindowBox) {
    if (name === 'browser') {
      browserWindow = nextBox;
    } else {
      terminalWindow = nextBox;
    }
  }

  function clampWindowBox(box: WindowBox, minWidth: number, minHeight: number) {
    const maxWidth = window.innerWidth;
    const maxHeight = window.innerHeight;
    const width = Math.max(minWidth, Math.min(box.width, maxWidth - 8));
    const height = Math.max(minHeight, Math.min(box.height, maxHeight - 54));
    const x = Math.max(0, Math.min(box.x, maxWidth - width));
    const y = Math.max(0, Math.min(box.y, maxHeight - height));
    return { ...box, x, y, width, height };
  }

  function toggleMaximize(windowName: 'browser' | 'terminal') {
    if (windowName === 'browser') {
      if (!browserWindow.maximized) {
        browserRestoreBox = { ...browserWindow };
        browserWindow = { ...browserWindow, maximized: true, minimized: false };
      } else {
        browserWindow = browserRestoreBox
          ? { ...browserRestoreBox, maximized: false, minimized: false }
          : { ...browserWindow, maximized: false };
      }
    } else {
      if (!terminalWindow.maximized) {
        terminalRestoreBox = { ...terminalWindow };
        terminalWindow = { ...terminalWindow, maximized: true, minimized: false };
      } else {
        terminalWindow = terminalRestoreBox
          ? { ...terminalRestoreBox, maximized: false, minimized: false }
          : { ...terminalWindow, maximized: false };
      }
    }
  }

  function toggleMinimize(windowName: 'browser' | 'terminal') {
    const compactWidth = windowName === 'browser' ? 620 : 760;
    const compactHeight = windowName === 'browser' ? 360 : 320;

    if (windowName === 'browser') {
      if (!browserWindow.minimized) {
        browserRestoreBox = { ...browserWindow };
        browserWindow = clampWindowBox(
          {
            ...browserWindow,
            width: compactWidth,
            height: compactHeight,
            maximized: false,
            minimized: true
          },
          560,
          280
        );
      } else {
        browserWindow = browserRestoreBox
          ? { ...browserRestoreBox, maximized: false, minimized: false }
          : { ...browserWindow, minimized: false };
      }
    } else {
      if (!terminalWindow.minimized) {
        terminalRestoreBox = { ...terminalWindow };
        terminalWindow = clampWindowBox(
          {
            ...terminalWindow,
            width: compactWidth,
            height: compactHeight,
            maximized: false,
            minimized: true
          },
          640,
          260
        );
      } else {
        terminalWindow = terminalRestoreBox
          ? { ...terminalRestoreBox, maximized: false, minimized: false }
          : { ...terminalWindow, minimized: false };
      }
    }
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
    if (event.key === 'Escape' && browserOpen) closeBrowser();

    if (browserOpen && !terminalOpen && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTypingTarget =
        tag === 'input' || tag === 'textarea' || target?.getAttribute('contenteditable') === 'true';

      if (!isTypingTarget && event.key.toLowerCase() === 't') {
        event.preventDefault();
        openNewBrowserTab();
      }

      if (!isTypingTarget && event.key.toLowerCase() === 'w') {
        event.preventDefault();
        closeBrowserTab(activeBrowserTabId);
      }
    }
  }}
  on:mousemove={(event) => {
    if (!activeDrag) return;

    const dx = event.clientX - activeDrag.startX;
    const dy = event.clientY - activeDrag.startY;
    const minWidth = activeDrag.window === 'browser' ? 560 : 640;
    const minHeight = activeDrag.window === 'browser' ? 420 : 420;
    let nextBox = { ...activeDrag.startBox };

    if (activeDrag.kind === 'move') {
      nextBox.x = activeDrag.startBox.x + dx;
      nextBox.y = activeDrag.startBox.y + dy;
    } else if (activeDrag.edge) {
      if (activeDrag.edge === 'right' || activeDrag.edge === 'bottom-right') {
        nextBox.width = activeDrag.startBox.width + dx;
      }
      if (activeDrag.edge === 'left' || activeDrag.edge === 'bottom-left') {
        nextBox.x = activeDrag.startBox.x + dx;
        nextBox.width = activeDrag.startBox.width - dx;
      }
      if (
        activeDrag.edge === 'bottom' ||
        activeDrag.edge === 'bottom-right' ||
        activeDrag.edge === 'bottom-left'
      ) {
        nextBox.height = activeDrag.startBox.height + dy;
      }
    }

    updateWindowBox(activeDrag.window, clampWindowBox(nextBox, minWidth, minHeight));
  }}
  on:mouseup={() => {
    activeDrag = null;
  }}
  on:resize={() => {
    fitWindowsToViewport();
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
          class:active={(app.id === 'terminal' && terminalOpen) || (app.id === 'browser' && browserOpen)}
          aria-label={app.label}
          on:click={() => {
            if (app.id === 'terminal') {
              openTerminal();
            }
            if (app.id === 'browser') {
              openBrowser();
            }
          }}
        >
          <span class={`app-icon ${app.kind}`}></span>
        </button>
      {/each}
    </div>
  </nav>

  {#if browserOpen}
    <section
      class="browser-window"
      class:maximized={browserWindow.maximized}
      class:minimized={browserWindow.minimized}
      aria-label="Portfolio browser"
      on:mousedown={() => focusWindow('browser')}
      style={
        browserWindow.maximized
          ? `z-index:${browserZIndex};`
          : `left:${browserWindow.x}px;top:${browserWindow.y}px;width:${browserWindow.width}px;height:${browserWindow.height}px;z-index:${browserZIndex};`
      }
    >
      <header class="window-bar browser-bar" on:mousedown={(event) => startMove('browser', event)}>
        <div class="window-tabs">
          {#each browserTabs as tab}
            <div class="window-tab browser-tab" class:active={tab.id === activeBrowserTabId}>
              <button
                type="button"
                class="browser-tab-select"
                on:click={() => switchBrowserTab(tab.id)}
              >
                <span class="tab-icon icon-browser"></span>
                <span>{tab.label}</span>
              </button>
              <button
                type="button"
                class="browser-tab-close"
                aria-label={`Close ${tab.label}`}
                on:click={() => closeBrowserTab(tab.id)}
              >
                ×
              </button>
            </div>
          {/each}
          {#if browserTabs.length < 4}
            <button type="button" class="window-tab browser-tab browser-tab-add" on:click={openNewBrowserTab}>
              +
            </button>
          {/if}
        </div>

        <div class="window-controls">
          <button
            type="button"
            class="control-minimize"
            aria-label="Minimize browser"
            on:click={() => toggleMinimize('browser')}
          ></button>
          <button
            type="button"
            class="control-maximize"
            aria-label="Maximize browser"
            on:click={() => toggleMaximize('browser')}
          ></button>
          <button
            type="button"
            class="control-close"
            aria-label="Close browser"
            on:click={closeBrowser}
          ></button>
        </div>
      </header>

      <div class="browser-surface">
        <form class="browser-toolbar" on:submit|preventDefault={() => navigateBrowser(browserAddress)}>
          <button
            type="button"
            class="browser-nav"
            aria-label="Back"
            disabled={!canGoBack}
            on:click={browserBack}
          >
            &larr;
          </button>
          <button
            type="button"
            class="browser-nav"
            aria-label="Forward"
            disabled={!canGoForward}
            on:click={browserForward}
          >
            &rarr;
          </button>
          <button
            type="button"
            class="browser-nav"
            aria-label="Refresh"
            on:click={() => navigateBrowser(browserAddress)}
          >
            &#8635;
          </button>
          <input
            class="address-bar"
            bind:value={browserAddress}
            aria-label="Address bar"
            autocomplete="off"
            spellcheck="false"
          />
        </form>

        {#if browserWarning}
          <div class="browser-warning" role="status">
            {browserWarning}
          </div>
        {/if}

        <div class="browser-page">
          {#if activeBrowserPage?.type === 'google-home'}
            <div class="browser-home">
              <div class="browser-brand">
                <span class="brand-blue">G</span><span class="brand-red">o</span><span class="brand-yellow">o</span><span class="brand-blue">g</span><span class="brand-green">l</span><span class="brand-red">e</span>
              </div>

              <form class="browser-search" on:submit|preventDefault={submitBrowserHomeSearch}>
                <span class="search-icon"></span>
                <input
                  class="browser-search-input"
                  bind:value={browserHomeQuery}
                  type="text"
                  autocomplete="off"
                  spellcheck="false"
                  placeholder="Search Google or type a URL"
                  aria-label="Search Google or type a URL"
                />
              </form>

              <div class="browser-shortcuts">
                <button type="button" class="browser-shortcut" on:click={() => openBrowserPage('portfolio.local')}>
                  <span class="browser-shortcut-icon portfolio-link"></span>
                  <span>Portfolio</span>
                </button>
                <button type="button" class="browser-shortcut" on:click={() => openBrowserPage('portfolio.local/projects')}>
                  <span class="browser-shortcut-icon"></span>
                  <span>Projects</span>
                </button>
                <button type="button" class="browser-shortcut" on:click={() => openBrowserPage('portfolio.local/terminal')}>
                  <span class="browser-shortcut-icon"></span>
                  <span>Terminal</span>
                </button>
                <button type="button" class="browser-shortcut" on:click={() => navigateBrowser('frontend portfolio')}>
                  <span class="browser-shortcut-icon"></span>
                  <span>Search</span>
                </button>
              </div>
            </div>
          {:else if activeBrowserPage?.type === 'search-results'}
            <div class="browser-results">
              <p class="results-meta">Search results for "{activeBrowserPage.query}"</p>
              {#if activeBrowserPage.results.length}
                <div class="results-list">
                  {#each activeBrowserPage.results as result}
                    <button type="button" class="result-card" on:click={() => openBrowserPage(result.url)}>
                      <span class="result-url">{result.url}</span>
                      <strong>{result.title}</strong>
                      <span>{result.snippet}</span>
                    </button>
                  {/each}
                </div>
              {:else}
                <p class="results-empty">No local results matched that query.</p>
              {/if}
            </div>
          {:else if activeBrowserPage?.type === 'portfolio-home'}
            <div class="browser-portfolio browser-portfolio-preview">
              <div class="portfolio-preview-shell" aria-hidden="true">
                <div class="preview-canvas">
                  <div class="preview-grid-lines"></div>

                  <div class="preview-hero">
                    <div class="preview-hero-main">
                      <div class="preview-status">
                        <div class="preview-status-dot"></div>
                        <div class="preview-status-line"></div>
                      </div>
                      <div class="preview-name-block"></div>
                      <div class="preview-role-line"></div>
                      <div class="preview-role-line short"></div>
                      <div class="preview-copy-line"></div>
                      <div class="preview-copy-line"></div>
                      <div class="preview-copy-line mid"></div>
                      <div class="preview-pill-row">
                        <div class="preview-pill"></div>
                        <div class="preview-pill"></div>
                        <div class="preview-pill wide"></div>
                      </div>
                    </div>

                    <div class="preview-hero-side">
                      <div class="preview-portrait"></div>
                      <div class="preview-badge-card">
                        <div class="preview-line short"></div>
                        <div class="preview-line tiny"></div>
                      </div>
                    </div>
                  </div>

                  <div class="preview-metric-row">
                    <div class="preview-metric"></div>
                    <div class="preview-metric"></div>
                    <div class="preview-metric"></div>
                    <div class="preview-metric"></div>
                  </div>

                  <div class="preview-project-grid">
                    <div class="preview-card preview-card-large">
                      <div class="preview-card-top"></div>
                      <div class="preview-line"></div>
                      <div class="preview-line short"></div>
                      <div class="preview-line tiny"></div>
                    </div>

                    <div class="preview-column">
                      <div class="preview-card preview-card-medium">
                        <div class="preview-line"></div>
                        <div class="preview-line short"></div>
                      </div>
                      <div class="preview-row">
                        <div class="preview-card preview-card-small">
                          <div class="preview-line short"></div>
                        </div>
                        <div class="preview-card preview-card-small accent">
                          <div class="preview-line tiny"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="preview-footer">
                    <div class="preview-chip"></div>
                    <div class="preview-chip"></div>
                    <div class="preview-chip wide"></div>
                  </div>
                </div>
              </div>
            </div>
          {:else if activeBrowserPage?.type === 'portfolio-projects'}
            <div class="browser-results">
              <p class="results-meta">portfolio.local/projects</p>
              <div class="results-list">
                {#each projects as project}
                  <button
                    type="button"
                    class="result-card"
                    on:click={() => openBrowserPage(`portfolio.local/project/${project.slug}`)}
                  >
                    <span class="result-url">portfolio.local/project/{project.slug}</span>
                    <strong>{project.title}</strong>
                    <span>{project.summary}</span>
                  </button>
                {/each}
              </div>
            </div>
          {:else if activeBrowserPage?.type === 'portfolio-project'}
            <div class="browser-portfolio">
              <p class="results-meta">{activeBrowserPage.url}</p>
              <h2>{activeBrowserPage.project.title}</h2>
              <p>{activeBrowserPage.project.details}</p>
              <div class="token-row browser-token-row">
                {#each activeBrowserPage.project.stack as item}
                  <span class="token">{item}</span>
                {/each}
              </div>
            </div>
          {:else if activeBrowserPage?.type === 'terminal-info'}
            <div class="browser-portfolio">
              <p class="results-meta">portfolio.local/terminal</p>
              <h2>Portfolio Terminal</h2>
              <p>Use the desktop terminal for command-based browsing of about, projects, skills, proof, and contact.</p>
              <button
                type="button"
                class="browser-open-terminal"
                on:click={() => {
                  closeBrowser();
                  openTerminal();
                }}
              >
                Open terminal
              </button>
            </div>
          {:else if activeBrowserPage?.type === 'dogs-gallery'}
            <div class="browser-results browser-dogs">
              <p class="results-meta">dogs.local</p>
              <h2>Dog image gallery</h2>
              <div class="dog-grid">
                {#each activeBrowserPage.images as image, index}
                  <figure class="dog-card">
                    <img src={image} alt={`Dog photo ${index + 1}`} loading="lazy" />
                  </figure>
                {/each}
              </div>
            </div>
          {:else if activeBrowserPage?.type === 'not-found'}
            <div class="browser-portfolio">
              <p class="results-meta">404</p>
              <h2>Page not found</h2>
              <p>No local page exists for "{activeBrowserPage.attempted}".</p>
            </div>
          {/if}
        </div>
      </div>
      {#if !browserWindow.maximized}
        <button type="button" class="resize-handle left" aria-label="Resize browser left" on:mousedown={(event) => startResize('browser', 'left', event)}></button>
        <button type="button" class="resize-handle right" aria-label="Resize browser right" on:mousedown={(event) => startResize('browser', 'right', event)}></button>
        <button type="button" class="resize-handle bottom" aria-label="Resize browser bottom" on:mousedown={(event) => startResize('browser', 'bottom', event)}></button>
        <button type="button" class="resize-handle bottom-right" aria-label="Resize browser bottom right" on:mousedown={(event) => startResize('browser', 'bottom-right', event)}></button>
        <button type="button" class="resize-handle bottom-left" aria-label="Resize browser bottom left" on:mousedown={(event) => startResize('browser', 'bottom-left', event)}></button>
      {/if}
    </section>
  {/if}

  {#if terminalOpen}
    <section
      class="terminal-window"
      class:maximized={terminalWindow.maximized}
      class:minimized={terminalWindow.minimized}
      id="terminal-window"
      aria-label="Portfolio terminal"
      on:mousedown={() => focusWindow('terminal')}
      style={
        terminalWindow.maximized
          ? `z-index:${terminalZIndex};`
          : `left:${terminalWindow.x}px;top:${terminalWindow.y}px;width:${terminalWindow.width}px;height:${terminalWindow.height}px;z-index:${terminalZIndex};`
      }
    >
      <header class="window-bar" on:mousedown={(event) => startMove('terminal', event)}>
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
          <button
            type="button"
            class="control-minimize"
            aria-label="Minimize"
            on:click={() => toggleMinimize('terminal')}
          ></button>
          <button
            type="button"
            class="control-maximize"
            aria-label="Maximize"
            on:click={() => toggleMaximize('terminal')}
          ></button>
          <button
            type="button"
            class="control-close"
            aria-label="Close terminal"
            on:click={closeTerminal}
          ></button>
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
      {#if !terminalWindow.maximized}
        <button type="button" class="resize-handle left" aria-label="Resize terminal left" on:mousedown={(event) => startResize('terminal', 'left', event)}></button>
        <button type="button" class="resize-handle right" aria-label="Resize terminal right" on:mousedown={(event) => startResize('terminal', 'right', event)}></button>
        <button type="button" class="resize-handle bottom" aria-label="Resize terminal bottom" on:mousedown={(event) => startResize('terminal', 'bottom', event)}></button>
        <button type="button" class="resize-handle bottom-right" aria-label="Resize terminal bottom right" on:mousedown={(event) => startResize('terminal', 'bottom-right', event)}></button>
        <button type="button" class="resize-handle bottom-left" aria-label="Resize terminal bottom left" on:mousedown={(event) => startResize('terminal', 'bottom-left', event)}></button>
      {/if}
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
    z-index: 30;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    background: #050906;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 30px 100px rgba(0, 0, 0, 0.5);
    overflow: hidden;
  }

  .browser-window {
    position: fixed;
    z-index: 26;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    background: #202124;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 14px;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.42);
    overflow: hidden;
  }

  .browser-window.maximized,
  .terminal-window.maximized {
    inset: 8px 8px 74px 8px;
    width: auto !important;
    height: auto !important;
  }

  .browser-window.minimized,
  .terminal-window.minimized {
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.38);
  }

  .browser-bar {
    background: #2f3133;
  }

  .browser-tab {
    min-width: 180px;
    justify-content: space-between;
    padding-right: 0.35rem;
  }

  .browser-tab-add {
    min-width: 42px;
    justify-content: center;
    padding-inline: 0;
  }

  .browser-tab-select {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
    text-align: left;
  }

  .browser-tab-select span:last-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .browser-tab-close {
    width: 24px;
    height: 24px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: #c9c9c9;
    cursor: pointer;
    font: 400 1rem/1 'IBM Plex Mono', monospace;
    transition:
      background-color 0.14s ease,
      color 0.14s ease;
  }

  .browser-tab-close:hover,
  .browser-tab-close:focus-visible {
    background: rgba(255, 255, 255, 0.08);
    color: white;
  }

  .icon-browser {
    border-radius: 50%;
    background:
      radial-gradient(circle at center, #3f7cff 0 25%, #ffffff 26% 34%, transparent 35%),
      conic-gradient(#e94f3d 0 33%, #f2be42 33% 66%, #25a45a 66% 100%);
  }

  .browser-surface {
    min-height: 0;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    background: #202124;
  }

  .browser-toolbar {
    display: grid;
    grid-template-columns: auto auto auto minmax(0, 1fr);
    gap: 0.55rem;
    align-items: center;
    padding: 0.7rem 0.9rem;
    background: #303134;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .browser-warning {
    position: absolute;
    top: 0.9rem;
    right: 1rem;
    z-index: 4;
    max-width: min(420px, calc(100% - 2rem));
    padding: 0.55rem 0.8rem;
    border: 1px solid rgba(255, 184, 77, 0.18);
    border-radius: 10px;
    background: rgba(49, 38, 20, 0.94);
    color: #ffd38a;
    font: 500 0.8rem/1.4 'IBM Plex Mono', monospace;
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.22);
  }

  .browser-nav {
    width: 32px;
    height: 32px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: #9aa0a6;
    font: 500 16px/1 'IBM Plex Mono', monospace;
    opacity: 0.6;
  }

  .address-bar {
    min-height: 36px;
    width: 100%;
    padding: 0 1rem;
    border: 0;
    outline: 0;
    border-radius: 999px;
    background: #1f1f1f;
    color: #bdc1c6;
    font: 400 0.92rem/1 'Space Grotesk', sans-serif;
  }

  .browser-page {
    position: relative;
    min-height: 0;
    overflow: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(154, 160, 166, 0.22) transparent;
  }

  .browser-page::-webkit-scrollbar {
    width: 7px;
  }

  .browser-page::-webkit-scrollbar-track {
    background: transparent;
  }

  .browser-page::-webkit-scrollbar-thumb {
    background: rgba(154, 160, 166, 0.22);
    border-radius: 999px;
  }

  .browser-page::-webkit-scrollbar-thumb:hover {
    background: rgba(154, 160, 166, 0.32);
  }

  .browser-home {
    min-height: 0;
    display: grid;
    align-content: start;
    justify-items: center;
    gap: 1.6rem;
    padding: 4.5rem 1.5rem 2rem;
    color: #e8eaed;
  }

  .browser-brand {
    font: 500 clamp(3rem, 8vw, 4.8rem)/1 'Space Grotesk', sans-serif;
    letter-spacing: -0.04em;
  }

  .brand-blue { color: #4285f4; }
  .brand-red { color: #ea4335; }
  .brand-yellow { color: #fbbc05; }
  .brand-green { color: #34a853; }

  .browser-search {
    width: min(584px, 100%);
    min-height: 52px;
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding: 0 1rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    background: #202124;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
    text-align: left;
    cursor: pointer;
  }

  .browser-search-input {
    flex: 1 1 auto;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: #e8eaed;
    font: 400 1rem/1 'Space Grotesk', sans-serif;
  }

  .browser-search-input::placeholder {
    color: #9aa0a6;
  }

  .search-icon {
    width: 16px;
    height: 16px;
    border: 2px solid #9aa0a6;
    border-radius: 50%;
    position: relative;
    flex: 0 0 auto;
  }

  .search-icon::after {
    content: '';
    position: absolute;
    right: -5px;
    bottom: -4px;
    width: 7px;
    height: 2px;
    background: #9aa0a6;
    transform: rotate(45deg);
    border-radius: 999px;
  }

  .browser-shortcuts {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 1rem;
    width: min(620px, 100%);
  }

  .browser-shortcuts-left {
    justify-content: flex-start;
  }

  .browser-shortcut {
    width: 112px;
    display: grid;
    justify-items: center;
    gap: 0.7rem;
    padding: 0.9rem 0.5rem;
    border: 0;
    border-radius: 18px;
    background: transparent;
    color: #e8eaed;
    text-decoration: none;
    cursor: pointer;
    transition: background-color 0.14s ease;
    font: 400 0.92rem/1.2 'Space Grotesk', sans-serif;
  }

  .browser-shortcut:hover,
  .browser-shortcut:focus-visible {
    background: rgba(255, 255, 255, 0.06);
  }

  .browser-shortcut-icon {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: linear-gradient(135deg, #5f6368, #3c4043);
    position: relative;
  }

  .browser-shortcut-icon.portfolio-link {
    background: linear-gradient(135deg, #4efa7b, #198a55);
  }

  .browser-shortcut-icon.portfolio-link::before {
    content: '>_';
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: #08110d;
    font: 600 12px/1 'IBM Plex Mono', monospace;
  }

  .browser-results,
  .browser-portfolio {
    padding: 1.4rem 1.4rem 2rem;
    color: #e8eaed;
  }

  .browser-portfolio-preview {
    min-height: 100%;
    padding: 0;
  }

  .browser-results h2,
  .browser-portfolio h2 {
    margin: 0 0 0.9rem;
    font: 700 clamp(1.6rem, 4vw, 2.2rem)/1.05 'Space Grotesk', sans-serif;
    letter-spacing: -0.03em;
  }

  .browser-results p,
  .browser-portfolio p {
    margin: 0 0 1rem;
    color: #bdc1c6;
    line-height: 1.65;
  }

  .results-meta,
  .result-url {
    color: #8ab4f8;
    font: 500 0.8rem/1.2 'IBM Plex Mono', monospace;
  }

  .results-list {
    display: grid;
    gap: 0.9rem;
    margin-top: 1rem;
  }

  .result-card {
    display: grid;
    gap: 0.35rem;
    width: 100%;
    padding: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.02);
    text-align: left;
    color: #e8eaed;
    cursor: pointer;
    transition:
      border-color 0.14s ease,
      background-color 0.14s ease;
  }

  .result-card:hover,
  .result-card:focus-visible {
    border-color: rgba(138, 180, 248, 0.4);
    background: rgba(255, 255, 255, 0.04);
  }

  .result-card strong {
    font: 600 1.05rem/1.3 'Space Grotesk', sans-serif;
    color: #8ab4f8;
  }

  .result-card span:last-child {
    color: #bdc1c6;
    line-height: 1.55;
  }

  .results-empty {
    color: #9aa0a6;
  }

  .browser-token-row {
    margin-top: 1.2rem;
  }

  .browser-open-terminal {
    min-height: 42px;
    padding: 0 1rem;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.04);
    color: #e8eaed;
    cursor: pointer;
    font: 500 0.92rem/1 'Space Grotesk', sans-serif;
  }

  .browser-dogs {
    align-content: start;
  }

  .dog-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .dog-card {
    margin: 0;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.03);
  }

  .dog-card img {
    width: 100%;
    height: 220px;
    object-fit: cover;
    display: block;
  }

  .portfolio-preview-shell {
    min-height: 100%;
  }

  .preview-canvas {
    position: relative;
    display: grid;
    gap: 1rem;
    min-height: 100%;
    width: 100%;
    padding: 2rem;
    border: 0;
    border-radius: 0;
    background:
      linear-gradient(rgba(78, 250, 123, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(78, 250, 123, 0.04) 1px, transparent 1px),
      #09100b;
    background-size: 18px 18px, 18px 18px, auto;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  .preview-grid-lines {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(circle at 16% 18%, rgba(78, 250, 123, 0.08), transparent 20%),
      radial-gradient(circle at 84% 80%, rgba(66, 133, 244, 0.06), transparent 24%);
  }

  .preview-hero {
    display: grid;
    grid-template-columns: minmax(0, 1.45fr) minmax(220px, 0.8fr);
    gap: 1.35rem;
    align-items: start;
  }

  .preview-hero-main,
  .preview-hero-side,
  .preview-column,
  .preview-row {
    display: grid;
    gap: 0.9rem;
  }

  .preview-status {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    width: 210px;
    height: 28px;
    padding: 0 0.7rem;
    border: 1px solid rgba(78, 250, 123, 0.18);
    border-radius: 999px;
    background: rgba(10, 20, 14, 0.72);
  }

  .preview-status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: rgba(78, 250, 123, 0.8);
    box-shadow: 0 0 0 4px rgba(78, 250, 123, 0.12);
  }

  .preview-status-line {
    width: 128px;
    height: 8px;
    border-radius: 999px;
    background: rgba(138, 180, 248, 0.34);
  }

  .preview-name-block {
    width: min(420px, 85%);
    height: 58px;
    border-radius: 4px;
    background: rgba(240, 255, 245, 0.88);
  }

  .preview-role-line {
    width: 72%;
    height: 16px;
    border-radius: 3px;
    background: rgba(138, 180, 248, 0.6);
  }

  .preview-role-line.short {
    width: 54%;
  }

  .preview-copy-line {
    width: 100%;
    height: 11px;
    border-radius: 2px;
    background: rgba(240, 255, 245, 0.14);
  }

  .preview-copy-line.mid {
    width: 84%;
  }

  .preview-hero-side {
    align-content: start;
  }

  .preview-portrait {
    min-height: 300px;
    border: 1px solid rgba(138, 180, 248, 0.16);
    border-radius: 16px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(226, 233, 240, 0.92)),
      rgba(255, 255, 255, 0.9);
  }

  .preview-badge-card {
    display: grid;
    gap: 0.7rem;
    min-height: 72px;
    padding: 0.85rem;
    border: 1px solid rgba(138, 180, 248, 0.14);
    border-radius: 12px;
    background: rgba(14, 21, 28, 0.76);
  }

  .preview-metric-row {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1rem;
  }

  .preview-metric {
    height: 92px;
    border-top: 1px solid rgba(240, 255, 245, 0.12);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent 70%);
  }

  .preview-project-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(220px, 0.8fr);
    gap: 1rem;
    align-items: stretch;
  }

  .preview-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .preview-card {
    display: grid;
    gap: 0.65rem;
    padding: 0.85rem;
    border: 1px solid rgba(78, 250, 123, 0.14);
    border-radius: 8px;
    background: rgba(10, 18, 13, 0.76);
  }

  .preview-card-large {
    min-height: 260px;
    align-content: start;
  }

  .preview-card-medium {
    min-height: 156px;
  }

  .preview-card-small {
    min-height: 92px;
  }

  .preview-card-small.accent {
    background: rgba(18, 24, 30, 0.78);
    border-color: rgba(138, 180, 248, 0.18);
  }

  .preview-card-top {
    width: 52%;
    height: 18px;
    border-radius: 2px;
    background: rgba(240, 255, 245, 0.82);
  }

  .preview-line {
    width: 100%;
    height: 10px;
    border-radius: 2px;
    background: rgba(240, 255, 245, 0.14);
  }

  .preview-line.short {
    width: 72%;
  }

  .preview-line.tiny {
    width: 44%;
  }

  .preview-pill-row {
    display: flex;
    gap: 0.7rem;
    margin-top: 0.3rem;
    flex-wrap: wrap;
  }

  .preview-pill {
    width: 88px;
    height: 18px;
    border-radius: 999px;
    background: rgba(78, 250, 123, 0.16);
    border: 1px solid rgba(78, 250, 123, 0.14);
  }

  .preview-pill.wide {
    width: 132px;
  }

  .preview-footer {
    display: flex;
    gap: 0.7rem;
    align-items: center;
    margin-top: auto;
    padding-top: 0.4rem;
  }

  .preview-chip {
    width: 70px;
    height: 14px;
    border-radius: 999px;
    background: rgba(78, 250, 123, 0.16);
    border: 1px solid rgba(78, 250, 123, 0.16);
  }

  .preview-chip.wide {
    width: 120px;
  }

  @media (max-width: 720px) {
    .preview-canvas {
      padding: 1rem;
    }

    .preview-hero,
    .preview-project-grid,
    .preview-metric-row {
      grid-template-columns: 1fr;
    }

    .preview-name-block {
      width: 100%;
      height: 42px;
    }

    .preview-portrait {
      min-height: 180px;
    }
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
    border: 0;
    color: #dadada;
    background: #353334;
    border-radius: 10px 10px 0 0;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.95rem;
    cursor: pointer;
  }

  .resize-handle {
    position: absolute;
    z-index: 40;
    padding: 0;
    border: 0;
    background: transparent;
  }

  .resize-handle.left,
  .resize-handle.right {
    top: 50px;
    bottom: 0;
    width: 8px;
    transform: translateX(0);
    cursor: ew-resize;
  }

  .resize-handle.left {
    left: 0;
  }

  .resize-handle.right {
    right: 0;
  }

  .resize-handle.bottom {
    left: 8px;
    right: 8px;
    bottom: 0;
    height: 8px;
    cursor: ns-resize;
  }

  .resize-handle.bottom-right,
  .resize-handle.bottom-left {
    bottom: 0;
    width: 16px;
    height: 16px;
  }

  .resize-handle.bottom-right {
    right: 0;
    cursor: nwse-resize;
  }

  .resize-handle.bottom-left {
    left: 0;
    cursor: nesw-resize;
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
    min-width: 42px;
    height: 100%;
    border: 0;
    background: transparent;
    cursor: pointer;
    position: relative;
    transition: background-color 0.14s ease;
  }

  .window-controls button::before {
    content: '';
    position: absolute;
    inset: 50% auto auto 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  .window-controls .control-minimize::before {
    width: 10px;
    height: 1px;
    border: 0;
    background: rgba(255, 255, 255, 0.72);
  }

  .window-controls .control-maximize::before {
    width: 10px;
    height: 10px;
    border: 1px solid rgba(255, 255, 255, 0.66);
  }

  .window-controls .control-close::before,
  .window-controls .control-close::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 12px;
    height: 1.5px;
    background: rgba(255, 255, 255, 0.82);
    transform-origin: center;
    pointer-events: none;
  }

  .window-controls .control-close::before {
    transform: translate(-50%, -50%) rotate(45deg);
  }

  .window-controls .control-close::after {
    transform: translate(-50%, -50%) rotate(-45deg);
  }

  .window-controls .control-minimize:hover,
  .window-controls .control-minimize:focus-visible,
  .window-controls .control-maximize:hover,
  .window-controls .control-maximize:focus-visible {
    background: rgba(255, 255, 255, 0.08);
  }

  .window-controls .control-close:hover,
  .window-controls .control-close:focus-visible {
    background: #d14444;
  }

  .window-controls .control-close:hover::before,
  .window-controls .control-close:hover::after,
  .window-controls .control-close:focus-visible::before,
  .window-controls .control-close:focus-visible::after {
    background: white;
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
    scrollbar-width: thin;
    scrollbar-color: rgba(143, 180, 156, 0.45) transparent;
  }

  .terminal-history::-webkit-scrollbar {
    width: 8px;
  }

  .terminal-history::-webkit-scrollbar-track {
    background: transparent;
  }

  .terminal-history::-webkit-scrollbar-thumb {
    background: rgba(143, 180, 156, 0.28);
    border-radius: 999px;
  }

  .terminal-history::-webkit-scrollbar-thumb:hover {
    background: rgba(143, 180, 156, 0.42);
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

    .browser-window {
      left: 8px !important;
      top: 18px !important;
      width: calc(100vw - 16px) !important;
      height: min(560px, calc(100vh - 110px)) !important;
    }

    .browser-toolbar {
      grid-template-columns: auto minmax(0, 1fr);
    }

    .browser-nav:nth-child(2),
    .browser-nav:nth-child(3) {
      display: none;
    }

    .terminal-window {
      left: 8px !important;
      top: 8px !important;
      width: calc(100vw - 16px) !important;
      height: calc(100vh - 86px) !important;
    }

    .window-tab {
      font-size: 0.8rem;
      padding-inline: 0.7rem;
    }

    .project-row {
      grid-template-columns: 1fr;
    }

    .resize-handle {
      display: none;
    }
  }
</style>
