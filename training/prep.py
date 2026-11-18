"""Build data/proc/{imgs.npy,meta.csv} from the raw datasets, with leakage checks.

Sources: odir (train pool, patient-grouped), amdnet23 (train pool), rfmid (EXTERNAL test only).
Leakage controls: pHash near-duplicate removal across sources, hash-cluster groups for splitting.
"""
from __future__ import annotations

import json
from multiprocessing import Pool
from pathlib import Path

import imagehash
import numpy as np
import pandas as pd
from PIL import Image
from scipy.ndimage import gaussian_filter, zoom
from sklearn.model_selection import StratifiedGroupKFold

from common import square_crop_resize

RAW = Path(__file__).resolve().parents[1] / "data/raw"
OUT = Path(__file__).resolve().parents[1] / "data/proc"
XHAM = 4  # candidate threshold (64-bit pHash hamming); candidates verified by vessel correlation >= CORR
IHAM = 4
CORR = 0.90


def load(p: str) -> tuple[np.ndarray, int]:
    im = square_crop_resize(Image.open(p))
    return np.asarray(im, dtype=np.uint8), int(str(imagehash.phash(im)), 16)


def collect() -> pd.DataFrame:
    rows = []
    odir = RAW / "odir/odir"
    df = pd.read_csv(odir / "full_df.csv")
    for _, r in df.iterrows():
        left = "_left" in r["filename"]
        kw = str(r["Left-Diagnostic Keywords" if left else "Right-Diagnostic Keywords"]).lower()
        p = odir / "ODIR-5K/ODIR-5K/Training Images" / r["filename"]
        if p.exists():
            rows.append(dict(source="odir", path=str(p), label=int("macular degeneration" in kw), group=f"odir_{r['ID']}", extra=kw))
    for p in sorted((RAW / "amdnet23").rglob("*")):
        if p.suffix.lower() in {".jpg", ".jpeg", ".png"}:
            cls = p.parent.name.lower()
            rows.append(dict(source="amdnet23", path=str(p), label=int(cls == "amd"), group=None, extra=cls))
    rf = RAW / "rfmid/challenge/rfmid"
    for split, lab in (("a. Training Set", "a. RFMiD_Training_Labels.csv"), ("b. Validation Set", "b. RFMiD_Validation_Labels.csv"), ("c. Testing Set", "c. RFMiD_Testing_Labels.csv")):
        lb = pd.read_csv(rf / "2. Groundtruths" / lab, encoding="utf-8-sig")
        for _, r in lb.iterrows():
            p = next(iter((rf / "1. Original Images" / split).glob(f"{r['ID']}.*")), None)
            if p is None:
                continue
            # positive = ARMD; negative = healthy (Disease_Risk==0); other-disease images kept but flagged
            kind = "pos" if r["ARMD"] == 1 else ("neg" if r["Disease_Risk"] == 0 else "other")
            rows.append(dict(source="rfmid", path=str(p), label=int(r["ARMD"] == 1), group=f"rfmid_{r['ID']}", extra=kind))
    return pd.DataFrame(rows)


_F: dict = {}


def feat(imgs: np.ndarray, i: int) -> np.ndarray:
    if i not in _F:
        g = zoom(imgs[i][:, :, 1].astype(np.float32), 64 / 224, order=1)
        g = g - gaussian_filter(g, 4)
        _F[i] = ((g - g.mean()) / (g.std() + 1e-6)).ravel()
    return _F[i]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    meta = collect()
    print("collected:\n", meta.groupby(["source", "label"]).size())
    with Pool(8) as pool:
        res = pool.map(load, meta["path"].tolist(), chunksize=32)
    imgs = np.stack([r[0] for r in res])
    meta["hash"] = [r[1] for r in res]

    def ham(a: np.ndarray, b: int) -> np.ndarray:  # popcount of xor
        x = np.bitwise_xor(a, np.uint64(b))
        return np.array([bin(int(v)).count("1") for v in x])

    H = meta["hash"].to_numpy(dtype=np.uint64)
    rf_idx = np.where(meta.source == "rfmid")[0]
    drop = np.zeros(len(meta), bool)
    report: dict = {}
    # 1) cross-source: any training-pool image near-identical to an RFMiD image is a leak -> drop
    for src in ("odir", "amdnet23"):
        idx = np.where(meta.source == src)[0]
        n = 0
        for i in idx:
            d = ham(H[rf_idx], int(H[i]))
            if any(feat(imgs, i) @ feat(imgs, j) / 4096 >= CORR for j in rf_idx[d <= XHAM]):
                drop[i] = True; n += 1
        report[f"{src}_dropped_as_rfmid_duplicates"] = n
    # 2) amdnet23 images near-identical to ODIR -> drop the amdnet23 copy (ODIR has patient ids)
    od = np.where((meta.source == "odir") & ~drop)[0]
    am = np.where((meta.source == "amdnet23") & ~drop)[0]
    n = 0
    for i in am:
        d = ham(H[od], int(H[i]))
        if any(feat(imgs, i) @ feat(imgs, j) / 4096 >= CORR for j in od[d <= XHAM]):
            drop[i] = True; n += 1
    report["amdnet23_dropped_as_odir_duplicates"] = n
    # 3) group images: union (a) verified near-duplicates and (b) images of the same ODIR patient,
    #    in ONE union-find so a patient and a duplicate cluster can never be split apart.
    parent = list(range(len(meta)))

    def find(x: int) -> int:  # iterative, with path compression
        r = x
        while parent[r] != r:
            r = parent[r]
        while parent[x] != r:
            parent[x], x = r, parent[x]
        return r

    def union(a: int, b: int) -> None:
        parent[find(a)] = find(b)

    pool_idx = np.where((meta.source != "rfmid") & ~drop)[0]
    dup_pairs = []
    for k, i in enumerate(pool_idx):
        d = ham(H[pool_idx[k + 1 :]], int(H[i])) if k + 1 < len(pool_idx) else np.array([])
        for j in pool_idx[k + 1 :][d <= IHAM]:
            if feat(imgs, i) @ feat(imgs, j) / 4096 >= CORR:
                union(i, j); dup_pairs.append((int(i), int(j)))
    first_of: dict = {}
    for i in pool_idx:
        pid = meta.at[i, "group"]
        if isinstance(pid, str):
            if pid in first_of:
                union(i, first_of[pid])
            else:
                first_of[pid] = i
    meta["patient"] = meta["group"]
    meta["group"] = [f"g{find(i)}" for i in range(len(meta))]
    meta.loc[meta.source == "rfmid", "group"] = meta.loc[meta.source == "rfmid", "path"].map(
        lambda p: "rfmid_" + p.split("/1. Original Images/")[1].split("/")[0][:1] + "_" + Path(p).stem)
    meta["dropped_leak"] = drop
    # 4) split pool: group-stratified 70/15/15
    pool_df = meta.loc[pool_idx]
    sgk = StratifiedGroupKFold(n_splits=20, shuffle=True, random_state=0)
    meta["split"] = ""
    meta.loc[meta.source == "rfmid", "split"] = "external"
    meta.loc[drop, "split"] = "dropped"
    for f, (_, te) in enumerate(sgk.split(pool_df, pool_df.label, pool_df.group)):
        meta.loc[pool_df.index[te], "split"] = "test" if f < 3 else ("val" if f < 6 else "train")
    # independent sanity checks (not derived from the final group column)
    pool = meta[meta.split.isin(["train", "val", "test"])]
    report["odir_patients_spanning_splits"] = int((pool[pool.source == "odir"].groupby("patient").split.nunique() > 1).sum())
    report["verified_duplicate_pairs"] = len(dup_pairs)
    report["duplicate_pairs_spanning_splits"] = int(sum(meta.at[i, "split"] != meta.at[j, "split"] for i, j in dup_pairs))
    report["groups_spanning_splits"] = int((pool.groupby("group").split.nunique() > 1).sum())
    report["counts"] = {f"{s}/{sp}/{l}": int(n) for (s, sp, l), n in meta.groupby(["source", "split", "label"]).size().items()}
    np.save(OUT / "imgs.npy", imgs)
    meta.drop(columns=["path"]).to_csv(OUT / "meta.csv", index=False)
    (OUT / "prep_report.json").write_text(json.dumps(report, indent=1))
    print(json.dumps(report, indent=1))


if __name__ == "__main__":
    main()
