interface RGB {
  r: number;
  g: number;
  b: number;
}

function HSVtoRGB(h: number, s: number, v: number): RGB {
  let r: number;
  let g: number;
  let b: number;
  let i: number;
  let f: number;
  let p: number;
  let q: number;
  let t: number;

  i = Math.floor(h * 6);
  f = h * 6 - i;
  p = v * (1 - s);
  q = v * (1 - f * s);
  t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0:
      (r = v), (g = t), (b = p);
      break;

    case 1:
      (r = q), (g = v), (b = p);
      break;

    case 2:
      (r = p), (g = v), (b = t);
      break;

    case 3:
      (r = p), (g = q), (b = v);
      break;

    case 4:
      (r = t), (g = p), (b = v);
      break;

    case 5:
      (r = v), (g = p), (b = q);
      break;

    default:
      throw new Error("Error in HSVtoRGB");
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

function RGBtoColor({ r, g, b }: RGB) {
  const rr = r.toString(16);
  const gg = g.toString(16);
  const bb = b.toString(16);
  const c = `#${rr.length === 1 ? "0" + rr : rr}${
    gg.length === 1 ? "0" + gg : gg
  }${bb.length === 1 ? "0" + bb : bb}`;

  return c;
}

export function getColor(value: number) {
  const rgb = HSVtoRGB(0.3, 0.7, Math.exp(-value));
  return RGBtoColor(rgb);
}
