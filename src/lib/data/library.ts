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

export type Shelf = {
  id: string;
  label: string;
  descriptor: string;
  focus: string;
  volumes: Volume[];
};

export const shelves: Shelf[] = [
  {
    id: 'distributed-systems',
    label: 'Distributed Systems',
    descriptor: 'Queues, replication, coordination',
    focus: 'Latency-sensitive services and control planes',
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
        title: 'Packet Auth Gateway',
        stack: 'C++ · QUIC · eBPF',
        summary: 'Inline auth filter layering policy enforcement into QUIC ingress.',
        metadata: '2022 · Security',
        details: 'Injects eBPF hooks for token verification and telemetry without breaking transport semantics.'
      }
    ]
  },
  {
    id: 'data-observability',
    label: 'Data + Observability',
    descriptor: 'Lineage, telemetry, pipelines',
    focus: 'Keeping datasets trustworthy under load',
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
        title: 'Delta Forge',
        stack: 'Scala · Spark · Delta Lake',
        summary: 'Streaming ingestion contracts enforcing schema parity.',
        metadata: '2022 · Data Reliability',
        details: 'Lightweight contract checks and remediation hooks keep SLA-bound ETL windows uninterrupted.'
      }
    ]
  },
  {
    id: 'platform-automation',
    label: 'Platform Automation',
    descriptor: 'Tooling, workflows, guardrails',
    focus: 'Automating releases and governance',
    volumes: [
      {
        title: 'Release Loom',
        stack: 'Go · GitHub Actions · Nomad',
        summary: 'Declarative release choreographer aligning infra + app rollouts.',
        metadata: '2024 · Platform',
        details: 'Bundles infrastructure plans with service deploys so rollbacks share consistent snapshots.',
        links: {
          github: 'https://github.com/example/release-loom'
        }
      },
      {
        title: 'Spec Cartographer',
        stack: 'TypeScript · D3 · GraphQL',
        summary: 'Schema-diff explorer auditing interface contracts.',
        metadata: '2023 · Architecture',
        details: 'Highlights drift hotspots to guide RFC reviews and prioritize integration fixes.'
      },
      {
        title: 'Cluster Praxis',
        stack: 'Python · Terraform · Vault',
        summary: 'Secure bootstrap pipelines for ephemeral research clusters.',
        metadata: '2022 · Infrastructure',
        details: 'Automates secrets distribution and teardown flow for reproducible benchmarking environments.',
        links: {
          demo: 'https://example.com/cluster-praxis'
        }
      }
    ]
  },
  {
    id: 'experimental-prototypes',
    label: 'Experimental Prototypes',
    descriptor: 'Edges explored to learn constraints',
    focus: 'Hardware + HCI experiments',
    volumes: [
      {
        title: 'Acoustic Hash Grid',
        stack: 'Rust · DSP · WebAudio',
        summary: 'Spatial hashing of acoustic signatures for robotics.',
        metadata: '2024 · Experiment',
        details: 'Links microphone arrays to low-latency navigation aids for pallet robots in reflective environments.'
      },
      {
        title: 'Chronicle Delta',
        stack: 'Svelte · IndexedDB · Worker API',
        summary: 'Offline lab notebook aligning research notes + code snapshots.',
        metadata: '2023 · Workflow',
        details: 'Pairs structured entries with code artifacts for reproducibility in distributed teams.'
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
