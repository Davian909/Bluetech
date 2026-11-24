#!/usr/bin/env python3
"""Penempatan otomatis titik ukur kedalaman (soundings) peta laut Selat Sunda.

Setiap titik digeser spiral dari posisi anchor menuju spot terdekat yang:
  1. berada di AIR (tidak di dalam polygon Sumatera/Jawa/pulau-pulau),
  2. berjarak >= MARGIN px dari kotak label sounding lain,
  3. berjarak >= MARGIN px dari kotak label TETAP (nama tempat, kontur,
     graticule, label alur),
  4. tetap dekat anchor (radius terbatas) supaya pola batimetri tidak berubah.

Output: array TSX siap tempel untuk konstanta SOUNDINGS.
"""
import math
import re
import sys

TSX = "/home/z/my-project/src/components/bluetech/nautical-chart.tsx"
PX_DEG = 364.1          # px per derajat bujur pada zoom 9
MARGIN = 4.0            # px jarak minimum antar kotak (aman utk pembulatan 3 desimal)
STEP = 0.012            # derajat per langkah spiral

# ---------------- polygon daratan (disalin dari nautical-chart.tsx) ----------------

SUMATRA = [
    [-5.855, 105.775], [-5.81, 105.83], [-5.76, 105.92], [-5.71, 106.02], [-5.5, 106.1],
    [-5.5, 104.63], [-5.65, 104.66], [-5.78, 104.7], [-5.88, 104.74], [-5.96, 104.8],
    [-6.03, 104.86], [-6.08, 104.92], [-6.11, 105.0], [-6.12, 105.08], [-6.11, 105.16],
    [-6.09, 105.24], [-6.06, 105.32], [-6.02, 105.4], [-5.98, 105.47], [-5.93, 105.58],
    [-5.89, 105.68],
]
JAVA = [
    [-6.786, 105.197], [-6.755, 105.26], [-6.715, 105.335], [-6.685, 105.42], [-6.6, 105.5],
    [-6.52, 105.58], [-6.42, 105.68], [-6.3, 105.78], [-6.2, 105.84], [-6.1, 105.9],
    [-6.02, 105.94], [-5.94, 105.985], [-5.9, 106.06], [-5.88, 106.16], [-5.875, 106.3],
    [-5.87, 106.5], [-5.86, 106.75], [-7.3, 106.85], [-7.22, 106.7], [-7.15, 106.55],
    [-7.1, 106.4], [-7.06, 106.25], [-7.0, 106.1], [-6.97, 105.95], [-6.94, 105.8],
    [-6.91, 105.65], [-6.885, 105.52], [-6.86, 105.4], [-6.83, 105.3], [-6.8, 105.22],
]
ISLANDS = [
    [[-6.575, 105.255], [-6.585, 105.33], [-6.61, 105.35], [-6.645, 105.34], [-6.665, 105.3], [-6.655, 105.25], [-6.62, 105.225], [-6.59, 105.225]],
    [[-6.755, 105.255], [-6.755, 105.29], [-6.78, 105.295], [-6.79, 105.27], [-6.78, 105.25]],
    [[-6.635, 105.465], [-6.635, 105.485], [-6.655, 105.49], [-6.66, 105.47], [-6.65, 105.46]],
    [[-6.575, 105.525], [-6.575, 105.545], [-6.595, 105.55], [-6.6, 105.53], [-6.585, 105.52]],
    [[-6.115, 105.385], [-6.125, 105.4], [-6.135, 105.415], [-6.125, 105.425], [-6.11, 105.415], [-6.105, 105.4]],
    [[-6.135, 105.425], [-6.145, 105.445], [-6.155, 105.455], [-6.17, 105.445], [-6.175, 105.425], [-6.165, 105.405], [-6.15, 105.4], [-6.14, 105.41]],
    [[-6.105, 105.418], [-6.105, 105.428], [-6.115, 105.43], [-6.118, 105.422], [-6.112, 105.416]],
    [[-6.02, 105.48], [-6.02, 105.51], [-6.04, 105.53], [-6.06, 105.52], [-6.065, 105.49], [-6.05, 105.47]],
    [[-6.1, 105.47], [-6.1, 105.49], [-6.12, 105.495], [-6.125, 105.48], [-6.115, 105.465]],
]
LAND_POLYS = [SUMATRA, JAVA] + ISLANDS

# ---------------- label tetap (posisi BARU yang sudah dirancang) ----------------
# (lat, lon, half_w_px, half_h_px)

PLACES = [
    (-6.0, 105.70, 90.9, 10.0),     # Selat Sunda (lg) - selat bagian utara, all water
    (-7.02, 105.24, 114.6, 10.0),   # Samudra Hindia (lg)
    (-5.85, 105.36, 62.4, 8.0),     # Lampung (Sumatera)
    (-6.2, 106.15, 65.7, 8.0),      # Banten (Jawa Barat)
    (-6.845, 105.40, 39.3, 8.0),    # Ujung Kulon (di daratan)
    (-6.60, 105.30, 49.2, 8.0),     # Pulau Panaitan (di pulau)
    (-6.78, 105.245, 39.4, 7.0),    # Pulau Peucang (di pulau, sm)
    (-6.19, 105.42, 50.0, 8.0),     # Gugus Krakatau (tepat selatan gugus)
    (-6.045, 105.415, 40.0, 8.0),   # Pulau Sebesi (barat pulau)
    (-6.125, 105.53, 36.6, 7.0),    # Pulau Sebuku (di pulau, sm)
    (-5.975, 106.045, 17.0, 7.0),   # Merak (sm)
    (-5.805, 105.785, 28.2, 7.0),   # Bakauheni (sm)
    (-6.11, 105.915, 17.0, 7.0),    # Anyer (sm)
]
CONTOURS = [
    (-6.265, 105.80, 10.5, 8.0), (-6.10, 105.30, 10.5, 8.0), (-6.845, 105.25, 10.5, 8.0),
    (-6.33, 105.75, 10.5, 8.0), (-6.175, 105.24, 10.5, 8.0),
    (-6.395, 105.72, 10.5, 8.0), (-6.335, 105.345, 10.5, 8.0), (-6.07, 105.615, 10.5, 8.0),
    (-6.16, 105.83, 13.8, 8.0), (-6.245, 105.48, 13.8, 8.0), (-6.99, 105.96, 13.8, 8.0),
    (-6.37, 105.66, 13.8, 8.0), (-7.0, 105.845, 13.8, 8.0),
]
GRAT_LATS = [-5.8, -6.0, -6.2, -6.4, -6.6, -6.8, -7.0]
GRAT_LNGS = [104.8, 105.2, 105.4, 105.6, 105.8, 106.0, 106.2, 106.4, 106.6]
GRATICULE = [(la, 105.13, 22.0, 7.0) for la in GRAT_LATS] + [(-7.05, ln, 22.0, 7.0) for ln in GRAT_LNGS]
LANES = [(-6.13, 105.64, 95.7, 7.0), (-5.93, 105.89, 75.4, 7.0)]
FIXED = PLACES + CONTOURS + GRATICULE + LANES

# titik yang DIBUANG (kantong terlalu padat - mengorbankan 6 dari 82 agar layout bersih)
DROP = {
    (-6.09, 105.44, 33), (-6.14, 105.36, 36), (-6.11, 105.24, 57),
    (-6.16, 105.5, 62), (-6.12, 105.46, 64), (-6.05, 105.28, 44),
}

# anchor khusus (koreksi manual sebelum penempatan)
ANCHOR_OVERRIDES = {
    (-6.2, 105.42, 52): (-6.21, 105.435),   # duplikat persis dgn 71
    (-5.68, 106.48, 39): (-5.70, 106.47),   # terlalu mepet tepi atas peta
    (-5.8, 105.88, 19): (-5.86, 105.98),    # kantong Bakauheni sempit - pindah ke muara selat
    (-6.02, 105.52, 38): (-5.985, 105.52),  # terjepit label Sebesi/Krakatau/alur - geser utara
    (-5.98, 105.54, 38): (-6.005, 105.57),  # kantong pesisir Sibesa sempit - pindah ke utara Pulau Sebesi
}


def point_in_poly(lat, lon, poly):
    inside = False
    n = len(poly)
    j = n - 1
    for i in range(n):
        yi, xi = poly[i]
        yj, xj = poly[j]
        if (yi > lat) != (yj > lat):
            xint = xi + (lat - yi) * (xj - xi) / (yj - yi)
            if lon < xint:
                inside = not inside
        j = i
    return inside


def in_water(lat, lon):
    for poly in LAND_POLYS:
        if point_in_poly(lat, lon, poly):
            return False
    # clearance pantai kasar: 8 tetangga juga harus air
    d = 0.012
    for dlat in (-d, 0, d):
        for dlon in (-d, 0, d):
            if dlat == 0 and dlon == 0:
                continue
            for poly in LAND_POLYS:
                if point_in_poly(lat + dlat, lon + dlon, poly):
                    return False
    return True


def half_w(lat, lon, d):
    return (6.5 * len(str(d)) + 5) / 2


def half_h(_):
    return 7.0


def clear_of_box(lat, lon, hw, hh, blat, blon, bhw, bhh, margin=MARGIN):
    dx = abs(lon - blon) * PX_DEG
    dy = abs(lat - blat) * (PX_DEG / math.cos(math.radians((lat + blat) / 2)))
    return (dx - (hw + bhw) >= margin) or (dy - (hh + bhh) >= margin)


def find_spot(lat0, lon0, d, placed, radius, debug=False):
    hw, hh = half_w(lat0, lon0, d), half_h(d)
    k = int(radius / STEP)
    offsets = []
    for i in range(-k, k + 1):
        for j in range(-k, k + 1):
            off = (i * STEP, j * STEP)
            r = math.hypot(off[0], off[1])
            if r <= radius:
                offsets.append((r, off[0], off[1]))
    # spiral: pendek dulu; selang-seling arah agar tidak serong ke satu sisi
    offsets.sort(key=lambda t: (round(t[0], 4), (t[1] + t[2])))
    n_water = n_fixed = n_placed = 0
    for _, dla, dlo in offsets:
        lat, lon = lat0 + dla, lon0 + dlo
        if not in_water(lat, lon):
            n_water += 1
            continue
        blockers = [
            (plat, plon, phw, phh)
            for plat, plon, phw, phh in placed + FIXED
            if not clear_of_box(lat, lon, hw, hh, plat, plon, phw, phh)
        ]
        if blockers:
            if any((plat, plon) in [(f[0], f[1]) for f in FIXED] for plat, plon, _, _ in blockers):
                n_fixed += 1
            else:
                n_placed += 1
            continue
        if debug:
            print(f"  OK di ({lat:.3f},{lon:.3f}) r={math.hypot(dla, dlo):.3f}")
        return lat, lon
    if debug:
        print(f"  DEBUG d={d}: {len(offsets)} kandidat | ditolak air={n_water} fixed={n_fixed} placed={n_placed}")
    return None


def parse_soundings():
    src = open(TSX, encoding="utf-8").read()
    # hanya blok const SOUNDINGS
    m = re.search(r"const SOUNDINGS[^=]*=\s*\[(.*?)\];", src, re.S)
    body = m.group(1)
    pts = []
    for pm in re.finditer(r"\{\s*lat:\s*(-?[\d.]+),\s*lon:\s*(-?[\d.]+),\s*d:\s*(\d+)\s*\}", body):
        pts.append((float(pm.group(1)), float(pm.group(2)), int(pm.group(3))))
    return pts


def main():
    pts = parse_soundings()
    pts = [p for p in pts if (round(p[0], 3), round(p[1], 3), p[2]) not in DROP]
    # urutan: titik dalam (d>=200) dulu supaya dapat posisi prime
    deep = [p for p in pts if p[2] >= 200]
    rest = [p for p in pts if p[2] < 200]

    def prio(i, p):
        lat0, lon0, d = p
        in_pocket = -6.12 <= lat0 <= -5.95 and 105.4 <= lon0 <= 105.8
        if d in (38,):
            return 2  # paling fleksibel - terakhir
        return 1 if in_pocket else 3

    rest_sorted = sorted(range(len(rest)), key=lambda i: (prio(i, rest[i]), i))
    ordered = deep + [rest[i] for i in rest_sorted]

    placed = []  # (lat, lon, hw, hh)
    out = []
    for lat0, lon0, d in ordered:
        key = (round(lat0, 3), round(lon0, 3), d)
        if key in ANCHOR_OVERRIDES:
            lat0, lon0 = ANCHOR_OVERRIDES[key]
        if d >= 200:
            radius = 0.26
        elif d >= 100:
            radius = 0.22
        else:
            radius = 0.2
        spot = find_spot(lat0, lon0, d, placed, radius, debug=(d == 38))
        if spot is None:  # fallback: perbesar radius bertahap
            for extra in (0.06, 0.12):
                spot = find_spot(lat0, lon0, d, placed, radius + extra)
                if spot is not None:
                    print(f"  [fallback] d={d} dari ({lat0},{lon0}) + radius {extra:.2f}")
                    break
        if spot is None:
            print(f"GAGAL menempatkan d={d} dari ({lat0},{lon0})", file=sys.stderr)
            sys.exit(1)
        lat, lon = round(spot[0], 3), round(spot[1], 3)
        placed.append((lat, lon, half_w(lat, lon, d), half_h(d)))
        out.append((lat, lon, d, math.hypot(lat - lat0, lon - lon0)))

    # verifikasi akhir antar sounding (margin 3)
    bad = 0
    for i in range(len(placed)):
        for j in range(i + 1, len(placed)):
            a, b = placed[i], placed[j]
            dx = abs(a[1] - b[1]) * PX_DEG
            dy = abs(a[0] - b[0]) * (PX_DEG / math.cos(math.radians((a[0] + b[0]) / 2)))
            if dx - (a[2] + b[2]) < 3 and dy - (a[3] + b[3]) < 3:
                bad += 1
                print(f"[RESIDU] {out[i][2]} <-> {out[j][2]}  dx={dx:.1f} dy={dy:.1f}")
    # verifikasi vs fixed
    for i, (lat, lon, hw, hh) in enumerate(placed):
        for blat, blon, bhw, bhh in FIXED:
            if not clear_of_box(lat, lon, hw, hh, blat, blon, bhw, bhh, margin=2.0):
                bad += 1
                print(f"[RESIDU-FIXED] d={out[i][2]} ({lat},{lon}) vs fixed ({blat},{blon})")
    # verifikasi vs daratan
    for lat, lon, hw, hh in placed:
        if not in_water(lat, lon):
            bad += 1
            print(f"[RESIDU-DARAT] d di ({lat},{lon})")

    print(f"\nTotal: {len(out)} titik | residu: {bad}")

    # ---- keluarkan array TSX, dikelompokkan per wilayah ----
    def region(lat, lon, d):
        if lat > -5.92:
            return "Selat bagian timur laut (Merak-Bakauheni & muara)"
        if d >= 200:
            return "Cekungan dalam (palung tengah selat)"
        if lat < -6.85:
            return "Samudra Hindia (selatan Jawa - makin dalam ke lepas pantai)"
        if -6.05 >= lat >= -6.32 and 105.2 <= lon <= 105.66:
            return "Gugus Krakatau"
        if lon < 105.45 and lat < -6.4:
            return "Pendekatan Ujung Kulon & Panaitan"
        if lon >= 105.45:
            return "Lereng selatan (Banten-Anyer) & badan selat"
        return "Perairan Lampung (Sibesa-Bakauheni)"

    lines = []
    cur = None
    for lat, lon, d, disp in out:
        r = region(lat, lon, d)
        if r != cur:
            if cur is not None:
                lines.append("")
            lines.append(f"  // {r}")
            cur = r
        lines.append(f"  {{ lat: {lat}, lon: {lon}, d: {d} }},")
    print("\n/* ------------------- Titik ukur kedalaman (soundings) ------------------- */\n")
    print("const SOUNDINGS: { lat: number; lon: number; d: number }[] = [")
    print("\n".join(lines))
    print("];")
    sys.exit(0 if bad == 0 else 2)


if __name__ == "__main__":
    main()
