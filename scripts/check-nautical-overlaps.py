#!/usr/bin/env python3
"""Deteksi tumpang tindih label di peta laut (nautical-chart.tsx) pada zoom 9.

Mem-parsing array SOUNDINGS, PLACES, CONTOUR_LABELS, LANE_LABELS dari file TSX,
lalu menghitung jarak piksel antar label (asumsi Web Mercator zoom 9:
364.1 px/derajat bujur, ~366 px/derajat lintang di area Selat Sunda).
Sebuah pasangan dianggap BERTABRAKAN bila kotak-kotaknya saling menembus
(dengan margin keamanan 3 px).
"""
import math
import re
import sys

TSX = "/home/z/my-project/src/components/bluetech/nautical-chart.tsx"
Z9_PX_PER_DEG_LON = 364.1
MARGIN = 3.0  # px jarak minimum antar kotak

# (nama, half_w, half_h) per jenis label
SIZES = {
    "sounding": lambda txt: (6.5 * len(txt) + 5) / 2,  # half width
    "contour": lambda txt: (6.5 * len(txt) + 8) / 2,
    "place_lg": lambda txt: (11.2 * len(txt) + 40) / 2,  # letterspaced serif
    "place": lambda txt: (6.6 * len(txt) + 8) / 2,
    "place_sm": lambda txt: (5.6 * len(txt) + 8) / 2,
    "lane": lambda txt: (5.8 * len(txt)) / 2,  # italic kecil
}
HALF_H = {
    "sounding": 7.0,
    "contour": 8.0,
    "place_lg": 10.0,
    "place": 8.0,
    "place_sm": 7.0,
    "lane": 7.0,
}


def px_per_deg_lat(lat_deg: float) -> float:
    return Z9_PX_PER_DEG_LON / math.cos(math.radians(lat_deg))


def parse():
    src = open(TSX, encoding="utf-8").read()

    soundings = [
        (float(m[0]), float(m[1]), m[2])
        for m in re.findall(r"\{\s*lat:\s*(-?[\d.]+),\s*lon:\s*(-?[\d.]+),\s*d:\s*(\d+)\s*\}", src)
    ]
    contours = [
        (float(m[0]), float(m[1]), m[2])
        for m in re.findall(r"\{\s*lat:\s*(-?[\d.]+),\s*lon:\s*(-?[\d.]+),\s*t:\s*\"(\d+)\"\s*\}", src)
    ]
    places = []
    for m in re.finditer(
        r"\{\s*name:\s*\"([^\"]+)\",\s*lat:\s*(-?[\d.]+),\s*lon:\s*(-?[\d.]+)(?:,\s*size:\s*\"(lg|sm)\")?\s*\}",
        src,
    ):
        name, lat, lon, size = m.group(1), float(m.group(2)), float(m.group(3)), m.group(4)
        places.append((lat, lon, name, size or "norm"))
    lanes = [
        (float(m[0]), float(m[1]), m[2])
        for m in re.findall(r"\{\s*lat:\s*(-?[\d.]+),\s*lon:\s*(-?[\d.]+),\s*t:\s*\"([^\"]+)\"\s*\}", src)
    ]
    return soundings, contours, places, lanes


def boxes(soundings, contours, places, lanes):
    items = []  # (jenis, teks, lat, lon, half_w, half_h)
    for lat, lon, d in soundings:
        t = str(d)
        items.append(("sounding", t, lat, lon, SIZES["sounding"](t), HALF_H["sounding"]))
    for lat, lon, t in contours:
        items.append(("contour", t, lat, lon, SIZES["contour"](t), HALF_H["contour"]))
    for lat, lon, name, size in places:
        k = {"lg": "place_lg", "sm": "place_sm"}.get(size, "place")
        items.append((k, name, lat, lon, SIZES[k](name), HALF_H[k]))
    for lat, lon, t in lanes:
        items.append(("lane", t, lat, lon, SIZES["lane"](t), HALF_H["lane"]))
    return items


def overlap(a, b):
    _, ta, la, oa, aw, ah = a
    _, tb, lb, ob, bw, bh = b
    dx = abs(oa - ob) * Z9_PX_PER_DEG_LON
    dy = abs(la - lb) * px_per_deg_lat((la + lb) / 2)
    gap_x = dx - (aw + bw)
    gap_y = dy - (ah + bh)
    return gap_x < MARGIN and gap_y < MARGIN, gap_x, gap_y


def main():
    soundings, contours, places, lanes = parse()
    items = boxes(soundings, contours, places, lanes)
    n = 0
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            a, b = items[i], items[j]
            # abaikan pasangan label lane dengan apapun (memang overlay garis)
            if a[0] == "lane" or b[0] == "lane":
                continue
            hit, gx, gy = overlap(a, b)
            if hit:
                n += 1
                print(
                    f"[TABRAKAN] {a[0]} '{a[1]}' ({a[2]:.3f},{a[3]:.3f}) <-> "
                    f"{b[0]} '{b[1]}' ({b[2]:.3f},{b[3]:.3f})  gapx={gx:.1f} gapy={gy:.1f}"
                )
    print(f"\nTotal tabrakan: {n}  (soundings={len(soundings)}, contours={len(contours)}, places={len(places)})")
    sys.exit(0 if n == 0 else 1)


if __name__ == "__main__":
    main()
