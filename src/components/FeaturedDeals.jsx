import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Flame } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ShoeImage from "@/components/ShoeImage";

// Featured deals grouped by shoe type. Pulls the biggest current discounts
// (>=30% off RRP) server-side, then groups them into type sections.
const TYPE_ORDER = [
  { key: "Race", label: "Race shoes" },
  { key: "Daily Trainer", label: "Daily trainers" },
  { key: "Stability", label: "Stability & support" },
  { key: "Trail", label: "Trail shoes" },
  { key: "Walking", label: "Walking shoes" },
  { key: "Spikes", label: "Running spikes" },
];

export default function FeaturedDeals({ query }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    base44.functions
      .invoke("searchShoes", {
        sort: "discount",
        min_discount: 30,
        limit: 100,
        q: query?.trim() || undefined,
      })
      .then((res) => {
        if (!active) return;
        const items = res.data?.items || [];
        const byType = {};
        for (const it of items) {
          if (!it.category) continue;
          (byType[it.category] ||= []).push(it);
        }
        const built = TYPE_ORDER
          .map((t) => ({ ...t, deals: (byType[t.key] || []).slice(0, 6) }))
          .filter((g) => g.deals.length);
        if (active) setGroups(built);
      })
      .catch(() => {
        if (active) setGroups([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query]);

  return (
    <section className="pl-sec pl-fd mt-3.5">
      <div className="max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="pl-sk">
            <span className="pl-sp" /> Searching deals…
          </div>
        ) : !groups.length ? (
          <div className="pl-em">
            No featured deals right now. Try a different search or browse the full catalog.
          </div>
        ) : (
          <>
            <div className="pl-sh">
              <h2>
                <Flame className="w-[18px] h-[18px] text-[#008f8c]" fill="#008f8c" /> Featured
                deals
              </h2>
              <span>30%+ off RRP, current stock</span>
            </div>
            {groups.map((g) => (
              <div key={g.key}>
                <div className="pl-gt">{g.label}</div>
                <div className="pl-rail">
                  {g.deals.map((d) => (
                    <Link key={d.id} to={`/shoe/${d.id}`} className="pl-dc">
                      <div className="pl-well">
                        <ShoeImage
                          src={d.image_url}
                          verified={d.image_verified}
                          license={d.image_license}
                          attributedTo={d.image_attributed_to}
                          alt={`${d.brandName} ${d.name}`}
                        />
                        {d.best_discount_pct != null && (
                          <span className="pl-bd">{d.best_discount_pct}% off</span>
                        )}
                      </div>
                      <div className="pl-dt">
                        <div className="pl-br">{d.brandName}</div>
                        <div className="pl-nm">{d.name}</div>
                        <div className="pl-pr">
                          <b>${d.lowestPrice?.toFixed(0)}</b>
                          {d.rrp && <s>${d.rrp.toFixed(0)}</s>}
                        </div>
                        <div className="pl-of">
                          {d.retailerCount} offer{d.retailerCount === 1 ? "" : "s"}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  );
}