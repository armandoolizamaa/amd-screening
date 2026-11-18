"""ROC, calibration, score distributions and confusion matrices for the v0.1 model -> ../docs/results.png"""
import json, numpy as np, pandas as pd, torch, torch.nn.functional as F
import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
from sklearn.metrics import roc_curve, roc_auc_score
from common import CamResNet, MEAN, STD
P="../data/proc"; dev=torch.device("mps" if torch.backends.mps.is_available() else "cpu")
meta=pd.read_csv(f"{P}/meta.csv"); imgs=np.load(f"{P}/imgs.npy",mmap_mode="r")
m=CamResNet(False).to(dev); m.load_state_dict(torch.load("out/resnet18_best.pt",map_location=dev)); m.eval()
mean=torch.tensor(MEAN,device=dev).view(1,3,1,1); std=torch.tensor(STD,device=dev).view(1,3,1,1)
EV=json.load(open("out/eval.json")); thr=EV["threshold_from_val"]; CA,CB=EV["calibration"]["a"],EV["calibration"]["b"]
@torch.no_grad()
def pred(idx):
    o=[]
    for k in range(0,len(idx),128):
        x=torch.from_numpy(np.stack([imgs[i] for i in idx[k:k+128]])).to(dev).permute(0,3,1,2).float()/255
        lg=m((x-mean)/std)[0]; o.append((lg[:,1]-lg[:,0]).cpu())
    return torch.cat(o).numpy()
idx=np.where(meta.split.isin(["test","external"]))[0]; meta["p"]=np.nan; meta.loc[idx,"p"]=1/(1+np.exp(-(CA*pred(idx)+CB)))
ex=meta[meta.split=="external"]; exh=ex[ex.extra!="other"]; te=meta[meta.split=="test"]; od=te[te.source=="odir"]
sets=[("External RFMiD: AMD vs healthy",exh,"#c0392b"),("External RFMiD: AMD vs all non-AMD",ex,"#e67e22"),("Internal test, ODIR only",od,"#2471a3"),("Internal test, pooled (inflated)",te,"#7f8c8d")]
fig,ax=plt.subplots(2,2,figsize=(14,11)); fig.suptitle("AMD screening v0.2 (ResNet-18): results",fontsize=16,weight="bold")
a=ax[0,0]
for n,d,c in sets:
    f,t,_=roc_curve(d.label,d.p); a.plot(f,t,color=c,lw=2,label=f"{n} (AUROC {roc_auc_score(d.label,d.p):.3f})")
    s=(d.p[d.label==1]>=thr).mean(); sp=(d.p[d.label==0]<thr).mean(); a.plot(1-sp,s,"o",color=c,ms=7)
a.plot([0,1],[0,1],"k--",lw=1); a.set(xlabel="1 - specificity (false positive rate)",ylabel="Sensitivity (true positive rate)",title=f"ROC curves (dots = operating point at threshold {thr:.2f})"); a.legend(fontsize=8,loc="lower right"); a.grid(alpha=.3)
a=ax[0,1]; bins=np.linspace(0,1,11)
for n,d,c in sets[:1]+sets[2:3]:
    ctr,fr=[],[]
    for lo,hi in zip(bins[:-1],bins[1:]):
        k=(d.p>=lo)&(d.p<=hi if hi==1 else d.p<hi)
        if k.sum()>=5: ctr.append(d.p[k].mean()); fr.append(d.label[k].mean())
    a.plot(ctr,fr,"o-",color=c,label=n)
a.plot([0,1],[0,1],"k--",lw=1); a.set(xlabel="Mean predicted probability",ylabel="Observed AMD fraction",title="Calibration (reliability) curve; Platt-fitted on validation"); a.legend(fontsize=8); a.grid(alpha=.3)
a=ax[1,0]; b=np.linspace(0,1,26)
a.hist(exh.p[exh.label==0],bins=b,alpha=.6,color="#2e86c1",label=f"healthy (n={int((exh.label==0).sum())})",density=True)
a.hist(exh.p[exh.label==1],bins=b,alpha=.6,color="#c0392b",label=f"AMD (n={int((exh.label==1).sum())})",density=True)
a.axvline(thr,color="k",ls="--",label=f"threshold {thr:.2f}"); a.set(xlabel="Model score for AMD",ylabel="Density",title="RFMiD external: score distributions"); a.legend(fontsize=8)
a=ax[1,1]; a.axis("off")
def cm(d): y=d.label.values; fl=d.p.values>=thr; return int(((y==1)&fl).sum()),int(((y==1)&~fl).sum()),int(((y==0)&fl).sum()),int(((y==0)&~fl).sum())
rows=[]
for n,d,_ in sets:
    tp,fn,fp,tn=cm(d); rows.append([n.replace("External ","Ext. "),len(d),tp,fn,fp,tn,f"{tp/(tp+fn):.2f}",f"{tn/(tn+fp):.2f}",f"{roc_auc_score(d.label,d.p):.3f}"])
t=a.table(cellText=rows,colLabels=["Test set","n","TP","FN","FP","TN","Sens","Spec","AUROC"],loc="center",cellLoc="center",colWidths=[.34,.07,.07,.07,.07,.07,.08,.08,.1]); t.auto_set_font_size(False); t.set_fontsize(8.5); t.scale(1,2.2)
a.set_title("Confusion counts at the val-chosen threshold",pad=18)
o=ex[ex.extra=="other"]; a.text(.5,.12,f"RFMiD images with OTHER diseases falsely flagged as AMD: {(o.p>=thr).mean():.1%} (n={len(o)})\nResearch demo only. Not a medical device.",ha="center",fontsize=9,transform=a.transAxes)
plt.tight_layout(rect=[0,0,1,.96]); plt.savefig("../docs/results.png",dpi=120,facecolor="white")
