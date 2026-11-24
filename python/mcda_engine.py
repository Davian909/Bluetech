#!/usr/bin/env python3
# =====================================================================
# Bluetech — Python MCDA Engine (NumPy)
# ---------------------------------------------------------------------
# Dipanggil dari Next.js API route (/api/mcda) melalui stdin/stdout JSON.
#
# Tanggung jawab:
#   1. Re-computation weighted overlay (validasi silang mesin JS vs Python)
#   2. Monte Carlo uncertainty analysis (vektorisasi NumPy) — sensitivitas
#      skor kesesuaian terhadap ketidakpastian data spasial
#   3. Probabilitas kelas S1/S2/S3/N per sel & stabilitas kesimpulan
#
# Semua data adalah DEMO. Bukan hasil kajian resmi.
# =====================================================================

import json
import sys

import numpy as np


def main() -> None:
    payload = json.load(sys.stdin)

    crit_ids = payload["critIds"]                     # ["kedalaman", ...]
    crit_labels = payload["critLabels"]               # {"kedalaman": "Kedalaman", ...}
    weights = np.asarray(payload["weights"], dtype=np.float64)   # bobot ternormalisasi
    X = np.asarray(payload["X"], dtype=np.float32)    # (nCells, nCrit) skor kriteria 0-100
    js_scores = np.asarray(payload["jsScores"], dtype=np.float32)  # skor mesin JS (referensi)
    thr = payload["threshold"]                        # {"s1":78,"s2":62,"s3":47}
    n_iter = int(payload.get("nIter", 3000))
    sigma = float(payload.get("sigma", 4.0))          # std ketidakpastian skor kriteria
    seed = int(payload.get("seed", 42))
    latlons = payload.get("latlons")                  # [[lat, lon], ...] opsional

    n_cells, n_crit = X.shape

    # ---------- 1) Validasi silang: weighted overlay NumPy vs JS ----------
    py_scores = np.clip(X @ weights, 0.0, 100.0)
    diff = np.abs(py_scores - js_scores)
    agreement = {
        "meanDiff": float(diff.mean()),
        "maxDiff": float(diff.max()),
        "pctWithin1": float((diff <= 1.0).mean() * 100.0),
    }

    def classify(scores: np.ndarray):
        # return kelas 0..3 (S1, S2, S3, N)
        k = np.ones(scores.shape, dtype=np.int8)          # default N
        k[scores >= thr["s3"]] = 2
        k[scores >= thr["s2"]] = 1
        k[scores >= thr["s1"]] = 0
        return k

    js_classes = classify(js_scores)

    # ---------- 2) Monte Carlo uncertainty (vektorisasi) ----------
    rng = np.random.default_rng(seed)
    # generasi noise per batch agar hemat memori: (nIter, nCells, nCrit) terlalu besar
    # -> akumulasi kelas per iterasi (nIter, nCells) uint8 -> prob per kelas
    counts = np.zeros((4, n_cells), dtype=np.float32)
    s1_share = np.empty(n_iter, dtype=np.float64)
    iter_mean = np.empty(n_iter, dtype=np.float64)
    pooled_hist = np.zeros(20, dtype=np.int64)

    chunk = 500
    for start in range(0, n_iter, chunk):
        end = min(start + chunk, n_iter)
        m = end - start
        noise = rng.normal(0.0, sigma, size=(m, n_cells, n_crit)).astype(np.float32)
        Xn = np.clip(X[None, :, :] + noise, 0.0, 100.0)
        S = np.clip(Xn @ weights, 0.0, 100.0)             # (m, nCells)
        C = (
            np.ones(S.shape, dtype=np.int8)
        )
        C[S >= thr["s3"]] = 2
        C[S >= thr["s2"]] = 1
        C[S >= thr["s1"]] = 0
        for k in range(4):
            counts[k] += (C == k).sum(axis=0).astype(np.float32)
        s1_share[start:end] = (C == 0).mean(axis=1)
        iter_mean[start:end] = S.mean(axis=1)
        pooled_hist += np.histogram(S, bins=20, range=(0.0, 100.0))[0]

    probs = counts / float(n_iter)                        # (4, nCells)
    stability = probs.max(axis=0)                         # prob kelas dominan per sel

    # statistik global
    ci95 = 1.96 * float(iter_mean.std(ddof=1)) / np.sqrt(n_iter)
    global_stats = {
        "mean": float(iter_mean.mean()),
        "std": float(iter_mean.std(ddof=1)),
        "ci95": float(ci95),
        "s1ShareMean": float(s1_share.mean()),
        "s1ShareStd": float(s1_share.std(ddof=1)),
        "hist": {
            "bins": [round(b, 1) for b in np.linspace(0, 100, 21).tolist()],
            "counts": pooled_hist.tolist(),
        },
    }

    # ---------- 3) Sensitivitas per kriteria ----------
    # kontribusi = skor * bobot; sensitivitas ~ std(kontribusi) di seluruh sel
    contrib = X * weights[None, :].astype(np.float32)
    sens = contrib.std(axis=0)
    order = np.argsort(-sens)
    sens_rank = [
        {
            "id": crit_ids[i],
            "label": crit_labels[crit_ids[i]],
            "sens": float(sens[i]),
            "norm": float(sens[i] / sens.max() * 100.0) if sens.max() > 0 else 0.0,
        }
        for i in order
    ]

    # ---------- 4) Sel paling tidak stabil (untuk peta/daftar) ----------
    unstable_idx = np.argsort(stability)[:8]
    unstable = []
    for i in unstable_idx:
        item = {"stability": float(stability[i]), "probS1": float(probs[0][i]), "probS2": float(probs[1][i]),
                "probS3": float(probs[2][i]), "probN": float(probs[3][i])}
        if latlons is not None:
            item["lat"] = latlons[i][0]
            item["lon"] = latlons[i][1]
        unstable.append(item)

    # distribusi probabilitas kelas rata-rata
    class_prob_mean = {
        name: float(probs[k].mean())
        for k, name in enumerate(["S1", "S2", "S3", "N"])
    }

    out = {
        "engine": "python3 + numpy",
        "numpyVersion": np.__version__,
        "nIter": n_iter,
        "nCells": int(n_cells),
        "nCrit": int(n_crit),
        "sigma": sigma,
        "seed": seed,
        "agreement": agreement,
        "jsClassCounts": {name: int((js_classes == k).sum())
                          for k, name in enumerate(["S1", "S2", "S3", "N"])},
        "global": global_stats,
        "classProbMean": class_prob_mean,
        "stabilityMean": float(stability.mean()),
        "stabilityMin": float(stability.min()),
        "sensitivity": sens_rank,
        "unstableCells": unstable,
        "demo": True,
    }
    json.dump(out, sys.stdout)


if __name__ == "__main__":
    main()
