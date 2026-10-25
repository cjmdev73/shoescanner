import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Activity, AlertTriangle, Boxes, RefreshCw, Check, X, Plus, Clock, Loader2, Radar, Store, CheckCircle2, ImageOff, Globe } from "lucide-react";
import { base44 } from "@/api/base44Client";

const TABS = [
  { id: "discovery", label: "Discovery", icon: Radar },
  { id: "health", label: "Ingestion Health", icon: Activity },
  { id: "matches", label: "Match Review", icon: AlertTriangle },
  { id: "catalog", label: "Catalog", icon: Boxes },
];

function timeAgo(iso) {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.round(hrs / 24)} days ago`;
}

// ---------------------------------------------------------------------------
// Discovery tab: run automated discovery per source + recent run history.
// ---------------------------------------------------------------------------
function DiscoveryTab({ retailers, shoes, brands, runs, loading, onRun }) {
  const [busy, setBusy] = useState(null);
  const [result, setResult] = useState(null);

  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  const run = async (retailer, mode) => {
    setBusy(retailer.id + mode);
    setResult(null);
    try {
      let rows = null;
      if (mode === "test") {
        // Build sample offers from the existing catalog so the match/upsert
        // pipeline can be verified end-to-end without a live feed.
        rows = shoes.slice(0, 3).map((s, i) => {
          const b = brands.find((x) => x.id === s.brand_id);
          return {
            title: `${b ? b.name + " " : ""}${s.name}`,
            price: 200 + i * 20,
            clean_url: `${retailer.base_url}/test-${s.slug || s.id}`,
            gender: i % 2 ? "Women" : "Men",
            sizes: ["US 9", "US 9.5", "US 10"],
          };
        });
      }
      const res = await base44.functions.invoke("discoverOffers", {
        retailer_id: retailer.id,
        rows,
        triggered_by: "manual",
      });
      setResult({ retailer: retailer.name, mode, ...res.data });
      onRun(); // refresh runs + listings
    } catch (e) {
      setResult({ retailer: retailer.name, mode, error: e.response?.data?.error || e.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Automated discovery</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Run discovery against a configured source. "Fetch feed" pulls the live feed URL; "Test run" sends sample offers through the same normalize → match → upsert pipeline so you can verify the system before wiring real feeds. Low-confidence matches are routed to Match Review.
      </p>

      <div className="space-y-2 mb-6">
        {retailers.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{r.name}</span>
                {r.source_type === "marketplace" && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full"><Store className="w-3 h-3" /> Marketplace</span>
                )}
                {r.discovery_enabled && <span className="text-[11px] font-medium text-emerald-600">discovery on</span>}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {r.feed_url || (r.discovery_query_template ? "search template" : "no feed configured")}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => run(r, "fetch")}
                disabled={busy === r.id + "fetch"}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-foreground text-background text-sm font-medium disabled:opacity-40 hover:opacity-90"
              >
                {busy === r.id + "fetch" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />} Fetch feed
              </button>
              <button
                onClick={() => run(r, "test")}
                disabled={busy === r.id + "test"}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm font-medium hover:bg-muted disabled:opacity-40"
              >
                {busy === r.id + "test" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />} Test run
              </button>
            </div>
          </div>
        ))}
        {retailers.length === 0 && <div className="rounded-2xl border border-border p-8 text-center text-muted-foreground">No sources configured. Add retailers in the Catalog tab.</div>}
      </div>

      {result && (
        <div className="rounded-2xl border border-border bg-muted/30 p-4 mb-6 text-sm">
          <span className="font-medium">{result.retailer}</span> · {result.mode === "fetch" ? "Fetch feed" : "Test run"}:{" "}
          {result.error ? <span className="text-rose-600">{result.error}</span> : <span className="text-emerald-600">{result.offers_found} offers · {result.new_listings} new · {result.updated_listings} updated · {result.pending_review} for review</span>}
        </div>
      )}

      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Recent runs</h3>
      <div className="rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-muted-foreground">
              <th className="text-left font-medium px-4 py-2.5">Source</th>
              <th className="text-left font-medium px-4 py-2.5">Status</th>
              <th className="text-right font-medium px-4 py-2.5">Offers</th>
              <th className="text-right font-medium px-4 py-2.5">New</th>
              <th className="text-right font-medium px-4 py-2.5">Review</th>
              <th className="text-left font-medium px-4 py-2.5">When</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => {
              const retailer = retailers.find((x) => x.id === r.retailer_id);
              return (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-medium">{retailer ? retailer.name : "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-medium ${r.status === "completed" ? "text-emerald-600" : r.status === "failed" ? "text-rose-600" : "text-amber-600"}`}>{r.status}</span>
                    {r.errors && <span className="block text-[11px] text-muted-foreground truncate max-w-[200px]">{r.errors}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.offers_found || 0}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.new_listings || 0}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.pending_review || 0}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{timeAgo(r.started_at)}</td>
                </tr>
              );
            })}
            {runs.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No discovery runs yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Health tab.
// ---------------------------------------------------------------------------
function HealthTab({ retailers, listings, loading, onRefresh }) {
  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Source ingestion health</h2>
        <button onClick={onRefresh} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>
      <div className="rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-muted-foreground">
              <th className="text-left font-medium px-4 py-2.5">Source</th>
              <th className="text-left font-medium px-4 py-2.5">Type</th>
              <th className="text-left font-medium px-4 py-2.5">Channel</th>
              <th className="text-right font-medium px-4 py-2.5">Listings</th>
              <th className="text-left font-medium px-4 py-2.5">Last ingested</th>
            </tr>
          </thead>
          <tbody>
            {retailers.map((r) => {
              const count = listings.filter((l) => l.retailer_id === r.id).length;
              const channel = r.feed_format === "none" ? "Scraper" : `Feed (${r.feed_format?.toUpperCase()})`;
              const stale = !r.last_ingested_at || (Date.now() - new Date(r.last_ingested_at).getTime() > 36 * 3600 * 1000);
              return (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.source_type || "retailer"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{channel}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{count}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 ${stale ? "text-amber-600" : "text-emerald-600"}`}>
                      <Clock className="w-3.5 h-3.5" /> {timeAgo(r.last_ingested_at)}
                    </span>
                  </td>
                </tr>
              );
            })}
            {retailers.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No sources configured yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Matches tab.
// ---------------------------------------------------------------------------
function MatchesTab({ listings, shoes, loading, onAction }) {
  const [pending, setPending] = useState({});
  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  const flagged = listings.filter((l) => l.match_status === "flagged" || l.match_status === "unmatched");
  const setShoe = (id, shoeId) => setPending((p) => ({ ...p, [id]: shoeId }));

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Match review</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Offers below need a canonical mapping. Auto-matched (over 85%) are linked automatically; these are ambiguous or unmatched.
      </p>
      {flagged.length === 0 ? (
        <div className="rounded-2xl border border-border p-10 text-center text-muted-foreground">All clear — no offers awaiting review.</div>
      ) : (
        <div className="space-y-3">
          {flagged.map((l) => (
            <div key={l.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${l.match_status === "flagged" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>{l.match_status === "flagged" ? "FLAGGED" : "UNMATCHED"}</span>
                    <span className="text-xs text-muted-foreground">score {l.match_score ?? 0}</span>
                    {l.marketplace_seller && <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1"><Store className="w-3 h-3" /> {l.marketplace_seller}</span>}
                  </div>
                  <p className="font-medium mt-1.5 truncate">{l.retailer_product_title}</p>
                  <p className="text-xs text-muted-foreground truncate">${l.price?.toFixed(2)} · {l.clean_url}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <select
                  value={pending[l.id] || l.canonical_shoe_id || ""}
                  onChange={(e) => setShoe(l.id, e.target.value)}
                  className="flex-1 h-9 rounded-lg border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10"
                >
                  <option value="">— select canonical shoe —</option>
                  {shoes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button onClick={() => onAction(l.id, pending[l.id] || l.canonical_shoe_id, "auto_matched")} disabled={!pending[l.id] && !l.canonical_shoe_id} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-foreground text-background text-sm font-medium disabled:opacity-40 hover:opacity-90">
                  <Check className="w-4 h-4" /> Approve
                </button>
                <button onClick={() => onAction(l.id, null, "unmatched")} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm font-medium hover:bg-muted">
                  <X className="w-4 h-4" /> Park
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Catalog tab.
// ---------------------------------------------------------------------------
function CatalogTab({ data, loading, onAdd, onImageAction }) {
  const [section, setSection] = useState("shoes");
  const [form, setForm] = useState({});
  const [brandId, setBrandId] = useState("");

  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  const SECTIONS = [
    { id: "shoes", label: "Canonical Shoes", count: data.shoes.length },
    { id: "brands", label: "Brands", count: data.brands.length },
    { id: "variants", label: "Variants", count: data.variants.length },
    { id: "retailers", label: "Sources", count: data.retailers.length },
  ];

  const inputCls = "h-9 rounded-lg border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10";

  return (
    <div>
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {SECTIONS.map((s) => (
          <button key={s.id} onClick={() => { setSection(s.id); setForm({}); setBrandId(""); }} className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${section === s.id ? "bg-foreground text-background border-foreground" : "bg-card text-muted-foreground border-border hover:text-foreground"}`}>
            {s.label} <span className="opacity-60">{s.count}</span>
          </button>
        ))}
      </div>

      {/* Add form */}
      <div className="rounded-2xl border border-border bg-card p-4 mb-5">
        <div className="text-sm font-medium mb-3 inline-flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add {SECTIONS.find((s) => s.id === section).label.replace(/s$/, "")}</div>
        {section === "brands" && (
          <div className="flex gap-2">
            <input placeholder="Name (e.g. ASICS)" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`flex-1 ${inputCls}`} />
            <input placeholder="slug (asics)" value={form.slug || ""} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={`w-40 ${inputCls}`} />
            <button onClick={() => { onAdd("brand", form); setForm({}); }} disabled={!form.name || !form.slug} className="h-9 px-4 rounded-lg bg-foreground text-background text-sm font-medium disabled:opacity-40">Add</button>
          </div>
        )}
        {section === "shoes" && (
          <div className="flex flex-wrap gap-2">
            <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className={inputCls}>
              <option value="">Brand…</option>
              {data.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <input placeholder="Name (Novablast 4)" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`flex-1 min-w-[140px] ${inputCls}`} />
            <input placeholder="generation (4)" value={form.generation || ""} onChange={(e) => setForm({ ...form, generation: e.target.value })} className={`w-28 ${inputCls}`} />
            <input placeholder="model_family" value={form.model_family || ""} onChange={(e) => setForm({ ...form, model_family: e.target.value })} className={`w-32 ${inputCls}`} />
            <input placeholder="slug" value={form.slug || ""} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={`w-28 ${inputCls}`} />
            <select value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>
              <option value="">Category…</option>
              {["Race", "Daily Trainer", "Stability", "Walking", "Spikes", "Trail"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="number" placeholder="RRP AUD" value={form.rrp || ""} onChange={(e) => setForm({ ...form, rrp: e.target.value ? Number(e.target.value) : "" })} className={`w-24 ${inputCls}`} />
            <button onClick={() => { onAdd("shoe", { ...form, brand_id: brandId }); setForm({}); setBrandId(""); }} disabled={!form.name || !form.slug || !brandId} className="h-9 px-4 rounded-lg bg-foreground text-background text-sm font-medium disabled:opacity-40">Add</button>
          </div>
        )}
        {section === "variants" && (
          <div className="flex flex-wrap gap-2">
            <select value={form.canonical_shoe_id || ""} onChange={(e) => setForm({ ...form, canonical_shoe_id: e.target.value })} className={inputCls}>
              <option value="">Shoe…</option>
              {data.shoes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={form.gender || ""} onChange={(e) => setForm({ ...form, gender: e.target.value })} className={inputCls}>
              <option value="">Gender…</option>
              {["Men", "Women", "Unisex"].map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <input placeholder="Colorway" value={form.colorway || ""} onChange={(e) => setForm({ ...form, colorway: e.target.value })} className={`flex-1 min-w-[140px] ${inputCls}`} />
            <button onClick={() => { onAdd("variant", form); setForm({}); }} disabled={!form.canonical_shoe_id || !form.gender || !form.colorway} className="h-9 px-4 rounded-lg bg-foreground text-background text-sm font-medium disabled:opacity-40">Add</button>
          </div>
        )}
        {section === "retailers" && (
          <div className="flex flex-wrap gap-2">
            <input placeholder="Name" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`flex-1 min-w-[120px] ${inputCls}`} />
            <input placeholder="slug" value={form.slug || ""} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={`w-24 ${inputCls}`} />
            <input placeholder="https:// base url" value={form.base_url || ""} onChange={(e) => setForm({ ...form, base_url: e.target.value })} className={`flex-1 min-w-[150px] ${inputCls}`} />
            <select value={form.source_type || "retailer"} onChange={(e) => setForm({ ...form, source_type: e.target.value })} className={inputCls}>
              <option value="retailer">Retailer</option>
              <option value="marketplace">Marketplace</option>
            </select>
            <select value={form.feed_format || "csv"} onChange={(e) => setForm({ ...form, feed_format: e.target.value })} className={inputCls}>
              {["csv", "xml", "json", "none"].map((f) => <option key={f} value={f}>{f.toUpperCase()}</option>)}
            </select>
            <input placeholder="feed_url" value={form.feed_url || ""} onChange={(e) => setForm({ ...form, feed_url: e.target.value })} className={`flex-1 min-w-[180px] ${inputCls}`} />
            <select value={form.editorial_rating || ""} onChange={(e) => setForm({ ...form, editorial_rating: e.target.value ? Number(e.target.value) : "" })} className={inputCls}>
              <option value="">Rating…</option>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
            </select>
            <input placeholder="reputation note" value={form.editorial_note || ""} onChange={(e) => setForm({ ...form, editorial_note: e.target.value })} className={`flex-1 min-w-[160px] ${inputCls}`} />
            <button onClick={() => { onAdd("retailer", { ...form, scrape_enabled: form.feed_format === "none", discovery_enabled: true }); setForm({}); }} disabled={!form.name || !form.slug || !form.base_url} className="h-9 px-4 rounded-lg bg-foreground text-background text-sm font-medium disabled:opacity-40">Add</button>
          </div>
        )}
      </div>

      {/* List */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {section === "shoes" && data.shoes.map((s) => {
              const b = data.brands.find((x) => x.id === s.brand_id);
              return (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-medium">{b ? b.name : "—"} {s.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{s.generation ? `Gen ${s.generation}` : "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{s.category || "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{s.rrp ? `$${s.rrp}` : "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    {s.image_verified ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 text-xs"><CheckCircle2 className="w-3.5 h-3.5" /> licensed</span>
                    ) : s.image_url ? (
                      <button onClick={() => onImageAction(s.id, "remove")} className="inline-flex items-center gap-1 text-amber-600 text-xs hover:underline"><ImageOff className="w-3.5 h-3.5" /> unverified</button>
                    ) : (
                      <span className="text-muted-foreground text-xs">no image</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {section === "brands" && data.brands.map((b) => (
              <tr key={b.id} className="border-b border-border last:border-0"><td className="px-4 py-2.5 font-medium">{b.name}</td><td className="px-4 py-2.5 text-muted-foreground text-right">{b.slug}</td></tr>
            ))}
            {section === "variants" && data.variants.map((v) => {
              const s = data.shoes.find((x) => x.id === v.canonical_shoe_id);
              return (
                <tr key={v.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-medium">{s ? s.name : "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{v.gender}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-right">{v.colorway}</td>
                </tr>
              );
            })}
            {section === "retailers" && data.retailers.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 font-medium">{r.name}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{r.source_type === "marketplace" ? "marketplace" : "retailer"}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{r.feed_format?.toUpperCase()}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{r.editorial_rating ? `${r.editorial_rating}★` : "—"}</td>
                <td className="px-4 py-2.5 text-muted-foreground text-right">{timeAgo(r.last_ingested_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState("discovery");
  const [data, setData] = useState({ retailers: [], listings: [], shoes: [], brands: [], variants: [], runs: [] });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [retailers, listings, shoes, brands, variants, runs] = await Promise.all([
        base44.entities.Retailer.filter({}, { limit: 100 }),
        base44.entities.RetailerListing.filter({}, { limit: 500 }),
        base44.entities.CanonicalShoe.filter({}, { limit: 500 }),
        base44.entities.Brand.filter({}, { limit: 100 }),
        base44.entities.ShoeVariant.filter({}, { limit: 500 }),
        base44.entities.DiscoveryRun.filter({}, { sort: "-created_date", limit: 20 }),
      ]);
      setData({
        retailers: retailers.items, listings: listings.items,
        shoes: shoes.items, brands: brands.items, variants: variants.items,
        runs: runs.items,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMatchAction = async (listingId, shoeId, status) => {
    try {
      await base44.entities.RetailerListing.update(listingId, { canonical_shoe_id: shoeId || "", match_status: status, match_score: 100 });
      await load();
    } catch (e) { alert(e.response?.data?.error || e.message); }
  };

  const handleAdd = async (type, payload) => {
    try {
      if (type === "brand") await base44.entities.Brand.create(payload);
      if (type === "shoe") await base44.entities.CanonicalShoe.create(payload);
      if (type === "variant") await base44.entities.ShoeVariant.create(payload);
      if (type === "retailer") await base44.entities.Retailer.create(payload);
      await load();
    } catch (e) { alert(e.response?.data?.error || e.message); }
  };

  const handleImageAction = async (shoeId, action) => {
    try {
      if (action === "remove") {
        await base44.entities.CanonicalShoe.update(shoeId, { image_url: "", image_source_url: "", image_license: "", image_attributed_to: "", image_verified: false });
      }
      await load();
    } catch (e) { alert(e.response?.data?.error || e.message); }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-foreground text-background flex items-center justify-center font-bold text-sm">S</div>
            <span className="font-bold tracking-tight text-lg">Shoe Scanner</span>
          </Link>
          <span className="text-xs text-muted-foreground">Admin</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-6">
        <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${tab === t.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>

        {tab === "discovery" && <DiscoveryTab retailers={data.retailers} shoes={data.shoes} brands={data.brands} runs={data.runs} loading={loading} onRun={load} />}
        {tab === "health" && <HealthTab retailers={data.retailers} listings={data.listings} loading={loading} onRefresh={load} />}
        {tab === "matches" && <MatchesTab listings={data.listings} shoes={data.shoes} loading={loading} onAction={handleMatchAction} />}
        {tab === "catalog" && <CatalogTab data={data} loading={loading} onAdd={handleAdd} onImageAction={handleImageAction} />}
      </div>
    </div>
  );
}