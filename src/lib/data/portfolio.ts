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

export type Experience = {
  role: string;
  organization: string;
  location: string;
  period: string;
  summary: string;
  highlights: string[];
  stack: string[];
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
  experience: Experience[];
  skills: SkillGroup[];
  achievements: Achievement[];
  about: AboutContent;
};

export type GitHubRepoSummary = {
  name: string;
  fullName: string;
  htmlUrl: string;
  description: string | null;
  homepage: string | null;
  updatedAt: string;
  pushedAt: string | null;
  language: string | null;
  topics: string[];
  stars: number;
  archived: boolean;
  fork: boolean;
  visibility: string;
};

const accentPairs = [
  { accent: '#1d7f76', accentSoft: '#c9ece8' },
  { accent: '#b2682f', accentSoft: '#f2d6bd' },
  { accent: '#5f63d3', accentSoft: '#d8dafb' },
  { accent: '#7d8d2f', accentSoft: '#e4ebbc' }
] as const;

const curatedRepoKeys = new Set([
  'omar1ramadan/fishy',
  'omar1ramadan/datacarellc',
  'omar1ramadan/mario-kart-rl',
  'omar1ramadan/folium'
]);

export const portfolioContent: PortfolioContent = {
  hero: {
    eyebrow: 'Software engineering + applied AI',
    name: 'Omar Ramadan',
    role: 'Software engineering student building ML, autonomy, and full-stack systems.',
    summary:
      'I build products that sit at the intersection of software engineering, applied machine learning, and real-world systems. Most of my work has been in autonomy, data-heavy applications, and end-to-end products that need both engineering discipline and clear UX.',
    note:
      'Right now I am focused on AI/ML products, embedded autonomy, and full-stack systems that can move from prototype to something people can actually use.',
    links: [
      { label: 'GitHub', href: 'https://github.com/Omar1Ramadan', external: true, variant: 'primary' },
      {
        label: 'LinkedIn',
        href: 'https://www.linkedin.com/in/omarramadanb91b298/',
        external: true,
        variant: 'secondary'
      },
      { label: 'Resume', href: '/OmarRamadan_Resume.pdf', variant: 'secondary' }
    ],
    stats: [
      { label: 'Portfolio projects', value: '4' },
      { label: 'Experience roles', value: '5' },
      { label: 'Public repos synced', value: '0' }
    ]
  },
  projects: [
    {
      slug: 'fishy-dark-vessel-monitoring',
      kicker: 'Featured project',
      title: 'FISHY Dark Vessel Monitoring Workspace',
      status: 'Built',
      year: '2025',
      summary:
        'A geospatial monitoring workspace for investigating fishing activity, AIS gaps, SAR detections, and vessel movement near EEZ boundaries.',
      impact:
        'Turned raw maritime data into an analyst workflow that moves from regional scanning to vessel-level investigation and blackout-period path prediction.',
      stack: ['Next.js', 'TypeScript', 'Mapbox GL JS', 'FastAPI', 'Python', 'LSTM'],
      details:
        'FISHY combines a Next.js geospatial dashboard with Python-backed prediction services to help analysts review suspicious vessel behavior. The system integrates Global Fishing Watch data, EEZ geometry, vessel metadata, SAR detections, and path prediction into one investigation surface.',
      highlights: [
        'Integrated Global Fishing Watch APIs, EEZ geometry, vessel metadata, and SAR overlays through custom API routes',
        'Built an LSTM-based FastAPI prediction service for estimating vessel movement during AIS blackout periods',
        'Added a dead-reckoning fallback so the monitoring flow keeps working when the ML service is unavailable'
      ],
      links: [{ label: 'GitHub repo', href: 'https://github.com/Omar1Ramadan/fishy', external: true, variant: 'inline' }],
      accent: '#1d7f76',
      accentSoft: '#c9ece8'
    },
    {
      slug: 'datacarellc-health-platform',
      kicker: 'Client-facing system',
      title: 'DataCareLLC Offline-First Healthcare Platform',
      status: 'Built',
      year: '2025',
      summary:
        'An offline-first healthcare platform for mobile medical teams operating in low-connectivity environments.',
      impact:
        'Enabled deferred sync, field-ready data collection, and cloud-backed analytics for clinics working without reliable internet access.',
      stack: ['Java', 'Spring Boot', 'H2', 'YugabyteDB', 'React', 'GCP'],
      details:
        'This project combined an offline-first Java backend, queue-based synchronization, and a multi-role frontend to support healthcare workflows in remote regions. I also helped deploy the backend and database stack on GCP and built analytics workflows for reporting.',
      highlights: [
        'Built an offline-first sync pipeline between isolated H2 nodes and cloud-hosted YugabyteDB',
        'Developed multi-role frontend flows for patient intake, diagnosis, clinic administration, and accessibility support',
        'Created healthcare analytics dashboards with Python, NiceGUI, Plotly, and downloadable reports'
      ],
      links: [
        { label: 'GitHub repo', href: 'https://github.com/Omar1Ramadan/DataCareLLC', external: true, variant: 'inline' }
      ],
      accent: '#b2682f',
      accentSoft: '#f2d6bd'
    },
    {
      slug: 'mario-kart-rl',
      kicker: 'ML systems project',
      title: 'Mario Kart Reinforcement Learning Racing Agent',
      status: 'Research build',
      year: '2025',
      summary:
        'An emulator-based reinforcement learning environment for training and evaluating autonomous racing agents.',
      impact:
        'Produced a reproducible RL pipeline for comparing PPO and DQN-family agents under the same environment, reward design, and checkpoint logic.',
      stack: ['Python', 'Stable-Retro', 'PPO', 'Dueling DQN', 'Docker', 'TensorBoard'],
      details:
        'I built a custom Mario Kart training environment with discrete actions, hybrid observations, reward shaping, termination logic, checkpoint tracking, and evaluation diagnostics. The project was designed to make long-running PPO and DQN experiments repeatable and easier to analyze.',
      highlights: [
        'Engineered a Gym-style environment with 7 discrete actions and 30 checkpoint targets',
        'Ran PPO and DQN-family training experiments up to 3,000,000 environment steps',
        'Built Dockerized tooling, TensorBoard logging, checkpoint save-resume, and evaluation scripts'
      ],
      links: [
        { label: 'GitHub repo', href: 'https://github.com/Omar1Ramadan/mario-kart-rl', external: true, variant: 'inline' }
      ],
      accent: '#5f63d3',
      accentSoft: '#d8dafb'
    },
    {
      slug: 'folium-collaborative-notes',
      kicker: 'Systems + web project',
      title: 'Folium Collaborative Note System',
      status: 'Built',
      year: '2025',
      summary:
        'A collaborative note-taking system with a Svelte frontend and a multithreaded C++ backend designed for concurrency-safe shared editing.',
      impact:
        'Combined real-time collaboration goals with backend concurrency discipline, JWT-based access control, and a distributed deployment setup.',
      stack: ['Svelte', 'C++', 'PostgreSQL', 'JWT', 'AWS', 'Vercel'],
      details:
        'Folium uses a globally hosted frontend and a C++ backend with modular layers, dispatcher-thread pool architecture, and concurrency-safe note processing. The system was built to support multiple simultaneous users while keeping the architecture extensible.',
      highlights: [
        'Built a multithreaded C++ server with mutex-based synchronization and ACID-safe note processing',
        'Implemented a dispatcher-thread pool design with modular backend layers and JWT session handling',
        'Deployed the frontend and backend across Vercel and AWS for public access and load testing'
      ],
      links: [{ label: 'GitHub repo', href: 'https://github.com/Omar1Ramadan/Folium', external: true, variant: 'inline' }],
      accent: '#7d8d2f',
      accentSoft: '#e4ebbc'
    }
  ],
  experience: [
    {
      role: 'Computer Vision Jr. Lead',
      organization: 'Western Aerospace Design Team',
      location: 'London, ON',
      period: 'September 2024 - Present',
      summary:
        'Leading autonomy-facing vision and flight testing work for an advanced-class tricopter, with emphasis on perception reliability, mission workflows, and bench validation.',
      highlights: [
        'Developed a Python and OpenCV vision pipeline that improved ArUco marker and landing-zone detection accuracy by 30 percent during autonomous flight testing',
        'Integrated Raspberry Pi, PX4, MAVLink, and a MicroAir405v2 controller into a reusable autonomy test kit for bench validation',
        'Validated waypoint tracking in Gazebo before confirming PX4-guided execution on the physical tricopter'
      ],
      stack: ['Python', 'OpenCV', 'PX4', 'MAVLink', 'Gazebo', 'Raspberry Pi']
    },
    {
      role: 'Battery Systems Research Assistant',
      organization: 'Western Formula Racing / Western University Research',
      location: 'London, ON',
      period: '2024 - Present',
      summary:
        'Built ML-driven thermal analysis and battery telemetry tooling for EV systems research, combining predictive models with embedded and CAN tooling.',
      highlights: [
        'Developed an EV thermal risk analyzer that achieved 0.9995 test AUC, 0.9688 F1, and 1.307 C MAE for overheating detection and forecasting',
        'Designed predictive derating heuristics that converted model outputs into actionable torque-reduction recommendations',
        'Built CAN validation and telemetry workflows using CANdapter, python-can, pyCandapter, and ESP32-based support hardware'
      ],
      stack: ['Python', 'scikit-learn', 'STM32', 'CAN bus', 'CubeIDE', 'ESP32']
    },
    {
      role: 'Software Engineer',
      organization: 'RBC Initiative Project / DataCareLLC',
      location: 'Remote',
      period: '2025',
      summary:
        'Worked on an offline-first healthcare platform for low-connectivity field use, contributing across backend, frontend, deployment, and analytics.',
      highlights: [
        'Built Java and H2-based offline workflows with deferred synchronization into a cloud YugabyteDB cluster',
        'Developed routed React workflows for patient intake, diagnosis, clinic administration, and role-based access',
        'Supported GCP deployment and analytics reporting for a real client-facing healthcare system'
      ],
      stack: ['Java', 'Spring Boot', 'React', 'YugabyteDB', 'GCP', 'Python']
    },
    {
      role: 'AI Policy Lead',
      organization: 'Minister Filomena Tassi Consistency Youth Council',
      location: 'Hamilton, ON',
      period: 'August 2020 - Present',
      summary:
        'Prepared policy recommendations on AI in education and workplace use, balancing innovation opportunities with ethics and safety concerns.',
      highlights: [
        'Prepared a policy proposal on AI in education for Minister Filomena Tassi',
        'Recommended ethical and safe AI use to inform municipal thinking around a 4.2 billion federal budget allocation',
        'Organized AI mentorships and workshops with schools and tech sponsors to improve youth digital literacy'
      ],
      stack: ['Policy research', 'Technical communication', 'Public speaking', 'Program coordination']
    },
    {
      role: 'Short-Term Rental Operations Manager',
      organization: 'Independent Hospitality Business',
      location: 'Remote / New Cairo, Egypt',
      period: '2023 - Present',
      summary:
        'Managing day-to-day operations, guest support, pricing strategy, and multi-platform listings for a small hospitality business.',
      highlights: [
        'Supported 300 to 400 bookings across Airbnb, Booking.com, Vrbo, and Expedia while maintaining a 4.94 Airbnb rating',
        'Coordinated guest support across the full stay lifecycle with approximately one-hour response times',
        'Expanded the business from Airbnb to four platforms to diversify acquisition and repeat bookings'
      ],
      stack: ['Operations', 'Customer support', 'Pricing strategy', 'Process management']
    }
  ],
  skills: [
    {
      title: 'AI, data, and machine learning',
      summary: 'Applied ML work across forecasting, recommender systems, RL, computer vision, and data engineering.',
      items: ['Python', 'scikit-learn', 'TensorFlow/Keras', 'PyTorch', 'Pandas', 'LSTM', 'PPO / DQN']
    },
    {
      title: 'Full-stack product engineering',
      summary: 'Shipping user-facing systems across web apps, APIs, databases, auth, and deployment workflows.',
      items: ['TypeScript', 'React', 'Next.js', 'Svelte', 'FastAPI', 'Spring Boot', 'PostgreSQL / MySQL']
    },
    {
      title: 'Embedded, autonomy, and systems',
      summary: 'Building software that interacts with hardware, telemetry, robotics workflows, and constrained environments.',
      items: ['OpenCV', 'PX4', 'MAVLink', 'Gazebo', 'STM32', 'CAN bus', 'Raspberry Pi']
    }
  ],
  achievements: [
    {
      title: 'Won 1st place for Best Overall Hackathon',
      context: 'DeepEnd / GDSC Hackathon',
      year: '2025',
      note: 'Built a personalized project recommendation platform using Next.js, Firebase, TensorFlow, and the OpenAI API.'
    },
    {
      title: 'Improved autonomous landing-zone detection accuracy by 30 percent',
      context: 'Western Aerospace Design Team',
      year: '2025',
      note: 'Shipped computer vision and flight testing workflows that materially improved autonomous tricopter reliability.'
    },
    {
      title: 'Placed in the top 10 out of 50 plus teams',
      context: 'Western Engineering Competition',
      year: '2024',
      note: 'Led a team building a remote-controlled vehicle with a servo-driven claw for disaster-terrain navigation.'
    }
  ],
  about: {
    title: 'Let’s build something useful.',
    summary:
      'I care most about technically serious work that still has a clear user or operator payoff. The strongest projects for me are the ones where systems, data, and interface design all need to line up.',
    focus:
      'I am currently looking for opportunities in software engineering, ML engineering, data-heavy product work, and systems roles that value ownership across the stack.',
    contactNote:
      'The portfolio is now driven by resume-backed project and experience data, with recent public GitHub repositories synced in as live project cards.',
    links: [{ label: 'Email', href: 'mailto:oramadan2004@gmail.com', external: true, variant: 'secondary' }]
  }
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatMonthYear(value: string | null) {
  if (!value) return 'recently';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'recently';

  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Toronto'
  }).format(date);
}

function buildRepoStack(repo: GitHubRepoSummary) {
  const values = [repo.language, ...repo.topics]
    .filter((item): item is string => !!item)
    .map((item) => item.trim())
    .filter(Boolean);

  return values.length ? values.slice(0, 6) : ['GitHub', 'Source code'];
}

function mapGitHubRepoToProject(repo: GitHubRepoSummary, index: number): Project {
  const accentPair = accentPairs[index % accentPairs.length];
  const lastActivity = formatMonthYear(repo.pushedAt ?? repo.updatedAt);
  const stack = buildRepoStack(repo);
  const details =
    repo.description?.trim() ||
    `A live project card generated from the public ${repo.fullName} repository. This entry is synced from GitHub so the portfolio can reflect active work without needing a manual site edit every time a new repo appears.`;

  const links: LinkItem[] = [{ label: 'GitHub repo', href: repo.htmlUrl, external: true, variant: 'inline' }];
  if (repo.homepage) {
    links.push({ label: 'Live demo', href: repo.homepage, external: true, variant: 'inline' });
  }

  return {
    slug: `github-${slugify(repo.name)}`,
    kicker: 'Live GitHub sync',
    title: repo.name.replace(/[-_]/g, ' '),
    status: 'Live on GitHub',
    year: new Date(repo.updatedAt).getUTCFullYear().toString(),
    summary: repo.description?.trim() || 'Recent public repository synced directly from GitHub.',
    impact: `Most recent public activity landed in ${lastActivity}, keeping the portfolio aligned with current work instead of a static snapshot.`,
    stack,
    details,
    highlights: [
      `Synced from ${repo.fullName}`,
      `Last activity: ${lastActivity}`,
      repo.stars > 0 ? `${repo.stars} GitHub star${repo.stars === 1 ? '' : 's'}` : 'Public repository'
    ],
    links,
    accent: accentPair.accent,
    accentSoft: accentPair.accentSoft
  };
}

export function buildPortfolioContent(githubRepos: GitHubRepoSummary[] = []): PortfolioContent {
  const liveRepos = githubRepos
    .filter((repo) => repo.visibility === 'public' && !repo.archived && !repo.fork)
    .filter((repo) => !curatedRepoKeys.has(repo.fullName.toLowerCase()))
    .sort((left, right) => {
      const leftTime = Date.parse(left.pushedAt ?? left.updatedAt);
      const rightTime = Date.parse(right.pushedAt ?? right.updatedAt);
      return rightTime - leftTime;
    });

  const liveProjects = liveRepos.slice(0, 4).map(mapGitHubRepoToProject);
  const projects = [...portfolioContent.projects, ...liveProjects];

  return {
    ...portfolioContent,
    hero: {
      ...portfolioContent.hero,
      stats: [
        { label: 'Portfolio projects', value: String(projects.length) },
        { label: 'Experience roles', value: String(portfolioContent.experience.length) },
        { label: 'Public repos synced', value: String(liveRepos.length) }
      ]
    },
    projects
  };
}
