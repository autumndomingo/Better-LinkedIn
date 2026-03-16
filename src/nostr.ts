import { EventStore } from "applesauce-core";
import { RelayPool, onlyEvents } from "applesauce-relay";

// Jimmy from Oklahoma
export const NPUB = "npub1zl22chupgfsusdsjgf4r3szq9a0hc8rjwjfzvd5fvm44sxvsxxmsvlqjzd";

// Convert npub to hex pubkey
import { nip19 } from "nostr-tools";
const { data: PUBKEY } = nip19.decode(NPUB);

export const pubkey = PUBKEY as string;
export const eventStore = new EventStore();
export const pool = new RelayPool();

export const RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
];

/**
 * Check if there's a mutual DM conversation between two pubkeys.
 * Returns true if both parties have sent at least one kind 4 DM to each other.
 */
export async function checkMutualDMs(visitorPubkey: string): Promise<boolean> {
  return new Promise((resolve) => {
    let visitorSent = false;
    let ownerSent = false;
    let completed = 0;

    const checkDone = () => {
      completed++;
      if (completed >= 2) {
        resolve(visitorSent && ownerSent);
      }
    };

    // Check: visitor -> owner (kind 4 from visitor, tagged with owner pubkey)
    const sub1 = pool
      .subscription(RELAYS, [{ kinds: [4], authors: [visitorPubkey], "#p": [pubkey], limit: 1 }])
      .pipe(onlyEvents())
      .subscribe({
        next: () => { visitorSent = true; },
        complete: () => checkDone(),
      });

    // Check: owner -> visitor (kind 4 from owner, tagged with visitor pubkey)
    const sub2 = pool
      .subscription(RELAYS, [{ kinds: [4], authors: [pubkey], "#p": [visitorPubkey], limit: 1 }])
      .pipe(onlyEvents())
      .subscribe({
        next: () => { ownerSent = true; },
        complete: () => checkDone(),
      });

    // Timeout after 5 seconds
    setTimeout(() => {
      sub1.unsubscribe();
      sub2.unsubscribe();
      resolve(visitorSent && ownerSent);
    }, 5000);
  });
}

export function connectAndFetch() {
  for (const url of RELAYS) {
    pool.relay(url);
  }

  pool
    .subscription(RELAYS, [{ kinds: [0], authors: [pubkey], limit: 1 }])
    .pipe(onlyEvents())
    .subscribe((event) => {
      eventStore.add(event);
    });

  // Subscribe to projects (kind 30023 - long-form content) for our pubkey
  pool
    .subscription(RELAYS, [{ kinds: [30023], authors: [pubkey] }])
    .pipe(onlyEvents())
    .subscribe((event) => {
      eventStore.add(event);
    });
}
