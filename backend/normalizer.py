import re
from difflib import SequenceMatcher

class DataNormalizer:
    def __init__(self, master_catalog=None):
        self.master_catalog = master_catalog or []

    def extract_gender(self, raw_title):
        title = raw_title.lower()
        if re.search(r'\b(women\'s|womens|women|wmns|w)\b', title):
            return "Women's"
        elif re.search(r'\b(men\'s|mens|men)\b', title):
            return "Men's"
        return "Unisex"

    def extract_variant_type(self, raw_title):
        """Identifies trail, gore-tex, or racing variants."""
        title = raw_title.lower()
        variants = []
        if re.search(r'\b(tr|trail)\b', title):
            variants.append("Trail")
        if re.search(r'\b(gtx|gore-tex|waterproof)\b', title):
            variants.append("Gore-Tex")
        if re.search(r'\b(strike|supercomp|vaporfly|alphafly|metaspeed|sky|edge|pro)\b', title):
            variants.append("Race")
        return " ".join(variants) if variants else "Road"

    def extract_version(self, raw_title):
        """Extracts exact version numbers (e.g., '6' in Novablast 6)."""
        match = re.search(r'\b(v?\d{1,2})\b', raw_title, re.IGNORECASE)
        return match.group(1).upper() if match else ""

    def create_canonical_key(self, brand, model_name, version, variant, gender):
        """Creates a unique deterministic slug for a master model entry."""
        slug_parts = [brand, model_name]
        if version:
            slug_parts.append(f"v{version}")
        if variant and variant != "Road":
            slug_parts.append(variant)
        if gender:
            slug_parts.append(gender)
        
        raw_slug = "-".join(slug_parts).lower()
        return re.sub(r'[^a-z0-9\-]', '', raw_slug)

    def match_canonical_shoe(self, raw_title, brand=""):
        """
        Hard-gated identity matching using Python standard library difflib:
        1. Version numbers MUST match exactly if present.
        2. Road vs Trail variants MUST match.
        3. Uses SequenceMatcher for base model similarity.
        """
        version = self.extract_version(raw_title)
        variant = self.extract_variant_type(raw_title)
        gender = self.extract_gender(raw_title)

        if not self.master_catalog:
            return None, 0

        best_match = None
        best_score = 0.0

        for item in self.master_catalog:
            # Hard gate 1: Version match
            item_version = item.get("version", "")
            if version and item_version and version != item_version:
                continue

            # Hard gate 2: Variant (Road vs Trail)
            item_variant = item.get("variant", "Road")
            if variant != item_variant:
                continue

            # Calculate similarity score (0.0 to 1.0) using standard library difflib
            ratio = SequenceMatcher(None, raw_title.lower(), item["name"].lower()).ratio()
            if ratio > best_score and ratio >= 0.85:  # Strict 0.85 ratio threshold
                best_score = ratio
                best_match = item

        return best_match, best_score

    def standardize_size(self, raw_size_string):
        match = re.search(r'([0-9]+(\.[0-9]?)?)', str(raw_size_string))
        if match:
            return f"US {match.group(1)}"
        return str(raw_size_string)
