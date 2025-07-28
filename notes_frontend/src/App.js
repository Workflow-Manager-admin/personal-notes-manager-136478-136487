import React, { useEffect, useState } from "react";
import "./App.css";

/**
 * A minimal, modern, responsive Notes app in React with full user authentication and notes CRUD.
 * - Header: login/signup or user menu and logout.
 * - Sidebar: search and notes list (click to select).
 * - Main content: note viewer/editor, or prompt when no note selected.
 * - Modal: create/edit note.
 */

/* ========== Utils ========== */
const apiBase = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000"; // Update in production

function getStoredToken() {
  return window.localStorage.getItem("note_token") || "";
}
function setStoredToken(token) {
  if (token) window.localStorage.setItem("note_token", token);
  else window.localStorage.removeItem("note_token");
}

/* ========== API functions ========== */
async function apiRequest(urlPath, opts = {}, token = "") {
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  const resp = await fetch(`${apiBase}${urlPath}`, {
    ...opts,
    headers: { ...headers, ...(opts.headers || {}) },
    credentials: "include" // for cookie auth if any
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.message || resp.statusText);
  return data;
}

// PUBLIC_INTERFACE
async function signup(username, password) {
  // PUBLIC_INTERFACE
  return apiRequest("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
}
// PUBLIC_INTERFACE
async function signin(username, password) {
  // PUBLIC_INTERFACE
  return apiRequest("/auth/signin", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
}
// PUBLIC_INTERFACE
async function signout(token) {
  // PUBLIC_INTERFACE
  return apiRequest("/auth/signout", { method: "POST" }, token);
}
// PUBLIC_INTERFACE
async function fetchNotes(token, search = "") {
  // PUBLIC_INTERFACE
  return apiRequest(
    `/notes?search=${encodeURIComponent(search)}`,
    { method: "GET" },
    token
  );
}
// PUBLIC_INTERFACE
async function getNote(token, id) {
  // PUBLIC_INTERFACE
  return apiRequest(`/notes/${id}`, { method: "GET" }, token);
}
// PUBLIC_INTERFACE
async function createNote(token, payload) {
  // PUBLIC_INTERFACE
  return apiRequest("/notes", {
    method: "POST",
    body: JSON.stringify(payload)
  }, token);
}
// PUBLIC_INTERFACE
async function updateNote(token, id, payload) {
  // PUBLIC_INTERFACE
  return apiRequest(`/notes/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  }, token);
}
// PUBLIC_INTERFACE
async function deleteNote(token, id) {
  // PUBLIC_INTERFACE
  return apiRequest(`/notes/${id}`, { method: "DELETE" }, token);
}

/* ========== Components ========== */

// PUBLIC_INTERFACE
function AuthView({ onAuth, errorMsg, setError }) {
  const [tab, setTab] = useState("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const doSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (tab === "signin") {
        const { token } = await signin(username, password);
        onAuth(token, username);
      } else {
        await signup(username, password);
        setTab("signin");
        setError("Sign up successful! Please sign in.");
      }
    } catch (err) {
      setError((err && err.message) || "Error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="brand-bar">
          <h2 className="accent">📝 Notes</h2>
        </div>
        <div className="tab-row">
          <button className={tab === "signin" ? "active" : ""} onClick={() => { setTab("signin"); setError(""); }}>Sign In</button>
          <button className={tab === "signup" ? "active" : ""} onClick={() => { setTab("signup"); setError(""); }}>Sign Up</button>
        </div>
        <form onSubmit={doSubmit}>
          <input
            className="text-input"
            type="text"
            autoFocus
            placeholder="Username"
            autoComplete="username"
            disabled={submitting}
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />
          <input
            className="text-input"
            type="password"
            placeholder="Password"
            autoComplete={tab === "signup" ? "new-password" : "current-password"}
            disabled={submitting}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button className="btn primary-btn" disabled={submitting}>
            {submitting ? "Please wait..." : tab === "signin" ? "Sign In" : "Sign Up"}
          </button>
        </form>
        {errorMsg && <div className="error-msg">{errorMsg}</div>}
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
function Header({ user, onLogout, onThemeToggle, theme }) {
  return (
    <header className="header">
      <div className="brand">
        <span className="logo">📝</span>
        <span>Notes</span>
      </div>
      <div className="header-actions">
        <button className="theme-toggle-btn" onClick={onThemeToggle} aria-label="Toggle theme">
          {theme === "light" ? "🌙" : "☀️"}
        </button>
        {user ? (
          <div className="user-menu">
            <span className="username">{user}</span>
            <button className="signout-btn" onClick={onLogout}>Sign out</button>
          </div>
        ) : null}
      </div>
    </header>
  );
}

// PUBLIC_INTERFACE
function Sidebar({
  notes, selectedId, onSelect, onCreate, search, setSearch, user
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <button className="btn create-btn" onClick={onCreate}>+ New Note</button>
      </div>
      <div className="sidebar-search">
        <input
          className="text-input search-input"
          type="search"
          placeholder="Search notes"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="notes-list">
        {notes.length === 0 && (
          <div className="empty-notes">No notes found{user ? "." : ""}</div>
        )}
        {notes.map(note => (
          <div
            className={`note-item ${note.id === selectedId ? "selected" : ""}`}
            key={note.id}
            onClick={() => onSelect(note.id)}
            tabIndex={0}
          >
            <strong>{note.title || <em>(Untitled)</em>}</strong>
            <span className="note-date">{new Date(note.updated_at || note.created_at).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

// PUBLIC_INTERFACE
function MainArea({
  note, loading, onEdit, onDelete, errorMsg, user
}) {
  if (!user) return (
    <div className="main-area"><p>Please sign in to begin.</p></div>
  );
  if (loading) return (
    <div className="main-area"><div className="loading">Loading...</div></div>
  );
  if (!note) return (
    <div className="main-area"><p>Select a note to view, or create a new one.</p></div>
  );
  return (
    <div className="main-area">
      <div className="note-view">
        <div className="note-view-header">
          <h2>{note.title}</h2>
          <div>
            <button className="btn" onClick={onEdit}>Edit</button>
            <button className="btn danger" onClick={onDelete}>Delete</button>
          </div>
        </div>
        <pre className="note-body">{note.body}</pre>
      </div>
      {errorMsg && <div className="error-msg">{errorMsg}</div>}
    </div>
  );
}

// PUBLIC_INTERFACE
function NoteModal({
  open, onClose, initial, onSubmit, submitting
}) {
  const [title, setTitle] = useState(initial?.title || "");
  const [body, setBody] = useState(initial?.body || "");

  useEffect(() => {
    if (open) {
      setTitle(initial?.title || "");
      setBody(initial?.body || "");
    }
  }, [open, initial]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" tabIndex={-1}>
      <div className="modal">
        <form
          onSubmit={e => {
            e.preventDefault();
            onSubmit({ title: title.trim(), body: body.trim() });
          }}
        >
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              className="text-input"
              type="text"
              autoFocus
              value={title}
              maxLength={100}
              onChange={e => setTitle(e.target.value)}
              placeholder="Title"
            />
          </div>
          <div className="form-group">
            <label htmlFor="body">Body</label>
            <textarea
              id="body"
              className="text-input"
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={8}
              placeholder="Write your note..."
            />
          </div>
          <div className="modal-actions">
            <button className="btn primary-btn" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </button>
            <button className="btn" type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ========== Main App Component ========== */
// PUBLIC_INTERFACE
function App() {
  // Theme
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Auth
  const [token, setToken] = useState(getStoredToken());
  const [user, setUser] = useState(localStorage.getItem("note_username") || "");
  const [authError, setAuthError] = useState("");

  // Notes
  const [notes, setNotes] = useState([]);
  const [noteMap, setNoteMap] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [noteLoading, setNoteLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Note Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [mainError, setMainError] = useState("");

  // -- AUTH LOGIC --
  useEffect(() => {
    if (!token) {
      setStoredToken("");
      setUser("");
      return;
    }
    setStoredToken(token);
    if (user) localStorage.setItem("note_username", user);
  }, [token, user]);

  // -- FETCH NOTES LIST --
  useEffect(() => {
    if (!token) {
      setNotes([]);
      setNoteMap({});
      return;
    }
    let ignore = false;
    fetchNotes(token, search)
      .then(list => {
        if (!ignore) {
          setNotes(list || []);
          setNoteMap(
            (list || []).reduce((map, n) => {
              map[n.id] = n;
              return map;
            }, {})
          );
        }
      })
      .catch(() => {
        if (!ignore) {
          setNotes([]);
          setNoteMap({});
        }
      });
    return () => {
      ignore = true;
    };
  }, [token, search, refreshTrigger]);

  // -- FETCH SELECTED NOTE CONTENT --
  const [selectedNote, setSelectedNote] = useState(null);
  useEffect(() => {
    if (!token || !selectedId) {
      setSelectedNote(null);
      return;
    }
    setNoteLoading(true);
    getNote(token, selectedId)
      .then(setSelectedNote)
      .catch(() => setSelectedNote(null))
      .finally(() => setNoteLoading(false));
  }, [token, selectedId, refreshTrigger]);

  // -- AUTH HANDLERS --
  const doAuth = (tok, username) => {
    setToken(tok);
    setUser(username);
    setAuthError("");
    setSearch("");
    setSelectedId(null);
    setRefreshTrigger(e => e + 1);
  };

  const doLogout = async () => {
    try {
      await signout(token);
    } catch (_) {/* ignore */}
    setStoredToken("");
    setToken("");
    setUser("");
    setNotes([]);
    setSelectedId(null);
    setSearch("");
    setAuthError("");
  };

  // -- CRUD HANDLERS --
  const openCreate = () => {
    setEditingNote(null);
    setModalOpen(true);
    setMainError("");
  };

  const openEdit = () => {
    setEditingNote(selectedNote);
    setModalOpen(true);
    setMainError("");
  };

  const doDelete = async () => {
    if (!window.confirm("Delete this note?")) return;
    setMainError("");
    try {
      await deleteNote(token, selectedNote.id);
      setSelectedId(null);
      setModalOpen(false);
      setRefreshTrigger(e => e + 1);
    } catch (err) {
      setMainError(err.message || "Failed to delete note.");
    }
  };

  const handleModalSubmit = async (note) => {
    setFormSubmitting(true);
    setMainError("");
    try {
      if (!editingNote) {
        // CREATE
        await createNote(token, note);
      } else {
        // UPDATE
        await updateNote(token, editingNote.id, note);
        setSelectedId(editingNote.id);
      }
      setModalOpen(false);
      setEditingNote(null);
      setRefreshTrigger(e => e + 1);
    } catch (err) {
      setMainError(err.message || "Failed to save note.");
    }
    setFormSubmitting(false);
  };

  if (!token) {
    return (
      <AuthView onAuth={doAuth} errorMsg={authError} setError={setAuthError} />
    );
  }

  return (
    <div className={`App notes-app`}>
      <Header
        user={user}
        onLogout={doLogout}
        onThemeToggle={() => setTheme(theme === "light" ? "dark" : "light")}
        theme={theme}
      />
      <div className="main-layout">
        <Sidebar
          notes={notes}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCreate={openCreate}
          search={search}
          setSearch={setSearch}
          user={user}
        />
        <MainArea
          note={selectedNote}
          loading={noteLoading}
          onEdit={openEdit}
          onDelete={doDelete}
          errorMsg={mainError}
          user={user}
        />
        <NoteModal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setEditingNote(null); }}
          initial={editingNote}
          submitting={formSubmitting}
          onSubmit={handleModalSubmit}
        />
      </div>
    </div>
  );
}

export default App;
