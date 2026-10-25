import json
import os
import re
from scrapers.shopify_hub import scrape_shopify_hub

def clean_string(text):
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r"\b(men's|mens|women's|womens|d|2e|4e|wide|running|shoes|shoe)\b", "", text)
    text = re.sub(r"[^a-z0-9]", "", text)
    return text.strip()

def run_pipeline():
    print("=== STARTING AUTOMATED PIPELINE EXECUTION ===")
    
    feed_path = os.path.join(os.path.dirname(__file__), "../public/live_market_feed.json")
    if os.path.exists(feed_path):
        with open(feed_path, "r") as f:
            catalog = json.load(f)
    else:
        catalog = []

    print(f"Existing catalog count: {len(catalog)} models")

    hub_offers = scrape_shopify_hub()

    merged_count = 0
    for offer in hub_offers:
        target_brand = (offer.get("brand") or "").lower()
        clean_target_title = clean_string(offer.get("title", ""))
        
        if not target_brand or not clean_target_title:
            continue

        for shoe in catalog:
            shoe_brand = (shoe.get("brand") or "").lower()
            clean_display = clean_string(shoe.get("display_name", ""))
            clean_family = clean_string(shoe.get("model_family", ""))

            # Flexible fuzzy matching
            if shoe_brand == target_brand and (clean_family in clean_target_title or clean_target_title in clean_display):
                if "stores" not in shoe or not isinstance(shoe["stores"], list):
                    shoe["stores"] = []
                
                existing_stores = [s.get("retailer") for s in shoe["stores"]]
                if offer["retailer"] not in existing_stores:
                    shoe["stores"].append({
                        "retailer": offer["retailer"],
                        "lowest_price": offer["lowest_price"],
                        "url": offer["url"]
                    })
                    if offer["lowest_price"] < shoe.get("best_price", 9999):
                        shoe["best_price"] = offer["lowest_price"]
                    merged_count += 1
                break

    print(f"Successfully merged {merged_count} store offers into catalog models!")

    with open(feed_path, "w") as f:
        json.dump(catalog, f, indent=2)

    print("=== PIPELINE EXECUTION COMPLETE: live_market_feed.json UPDATED ===")

if __name__ == "__main__":
    run_pipeline()
