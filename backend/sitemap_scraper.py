import requests
import xml.etree.ElementTree as ET
from scrapers.base_scraper import LegalProductScraper

class SitemapCrawler:
    def __init__(self, retailer_name, sitemap_url):
        self.retailer_name = retailer_name
        self.sitemap_url = sitemap_url
        self.scraper = LegalProductScraper(retailer_name, sitemap_url)

    def fetch_product_urls(self, keyword_filter=""):
        """Fetches an XML sitemap and extracts product URLs matching optional filters."""
        print(f"[{self.retailer_name}] Fetching sitemap from {self.sitemap_url}...")
        try:
            response = requests.get(self.sitemap_url, headers=self.scraper.headers, timeout=15)
            if response.status_code != 200:
                print(f"[{self.retailer_name}] Failed to fetch sitemap. Status: {response.status_code}")
                return []

            # Parse XML sitemap
            root = ET.fromstring(response.content)
            # Handle XML namespaces if present
            ns = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
            
            urls = []
            # Find all <loc> elements
            for loc in root.findall('.//ns:loc', ns):
                url_text = loc.text
                if url_text:
                    # Filter for product pages (Shopify uses /products/, others vary)
                    if not keyword_filter or keyword_filter in url_text:
                        urls.append(url_text)

            print(f"[{self.retailer_name}] Discovered {len(urls)} product URLs.")
            return urls

        except Exception as e:
            print(f"[{self.retailer_name}] Error parsing sitemap: {e}")
            return []
