import { useEffect, useState, useMemo } from "react";
import { EventStoreProvider } from "applesauce-react";
import { use$ } from "applesauce-react/hooks";
import { eventStore, pubkey, NPUB, connectAndFetch } from "./nostr";
import { sampleProjects, type Project } from "./sampleProjects";
import "./App.css";

function Profile() {
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

          <div className="modal-section">
            <h3>Why I Built This</h3>
            <p>{project.motivation}</p>
          </div>

          <div className="modal-section">
            <h3>Live Demo</h3>
            <iframe
              className="demo-frame"
              src={project.demoUrl}
              title={`${project.title} demo`}
              sandbox="allow-scripts allow-same-origin"
            />
          </div>

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

  useEffect(() => {
    connectAndFetch();
  }, []);

  const filtered = useMemo(
    () =>
      filter === "all"
        ? sampleProjects
        : sampleProjects.filter((p) => p.type === filter),
    [filter]
  );

  return (
    <EventStoreProvider eventStore={eventStore}>
      <Profile />

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
      </div>

      <div className="projects-grid">
        {filtered.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onClick={() => setSelected(project)}
          />
        ))}
      </div>

      {selected && (
        <ProjectModal
          project={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </EventStoreProvider>
  );
}

export default App;
