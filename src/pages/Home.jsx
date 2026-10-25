import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Filter,
  SlidersHorizontal,
  X,
  ChevronRight,
  Tag,
} from "lucide-react";
import ShoeImage from "@/components/ShoeImage";
import FeaturedDeals from "@/components/FeaturedDeals";

const CATEGORIES = ["All", "Daily Trainer", "Race", "Tempo / Speed", "Trail", "Stability", "Walking", "Spikes"];
const HERO_IMG =
  "https://media.base44.com/images/public/6ad7d21e105a93383786a495/c2b073603_generated_c0e52c82.jpg";

function ShoeRow({ shoe, index }) {
  const brand = shoe.brand || "";
  const title = shoe.display_name || shoe.model_family || shoe.id || "Running Shoe";
  const imageUrl = shoe.image;
  const price = shoe.best_price;
  
  const stores = Array.isArray(shoe.stores) ? shoe.stores : [];
  const storeCount = stores.length;
  const shoeId = shoe.id || encodeURIComponent(title);

  return (
    <Link
      to={`/shoe/${shoeId}`}
      className="pl-row"
      style={{ animationDelay: `${Math.min(index * 0.08, 0.4)}s` }}
    >
      <div className="pl-well">
        <ShoeImage
          src={imageUrl}
          alt={title}
        />
      </div>
      <div>
        <div className="pl-rt">
          <span>{brand}</span>
          <span>{shoe.category || "Running"}</span>
        </div>
        <h3>{title}</h3>
        <div className="pl-rb">
          <div>
            <small>Best price</small>
            <b>${price != null ? Number(price).toFixed(0) : "—"}</b>
          </div>
          <div className="pl-rr">
            {storeCount} offer{storeCount === 1 ? "" : "s"}
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

  const [rawFeed, setRawFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/live_market_feed.json")
      .then((res) => res.json())
      .then((data) => {
        setRawFeed(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load local live market feed:", err);
        setRawFeed([]);
        setLoading(false);
      });
  }, []);

  const brandFilters = useMemo(() => {
    const brandSet = new Set(
      rawFeed.map((item) => item.brand).filter(Boolean)
    );
    return ["All", ...Array.from(brandSet).sort()];
  }, [rawFeed]);

  const filteredShoes = useMemo(() => {
    return rawFeed.filter((shoe) => {
      const shoeBrand = shoe.brand || "";
      const shoeTitle = shoe.display_name || shoe.model_family || "";
      const fullTitle = `${shoeBrand} ${shoeTitle}`.toLowerCase();
      const q = query.trim().toLowerCase();

      const matchesQuery = !q || fullTitle.includes(q);
      const matchesBrand = brand === "All" || shoeBrand.toLowerCase() === brand.toLowerCase();
      
      // Category fuzzy match (e.g. "Race" matches "Race / Marathon")
      const shoeCategory = (shoe.category || "").toLowerCase();
      const targetCategory = category.toLowerCase();
      const matchesCategory =
        category === "All" ||
        shoeCategory.includes(targetCategory) ||
        (category === "Race" && shoeCategory.includes("race"));

      return matchesQuery && matchesBrand && matchesCategory;
    });
  }, [rawFeed, query, brand, category]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (val.trim() && view === "featured") {
      setView("browse");
    }
  };

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
              setView("browse");
            }}
          >
            <Search
              className="w-[18px] h-[18px] shrink-0"
              style={{ color: "#008f8c" }}
              strokeWidth={2.4}
            />
            <input
              value={query}
              onChange={handleSearchChange}
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
      {view === "featured" && <FeaturedDeals query={query} shoes={rawFeed} />}

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
                {loading
                  ? "Searching…"
                  : `${filteredShoes.length} shoe${filteredShoes.length === 1 ? "" : "s"} found`}
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
            ) : filteredShoes.length === 0 ? (
              <div className="pl-em">No shoes match your search.</div>
            ) : (
              <div className="pl-lst">
                {filteredShoes.map((shoe, i) => (
                  <ShoeRow
                    key={shoe.id || `${shoe.brand}-${i}`}
                    shoe={shoe}
                    index={i}
                  />
                ))}
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
