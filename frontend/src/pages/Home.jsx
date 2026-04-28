import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth, dashboardPath } from "../auth.jsx";

const FEATURES = [
  { icon: "🛡️", title: "Escrow-first payments", desc: "Money sits with us until you confirm delivery. 30% on assign, 70% on completion — no surprises." },
  { icon: "🚪", title: "Admin gateway",          desc: "Clients and Doers never message directly. Every handoff goes through us, end of story." },
  { icon: "🎓", title: "Verified mentors",       desc: "IIT alumni and working professionals. Slot booking, paid sessions, platform-issued meeting links." },
  { icon: "📊", title: "Real-time tracker",      desc: "6-step assignment timeline + progress %. Always know exactly where your work stands." },
  { icon: "🔒", title: "Anonymized listings",    desc: "Doers see jobs, not your identity. Contact-info scanner blocks WhatsApp and Telegram leaks." },
  { icon: "💬", title: "Built-in revisions",     desc: "Not happy? Ask for revision before raising a dispute. Admin routes the change to the doer." },
];

const STEPS_CLIENT = [
  { n: "1", title: "Post your requirement",  desc: "Title, description, deadline, files, max budget. Mark handwritten if you need extra notes." },
  { n: "2", title: "Admin reviews + publishes", desc: "We anonymize your listing and put it in front of vetted doers." },
  { n: "3", title: "Pick a bid · pay 30%",   desc: "Sealed bids. Admin assigns the winner. Pay 30% to start work — held in escrow." },
  { n: "4", title: "Receive · pay rest · done", desc: "Doer delivers files. Admin reviews. You mark complete + pay the remaining 70%." },
];

const REVIEWS = [
  { stars: 5, text: "Got my final-year thesis sorted in 5 days. The escrow split made me trust the process — I only paid the rest after admin verified the files.", name: "Sneha R.", role: "B.Tech CSE" },
  { stars: 5, text: "I'm a doer here — got 12 projects in my first month, all routed cleanly through admin. No client haggling, no off-platform mess.", name: "Aarav D.", role: "Doer · 4.8★" },
  { stars: 5, text: "Booked a JEE counselling session with a verified mentor. The Jitsi link worked, notes were saved automatically. Zero scam vibes.", name: "Riya P.", role: "JEE 2027 aspirant" },
  { stars: 4, text: "The progress tracker is what kept me sane. Saw my doer was 60% done and could plan the rest of my week. Good UI.", name: "Kabir M.", role: "MBA Year 1" },
];

const FAQ = [
  { q: "Why can't I message the doer directly?", a: "Because the moment we let you, you'd both swap WhatsApp numbers and finish the job off-platform — and we wouldn't get paid. Every handoff goes through admin. That's not a bug, it's the entire business model." },
  { q: "Is the 30%/70% split refundable?", a: "Yes. The 30% is held in escrow. If the doer fails to deliver, you raise a dispute and we refund. We never auto-side with the doer." },
  { q: "How are mentors verified?", a: "Invite-only. Admin reviews credentials before activation. Every paid session uses a platform-issued meeting link — mentors can't substitute their own Zoom." },
  { q: "Can I post a handwritten assignment?", a: "Yes — there's a checkbox on the post form. You add an extra notes charge upfront so doers see the real scope before bidding." },
  { q: "What happens if the work isn't good?", a: "You have three escalation levels: ask for revision (light), raise a dispute (heavy), or contest the final 70% payment. Escrow stays paused until admin resolves it." },
];

const STATS = [
  { value: "12,400+", label: "Assignments delivered" },
  { value: "₹4.2 Cr",  label: "Routed through escrow" },
  { value: "98.4%",    label: "Admin SLA on flags" },
  { value: "320+",     label: "Verified mentors" },
];

export default function Home() {
  const { user, loading } = useAuth();
  const [openFaq, setOpenFaq] = useState(0);

  if (loading) return <div className="center">Loading…</div>;
  if (user) return <Navigate to={dashboardPath(user.role)} replace />;

  return (
    <div className="landing">
      {/* HERO */}
      <header className="landing-hero">
        <div className="landing-bg" aria-hidden="true">
          <span className="lblob lblob-a" />
          <span className="lblob lblob-b" />
          <span className="lblob lblob-c" />
        </div>
        <nav className="landing-nav">
          <strong>CampusConnect</strong>
          <div className="landing-nav-links">
            <a href="#how-it-works">How it works</a>
            <a href="#mentors">Mentors</a>
            <a href="#reviews">Reviews</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="landing-nav-cta">
            <Link to="/login" className="link">Sign in</Link>
            <Link to="/register"><button>Get started</button></Link>
          </div>
        </nav>

        <div className="landing-hero-content">
          <span className="landing-badge">A two-channel marketplace · escrow-secured</span>
          <h1 className="landing-h1">
            Get your assignment done.<br />
            <span className="grad-text">Talk to a mentor.</span><br />
            Without ever leaving the platform.
          </h1>
          <p className="landing-sub">
            Post a requirement. We anonymize it, vetted doers bid, you pick one, pay 30% to start
            and the rest on delivery. Or book a verified mentor for a paid 1:1 session. No phone
            numbers exchanged. No off-platform deals. No scams.
          </p>
          <div className="landing-cta-row">
            <Link to="/register"><button className="lg">Start a project →</button></Link>
            <Link to="/login"><button className="outline lg">I already have an account</button></Link>
          </div>
          <div className="landing-trust">
            <span>★★★★★</span> 4.8 average · used by students at IIT Bombay, BITS, NIT Trichy &amp; 200+ campuses
          </div>
        </div>
      </header>

      {/* STATS */}
      <section className="landing-stats">
        {STATS.map((s) => (
          <div key={s.label} className="landing-stat">
            <div className="landing-stat-value">{s.value}</div>
            <div className="landing-stat-label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* FEATURES */}
      <section className="landing-section">
        <div className="landing-section-head">
          <span className="landing-eyebrow">Why CampusConnect</span>
          <h2>Built so the people transacting can't cut us out.</h2>
          <p className="landing-section-sub">Every other student-services site loses money the same way: buyer + seller swap numbers, finish offline. We made that architecturally impossible.</p>
        </div>
        <div className="landing-features">
          {FEATURES.map((f) => (
            <div key={f.title} className="landing-feature">
              <div className="landing-feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="landing-section landing-section-alt">
        <div className="landing-section-head">
          <span className="landing-eyebrow">How it works</span>
          <h2>Four steps. Money safe at every one.</h2>
        </div>
        <div className="landing-steps">
          {STEPS_CLIENT.map((s) => (
            <div key={s.n} className="landing-step">
              <div className="landing-step-num">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* MENTORS TEASER */}
      <section id="mentors" className="landing-section">
        <div className="landing-mentor-card">
          <div>
            <span className="landing-eyebrow">Mentorship portal</span>
            <h2>Pay-per-session with people who've been there.</h2>
            <p className="landing-section-sub">IIT alumni, working engineers, JEE counsellors. Pick a slot, pay, attend a private 1:1 over a platform-issued meeting link. Notes are saved automatically — no transcript scrambling.</p>
            <div style={{ marginTop: 16 }}>
              <Link to="/register"><button>Browse mentors</button></Link>
            </div>
          </div>
          <div className="landing-mentor-mock">
            <div className="landing-mentor-tile">
              <div className="landing-mentor-avatar">RK</div>
              <div>
                <strong>Prof. Rao K.</strong>
                <div className="muted">IIT Bombay · JEE Counsellor</div>
                <div style={{ fontSize: 12 }}>★★★★★ 4.9 · 84 sessions</div>
              </div>
              <div className="landing-mentor-rate">₹1500/hr</div>
            </div>
            <div className="landing-mentor-tile">
              <div className="landing-mentor-avatar" style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)" }}>SM</div>
              <div>
                <strong>Saumya M.</strong>
                <div className="muted">Microsoft · Career mentor</div>
                <div style={{ fontSize: 12 }}>★★★★★ 4.8 · 51 sessions</div>
              </div>
              <div className="landing-mentor-rate">₹1200/hr</div>
            </div>
            <div className="landing-mentor-tile">
              <div className="landing-mentor-avatar" style={{ background: "linear-gradient(135deg,#06b6d4,#3b82f6)" }}>AR</div>
              <div>
                <strong>Aarti R.</strong>
                <div className="muted">Stanford MBA · Resume reviews</div>
                <div style={{ fontSize: 12 }}>★★★★☆ 4.7 · 36 sessions</div>
              </div>
              <div className="landing-mentor-rate">₹2000/hr</div>
            </div>
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section id="reviews" className="landing-section landing-section-alt">
        <div className="landing-section-head">
          <span className="landing-eyebrow">What students say</span>
          <h2>People who've used the platform.</h2>
        </div>
        <div className="landing-reviews">
          {REVIEWS.map((r) => (
            <div key={r.name} className="landing-review">
              <div className="landing-review-stars">{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</div>
              <p>"{r.text}"</p>
              <div className="landing-review-by">
                <strong>{r.name}</strong>
                <span className="muted"> · {r.role}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="landing-section">
        <div className="landing-section-head">
          <span className="landing-eyebrow">FAQ</span>
          <h2>Things students ask before signing up.</h2>
        </div>
        <div className="landing-faq">
          {FAQ.map((f, i) => (
            <div key={i} className={"landing-faq-item " + (openFaq === i ? "open" : "")}>
              <button
                type="button"
                className="landing-faq-q"
                onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                aria-expanded={openFaq === i}
              >
                <span className="landing-faq-q-text">{f.q}</span>
                <span className="landing-faq-chev" aria-hidden="true">{openFaq === i ? "−" : "+"}</span>
              </button>
              {openFaq === i && <div className="landing-faq-a">{f.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="landing-cta">
        <div className="landing-cta-inner">
          <h2>Ready to ship that assignment?</h2>
          <p>Sign up free. Post your first requirement in under a minute.</p>
          <Link to="/register"><button className="lg">Create your account →</button></Link>
        </div>
      </section>

      <footer className="landing-footer">
        <div>© CampusConnect · two-channel marketplace · dev build</div>
        <div className="landing-footer-links">
          <Link to="/login">Sign in</Link>
          <Link to="/register">Create account</Link>
          <a href="#faq">FAQ</a>
        </div>
      </footer>
    </div>
  );
}
