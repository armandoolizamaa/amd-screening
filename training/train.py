"""Train CamResNet (ResNet-18) on the leak-checked pool. Selects best epoch by VAL AUROC only."""
import math, sys, time
import numpy as np, pandas as pd, torch, torch.nn.functional as F
from sklearn.metrics import roc_auc_score
from common import CamResNet, MEAN, STD

P = "../data/proc"; EPOCHS = int(sys.argv[1]) if len(sys.argv) > 1 else 12; BS = 64
dev = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
torch.manual_seed(0); np.random.seed(0)
meta = pd.read_csv(f"{P}/meta.csv"); imgs = np.load(f"{P}/imgs.npy", mmap_mode="r")
def sel(s): i = np.where(meta.split == s)[0]; return i, meta.label.values[i]
tri, trl = sel("train"); vai, val = sel("val")
mean = torch.tensor(MEAN, device=dev).view(1,3,1,1); std = torch.tensor(STD, device=dev).view(1,3,1,1)
def prep(idx, aug):
    x = torch.from_numpy(np.stack([imgs[i] for i in idx])).to(dev).permute(0,3,1,2).float()/255
    if aug:
        b = x.shape[0]
        x = torch.where(torch.rand(b,1,1,1,device=dev)<.5, x.flip(3), x)
        x = torch.where(torch.rand(b,1,1,1,device=dev)<.5, x.flip(2), x)
        a = (torch.rand(b,device=dev)-.5)*2*math.radians(20); s = 1+(torch.rand(b,device=dev)-.5)*.2
        th = torch.stack([torch.stack([s*a.cos(), -s*a.sin(), torch.zeros_like(a)],1), torch.stack([s*a.sin(), s*a.cos(), torch.zeros_like(a)],1)],1)
        x = F.grid_sample(x, F.affine_grid(th, x.shape, align_corners=False), padding_mode="zeros", align_corners=False)
        x = (x*(1+(torch.rand(b,1,1,1,device=dev)-.5)*.3) + (torch.rand(b,1,1,1,device=dev)-.5)*.1).clamp(0,1)
    return (x-mean)/std
@torch.no_grad()
def predict(m, idx):
    m.eval(); out=[]
    for k in range(0,len(idx),128): out.append(F.softmax(m(prep(idx[k:k+128],False))[0],1)[:,1].cpu())
    return torch.cat(out).numpy()
m = CamResNet(True).to(dev)
w = torch.tensor([1.0, (trl==0).sum()/(trl==1).sum()], device=dev, dtype=torch.float32).clamp(max=8)
print("train n", len(tri), "pos", int(trl.sum()), "val n", len(vai), "pos", int(val.sum()), "class w", w.tolist(), "dev", dev)
opt = torch.optim.AdamW(m.parameters(), lr=3e-4, weight_decay=1e-4)
sched = torch.optim.lr_scheduler.OneCycleLR(opt, 3e-4, total_steps=EPOCHS*math.ceil(len(tri)/BS))
best = -1
for ep in range(EPOCHS):
    m.train(); t=time.time(); perm=np.random.permutation(len(tri)); tot=0
    for k in range(0,len(perm),BS):
        b=perm[k:k+BS]; x=prep(tri[b],True); y=torch.from_numpy(trl[b]).to(dev)
        loss=F.cross_entropy(m(x)[0],y,weight=w); opt.zero_grad(); loss.backward(); opt.step(); sched.step(); tot+=loss.item()*len(b)
    auc=roc_auc_score(val,predict(m,vai))
    print(f"ep{ep+1} loss {tot/len(tri):.4f} val_auroc {auc:.4f} {time.time()-t:.0f}s", flush=True)
    if auc>best: best=auc; torch.save(m.state_dict(),"out/resnet18_best.pt")
print("best val auroc", best)
