import json
import os
import glob
from dynamic_cataloger import DynamicShoeCataloger

def load_raw_scraped_data():
    """
    Collects raw scraped data from json files in backend/data/ or scrapers output.
    Falls back to a test set if no scraped files are found.
    """
    items = []
    data_files = glob.glob("data/*.json") + glob.glob("scrapers/*.json")
    
    for filepath in data_files:
        try:
            with open(filepath, "r") as f:
                content = json.load(f)
                if isinstance(content, list):
                    items.extend(content)
                elif isinstance(content, dict):
                    items.append(content)
        except Exception as e:
            print(f"⚠️ Could not read {filepath}: {e}")

    # Fallback simulation items to verify parsing if no local scrapers dump exists
    if not items:
        print("ℹ️ No raw scraper dumps found in data/. Running pipeline with test validation items...")
        items = [
            {
                "retailer": "Wildfire Sports",
                "title": "ASICS GEL-Kayano 31 Men's Running Shoes - Black/White",
                "price": 279.95,
                "url": "https://www.wildfiresports.com.au/asics-gel-kayano-31-mens",
                "image": "https://example.com/kayano31.jpg",
                "color": "Black/White",
                "sizes": ["US 9", "US 10", "US 11"]
            },
            {
                "retailer": "Running Warehouse Australia",
                "title": "ASICS GEL-Kayano 31 Men's - Metropolis/Electric Lime",
                "price": 259.95,
                "url": "https://www.runningwarehouse.com.au/asics-kayano-31",
                "image": "https://example.com/kayano31-2.jpg",
                "color": "Metropolis/Electric Lime",
                "sizes": ["US 8.5", "US 9.5", "US 10.5"]
            },
            {
                "retailer": "Up There Athletics",
                "title": "On Cloudboom Strike v2 Unisex - White/Flame",
                "price": 380.00,
                "url": "https://upthereathletics.com/products/on-cloudboom-strike-v2",
                "image": "https://example.com/cloudboom.jpg",
                "color": "White/Flame",
                "sizes": ["US 8", "US 9", "US 10"]
            },
            {
                "retailer": "Wildfire Sports",
                "title": "ASICS Mens Running Socks 3-Pack - Black",
                "price": 24.95,
                "url": "https://www.wildfiresports.com.au/asics-socks",
                "sizes": ["M", "L"]
            }
        ]

    return items

def run_ingestion_pipeline():
    print("🚀 Initializing Sole Search Track Ingestion Engine...")
    
    cataloger = DynamicShoeCataloger(storage_path="../public/live_market_feed.json", taxonomy_path="shoe_taxonomy.json")
    raw_items = load_raw_scraped_data()

    print(f"📦 Processing {len(raw_items)} raw scraped listings...")
    
    for item in raw_items:
        # Standardize field keys from scrapers
        scraped_payload = {
            "retailer": item.get("retailer", "Unknown"),
            "title": item.get("title") or item.get("raw_title", ""),
            "price": item.get("price", 0.0),
            "url": item.get("url") or item.get("product_url", ""),
            "image": item.get("image", ""),
            "color": item.get("color", "Standard Colorway"),
            "sizes": item.get("sizes", [])
        }
        cataloger.ingest_live_listing(scraped_payload)

    cataloger.save_live_feed()

if __name__ == "__main__":
    run_ingestion_pipeline()
