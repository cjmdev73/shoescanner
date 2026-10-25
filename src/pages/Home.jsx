import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Filter,
  SlidersHorizontal,
  X,
  Clock,
  ChevronRight,
  ChevronDown,
  Tag,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import ShoeImage from "@/components/ShoeImage";
import FeaturedDeals from "@/components/FeaturedDeals";

function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.round(hrs / 24)} days ago`;
}

const CATEGORIES = ["All", "Daily Trainer", "Race", "Stability", "Trail", "Walking", "Spikes"];
const HERO_IMG =
  "https://media.base44.com/images/public/6ad7d21e105a93383786a495/c2b073603_generated_c0e52c82.jpg";

function ShoeRow({ shoe, index }) {
  return (
    <Link
      to={`/shoe/${shoe.id}`}
      className="pl-row"
      style={{ animationDelay: `${Math.min(index * 0.08, 0.4)}s` }}
    >
      <div className="pl-well">
        <ShoeImage
          src={shoe.image_url}
          verified={shoe.image_verified}
          license={shoe.image_license}
          attributedTo={shoe.image_attributed_to}
          alt={`${shoe.brandName} ${shoe.name}`}
        />
        {shoe.best_discount_pct != null && (
          <span className="pl-bd" style={{ background: "#172b4d" }}>
            {shoe.best_discount_pct}% off
          </span>
        )}
      </div>
      <div>
        <div className="pl-rt">
          <span>{shoe.brandName}</span>
          <span>{shoe.category}</span>
        </div>
        <h3>
          {shoe.name} {shoe.generation && <span className="pl-gn">Gen {shoe.generation}</span>}
        </h3>
        <div className="pl-rb">
          <div>
            <small>Best price</small>
            <b>${shoe.lowestPrice != null ? shoe.lowestPrice.toFixed(0) : "—"}</b>
          </div>
          <div className="pl-rr">
            {shoe.onSale && (
              <>
                <span className="pl-os" style={{ margin: "0 0 3px" }}>
                  <ChevronDown className="w-[11px] h-[11px]" strokeWidth={2.6} />
                  On sale
                </span>
                <br />
              </>
            )}
            {shoe.retailerCount} offer{shoe.retailerCount === 1 ? "" : "s"}
            <br />
            <span>
              <Clock className="w-3 h-3" strokeWidth={2} /> {timeAgo(shoe.lastUpdated)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("All");
  const [category, setCategory] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState("featured");

  const [shoes, setShoes] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const reqId = useRef(0);

  // Load brand list once (for the brand filter).
  useEffect(() => {
    base44.entities.Brand.filter({}, { limit: 100 }).then((p) => setBrands(p.items)).catch(() => {});
  }, []);

  const brandId = useMemo(() => {
    if (brand === "All") return undefined;
    const b = brands.find((x) => x.name === brand);
    return b ? b.id : undefined;
  }, [brand, brands]);

  const runSearch = useCallback(
    async (cursor) => {
      const id = ++reqId.current;
      if (!cursor) setLoading(true);
      else setLoadingMore(true);
      try {
        const res = await base44.functions.invoke("searchShoes", {
          q: query.trim() || undefined,
          brand_id: brandId,
          category: category !== "All" ? category : undefined,
          limit: 60,
          cursor: cursor || undefined,
        });
        if (id !== reqId.current) return; // stale response
        const items = res.data?.items || [];
        setShoes((prev) => (cursor ? [...prev, ...items] : items));
        setHasMore(!!res.data?.has_more);
        setNextCursor(res.data?.next_cursor || null);
      } catch (e) {
        console.error(e);
        if (!cursor) setShoes([]);
      } finally {
        if (id === reqId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [query, brandId, category]
  );

  // Debounced search on filter changes.
  useEffect(() => {
    const t = setTimeout(() => {
      runSearch();
    }, 250);
    return () => clearTimeout(t);
  }, [runSearch]);

  const brandFilters = useMemo(() => ["All", ...brands.map((b) => b.name).sort()], [brands]);
  const activeFilters = (brand !== "All" ? 1 : 0) + (category !== "All" ? 1 : 0);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="pl-hd sticky top-0 z-30">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
          <Link to="/" className="pl-lg">
            <div className="pl-lm">S</div>
            Shoe Scanner
          </Link>
          <nav className="pl-nv">
            <Link to="/" className="on">
              Browse
            </Link>
            <Link to="/admin">Admin</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="pl-hero">
        <img src={HERO_IMG} alt="" aria-hidden="true" />
        <div className="max-w-4xl mx-auto w-full">
          <h1>Find the cheapest price for your running shoe.</h1>
          <p>
            Compare live prices and per-size stock across Australian retailers and marketplaces.
            All prices in AUD, US sizing.
          </p>
          <form
            className="pl-sb"
            onSubmit={(e) => {
              e.preventDefault();
              runSearch();
            }}
          >
            <Search
              className="w-[18px] h-[18px] shrink-0"
              style={{ color: "#008f8c" }}
              strokeWidth={2.4}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ASICS Novablast, HOKA Clifton 9, Mizuno Wave…"
              aria-label="Search for running shoes"
            />
            <button type="submit" className="pl-sbtn">
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Toggle */}
      <div className="max-w-4xl mx-auto w-full">
        <div className="pl-tg">
          <input
            type="radio"
            name="view"
            id="view-featured"
            checked={view === "featured"}
            onChange={() => setView("featured")}
          />
          <label htmlFor="view-featured">Featured deals</label>
          <input
            type="radio"
            name="view"
            id="view-browse"
            checked={view === "browse"}
            onChange={() => setView("browse")}
          />
          <label htmlFor="view-browse">Browse</label>
        </div>
      </div>

      {/* Featured deals */}
      {view === "featured" && <FeaturedDeals query={query} />}

      {/* Browse */}
      {view === "browse" && (
        <section className="pl-sec" style={{ borderBottom: 0 }}>
          <div className="max-w-4xl mx-auto w-full">
            {/* Filter chips */}
            <div className="pl-fl">
              <Filter className="w-4 h-4 shrink-0" style={{ color: "#52627f" }} strokeWidth={2} />
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`pl-ch ${category === c ? "on" : ""}`}
                >
                  {c}
                </button>
              ))}
              <button
                onClick={() => setShowFilters((v) => !v)}
                className={`pl-ch ${showFilters || activeFilters > 0 ? "on" : ""}`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Brand
                {activeFilters > 0 && <i>{activeFilters}</i>}
              </button>
            </div>

            {/* Brand panel */}
            {showFilters && (
              <div className="pl-bp">
                <div className="pl-bh">
                  <span>Brand</span>
                  {activeFilters > 0 && (
                    <button
                      onClick={() => {
                        setBrand("All");
                        setCategory("All");
                      }}
                      className="pl-cl"
                    >
                      <X className="w-3 h-3" strokeWidth={2.4} />
                      Clear filters
                    </button>
                  )}
                </div>
                <div className="pl-bw">
                  {brandFilters.map((b) => (
                    <button
                      key={b}
                      onClick={() => setBrand(b)}
                      className={`pl-ch ${brand === b ? "on" : ""}`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Status */}
            <div className="pl-st">
              <span>
                {loading ? "Searching…" : `${shoes.length} shoe${shoes.length === 1 ? "" : "s"} found`}
              </span>
              <span>
                <Tag className="w-[13px] h-[13px]" strokeWidth={2.2} />
                Prices updated continuously
              </span>
            </div>

            {/* List */}
            {loading ? (
              <div className="pl-sk">
                <span className="pl-sp" /> Searching…
              </div>
            ) : shoes.length === 0 ? (
              <div className="pl-em">No shoes match your filters.</div>
            ) : (
              <div className="pl-lst">
                {shoes.map((shoe, i) => (
                  <ShoeRow key={shoe.id} shoe={shoe} index={i} />
                ))}
              </div>
            )}

            {/* Load more */}
            {hasMore && !loading && (
              <div className="pl-lmw">
                <button
                  onClick={() => runSearch(nextCursor)}
                  disabled={loadingMore}
                  className="pl-lm2"
                >
                  {loadingMore && (
                    <span
                      className="pl-sp"
                      style={{ width: 14, height: 14, borderWidth: 2 }}
                    />
                  )}
                  Load more
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="pl-ft">
        <i />
        <p>Shoe Scanner · Australian running shoe price comparison</p>
        <p>
          Prices in AUD · US sizing{" "}
          <ChevronRight className="w-[13px] h-[13px]" strokeWidth={2.4} />
        </p>
      </footer>
    </div>
  );
}