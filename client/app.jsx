const { useState, useEffect, useRef } = React;
const { motion, AnimatePresence, Reorder, LayoutGroup } = Motion;
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const CATS = { Work: "#4C7DFF", Home: "#FF9A3C", Study: "#B667F0", Health: "#2BBF8E" };
const PRI = ["Whenever", "Soon", "Important"];
const api = async (path, method = "GET", body) => {
  const r = await fetch("/api" + path, { method, headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined, credentials: "same-origin" });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && !path.startsWith("/auth/")) dispatchEvent(new Event("auth-expired"));
  if (!r.ok) throw new Error(d.error || "Something went wrong. Try again.");
  return d;
};

function sparkle(el, color) {
  if (RM) return;
  for (let i = 0; i < 9; i++) {
    const s = document.createElement("i");
    s.className = "bit";
    s.style.background = [color, "#FFD24C", "#FF7A93"][i % 3];
    el.appendChild(s);
    const a = (i / 9) * Math.PI * 2 + Math.random() * 0.5, d = 22 + Math.random() * 16;
    gsap.fromTo(s, { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }, {
      x: Math.cos(a) * d, y: Math.sin(a) * d, rotate: 180, scale: 0, opacity: 0,
      duration: 0.7, ease: "power2.out", onComplete: () => s.remove(),
    });
  }
}

const WAVE = "M2 10 Q17 0 32 10 T62 10 T92 10 T122 10 T152 10 T182 10 T212 10 T242 10 T272 10 T298 10";
function Progress({ pct, done, total }) {
  const line = useRef(), num = useRef(), cur = useRef({ v: 0 });
  useEffect(() => {
    const d = RM ? 0 : 1;
    gsap.to(line.current, { strokeDashoffset: 1 - pct / 100, duration: d, ease: "power3.out" });
    gsap.to(cur.current, { v: done, duration: d, ease: "power3.out", onUpdate: () => { num.current.textContent = Math.round(cur.current.v); } });
  }, [pct, done]);
  return (
    <div className="prog" role="img" aria-label={done + " of " + total + " done"}>
      <p><b ref={num}>0</b> of {total} done</p>
      <svg viewBox="0 0 300 20" preserveAspectRatio="none">
        <path className="wt" d={WAVE} />
        <path ref={line} className="wl" d={WAVE} pathLength="1" strokeDasharray="1" strokeDashoffset="1" />
      </svg>
    </div>
  );
}

function Box({ done, color, onToggle, label }) {
  const btn = useRef(), path = useRef(), first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    gsap.to(path.current, { strokeDashoffset: done ? 0 : 1, duration: RM ? 0 : 0.4, ease: "power2.out" });
  }, [done]);
  return (
    <button ref={btn} className="box" style={{ "--c": color }} aria-pressed={done} aria-label={label}
      onClick={() => { if (!done) sparkle(btn.current, color); onToggle(); }}>
      <svg viewBox="0 0 24 24"><path ref={path} d="M4 13c2 1.5 3.5 3.5 5 6C11 12 15 7 21 3" pathLength="1" strokeDasharray="1" strokeDashoffset={done ? 0 : 1} /></svg>
    </button>
  );
}

function Item({ t, onToggle, onDelete, onEdit }) {
  const [ed, setEd] = useState(false);
  const [val, setVal] = useState(t.text);
  const save = () => { const v = val.trim(); if (v) onEdit(v); else setVal(t.text); setEd(false); };
  return (
    <Reorder.Item value={t} className={"item" + (t.done ? " done" : "")} layout={!RM}
      initial={{ opacity: 0, x: -14, rotate: -1.5 }} animate={{ opacity: 1, x: 0, rotate: 0 }}
      exit={{ opacity: 0, x: 50, rotate: 3, transition: { duration: 0.22 } }}
      whileDrag={{ scale: 1.03, rotate: 1.2, boxShadow: "0 14px 26px rgba(0,0,0,.22)", zIndex: 5 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}>
      <Box done={t.done} color={CATS[t.cat]} onToggle={onToggle} label={(t.done ? "Mark as not done: " : "Mark as done: ") + t.text} />
      <div className="body">
        {ed ? (
          <input className="edit" autoFocus value={val} onChange={(e) => setVal(e.target.value)} onBlur={save}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setVal(t.text); setEd(false); } }} />
        ) : (
          <span className="txt" title="Double-click to edit" onDoubleClick={() => setEd(true)}>{t.text}{t.pri === 2 && <span className="bang"> !!</span>}</span>
        )}
        <span className="tag" style={{ "--c": CATS[t.cat] }}>{t.cat}</span>
      </div>
      <button className="icon" aria-label={"Edit " + t.text} onClick={() => setEd(true)}>✎</button>
      <button className="icon del" aria-label={"Delete " + t.text} onClick={onDelete}>✕</button>
    </Reorder.Item>
  );
}

function Todos({ user, onLogout }) {
  const [todos, setTodos] = useState([]);
  const [filter, setFilter] = useState("All");
  const [text, setText] = useState("");
  const [cat, setCat] = useState("Work");
  const [pri, setPri] = useState(1);
  const inp = useRef();

  useEffect(() => { api("/todos").then((d) => setTodos(d.todos)).catch(() => { }); }, []);
  useEffect(() => {
    if (RM) return;
    gsap.from(".hero > *", { y: 18, opacity: 0, duration: 0.7, stagger: 0.1, ease: "power3.out" });
    gsap.from(".note", { y: -40, rotate: -6, opacity: 0, duration: 0.8, delay: 0.3, ease: "back.out(1.6)" });
    gsap.from(".page", { y: 50, opacity: 0, duration: 0.8, delay: 0.45, ease: "power3.out" });
  }, []);

  const add = async () => {
    const v = text.trim();
    if (!v) { inp.current.focus(); return; }
    try { const { todo } = await api("/todos", "POST", { text: v, cat, pri }); setTodos((p) => [todo, ...p]); } catch (e) { return; }
    setText(""); if (filter === "Done") setFilter("All");
    inp.current.focus();
  };
  const done = todos.filter((t) => t.done).length;
  const left = todos.length - done;
  const pct = todos.length ? Math.round((done / todos.length) * 100) : 0;
  const shown = todos.filter((t) => filter === "All" || (filter === "Done") === t.done);
  const sync = (p) => p.catch(() => api("/todos").then((d) => setTodos(d.todos)).catch(() => { }));
  const upd = (id, patch) => { setTodos((p) => p.map((t) => (t.id === id ? { ...t, ...patch } : t))); sync(api("/todos/" + id, "PATCH", patch)); };
  const remove = (id) => { setTodos((p) => p.filter((t) => t.id !== id)); sync(api("/todos/" + id, "DELETE")); };
  const clearDone = () => { setTodos((p) => p.filter((t) => !t.done)); sync(api("/todos/completed", "DELETE")); };
  const timer = useRef();
  const reorder = (nv) => {
    const ids = new Set(nv.map((x) => x.id)); let i = 0;
    const merged = todos.map((t) => (ids.has(t.id) ? nv[i++] : t));
    setTodos(merged); clearTimeout(timer.current);
    timer.current = setTimeout(() => sync(api("/todos/reorder", "PUT", { ids: merged.map((t) => t.id) })), 500);
  };
  const h = new Date().getHours();
  const hello = h < 12 ? "Morning," : h < 18 ? "Afternoon," : "Evening,";
  const date = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const sub = todos.length === 0 ? "A blank page. Nice." : left === 0 ? "Everything's crossed off. Take a breather." : left === 1 ? "Just one thing left." : left + " things on the list.";
  const empty = { All: "Nothing written yet. Jot something on the sticky note.", Active: "All done here. Go enjoy your day.", Done: "Nothing crossed off yet. You'll get there." }[filter];

  return (
    <main className="wrap">
      <header className="hero">
        <div>
          <p className="date">{date}</p>
          <h1>{hello} {user.name.split(" ")[0]}.<br />here's your day.</h1>
          <p className="sub">{sub}</p>
          <button className="logout" onClick={onLogout}>Log out</button>
        </div>
      </header>

      <section className="note">
        <span className="tape" />
        <input ref={inp} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="What do you need to do?" aria-label="New task" maxLength={120} />
        <div className="row">
          <div className="chips" role="group" aria-label="Category">
            {Object.keys(CATS).map((c) => (
              <button key={c} className={"chip" + (cat === c ? " on" : "")} style={{ "--c": CATS[c] }} onClick={() => setCat(c)}>{c}</button>
            ))}
          </div>
          <button className="prio" onClick={() => setPri((pri + 1) % 3)} aria-label={"How urgent: " + PRI[pri] + ". Click to change"}>{PRI[pri]}{pri === 2 ? " !!" : ""}</button>
          <motion.button className="go" whileTap={{ scale: 0.94, rotate: -2 }} whileHover={{ rotate: 1.5, y: -2 }} onClick={add}>Stick it on</motion.button>
        </div>
      </section>

      <section className="page">
        <Progress pct={pct} done={done} total={todos.length} />
        <LayoutGroup>
          <nav className="tabs" aria-label="Show tasks">
            {["All", "Active", "Done"].map((f) => (
              <button key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>
                {filter === f && <motion.span layoutId="pill" className="pill" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
                <span>{f}</span>
              </button>
            ))}
          </nav>
          <Reorder.Group axis="y" values={shown} onReorder={reorder} className="items">
            <AnimatePresence initial={false}>
              {shown.map((t) => (
                <Item key={t.id} t={t} onToggle={() => upd(t.id, { done: !t.done })} onEdit={(v) => upd(t.id, { text: v })} onDelete={() => remove(t.id)} />
              ))}
            </AnimatePresence>
          </Reorder.Group>
          <AnimatePresence>
            {shown.length === 0 && <motion.p key="e" className="empty" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{empty}</motion.p>}
          </AnimatePresence>
        </LayoutGroup>
        <footer className="foot">
          <span>Drag to reorder. Double-click to edit.</span>
          <button className="clear" disabled={!done} onClick={clearDone}>Tear out finished</button>
        </footer>
      </section>
    </main>
  );
}


const rr = () => { const r = () => gsap.utils.random(35, 65, 1); return `${r()}% ${r()}% ${r()}% ${r()}% / ${r()}% ${r()}% ${r()}% ${r()}%`; };
function Fluid() {
  useEffect(() => {
    if (RM) return;
    const morph = (el) => gsap.to(el, { borderRadius: rr(), x: gsap.utils.random(-140, 140), y: gsap.utils.random(-110, 110), scale: gsap.utils.random(0.8, 1.25), duration: gsap.utils.random(6, 10), ease: "sine.inOut", onComplete: () => morph(el) });
    gsap.utils.toArray(".fluid i").forEach(morph);
    const move = (e) => gsap.to(".fluid", { x: (e.clientX / innerWidth - 0.5) * -40, y: (e.clientY / innerHeight - 0.5) * -40, duration: 1.4, ease: "power2.out" });
    addEventListener("pointermove", move);
    return () => { removeEventListener("pointermove", move); gsap.killTweensOf(".fluid i"); };
  }, []);
  return <div className="fluid" aria-hidden="true"><i /><i /><i /><i /></div>;
}

function Field({ label, type = "text", value, onChange, auto, extra }) {
  return (
    <label className="fld">
      <input type={type} value={value} onChange={onChange} placeholder=" " autoComplete={auto} required />
      <span>{label}</span>{extra}
    </label>
  );
}

function Auth({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const reg = mode === "register";
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setErr(""); setBusy(true);
    try { const d = await api("/auth/" + mode, "POST", f); onAuth(d.user); } catch (x) { setErr(x.message); setBusy(false); }
  };
  return (
    <div className="authwrap">
      <h1 className="auth-brand">Tickoff: To-Do List</h1>
      <motion.form className="auth" onSubmit={submit} initial={{ opacity: 0, y: 40, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 140, damping: 18 }}>
        <span className="tape" />
        <LayoutGroup id="auth">
          <nav className="tabs" aria-label="Sign in or create account">
            {[["login", "Sign in"], ["register", "Create account"]].map(([m, l]) => (
              <button type="button" key={m} className={mode === m ? "on" : ""} onClick={() => { setMode(m); setErr(""); }}>
                {mode === m && <motion.span layoutId="apill" className="pill" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
                <span>{l}</span>
              </button>
            ))}
          </nav>
        </LayoutGroup>
        <h2>{reg ? "Let's get you started." : "Welcome back."}</h2>
        <p className="lead">{reg ? "Make an account and your tasks follow you everywhere." : "Sign in to pick up where you left off."}</p>
        <AnimatePresence initial={false}>
          {reg && (
            <motion.div key="n" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden", margin: "0 -4px", padding: "0 4px" }}>
              <Field label="Your name" value={f.name} onChange={set("name")} auto="name" />
            </motion.div>
          )}
        </AnimatePresence>
        <Field label="Email" type="email" value={f.email} onChange={set("email")} auto="email" />
        <Field label="Password" type={show ? "text" : "password"} value={f.password} onChange={set("password")} auto={reg ? "new-password" : "current-password"}
          extra={<button type="button" className="eye" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>{show ? "hide" : "show"}</button>} />
        {reg && <p className="hint">At least 8 characters.</p>}
        <AnimatePresence>
          {err && <motion.p key={err} className="err" role="alert" initial={{ opacity: 0, x: 0 }} animate={{ opacity: 1, x: [0, -9, 9, -6, 6, 0] }} exit={{ opacity: 0 }} transition={{ duration: 0.45 }}>{err}</motion.p>}
        </AnimatePresence>
        <motion.button className="go wide" type="submit" disabled={busy} whileTap={{ scale: 0.97 }} whileHover={{ y: -2 }}>{busy ? "One sec..." : reg ? "Create account" : "Sign in"}</motion.button>
      </motion.form>
    </div>
  );
}

function Root() {
  const [user, setUser] = useState(undefined);
  const [dark, setDark] = useState(() => matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; }, [dark]);
  useEffect(() => {
    api("/auth/me").then((d) => setUser(d.user)).catch(() => setUser(null));
    const out = () => setUser(null);
    addEventListener("auth-expired", out);
    return () => removeEventListener("auth-expired", out);
  }, []);
  const logout = async () => { try { await api("/auth/logout", "POST"); } catch (e) { } setUser(null); };
  return (
    <>
      <Fluid />
      <button className="theme" onClick={() => setDark(!dark)} aria-label="Switch between light and dark">{dark ? "\u2600" : "\u263E"}</button>
      {user === undefined ? null : user ? <Todos key={user.id} user={user} onLogout={logout} /> : <Auth onAuth={setUser} />}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
