import json
import os
import requests
import xml.etree.ElementTree as ET
from scrapers.base_scraper import LegalProductScraper
from normalizer import DataNormalizer

# Master Sitemap Index across Australian Specialty, Chain, and Brand Outlets
TARGET_STORES = [
    # --- Major Specialty Running Shops & Boutiques ---
    {"name": "The Running Company", "sitemap": "https://www.therunningcompany.com.au/sitemap_products_1.xml"},
    {"name": "Wildfire Sports", "sitemap": "https://www.wildfiresports.com.au/sitemap_products_1.xml"},
    {"name": "The Running Shop", "sitemap": "https://www.therunningshop.com.au/sitemap_products_1.xml"},
    {"name": "Pace Athletic", "sitemap": "https://paceathletic.com/sitemap_products_1.xml"},
    {"name": "RunDNA", "sitemap": "https://www.rundna.com.au/sitemap_products_1.xml"},
    {"name": "Sole Motive", "sitemap": "https://solemotive.com/sitemap_products_1.xml"},
    {"name": "Run Stop Shop", "sitemap": "https://www.runstopshop.com.au/sitemap_products_1.xml"},
    {"name": "FootMotion Australia", "sitemap": "https://www.footmotion.com.au/sitemap_products_1.xml"},
    {"name": "Fast42 Running", "sitemap": "https://fast42.com.au/sitemap_products_1.xml"},
    {"name": "The Running Centre", "sitemap": "https://therunningcentre.com.au/sitemap_products_1.xml"},
    {"name": "Intraining Running Centre", "sitemap": "https://shop.intraining.com.au/sitemap_products_1.xml"},
    {"name": "Front Runner Sports", "sitemap": "https://frontrunnersports.com.au/sitemap_products_1.xml"},
    {"name": "Gold Coast Runners", "sitemap": "https://gcrunners.com.au/sitemap_products_1.xml"},
    {"name": "Pure Running AU", "sitemap": "https://purerunning.com.au/sitemap_products_1.xml"},

    # --- National Chains & Multi-Brand Retailers ---
    {"name": "Intersport Australia", "sitemap": "https://intersport.com.au/sitemap_products_1.xml"},
    {"name": "Running Warehouse AU", "sitemap": "https://www.runningwarehouse.com.au/sitemap.xml"},
    {"name": "The Athlete's Foot AU", "sitemap": "https://www.theathletesfoot.com.au/sitemap.xml"},
    {"name": "rebel sport", "sitemap": "https://www.rebel-sport.com.au/sitemap.xml"},
    {"name": "Sportitude", "sitemap": "https://www.sportitude.com.au/sitemap.xml"},
    {"name": "JD Sports Australia", "sitemap": "https://www.jdsports.com.au/sitemap.xml"},
    {"name": "Platypus Shoes", "sitemap": "https://www.platypusshoes.com.au/sitemap.xml"},
    {"name": "Hype DC", "sitemap": "https://www.hypedc.com/au/sitemap.xml"},

    # --- Direct Brand Portals (Australia) ---
    {"name": "ASICS Australia", "sitemap": "https://www.asics.com/au/en-au/sitemap.xml"},
    {"name": "Saucony Australia", "sitemap": "https://www.saucony.com.au/sitemap.xml"},
    {"name": "HOKA Australia", "sitemap": "https://www.hoka.com/en/au/sitemap.xml"},
    {"name": "New Balance Australia", "sitemap": "https://www.newbalance.com.au/sitemap.xml"},
    {"name": "Brooks Running AU", "sitemap": "https://www.brooksrunning.com.au/sitemap.xml"},
    {"name": "Nike Australia", "sitemap": "https://www.nike.com/au/sitemap.xml"},
    {"name": "Adidas Australia", "sitemap": "https://www.adidas.com.au/sitemap.xml"},
    {"name": "On Running AU", "sitemap": "https://www.on.com/en-au/sitemap.xml"},
    {"name": "Puma Australia", "sitemap": "https://au.puma.com/sitemap_products_1.xml"},
    {"name": "Mizuno Australia", "sitemap": "https://mizuno.com.au/sitemap_products_1.xml"},
    {"name": "Salomon Australia", "sitemap": "https://salomon.com.au/sitemap_products_1.xml"},
    {"name": "Altra Running AU", "sitemap": "https://altrafootwear.com.au/sitemap_products_1.xml"},
    {"name": "Kiprun / Decathlon AU", "sitemap": "https://www.decathlon.com.au/sitemap.xml"}
]

class UniversalMarketEngine:
    def __init__(self, master_catalog_path="master_catalog.json"):
        with open(master_catalog_path, "r") as f:
            self.catalog = json.load(f)
        self.normalizer = DataNormalizer(self.catalog)
        self.base_scraper = LegalProductScraper("SoleSearchBot", "")

    def resolve_sitemap_urls(self, sitemap_url, depth=0):
        if depth > 2:
            return []
        
        try:
            resp = requests.get(sitemap_url, headers=self.base_scraper.headers, timeout=10)
            if resp.status_code != 200:
                return []

            root = ET.fromstring(resp.content)
            ns = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}

            # Check for Sitemap Index
            sub_sitemaps = root.findall('.//ns:sitemap/ns:loc', ns)
            if sub_sitemaps:
                extracted_urls = []
                for sub in sub_sitemaps:
                    sub_url = sub.text
                    if 'product' in sub_url.lower() or 'shoe' in sub_url.lower():
                        extracted_urls.extend(self.resolve_sitemap_urls(sub_url, depth + 1))
                return extracted_urls

            urls = []
            for loc in root.findall('.//ns:loc', ns):
                url = loc.text
                if url and any(kw in url.lower() for kw in ['/products/', '/product/', '-shoe', 'running']):
                    urls.append(url)
            return urls

        except Exception:
            return []

    def execute_market_sweep(self):
        print("🚀 Starting Internet-Wide Australian Retail Index Sweep...\n")
        store_index_summary = {}
        total_discovered_urls = 0

        for store in TARGET_STORES:
            print(f"📡 Ingesting {store['name']} ({store['sitemap']})...")
            product_urls = self.resolve_sitemap_urls(store["sitemap"])
            count = len(product_urls)
            store_index_summary[store["name"]] = count
            total_discovered_urls += count
            print(f"   └─ Indexed {count} active product URLs")

        print("\n" + "="*60)
        print("📊 AUSTRALIAN RUNNING RETAIL MARKET COVERAGE SUMMARY")
        print("="*60)
        for store_name, count in store_index_summary.items():
            print(f"• {store_name:<30}: {count:>6} URLs")
        print("-" * 60)
        print(f"🔥 TOTAL ACTIVE INDEXED RUNNING PRODUCT LISTINGS: {total_discovered_urls}")
        print("="*60)

if __name__ == "__main__":
    engine = UniversalMarketEngine()
    engine.execute_market_sweep()
