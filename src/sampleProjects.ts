export interface Project {
  id: string;
  title: string;
  description: string;
  type: "individual" | "group";
  tech: string[];
  demoUrl: string;
  motivation: string;
  thumbnail?: string;
}

export const sampleProjects: Project[] = [
  {
    id: "1",
    title: "Nostr Chat Client",
    description: "A real-time encrypted messaging app built on Nostr relays with NIP-04 DMs.",
    type: "individual",
    tech: ["React", "Nostr", "TypeScript"],
    demoUrl: "https://nostrchat.io",
    motivation:
      "Wanted to explore how Nostr handles encrypted DMs and build a clean, fast UI for private messaging without depending on centralized servers.",
  },
  {
    id: "2",
    title: "AI Image Classifier",
    description: "Fine-tuned a vision model to classify street art styles across 12 categories.",
    type: "individual",
    tech: ["Python", "PyTorch", "HuggingFace"],
    demoUrl: "https://huggingface.co/spaces",
    motivation:
      "Exploring how transfer learning can be applied to niche visual domains where training data is scarce.",
  },
  {
    id: "3",
    title: "DAO Voting Dashboard",
    description: "A governance tool for DAOs to propose, discuss, and vote on changes transparently.",
    type: "group",
    tech: ["Next.js", "Solidity", "The Graph"],
    demoUrl: "https://snapshot.org",
    motivation:
      "Our team wanted to make DAO governance more accessible to non-technical members with a clear UI.",
  },
  {
    id: "4",
    title: "Lightning Tip Jar",
    description: "Embeddable widget that lets creators receive Bitcoin tips via Lightning Network.",
    type: "individual",
    tech: ["Svelte", "LND", "WebSockets"],
    demoUrl: "https://getalby.com",
    motivation:
      "Built this to give content creators a simple, no-signup way to receive micropayments.",
  },
  {
    id: "5",
    title: "Collaborative Whiteboard",
    description: "Real-time multiplayer canvas with drawing tools, built for remote brainstorming.",
    type: "group",
    tech: ["React", "Canvas API", "WebRTC"],
    demoUrl: "https://excalidraw.com",
    motivation:
      "Remote collaboration tools felt clunky. We wanted something lightweight that just works in the browser.",
  },
  {
    id: "6",
    title: "Nostr Relay Monitor",
    description: "Dashboard tracking relay uptime, latency, and event throughput across the network.",
    type: "individual",
    tech: ["Astro", "D3.js", "Nostr"],
    demoUrl: "https://nostr.watch",
    motivation:
      "Relay operators need visibility into performance. Built this to help the ecosystem grow.",
  },
  {
    id: "7",
    title: "Gen AI Podcast Summarizer",
    description: "Upload a podcast episode and get a structured summary with key takeaways.",
    type: "group",
    tech: ["Python", "Whisper", "Claude API"],
    demoUrl: "https://notebooklm.google.com",
    motivation:
      "Podcasts have great content but take too long to consume. AI summarization makes them scannable.",
  },
  {
    id: "8",
    title: "Personal Knowledge Graph",
    description: "A note-taking app that auto-links concepts and visualizes your knowledge as a graph.",
    type: "individual",
    tech: ["TypeScript", "Neo4j", "Force Graph"],
    demoUrl: "https://obsidian.md",
    motivation:
      "Flat notes don't capture how ideas connect. Wanted to build something that mirrors how I actually think.",
  },
];
