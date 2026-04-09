import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { ref, onValue, update } from "firebase/database";

// ─── Tournament Config ────────────────────────────────────────
const PLAYERS = [
  "Theron Brower", "Nelson Brower", "Chris Bryant", "Damien Bryant", "Roscoe Bryant",
  "William Hamilton", "Clay Willett", "Jeff Coleman", "Carlton Shaw", "Rick Anderson",
  "Bernard Smith", "Kevin Buckner", "Ron Fuller", "Omar Ritter", "Antonio Wilder",
  "James Brunson", "Shon Davis", "Preston Alderman", "Andre Springer", "Marvin Jones",
  "Andre Lipford"
];

const COURSES = [
  "TPC Myrtle Beach",
  "Arrowhead Country Club",
  "Prestwick Country Club",
  "Myrtlewood Pine Hills"
];

const PAR = 72;
const YEAR = "2025";

// ─── Helpers ──────────────────────────────────────────────────
function getFlightLabel(rank, total) {
  const third = Math.ceil(total / 3);
  if (rank <= third) return "A";
  if (rank <= third * 2) return "B";
  return "C";
}

const FLIGHT_COLORS = {
  A: { bg: "#d4af37", text: "#1a1a1a", label: "Top Dogs" },
  B: { bg: "#9ca3af", text: "#1a1a1a", label: "Middle of the Pack" },
  C: { bg: "#cd7f32", text: "#fff",    label: "Hackers Unite" },
};

function scoreColor(score) {
  const rel = score - PAR;
  if (rel < -2) return "#22c55e";
  if (rel < 0)  return "#86efac";
  if (rel === 0) return "#facc15";
  if (rel <= 3) return "#f97316";
  return "#ef4444";
}

function relScore(score) {
  const r = score - PAR;
  if (r === 0) return "E";
  return r > 0 ? `+${r}` : `${r}`;
}

function getRandScore() {
  return Math.floor(Math.random() * 20) + 68;
}

// Build initial player objects from the PLAYERS array
const buildInitialPlayers = () =>
  PLAYERS.map((name, i) => ({
    id: i,
    name,
    scores: [null, null, null, null],
    flight: null,
  }));

// ─── App ──────────────────────────────────────────────────────
export default function App() {
  const [players, setPlayers]           = useState(buildInitialPlayers());
  const [currentRound, setCurrentRound] = useState(1);
  const [activeTab, setActiveTab]       = useState("leaderboard");
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editScores, setEditScores]     = useState(["", "", "", ""]);
  const [flighted, setFlighted]         = useState(false);
  const [showFlightModal, setShowFlightModal] = useState(false);
  const [connected, setConnected]       = useState(null); // null=loading, true, false
  const [saving, setSaving]             = useState(false);
  const [toast, setToast]               = useState(null);
  const [lastUpdated, setLastUpdated]   = useState(null);
  const toastTimer = useRef(null);

  // ── Firebase: listen for real-time updates ──────────────────
  useEffect(() => {
    const tournamentRef = ref(db, `mulligan-men-${YEAR}`);

    const unsubscribe = onValue(
      tournamentRef,
      (snapshot) => {
        setConnected(true);
        const data = snapshot.val();
        if (data && data.players) {
          // Merge Firebase data with our local player list
          // (in case new players were added to PLAYERS array)
          const merged = buildInitialPlayers().map((p) => {
            const remote = data.players[p.id];
            if (!remote) return p;
            return {
              ...p,
              scores: remote.scores ?? [null, null, null, null],
              flight: remote.flight ?? null,
            };
          });
          setPlayers(merged);
          setFlighted(data.flighted ?? false);
          if (data.lastUpdated) setLastUpdated(data.lastUpdated);
        }
      },
      (error) => {
        console.error("Firebase error:", error);
        setConnected(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // ── Show toast helper ───────────────────────────────────────
  function showToast(msg, type = "success") {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }

  // ── Save score to Firebase ──────────────────────────────────
  async function saveScoreToFirebase(playerId, roundIndex, score) {
    setSaving(true);
    try {
      const updates = {};
      // Build the new scores array for this player
      const player = players.find((p) => p.id === playerId);
      const newScores = [...(player.scores ?? [null, null, null, null])];
      newScores[roundIndex] = score;

      updates[`mulligan-men-${YEAR}/players/${playerId}/scores`] = newScores;
      updates[`mulligan-men-${YEAR}/players/${playerId}/name`]   = player.name;
      updates[`mulligan-men-${YEAR}/lastUpdated`] = new Date().toISOString();

      await update(ref(db), updates);
      showToast(`${player.name} — R${roundIndex + 1}: ${score}`);
    } catch (e) {
      console.error(e);
      showToast("Save failed — check connection", "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Save flight assignments to Firebase ────────────────────
  async function saveFlightsToFirebase(updatedPlayers) {
    setSaving(true);
    try {
      const updates = {};
      updatedPlayers.forEach((p) => {
        updates[`mulligan-men-${YEAR}/players/${p.id}/flight`] = p.flight;
      });
      updates[`mulligan-men-${YEAR}/flighted`]     = true;
      updates[`mulligan-men-${YEAR}/lastUpdated`]  = new Date().toISOString();
      await update(ref(db), updates);
      showToast("Flights set! 🎯");
    } catch (e) {
      showToast("Error saving flights", "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Reset flights in Firebase ───────────────────────────────
  async function resetFlightsInFirebase() {
    setSaving(true);
    try {
      const updates = {};
      players.forEach((p) => {
        updates[`mulligan-men-${YEAR}/players/${p.id}/flight`] = null;
      });
      updates[`mulligan-men-${YEAR}/flighted`] = false;
      await update(ref(db), updates);
      showToast("Flights reset");
    } catch (e) {
      showToast("Error resetting flights", "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Load demo data ──────────────────────────────────────────
  async function loadDemoData() {
    setSaving(true);
    try {
      const updates = {};
      buildInitialPlayers().forEach((p) => {
        updates[`mulligan-men-${YEAR}/players/${p.id}/scores`] =
          [getRandScore(), getRandScore(), getRandScore(), null];
        updates[`mulligan-men-${YEAR}/players/${p.id}/name`] = p.name;
        updates[`mulligan-men-${YEAR}/players/${p.id}/flight`] = null;
      });
      updates[`mulligan-men-${YEAR}/flighted`]    = false;
      updates[`mulligan-men-${YEAR}/lastUpdated`] = new Date().toISOString();
      await update(ref(db), updates);
      setCurrentRound(4);
      showToast("Demo data loaded!");
    } catch (e) {
      showToast("Error loading demo", "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Edit score handlers ─────────────────────────────────────
  function openEdit(player) {
    setEditingPlayer(player.id);
    setEditScores(player.scores.map((s) => (s === null ? "" : String(s))));
  }

  async function saveEdit() {
    const score = editScores[currentRound - 1];
    if (score === "") {
      setEditingPlayer(null);
      return;
    }
    const parsed = parseInt(score);
    if (isNaN(parsed) || parsed < 50 || parsed > 130) {
      showToast("Enter a valid score (50–130)", "error");
      return;
    }
    await saveScoreToFirebase(editingPlayer, currentRound - 1, parsed);
    setEditingPlayer(null);
  }

  // ── Flight logic ────────────────────────────────────────────
  function handleFlight() {
    const sorted = [...standings].filter((p) => p.total !== null);
    const updated = players.map((p) => {
      const rank = sorted.findIndex((s) => s.id === p.id) + 1;
      return rank > 0 ? { ...p, flight: getFlightLabel(rank, sorted.length) } : p;
    });
    setPlayers(updated);
    setFlighted(true);
    setShowFlightModal(false);
    saveFlightsToFirebase(updated);
  }

  // ── Computed standings ──────────────────────────────────────
  const standings = players
    .map((p) => {
      const roundScores = p.scores.filter((s) => s !== null);
      const total  = roundScores.reduce((a, b) => a + b, 0);
      const rounds = roundScores.length;
      return { ...p, total: rounds > 0 ? total : null, rounds };
    })
    .sort((a, b) => {
      if (a.total === null && b.total === null) return 0;
      if (a.total === null) return 1;
      if (b.total === null) return -1;
      return a.total - b.total;
    });

  const roundsWithScores = [0, 1, 2, 3].filter((r) =>
    players.some((p) => p.scores[r] !== null)
  );
  const completedRounds = roundsWithScores.length;
  const canFlight = completedRounds >= 3;

  const flightGroups = flighted
    ? ["A", "B", "C"].map((f) => ({
        flight: f,
        players: standings.filter((p) => p.flight === f),
      }))
    : [];

  // ── Connection status label ─────────────────────────────────
  const connLabel =
    connected === null ? "⏳ Connecting..." :
    connected          ? "🟢 Live"          :
                         "🔴 Offline";

  // ─── Render ────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0d1f0e 0%, #1a3a1c 40%, #0f2d10 100%)",
      fontFamily: "'Playfair Display', Georgia, serif",
      color: "#f5f0e8",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Lato:wght@300;400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #d4af37; border-radius: 2px; }
        .row-hover:hover { background: rgba(212,175,55,0.08) !important; }
        .btn { cursor: pointer; transition: all 0.18s; border: none; }
        .btn:hover { transform: translateY(-1px); filter: brightness(1.1); }
        .btn:active { transform: translateY(0); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        input[type=number] { -moz-appearance: textfield; }
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button { -webkit-appearance: none; }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeOut { from { opacity:1; } to { opacity:0; } }
        .toast { animation: fadeIn 0.25s ease forwards; }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        .saving { animation: pulse 1s infinite; }
      `}</style>

      {/* ── Toast ── */}
      {toast && (
        <div className="toast" style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
          background: toast.type === "error" ? "#7f1d1d" : "#14532d",
          border: `1px solid ${toast.type === "error" ? "#ef4444" : "#22c55e"}`,
          color: "#f5f0e8", padding: "10px 20px", borderRadius: 8, zIndex: 999,
          fontFamily: "'Lato', sans-serif", fontSize: 12, fontWeight: 700,
          whiteSpace: "nowrap", letterSpacing: "0.05em",
        }}>
          {toast.type === "error" ? "⚠️ " : "✓ "}{toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div style={{
        background: "linear-gradient(135deg, #0a1a0b 0%, #1c3d1e 100%)",
        borderBottom: "2px solid #d4af37",
        padding: "0 16px",
      }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "18px 0 0" }}>

          {/* Connection + saving status */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
            <span style={{
              fontFamily: "'Lato', sans-serif", fontSize: 9, letterSpacing: "0.1em",
              color: connected ? "#22c55e" : "#9ca3af",
            }}>
              {saving ? <span className="saving">💾 Saving...</span> : connLabel}
            </span>
          </div>

          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 34, marginBottom: 3 }}>⛳</div>
            <div style={{
              fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 900,
              color: "#d4af37", letterSpacing: "0.04em", lineHeight: 1.1,
            }}>
              MULLIGAN MEN
            </div>
            <div style={{
              fontFamily: "'Lato', sans-serif", fontSize: 11, letterSpacing: "0.28em",
              color: "#9ca3af", marginTop: 3, textTransform: "uppercase",
            }}>
              Myrtle Beach · June {YEAR} · 21 Players
            </div>
            {lastUpdated && (
              <div style={{
                fontFamily: "'Lato', sans-serif", fontSize: 9, color: "#4b5563", marginTop: 4,
              }}>
                Last updated: {new Date(lastUpdated).toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Round selector */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {COURSES.map((course, i) => {
              const hasScores = players.some((p) => p.scores[i] !== null);
              return (
                <div key={i} onClick={() => setCurrentRound(i + 1)} style={{
                  flex: 1, padding: "6px 4px", borderRadius: 6, textAlign: "center", cursor: "pointer",
                  background: currentRound === i + 1 ? "rgba(212,175,55,0.2)" : "rgba(255,255,255,0.04)",
                  border: currentRound === i + 1 ? "1px solid #d4af37" : "1px solid rgba(255,255,255,0.09)",
                  transition: "all 0.18s",
                }}>
                  <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 8, color: "#6b7280", letterSpacing: "0.15em" }}>
                    RND {i + 1}
                  </div>
                  <div style={{
                    fontSize: 13, marginTop: 1,
                    color: currentRound === i + 1 ? "#d4af37" : hasScores ? "#f5f0e8" : "#4b5563",
                  }}>
                    {hasScores ? "✓" : i + 1}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 2 }}>
            {[
              { id: "leaderboard", label: "🏆 Board" },
              { id: "scores",      label: "✏️ Scores" },
              { id: "flights",     label: "🎯 Flights" },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                flex: 1, padding: "10px 4px",
                background: activeTab === tab.id ? "#d4af37" : "transparent",
                color: activeTab === tab.id ? "#0a1a0b" : "#9ca3af",
                border: "none",
                borderBottom: activeTab === tab.id ? "none" : "1px solid rgba(255,255,255,0.08)",
                fontFamily: "'Lato', sans-serif", fontSize: 10, fontWeight: 700,
                letterSpacing: "0.12em", textTransform: "uppercase",
                cursor: "pointer", borderRadius: "6px 6px 0 0", transition: "all 0.18s",
              }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px" }}>

        {/* ══ LEADERBOARD TAB ══ */}
        {activeTab === "leaderboard" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 10, color: "#6b7280", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                {completedRounds > 0
                  ? `After ${completedRounds} Round${completedRounds > 1 ? "s" : ""}`
                  : "No scores yet"}
              </div>
              <button className="btn" onClick={loadDemoData} disabled={saving} style={{
                background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.35)",
                color: "#d4af37", padding: "5px 12px", borderRadius: 4,
                fontFamily: "'Lato', sans-serif", fontSize: 9, letterSpacing: "0.1em",
              }}>
                LOAD DEMO
              </button>
            </div>

            {/* Column headers */}
            <div style={{
              display: "grid", gridTemplateColumns: "26px 1fr 30px 30px 30px 30px 50px 34px",
              padding: "6px 10px", fontFamily: "'Lato', sans-serif", fontSize: 8,
              letterSpacing: "0.15em", color: "#4b5563", textTransform: "uppercase",
              borderBottom: "1px solid rgba(212,175,55,0.2)",
            }}>
              <div>#</div><div>Player</div>
              <div style={{textAlign:"center"}}>R1</div>
              <div style={{textAlign:"center"}}>R2</div>
              <div style={{textAlign:"center"}}>R3</div>
              <div style={{textAlign:"center"}}>R4</div>
              <div style={{textAlign:"center"}}>Total</div>
              <div style={{textAlign:"center"}}>Flt</div>
            </div>

            {standings.map((player, idx) => {
              const rank   = idx + 1;
              const isTop3 = rank <= 3 && player.total !== null;
              const medals = ["🥇","🥈","🥉"];
              const borderColor = rank === 1 ? "#d4af37" : rank === 2 ? "#9ca3af" : "#cd7f32";
              return (
                <div key={player.id} className="row-hover" style={{
                  display: "grid", gridTemplateColumns: "26px 1fr 30px 30px 30px 30px 50px 34px",
                  padding: "9px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)",
                  alignItems: "center",
                  background: isTop3 ? "rgba(212,175,55,0.04)" : "transparent",
                  borderLeft: isTop3 ? `3px solid ${borderColor}` : "3px solid transparent",
                }}>
                  <div style={{ fontFamily:"'Lato',sans-serif", fontSize:11, color:"#6b7280" }}>
                    {isTop3 ? medals[rank-1] : rank}
                  </div>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:12, fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {player.name}
                  </div>
                  {[0,1,2,3].map((r) => (
                    <div key={r} style={{
                      textAlign:"center", fontFamily:"'Lato',sans-serif", fontSize:11,
                      color: player.scores[r] !== null ? scoreColor(player.scores[r]) : "#374151",
                    }}>
                      {player.scores[r] ?? "—"}
                    </div>
                  ))}
                  <div style={{
                    textAlign:"center", fontFamily:"'Playfair Display',serif",
                    fontSize:13, fontWeight:700,
                    color: player.total !== null ? "#f5f0e8" : "#374151",
                  }}>
                    {player.total ?? "—"}
                  </div>
                  <div style={{ textAlign:"center" }}>
                    {player.flight ? (
                      <span style={{
                        background: FLIGHT_COLORS[player.flight].bg,
                        color: FLIGHT_COLORS[player.flight].text,
                        padding: "2px 7px", borderRadius: 10,
                        fontFamily:"'Lato',sans-serif", fontSize:9, fontWeight:700,
                      }}>
                        {player.flight}
                      </span>
                    ) : <span style={{color:"#374151",fontSize:11}}>—</span>}
                  </div>
                </div>
              );
            })}

            {/* Score key */}
            <div style={{
              marginTop:16, padding:"10px 12px",
              background:"rgba(255,255,255,0.02)", borderRadius:8,
              border:"1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ fontFamily:"'Lato',sans-serif", fontSize:8, letterSpacing:"0.2em", color:"#4b5563", marginBottom:6, textTransform:"uppercase" }}>
                Score Key (par {PAR})
              </div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {[
                  {color:"#22c55e",label:"Eagle+"},
                  {color:"#86efac",label:"Birdie"},
                  {color:"#facc15",label:"Even"},
                  {color:"#f97316",label:"Bogey–3"},
                  {color:"#ef4444",label:"4+"},
                ].map((k)=>(
                  <div key={k.label} style={{display:"flex",alignItems:"center",gap:4}}>
                    <div style={{width:7,height:7,borderRadius:"50%",background:k.color}}/>
                    <span style={{fontFamily:"'Lato',sans-serif",fontSize:9,color:"#6b7280"}}>{k.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ SCORES TAB ══ */}
        {activeTab === "scores" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700,
                color:"#d4af37", marginBottom:2,
              }}>
                Round {currentRound}
              </div>
              <div style={{ fontFamily:"'Lato',sans-serif", fontSize:11, color:"#9ca3af", letterSpacing:"0.08em" }}>
                {COURSES[currentRound - 1]} · Par {PAR}
              </div>
            </div>

            {players.map((player) => (
              <div key={player.id} style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"12px 14px", marginBottom:6,
                background:"rgba(255,255,255,0.03)", borderRadius:8,
                border:"1px solid rgba(255,255,255,0.06)",
              }}>
                <div>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:14, fontWeight:700 }}>
                    {player.name}
                  </div>
                  {player.scores[currentRound - 1] !== null && (
                    <div style={{
                      fontFamily:"'Lato',sans-serif", fontSize:10,
                      color: scoreColor(player.scores[currentRound - 1]), marginTop:2,
                    }}>
                      {relScore(player.scores[currentRound - 1])} ({player.scores[currentRound - 1]})
                    </div>
                  )}
                </div>

                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  {editingPlayer === player.id ? (
                    <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                      <input
                        type="number"
                        value={editScores[currentRound - 1]}
                        onChange={(e) => {
                          const s = [...editScores];
                          s[currentRound - 1] = e.target.value;
                          setEditScores(s);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                        placeholder={PAR.toString()}
                        style={{
                          width:56, padding:"6px 8px",
                          background:"#1a3a1c", border:"1px solid #d4af37",
                          borderRadius:6, color:"#f5f0e8",
                          fontFamily:"'Lato',sans-serif", fontSize:14, textAlign:"center",
                        }}
                        autoFocus
                      />
                      <button className="btn" onClick={saveEdit} disabled={saving} style={{
                        background:"#d4af37", color:"#0a1a0b", padding:"6px 12px",
                        borderRadius:6, fontFamily:"'Lato',sans-serif", fontSize:11, fontWeight:700,
                      }}>
                        SAVE
                      </button>
                      <button className="btn" onClick={() => setEditingPlayer(null)} style={{
                        background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)",
                        color:"#9ca3af", padding:"6px 10px", borderRadius:6,
                        fontFamily:"'Lato',sans-serif", fontSize:11,
                      }}>
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{
                        fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:900,
                        color: player.scores[currentRound - 1] !== null
                          ? scoreColor(player.scores[currentRound - 1])
                          : "#374151",
                        minWidth:36, textAlign:"right",
                      }}>
                        {player.scores[currentRound - 1] ?? "—"}
                      </div>
                      <button className="btn" onClick={() => openEdit(player)} style={{
                        background:"rgba(212,175,55,0.12)", border:"1px solid rgba(212,175,55,0.3)",
                        color:"#d4af37", padding:"5px 10px", borderRadius:6,
                        fontFamily:"'Lato',sans-serif", fontSize:10,
                      }}>
                        {player.scores[currentRound - 1] !== null ? "EDIT" : "+ ADD"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══ FLIGHTS TAB ══ */}
        {activeTab === "flights" && (
          <div>
            {!flighted ? (
              <div style={{ textAlign:"center", padding:"40px 20px" }}>
                <div style={{ fontSize:48, marginBottom:16 }}>🏌️</div>
                <div style={{
                  fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:900,
                  color:"#d4af37", marginBottom:8,
                }}>
                  Flight the Tournament
                </div>
                <div style={{
                  fontFamily:"'Lato',sans-serif", fontSize:13, color:"#9ca3af",
                  marginBottom:24, lineHeight:1.6,
                }}>
                  {canFlight
                    ? "Round 3 is complete! Split the field into 3 flights based on 3-round totals."
                    : `Complete 3 rounds first. Currently ${completedRounds} round${completedRounds !== 1 ? "s" : ""} scored.`}
                </div>
                {canFlight && (
                  <button className="btn" onClick={() => setShowFlightModal(true)} disabled={saving} style={{
                    background:"linear-gradient(135deg,#d4af37,#b8960c)", color:"#0a1a0b",
                    padding:"14px 32px", borderRadius:8,
                    fontFamily:"'Lato',sans-serif", fontSize:13, fontWeight:700, letterSpacing:"0.15em",
                  }}>
                    🎯 SET FLIGHTS NOW
                  </button>
                )}
              </div>
            ) : (
              <div>
                <div style={{
                  fontFamily:"'Lato',sans-serif", fontSize:9, color:"#6b7280",
                  letterSpacing:"0.2em", textTransform:"uppercase",
                  marginBottom:16, textAlign:"center",
                }}>
                  Flights locked after Round 3 · Round 4 underway
                </div>

                {flightGroups.map(({ flight, players: fp }) => (
                  <div key={flight} style={{ marginBottom:20 }}>
                    <div style={{
                      display:"flex", alignItems:"center", gap:10, marginBottom:8,
                      padding:"8px 12px",
                      background:`${FLIGHT_COLORS[flight].bg}18`,
                      borderRadius:8,
                      borderLeft:`4px solid ${FLIGHT_COLORS[flight].bg}`,
                    }}>
                      <span style={{
                        background:FLIGHT_COLORS[flight].bg,
                        color:FLIGHT_COLORS[flight].text,
                        padding:"4px 12px", borderRadius:12,
                        fontFamily:"'Lato',sans-serif", fontSize:10, fontWeight:700, letterSpacing:"0.1em",
                      }}>
                        FLIGHT {flight}
                      </span>
                      <span style={{ fontFamily:"'Lato',sans-serif", fontSize:11, color:"#9ca3af" }}>
                        {FLIGHT_COLORS[flight].label}
                      </span>
                    </div>

                    {/* Flight column headers */}
                    <div style={{
                      display:"grid", gridTemplateColumns:"24px 1fr 30px 30px 30px 30px 50px",
                      padding:"4px 12px", fontFamily:"'Lato',sans-serif",
                      fontSize:8, color:"#4b5563", letterSpacing:"0.12em", textTransform:"uppercase",
                    }}>
                      <div>#</div><div>Player</div>
                      <div style={{textAlign:"center"}}>R1</div>
                      <div style={{textAlign:"center"}}>R2</div>
                      <div style={{textAlign:"center"}}>R3</div>
                      <div style={{textAlign:"center"}}>R4</div>
                      <div style={{textAlign:"center"}}>Total</div>
                    </div>

                    {fp.map((player, i) => (
                      <div key={player.id} style={{
                        display:"grid", gridTemplateColumns:"24px 1fr 30px 30px 30px 30px 50px",
                        padding:"9px 12px", borderBottom:"1px solid rgba(255,255,255,0.04)",
                        alignItems:"center",
                        background: i%2===0 ? "rgba(255,255,255,0.02)" : "transparent",
                        borderRadius:4,
                      }}>
                        <div style={{ fontFamily:"'Lato',sans-serif", fontSize:11, color:"#6b7280" }}>
                          {i+1}
                        </div>
                        <div style={{
                          fontFamily:"'Playfair Display',serif", fontSize:12, fontWeight:700,
                          whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                        }}>
                          {player.name}
                        </div>
                        {[0,1,2,3].map((r)=>(
                          <div key={r} style={{
                            textAlign:"center", fontFamily:"'Lato',sans-serif", fontSize:11,
                            color: player.scores[r] !== null ? scoreColor(player.scores[r]) : "#374151",
                          }}>
                            {player.scores[r] ?? "—"}
                          </div>
                        ))}
                        <div style={{
                          textAlign:"center", fontFamily:"'Playfair Display',serif",
                          fontSize:13, fontWeight:900, color:"#d4af37",
                        }}>
                          {player.total ?? "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

                <button className="btn" onClick={resetFlightsInFirebase} disabled={saving} style={{
                  width:"100%", marginTop:8,
                  background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)",
                  color:"#ef4444", padding:"10px", borderRadius:6,
                  fontFamily:"'Lato',sans-serif", fontSize:11, fontWeight:700, letterSpacing:"0.1em",
                }}>
                  RESET FLIGHTS
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Flight Confirmation Modal ── */}
      {showFlightModal && (
        <div style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.82)",
          display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:20,
        }}>
          <div style={{
            background:"linear-gradient(160deg,#0d1f0e,#1a3a1c)",
            border:"1px solid #d4af37", borderRadius:12,
            padding:28, maxWidth:340, width:"100%", textAlign:"center",
          }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🏌️‍♂️</div>
            <div style={{
              fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:900,
              color:"#d4af37", marginBottom:8,
            }}>
              Set Flights?
            </div>
            <div style={{
              fontFamily:"'Lato',sans-serif", fontSize:12, color:"#9ca3af",
              marginBottom:24, lineHeight:1.6,
            }}>
              This splits 21 players into 3 flights of 7 based on their 3-round totals.
              Flight A = best scores · B = middle · C = bottom third.
              <br/><br/>
              <strong style={{color:"#f97316"}}>This syncs live to all devices.</strong>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button className="btn" onClick={() => setShowFlightModal(false)} style={{
                flex:1, background:"rgba(255,255,255,0.07)",
                border:"1px solid rgba(255,255,255,0.14)", color:"#9ca3af",
                padding:"12px", borderRadius:6,
                fontFamily:"'Lato',sans-serif", fontSize:12, fontWeight:700,
              }}>
                CANCEL
              </button>
              <button className="btn" onClick={handleFlight} disabled={saving} style={{
                flex:1, background:"linear-gradient(135deg,#d4af37,#b8960c)", color:"#0a1a0b",
                padding:"12px", borderRadius:6,
                fontFamily:"'Lato',sans-serif", fontSize:12, fontWeight:700,
              }}>
                CONFIRM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{
        textAlign:"center", padding:"24px 16px",
        fontFamily:"'Lato',sans-serif", fontSize:8,
        color:"#374151", letterSpacing:"0.2em", textTransform:"uppercase",
      }}>
        Mulligan Men · Est. Annual · Myrtle Beach · {YEAR}
      </div>
    </div>
  );
}
