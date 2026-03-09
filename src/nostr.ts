import { EventStore } from "applesauce-core";
import { RelayPool, onlyEvents } from "applesauce-relay";

// Hardcoded npub for demo — replace with your own
// This is Jack Dorsey's npub as a recognizable example
export const NPUB = "npub1zxu639qym0esxnn7rzrt48wycmfhdu3e5yvzwx7ja3t84zyc2r8qz8cx2y";

// Convert npub to hex pubkey
import { nip19 } from "nostr-tools";
const { data: PUBKEY } = nip19.decode(NPUB);

export const pubkey = PUBKEY as string;
export const eventStore = new EventStore();
export const pool = new RelayPool();

const RELAYS = [
  "wss://relay.damus.io",
  "wss://relay.nostr.band",
  "wss://nos.lol",
];

export function connectAndFetch() {
  // Connect to relays
  for (const url of RELAYS) {
    pool.relay(url);
  }

  // Subscribe to profile (kind 0) for our pubkey
  pool
    .subscription(RELAYS, [{ kinds: [0], authors: [pubkey], limit: 1 }])
    .pipe(onlyEvents())
    .subscribe((event) => {
      eventStore.add(event);
    });

  // Subscribe to notes (kind 1) for demo content
  pool
    .subscription(RELAYS, [{ kinds: [1], authors: [pubkey], limit: 20 }])
    .pipe(onlyEvents())
    .subscribe((event) => {
      eventStore.add(event);
    });
}
