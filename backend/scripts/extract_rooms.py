import xml.etree.ElementTree as ET
import json
import os
import re

floors = ['lg', 'g', '1', '2', '3', '4', '5', '6', '7', '8']
result = {}

base_dir = r"c:\important files\main files\projects\Nirvan.ai\floor_plans"
for f in floors:
    path = os.path.join(base_dir, f"floor_{f}_dark.svg")
    if not os.path.exists(path):
        continue
    tree = ET.parse(path)
    root = tree.getroot()
    rooms = []
    seen = set()
    for elem in root.iter():
        if elem.tag.endswith("text"):
            txt_id = elem.attrib.get("id", "")
            tspan_text = " ".join(t.text.strip() for t in elem.iter() if t.text and t.text.strip())
            name = (txt_id or tspan_text).strip()
            name = re.sub(r"\s+", " ", name)
            x, y = 180.0, 267.0
            transform = elem.attrib.get("transform", "")
            if "translate" in transform:
                m = re.search(r"translate\(([-\d.]+)[ ,]+([-\d.]+)\)", transform)
                if m:
                    x, y = float(m.group(1)), float(m.group(2))
            else:
                for child in elem:
                    if "x" in child.attrib and "y" in child.attrib:
                        try:
                            x, y = float(child.attrib["x"].split()[0]), float(child.attrib["y"].split()[0])
                            break
                        except Exception:
                            pass
            if name and not name.lower().startswith("floor") and name != "NA" and name not in seen:
                seen.add(name)
                rooms.append({"id": name, "name": name, "x": round(x, 1), "y": round(y, 1)})
    result[f.upper()] = rooms

for f, rms in result.items():
    print(f"Floor {f}: {len(rms)} rooms found: {[r['name'] for r in rms[:4]]}")

out_path = os.path.join("app", "core", "campus_floors.json")
with open(out_path, "w", encoding="utf-8") as out:
    json.dump(result, out, indent=2)
print(f"Saved {len(result)} floors to {out_path}")
