// Draws docs/f1-mac.svg: a 1984-style all-in-one computer whose screen shows
// the F1 seat chart, with a keyboard, a mouse and a coiled cord on a bench plate.
// Usage: node docs/f1-mac.build.mjs
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../.agents/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.agents/skills/anatomy/kit/lathe.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

const WIDTH = 640;
const HEIGHT = 460;

const PLATE = { x: -116, y: -126, w: 268, d: 268, r: 10 };
const PLATE_H = 10;
const FOOT_H = 5;

const CASE = { x: -60, y: -112, w: 120, d: 150, r: 8 };
const FRONT = CASE.y + CASE.d;
const SIDE = CASE.x + CASE.w;
const PLINTH_H = 6;
const TOP = 168;
const SEAM = FRONT - 13;

const PLINTH = k.insetPlan(CASE, 3);
const BEZEL = { x0: -48, x1: 48, z0: 80, z1: 156, r: 8, depth: 3 };
const CRT = { x0: -41, x1: 41, z0: 90, z1: 147, r: 10, depth: 4 };
const GLASS_Y = FRONT - BEZEL.depth - CRT.depth;
const SLOT = { x0: 6, x1: 50, z0: 58, z1: 65, r: 3, depth: 6 };
const KNOB = { r: 5, out: 4.4, z: 52, xs: [-52, -38] };
const SOCKET = { cx: -30, z: 30 };

const KB = { x: -74, y: 66, w: 150, d: 58, r: 4 };
const KB_Z = 2;
const KB_TOP = 9;
const U = 9.2;
const KEYS_X = KB.x + 7;
const KEYS_Y = KB.y + 6;
const KB_SOCKET = { x: KB.x, y: KB.y + 8, z: 6 };

const MOUSE = { x: 96, y: 74, w: 30, d: 44, r: 14 };
const MOUSE_H = 10;

const COIL = { x: -90, z: 5.2, r: 3.4, from: 32, to: 70, turns: 13 };

const ROWS = [
  [["`", 1], ["1", 1], ["2", 1], ["3", 1], ["4", 1], ["5", 1], ["6", 1], ["7", 1], ["8", 1], ["9", 1], ["0", 1], ["-", 1], ["=", 1], ["Backspace", 2]],
  [["Tab", 1.5], ["q", 1], ["w", 1], ["e", 1], ["r", 1], ["t", 1], ["y", 1], ["u", 1], ["i", 1], ["o", 1], ["p", 1], ["[", 1], ["]", 1], ["\\", 1.5]],
  [["CapsLock", 1.75], ["a", 1], ["s", 1], ["d", 1], ["f", 1], ["g", 1], ["h", 1], ["j", 1], ["k", 1], ["l", 1], [";", 1], ["'", 1], ["Enter", 2.25]],
  [["Shift", 2.25], ["z", 1], ["x", 1], ["c", 1], ["v", 1], ["b", 1], ["n", 1], ["m", 1], [",", 1], [".", 1], ["/", 1], ["ShiftRight", 2.75]],
  [["Alt", 1.5], ["Meta", 1.5], [" ", 9], ["AltRight", 1.5]],
];
const ROW_H = [5.6, 5.2, 4.8, 4.4, 4];

// The chart on the screen: 10 desks across, 5 rows, the 10th column is the TA seats.
const CALLS = [
  { desk: "2A", side: "l", kind: "q" },
  { desk: "5D", side: "l", kind: "c" },
  { desk: "6A", side: "r", kind: "c" },
  { desk: "9B", side: "l", kind: "q" },
];
const MINE = { desk: "3C", side: "r" };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), ...k.boxCorners(CASE, 0, TOP), ...k.boxCorners(MOUSE, 0, MOUSE_H)],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 56 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const planeOf = (y) => k.sideMatrix([0, y], 0, P, "left");
const flat = (x0, z0, x1, z1, r, steps = 6) => k.pathOf(k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, steps).map(([u, z]) => [u, -z]), true);
// In the plane of a face, `y` grows downward from the top of the glass; the matrix maps z to -z
const glassY = (down) => -(CRT.z1 - down);
const inFlat = (x, y, w, h, r = 1, steps = 3) => k.pathOf(k.roundedPlan({ x, y: glassY(y + h), w, d: h, r }, steps), true);
const sideSlot = (y, z0, z1, half = 0.8) => k.pathOf(k.roundedPlan({ x: y - half, y: z0, w: half * 2, d: z1 - z0, r: half }, 4).map(([u, z]) => at([SIDE, u, z])), true);

let clips = 0;
/** A recessed opening on the front face, with its inner walls shaded by facing. */
function recess({ x0, x1, z0, z1, r, depth }, y, back = "", backClass = "f1-well", inside = "") {
  const id = `f1-clip-${clips++}`;
  const ring = k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, 6);
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const { sinA } = k.cameraOf(P);
  const tops = [];
  const sides = [[], [], [], []];
  ring.forEach(([ax, az], index) => {
    const [bx, bz] = ring[(index + 1) % ring.length];
    const length = Math.hypot(bx - ax, bz - az) || 1;
    let [nx, nz] = [(bz - az) / length, -(bx - ax) / length];
    if (nx * (cx - (ax + bx) / 2) + nz * (cz - (az + bz) / 2) < 0) [nx, nz] = [-nx, -nz];
    if (nx <= 0 && nz <= 0) return;
    const quad = k.pathOf([at([ax, y, az]), at([bx, y, bz]), at([bx, y - depth, bz]), at([ax, y - depth, az])], true);
    if (nz >= nx) tops.push(quad);
    else sides[Math.min(3, Math.max(0, Math.floor(((nx * -sinA + 1) / 2) * 4)))].push(quad);
  });
  const shape = flat(x0, z0, x1, z1, r);
  return [
    `<clipPath id="${id}"><path transform="${planeOf(y)}" d="${shape}"/></clipPath>`,
    `<g clip-path="url(#${id})">`,
    `<path class="iso-top" d="${tops.join("")}"/>`,
    ...sides.map((d, shade) => (d.length ? `<path class="iso-shade" data-shade="${shade}" d="${d.join("")}"/>` : "")),
    `<g transform="${planeOf(y - depth)}"><path class="${backClass}" d="${shape}"/>${back}<path class="iso-line" data-tone="faint" d="${shape}"/></g>`,
    inside,
    `</g>`,
    `<g transform="${planeOf(y)}"><path class="iso-line" data-tone="lo" d="${shape}"/></g>`,
  ].join("");
}

function bench() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 24))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 11);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // The one engraved label on the whole figure
  const plate = { x: -112, y: -120, w: 34, d: 8, r: 1.2 };
  out.push(S(k.slabOf(plate, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  out.push(L(Array.from({ length: 2 }, (_, i) => k.lineOnTop([plate.x + 4, plate.y + 2.6 + i * 3], [plate.x + 26 - i * 8, plate.y + 2.6 + i * 3], 0.8, P)).join(""), { tone: "mid", free: true }));
  out.push(D([at([plate.x + plate.w - 4, plate.y + plate.d / 2, 0.8])], { size: 0.45 }));
  return out.join("");
}

/** The seat chart, drawn in the plane of the glass.
 *  Local coordinates are the screen's own: x across, y down from the top of the glass. */
function chart() {
  const rows = ["A", "B", "C", "D", "E"];
  const out = [];
  out.push(k.faceTextSvg(`translate(-36 ${glassY(10)})`, "F1", { size: 7, tone: "hi" }));
  out.push(L(k.pathOf([[-36, glassY(15)], [36, glassY(15)]]), { tone: "mid" }));
  out.push(`<path class="f1-swatch-q" d="${inFlat(24, 7.6, 4, 4, 0.6, 1)}"/>`);
  out.push(`<path class="f1-swatch-c" d="${inFlat(32, 7.6, 4, 4, 0.6, 1)}"/>`);
  const call = new Map(CALLS.map((seat) => [`${seat.desk}:${seat.side}`, seat.kind]));
  for (let row = 0; row < rows.length; row++) {
    for (let col = 0; col < 10; col++) {
      const desk = `${col + 1}${rows[row]}`;
      const x = -36 + col * 7.4 + 0.4;
      const y = 19 + row * 7.2 + 0.4;
      const w = 6.6;
      const h = 6.4;
      out.push(L(inFlat(x, y, w, h, 0.9, 3), { tone: col === 9 ? "red" : "mid" }));
      const left = call.get(`${desk}:l`);
      const right = call.get(`${desk}:r`);
      if (left || desk === MINE.desk) {
        const half = inFlat(x, y, w / 2, h, 0.4, 1);
        if (left) out.push(`<path class="${left === "q" ? "f1-seat-q" : "f1-seat-c"}" d="${half}"/>`);
        else if (MINE.side === "l") out.push(`<path class="f1-seat-mine" d="${half}"/>`);
      }
      if (right || desk === MINE.desk) {
        const half = inFlat(x + w / 2, y, w / 2, h, 0.4, 1);
        if (right) out.push(`<path class="${right === "q" ? "f1-seat-q" : "f1-seat-c"}" d="${half}"/>`);
        else if (MINE.side === "r") out.push(`<path class="f1-seat-mine" d="${half}"/>`);
      }
    }
  }
  return out.join("");
}

function screen() {
  const scan = [];
  for (let z = CRT.z0 + 2; z < CRT.z1 - 1; z += 2.8) scan.push(`M${CRT.x0 + 1} ${(-z).toFixed(1)}H${CRT.x1 - 1}`);
  const glow = flat(-30, CRT.z0 + 6, 30, CRT.z1 - 6, 26, 10);
  const back = [
    `<path class="f1-glow" d="${glow}"/>`,
    `<path class="f1-scan" d="${scan.join("")}"/>`,
    `<g data-part="chart">${chart()}</g>`,
  ].join("");
  return recess(BEZEL, FRONT, "", "f1-bezel", recess(CRT, FRONT - BEZEL.depth, back, "f1-crt"));
}

function floppy() {
  const out = [];
  out.push(recess(SLOT, FRONT, `<path class="iso-line" data-tone="faint" d="M${SLOT.x0 + 2} ${-(SLOT.z0 + 2.2)}H${SLOT.x1 - 2}"/>`, "f1-well"));
  // A disk left in the drive: it lies flat, label up, held by the slot
  const disk = { x: SLOT.x0 + 2, y: FRONT - 5, w: SLOT.x1 - SLOT.x0 - 4, d: 15, r: 1.2 };
  const z = SLOT.z0 + 0.6;
  const thick = 3.2;
  out.push(S(k.slabOf(disk, z, thick, P, 5, 0.5), { tone: "lo", crease: "faint" }));
  const face = z + thick;
  out.push(L(k.planOutline(k.insetPlan(disk, 2), face, P, 5), { tone: "lo" }));
  out.push(L(k.lineOnTop([disk.x + 4, disk.y + 4], [disk.x + disk.w - 4, disk.y + 4], face, P), { tone: "mid", free: true }));
  out.push(L(k.lineOnTop([disk.x + 4, disk.y + 7], [disk.x + disk.w - 16, disk.y + 7], face, P), { tone: "mid", free: true }));
  // The shutter at the end that enters the drive
  out.push(S(k.slabOf({ x: disk.x + 4, y: disk.y + disk.d - 7, w: disk.w * 0.42, d: 5, r: 0.8 }, face - 0.4, 1.5, P, 3), { tone: "mid", crease: "faint" }));
  out.push(D([at([disk.x + disk.w - 3.4, disk.y + 3.4, face])], { size: 0.5, tone: "mid" }));
  return out.join("");
}

function knobs() {
  const out = [];
  for (const cx of KNOB.xs) {
    const frame = G.frameOf([cx, FRONT, KNOB.z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    out.push(S(G.ringBand(0, 0.9, KNOB.r, KNOB.r + 1.2, frame, P), { tone: "lo" }));
    out.push(S(G.disc(0.9, KNOB.out, KNOB.r, frame, P), { tone: "mid" }));
    out.push(L(G.ribsOf(frame, 1.4, KNOB.out - 0.4, KNOB.r, 14, P, { least: 0.2 }), { tone: "lo" }));
    out.push(L(G.circleOf(frame, KNOB.out - 0.3, KNOB.r - 1.2, P, 20), { tone: "lo" }));
    out.push(L(k.segment([cx, FRONT + KNOB.out, KNOB.z], [cx, FRONT + KNOB.out, KNOB.z + KNOB.r - 1.8], P), { tone: "hi" }));
  }
  return out.join("");
}

function computer() {
  const out = [`<path class="iso-halo" d="${k.haloOf(CASE, 0, 8, P)}"/>`];
  out.push(S(k.slabOf(PLINTH, 0, PLINTH_H, P, 8), { tone: "lo" }));
  out.push(S(k.slabOf(CASE, PLINTH_H, TOP - PLINTH_H, P, 8, 1.6), { tone: "mid" }));
  const handle = { x: -42, y: CASE.y + 7, w: 84, d: 11, r: 5.5 };
  out.push(L(k.planOutline(handle, TOP, P, 8), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(handle, 2.2), TOP, P, 8), { tone: "faint" }));
  out.push(L(Array.from({ length: 9 }, (_, i) => k.planOutline({ x: -46 + i * 11, y: CASE.y + 24, w: 4.4, d: 9, r: 2 }, TOP, P, 4)).join(""), { tone: "faint" }));
  out.push(L(k.sideSeam(CASE, SEAM, P, 8), { tone: "lo" }));
  out.push(L(k.rise([SIDE, SEAM], PLINTH_H, TOP, P), { tone: "lo" }));
  const rowOf = (from, to) => Array.from({ length: Math.floor((to - from) / 3.2 + 1e-9) + 1 }, (_, i) => from + i * 3.2);
  out.push(L(rowOf(CASE.y + 18, CASE.y + 78).map((y) => sideSlot(y, TOP - 52, TOP - 16)).join(""), { tone: "faint" }));
  out.push(L(rowOf(CASE.y + 22, CASE.y + 74).map((y) => sideSlot(y, 22, 40)).join(""), { tone: "faint" }));
  out.push(`<g transform="${planeOf(FRONT)}"><path class="iso-line" data-tone="faint" d="${flat(CASE.x + 3.4, PLINTH_H + 3.4, SIDE - 3.4, TOP - 3.4, 5)}"/></g>`);
  out.push(screen());
  out.push(floppy());
  out.push(knobs());
  out.push(recess({ x0: SOCKET.cx - 7, x1: SOCKET.cx + 7, z0: SOCKET.z - 5, z1: SOCKET.z + 5, r: 2, depth: 3.4 }, FRONT, "", "f1-well"));
  return out.join("");
}

function keyboard() {
  const out = [`<path class="iso-halo" d="${k.haloOf(KB, 0, 4, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(KB, 9))) out.push(S(k.cylinder(x, y, 2.8, 0, KB_Z, P, 16), { tone: "lo" }));
  out.push(S(k.slabOf(KB, KB_Z, KB_TOP - KB_Z, P, 6, 1), { tone: "mid" }));
  const well = { x: KEYS_X - 1.4, y: KEYS_Y - 1.4, w: U * 15 + 2.8, d: U * 5 + 2.8, r: 2 };
  out.push(L(k.planOutline(well, KB_TOP, P, 4), { tone: "lo" }));
  out.push(D([at([KB.x + 4, KB.y + 2.4, KB_TOP]), at([KB.x + KB.w - 4, KB.y + 2.4, KB_TOP])], { size: 0.45 }));
  ROWS.forEach((row, r) => {
    let x = KEYS_X;
    for (const [code, width] of row) {
      const plan = { x: x + 0.7, y: KEYS_Y + r * U + 0.7, w: width * U - 1.4, d: U - 1.4, r: 1.4 };
      const h = ROW_H[r];
      out.push(S(k.slabOf(plan, KB_TOP, h, P, 3, 0.4), { tone: "mid", crease: "faint" }));
      out.push(L(k.planOutline(k.insetPlan(plan, code === " " ? 1.8 : 1.6), KB_TOP + h, P, 3), { tone: "faint" }));
      x += width * U;
    }
  });
  // The socket the coiled cord leaves from
  out.push(S(k.slabOf({ x: KB.x - 1.6, y: KB_SOCKET.y - 4, w: 1.6, d: 8, r: 1 }, KB_Z + 2, 7, P, 3), { tone: "lo" }));
  out.push(D([at([KB.x + 3, KB.y + KB.d - 4, KB_TOP])], { size: 0.45 }));
  return out.join("");
}

function mouse() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(MOUSE, 0, 4, P)}"/>`);
  out.push(S(k.slabOf(k.insetPlan(MOUSE, 1.2), 0, 2, P, 8), { tone: "lo" }));
  out.push(S(k.slabOf(MOUSE, 2, MOUSE_H - 2, P, 8, 1.2), { tone: "mid" }));
  out.push(L(k.lineOnTop([MOUSE.x + MOUSE.w / 2, MOUSE.y + 5], [MOUSE.x + MOUSE.w / 2, MOUSE.y + 12], MOUSE_H, P), { tone: "faint" }));
  out.push(L(k.sideSeam(MOUSE, MOUSE_H - 2.6, P, 8), { tone: "faint" }));
  return out.join("");
}

function cords() {
  const out = [];
  const curve = (points) => k.pathOf(points.map((point) => at(point)));
  const coilBack = k.coil(COIL.from, COIL.to, [COIL.x, COIL.z], COIL.r, COIL.turns, "y", P);
  out.push(L(coilBack.back, { tone: "lo" }));
  out.push(L(coilBack.front, { tone: "mid" }));
  out.push(`<path class="iso-line f1-cord" data-tone="mid" d="${curve([[SOCKET.cx + 2, FRONT + 0.4, SOCKET.z], [SOCKET.cx, FRONT + 8, SOCKET.z - 1.4], [COIL.x + 6, 20, COIL.z + 1.6], [COIL.x + COIL.r, COIL.from, COIL.z]])}"/>`);
  out.push(`<path class="iso-line f1-cord" data-tone="mid" d="${curve([[COIL.x + COIL.r, COIL.to, COIL.z], [COIL.x + 8, KB.y + 12, COIL.z + 0.4], [KB_SOCKET.x - 3, KB_SOCKET.y + 2.4, KB_SOCKET.z]])}"/>`);
  out.push(`<path class="iso-line f1-cord" data-tone="mid" d="${curve([[MOUSE.x + 6, MOUSE.y + 2, MOUSE_H - 1.6], [MOUSE.x - 4, MOUSE.y - 12, 3.4], [KB.x + KB.w + 4, KB.y + 42, 3.4], [KB.x + KB.w - 2, KB.y + KB.d - 8, 3.6]])}"/>`);
  return out.join("");
}

const css = `<style>
  .f1-case{--anatomy-paper:#e6dfcd;--anatomy-top:#f1ebdc;--anatomy-shade-0:#b5ab93;--anatomy-shade-1:#c7bda6;--anatomy-shade-2:#d7cdb7;--anatomy-shade-3:#e1d9c6}
  .f1-crt{fill:#e9ece2}
  .f1-bezel{fill:var(--anatomy-shade-1)}
  .f1-well{fill:var(--anatomy-shade-0)}
  .f1-glow{fill:#ffffff;opacity:.75;filter:blur(7px)}
  .f1-scan{fill:none;stroke:#b9c1ad;stroke-width:.5px;vector-effect:non-scaling-stroke;opacity:.55}
  .f1-swatch-q,.f1-seat-q{fill:var(--anatomy-blue)}
  .f1-swatch-c,.f1-seat-c{fill:var(--anatomy-red)}
  .f1-seat-mine{fill:url(#f1-hatch)}
  .f1-cord{stroke-width:1.1px}
  .f1-seat-q,.f1-seat-c{animation:f1-call 2.6s ease-in-out infinite}
  .f1-seat-c{animation-delay:-1.3s}
  @keyframes f1-call{0%,100%{opacity:1}50%{opacity:.62}}
  @media (prefers-reduced-motion:reduce){.f1-seat-q,.f1-seat-c{animation:none}}
</style>`;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A 1984-style all-in-one computer on a bench plate: a beige case with the F1 seat chart on its screen, a floppy disk in the drive, two control knobs and a keyboard joined by a coiled cord, and a mouse beside it.",
  standalone: "light",
  body: [
    `<defs><pattern id="f1-hatch" width="1.8" height="1.8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="0.9" height="1.8" fill="#26262a"/></pattern></defs>`,
    css,
    bench(),
    `<g class="f1-case">${computer()}</g>`,
    keyboard(),
    mouse(),
    cords(),
  ],
});

writeFileSync(join(HERE, "f1-mac.svg"), svg.replace("<svg ", `<svg width="${WIDTH}" height="${HEIGHT}" `));
console.log("wrote f1-mac.svg", `${(svg.length / 1024).toFixed(1)} KB`);
