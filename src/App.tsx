import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { generateClient } from "aws-amplify/data";
import { fetchAuthSession } from "aws-amplify/auth";
import { useAuthenticator } from "@aws-amplify/ui-react";
import type { Schema } from "../amplify/data/resource";
import "./App.css";

const client = generateClient<Schema>();
type Complaint = Schema["Complaint"]["type"];

const STATUSES = ["Pending", "In Progress", "Resolved"];
const CATEGORIES = [
  "Electrical",
  "Furniture",
  "Plumbing",
  "Classroom Equipment",
  "Cleanliness",
  "Other",
];

function useComplaints() {
  const [items, setItems] = useState<Complaint[]>([]);
  useEffect(() => {
    const sub = client.models.Complaint.observeQuery().subscribe({
      next: (data) => setItems([...data.items]),
    });
    return () => sub.unsubscribe();
  }, []);
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function Badge({ status }: { status: string | null }) {
  const s = status ?? "Pending";
  return (
    <span className={"badge " + s.replace(" ", "-").toLowerCase()}>{s}</span>
  );
}

function StudentDashboard() {
  const complaints = useComplaints();
  return (
    <section>
      <h2>My Complaints</h2>
      {complaints.length === 0 && <p className="muted">No complaints yet.</p>}
      {complaints.map((c) => (
        <div className="card" key={c.id}>
          <div className="row">
            <strong>{c.title}</strong>
            <Badge status={c.status} />
          </div>
          <div className="muted">
            {c.category} · {c.location}
          </div>
          <p>{c.description}</p>
        </div>
      ))}
    </section>
  );
}

function SubmitComplaint({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [loc, setLoc] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { errors } = await client.models.Complaint.create({
      title,
      category,
      location: loc,
      description,
      status: "Pending",
    });
    setBusy(false);
    if (errors) {
      setError(errors[0].message);
      return;
    }
    onDone();
  }

  return (
    <section>
      <h2>Submit a Complaint</h2>
      <form onSubmit={submit} className="form">
        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        <label>Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <label>Location</label>
        <input
          value={loc}
          onChange={(e) => setLoc(e.target.value)}
          placeholder="e.g. Room L302"
          required
        />
        <label>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          required
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? "Submitting..." : "Submit"}
        </button>
      </form>
    </section>
  );
}

function AdminDashboard() {
  const complaints = useComplaints();
  const [filter, setFilter] = useState("All");
  const shown =
    filter === "All" ? complaints : complaints.filter((c) => c.status === filter);

  async function setStatus(id: string, status: string) {
    const { errors } = await client.models.Complaint.update({ id, status });
    if (errors) alert(errors[0].message);
  }

  return (
    <section>
      <div className="row">
        <h2>All Complaints (Admin)</h2>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option>All</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      {shown.length === 0 && <p className="muted">No complaints.</p>}
      {shown.map((c) => (
        <div className="card" key={c.id}>
          <div className="row">
            <strong>{c.title}</strong>
            <select
              value={c.status ?? "Pending"}
              onChange={(e) => setStatus(c.id, e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="muted">
            {c.category} · {c.location}
          </div>
          <p>{c.description}</p>
        </div>
      ))}
    </section>
  );
}

export default function App() {
  const { signOut, user } = useAuthenticator((ctx) => [ctx.user]);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [screen, setScreen] = useState("dashboard");

  useEffect(() => {
    fetchAuthSession().then((s) => {
      const groups =
        (s.tokens?.accessToken.payload["cognito:groups"] as string[] | undefined) ?? [];
      setIsAdmin(groups.includes("Admins"));
    });
  }, []);

  if (isAdmin === null) return <p className="muted">Loading...</p>;

  return (
    <div className="app">
      <header className="row">
        <h1>CampusCare</h1>
        <div className="row">
          <span className="muted">
            {user?.signInDetails?.loginId} · {isAdmin ? "Admin" : "Student"}
          </span>
          <button onClick={signOut}>Sign out</button>
        </div>
      </header>

      {isAdmin ? (
        <AdminDashboard />
      ) : (
        <>
          <nav>
            <button
              className={screen === "dashboard" ? "active" : ""}
              onClick={() => setScreen("dashboard")}
            >
              Student Dashboard
            </button>
            <button
              className={screen === "submit" ? "active" : ""}
              onClick={() => setScreen("submit")}
            >
              Submit Complaint
            </button>
          </nav>
          {screen === "dashboard" ? (
            <StudentDashboard />
          ) : (
            <SubmitComplaint onDone={() => setScreen("dashboard")} />
          )}
        </>
      )}
    </div>
  );
}