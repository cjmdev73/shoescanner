from normalizer import DataNormalizer

# Master catalog of shoes you want to track
master_shoes = [
    "ASICS Novablast 4",
    "Mizuno Wave Rider 30",
    "Saucony Endorphin Speed 4"
]

normalizer = DataNormalizer(master_shoes)

# Test messy titles from different retailers
messy_titles = [
    "Asics Novablast 4 Mens Running Shoe - Black",
    "Mizuno Wave Rider 30 (M) - White/Navy",
    "Saucony Endorphine Speed 4 Unisex"
]

print("--- Testing Entity Resolution Pipeline ---")
for title in messy_titles:
    match, score = normalizer.match_canonical_shoe(title)
    print(f"Raw: '{title}'\n --> Matched: '{match}' (Score: {score}%)\n")
