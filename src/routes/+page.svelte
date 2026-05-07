<script lang="ts">
  import { onMount, tick } from 'svelte';
  import {
    type Achievement,
    type Experience,
    type LinkItem,
    type PortfolioContent,
    type Project,
    type SkillGroup
  } from '$lib/data/portfolio';

  export let data: { portfolio: PortfolioContent };

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
    | { id: number; type: 'experience'; items: Experience[] }
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

  type ExplorerAction =
    | { kind: 'route'; target: string; label: string }
    | { kind: 'external'; target: string; label: string; targetMode?: '_blank' | '_self' };

  type ExplorerItem = {
    id: string;
    path: string;
    label: string;
    kind: 'folder' | 'project' | 'document' | 'note' | 'contact';
    description: string;
    badge?: string;
    meta?: string[];
    tags?: string[];
    action?: ExplorerAction;
    project?: Project;
    children?: ExplorerItem[];
  };

  type BrowserPage =
    | { type: 'google-home'; title: string; url: string }
    | { type: 'search-results'; title: string; url: string; query: string; results: SearchResult[] }
    | { type: 'portfolio-files'; title: string; url: string; itemPath: string }
    | { type: 'portfolio-home'; title: string; url: string }
    | { type: 'portfolio-projects'; title: string; url: string }
    | { type: 'portfolio-experience'; title: string; url: string }
    | { type: 'portfolio-project'; title: string; url: string; project: Project }
    | { type: 'terminal-info'; title: string; url: string }
    | { type: 'dogs-gallery'; title: string; url: string; images: string[] }
    | { type: 'dog-detail'; title: string; url: string; image: string; index: number }
    | { type: 'resume-viewer'; title: string; url: string; pdfUrl: string }
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

  let portfolio: PortfolioContent = data.portfolio;
  let hero = portfolio.hero;
  let projects = portfolio.projects;
  let experience = portfolio.experience;
  let skills = portfolio.skills;
  let achievements = portfolio.achievements;
  let about = portfolio.about;
  let explorerRoot: ExplorerItem;
  let explorerSidebarItems: ExplorerItem[] = [];
  let explorerFeaturedItems: ExplorerItem[] = [];
  let filesOpen = false;
  let selectedExplorerPath = 'root';

  $: portfolio = data.portfolio;
  $: ({ hero, projects, experience, skills, achievements, about } = portfolio);
  $: explorerRoot = buildExplorerRoot();
  $: explorerSidebarItems = explorerRoot.children ?? [];
  $: explorerFeaturedItems = explorerSidebarItems.flatMap((section) => section.children ?? []).slice(0, 6);

  const supportedCommands = [
    '/help',
    '/about',
    '/projects',
    '/experience',
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
  const githubUrl = 'https://github.com/Omar1Ramadan';
  const linkedinUrl = 'https://www.linkedin.com/in/omarramadanb91b298/';
  const emailUrl = 'mailto:oramadan2004@gmail.com';
  const resumePdfUrl = '/OmarRamadan_Resume.pdf';

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
  let filesWindow: WindowBox = {
    x: 164,
    y: 72,
    width: 860,
    height: 560,
    maximized: false,
    minimized: false
  };
  let browserRestoreBox: WindowBox | null = null;
  let terminalRestoreBox: WindowBox | null = null;
  let filesRestoreBox: WindowBox | null = null;
  let activeDrag:
    | {
        kind: 'move' | 'resize';
        window: 'browser' | 'terminal' | 'files';
        edge?: 'left' | 'right' | 'bottom' | 'bottom-right' | 'bottom-left';
        startX: number;
        startY: number;
        startBox: WindowBox;
      }
    | null = null;
  let windowOrder: Array<'browser' | 'files' | 'terminal'> = ['browser', 'files', 'terminal'];

  $: activeBrowserTab = browserTabs.find((tab) => tab.id === activeBrowserTabId);
  $: activeBrowserPage = activeBrowserTab ? activeBrowserTab.history[activeBrowserTab.historyIndex] : undefined;
  $: canGoBack = !!activeBrowserTab && activeBrowserTab.historyIndex > 0;
  $: canGoForward = !!activeBrowserTab && activeBrowserTab.historyIndex < activeBrowserTab.history.length - 1;
  $: browserZIndex = windowOrder.indexOf('browser') === -1 ? 26 : 26 + windowOrder.indexOf('browser');
  $: filesZIndex = windowOrder.indexOf('files') === -1 ? 26 : 26 + windowOrder.indexOf('files');
  $: terminalZIndex = windowOrder.indexOf('terminal') === -1 ? 26 : 26 + windowOrder.indexOf('terminal');
  $: explorerSelection = getExplorerSelectionFromPath(selectedExplorerPath);

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

  function openFiles(path = selectedExplorerPath) {
    selectedExplorerPath = path;
    filesOpen = true;
    fitWindowsToViewport();
    focusWindow('files');
  }

  function closeFiles() {
    filesOpen = false;
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

  function getCurrentBrowserPage(tab: BrowserTab | undefined = activeBrowserTab) {
    if (!tab) return undefined;
    return tab.history[tab.historyIndex];
  }

  function syncBrowserAddress(page: BrowserPage | undefined = getCurrentBrowserPage()) {
    browserAddress = page?.url ?? 'google.local';
  }

  function normalizeInput(value: string) {
    return value.trim().toLowerCase();
  }

  function buildSearchResults(query: string): SearchResult[] {
    const q = query.toLowerCase();
    const results: SearchResult[] = [];

    if ('github'.includes(q) || q.includes('github')) {
      results.push({
        title: 'GitHub Profile',
        url: githubUrl,
        snippet: 'Open Omar Ramadan on GitHub.'
      });
    }

    if ('linkedin'.includes(q) || q.includes('linkedin') || q.includes('linkedin')) {
      results.push({
        title: 'LinkedIn Profile',
        url: linkedinUrl,
        snippet: 'Open Omar Ramadan on LinkedIn.'
      });
    }

    if ('resume'.includes(q) || q.includes('resume') || q.includes('cv')) {
      results.push({
        title: 'Resume',
        url: 'portfolio.local/resume',
        snippet: 'Open Omar Ramadan resume PDF inside the browser.'
      });
    }

    if ('email'.includes(q) || q.includes('email') || q.includes('contact')) {
      results.push({
        title: 'Email',
        url: emailUrl,
        snippet: 'Send an email to oramadan2004@gmail.com.'
      });
    }

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

    if ('experience'.includes(q) || q.includes('experience') || q.includes('work')) {
      results.push({
        title: 'Experience',
        url: 'portfolio.local/experience',
        snippet: 'Review current roles, engineering work, and operations experience.'
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

    if (
      normalized === githubUrl.toLowerCase() ||
      normalized === 'github' ||
      normalized === 'github.com' ||
      normalized === 'github.local'
    ) {
      window.open(githubUrl, '_blank', 'noopener,noreferrer');
      return createGoogleHomePage();
    }

    if (
      normalized === linkedinUrl.toLowerCase() ||
      normalized === 'linkedin' ||
      normalized === 'linkedin.com' ||
      normalized === 'linkedin.local'
    ) {
      window.open(linkedinUrl, '_blank', 'noopener,noreferrer');
      return createGoogleHomePage();
    }

    if (
      normalized === emailUrl.toLowerCase() ||
      normalized === 'email' ||
      normalized === 'mail' ||
      normalized === 'contact'
    ) {
      window.open(emailUrl, '_self');
      return createGoogleHomePage();
    }

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

    if (normalized === 'portfolio.local/experience' || normalized === 'experience') {
      return { type: 'portfolio-experience', title: 'Experience', url: 'portfolio.local/experience' };
    }

    if (normalized === 'portfolio.local/terminal' || normalized === 'terminal') {
      return { type: 'terminal-info', title: 'Terminal', url: 'portfolio.local/terminal' };
    }

    if (
      normalized === 'portfolio.local/resume' ||
      normalized === 'resume' ||
      normalized === 'cv' ||
      normalized === 'resume.local'
    ) {
      return {
        type: 'resume-viewer',
        title: 'Resume',
        url: 'portfolio.local/resume',
        pdfUrl: resumePdfUrl
      };
    }

    if (
      normalized === 'dogs.local' ||
      normalized === 'dogs' ||
      normalized === 'dog pics' ||
      normalized === 'cats' ||
      normalized === 'cat' ||
      normalized === 'cats.local'
    ) {
      return { type: 'dogs-gallery', title: 'Dogs', url: 'dogs.local', images: dogImages };
    }

    if (normalized.startsWith('dogs.local/')) {
      const maybeIndex = Number(normalized.split('/').at(-1));
      if (Number.isInteger(maybeIndex) && maybeIndex >= 1 && maybeIndex <= dogImages.length) {
        return {
          type: 'dog-detail',
          title: `Dog ${maybeIndex}`,
          url: `dogs.local/${maybeIndex}`,
          image: dogImages[maybeIndex - 1],
          index: maybeIndex
        };
      }
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
    syncBrowserAddress(nextPage);
  }

  function openBrowserPage(input: string) {
    navigateBrowser(input);
  }

  function openExternalBrowserLink(url: string, target: '_blank' | '_self' = '_blank') {
    window.open(url, target, target === '_blank' ? 'noopener,noreferrer' : undefined);
  }

  function submitBrowserHomeSearch() {
    const value = browserHomeQuery.trim();
    if (!value) return;
    navigateBrowser(value);
    browserHomeQuery = '';
  }

  function buildExplorerRoot(): ExplorerItem {
    const topProjects = projects.slice(0, 4).map((project) => projectToExplorerItem(project, 'featured-work'));
    const labProjects = projects.slice(4).map((project) => projectToExplorerItem(project, 'playground'));
    const experienceNotes = experience.map((item, index) => ({
      id: `experience-${index}`,
      path: `experience/${slugifyLabel(item.organization)}`,
      label: item.organization,
      kind: 'note' as const,
      description: item.summary,
      badge: item.period,
      meta: [item.role, item.location],
      tags: item.stack.slice(0, 4)
    }));
    const skillNotes = skills.map((group) => ({
      id: `skill-${slugifyLabel(group.title)}`,
      path: `toolbox/${slugifyLabel(group.title)}`,
      label: group.title,
      kind: 'note' as const,
      description: group.summary,
      badge: 'Skill group',
      meta: [`${group.items.length} tools`],
      tags: group.items.slice(0, 5)
    }));
    const archiveNotes = achievements.map((item) => ({
      id: `achievement-${slugifyLabel(item.title)}`,
      path: `archive/${slugifyLabel(item.title)}`,
      label: item.title,
      kind: 'document' as const,
      description: item.note,
      badge: item.year,
      meta: [item.context],
      tags: ['Proof', 'Milestone']
    }));

    return {
      id: 'root',
      path: 'root',
      label: 'Home',
      kind: 'folder',
      description: 'Curated portfolio filesystem with projects, context, and proof.',
      badge: 'Pinned workspace',
      meta: ['Open with the Files app'],
      children: [
        {
          id: 'featured-work',
          path: 'featured-work',
          label: 'Featured Work',
          kind: 'folder',
          description: 'The strongest case studies to open first.',
          badge: `${topProjects.length} pinned`,
          meta: ['Projects', 'Case studies'],
          children: topProjects
        },
        {
          id: 'about',
          path: 'about',
          label: 'About',
          kind: 'folder',
          description: 'Resume, contact routes, and current focus files.',
          badge: 'Starter folder',
          meta: ['Identity', 'Links'],
          children: [
            {
              id: 'resume',
              path: 'about/resume-pdf',
              label: 'resume.pdf',
              kind: 'document',
              description: 'Direct access to the latest resume PDF.',
              badge: 'Document',
              meta: ['PDF', 'Career snapshot'],
              tags: ['Resume', 'PDF'],
              action: { kind: 'route', target: 'portfolio.local/resume', label: 'Open resume' }
            },
            {
              id: 'now',
              path: 'about/now-txt',
              label: 'now.txt',
              kind: 'note',
              description: about.focus,
              badge: 'Live note',
              meta: [hero.role],
              tags: ['Current focus', 'Work']
            },
            {
              id: 'contact',
              path: 'about/contact-card',
              label: 'contact.card',
              kind: 'contact',
              description: about.contactNote,
              badge: 'Reach out',
              meta: ['Email', 'GitHub', 'LinkedIn'],
              tags: ['Contact', 'Links'],
              action: { kind: 'external', target: emailUrl, label: 'Send email', targetMode: '_self' }
            }
          ]
        },
        {
          id: 'experience',
          path: 'experience',
          label: 'Experience',
          kind: 'folder',
          description: 'Operator context, roles, and domain range.',
          badge: `${experienceNotes.length} roles`,
          meta: ['Work history'],
          children: experienceNotes
        },
        {
          id: 'toolbox',
          path: 'toolbox',
          label: 'Toolbox',
          kind: 'folder',
          description: 'Engineering stacks grouped by practice area.',
          badge: `${skillNotes.length} groups`,
          meta: ['Stack snapshot'],
          children: skillNotes
        },
        {
          id: 'archive',
          path: 'archive',
          label: 'Archive',
          kind: 'folder',
          description: 'Proof points, wins, and supporting notes.',
          badge: `${archiveNotes.length} files`,
          meta: ['Validation'],
          children: archiveNotes
        },
        {
          id: 'playground',
          path: 'playground',
          label: 'Playground',
          kind: 'folder',
          description: 'Extra repos and experiments that still deserve a click.',
          badge: `${labProjects.length} experiments`,
          meta: ['Exploration', 'R&D'],
          children: labProjects
        }
      ]
    };
  }

  function projectToExplorerItem(project: Project, sectionPath: string): ExplorerItem {
    return {
      id: project.slug,
      path: `${sectionPath}/${project.slug}`,
      label: `${project.title}.case`,
      kind: 'project',
      description: project.summary,
      badge: project.year,
      meta: [project.kicker, project.status],
      tags: project.stack.slice(0, 4),
      project,
      action: {
        kind: 'route',
        target: `portfolio.local/project/${project.slug}`,
        label: 'Open case study'
      }
    };
  }

  function slugifyLabel(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function findExplorerItem(path: string, node: ExplorerItem = explorerRoot): ExplorerItem | undefined {
    if (node.path === path) return node;
    for (const child of node.children ?? []) {
      const match = findExplorerItem(path, child);
      if (match) return match;
    }
    return undefined;
  }

  function findExplorerParent(path: string, node: ExplorerItem = explorerRoot, parent?: ExplorerItem): ExplorerItem | undefined {
    if (node.path === path) return parent;
    for (const child of node.children ?? []) {
      const match = findExplorerParent(path, child, node);
      if (match) return match;
    }
    return undefined;
  }

  function getExplorerSelectionFromPath(path: string) {
    const item = findExplorerItem(path) ?? explorerRoot;
    const parent = item.kind === 'folder' ? item : findExplorerParent(item.path) ?? explorerRoot;
    const siblings = parent.children ?? [];
    return { item, parent, siblings };
  }

  function getExplorerSelection(page: Extract<BrowserPage, { type: 'portfolio-files' }>) {
    return getExplorerSelectionFromPath(page.itemPath);
  }

  function selectExplorerSidebar(item: ExplorerItem) {
    selectedExplorerPath = item.path;
  }

  function openExplorerSidebar(item: ExplorerItem) {
    selectExplorerSidebar(item);
  }

  function selectExplorerItem(item: ExplorerItem) {
    selectedExplorerPath = item.path;
  }

  function openExplorerItem(item: ExplorerItem) {
    activateExplorerItem(item);
  }

  function activateExplorerItem(item: ExplorerItem) {
    if (item.kind === 'folder') {
      selectedExplorerPath = item.path;
      return;
    }

    selectedExplorerPath = item.path;
    runExplorerAction(item.action);
  }

  function runExplorerAction(action?: ExplorerAction) {
    if (!action) return;
    if (action.kind === 'route') {
      openBrowserPage(action.target);
      return;
    }
    openExternalBrowserLink(action.target, action.targetMode ?? '_blank');
  }

  function browserBack() {
    const tab = activeBrowserTab;
    if (!tab || tab.historyIndex === 0) return;
    tab.historyIndex -= 1;
    const page = tab.history[tab.historyIndex];
    tab.label = page.title;
    browserTabs = [...browserTabs];
    syncBrowserAddress(page);
  }

  function browserForward() {
    const tab = activeBrowserTab;
    if (!tab || tab.historyIndex >= tab.history.length - 1) return;
    tab.historyIndex += 1;
    const page = tab.history[tab.historyIndex];
    tab.label = page.title;
    browserTabs = [...browserTabs];
    syncBrowserAddress(page);
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
    syncBrowserAddress(getCurrentBrowserPage(browserTabs.find((tab) => tab.id === id)));
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
    syncBrowserAddress(getCurrentBrowserPage(browserTabs.find((tab) => tab.id === activeBrowserTabId)));
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

  function focusWindow(name: 'browser' | 'terminal' | 'files') {
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

    filesWindow = {
      ...filesWindow,
      width: Math.min(filesWindow.width, maxWidth - 24),
      height: Math.min(filesWindow.height, maxHeight - 110),
      x: Math.max(8, Math.min(filesWindow.x, maxWidth - filesWindow.width - 8)),
      y: Math.max(8, Math.min(filesWindow.y, maxHeight - filesWindow.height - 76))
    };

    terminalWindow = {
      ...terminalWindow,
      width: Math.min(terminalWindow.width, maxWidth - 16),
      height: Math.min(terminalWindow.height, maxHeight - 86),
      x: Math.max(8, Math.min(terminalWindow.x, maxWidth - terminalWindow.width - 8)),
      y: Math.max(8, Math.min(terminalWindow.y, maxHeight - terminalWindow.height - 76))
    };
  }

  function startMove(windowName: 'browser' | 'terminal' | 'files', event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (target?.closest('button, input')) return;
    const box =
      windowName === 'browser' ? browserWindow : windowName === 'files' ? filesWindow : terminalWindow;
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
    windowName: 'browser' | 'terminal' | 'files',
    edge: 'left' | 'right' | 'bottom' | 'bottom-right' | 'bottom-left',
    event: MouseEvent
  ) {
    event.stopPropagation();
    const box =
      windowName === 'browser' ? browserWindow : windowName === 'files' ? filesWindow : terminalWindow;
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

  function updateWindowBox(name: 'browser' | 'terminal' | 'files', nextBox: WindowBox) {
    if (name === 'browser') {
      browserWindow = nextBox;
    } else if (name === 'files') {
      filesWindow = nextBox;
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

  function toggleMaximize(windowName: 'browser' | 'terminal' | 'files') {
    if (windowName === 'browser') {
      if (!browserWindow.maximized) {
        browserRestoreBox = { ...browserWindow };
        browserWindow = { ...browserWindow, maximized: true, minimized: false };
      } else {
        browserWindow = browserRestoreBox
          ? { ...browserRestoreBox, maximized: false, minimized: false }
          : { ...browserWindow, maximized: false };
      }
    } else if (windowName === 'files') {
      if (!filesWindow.maximized) {
        filesRestoreBox = { ...filesWindow };
        filesWindow = { ...filesWindow, maximized: true, minimized: false };
      } else {
        filesWindow = filesRestoreBox
          ? { ...filesRestoreBox, maximized: false, minimized: false }
          : { ...filesWindow, maximized: false };
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

  function toggleMinimize(windowName: 'browser' | 'terminal' | 'files') {
    const compactWidth = windowName === 'browser' ? 620 : windowName === 'files' ? 640 : 760;
    const compactHeight = windowName === 'browser' ? 360 : windowName === 'files' ? 380 : 320;

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
    } else if (windowName === 'files') {
      if (!filesWindow.minimized) {
        filesRestoreBox = { ...filesWindow };
        filesWindow = clampWindowBox(
          {
            ...filesWindow,
            width: compactWidth,
            height: compactHeight,
            maximized: false,
            minimized: true
          },
          620,
          320
        );
      } else {
        filesWindow = filesRestoreBox
          ? { ...filesRestoreBox, maximized: false, minimized: false }
          : { ...filesWindow, minimized: false };
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
      case '/experience':
        history = [...history, { id: nextId++, type: 'experience', items: experience }];
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
    if (event.key === 'Escape' && filesOpen) closeFiles();

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
    const minWidth = activeDrag.window === 'browser' ? 560 : activeDrag.window === 'files' ? 620 : 640;
    const minHeight = activeDrag.window === 'browser' ? 420 : activeDrag.window === 'files' ? 320 : 420;
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
          class:active={
            (app.id === 'terminal' && terminalOpen) ||
            (app.id === 'browser' && browserOpen) ||
            (app.id === 'files' && filesOpen)
          }
          aria-label={app.label}
          on:click={() => {
            if (app.id === 'terminal') {
              openTerminal();
            }
            if (app.id === 'browser') {
              openBrowser();
            }
            if (app.id === 'files') {
              openFiles('root');
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
                <button type="button" class="browser-shortcut" on:click={() => openBrowserPage('github')}>
                  <span class="browser-shortcut-icon social-icon github-icon"></span>
                  <span>GitHub</span>
                </button>
                <button type="button" class="browser-shortcut" on:click={() => openBrowserPage('linkedin')}>
                  <span class="browser-shortcut-icon social-icon linkedin-icon"></span>
                  <span>LinkedIn</span>
                </button>
                <button type="button" class="browser-shortcut" on:click={() => openBrowserPage('resume')}>
                  <span class="browser-shortcut-icon social-icon resume-icon"></span>
                  <span>Resume</span>
                </button>
                <button type="button" class="browser-shortcut" on:click={() => openBrowserPage('email')}>
                  <span class="browser-shortcut-icon social-icon email-icon"></span>
                  <span>Email</span>
                </button>
                <button type="button" class="browser-shortcut" on:click={() => openBrowserPage('portfolio.local/projects')}>
                  <span class="browser-shortcut-icon"></span>
                  <span>Projects</span>
                </button>
                <button type="button" class="browser-shortcut" on:click={() => openBrowserPage('portfolio.local/terminal')}>
                  <span class="browser-shortcut-icon"></span>
                  <span>Terminal</span>
                </button>
                <button type="button" class="browser-shortcut" on:click={() => navigateBrowser('dogs')}>
                  <span class="browser-shortcut-icon"></span>
                  <span>Dogs</span>
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
          {:else if activeBrowserPage?.type === 'portfolio-files'}
            {@const explorerSelection = getExplorerSelection(activeBrowserPage)}
            <div class="file-browser">
              <aside class="file-browser-sidebar">
                <div class="file-browser-sidebar-head">
                  <p class="file-browser-label">Pinned</p>
                  <strong>Portfolio Files</strong>
                  <span>Open the work like a curated workspace, not a fake disk image.</span>
                </div>

                <div class="file-browser-sidebar-list">
                  {#each explorerSidebarItems as item}
                    <button
                      type="button"
                      class="file-browser-nav"
                      class:active={explorerSelection.parent.path === item.path || explorerSelection.item.path === item.path}
                      on:click={() => openExplorerSidebar(item)}
                    >
                      <span class="file-browser-nav-icon">{item.kind === 'folder' ? '□' : '•'}</span>
                      <span class="file-browser-nav-copy">
                        <strong>{item.label}</strong>
                        <span>{item.badge ?? item.description}</span>
                      </span>
                    </button>
                  {/each}
                </div>
              </aside>

              <section class="file-browser-main">
                <div class="file-browser-head">
                  <div>
                    <p class="results-meta">portfolio.local/files/{explorerSelection.item.path === 'root' ? '' : explorerSelection.item.path}</p>
                    <h2>{explorerSelection.item.kind === 'folder' ? explorerSelection.item.label : explorerSelection.parent.label}</h2>
                  </div>
                  <div class="file-browser-head-actions">
                    <button type="button" class="portfolio-preview-link" on:click={() => openBrowserPage('portfolio.local/projects')}>Project grid</button>
                    <button type="button" class="portfolio-preview-link" on:click={() => openBrowserPage('portfolio.local/resume')}>Resume</button>
                  </div>
                </div>

                {#if explorerSelection.item.path === 'root'}
                  <section class="file-browser-banner">
                    <p class="file-browser-label">Suggested start</p>
                    <strong>Open `Featured Work`, then move into `About` or `Experience`.</strong>
                    <span>This explorer is arranged to tell a story quickly: strongest builds first, context second, supporting proof after that.</span>
                  </section>
                {/if}

                <div class="file-browser-grid">
                  {#each explorerSelection.siblings as item}
                    <button
                      type="button"
                      class="file-browser-card"
                      class:selected={item.path === explorerSelection.item.path}
                      on:click={() => openExplorerItem(item)}
                    >
                      <div class="file-browser-card-top">
                        <span class={`file-kind ${item.kind}`}>{item.kind}</span>
                        {#if item.badge}
                          <span class="file-browser-badge">{item.badge}</span>
                        {/if}
                      </div>
                      <strong>{item.label}</strong>
                      <p>{item.description}</p>
                      {#if item.meta?.length}
                        <div class="file-browser-meta">
                          {#each item.meta as meta}
                            <span>{meta}</span>
                          {/each}
                        </div>
                      {/if}
                    </button>
                  {/each}
                </div>

                {#if explorerSelection.item.path === 'root'}
                  <section class="file-browser-featured-strip">
                    {#each explorerFeaturedItems as item}
                      <button type="button" class="file-browser-mini" on:click={() => openExplorerItem(item)}>
                        <span class="file-kind {item.kind}">{item.kind}</span>
                        <strong>{item.label}</strong>
                      </button>
                    {/each}
                  </section>
                {/if}
              </section>

              <aside class="file-browser-preview">
                <div class="file-browser-preview-head">
                  <p class="file-browser-label">Preview</p>
                  <strong>{explorerSelection.item.label}</strong>
                  <span>{explorerSelection.item.description}</span>
                </div>

                {#if explorerSelection.item.project}
                  <div class="file-browser-preview-block">
                    <p class="file-browser-label">Case Study</p>
                    <strong>{explorerSelection.item.project.title}</strong>
                    <span>{explorerSelection.item.project.impact}</span>
                  </div>
                {/if}

                {#if explorerSelection.item.meta?.length}
                  <div class="file-browser-preview-block">
                    <p class="file-browser-label">Metadata</p>
                    <div class="file-browser-meta stack">
                      {#each explorerSelection.item.meta as meta}
                        <span>{meta}</span>
                      {/each}
                    </div>
                  </div>
                {/if}

                {#if explorerSelection.item.tags?.length}
                  <div class="file-browser-preview-block">
                    <p class="file-browser-label">Tags</p>
                    <div class="browser-project-tags">
                      {#each explorerSelection.item.tags as tag}
                        <span>{tag}</span>
                      {/each}
                    </div>
                  </div>
                {/if}

                <div class="file-browser-preview-actions">
                  {#if explorerSelection.item.action}
                    <button type="button" class="portfolio-preview-link primary" on:click={() => runExplorerAction(explorerSelection.item.action)}>
                      {explorerSelection.item.action.label}
                    </button>
                  {/if}
                  {#if explorerSelection.item.project}
                    <button
                      type="button"
                      class="portfolio-preview-link"
                      on:click={() => openBrowserPage(`portfolio.local/project/${explorerSelection.item.project?.slug ?? ''}`)}
                    >
                      Open project page
                    </button>
                  {/if}
                  {#if explorerSelection.item.kind !== 'folder' && explorerSelection.parent.path !== 'root'}
                    <button type="button" class="portfolio-preview-link" on:click={() => openBrowserPage(`portfolio.local/files/${explorerSelection.parent.path}`)}>
                      Back to folder
                    </button>
                  {/if}
                </div>
              </aside>
            </div>
          {:else if activeBrowserPage?.type === 'portfolio-home'}
            <div class="browser-portfolio browser-portfolio-preview">
              <div class="portfolio-preview-actions">
                <button type="button" class="portfolio-preview-link" on:click={() => openBrowserPage('portfolio.local/resume')}>Resume</button>
                <button type="button" class="portfolio-preview-link" on:click={() => openBrowserPage('portfolio.local/projects')}>Projects</button>
                <button type="button" class="portfolio-preview-link" on:click={() => openBrowserPage('portfolio.local/experience')}>Experience</button>
                <button type="button" class="portfolio-preview-link" on:click={() => openExternalBrowserLink(githubUrl)}>GitHub</button>
                <button type="button" class="portfolio-preview-link" on:click={() => openExternalBrowserLink(emailUrl, '_self')}>Email</button>
              </div>
              <div class="portfolio-preview-shell">
                <div class="preview-canvas preview-real">
                  <div class="preview-grid-lines"></div>

                  <section class="preview-real-hero">
                    <div class="preview-status">
                      <div class="preview-status-dot"></div>
                      <div class="preview-status-line"></div>
                    </div>
                    <p class="preview-eyebrow">{hero.eyebrow}</p>
                    <h2 class="preview-real-name">{hero.name}</h2>
                    <p class="preview-real-role">{hero.role}</p>
                    <p class="preview-real-copy">{hero.summary}</p>
                    <p class="preview-real-copy faint">{hero.note}</p>
                    <div class="preview-real-links">
                      <button type="button" on:click={() => openExternalBrowserLink(githubUrl)}>GitHub</button>
                      <button type="button" on:click={() => openExternalBrowserLink(linkedinUrl)}>LinkedIn</button>
                      <button type="button" on:click={() => openBrowserPage('portfolio.local/resume')}>Resume</button>
                    </div>
                  </section>

                  <section class="preview-real-metrics">
                    {#each hero.stats as stat}
                      <article class="preview-real-metric">
                        <span>{stat.label}</span>
                        <strong>{stat.value}</strong>
                      </article>
                    {/each}
                  </section>

                  <section class="preview-real-section">
                    <div class="preview-real-section-head">
                      <p class="preview-real-section-kicker">Featured work</p>
                      <strong>Flagship case studies with real systems, not filler.</strong>
                    </div>
                    <div class="preview-real-grid">
                      {#each projects.slice(0, 4) as project}
                        <button
                          type="button"
                          class="preview-real-project"
                          on:click={() => openBrowserPage(`portfolio.local/project/${project.slug}`)}
                        >
                          <p class="preview-real-card-kicker">{project.kicker}</p>
                          <strong>{project.title}</strong>
                          <p>{project.summary}</p>
                          <div class="preview-real-token-row">
                            {#each project.stack.slice(0, 4) as token}
                              <span>{token}</span>
                            {/each}
                          </div>
                        </button>
                      {/each}
                    </div>
                  </section>

                  <section class="preview-real-split">
                    <div class="preview-real-card medium">
                      <p class="preview-real-card-kicker">Current focus</p>
                      <strong>{experience[0].role}</strong>
                      <p>{experience[0].summary}</p>
                      <div class="preview-real-token-row">
                        {#each experience[0].stack.slice(0, 4) as token}
                          <span>{token}</span>
                        {/each}
                      </div>
                    </div>

                    <div class="preview-real-card medium accent">
                      <p class="preview-real-card-kicker">Skills snapshot</p>
                      <strong>{skills[0].title}</strong>
                      <p>{skills[0].summary}</p>
                      <div class="preview-real-token-row">
                        {#each skills[0].items.slice(0, 5) as token}
                          <span>{token}</span>
                        {/each}
                      </div>
                    </div>
                  </section>

                  <section class="preview-real-section compact">
                    <div class="preview-real-section-head">
                      <p class="preview-real-section-kicker">Experience</p>
                      <strong>Built across autonomy, ML, healthcare systems, and policy.</strong>
                    </div>
                    <div class="preview-real-experience-list">
                      {#each experience.slice(0, 3) as item}
                        <article class="preview-real-experience">
                          <p class="preview-real-card-kicker">{item.organization}</p>
                          <strong>{item.role}</strong>
                          <p>{item.summary}</p>
                        </article>
                      {/each}
                    </div>
                  </section>

                  <section class="preview-real-footer">
                    <div class="preview-real-card small accent">
                      <p class="preview-real-card-kicker">Contact</p>
                      <strong>Resume / GitHub / LinkedIn / Email</strong>
                    </div>
                    <div class="preview-real-links footer-links">
                      <button type="button" on:click={() => openBrowserPage('portfolio.local/resume')}>Resume</button>
                      <button type="button" on:click={() => openExternalBrowserLink(githubUrl)}>GitHub</button>
                      <button type="button" on:click={() => openExternalBrowserLink(linkedinUrl)}>LinkedIn</button>
                      <button type="button" on:click={() => openExternalBrowserLink(emailUrl, '_self')}>Email</button>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          {:else if activeBrowserPage?.type === 'portfolio-projects'}
            <div class="browser-results browser-projects-view">
              <p class="results-meta">portfolio.local/projects</p>
              <div class="browser-project-grid">
                {#each projects as project}
                  <button
                    type="button"
                    class="browser-project-card"
                    on:click={() => openBrowserPage(`portfolio.local/project/${project.slug}`)}
                  >
                    <span class="browser-project-kicker">{project.kicker}</span>
                    <strong>{project.title}</strong>
                    <span class="browser-project-summary">{project.summary}</span>
                    <div class="browser-project-meta">
                      <span>{project.status}</span>
                      <span>{project.year}</span>
                    </div>
                    <div class="browser-project-tags">
                      {#each project.stack.slice(0, 4) as token}
                        <span>{token}</span>
                      {/each}
                    </div>
                  </button>
                {/each}
              </div>
            </div>
          {:else if activeBrowserPage?.type === 'portfolio-experience'}
            <div class="browser-results">
              <p class="results-meta">portfolio.local/experience</p>
              <div class="results-list">
                {#each experience as item}
                  <article class="result-card result-card-static">
                    <span class="result-url">{item.organization}</span>
                    <strong>{item.role}</strong>
                    <span>{item.summary}</span>
                    <span class="result-url">{item.period} • {item.location}</span>
                  </article>
                {/each}
              </div>
            </div>
          {:else if activeBrowserPage?.type === 'portfolio-project'}
            <div class="browser-portfolio browser-project-detail">
              <p class="results-meta">{activeBrowserPage.url}</p>
              <h2>{activeBrowserPage.project.title}</h2>
              <div class="inline-meta">
                <span>{activeBrowserPage.project.kicker}</span>
                <span>{activeBrowserPage.project.status}</span>
                <span>{activeBrowserPage.project.year}</span>
              </div>

              <div class="browser-project-detail-grid">
                <section class="browser-detail-panel">
                  <p class="browser-detail-label">Summary</p>
                  <p>{activeBrowserPage.project.summary}</p>
                </section>

                <section class="browser-detail-panel accent">
                  <p class="browser-detail-label">Impact</p>
                  <p>{activeBrowserPage.project.impact}</p>
                </section>
              </div>

              <section class="browser-detail-section">
                <p class="browser-detail-label">System</p>
                <p>{activeBrowserPage.project.details}</p>
              </section>

              <section class="browser-detail-section">
                <p class="browser-detail-label">Key highlights</p>
                <ul class="browser-detail-list">
                  {#each activeBrowserPage.project.highlights as item}
                    <li>{item}</li>
                  {/each}
                </ul>
              </section>

              <section class="browser-detail-section">
                <p class="browser-detail-label">Stack</p>
                <div class="token-row browser-token-row">
                  {#each activeBrowserPage.project.stack as item}
                    <span class="token">{item}</span>
                  {/each}
                </div>
              </section>

              {#if activeBrowserPage.project.links.length}
                <section class="browser-detail-section">
                  <p class="browser-detail-label">Links</p>
                  <div class="link-row">
                    {#each activeBrowserPage.project.links as link}
                      <a href={link.href} target={link.external ? '_blank' : undefined} rel={link.external ? 'noreferrer' : undefined}>
                        {link.label}
                      </a>
                    {/each}
                  </div>
                </section>
              {/if}
            </div>
          {:else if activeBrowserPage?.type === 'terminal-info'}
            <div class="browser-portfolio">
              <p class="results-meta">portfolio.local/terminal</p>
              <h2>Portfolio Terminal</h2>
              <p>Use the desktop terminal for command-based browsing of about, projects, experience, skills, proof, and contact.</p>
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
              <h2>Dog image gallery</h2>
              <div class="dog-feature">
                <div class="dog-feature-media">
                  <button
                    type="button"
                    class="dog-media-button"
                    on:click={() => openBrowserPage('dogs.local/1')}
                  >
                    <img src={activeBrowserPage.images[0]} alt="Featured dog" loading="eager" />
                  </button>
                </div>
                <div class="dog-feature-copy">
                  <div class="dog-chip-row">
                    <span class="dog-chip">Playful</span>
                    <span class="dog-chip">Very good</span>
                    <span class="dog-chip">Certified dog</span>
                  </div>
                  <p>
                    A deliberately unnecessary but objectively important dog page. Search for cats, get dogs anyway.
                  </p>
                  <div class="dog-stats">
                    <div class="dog-stat">
                      <span>Images</span>
                      <strong>{activeBrowserPage.images.length}</strong>
                    </div>
                    <div class="dog-stat">
                      <span>Mood</span>
                      <strong>Excellent</strong>
                    </div>
                    <div class="dog-stat">
                      <span>Bark level</span>
                      <strong>Unknown</strong>
                    </div>
                  </div>
                </div>
              </div>
              <div class="dog-grid">
                {#each activeBrowserPage.images.slice(1) as image, index}
                  <button
                    type="button"
                    class="dog-card"
                    on:click={() => openBrowserPage(`dogs.local/${index + 2}`)}
                  >
                    <img src={image} alt={`Dog photo ${index + 2}`} loading="lazy" />
                  </button>
                {/each}
              </div>
            </div>
          {:else if activeBrowserPage?.type === 'dog-detail'}
            <div class="browser-results browser-dogs">
              <h2>Dog #{activeBrowserPage.index}</h2>
              <div class="dog-detail-layout">
                <div class="dog-detail-image">
                  <img src={activeBrowserPage.image} alt={`Dog photo ${activeBrowserPage.index}`} loading="eager" />
                </div>
                <div class="dog-feature-copy">
                  <div class="dog-chip-row">
                    <span class="dog-chip">Clicked</span>
                    <span class="dog-chip">Important</span>
                    <span class="dog-chip">Dog confirmed</span>
                  </div>
                  <p>
                    You clicked a dog. This is now a higher-priority dog than the other dogs on the page.
                  </p>
                  <div class="browser-shortcuts browser-shortcuts-left">
                    <button type="button" class="browser-shortcut" on:click={() => openBrowserPage('dogs.local')}>
                      <span class="browser-shortcut-icon portfolio-link"></span>
                      <span>Back to dogs</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          {:else if activeBrowserPage?.type === 'resume-viewer'}
            <div class="browser-results browser-resume">
              <div class="resume-toolbar resume-toolbar-top">
                <a
                  class="resume-icon-link"
                  href={activeBrowserPage.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Download resume PDF"
                  title="Download PDF"
                >
                  <span class="resume-icon download-icon"></span>
                </a>
                <a
                  class="resume-icon-link"
                  href={emailUrl}
                  aria-label="Email Omar Ramadan"
                  title="Email"
                >
                  <span class="resume-icon email-small-icon"></span>
                </a>
              </div>
              <iframe
                class="resume-frame"
                src={`${activeBrowserPage.pdfUrl}#zoom=page-width&view=FitH`}
                title="Omar Ramadan Resume"
              ></iframe>
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

  {#if filesOpen}
    <section
      class="files-window"
      class:maximized={filesWindow.maximized}
      class:minimized={filesWindow.minimized}
      aria-label="Portfolio file explorer"
      on:mousedown={() => focusWindow('files')}
      style={
        filesWindow.maximized
          ? `z-index:${filesZIndex};`
          : `left:${filesWindow.x}px;top:${filesWindow.y}px;width:${filesWindow.width}px;height:${filesWindow.height}px;z-index:${filesZIndex};`
      }
    >
      <header class="window-bar files-bar" on:mousedown={(event) => startMove('files', event)}>
        <div class="window-tabs">
          <div class="window-tab active files-tab">
            <span class="tab-icon icon-folder"></span>
            <span>File Explorer</span>
          </div>
        </div>

        <div class="window-controls">
          <button
            type="button"
            class="control-minimize"
            aria-label="Minimize files"
            on:click={() => toggleMinimize('files')}
          ></button>
          <button
            type="button"
            class="control-maximize"
            aria-label="Maximize files"
            on:click={() => toggleMaximize('files')}
          ></button>
          <button
            type="button"
            class="control-close"
            aria-label="Close files"
            on:click={closeFiles}
          ></button>
        </div>
      </header>

      <div class="files-surface">
        <aside class="files-sidebar">
          <div class="files-sidebar-group">
            <p class="files-label">Locations</p>
            {#each explorerSidebarItems as item}
              <button
                type="button"
                class="files-sidebar-item"
                class:active={explorerSelection.parent.path === item.path || explorerSelection.item.path === item.path}
                on:click={() => selectExplorerSidebar(item)}
              >
                <span class="files-sidebar-dot"></span>
                <span>{item.label}</span>
              </button>
            {/each}
          </div>
        </aside>

        <div class="files-content">
          <div class="files-toolbar">
            <div class="files-breadcrumbs">
              <span>Home</span>
              {#if explorerSelection.parent.path !== 'root'}
                <span>/</span>
                <span>{explorerSelection.parent.label}</span>
              {/if}
              {#if explorerSelection.item.path !== explorerSelection.parent.path}
                <span>/</span>
                <span>{explorerSelection.item.label}</span>
              {/if}
            </div>
          </div>

          <div class="files-pane">
            <div class="files-list">
              <div class="files-list-head">
                <span>Name</span>
                <span>Type</span>
                <span>Info</span>
              </div>

              {#each explorerSelection.siblings as item}
                <button
                  type="button"
                  class="files-row"
                  class:selected={item.path === explorerSelection.item.path}
                  on:click={() => selectExplorerItem(item)}
                  on:dblclick={() => activateExplorerItem(item)}
                >
                  <span class="files-row-name">
                    <span class={`file-kind subtle ${item.kind}`}></span>
                    <strong>{item.label}</strong>
                  </span>
                  <span class="files-row-type">{item.kind}</span>
                  <span class="files-row-info">{item.badge ?? item.meta?.[0] ?? item.description}</span>
                </button>
              {/each}
            </div>

            <aside class="files-preview">
              <p class="files-label">Preview</p>
              <strong>{explorerSelection.item.label}</strong>
              <p>{explorerSelection.item.description}</p>

              {#if explorerSelection.item.meta?.length}
                <div class="files-preview-group">
                  {#each explorerSelection.item.meta as meta}
                    <span>{meta}</span>
                  {/each}
                </div>
              {/if}

              {#if explorerSelection.item.tags?.length}
                <div class="files-preview-group tags">
                  {#each explorerSelection.item.tags as tag}
                    <span>{tag}</span>
                  {/each}
                </div>
              {/if}

              <div class="files-preview-actions">
                {#if explorerSelection.item.action}
                  <button type="button" class="files-action" on:click={() => runExplorerAction(explorerSelection.item.action)}>
                    {explorerSelection.item.action.label}
                  </button>
                {/if}
                {#if explorerSelection.item.project}
                  <button
                    type="button"
                    class="files-action secondary"
                    on:click={() => openBrowserPage(`portfolio.local/project/${explorerSelection.item.project?.slug ?? ''}`)}
                  >
                    Open project
                  </button>
                {/if}
              </div>
            </aside>
          </div>
        </div>
      </div>

      {#if !filesWindow.maximized}
        <button type="button" class="resize-handle left" aria-label="Resize files left" on:mousedown={(event) => startResize('files', 'left', event)}></button>
        <button type="button" class="resize-handle right" aria-label="Resize files right" on:mousedown={(event) => startResize('files', 'right', event)}></button>
        <button type="button" class="resize-handle bottom" aria-label="Resize files bottom" on:mousedown={(event) => startResize('files', 'bottom', event)}></button>
        <button type="button" class="resize-handle bottom-right" aria-label="Resize files bottom right" on:mousedown={(event) => startResize('files', 'bottom-right', event)}></button>
        <button type="button" class="resize-handle bottom-left" aria-label="Resize files bottom left" on:mousedown={(event) => startResize('files', 'bottom-left', event)}></button>
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
            {:else if entry.type === 'experience'}
              <article class="entry entry-block">
                <p class="entry-label">experience</p>
                <div class="skill-grid">
                  {#each entry.items as item}
                    <section class="skill-card">
                      <h2>{item.role}</h2>
                      <div class="inline-meta">
                        <span>{item.organization}</span>
                        <span>{item.period}</span>
                      </div>
                      <p>{item.summary}</p>
                      <p>{item.location}</p>
                      <ul class="detail-list">
                        {#each item.highlights as point}
                          <li>{point}</li>
                        {/each}
                      </ul>
                      <div class="token-row">
                        {#each item.stack as token}
                          <span class="token">{token}</span>
                        {/each}
                      </div>
                    </section>
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

  .files-window {
    position: fixed;
    z-index: 27;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    background: #171819;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.36);
    overflow: hidden;
  }

  .browser-window.maximized,
  .terminal-window.maximized,
  .files-window.maximized {
    inset: 8px 8px 74px 8px;
    width: auto !important;
    height: auto !important;
  }

  .browser-window.minimized,
  .terminal-window.minimized,
  .files-window.minimized {
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

  .icon-folder {
    background: linear-gradient(180deg, #eec96d, #bc8d31);
    position: relative;
  }

  .icon-folder::before {
    content: '';
    position: absolute;
    left: 1px;
    top: -1px;
    width: 7px;
    height: 4px;
    border-radius: 3px 3px 0 0;
    background: #f5d990;
  }

  .files-surface {
    min-height: 0;
    display: grid;
    grid-template-columns: 180px minmax(0, 1fr);
    background: #171819;
  }

  .files-sidebar {
    padding: 0.9rem 0.7rem;
    border-right: 1px solid rgba(255, 255, 255, 0.06);
    background: #141516;
  }

  .files-sidebar-group,
  .files-content,
  .files-preview {
    display: grid;
    align-content: start;
    gap: 0.65rem;
  }

  .files-label {
    margin: 0;
    color: #9aa0a6;
    font: 500 0.7rem/1.2 'IBM Plex Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .files-sidebar-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    min-height: 34px;
    padding: 0 0.65rem;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: #d4d7db;
    cursor: pointer;
    text-align: left;
    font: 500 0.86rem/1 'Space Grotesk', sans-serif;
  }

  .files-sidebar-item:hover,
  .files-sidebar-item:focus-visible,
  .files-sidebar-item.active {
    background: rgba(255, 255, 255, 0.06);
  }

  .files-sidebar-dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: #7aa2ff;
  }

  .files-content {
    min-width: 0;
    padding: 0.85rem 1rem 1rem;
  }

  .files-toolbar {
    min-height: 34px;
    display: flex;
    align-items: center;
  }

  .files-breadcrumbs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    color: #aeb4bb;
    font: 500 0.8rem/1.3 'IBM Plex Mono', monospace;
  }

  .files-pane {
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 240px;
    gap: 1rem;
  }

  .files-list {
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.02);
  }

  .files-list-head,
  .files-row {
    display: grid;
    grid-template-columns: minmax(0, 1.5fr) 100px minmax(0, 1fr);
    gap: 0.8rem;
    align-items: center;
  }

  .files-list-head {
    min-height: 34px;
    padding: 0 0.85rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    color: #8d949c;
    font: 500 0.72rem/1 'IBM Plex Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .files-row {
    width: 100%;
    min-height: 44px;
    padding: 0 0.85rem;
    border: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    background: transparent;
    color: #d8dde3;
    text-align: left;
    cursor: pointer;
  }

  .files-row:hover,
  .files-row:focus-visible,
  .files-row.selected {
    background: rgba(255, 255, 255, 0.06);
  }

  .files-row:last-child {
    border-bottom: 0;
  }

  .files-row-name {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.55rem;
  }

  .files-row-name strong,
  .files-preview strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #f2f4f7;
    font: 600 0.92rem/1.2 'Space Grotesk', sans-serif;
  }

  .files-row-type,
  .files-row-info,
  .files-preview p,
  .files-preview-group span {
    color: #aeb4bb;
    font: 500 0.76rem/1.45 'IBM Plex Mono', monospace;
  }

  .files-row-info {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .files-preview {
    padding: 0.85rem 0.95rem;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.02);
  }

  .files-preview p {
    margin: 0;
    line-height: 1.55;
  }

  .files-preview-group {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
  }

  .files-preview-group span {
    padding: 0.25rem 0.45rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.05);
  }

  .files-preview-group.tags span {
    background: rgba(122, 162, 255, 0.12);
    color: #cfdcff;
  }

  .files-preview-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
    padding-top: 0.2rem;
  }

  .files-action {
    min-height: 32px;
    padding: 0 0.7rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.04);
    color: #e8eaed;
    cursor: pointer;
    font: 500 0.75rem/1 'IBM Plex Mono', monospace;
  }

  .files-action.secondary {
    background: transparent;
  }

  .file-kind.subtle {
    width: 12px;
    height: 12px;
    padding: 0;
    border-radius: 3px;
    flex: 0 0 auto;
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
    opacity: 0.82;
    cursor: pointer;
    transition:
      background-color 0.14s ease,
      color 0.14s ease,
      opacity 0.14s ease;
  }

  .browser-nav:hover,
  .browser-nav:focus-visible {
    background: rgba(255, 255, 255, 0.08);
    color: #e8eaed;
  }

  .browser-nav:active {
    background: rgba(255, 255, 255, 0.12);
  }

  .browser-nav:disabled {
    cursor: default;
    opacity: 0.38;
  }

  .browser-nav:disabled:hover,
  .browser-nav:disabled:focus-visible {
    background: transparent;
    color: #9aa0a6;
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

  .browser-shortcut-icon.social-icon::before {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: white;
    font: 700 12px/1 'IBM Plex Mono', monospace;
  }

  .browser-shortcut-icon.github-icon {
    background: linear-gradient(135deg, #2b3137, #11161c);
  }

  .browser-shortcut-icon.github-icon::before {
    content: 'GH';
  }

  .browser-shortcut-icon.linkedin-icon {
    background: linear-gradient(135deg, #1d7cf2, #0a58c8);
  }

  .browser-shortcut-icon.linkedin-icon::before {
    content: 'in';
  }

  .browser-shortcut-icon.resume-icon {
    border-radius: 10px;
    background: linear-gradient(180deg, #fff4df, #f7c46d);
  }

  .browser-shortcut-icon.resume-icon::before {
    content: '';
    position: absolute;
    inset: 6px 7px 6px 7px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.9);
    box-shadow:
      0 0 0 1px rgba(173, 100, 15, 0.18),
      0 4px 0 -3px rgba(173, 100, 15, 0.32),
      0 8px 0 -7px rgba(173, 100, 15, 0.28);
  }

  .browser-shortcut-icon.resume-icon::after {
    content: '';
    position: absolute;
    top: 6px;
    right: 7px;
    width: 7px;
    height: 7px;
    background: rgba(255, 255, 255, 0.96);
    clip-path: polygon(0 0, 100% 0, 100% 100%);
    box-shadow: -1px 1px 0 0 rgba(173, 100, 15, 0.18);
  }

  .browser-shortcut-icon.email-icon {
    background: linear-gradient(135deg, #c084fc, #7c3aed);
  }

  .browser-shortcut-icon.email-icon::before {
    content: '@';
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

  .portfolio-preview-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.7rem;
    padding: 1rem 1.4rem 0;
  }

  .portfolio-preview-link {
    display: inline-flex;
    align-items: center;
    min-height: 36px;
    padding: 0 0.8rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.03);
    color: #e8eaed;
    cursor: pointer;
    text-decoration: none;
    font: 500 0.82rem/1 'IBM Plex Mono', monospace;
    transition:
      background-color 0.14s ease,
      border-color 0.14s ease;
  }

  .portfolio-preview-link:hover,
  .portfolio-preview-link:focus-visible {
    border-color: rgba(138, 180, 248, 0.34);
    background: rgba(255, 255, 255, 0.06);
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

  .result-card-static {
    cursor: default;
  }

  .result-card-static:hover,
  .result-card-static:focus-visible {
    border-color: rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.02);
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

  .browser-projects-view {
    align-content: start;
  }

  .browser-project-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .browser-project-card {
    display: grid;
    gap: 0.7rem;
    width: 100%;
    padding: 1rem;
    border: 1px solid rgba(138, 180, 248, 0.12);
    border-radius: 16px;
    background: rgba(12, 18, 14, 0.82);
    color: #e8eaed;
    cursor: pointer;
    text-align: left;
    transition:
      transform 0.14s ease,
      border-color 0.14s ease,
      background-color 0.14s ease;
  }

  .browser-project-card:hover,
  .browser-project-card:focus-visible {
    transform: translateY(-1px);
    border-color: rgba(138, 180, 248, 0.32);
    background: rgba(16, 24, 19, 0.88);
  }

  .browser-project-kicker {
    color: rgba(138, 180, 248, 0.82);
    font: 500 0.74rem/1.35 'IBM Plex Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .browser-project-summary {
    color: #bdc1c6;
    line-height: 1.6;
  }

  .browser-project-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem;
    color: #8fb49c;
    font: 500 0.72rem/1.35 'IBM Plex Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .browser-project-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
  }

  .browser-project-tags span {
    padding: 0.35rem 0.55rem;
    border: 1px solid rgba(92, 255, 151, 0.12);
    border-radius: 999px;
    color: #f6ffc4;
    background: rgba(22, 36, 28, 0.78);
    font: 500 0.68rem/1 'IBM Plex Mono', monospace;
  }

  .browser-project-detail {
    align-content: start;
  }

  .browser-project-detail-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .browser-detail-panel,
  .browser-detail-section {
    padding: 1rem;
    border: 1px solid rgba(138, 180, 248, 0.12);
    border-radius: 16px;
    background: rgba(12, 18, 14, 0.82);
  }

  .browser-detail-panel.accent {
    border-color: rgba(92, 255, 151, 0.14);
    background: rgba(16, 24, 19, 0.88);
  }

  .browser-detail-section + .browser-detail-section {
    margin-top: 1rem;
  }

  .browser-detail-label {
    margin: 0 0 0.7rem !important;
    color: #8ab4f8 !important;
    font: 500 0.76rem/1.35 'IBM Plex Mono', monospace !important;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .browser-detail-list {
    margin: 0;
    padding-left: 1.1rem;
    color: #d8ffe5;
  }

  .browser-detail-list li + li {
    margin-top: 0.45rem;
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

  .file-browser {
    display: grid;
    grid-template-columns: minmax(180px, 0.9fr) minmax(0, 1.6fr) minmax(240px, 1fr);
    min-height: 100%;
    color: #e8eaed;
  }

  .file-browser-sidebar,
  .file-browser-preview {
    display: grid;
    align-content: start;
    gap: 1rem;
    padding: 1.1rem;
    background: rgba(10, 14, 11, 0.84);
  }

  .file-browser-sidebar {
    border-right: 1px solid rgba(255, 255, 255, 0.06);
  }

  .file-browser-preview {
    border-left: 1px solid rgba(255, 255, 255, 0.06);
  }

  .file-browser-main {
    display: grid;
    align-content: start;
    gap: 1rem;
    padding: 1.1rem;
    background:
      radial-gradient(circle at top right, rgba(78, 250, 123, 0.08), transparent 34%),
      linear-gradient(180deg, rgba(11, 17, 13, 0.92), rgba(7, 11, 8, 0.98));
  }

  .file-browser-sidebar-head,
  .file-browser-preview-head,
  .file-browser-preview-block,
  .file-browser-banner {
    display: grid;
    gap: 0.45rem;
  }

  .file-browser-sidebar-head strong,
  .file-browser-preview-head strong,
  .file-browser-preview-block strong,
  .file-browser-banner strong {
    color: #f3fff7;
    font: 700 1.05rem/1.2 'Space Grotesk', sans-serif;
  }

  .file-browser-sidebar-head span,
  .file-browser-preview-head span,
  .file-browser-preview-block span,
  .file-browser-banner span {
    color: #9aa0a6;
    line-height: 1.55;
  }

  .file-browser-label {
    margin: 0;
    color: #8ab4f8;
    font: 500 0.72rem/1.2 'IBM Plex Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .file-browser-sidebar-list,
  .file-browser-head,
  .file-browser-head-actions,
  .file-browser-meta,
  .file-browser-preview-actions,
  .file-browser-featured-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 0.7rem;
  }

  .file-browser-sidebar-list {
    display: grid;
  }

  .file-browser-nav {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.75rem;
    align-items: start;
    width: 100%;
    padding: 0.85rem 0.9rem;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.02);
    color: #e8eaed;
    text-align: left;
    cursor: pointer;
  }

  .file-browser-nav.active,
  .file-browser-nav:hover,
  .file-browser-nav:focus-visible {
    border-color: rgba(138, 180, 248, 0.24);
    background: rgba(138, 180, 248, 0.08);
  }

  .file-browser-nav-icon {
    color: #4efa7b;
    font: 600 0.88rem/1 'IBM Plex Mono', monospace;
  }

  .file-browser-nav-copy {
    display: grid;
    gap: 0.28rem;
    min-width: 0;
  }

  .file-browser-nav-copy strong {
    font: 600 0.92rem/1.2 'Space Grotesk', sans-serif;
    color: #f3fff7;
  }

  .file-browser-nav-copy span {
    color: #9aa0a6;
    font: 500 0.72rem/1.45 'IBM Plex Mono', monospace;
  }

  .file-browser-head {
    justify-content: space-between;
    align-items: flex-start;
  }

  .file-browser-head h2 {
    margin: 0.2rem 0 0;
  }

  .file-browser-banner {
    padding: 1rem;
    border: 1px solid rgba(78, 250, 123, 0.14);
    border-radius: 18px;
    background: linear-gradient(135deg, rgba(18, 32, 22, 0.9), rgba(10, 14, 12, 0.94));
  }

  .file-browser-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.9rem;
  }

  .file-browser-card,
  .file-browser-mini {
    display: grid;
    gap: 0.65rem;
    text-align: left;
    cursor: pointer;
    color: #e8eaed;
    transition:
      transform 0.14s ease,
      border-color 0.14s ease,
      background-color 0.14s ease;
  }

  .file-browser-card {
    width: 100%;
    padding: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.03);
  }

  .file-browser-card:hover,
  .file-browser-card:focus-visible,
  .file-browser-card.selected {
    transform: translateY(-1px);
    border-color: rgba(138, 180, 248, 0.28);
    background: rgba(138, 180, 248, 0.08);
  }

  .file-browser-card strong,
  .file-browser-mini strong {
    margin: 0;
    color: #f5fff8;
    font: 700 0.98rem/1.2 'Space Grotesk', sans-serif;
  }

  .file-browser-card p {
    margin: 0;
    color: #bdc1c6;
    line-height: 1.55;
  }

  .file-browser-card-top {
    display: flex;
    justify-content: space-between;
    gap: 0.7rem;
    align-items: center;
  }

  .file-kind,
  .file-browser-badge {
    padding: 0.28rem 0.5rem;
    border-radius: 999px;
    font: 500 0.66rem/1 'IBM Plex Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .file-kind {
    border: 1px solid rgba(92, 255, 151, 0.14);
    color: #dfffea;
    background: rgba(22, 36, 28, 0.78);
  }

  .file-kind.folder {
    color: #fff4cf;
    background: rgba(107, 85, 20, 0.28);
    border-color: rgba(248, 196, 64, 0.16);
  }

  .file-kind.project {
    color: #d4e7ff;
    background: rgba(43, 87, 164, 0.28);
    border-color: rgba(138, 180, 248, 0.18);
  }

  .file-kind.document,
  .file-kind.note,
  .file-kind.contact {
    color: #dfffea;
  }

  .file-browser-badge {
    color: #8ab4f8;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .file-browser-meta {
    align-items: center;
  }

  .file-browser-meta span {
    padding: 0.32rem 0.5rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.05);
    color: #b5c3ba;
    font: 500 0.66rem/1 'IBM Plex Mono', monospace;
  }

  .file-browser-meta.stack {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .file-browser-featured-strip {
    padding-top: 0.4rem;
  }

  .file-browser-mini {
    min-width: 150px;
    padding: 0.85rem;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.02);
  }

  .file-browser-mini:hover,
  .file-browser-mini:focus-visible {
    border-color: rgba(78, 250, 123, 0.24);
    background: rgba(78, 250, 123, 0.08);
  }

  .file-browser-preview-actions {
    padding-top: 0.3rem;
  }

  .portfolio-preview-link.primary {
    border-color: rgba(78, 250, 123, 0.22);
    background: rgba(78, 250, 123, 0.1);
  }

  .browser-resume {
    min-height: 100%;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 0.75rem;
    padding: 0.9rem;
  }

  .resume-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .resume-toolbar-top {
    justify-content: flex-end;
    align-items: center;
  }

  .resume-frame {
    width: 100%;
    min-height: calc(100vh - 220px);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    background: white;
  }

  .resume-icon-link {
    width: 38px;
    height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.04);
    text-decoration: none;
    transition:
      background-color 0.14s ease,
      border-color 0.14s ease,
      transform 0.14s ease;
  }

  .resume-icon-link:hover,
  .resume-icon-link:focus-visible {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(138, 180, 248, 0.3);
    transform: translateY(-1px);
  }

  .resume-icon {
    position: relative;
    width: 16px;
    height: 16px;
    display: inline-block;
  }

  .download-icon::before,
  .download-icon::after {
    content: '';
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    background: #e8eaed;
  }

  .download-icon::before {
    top: 1px;
    width: 2px;
    height: 9px;
  }

  .download-icon::after {
    bottom: 1px;
    width: 10px;
    height: 2px;
    border-radius: 999px;
    box-shadow:
      0 -2px 0 0 #e8eaed,
      -3px -4px 0 -2px #e8eaed,
      3px -4px 0 -2px #e8eaed;
  }

  .email-small-icon::before,
  .email-small-icon::after {
    content: '';
    position: absolute;
    inset: 0;
    border: 1.5px solid #e8eaed;
    border-radius: 3px;
  }

  .email-small-icon::after {
    inset: 3px 2px auto 2px;
    height: 0;
    border-width: 0 0 1.5px 0;
    border-radius: 0;
    transform: skewY(-22deg);
    box-shadow:
      0 0 0 0 transparent,
      4px 0 0 0 transparent;
  }

  .browser-dogs {
    align-content: start;
  }

  .dog-feature {
    display: grid;
    grid-template-columns: minmax(260px, 1.05fr) minmax(220px, 0.95fr);
    gap: 1rem;
    margin-top: 1rem;
    margin-bottom: 1rem;
  }

  .dog-feature-media,
  .dog-feature-copy {
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.03);
  }

  .dog-media-button {
    display: block;
    width: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
  }

  .dog-feature-media img {
    width: 100%;
    height: 100%;
    min-height: 280px;
    object-fit: cover;
    display: block;
  }

  .dog-feature-copy {
    display: grid;
    align-content: start;
    gap: 1rem;
    padding: 1rem;
  }

  .dog-chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }

  .dog-chip {
    padding: 0.4rem 0.7rem;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.04);
    color: #d9f7e1;
    font: 500 0.78rem/1 'IBM Plex Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .dog-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .dog-stat {
    padding: 0.8rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.02);
  }

  .dog-stat span {
    display: block;
    margin-bottom: 0.45rem;
    color: #8ab4f8;
    font: 500 0.76rem/1 'IBM Plex Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .dog-stat strong {
    color: #f4f7fa;
    font: 600 1rem/1.2 'Space Grotesk', sans-serif;
  }

  .dog-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .dog-card {
    margin: 0;
    padding: 0;
    border: 1px solid rgba(255, 255, 255, 0.08);
    cursor: pointer;
    overflow: hidden;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.03);
    transition:
      transform 0.14s ease,
      border-color 0.14s ease,
      background-color 0.14s ease;
  }

  .dog-card:hover,
  .dog-card:focus-visible,
  .dog-media-button:hover,
  .dog-media-button:focus-visible {
    transform: translateY(-2px);
    border-color: rgba(138, 180, 248, 0.38);
  }

  .dog-card img {
    width: 100%;
    height: 220px;
    object-fit: cover;
    display: block;
  }

  .dog-detail-layout {
    display: grid;
    grid-template-columns: minmax(300px, 1.1fr) minmax(220px, 0.9fr);
    gap: 1rem;
    margin-top: 1rem;
  }

  .dog-detail-image {
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.03);
  }

  .dog-detail-image img {
    width: 100%;
    height: min(58vh, 560px);
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

  .preview-eyebrow {
    color: rgba(78, 250, 123, 0.72);
    font: 500 0.66rem/1.4 'IBM Plex Mono', monospace;
    letter-spacing: 0.08em;
    text-transform: uppercase;
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

  .preview-gibberish-block,
  .preview-card-copy {
    color: rgba(226, 236, 229, 0.62);
    font: 500 0.72rem/1.45 'IBM Plex Mono', monospace;
    letter-spacing: 0.01em;
  }

  .preview-gibberish-block.faint {
    color: rgba(138, 180, 248, 0.54);
  }

  .preview-card-copy.tiny {
    font-size: 0.66rem;
    line-height: 1.35;
  }

  .preview-real {
    align-content: start;
  }

  .preview-real-hero,
  .preview-real-metrics,
  .preview-real-featured {
    position: relative;
    z-index: 1;
  }

  .preview-real-hero {
    display: grid;
    gap: 0.9rem;
  }

  .preview-real-name {
    margin: 0;
    color: #f1fff5;
    font: 700 clamp(2.1rem, 5vw, 3.3rem)/0.95 'Space Grotesk', sans-serif;
    letter-spacing: -0.05em;
  }

  .preview-real-role {
    margin: 0;
    color: rgba(208, 227, 255, 0.94) !important;
    font: 600 1.05rem/1.45 'Space Grotesk', sans-serif;
  }

  .preview-real-copy {
    margin: 0;
    max-width: 60rem;
    color: rgba(230, 239, 233, 0.8) !important;
    font: 500 0.84rem/1.75 'IBM Plex Mono', monospace;
  }

  .preview-real-copy.faint {
    color: rgba(138, 180, 248, 0.72) !important;
  }

  .preview-real-links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.7rem;
  }

  .preview-real-links button {
    display: inline-flex;
    align-items: center;
    min-height: 34px;
    padding: 0 0.8rem;
    border: 1px solid rgba(78, 250, 123, 0.14);
    border-radius: 999px;
    color: #dfffea;
    background: rgba(10, 18, 13, 0.72);
    cursor: pointer;
    text-decoration: none;
    font: 500 0.72rem/1 'IBM Plex Mono', monospace;
    letter-spacing: 0.03em;
  }

  .preview-real-metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
  }

  .preview-real-section,
  .preview-real-split,
  .preview-real-footer {
    position: relative;
    z-index: 1;
  }

  .preview-real-section {
    display: grid;
    gap: 1rem;
  }

  .preview-real-section.compact {
    gap: 0.8rem;
  }

  .preview-real-section-head {
    display: grid;
    gap: 0.35rem;
  }

  .preview-real-section-head strong {
    color: #f1fff5;
    font: 700 1.18rem/1.2 'Space Grotesk', sans-serif;
    letter-spacing: -0.03em;
  }

  .preview-real-section-kicker {
    margin: 0;
    color: rgba(138, 180, 248, 0.82);
    font: 500 0.72rem/1.35 'IBM Plex Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .preview-real-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .preview-real-project {
    text-align: left;
    cursor: pointer;
    transition:
      transform 0.14s ease,
      border-color 0.14s ease,
      background-color 0.14s ease;
  }

  .preview-real-project:hover,
  .preview-real-project:focus-visible {
    transform: translateY(-1px);
    border-color: rgba(138, 180, 248, 0.28);
    background: rgba(16, 28, 22, 0.88);
  }

  .preview-real-split {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .preview-real-experience-list {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
  }

  .preview-real-experience {
    display: grid;
    gap: 0.55rem;
    padding: 0.95rem;
    border: 1px solid rgba(138, 180, 248, 0.12);
    border-radius: 12px;
    background: rgba(11, 18, 15, 0.82);
  }

  .preview-real-experience p,
  .preview-real-experience strong {
    margin: 0;
  }

  .preview-real-experience p {
    color: rgba(224, 238, 229, 0.74);
    font: 500 0.72rem/1.6 'IBM Plex Mono', monospace;
  }

  .preview-real-experience strong {
    color: #f4fff8;
    font: 700 0.96rem/1.25 'Space Grotesk', sans-serif;
  }

  .preview-real-footer {
    display: grid;
    gap: 0.9rem;
  }

  .footer-links {
    gap: 0.6rem;
  }

  .preview-real-metric {
    padding: 0.95rem;
    border: 1px solid rgba(138, 180, 248, 0.14);
    border-radius: 14px;
    background: rgba(12, 20, 16, 0.8);
  }

  .preview-real-metric span {
    display: block;
    margin-bottom: 0.45rem;
    color: rgba(138, 180, 248, 0.8);
    font: 500 0.7rem/1.35 'IBM Plex Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .preview-real-metric strong {
    color: #f1fff5;
    font: 700 1rem/1.2 'Space Grotesk', sans-serif;
  }

  .preview-real-card {
    display: grid;
    gap: 0.7rem;
    padding: 0.95rem;
    border-radius: 12px;
    border: 1px solid rgba(78, 250, 123, 0.14);
    background: rgba(10, 18, 13, 0.78);
  }

  .preview-real-card p,
  .preview-real-card strong {
    margin: 0;
  }

  .preview-real-card p {
    color: rgba(224, 238, 229, 0.74);
    font: 500 0.72rem/1.6 'IBM Plex Mono', monospace;
  }

  .preview-real-card strong {
    color: #f4fff8;
    font: 700 1rem/1.25 'Space Grotesk', sans-serif;
  }

  .preview-real-card-kicker {
    color: rgba(78, 250, 123, 0.78) !important;
    font-size: 0.68rem !important;
    line-height: 1.35;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .preview-real-token-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
    margin-top: 0.15rem;
  }

  .preview-real-token-row span {
    padding: 0.35rem 0.55rem;
    border-radius: 999px;
    border: 1px solid rgba(78, 250, 123, 0.14);
    color: #e4ffef;
    background: rgba(21, 34, 26, 0.82);
    font: 500 0.67rem/1 'IBM Plex Mono', monospace;
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
    overflow: hidden;
  }

  .preview-portrait img {
    width: 100%;
    height: 100%;
    min-height: 300px;
    object-fit: cover;
    display: block;
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

    .file-browser,
    .preview-hero,
    .preview-project-grid,
    .preview-metric-row,
    .preview-real-metrics,
    .preview-real-grid,
    .preview-real-split,
    .preview-real-experience-list {
      grid-template-columns: 1fr;
    }

    .file-browser {
      grid-template-columns: 1fr;
    }

    .file-browser-sidebar,
    .file-browser-preview {
      border: 0;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
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
    .dog-feature,
    .dog-stats,
    .dog-detail-layout {
      grid-template-columns: 1fr;
    }

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

    .browser-project-grid,
    .file-browser-grid,
    .browser-project-detail-grid {
      grid-template-columns: 1fr;
    }

    .browser-window {
      left: 8px !important;
      top: 18px !important;
      width: calc(100vw - 16px) !important;
      height: min(560px, calc(100vh - 110px)) !important;
    }

    .files-window {
      left: 8px !important;
      top: 18px !important;
      width: calc(100vw - 16px) !important;
      height: min(560px, calc(100vh - 110px)) !important;
    }

    .browser-toolbar {
      grid-template-columns: auto minmax(0, 1fr);
    }

    .files-surface,
    .files-pane {
      grid-template-columns: 1fr;
    }

    .files-preview {
      display: none;
    }

    .files-list-head,
    .files-row {
      grid-template-columns: minmax(0, 1fr);
    }

    .files-list-head span:nth-child(2),
    .files-list-head span:nth-child(3),
    .files-row-type,
    .files-row-info {
      display: none;
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
