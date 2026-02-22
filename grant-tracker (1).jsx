import { useState, useEffect } from "react";

const SAMPLE_GRANTS = [
  {
    id: "1",
    title: "NIH Research Project Grant (R01)",
    agency: "National Institutes of Health",
    oppNumber: "PA-23-079",
    amount: "$500,000",
    deadline: "2026-04-05",
    renewalDate: "2026-10-05",
    status: "active",
    category: "Research",
    notes: "Standard NIH R01 mechanism. Submit via grants.gov.",
    url: "https://grants.gov",
  },
  {
    id: "2",
    title: "NSF CAREER Award",
    agency: "National Science Foundation",
    oppNumber: "NSF 23-525",
    amount: "$400,000",
    deadline: "2026-07-21",
    renewalDate: "",
    status: "pending",
    category: "Career Development",
    notes: "Five-year award for early-career faculty.",
    url: "https://grants.gov",
  },
];

const STATUS_CONFIG = {
  active: { label: "Active", color: "#22c55e" },
  pending: { label: "Pending", color: "#f59e0b" },
  submitted: { label: "Submitted", color: "#3b82f6" },
  awarded: { label: "Awarded", color: "#8b5cf6" },
  denied: { label: "Denied", color: "#ef4444" },
  expired: { label: "Expired", color: "#6b7280" },
};

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function urgencyColor(days) {
  if (days === null) return "#6b7280";
  if (days < 0) return "#6b7280";
  if (days <= 14) return "#ef4444";
  if (days <= 30) return "#f97316";
  if (days <= 60) return "#f59e0b";
  return "#22c55e";
}

function formatDate(str) {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric"
  });
}

const emptyGrant = {
  title: "", agency: "", oppNumber: "", amount: "",
  deadline: "", renewalDate: "", status: "pending",
  category: "", notes: "", url: "",
};

// Toast Notification Component
function Toast({ notifications, onDismiss }) {
  return (
    <div style={{
      position: "fixed", top: 20, right: 20, zIndex: 999,
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      {notifications.map(n => (
        <div key={n.id} style={{
          background: n.type === "awarded" ? "#1a1040" : "#1a0a0a",
          border: `1px solid ${n.type === "awarded" ? "#8b5cf6" : "#ef4444"}`,
          borderLeft: `4px solid ${n.type === "awarded" ? "#8b5cf6" : "#ef4444"}`,
          borderRadius: 10, padding: "14px 18px", minWidth: 300, maxWidth: 380,
          display: "flex", alignItems: "flex-start", gap: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          animation: "slideInRight 0.3s ease",
        }}>
          <span style={{ fontSize: 22, lineHeight: 1 }}>
            {n.type === "awarded" ? "🎉" : "❌"}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 13, fontWeight: 600,
              color: n.type === "awarded" ? "#c4b5fd" : "#fca5a5",
              marginBottom: 3,
            }}>
              {n.type === "awarded" ? "Grant Awarded!" : "Grant Denied"}
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.4 }}>
              <span style={{ color: "#e2e8f0" }}>{n.title}</span>
              {n.agency && <span> · {n.agency}</span>}
            </div>
          </div>
          <button
            onClick={() => onDismiss(n.id)}
            style={{
              background: "transparent", border: "none", color: "#475569",
              cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0, marginTop: 1,
            }}
          >×</button>
        </div>
      ))}
    </div>
  );
}

export default function GrantTracker() {
  const [grants, setGrants] = useState([]);
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("deadline");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editGrant, setEditGrant] = useState(null);
  const [form, setForm] = useState(emptyGrant);
  const [loaded, setLoaded] = useState(false);
  const [activeGrant, setActiveGrant] = useState(null);
  const [saveStatus, setSaveStatus] = useState("");
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await window.storage.get("grants_data");
        if (res && res.value) {
          setGrants(JSON.parse(res.value));
        } else {
          setGrants(SAMPLE_GRANTS);
        }
      } catch {
        setGrants(SAMPLE_GRANTS);
      }
      setLoaded(true);
    }
    load();
  }, []);

  function addNotification(type, title, agency) {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, type, title, agency }]);
    // Auto-dismiss after 6 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 6000);
  }

  function dismissNotification(id) {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  async function persist(updated) {
    try {
      await window.storage.set("grants_data", JSON.stringify(updated));
      setSaveStatus("Saved");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch {
      setSaveStatus("Save failed");
    }
  }

  function openAdd() {
    setForm(emptyGrant);
    setEditGrant(null);
    setShowForm(true);
  }

  function openEdit(g) {
    setForm({ ...g });
    setEditGrant(g.id);
    setShowForm(true);
    setActiveGrant(null);
  }

  function handleSubmit() {
    if (!form.title || !form.deadline) return;
    let updated;
    if (editGrant) {
      // Check if status changed to awarded or denied
      const prevGrant = grants.find(g => g.id === editGrant);
      if (prevGrant && prevGrant.status !== form.status) {
        if (form.status === "awarded") {
          addNotification("awarded", form.title, form.agency);
        } else if (form.status === "denied") {
          addNotification("denied", form.title, form.agency);
        }
      }
      updated = grants.map(g => g.id === editGrant ? { ...form, id: editGrant } : g);
    } else {
      // New grant added directly as awarded or denied
      if (form.status === "awarded") {
        addNotification("awarded", form.title, form.agency);
      } else if (form.status === "denied") {
        addNotification("denied", form.title, form.agency);
      }
      updated = [...grants, { ...form, id: Date.now().toString() }];
    }
    setGrants(updated);
    persist(updated);
    setShowForm(false);
  }

  function deleteGrant(id) {
    const updated = grants.filter(g => g.id !== id);
    setGrants(updated);
    persist(updated);
    setActiveGrant(null);
  }

  const filtered = grants
    .filter(g => {
      if (filter !== "all" && g.status !== filter) return false;
      if (search && !`${g.title} ${g.agency} ${g.oppNumber}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "deadline") return (a.deadline || "9999") > (b.deadline || "9999") ? 1 : -1;
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "agency") return a.agency.localeCompare(b.agency);
      return 0;
    });

  const urgentCount = grants.filter(g => {
    const d = daysUntil(g.deadline);
    return d !== null && d >= 0 && d <= 30 && g.status !== "expired";
  }).length;

  if (!loaded) return (
    <div style={{ background: "#0f1117", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#94a3b8", fontFamily: "monospace" }}>Loading grants...</div>
    </div>
  );

  return (
    <div style={{
      fontFamily: "'DM Mono', 'Courier New', monospace",
      background: "#0a0c10",
      minHeight: "100vh",
      color: "#e2e8f0",
      padding: "0",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0a0c10; }
        ::-webkit-scrollbar-thumb { background: #2d3748; border-radius: 3px; }
        input, select, textarea { outline: none; }
        .grant-row { transition: background 0.15s; cursor: pointer; }
        .grant-row:hover { background: rgba(255,255,255,0.04) !important; }
        .btn { transition: all 0.15s; cursor: pointer; }
        .btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .pill { display: inline-block; padding: 2px 10px; border-radius: 99px; font-size: 11px; font-weight: 500; }
        .tag-chip { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; background: rgba(255,255,255,0.06); color: #94a3b8; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
        .slide-in { animation: slideIn 0.2s ease; }
      `}</style>

      {/* Toast Notifications */}
      <Toast notifications={notifications} onDismiss={dismissNotification} />

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0f1117 0%, #141925 100%)",
        borderBottom: "1px solid #1e2535",
        padding: "24px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: "-0.5px", color: "#f8fafc" }}>
            GRANT<span style={{ color: "#6366f1" }}>TRACK</span>
          </div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>Deadline & Renewal Manager · grants.gov</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {saveStatus && <span style={{ fontSize: 11, color: "#22c55e" }}>{saveStatus}</span>}
          {urgentCount > 0 && (
            <div style={{ background: "#7f1d1d", color: "#fca5a5", borderRadius: 6, padding: "5px 12px", fontSize: 12 }}>
              ⚠ {urgentCount} deadline{urgentCount > 1 ? "s" : ""} within 30 days
            </div>
          )}
          <button className="btn" onClick={openAdd} style={{
            background: "#6366f1", color: "#fff", border: "none",
            borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600,
            fontFamily: "'Syne', sans-serif",
          }}>+ Add Grant</button>
        </div>
      </div>

      <div style={{ padding: "24px 32px" }}>
        {/* Stats row */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          {[
            { label: "Total", value: grants.length, color: "#6366f1" },
            { label: "Active", value: grants.filter(g => g.status === "active").length, color: "#22c55e" },
            { label: "Submitted", value: grants.filter(g => g.status === "submitted").length, color: "#3b82f6" },
            { label: "Awarded", value: grants.filter(g => g.status === "awarded").length, color: "#8b5cf6" },
            { label: "Denied", value: grants.filter(g => g.status === "denied").length, color: "#ef4444" },
          ].map(s => (
            <div key={s.label} style={{
              background: "#0f1117", border: "1px solid #1e2535",
              borderRadius: 10, padding: "14px 20px", minWidth: 100, textAlign: "center",
              borderTop: `3px solid ${s.color}`,
            }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: s.color, fontFamily: "'Syne',sans-serif" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
          <input
            placeholder="Search grants..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: "#0f1117", border: "1px solid #1e2535", color: "#e2e8f0",
              borderRadius: 8, padding: "8px 14px", fontSize: 13, flex: 1, minWidth: 180,
              fontFamily: "inherit",
            }}
          />
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{
            background: "#0f1117", border: "1px solid #1e2535", color: "#94a3b8",
            borderRadius: 8, padding: "8px 12px", fontSize: 12, fontFamily: "inherit",
          }}>
            <option value="all">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
            background: "#0f1117", border: "1px solid #1e2535", color: "#94a3b8",
            borderRadius: 8, padding: "8px 12px", fontSize: 12, fontFamily: "inherit",
          }}>
            <option value="deadline">Sort: Deadline</option>
            <option value="title">Sort: Title</option>
            <option value="agency">Sort: Agency</option>
          </select>
        </div>

        {/* Grant Table */}
        <div style={{ background: "#0f1117", border: "1px solid #1e2535", borderRadius: 12, overflow: "hidden" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 160px 130px 110px 90px 80px",
            padding: "10px 18px", borderBottom: "1px solid #1e2535",
            fontSize: 10, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase",
          }}>
            <span>Grant / Agency</span>
            <span>Deadline</span>
            <span>Renewal</span>
            <span>Amount</span>
            <span>Status</span>
            <span>Days Left</span>
          </div>

          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "#475569", fontSize: 13 }}>
              No grants found. Add one to get started.
            </div>
          )}

          {filtered.map((g, i) => {
            const days = daysUntil(g.deadline);
            const isActive = activeGrant === g.id;
            return (
              <div key={g.id}>
                <div
                  className="grant-row"
                  onClick={() => setActiveGrant(isActive ? null : g.id)}
                  style={{
                    display: "grid", gridTemplateColumns: "1fr 160px 130px 110px 90px 80px",
                    padding: "14px 18px",
                    borderBottom: "1px solid #1a2030",
                    background: isActive ? "rgba(99,102,241,0.06)" : i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                    borderLeft: isActive ? "3px solid #6366f1" : "3px solid transparent",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, color: "#f1f5f9", fontWeight: 500, marginBottom: 3 }}>{g.title}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{g.agency}
                      {g.oppNumber && <span style={{ marginLeft: 8 }} className="tag-chip">{g.oppNumber}</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#cbd5e1", alignSelf: "center" }}>{formatDate(g.deadline)}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", alignSelf: "center" }}>{formatDate(g.renewalDate)}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", alignSelf: "center" }}>{g.amount || "—"}</div>
                  <div style={{ alignSelf: "center" }}>
                    <span className="pill" style={{
                      background: STATUS_CONFIG[g.status]?.color + "22",
                      color: STATUS_CONFIG[g.status]?.color,
                    }}>{STATUS_CONFIG[g.status]?.label}</span>
                  </div>
                  <div style={{ alignSelf: "center" }}>
                    {days !== null && days >= 0 ? (
                      <span style={{ fontSize: 12, fontWeight: 600, color: urgencyColor(days) }}>
                        {days === 0 ? "TODAY" : `${days}d`}
                      </span>
                    ) : days !== null && days < 0 ? (
                      <span style={{ fontSize: 11, color: "#6b7280" }}>Passed</span>
                    ) : <span style={{ color: "#475569" }}>—</span>}
                  </div>
                </div>

                {isActive && (
                  <div className="slide-in" style={{
                    background: "#0d1118", borderBottom: "1px solid #1e2535",
                    padding: "16px 24px", display: "flex", gap: 24, flexWrap: "wrap",
                  }}>
                    {g.notes && (
                      <div style={{ flex: 2, minWidth: 200 }}>
                        <div style={{ fontSize: 10, color: "#475569", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.1em" }}>Notes</div>
                        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>{g.notes}</div>
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 140 }}>
                      {g.category && <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 10, color: "#475569", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.1em" }}>Category</div>
                        <div style={{ fontSize: 12, color: "#cbd5e1" }}>{g.category}</div>
                      </div>}
                      {g.url && (
                        <a href={g.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#6366f1", textDecoration: "none" }}>
                          → View on grants.gov
                        </a>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <button className="btn" onClick={() => openEdit(g)} style={{
                        background: "transparent", border: "1px solid #2d3748",
                        color: "#94a3b8", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontFamily: "inherit",
                      }}>Edit</button>
                      <button className="btn" onClick={() => deleteGrant(g.id)} style={{
                        background: "transparent", border: "1px solid #7f1d1d",
                        color: "#fca5a5", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontFamily: "inherit",
                      }}>Delete</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: 11, color: "#374151", marginTop: 10, textAlign: "right" }}>
          {filtered.length} of {grants.length} grants · Data saved locally
        </div>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }} onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="slide-in" style={{
            background: "#0f1117", border: "1px solid #2d3748",
            borderRadius: 14, padding: 28, width: "100%", maxWidth: 560,
            maxHeight: "90vh", overflowY: "auto",
          }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 20, color: "#f8fafc" }}>
              {editGrant ? "Edit Grant" : "Add Grant"}
            </div>

            {[
              ["title", "Grant Title *", "text"],
              ["agency", "Agency / Funder", "text"],
              ["oppNumber", "Opportunity Number", "text"],
              ["amount", "Award Amount", "text"],
              ["deadline", "Deadline *", "date"],
              ["renewalDate", "Renewal Date", "date"],
              ["category", "Category", "text"],
              ["url", "Grants.gov URL", "url"],
            ].map(([key, label, type]) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{
                    width: "100%", background: "#0a0c10", border: "1px solid #1e2535",
                    color: "#e2e8f0", borderRadius: 8, padding: "9px 12px", fontSize: 13, fontFamily: "inherit",
                  }}
                />
              </div>
            ))}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={{
                width: "100%", background: "#0a0c10", border: "1px solid #1e2535",
                color: "#e2e8f0", borderRadius: 8, padding: "9px 12px", fontSize: 13, fontFamily: "inherit",
              }}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 11, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
                style={{
                  width: "100%", background: "#0a0c10", border: "1px solid #1e2535",
                  color: "#e2e8f0", borderRadius: 8, padding: "9px 12px", fontSize: 13, fontFamily: "inherit", resize: "vertical",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => setShowForm(false)} style={{
                background: "transparent", border: "1px solid #2d3748",
                color: "#94a3b8", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontFamily: "inherit",
              }}>Cancel</button>
              <button className="btn" onClick={handleSubmit} style={{
                background: "#6366f1", color: "#fff", border: "none",
                borderRadius: 8, padding: "9px 24px", fontSize: 13, fontWeight: 600, fontFamily: "'Syne',sans-serif",
              }}>{editGrant ? "Save Changes" : "Add Grant"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
