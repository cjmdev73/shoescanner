import requests

SHOPIFY_STORES = [
    {"name": "Pace Athletic", "domain": "paceathletic.com"},
    {"name": "Active Feet", "domain": "www.activefeet.com.au"},
    {"name": "Sole Motive", "domain": "solemotive.com"},
    {"name": "The Running Shop", "domain": "therunningshop.com.au"},
    {"name": "The Running Centre", "domain": "therunningcentre.com.au"},
    {"name": "The Runners Shop", "domain": "therunnersshop.com.au"},
    {"name": "Up There Athletics", "domain": "upthereathletics.com"},
    {"name": "FootMotion", "domain": "footmotion.com.au"},
    {"name": "Sportsmart", "domain": "www.sportsmart.com.au"},
    {"name": "Intersport Australia", "domain": "intersport.com.au"}
]

def scrape_shopify_hub():
    print("=== STARTING SHOPIFY MULTI-STORE SCRAPER HUB ===")
    all_offers = []
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "application/json"
    }

    for store in SHOPIFY_STORES:
        name = store["name"]
        domain = store["domain"]
        url = f"https://{domain}/products.json?limit=250"
        
        try:
            res = requests.get(url, headers=headers, timeout=12)
            if res.status_code == 200:
                products = res.json().get("products", [])
                store_offers = 0
                for p in products:
                    title = p.get("title", "")
                    vendor = p.get("vendor", "")
                    handle = p.get("handle", "")
                    product_type = p.get("product_type", "").lower()
                    
                    if any(w in product_type or w in title.lower() for w in ["shoe", "running", "footwear", "sneaker", "trainer"]):
                        variants = p.get("variants", [])
                        if not variants:
                            continue
                        
                        prices = [float(v.get("price", 0)) for v in variants if v.get("price")]
                        lowest_price = min(prices) if prices else 0.0
                        
                        images = p.get("images", [])
                        img_url = images[0].get("src") if images else None
                        
                        if lowest_price > 0:
                            all_offers.append({
                                "retailer": name,
                                "title": f"{vendor} {title}".strip(),
                                "brand": vendor,
                                "lowest_price": lowest_price,
                                "url": f"https://{domain}/products/{handle}",
                                "image": img_url
                            })
                            store_offers += 1
                print(f"-> {name} ({domain}): Scraped {store_offers} shoe offers")
            else:
                print(f"-> {name} ({domain}): Failed with status {res.status_code}")
        except Exception as e:
            print(f"-> {name} ({domain}): Error - {e}")

    print(f"=== SHOPIFY HUB COMPLETE: Total {len(all_offers)} offers gathered ===")
    return all_offers

if __name__ == "__main__":
    scrape_shopify_hub()
