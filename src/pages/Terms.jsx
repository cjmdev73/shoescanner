import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-white">
      <header className="pl-hd sticky top-0 z-30 border-b bg-white/90 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
          <Link to="/" className="pl-lg">
            <div className="pl-lm">S</div>
            Shoe Scanner
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Search
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6 text-slate-800">
        <h1 className="text-2xl font-extrabold text-slate-900">Terms of Service & Legal Disclosures</h1>
        
        <div className="p-4 bg-slate-50 border rounded-xl text-xs space-y-2 text-slate-600">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Australian Consumer Law Notice
          </div>
          <p>
            Shoe Scanner operates as an independent price aggregation engine. Prices and availability are updated continuously from publicly accessible Australian footwear retail listings.
          </p>
        </div>

        <section className="space-y-2 text-sm">
          <h2 className="text-base font-bold text-slate-900">1. Price Accuracy & Retailer Checkout</h2>
          <p>
            While we strive for real-time accuracy, final pricing, stock levels, and shipping fees are determined exclusively by destination retailers at checkout. Shoe Scanner is not liable for price fluctuations between scraping intervals.
          </p>
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="text-base font-bold text-slate-900">2. Affiliate Disclosure</h2>
          <p>
            Some outbound store links may contain affiliate tracking codes. Shoe Scanner may earn a small referral commission on qualifying purchases at no additional cost to the buyer.
          </p>
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="text-base font-bold text-slate-900">3. Intellectual Property</h2>
          <p>
            All brand names, trademarks, and product imagery remain the property of their respective owners (e.g., ASICS, Nike, HOKA, Brooks, Saucony).
          </p>
        </section>
      </main>
    </div>
  );
}
