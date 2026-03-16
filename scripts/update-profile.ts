/**
 * Re-publish Jimmy's profile with a working avatar URL
 */

import { finalizeEvent } from "nostr-tools/pure";
import { nip19 } from "nostr-tools";
import { Relay } from "nostr-tools/relay";

// Use the nsec from the original publish
const NSEC = "nsec1shs3lpprgyna6uwk2f48n0l6uc72v473l95q2l03jk95la8s3yyqpjl6vs";
const { data: sk } = nip19.decode(NSEC);

const RELAYS = ["wss://relay.damus.io", "wss://nos.lol"];

// robohash generates unique avatars - set3 is robot/monster style, set4 is cats
// Using a fun seed that will generate a consistent avatar
const PROFILE_PICTURE = "https://images.unsplash.com/photo-1535930749574-1399327ce78f?w=400&h=400&fit=crop";

async function main() {
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

  console.log("\nPublishing updated profile...");
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
    sk as Uint8Array
  );

  for (const r of relays) {
    try {
      await r.publish(profileEvent);
      console.log(`  Published to ${r.url}`);
    } catch (err) {
      console.error(`  Failed on ${r.url}:`, err);
    }
  }

  for (const r of relays) r.close();
  console.log("Done!");
}

main().catch(console.error);
