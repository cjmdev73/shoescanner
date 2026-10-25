import json
import random

def verify():
    feed_path = "../public/live_market_feed.json"
    with open(feed_path, "r") as f:
        data = json.load(f)

    total_shoes = len(data)
    multi_store = [s for s in data if len(s.get("stores", [])) > 1]
    
    print("=" * 60)
    print(f"📊 LIVE MARKET FEED DIAGNOSTIC REPORT")
    print("=" * 60)
    print(f"Total Canonical Shoe Cards: {total_shoes}")
    print(f"Models with Multi-Store Offers: {len(multi_store)}")
    print(f"Multi-Store Match Density: {(len(multi_store) / total_shoes) * 100:.1f}%\n")

    if multi_store:
        sample = random.choice(multi_store)
        print(f"--- Random Multi-Store Card Sample ---")
        print(f"Model: {sample['display_name']}")
        print(f"Category: {sample['category']} | Best Price: ${sample['best_price']}")
        print("Stocking Retailers:")
        for st in sample["stores"]:
            print(f"  • {st['retailer']}: ${st['lowest_price']} --> {st['url']}")
        print()

    # Calculate Top Price Differences Across Australian Retailers
    deals = []
    for shoe in multi_store:
        prices = [st["lowest_price"] for st in shoe["stores"] if st["lowest_price"] > 0]
        if len(prices) > 1:
            low = min(prices)
            high = max(prices)
            savings = round(high - low, 2)
            if savings > 0:
                deals.append({
                    "display_name": shoe["display_name"],
                    "lowest_price": low,
                    "highest_price": high,
                    "savings": savings,
                    "retailer_count": len(shoe["stores"])
                })

    deals.sort(key=lambda x: x["savings"], reverse=True)
    print("=" * 60)
    print(f"🔥 TOP 5 MARKET PRICE DIFFERENCES (SAVINGS OPPORTUNITIES)")
    print("=" * 60)
    print(json.dumps(deals[:5], indent=2))

if __name__ == "__main__":
    verify()
