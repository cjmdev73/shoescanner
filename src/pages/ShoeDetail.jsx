import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Clock, Check, X, AlertTriangle, Loader2, Store, Star } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ShoeImage from "@/components/ShoeImage";

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

function StockBadge({ status }) {
  if (status === "In Stock") return <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium"><Check className="w-3 h-3" /> In</span>;
  if (status === "Low Stock") return <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium"><AlertTriangle className="w-3 h-3" /> Low</span>;
  return <span className="inline-flex items-center gap-1 text-muted-foreground text-xs font-medium"><X className="w-3 h-3" /> Out</span>;
}

function RatingStars({ rating, note }) {
  if (!rating) return null;
  const full = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-1" title={note || ""}>
      <span className="inline-flex items-center">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className={`w-3 h-3 ${i < full ? "fill-foreground text-foreground" : "text-muted-foreground/40"}`} />
        ))}
      </span>
    </span>
  );
}

// Construct a working search URL on the retailer's site so the "View at"
// link always takes the shopper to real results, even before real affiliate
// product URLs are ingested from feeds.
function buildRetailerUrl(listing, shoe, brand) {
  const query = encodeURIComponent(`${brand?.name || ""} ${shoe.name}`.trim());
  const base = listing.retailer?.base_url;
  if (!base) return listing.affiliate_url || listing.clean_url || "#";
  const isAmazon = base.includes("amazon");
  return isAmazon ? `${base}/s?k=${query}` : `${base}/search?q=${query}`;
}

export default function ShoeDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    base44.functions
      .invoke("getShoeDetail", { canonical_shoe_id: id })
      .then((res) => {
        if (!active) return;
        setData(res.data);
        setLoading(false);
      })
      .catch((e) => {
        if (!active) return;
        setError(e.response?.data?.error || e.message || "Failed to load");
        setLoading(false);
      });
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-5 text-center">
        <p className="text-muted-foreground">{error}</p>
        <Link to="/" className="text-foreground font-medium underline">Back to browse</Link>
      </div>
    );
  }

  const { shoe, brand, listings } = data;
  const best = listings[0];
  const allSizes = [...new Set(listings.flatMap((l) => l.availability.map((a) => a.size_us)))]
    .sort((a, b) => parseFloat(a.replace("US ", "")) - parseFloat(b.replace("US ", "")));

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-foreground text-background flex items-center justify-center font-bold text-sm">S</div>
            <span className="font-bold tracking-tight text-lg">Shoe Scanner</span>
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Browse
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-8">
        {/* Shoe header */}
        <div className="flex items-start gap-5">
          <div className="w-28 h-28 sm:w-40 sm:h-40 rounded-2xl overflow-hidden shrink-0 border border-border">
            <ShoeImage
              src={shoe.image_url}
              verified={shoe.image_verified}
              license={shoe.image_license}
              attributedTo={shoe.image_attributed_to}
              alt={`${brand?.name || ""} ${shoe.name}`}
              showCredit
            />
          </div>
          <div className="min-w-0">
            <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
              <span>{brand ? brand.name : "—"}</span>
              <span>·</span>
              <span>{shoe.category}</span>
              {shoe.generation && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">Gen {shoe.generation}</span>
                </>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mt-1">{shoe.name}</h1>
            {shoe.description && <p className="mt-2 text-muted-foreground max-w-xl">{shoe.description}</p>}
            {best && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-foreground text-background px-3 py-1.5 text-sm font-medium">
                Best price ${best.effective_price?.toFixed(2)} at {best.retailer?.name}{best.marketplace_seller ? ` · ${best.marketplace_seller}` : ""}
              </div>
            )}
          </div>
        </div>

        {/* Price comparison table */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            {listings.length} offer{listings.length === 1 ? "" : "s"} · sorted by best price
          </h2>
          {listings.length === 0 ? (
            <div className="rounded-2xl border border-border p-10 text-center text-muted-foreground">
              No live offers yet for this shoe. Check back after the next discovery run.
            </div>
          ) : (
            <div className="space-y-3">
              {listings.map((l, i) => {
                const isMarketplace = l.retailer?.source_type === "marketplace";
                return (
                  <div key={l.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                          <span className="font-semibold text-foreground">{l.retailer?.name || "Retailer"}</span>
                          {l.retailer?.editorial_rating && (
                            <span className="inline-flex items-center gap-1.5"><RatingStars rating={l.retailer.editorial_rating} note={l.retailer.editorial_note} />{l.retailer.editorial_note && <span className="text-[11px] text-muted-foreground hidden sm:inline">{l.retailer.editorial_note}</span>}</span>
                          )}
                          {isMarketplace && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                              <Store className="w-3 h-3" /> Marketplace
                            </span>
                          )}
                          {l.marketplace_seller && (
                            <span className="text-[11px] text-muted-foreground">seller: {l.marketplace_seller}</span>
                          )}
                          {l.on_sale && (
                            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">SALE</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">{l.retailer_product_title}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {l.on_sale && <div className="text-xs text-muted-foreground line-through">${l.price?.toFixed(2)}</div>}
                        <div className="text-2xl font-bold tracking-tight">${l.effective_price?.toFixed(2)}</div>
                        <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {timeAgo(l.last_updated_at)}
                        </div>
                      </div>
                    </div>

                    {l.availability.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="flex flex-wrap gap-2">
                          {l.availability.map((a) => (
                            <div
                              key={a.size_us}
                              className={`min-w-[64px] rounded-lg border px-2.5 py-1.5 text-center ${
                                a.stock_status === "Out of Stock"
                                  ? "border-border bg-muted/40 text-muted-foreground"
                                  : "border-border bg-card"
                              }`}
                            >
                              <div className="text-xs font-medium">{a.size_us}</div>
                              <div className="mt-0.5"><StockBadge status={a.stock_status} /></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4">
                      <a
                        href={buildRetailerUrl(l, shoe, brand)}
                        target="_blank"
                        rel="noopener nofollow sponsored"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground bg-foreground/5 hover:bg-foreground/10 rounded-full px-4 py-2 transition-colors"
                      >
                        View at {l.retailer?.name || "retailer"} <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Size matrix across retailers */}
        {allSizes.length > 0 && listings.length > 1 && (
          <div className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Size availability across retailers</h2>
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left font-medium px-4 py-2.5 text-muted-foreground">Retailer</th>
                    {allSizes.map((s) => (
                      <th key={s} className="px-3 py-2.5 text-center font-medium text-muted-foreground whitespace-nowrap">{s}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {listings.map((l) => (
                    <tr key={l.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 font-medium whitespace-nowrap">
                        {l.retailer?.name || "—"}
                        {l.marketplace_seller && <span className="block text-[11px] text-muted-foreground font-normal">{l.marketplace_seller}</span>}
                      </td>
                      {allSizes.map((s) => {
                        const a = l.availability.find((x) => x.size_us === s);
                        return (
                          <td key={s} className="px-3 py-2.5 text-center">
                            {a ? <StockBadge status={a.stock_status} /> : <span className="text-muted-foreground text-xs">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Research / reviews */}
        <div className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Research this shoe</h2>
          <div className="flex flex-wrap gap-2">
            <a href={`https://runrepeat.com/search?q=${encodeURIComponent(`${brand?.name || ""} ${shoe.name}`.trim())}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium border border-border rounded-full px-4 py-2 hover:bg-muted transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> RunRepeat reviews
            </a>
            <a href={`https://www.solereview.com/?s=${encodeURIComponent(`${brand?.name || ""} ${shoe.name}`.trim())}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium border border-border rounded-full px-4 py-2 hover:bg-muted transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> Solereview
            </a>
            <a href={`https://www.reddit.com/r/RunningShoes/search/?q=${encodeURIComponent(`${brand?.name || ""} ${shoe.name}`.trim())}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium border border-border rounded-full px-4 py-2 hover:bg-muted transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> r/RunningShoes
            </a>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">External links open in a new tab. We don't control third-party content.</p>
        </div>
      </div>
    </div>
  );
}