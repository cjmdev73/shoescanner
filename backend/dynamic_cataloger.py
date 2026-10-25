import re
import json
import os

class DynamicShoeCataloger:
    """
    Precision Running Shoe Cataloger.
    Normalizes title variants (e.g. SC Elite / SuperComp / Super Comp) to maximize store cross-matching.
    Filters out court/tennis footwear and generic 'Other' brands.
    """
    def __init__(self, storage_path="../public/live_market_feed.json", taxonomy_path="shoe_taxonomy.json"):
        self.storage_path = storage_path
        self.database = {}
        self.taxonomy = self.load_taxonomy(taxonomy_path)

    def load_taxonomy(self, path):
        if os.path.exists(path):
            with open(path, "r") as f:
                return json.load(f)
        return {}

    def is_valid_running_shoe(self, item, brand):
        title = item.get("title", "").lower()

        # Reject non-running sports footwear (tennis, padel, football, casual)
        banned_sports = [
            "court", "padel", "pickleball", "tennis", "football", "cleats", "boot", "boots",
            "sock", "socks", "cap", "hat", "visor", "singlet", "shorts", "shirt", "tee",
            "jacket", "gel", "chews", "flask", "bottle", "belt", "tights", "bra",
            "insole", "laces", "recovery", "hydration", "pant", "pants", "hoodie", "top"
        ]
        if "gel" in title and any(k in title for k in ["asics", "kayano", "nimbus", "cumulus", "pulse", "excite", "trabuco"]):
            banned_sports.remove("gel")

        if any(re.search(r'\b' + re.escape(w) + r'\b', title) for w in banned_sports):
            return False

        # Must belong to an explicit running brand in taxonomy
        if brand == "Other":
            return False

        return True

    def normalize_title_tokens(self, title):
        """Standardizes common retailer title variations before matching."""
        t = title.lower()
        
        # Abbreviation unifications
        t = re.sub(r'\bsuper\s*comp\b', 'supercomp', t)
        t = re.sub(r'\bsc\s+elite\b', 'supercomp elite', t)
        t = re.sub(r'\bsc\s+trainer\b', 'supercomp trainer', t)
        t = re.sub(r'\bsc\s+pacer\b', 'supercomp pacer', t)
        t = re.sub(r'\bgtx\b', 'gore-tex', t)
        t = re.sub(r'\bmetaspeed\s*sky\b', 'metaspeed sky', t)
        t = re.sub(r'\bmetaspeed\s*edge\b', 'metaspeed edge', t)
        t = re.sub(r'\bendorphin\s*speed\b', 'endorphin speed', t)
        t = re.sub(r'\bendorphin\s*pro\b', 'endorphin pro', t)
        t = re.sub(r'\bendorphin\s*elite\b', 'endorphin elite', t)
        
        return t

    def parse_shoe_metadata(self, raw_title):
        title = raw_title.strip()
        norm_title = self.normalize_title_tokens(title)

        # 1. Match Brand
        matched_brand = "Other"
        for brand in self.taxonomy.keys():
            if re.search(r'\b' + re.escape(brand) + r'\b', norm_title, re.IGNORECASE):
                matched_brand = brand
                break

        if not self.is_valid_running_shoe({"title": raw_title}, matched_brand):
            return None

        # 2. Extract Gender
        gender = "Unisex"
        if re.search(r'\b(men\'s|mens|men)\b', norm_title):
            gender = "Men's"
        elif re.search(r'\b(women\'s|womens|women|wmns)\b', norm_title):
            gender = "Women's"

        # 3. Version Extraction (e.g. v5, v6, 31, 11)
        version_match = re.search(r'\b(v?\d{1,2})\b', norm_title)
        version = version_match.group(1).upper() if version_match else ""
        if version.isdigit():
            version = f"v{version}"

        # 4. Strict Model Matching against Taxonomy
        matched_model = ""
        category = "Daily Trainer"

        if matched_brand in self.taxonomy:
            brand_tax = self.taxonomy[matched_brand]
            all_models = []
            for cat_name, models in brand_tax.items():
                for m in models:
                    all_models.append((m, cat_name))
            
            all_models.sort(key=lambda x: len(x[0]), reverse=True)

            for model_name, cat_name in all_models:
                pattern = r'\b' + re.escape(model_name.lower()) + r'\b'
                if re.search(pattern, norm_title):
                    matched_model = model_name
                    if cat_name == "race":
                        category = "Race / Marathon"
                    elif cat_name == "tempo":
                        category = "Tempo / Speed"
                    elif cat_name == "trail":
                        category = "Trail"
                    else:
                        category = "Daily Trainer"
                    break

        if not matched_model:
            cleaned = re.sub(r'\b(men\'s|mens|women\'s|womens|unisex|running|shoes|shoe)\b', '', norm_title)
            cleaned = re.sub(r'\b' + re.escape(matched_brand.lower()) + r'\b', '', cleaned)
            tokens = [w for w in cleaned.split() if not w.startswith('v') and not w.isdigit()]
            matched_model = " ".join(tokens[:2]).title() if tokens else "Running Model"

        # 5. Extract Variants with Strict Word Boundaries
        variants = []
        if re.search(r'\b(tr|trail)\b', norm_title) and not re.search(r'\btrainer\b', norm_title):
            variants.append("Trail")
            category = "Trail"
        if re.search(r'\b(gore-tex|waterproof)\b', norm_title):
            variants.append("Gore-Tex")
        if re.search(r'\b(2e|4e|wide)\b', norm_title):
            variants.append("Wide")
        
        variant_str = " ".join(variants) if variants else "Road"

        # 6. Build Deterministic Canonical Key
        canonical_key = f"{matched_brand}-{matched_model}-{version}-{variant_str}-{gender}".lower()
        canonical_key = re.sub(r'[^a-z0-9\-]', '', canonical_key)
        canonical_key = re.sub(r'-+', '-', canonical_key).strip('-')

        display_name = f"{matched_brand} {matched_model}"
        if version:
            display_name += f" {version}"
        if variant_str != "Road":
            display_name += f" [{variant_str}]"
        if gender != "Unisex":
            display_name += f" ({gender})"

        return {
            "key": canonical_key,
            "brand": matched_brand,
            "model": matched_model,
            "version": version,
            "gender": gender,
            "variant": variant_str,
            "category": category,
            "display_name": display_name
        }

    def ingest_live_listing(self, scraped_item):
        raw_title = scraped_item.get("title", "")
        price = scraped_item.get("price")
        retailer = scraped_item.get("retailer")
        product_url = scraped_item.get("url")
        image_url = scraped_item.get("image", "")
        colorway = scraped_item.get("color", "Standard Colorway")
        sizes = scraped_item.get("sizes", [])

        if not raw_title or not price:
            return

        meta = self.parse_shoe_metadata(raw_title)
        if not meta or not meta["key"]:
            return

        key = meta["key"]

        if key not in self.database:
            self.database[key] = {
                "id": key,
                "brand": meta["brand"],
                "model_family": meta["model"],
                "version": meta["version"],
                "display_name": meta["display_name"],
                "gender": meta["gender"],
                "category": meta["category"],
                "variant": meta["variant"],
                "best_price": price,
                "image": image_url,
                "stores": {}
            }

        shoe = self.database[key]

        if price > 0 and (shoe["best_price"] == 0 or price < shoe["best_price"]):
            shoe["best_price"] = price
            if image_url:
                shoe["image"] = image_url

        if retailer not in shoe["stores"]:
            shoe["stores"][retailer] = {
                "retailer": retailer,
                "lowest_price": price,
                "url": product_url,
                "colorways": []
            }

        store = shoe["stores"][retailer]
        if price > 0 and (store["lowest_price"] == 0 or price < store["lowest_price"]):
            store["lowest_price"] = price
            store["url"] = product_url

        existing_cw = next((c for c in store["colorways"] if c["name"] == colorway), None)
        if existing_cw:
            existing_cw["sizes"] = list(set(existing_cw["sizes"] + sizes))
        else:
            store["colorways"].append({
                "name": colorway,
                "price": price,
                "image": image_url,
                "url": product_url,
                "sizes": sizes
            })

    def save_live_feed(self):
        output = []
        for key, item in self.database.items():
            formatted = dict(item)
            formatted["stores"] = list(item["stores"].values())
            output.append(formatted)

        os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
        with open(self.storage_path, "w") as f:
            json.dump(output, f, indent=2)
        print(f"✅ Successfully compiled {len(output)} clean canonical master models into {self.storage_path}")
