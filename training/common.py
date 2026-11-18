"""Shared model + preprocessing. The browser (web/src/lib/preprocess.ts) must match this exactly."""
from __future__ import annotations

import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from torchvision.models import ResNet18_Weights, resnet18

SIZE = 224
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)
CLASSES = ("normal", "amd")


def square_crop_resize(img: Image.Image, size: int = SIZE) -> Image.Image:
    """Center-crop to a square on the short side, then bilinear resize. Fundus disks span the short side."""
    img = img.convert("RGB")
    w, h = img.size
    s = min(w, h)
    left, top = (w - s) // 2, (h - s) // 2
    return img.crop((left, top, left + s, top + s)).resize((size, size), Image.BILINEAR)


def to_tensor(img: Image.Image) -> torch.Tensor:
    """224x224 RGB PIL -> normalized float tensor [3,224,224]."""
    arr = (np.asarray(img, dtype=np.float32) / 255.0 - MEAN) / STD
    return torch.from_numpy(arr.transpose(2, 0, 1).copy())


class CamResNet(nn.Module):
    """ResNet-18 that returns (logits [B,2], cam [B,7,7]).

    The CAM is (w_amd - w_normal) . layer4 features: the spatial evidence for the AMD-vs-normal
    logit margin. For GAP+FC this equals Grad-CAM on that margin up to a constant scale, so the
    browser needs no gradients.
    """

    def __init__(self, pretrained: bool = True) -> None:
        super().__init__()
        net = resnet18(weights=ResNet18_Weights.IMAGENET1K_V1 if pretrained else None)
        net.fc = nn.Linear(net.fc.in_features, len(CLASSES))
        self.net = net

    def features(self, x: torch.Tensor) -> torch.Tensor:
        n = self.net
        x = n.maxpool(n.relu(n.bn1(n.conv1(x))))
        return n.layer4(n.layer3(n.layer2(n.layer1(x))))

    def forward(self, x: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        f = self.features(x)
        logits = self.net.fc(f.mean(dim=(2, 3)))
        w = self.net.fc.weight[1] - self.net.fc.weight[0]
        cam = torch.einsum("k,bkhw->bhw", w, f)
        return logits, cam
