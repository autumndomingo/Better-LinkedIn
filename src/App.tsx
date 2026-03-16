import { useEffect, useState, useMemo, useRef } from "react";
import { EventStoreProvider } from "applesauce-react";
import { use$ } from "applesauce-react/hooks";
import type { NostrEvent } from "nostr-tools";
import { eventStore, pubkey, NPUB, pool, connectAndFetch } from "./nostr";
import "./App.css";

// NIP-07 browser extension interface
declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>;
      signEvent(event: object): Promise<NostrEvent>;
      nip04?: {
        encrypt(pubkey: string, plaintext: string): Promise<string>;
        decrypt(pubkey: string, ciphertext: string): Promise<string>;
      };
    };
  }
}

// Parse a kind 30023 event into a Project
interface Project {
  id: string;
  title: string;
  description: string;
  type: "individual" | "group";
  tech: string[];
  demoUrl: string;
  motivation: string;
}

interface ChatMessage {
  id: string;
  content: string;
  timestamp: number;
  fromMe: boolean;
}

function parseProjectEvent(event: NostrEvent): Project {
  try {
    const data = JSON.parse(event.content);
    return {
      id: event.id,
      title: data.title || "Untitled",
      description: data.description || "",
      type: data.type === "group" ? "group" : "individual",
      tech: data.tech || [],
      demoUrl: data.demoUrl || "",
      motivation: data.motivation || "",
    };
  } catch {
    const getTag = (name: string) =>
      event.tags.find((t) => t[0] === name)?.[1] || "";
    const techTags = event.tags
      .filter((t) => t[0] === "tech")
      .map((t) => t[1]);
    return {
      id: event.id,
      title: getTag("title") || "Untitled",
      description: getTag("summary") || event.content,
      type: getTag("t") === "group" ? "group" : "individual",
      tech: techTags,
      demoUrl: getTag("demo_url"),
      motivation: "",
    };
  }
}

function ChatPanel({
  profileName,
  profilePicture,
  onClose,
}: {
  profileName: string;
  profilePicture: string;
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    if (!window.nostr) {
      setStatus("error");
      setErrorMsg("Install a Nostr extension (Alby, nos2x) to send messages.");
      setTimeout(() => setStatus("idle"), 4000);
      return;
    }

    const text = message;
    setMessage("");
    setStatus("sending");

    try {
      const senderPubkey = await window.nostr.getPublicKey();

      let ciphertext: string;
      if (window.nostr.nip04) {
        ciphertext = await window.nostr.nip04.encrypt(pubkey, text);
      } else {
        throw new Error("Your Nostr extension doesn't support encrypted DMs.");
      }

      const template = {
        kind: 4,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["p", pubkey]],
        content: ciphertext,
        pubkey: senderPubkey,
      };

      const signed = await window.nostr.signEvent(template);
      await pool.publish(["wss://relay.damus.io", "wss://nos.lol"], signed);

      setMessages((prev) => [
        ...prev,
        {
          id: signed.id,
          content: text,
          timestamp: Date.now(),
          fromMe: true,
        },
      ]);
      setStatus("idle");
    } catch (err: unknown) {
      setMessage(text);
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Failed to send.");
      setTimeout(() => setStatus("idle"), 4000);
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div className="chat-header-left">
          <img className="chat-avatar" src={profilePicture} alt="" />
          <div>
            <div className="chat-header-name">{profileName}</div>
            <div className="chat-header-status">Active on Nostr</div>
          </div>
        </div>
        <div className="chat-header-actions">
          <button className="chat-header-btn" onClick={onClose}>
            &times;
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <img className="chat-empty-avatar" src={profilePicture} alt="" />
            <div className="chat-empty-name">{profileName}</div>
            <div className="chat-empty-hint">
              Send a private message via Nostr. Messages are encrypted end-to-end.
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-bubble ${msg.fromMe ? "me" : "them"}`}
          >
            <div className="chat-bubble-text">{msg.content}</div>
            <div className="chat-bubble-time">
              {new Date(msg.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {status === "error" && (
        <div className="chat-error">{errorMsg}</div>
      )}

      <div className="chat-input-area">
        <textarea
          ref={inputRef}
          className="chat-input"
          placeholder="Write a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          rows={1}
        />
        <button
          className="chat-send-btn"
          onClick={sendMessage}
          disabled={status === "sending" || !message.trim()}
          title="Send"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function AboutMePanel({
  profile,
  editing: initialEditing,
  onClose,
}: {
  profile: { display_name?: string; name?: string; about?: string; picture?: string; nip05?: string; website?: string };
  editing?: boolean;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(initialEditing || false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [form, setForm] = useState({
    display_name: profile.display_name || profile.name || "",
    about: profile.about || "",
    picture: profile.picture || "",
    nip05: profile.nip05 || "",
    website: profile.website || "",
  });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editing) setEditing(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, editing]);

  const handleSave = async () => {
    if (!window.nostr) {
      setSaveMsg("Install a Nostr extension (Alby, nos2x) to save changes.");
      setTimeout(() => setSaveMsg(""), 4000);
      return;
    }

    setSaving(true);
    try {
      const template = {
        kind: 0,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: JSON.stringify({
          name: form.display_name,
          display_name: form.display_name,
          about: form.about,
          picture: form.picture,
          nip05: form.nip05,
          website: form.website,
        }),
      };

      const signed = await window.nostr.signEvent(template);
      await pool.publish(["wss://relay.damus.io", "wss://nos.lol"], signed);
      eventStore.add(signed);

      setSaveMsg("Profile updated!");
      setEditing(false);
      setTimeout(() => setSaveMsg(""), 3000);
    } catch (err: unknown) {
      setSaveMsg(err instanceof Error ? err.message : "Failed to save.");
      setTimeout(() => setSaveMsg(""), 4000);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="about-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editing ? "Edit Profile" : "About Me"}</h2>
          <div className="about-header-actions">
            {!editing && (
              <button
                className="about-edit-toggle"
                onClick={() => setEditing(true)}
                title="Edit"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
            <button className="modal-close" onClick={onClose}>&times;</button>
          </div>
        </div>

        <div className="about-body">
          {editing ? (
            <>
              <div className="about-form-group">
                <label>Display Name</label>
                <input
                  type="text"
                  value={form.display_name}
                  onChange={(e) => updateField("display_name", e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className="about-form-group">
                <label>Bio</label>
                <textarea
                  value={form.about}
                  onChange={(e) => updateField("about", e.target.value)}
                  placeholder="Tell people about yourself..."
                  rows={4}
                />
              </div>
              <div className="about-form-group">
                <label>Profile Picture URL</label>
                <input
                  type="text"
                  value={form.picture}
                  onChange={(e) => updateField("picture", e.target.value)}
                  placeholder="https://..."
                />
                {form.picture && (
                  <img className="about-picture-preview" src={form.picture} alt="preview" />
                )}
              </div>
              <div className="about-form-group">
                <label>Nostr Address (NIP-05)</label>
                <input
                  type="text"
                  value={form.nip05}
                  onChange={(e) => updateField("nip05", e.target.value)}
                  placeholder="you@domain.com"
                />
              </div>
              <div className="about-form-group">
                <label>Website</label>
                <input
                  type="text"
                  value={form.website}
                  onChange={(e) => updateField("website", e.target.value)}
                  placeholder="https://yoursite.com"
                />
              </div>

              {saveMsg && (
                <div className={`about-save-msg ${saveMsg === "Profile updated!" ? "success" : "error"}`}>
                  {saveMsg}
                </div>
              )}

              <div className="about-form-actions">
                <button className="about-cancel-btn" onClick={() => setEditing(false)}>
                  Cancel
                </button>
                <button className="about-save-btn" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="about-hero">
                <img
                  className="about-avatar"
                  src={profile.picture || `https://robohash.org/${pubkey}`}
                  alt="avatar"
                />
                <h3>{profile.display_name || profile.name || "Anonymous"}</h3>
              </div>
              <div className="about-section">
                <h4>Bio</h4>
                <p>{profile.about || "No bio yet."}</p>
              </div>
              {profile.nip05 && (
                <div className="about-section">
                  <h4>Nostr Address</h4>
                  <p>{profile.nip05}</p>
                </div>
              )}
              {profile.website && (
                <div className="about-section">
                  <h4>Website</h4>
                  <p>{profile.website}</p>
                </div>
              )}
              <div className="about-section">
                <h4>Public Key</h4>
                <p className="about-npub">{NPUB}</p>
              </div>

              {saveMsg && (
                <div className="about-save-msg success">{saveMsg}</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Profile({ onMessageClick, onAboutClick, onEditClick }: { onMessageClick: () => void; onAboutClick: () => void; onEditClick: () => void }) {
  const profile = use$(
    () => eventStore.profile(pubkey),
    [pubkey]
  );

  if (!profile) {
    return (
      <div className="profile">
        <div
          className="profile-avatar"
          style={{ background: "var(--surface-hover)" }}
        />
        <div className="profile-info">
          <div className="profile-name">Loading...</div>
          <div className="profile-npub">{NPUB}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile">
      <button className="profile-edit-btn" title="Edit profile" onClick={onEditClick}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
      <img
        className="profile-avatar"
        src={profile.picture || `https://robohash.org/${pubkey}`}
        alt="avatar"
      />
      <div className="profile-info">
        <div className="profile-name">
          {profile.display_name || profile.name || "Anonymous"}
        </div>
        <div className="profile-npub">{NPUB}</div>
        <div className="profile-about">
          {profile.about || "No bio yet."}
        </div>
        {profile.nip05 && (
          <div className="profile-tags">
            <span className="profile-tag">{profile.nip05}</span>
            {profile.website && (
              <span className="profile-tag">{profile.website}</span>
            )}
          </div>
        )}
        <div className="profile-btn-row">
          <button className="message-btn" onClick={onMessageClick}>
            Message
          </button>
          <button className="about-btn" onClick={onAboutClick}>
            About Me
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  onClick,
}: {
  project: Project;
  onClick: () => void;
}) {
  return (
    <div className="project-card" onClick={onClick}>
      <div className="project-thumb">{project.title.slice(0, 2)}</div>
      <div className="project-body">
        <div className="project-title">{project.title}</div>
        <div className="project-desc">{project.description}</div>
        <div className="project-meta">
          <span className={`project-type-badge ${project.type}`}>
            {project.type}
          </span>
          {project.tech.map((t) => (
            <span key={t} className="project-tech">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProjectModal({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{project.title}</h2>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <div className="modal-section">
            <h3>About</h3>
            <p>{project.description}</p>
          </div>

          {project.motivation && (
            <div className="modal-section">
              <h3>Why I Built This</h3>
              <p>{project.motivation}</p>
            </div>
          )}

          {project.demoUrl && (
            <div className="modal-section">
              <h3>Live Demo</h3>
              <iframe
                className="demo-frame"
                src={project.demoUrl}
                title={`${project.title} demo`}
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          )}

          <div className="modal-section">
            <h3>Tech Stack</h3>
            <div className="project-meta">
              <span className={`project-type-badge ${project.type}`}>
                {project.type}
              </span>
              {project.tech.map((t) => (
                <span key={t} className="project-tech">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [filter, setFilter] = useState<"all" | "individual" | "group">("all");
  const [selected, setSelected] = useState<Project | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [aboutEditing, setAboutEditing] = useState(false);

  useEffect(() => {
    connectAndFetch();
  }, []);

  const profile = use$(
    () => eventStore.profile(pubkey),
    [pubkey]
  );

  const projectEvents = use$(
    () => eventStore.timeline([{ kinds: [30023], authors: [pubkey] }]),
    [pubkey]
  );

  const projects = useMemo(() => {
    if (!projectEvents) return [];
    return projectEvents.map(parseProjectEvent);
  }, [projectEvents]);

  const filtered = useMemo(
    () =>
      filter === "all"
        ? projects
        : projects.filter((p) => p.type === filter),
    [filter, projects]
  );

  const profileName = profile?.display_name || profile?.name || "User";
  const profilePicture = profile?.picture || `https://robohash.org/${pubkey}`;

  return (
    <EventStoreProvider eventStore={eventStore}>
      <Profile
        onMessageClick={() => setChatOpen(true)}
        onAboutClick={() => { setAboutOpen(true); setAboutEditing(false); }}
        onEditClick={() => { setAboutOpen(true); setAboutEditing(true); }}
      />

      <div className="filter-bar">
        <span className="filter-label">Project Type:</span>
        <select
          value={filter}
          onChange={(e) =>
            setFilter(e.target.value as "all" | "individual" | "group")
          }
        >
          <option value="all">All</option>
          <option value="individual">Individual</option>
          <option value="group">Group</option>
        </select>
        <span className="filter-label" style={{ marginLeft: "auto" }}>
          {projects.length} project{projects.length !== 1 ? "s" : ""} loaded from Nostr
        </span>
      </div>

      {projects.length === 0 ? (
        <div className="loading">
          <div className="loading-spinner" />
          <div>Loading projects from Nostr relays...</div>
        </div>
      ) : (
        <div className="projects-grid">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => setSelected(project)}
            />
          ))}
        </div>
      )}

      {selected && (
        <ProjectModal
          project={selected}
          onClose={() => setSelected(null)}
        />
      )}

      {aboutOpen && profile && (
        <AboutMePanel
          profile={profile}
          editing={aboutEditing}
          onClose={() => { setAboutOpen(false); setAboutEditing(false); }}
        />
      )}

      {chatOpen && (
        <ChatPanel
          profileName={profileName}
          profilePicture={profilePicture}
          onClose={() => setChatOpen(false)}
        />
      )}
    </EventStoreProvider>
  );
}

export default App;
