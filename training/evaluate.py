"""Threshold chosen on VAL only; report internal TEST and EXTERNAL RFMiD with bootstrap CIs, calibration, per-source."""
import json, numpy as np, pandas as pd, torch, torch.nn.functional as F
from sklearn.metrics import roc_auc_score, brier_score_loss
from common import CamResNet, MEAN, STD
P="../data/proc"; dev=torch.device("mps" if torch.backends.mps.is_available() else "cpu")
meta=pd.read_csv(f"{P}/meta.csv"); imgs=np.load(f"{P}/imgs.npy",mmap_mode="r")
m=CamResNet(False).to(dev); m.load_state_dict(torch.load("out/resnet18_best.pt")); m.eval()
mean=torch.tensor(MEAN,device=dev).view(1,3,1,1); std=torch.tensor(STD,device=dev).view(1,3,1,1)
@torch.no_grad()
def pred(idx):
    o=[]
    for k in range(0,len(idx),128):
        x=torch.from_numpy(np.stack([imgs[i] for i in idx[k:k+128]])).to(dev).permute(0,3,1,2).float()/255
        o.append(F.softmax(m((x-mean)/std)[0],1)[:,1].cpu())
    return torch.cat(o).numpy()
meta["p"]=np.nan
for s in ("val","test","external"):
    i=np.where(meta.split==s)[0]; meta.loc[i,"p"]=pred(i)
v=meta[meta.split=="val"]
ts=np.linspace(.01,.99,99); j=[((v.p[v.label==1]>=t).mean()+(v.p[v.label==0]<t).mean()-1) for t in ts]
thr=float(ts[int(np.argmax(j))])
def ece(y,p,b=10):
    e=0
    for lo in np.linspace(0,1,b,endpoint=False):
        k=(p>=lo)&(p<lo+1/b)
        if k.any(): e+=k.mean()*abs(y[k].mean()-p[k].mean())
    return e
def rep(d,name,rng=np.random.default_rng(0)):
    y=d.label.values; p=d.p.values; r={"n":len(d),"pos":int(y.sum())}
    def stats(y,p):
        return roc_auc_score(y,p),(p[y==1]>=thr).mean(),(p[y==0]<thr).mean()
    r["auroc"],r["sens"],r["spec"]=stats(y,p); bs=[]
    for _ in range(1000):
        k=rng.integers(0,len(y),len(y))
        if y[k].min()==y[k].max(): continue
        bs.append(stats(y[k],p[k]))
    lo,hi=np.percentile(bs,[2.5,97.5],axis=0)
    r["ci95"]={"auroc":[lo[0],hi[0]],"sens":[lo[1],hi[1]],"spec":[lo[2],hi[2]]}
    r["brier"]=brier_score_loss(y,p); r["ece"]=ece(y,p); return {name:r}
res={"threshold_from_val":thr}
res.update(rep(meta[meta.split=="test"],"internal_test"))
for s in ("odir","amdnet23"): res.update(rep(meta[(meta.split=="test")&(meta.source==s)],f"internal_test_{s}"))
ex=meta[meta.split=="external"]
res.update(rep(ex[ex.extra!="other"],"external_rfmid_pos_vs_healthy"))
res.update(rep(ex,"external_rfmid_pos_vs_all_nonAMD"))
o=ex[ex.extra=="other"]; res["rfmid_other_disease_false_flag_rate"]=float((o.p>=thr).mean())
res["amd_prevalence_by_source"]=meta[meta.split.isin(["train","val","test"])].groupby("source").label.mean().to_dict()
json.dump(res,open("out/eval.json","w"),indent=1,default=float); print(json.dumps(res,indent=1,default=lambda x:round(float(x),4)))
