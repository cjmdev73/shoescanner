import json
import time
import random
import requests
from bs4 import BeautifulSoup

class LegalProductScraper:
    def __init__(self, retailer_name, base_url):
        self.retailer_name = retailer_name
        self.base_url = base_url
        self.headers = {
            "User-Agent": "SoleSearchBot/1.0 (+https://solesearch.local; research & price comparison)",
            "Accept-Language": "en-AU,en;q=0.9",
        }

    def fetch_product_page(self, url):
        time.sleep(random.uniform(1.5, 3.0))
        try:
            response = requests.get(url, headers=self.headers, timeout=10)
            if response.status_code == 200:
                return response.text
        except Exception as e:
            print(f"[{self.retailer_name}] Error fetching {url}: {e}")
        return None

    def parse_json_ld(self, html_content):
        soup = BeautifulSoup(html_content, 'html.parser')
        json_ld_scripts = soup.find_all('script', type='application/ld+json')
        
        for script in json_ld_scripts:
            try:
                data = json.loads(script.string or script.text)
                if isinstance(data, dict) and data.get('@type') == 'Product':
                    return self._extract_facts(data)
                elif isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict) and item.get('@type') == 'Product':
                            return self._extract_facts(item)
            except (json.JSONDecodeError, TypeError):
                continue
        return None

    def _extract_facts(self, product_data):
        offers = product_data.get("offers", {})
        if isinstance(offers, list):
            offers = offers[0]

        return {
            "raw_title": product_data.get("name"),
            "brand": product_data.get("brand", {}).get("name") if isinstance(product_data.get("brand"), dict) else product_data.get("brand"),
            "sku": product_data.get("sku") or product_data.get("mpn"),
            "price": float(offers.get("price", 0.0)),
            "currency": offers.get("priceCurrency", "AUD"),
            "in_stock": "InStock" in str(offers.get("availability", "")),
            "image_url": product_data.get("image")
        }
