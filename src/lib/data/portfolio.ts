export type LinkItem = {
  label: string;
  href: string;
  external?: boolean;
  variant?: 'primary' | 'secondary' | 'inline';
};

export type HeroContent = {
  eyebrow: string;
  name: string;
  role: string;
  summary: string;
  note: string;
  links: LinkItem[];
  stats: Array<{ label: string; value: string }>;
};

export type Project = {
  slug: string;
  kicker: string;
  title: string;
  status: string;
  year: string;
  summary: string;
  impact: string;
  stack: string[];
  details: string;
  highlights: string[];
  links: LinkItem[];
  accent: string;
  accentSoft: string;
};

export type SkillGroup = {
  title: string;
  summary: string;
  items: string[];
};

export type Achievement = {
  title: string;
  context: string;
  year: string;
  note: string;
};

export type AboutContent = {
  title: string;
  summary: string;
  focus: string;
  contactNote: string;
  links: LinkItem[];
};

export type PortfolioContent = {
  hero: HeroContent;
  projects: Project[];
  skills: SkillGroup[];
  achievements: Achievement[];
  about: AboutContent;
};

export const portfolioContent: PortfolioContent = {
  hero: {
    eyebrow: 'Selected collection',
    name: 'Omar',
    role: 'Developer building clear, durable interfaces.',
    summary:
      "I turn ambitious ideas into focused products. This portfolio now favors structure, readability, and honest proof over novelty for novelty's sake.",
    note:
      'Currently strongest in Svelte, TypeScript, frontend architecture, and shipping interfaces that stay legible as the scope changes.',
    links: [
      { label: 'View work', href: '#projects', variant: 'primary' },
      { label: 'Read notes', href: '#about', variant: 'secondary' }
    ],
    stats: [
      { label: 'Featured projects', value: '3' },
      { label: 'Primary stack', value: 'Svelte / TS' },
      { label: 'Portfolio mode', value: 'Editorial' }
    ]
  },
  projects: [
    {
      slug: 'portfolio-redesign',
      kicker: 'Featured rebuild',
      title: 'Portfolio Redesign',
      status: 'In progress',
      year: '2026',
      summary: 'A full reset from an over-engineered concept into a content-first portfolio that can grow with real work.',
      impact:
        'Replaced brittle interaction depth with a maintainable system that highlights projects, skills, and proof without hiding them behind spectacle.',
      stack: ['SvelteKit', 'TypeScript', 'Responsive UI', 'Content modeling'],
      details:
        'The current build shifts the portfolio away from forced 3D navigation into a single-page editorial experience. The content model is typed, reusable, and intentionally simple to update as new work ships.',
      highlights: [
        'Moved the homepage to a typed content-driven architecture',
        'Designed to look complete even with a small set of real projects',
        'Optimized for readability on both desktop and mobile'
      ],
      links: [{ label: 'This page', href: '#top', variant: 'inline' }],
      accent: '#b46034',
      accentSoft: '#ead1bf'
    },
    {
      slug: 'library-prototype',
      kicker: 'Prototype archive',
      title: 'Interactive Library Prototype',
      status: 'Archived concept',
      year: '2026',
      summary: 'A Three.js experiment that explored walls, shelves, and projects as a navigable spatial library.',
      impact:
        'Useful as a prototype because it exposed the cost of high-friction interaction and made the redesign direction obvious.',
      stack: ['Three.js', 'Svelte', 'GSAP', 'Interaction design'],
      details:
        'The prototype used a hexagonal room, click targets, camera choreography, and staged navigation. It had visual novelty, but the portfolio value was buried under too many steps and too little payoff.',
      highlights: [
        'Built wall, shelf, and project state transitions',
        'Tested camera motion and raycast-based selection',
        'Converted failed complexity into a stronger product decision'
      ],
      links: [{ label: 'Case note', href: '#proof', variant: 'inline' }],
      accent: '#255765',
      accentSoft: '#c8e0e6'
    },
    {
      slug: 'ui-systems-lab',
      kicker: 'Ongoing studies',
      title: 'UI Systems Lab',
      status: 'Ongoing',
      year: '2026',
      summary: 'A working bucket for layout studies, interaction patterns, and reusable frontend decisions.',
      impact:
        'Acts as a practical proving ground for component discipline, visual systems, and interface choices before they become production-facing.',
      stack: ['TypeScript', 'Design systems', 'Motion', 'Accessibility'],
      details:
        'Rather than padding the portfolio with weak filler projects, this space represents the experiments and smaller builds that sharpen implementation judgment. It supports stronger polished work later without forcing fake case studies now.',
      highlights: [
        'Keeps exploratory work separate from stronger featured builds',
        'Focuses on repeatable UI decisions instead of one-off flourishes',
        'Supports future expansion without redesigning the homepage'
      ],
      links: [],
      accent: '#85712f',
      accentSoft: '#ebe2b9'
    }
  ],
  skills: [
    {
      title: 'Frontend systems',
      summary: 'Interfaces with clean hierarchy, scalable structure, and strong responsiveness.',
      items: ['SvelteKit', 'TypeScript', 'Component architecture', 'State modeling', 'Responsive layout']
    },
    {
      title: 'Interaction and polish',
      summary: 'Motion and interface behavior used to clarify, not distract.',
      items: ['Micro-interactions', 'GSAP', 'Accessibility basics', 'Keyboard flows', 'Reduced-motion support']
    },
    {
      title: 'Product framing',
      summary: 'Able to cut complexity when the original concept stops serving the user.',
      items: ['Information architecture', 'Content strategy', 'Rapid prototyping', 'UI critique', 'Iterative redesign']
    }
  ],
  achievements: [
    {
      title: 'Turned a failed concept into a stronger product direction',
      context: 'Portfolio rebuild',
      year: '2026',
      note: 'Used the limitations of the 3D prototype to define a clearer, more maintainable portfolio system.'
    },
    {
      title: 'Built the homepage around typed content instead of hard-coded layout assumptions',
      context: 'SvelteKit architecture',
      year: '2026',
      note: 'New work can be added by editing data rather than rewriting presentation logic.'
    },
    {
      title: 'Designed for a small but real body of work',
      context: 'Portfolio strategy',
      year: '2026',
      note: 'The site stays credible with a curated few projects and proof sections instead of artificial filler.'
    }
  ],
  about: {
    title: 'Shelf notes',
    summary:
      'I care about interfaces that make sense quickly. The goal is not to make every idea look flashy; the goal is to make the important parts feel obvious, intentional, and easy to trust.',
    focus:
      'Right now I am focused on sharpening frontend execution, interaction judgment, and the ability to simplify a messy concept into something people can actually use.',
    contactNote:
      'Add your real GitHub, LinkedIn, and email in this data file when you are ready. The layout is already wired to support them cleanly.',
    links: [
      { label: 'Jump to top', href: '#top', variant: 'secondary' },
      { label: 'View projects', href: '#projects', variant: 'secondary' }
    ]
  }
};
