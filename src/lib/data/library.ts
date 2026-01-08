export type VolumeLink = {
  github?: string;
  demo?: string;
};

export type Volume = {
  title: string;
  stack: string;
  summary: string;
  metadata: string;
  details: string;
  links?: VolumeLink;
};

export type Wall = {
  id: string;
  label: string;
  descriptor: string;
  focus: string;
  volumes: Volume[];
};

export const walls: Wall[] = [
  {
    id: 'systems-architecture',
    label: 'Systems Architecture',
    descriptor: 'Meshes, ingress, deterministic coordination',
    focus: 'Control planes that keep distributed services predictable',
    volumes: [
      {
        title: 'Adaptive Mesh Queue',
        stack: 'Go · gRPC · Kubernetes',
        summary: 'Queue fabric that rebalances workers with live congestion telemetry.',
        metadata: '2024 · Throughput Lab',
        details: 'Implements circuit-breaking leases so bursty tenants do not saturate shared compute clusters.',
        links: {
          github: 'https://github.com/example/mesh-queue'
        }
      },
      {
        title: 'Packet Auth Gateway',
        stack: 'C++ · QUIC · eBPF',
        summary: 'Inline auth filter layering policy enforcement into QUIC ingress.',
        metadata: '2022 · Security',
        details: 'Injects eBPF hooks for token verification and telemetry without breaking transport semantics.'
      }
    ]
  },
  {
    id: 'consensus-tooling',
    label: 'Consensus Tooling',
    descriptor: 'Simulation, release, rollback symmetry',
    focus: 'Utilities that stress-test agreements before rollout',
    volumes: [
      {
        title: 'Consensus Lightboard',
        stack: 'Rust · Raft · WebAssembly',
        summary: 'Deterministic Raft visualizer validating state-machine assumptions.',
        metadata: '2023 · Research Tool',
        details: 'Replays logs inside Wasm sandboxes to assert transition determinism before production rollout.',
        links: {
          demo: 'https://example.com/consensus-lightboard'
        }
      },
      {
        title: 'Release Loom',
        stack: 'Go · GitHub Actions · Nomad',
        summary: 'Declarative release choreographer aligning infra + app rollouts.',
        metadata: '2024 · Platform',
        details: 'Bundles infrastructure plans with service deploys so rollbacks share consistent snapshots.',
        links: {
          github: 'https://github.com/example/release-loom'
        }
      }
    ]
  },
  {
    id: 'data-reliability',
    label: 'Data Reliability',
    descriptor: 'Column stores, contracts, lineage',
    focus: 'Keeping telemetry and ETL streams trustworthy under load',
    volumes: [
      {
        title: 'Signal Atlas',
        stack: 'Python · Apache Arrow · ClickHouse',
        summary: 'Columnar telemetry store tuned for capacity planning.',
        metadata: '2024 · Analytics',
        details: 'Arrow Flight ingestion plus ClickHouse rollups retain 30-day traces under strict latency SLAs.',
        links: {
          github: 'https://github.com/example/signal-atlas'
        }
      },
      {
        title: 'Delta Forge',
        stack: 'Scala · Spark · Delta Lake',
        summary: 'Streaming ingestion contracts enforcing schema parity.',
        metadata: '2022 · Data Reliability',
        details: 'Lightweight contract checks and remediation hooks keep SLA-bound ETL windows uninterrupted.'
      }
    ]
  },
  {
    id: 'observability',
    label: 'Observability',
    descriptor: 'Narratives, schema drift, trace alignment',
    focus: 'Interfaces that compress complex incidents into legible stories',
    volumes: [
      {
        title: 'Trace Codex',
        stack: 'TypeScript · OpenTelemetry · React',
        summary: 'Trace narratives translating span graphs into incident views.',
        metadata: '2023 · Incident Response',
        details: 'Builds annotated runbook entries per service family to lower MTTR during distributed outages.',
        links: {
          demo: 'https://example.com/trace-codex'
        }
      },
      {
        title: 'Spec Cartographer',
        stack: 'TypeScript · D3 · GraphQL',
        summary: 'Schema-diff explorer auditing interface contracts.',
        metadata: '2023 · Architecture',
        details: 'Highlights drift hotspots to guide RFC reviews and prioritize integration fixes.'
      }
    ]
  },
  {
    id: 'platform-automation',
    label: 'Platform Automation',
    descriptor: 'Secrets, ephemeral clusters, guardrails',
    focus: 'Workflow systems that reduce toil across research teams',
    volumes: [
      {
        title: 'Cluster Praxis',
        stack: 'Python · Terraform · Vault',
        summary: 'Secure bootstrap pipelines for ephemeral research clusters.',
        metadata: '2022 · Infrastructure',
        details: 'Automates secrets distribution and teardown flow for reproducible benchmarking environments.',
        links: {
          demo: 'https://example.com/cluster-praxis'
        }
      },
      {
        title: 'Chronicle Delta',
        stack: 'Svelte · IndexedDB · Worker API',
        summary: 'Offline lab notebook aligning research notes + code snapshots.',
        metadata: '2023 · Workflow',
        details: 'Pairs structured entries with code artifacts for reproducibility in distributed teams.'
      }
    ]
  },
  {
    id: 'experimental-signal',
    label: 'Experimental Signal',
    descriptor: 'Hardware, DSP meshes, adaptive fabrics',
    focus: 'Edge prototypes that test bandwidth and physical constraints',
    volumes: [
      {
        title: 'Acoustic Hash Grid',
        stack: 'Rust · DSP · WebAudio',
        summary: 'Spatial hashing of acoustic signatures for robotics.',
        metadata: '2024 · Experiment',
        details: 'Links microphone arrays to low-latency navigation aids for pallet robots in reflective environments.'
      },
      {
        title: 'Forma Switch',
        stack: 'C · FPGA · PCIe',
        summary: 'Deterministic fabric switch tuned for low-power clusters.',
        metadata: '2022 · Hardware',
        details: 'Programmable match-action tables keep inference workloads fed without CPU copies.'
      }
    ]
  }
];
