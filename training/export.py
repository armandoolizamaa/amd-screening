"""Export CamResNet to ONNX (inputs: image [1,3,224,224]; outputs: logits, cam) and check parity.

  python export.py --dummy              # untrained stand-in so the web UI can be built
  python export.py --ckpt out/best.pt   # real model
"""
from __future__ import annotations

import argparse
import hashlib
from pathlib import Path

import numpy as np
import onnxruntime as ort
import torch

from common import SIZE, CamResNet

OUT = Path(__file__).parent / "out"


def export(model: CamResNet, path: Path) -> None:
    model.eval()
    x = torch.randn(1, 3, SIZE, SIZE)
    torch.onnx.export(model, (x,), str(path), input_names=["image"], output_names=["logits", "cam"],
                      opset_version=17, dynamo=False)


def parity(model: CamResNet, path: Path, n: int = 8) -> float:
    sess = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
    worst = 0.0
    with torch.no_grad():
        for _ in range(n):
            x = torch.randn(1, 3, SIZE, SIZE)
            lt, ct = model(x)
            lo, co = sess.run(None, {"image": x.numpy()})
            worst = max(worst, float(np.abs(lo - lt.numpy()).max()), float(np.abs(co - ct.numpy()).max()))
    return worst


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dummy", action="store_true")
    ap.add_argument("--ckpt", type=Path)
    args = ap.parse_args()
    OUT.mkdir(exist_ok=True)

    model = CamResNet(pretrained=args.dummy)  # dummy = ImageNet backbone + random head
    if args.ckpt:
        model.load_state_dict(torch.load(args.ckpt, map_location="cpu"))
    path = OUT / "model.onnx"
    export(model, path)
    diff = parity(model, path)
    sha = hashlib.sha256(path.read_bytes()).hexdigest()
    print(f"exported {path} ({path.stat().st_size / 1e6:.1f} MB) sha256={sha}")
    print(f"parity max abs diff = {diff:.2e} -> {'PASS' if diff < 1e-3 else 'FAIL'}")


if __name__ == "__main__":
    main()
