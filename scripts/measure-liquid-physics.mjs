// Run with: npx tsx scripts/measure-liquid-physics.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { LiquidModel } from '../frontend/src/features/foundation/liquidModel.ts';

const output =
  process.env.LIQUID_PHYSICS_EVIDENCE_DIR ??
  'docs/visual-polish/screenshots/liquid-physics-3';
mkdirSync(output, { recursive: true });
function random(seed) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const scenarios = [
  ['very-gentle', 40, 0, 26],
  ['gentle', 100, 0, 26],
  ['slow', 220, 0, 26],
  ['medium', 650, 0, 26],
  ['fast', 1500, 0, 26],
  ['fast-edge', 1500, 38, 26],
  ['sparse-fast', 1500, 0, 1],
];
const groups = {};
for (const [name, speed, y, segments] of scenarios) {
  const trials = [];
  for (let seed = 1; seed <= 20; seed++) {
    const model = new LiquidModel(64, random(seed));
    let maxActive = 0,
      maxExtent = 0,
      maxRadius = 0,
      maxVelocity = 0;
    const inspect = () => {
      maxActive = Math.max(maxActive, model.activeDroplets);
      for (const d of model.droplets) {
        if (!d.active) continue;
        maxExtent = Math.max(maxExtent, Math.hypot(d.x, d.y) + d.radius);
        maxRadius = Math.max(maxRadius, d.radius);
        maxVelocity = Math.max(maxVelocity, Math.hypot(d.vx, d.vy));
      }
    };
    const dx = 130 / segments,
      dt = dx / speed;
    for (let i = 0; i < segments; i++) {
      model.disturb({ x: -65 + i * dx, y }, { x: -65 + (i + 1) * dx, y }, dt);
      inspect();
      for (let j = 0; j < Math.ceil(dt * 120); j++) {
        model.step(dt / Math.ceil(dt * 120));
        inspect();
      }
    }
    for (let j = 0; j < 720; j++) {
      model.step();
      inspect();
    }
    trials.push({
      seed,
      count: model.emittedTotal,
      detachedAreaUnits: model.emittedMass,
      crestEnergyWithdrawn: model.separationLoss,
      maxActive,
      maxExtent,
      maxRadius,
      maxVelocity,
      finalEnergy: model.energy(),
      finalActive: model.activeDroplets,
    });
  }
  const counts = trials.map((t) => t.count);
  const mean = (key) => trials.reduce((sum, t) => sum + t[key], 0) / trials.length;
  groups[name] = {
    input: { speedCssPxPerSecond: speed, y, segments, pathLength: 130 },
    counts,
    histogram: Object.fromEntries(
      [...new Set(counts)]
        .sort((a, b) => a - b)
        .map((n) => [n, counts.filter((c) => c === n).length]),
    ),
    meanCount: mean('count'),
    meanDetachedArea: mean('detachedAreaUnits'),
    meanMaxVelocity: mean('maxVelocity'),
    trials,
  };
}
writeFileSync(
  `${output}/model-trials.json`,
  JSON.stringify(
    {
      source:
        'Seeded model trials, seeds 1–20; identical path per group, stable substeps up to 120Hz. Area units are sum of squared radii, not physical mass.',
      groups,
    },
    null,
    2,
  ) + '\n',
);
for (const [name, g] of Object.entries(groups))
  console.log(
    name,
    JSON.stringify({
      counts: g.counts,
      meanCount: g.meanCount,
      meanArea: g.meanDetachedArea,
      maxExtent: Math.max(...g.trials.map((t) => t.maxExtent)),
    }),
  );
