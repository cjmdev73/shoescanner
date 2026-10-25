import requests
import json
import os
import re
import time
import random

# Active & Verified Australian Running Stores with Rate-Limit Safe Handlers
LIVE_STORES = [
    # Top Specialty Running Stores (Shopify Paginated)
    {"name": "Sportsmart", "type": "shopify", "base_url": "https://www.sportsmart.com.au"},
    {"name": "Up There Athletics", "type": "shopify", "base_url": "https://upthereathletics.com"},
    {"name": "Active Feet", "type": "shopify", "base_url": "https://www.activefeet.com.au"},
    {"name": "The Running Shop", "type": "shopify", "base_url": "https://www.therunningshop.com.au"},
    {"name": "Pace Athletic", "type": "shopify", "base_url": "https://paceathletic.com"},
    {"name": "Sole Motive", "type": "shopify", "base_url": "https://solemotive.com"},
    {"name": "FootMotion Australia", "type": "shopify", "base_url": "https://www.footmotion.com.au"},
    {"name": "The Running Centre", "type": "shopify", "base_url": "https://therunningcentre.com.au"},
    {"name": "Intersport Australia", "type": "shopify", "base_url": "https://intersport.com.au"},

    # Direct Brand Outlets AU
    {"name": "Saucony Australia", "type": "shopify", "base_url": "https://www.saucony.com.au"},
    {"name": "HOKA Australia", "type": "shopify", "base_url": "https://www.hoka.com/en/au"},
    {"name": "Altra Australia", "type": "shopify", "base_url": "https://altrarunning.com.au"},
    {"name": "Salomon Australia", "type": "shopify", "base_url": "https://salomon.com.au"},
    {"name": "Mizuno Australia", "type": "shopify", "base_url": "https://mizuno.com.au"},

    # Specialized Sitemaps
    {"name": "Running Warehouse AU", "type": "sitemap", "sitemap_url": "https://www.runningwarehouse.com.au/sitemap.xml"},
    {"name": "Brooks Australia", "type": "sitemap", "sitemap_url": "https://www.brooksrunning.com.au/sitemap.xml"}
]

USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15"
]

def get_headers():
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache"
    }

def fetch_shopify_paginated(store):
    extracted = []
    page = 1
    consecutive_errors = 0

    print(f"\n📡 Harvesting catalog (Rate-Safe) from {store['name']}...")
    while True:
        endpoint = f"{store['base_url']}/products.json?limit=250&page={page}"
        try:
            response = requests.get(endpoint, headers=get_headers(), timeout=15)
            
            if response.status_code == 429:
                print(f"  └─ Page {page}: Hit 429 Rate Limit. Backing off 5s...")
                time.sleep(5)
                consecutive_errors += 1
                if consecutive_errors > 3:
                    break
                continue

            if response.status_code != 200:
                print(f"  └─ Page {page}: Stop/Skipped (Status {response.status_code})")
                break

            consecutive_errors = 0
            products = response.json().get("products", [])
            if not products:
                print(f"  └─ Page {page}: Empty, reached end of catalog.")
                break

            print(f"  └─ Page {page}: Fetched {len(products)} products")

            for prod in products:
                title = prod.get("title", "")
                handle = prod.get("handle", "")
                product_type = prod.get("product_type", "").lower()
                
                # Pre-filter for footwear signals
                if not any(k in title.lower() or k in product_type for k in ["shoe", "running", "trainer", "blast", "nimbus", "clifton", "speed", "ghost", "1080", "kayano", "bondi", "superblast"]):
                    continue

                product_url = f"{store['base_url']}/products/{handle}" if handle else store["base_url"]
                images = prod.get("images", [])
                image_url = images[0].get("src", "") if images else ""

                for var in prod.get("variants", []):
                    price = float(var.get("price", 0.0))
                    option1 = var.get("option1", "")
                    option2 = var.get("option2", "")
                    
                    color = "Standard Colorway"
                    sizes = []

                    for opt in [option1, option2]:
                        if opt:
                            if re.search(r'\b(us|uk|eu|usw|usm)?\s*\d+(\.\d)?\b', opt, re.IGNORECASE):
                                sizes.append(opt)
                            else:
                                color = opt

                    extracted.append({
                        "retailer": store["name"],
                        "title": title,
                        "price": price,
                        "url": product_url,
                        "image": image_url,
                        "color": color,
                        "sizes": sizes
                    })

            page += 1
            time.sleep(random.uniform(0.6, 1.2))  # Friendly backoff to prevent 429 blocks

        except Exception as e:
            print(f"  └─ ❌ Error fetching page {page} for {store['name']}: {e}")
            break

    return extracted

def fetch_sitemap_feed(store):
    extracted = []
    print(f"\n📡 Parsing Sitemap index from {store['name']}...")
    try:
        response = requests.get(store["sitemap_url"], headers=get_headers(), timeout=15)
        if response.status_code == 200:
            urls = re.findall(r'<loc>(.*?)</loc>', response.text)
            shoe_urls = [u for u in urls if any(k in u.lower() for k in ["shoe", "running", "kayano", "nimbus", "pegasus", "clifton", "ghost", "1080"])]
            print(f"  └─ Found {len(shoe_urls)} shoe product URLs in sitemap")
            
            for url in shoe_urls:
                slug = url.split('/')[-1].replace('-', ' ').title()
                extracted.append({
                    "retailer": store["name"],
                    "title": slug,
                    "price": 0.0,
                    "url": url,
                    "image": "",
                    "color": "Standard Colorway",
                    "sizes": []
                })
    except Exception as e:
        print(f"  └─ ❌ Error parsing sitemap for {store['name']}: {e}")

    return extracted

def run_live_feed():
    print("🇦🇺 Launching Rate-Safe Harvest across Active Retailers...")
    total_listings = 0
    os.makedirs("data", exist_ok=True)

    for store in LIVE_STORES:
        if store["type"] == "shopify":
            extracted = fetch_shopify_paginated(store)
        else:
            extracted = fetch_sitemap_feed(store)

        if extracted:
            dump_path = f"data/{re.sub(r'[^a-z0-9]', '_', store['name'].lower())}.json"
            with open(dump_path, "w") as f:
                json.dump(extracted, f, indent=2)
            print(f"  └─ ✅ Saved {len(extracted)} footwear items to {dump_path}")
            total_listings += len(extracted)

    print(f"\n🎉 Clean Footwear Sweep Complete! Total raw items harvested: {total_listings}")

if __name__ == "__main__":
    run_live_feed()
