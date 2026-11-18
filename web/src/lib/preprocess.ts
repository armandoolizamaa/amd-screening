// Must mirror training/common.py: center square crop on the short side -> 224x224 -> ImageNet normalize, NCHW.
import manifest from "../../model_manifest.json";

const { size: SIZE, mean: MEAN, std: STD } = manifest.input;

export type Prepared = {
  tensor: Float32Array; // [1,3,224,224]
  display: HTMLCanvasElement; // square crop at display resolution, for the heatmap overlay
  pixels224: ImageData; // the exact pixels the model saw (used by the quality check)
  sourceSize: { width: number; height: number };
};

export async function loadBitmap(src: Blob | string): Promise<ImageBitmap> {
  const blob = typeof src === "string" ? await (await fetch(src)).blob() : src;
  return createImageBitmap(blob, { imageOrientation: "from-image" });
}

function squareCanvas(bmp: ImageBitmap, out: number): HTMLCanvasElement {
  const s = Math.min(bmp.width, bmp.height);
  const sx = Math.floor((bmp.width - s) / 2);
  const sy = Math.floor((bmp.height - s) / 2);
  const c = document.createElement("canvas");
  c.width = c.height = out;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, sx, sy, s, s, 0, 0, out, out);
  return c;
}

export function prepare(bmp: ImageBitmap): Prepared {
  const display = squareCanvas(bmp, 512);
  const small = squareCanvas(bmp, SIZE);
  const pixels224 = small.getContext("2d")!.getImageData(0, 0, SIZE, SIZE);
  const px = pixels224.data;
  const plane = SIZE * SIZE;
  const tensor = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    for (let ch = 0; ch < 3; ch++) {
      tensor[ch * plane + i] = (px[i * 4 + ch] / 255 - MEAN[ch]) / STD[ch];
    }
  }
  return { tensor, display, pixels224, sourceSize: { width: bmp.width, height: bmp.height } };
}
