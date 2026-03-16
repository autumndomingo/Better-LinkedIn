/**
 * Script to:
 * 1. Generate a new Nostr keypair
 * 2. Publish a profile (kind 0) for "Jimmy from Oklahoma"
 * 3. Publish sample projects as kind 30023 (long-form content) events
 */

import { generateSecretKey, getPublicKey, finalizeEvent } from "nostr-tools/pure";
import { nip19 } from "nostr-tools";
import { Relay } from "nostr-tools/relay";
import { bytesToHex } from "@noble/hashes/utils";

const RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
];

// Goat in cowboy hat picture (publicly accessible)
const PROFILE_PICTURE =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Hausziege_04.jpg/440px-Hausziege_04.jpg";

const projects = [
  {
    id: "nostr-chat-client",
    title: "Nostr Chat Client",
    description:
      "A real-time encrypted messaging app built on Nostr relays with NIP-04 DMs.",
    type: "individual",
    tech: ["React", "Nostr", "TypeScript"],
    demoUrl: "https://nostrchat.io",
    motivation:
      "Wanted to explore how Nostr handles encrypted DMs and build a clean, fast UI for private messaging without depending on centralized servers.",
  },
  {
    id: "ai-image-classifier",
    title: "AI Image Classifier",
    description:
      "Fine-tuned a vision model to classify street art styles across 12 categories.",
    type: "individual",
    tech: ["Python", "PyTorch", "HuggingFace"],
    demoUrl: "https://huggingface.co/spaces",
    motivation:
      "Exploring how transfer learning can be applied to niche visual domains where training data is scarce.",
  },
  {
    id: "dao-voting-dashboard",
    title: "DAO Voting Dashboard",
    description:
      "A governance tool for DAOs to propose, discuss, and vote on changes transparently.",
    type: "group",
    tech: ["Next.js", "Solidity", "The Graph"],
    demoUrl: "https://snapshot.org",
    motivation:
      "Our team wanted to make DAO governance more accessible to non-technical members with a clear UI.",
  },
  {
    id: "lightning-tip-jar",
    title: "Lightning Tip Jar",
    description:
      "Embeddable widget that lets creators receive Bitcoin tips via Lightning Network.",
    type: "individual",
    tech: ["Svelte", "LND", "WebSockets"],
    demoUrl: "https://getalby.com",
    motivation:
      "Built this to give content creators a simple, no-signup way to receive micropayments.",
  },
  {
    id: "collaborative-whiteboard",
    title: "Collaborative Whiteboard",
    description:
      "Real-time multiplayer canvas with drawing tools, built for remote brainstorming.",
    type: "group",
    tech: ["React", "Canvas API", "WebRTC"],
    demoUrl: "https://excalidraw.com",
    motivation:
      "Remote collaboration tools felt clunky. We wanted something lightweight that just works in the browser.",
  },
  {
    id: "nostr-relay-monitor",
    title: "Nostr Relay Monitor",
    description:
      "Dashboard tracking relay uptime, latency, and event throughput across the network.",
    type: "individual",
    tech: ["Astro", "D3.js", "Nostr"],
    demoUrl: "https://nostr.watch",
    motivation:
      "Relay operators need visibility into performance. Built this to help the ecosystem grow.",
  },
  {
    id: "gen-ai-podcast-summarizer",
    title: "Gen AI Podcast Summarizer",
    description:
      "Upload a podcast episode and get a structured summary with key takeaways.",
    type: "group",
    tech: ["Python", "Whisper", "Claude API"],
    demoUrl: "https://notebooklm.google.com",
    motivation:
      "Podcasts have great content but take too long to consume. AI summarization makes them scannable.",
  },
  {
    id: "personal-knowledge-graph",
    title: "Personal Knowledge Graph",
    description:
      "A note-taking app that auto-links concepts and visualizes your knowledge as a graph.",
    type: "individual",
    tech: ["TypeScript", "Neo4j", "Force Graph"],
    demoUrl: "https://obsidian.md",
    motivation:
      "Flat notes don't capture how ideas connect. Wanted to build something that mirrors how I actually think.",
  },
];

async function publishToRelay(relay: InstanceType<typeof Relay>, event: ReturnType<typeof finalizeEvent>) {
  try {
    await relay.publish(event);
    console.log(`  Published to ${relay.url}`);
  } catch (err) {
    console.error(`  Failed on ${relay.url}:`, err);
  }
}

async function main() {
  // 1. Generate keypair
  const sk = generateSecretKey();
  const pk = getPublicKey(sk);
  const npub = nip19.npubEncode(pk);
  const nsec = nip19.nsecEncode(sk);

  console.log("=== New Nostr Identity ===");
  console.log("npub:", npub);
  console.log("nsec:", nsec);
  console.log("hex pubkey:", pk);
  console.log("");

  // 2. Connect to relays
  const relays: InstanceType<typeof Relay>[] = [];
  for (const url of RELAYS) {
    try {
      const r = await Relay.connect(url);
      relays.push(r);
      console.log(`Connected to ${url}`);
    } catch (err) {
      console.error(`Failed to connect to ${url}:`, err);
    }
  }

  if (relays.length === 0) {
    console.error("No relays connected, exiting.");
    process.exit(1);
  }

  // 3. Publish profile (kind 0)
  console.log("\nPublishing profile...");
  const profileEvent = finalizeEvent(
    {
      kind: 0,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: JSON.stringify({
        name: "Jimmy from Oklahoma",
        display_name: "Jimmy from Oklahoma",
        about:
          "Builder, tinkerer, and proud Oklahoman. I make things with code and AI. My goat wears a cowboy hat.",
        picture: PROFILE_PICTURE,
        nip05: "jimmy@oklahoma.dev",
        website: "https://oklahoma.dev",
      }),
    },
    sk
  );

  for (const r of relays) {
    await publishToRelay(r, profileEvent);
  }

  // 4. Publish projects as kind 30023 (long-form content / NIP-23)
  console.log("\nPublishing projects...");
  for (const project of projects) {
    const tags: string[][] = [
      ["d", project.id],
      ["title", project.title],
      ["summary", project.description],
      ["t", project.type], // individual or group
      ["demo_url", project.demoUrl],
    ];

    // Add tech tags
    for (const t of project.tech) {
      tags.push(["tech", t]);
    }

    const event = finalizeEvent(
      {
        kind: 30023,
        created_at: Math.floor(Date.now() / 1000),
        tags,
        content: JSON.stringify({
          title: project.title,
          description: project.description,
          type: project.type,
          tech: project.tech,
          demoUrl: project.demoUrl,
          motivation: project.motivation,
        }),
      },
      sk
    );

    console.log(`\n  ${project.title}`);
    for (const r of relays) {
      await publishToRelay(r, event);
    }
  }

  // 5. Close relays
  for (const r of relays) {
    r.close();
  }

  console.log("\n=== Done! ===");
  console.log("Update your src/nostr.ts NPUB to:");
  console.log(`export const NPUB = "${npub}";`);
}

main().catch(console.error);
