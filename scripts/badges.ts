// Regenerates the README badges in assets/badges/.
//
//   bun run scripts/badges.ts
//
// The numbers are hardcoded: edit STATS and SHARDS below, run the script and
// commit the SVGs. Every image is written twice (light and dark); the README
// picks one with <picture>, which follows the reader's GitHub theme.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type Theme = "light" | "dark";

// As of 11 Nov 2026. Servers is measured and rounded down. Messages and chars
// are estimates since launch (15 Nov 2021): measured from 9 Apr 2026 (1,131,457
// messages, 31,150,643 chars), plus an assumed steady climb from zero before
// that. Plausible range: 3.0M-6.8M messages, 83M-186M chars.
const STATS: [label: string, value: string][] = [
  ["servers", "5,300+"],
  ["messages spoken", "~3.9M"],
  ["chars spoken", "~108M"],
  ["est. since", "2021"],
  ["as of", "Nov 2026"],
];

// Servers and members come from Discord (members is the sum of each server's
// approximate member count, so people in several servers count more than
// once). Messages is the estimate above, split by each shard's measured share.
const SHARDS: { id: number; rows: [label: string, value: string][] }[] = [
  {
    id: 0,
    rows: [
      ["servers", "1,778"],
      ["members", "304K"],
      ["messages spoken", "~1.0M"],
    ],
  },
  {
    id: 1,
    rows: [
      ["servers", "1,831"],
      ["members", "383K"],
      ["messages spoken", "~1.3M"],
    ],
  },
  {
    id: 2,
    rows: [
      ["servers", "1,759"],
      ["members", "248K"],
      ["messages spoken", "~1.6M"],
    ],
  },
];

const INVITE_TEXT = "Add to Discord";

// Neutral greys from GitHub's own light and dark UI, so the badges read as
// part of the page.
const THEMES: Record<
  Theme,
  { surface: string; edge: string; label: string; value: string }
> = {
  light: {
    surface: "#f6f8fa",
    edge: "#d1d9e0",
    label: "#59636e",
    value: "#1f2328",
  },
  dark: {
    surface: "#151b23",
    edge: "#3d444d",
    label: "#9198a1",
    value: "#f0f6fc",
  },
};

const BUTTON: Record<Theme, { fill: string; text: string }> = {
  light: { fill: "#1f2328", text: "#ffffff" },
  dark: { fill: "#f0f6fc", text: "#0d1117" },
};

const SANS =
  "-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif";

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ESCAPES[c] ?? c);

// An SVG shown as an image cannot measure the reader's font, so widths are a
// generous estimate. Labels are anchored left and values right, which means an
// over-estimate only widens the gap between them a little.
function textWidth(str: string, size: number, bold: boolean): number {
  let em = 0;
  for (const ch of str) {
    if (/[0-9]/.test(ch)) em += 0.62;
    else if (/[ ,.:]/.test(ch)) em += 0.3;
    else if (/[A-Z]/.test(ch)) em += 0.72;
    else if (/[iljtfr]/.test(ch)) em += 0.36;
    else if (/[mw]/.test(ch)) em += 0.86;
    else em += 0.58;
  }
  return em * size * (bold ? 1.06 : 1);
}

function renderBadge(label: string, value: string, theme: Theme): string {
  const c = THEMES[theme];
  const size = 12;
  const h = 24;
  const pad = 9;
  const w = Math.ceil(
    pad +
      textWidth(label, size, false) +
      7 +
      textWidth(value, size, true) +
      pad,
  );
  const alt = esc(`${label}: ${value}`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${alt}">
<title>${alt}</title>
<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" fill="${c.surface}" stroke="${c.edge}"/>
<g font-family="${SANS}" font-size="${size}">
<text x="${pad}" y="16.2" fill="${c.label}">${esc(label)}</text>
<text x="${w - pad}" y="16.2" fill="${c.value}" font-weight="600" text-anchor="end">${esc(value)}</text>
</g>
</svg>
`;
}

// Same family as the badges with the colours inverted, so it reads as
// something to press.
function renderButton(text: string, theme: Theme): string {
  const c = BUTTON[theme];
  const size = 13;
  const h = 32;
  const w = Math.ceil(textWidth(text, size, true) + 32);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(text)}">
<title>${esc(text)}</title>
<rect width="${w}" height="${h}" fill="${c.fill}"/>
<text x="${w / 2}" y="20.6" font-family="${SANS}" font-size="${size}" font-weight="600" fill="${c.text}" text-anchor="middle">${esc(text)}</text>
</svg>
`;
}

function renderShard(
  title: string,
  rows: [label: string, value: string][],
  theme: Theme,
): string {
  const c = THEMES[theme];
  const w = 176;
  const pad = 10;
  const head = 28;
  const rowH = 20;
  const h = head + 8 + rows.length * rowH + 6;
  const lines = rows
    .map(([label, value], i) => {
      const y = head + 8 + i * rowH + 14;
      return `<text x="${pad}" y="${y}" fill="${c.label}">${esc(label)}</text>
<text x="${w - pad}" y="${y}" fill="${c.value}" font-weight="600" text-anchor="end">${esc(value)}</text>`;
    })
    .join("\n");
  const alt = esc(
    `${title}: ${rows.map(([label, value]) => `${label} ${value}`).join(", ")}`,
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${alt}">
<title>${alt}</title>
<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" fill="${c.surface}" stroke="${c.edge}"/>
<path d="M1 ${head + 0.5}H${w - 1}" stroke="${c.edge}"/>
<g font-family="${SANS}" font-size="12">
<text x="${pad}" y="18.5" fill="${c.value}" font-weight="600">${esc(title)}</text>
${lines}
</g>
</svg>
`;
}

const slug = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const outDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "assets",
  "badges",
);
mkdirSync(outDir, { recursive: true });

const themes: Theme[] = ["light", "dark"];
for (const theme of themes) {
  const files: [name: string, svg: string][] = [
    ["invite", renderButton(INVITE_TEXT, theme)],
    ...STATS.map(([label, value]): [string, string] => [
      slug(label),
      renderBadge(label, value, theme),
    ]),
    ...SHARDS.map((shard): [string, string] => [
      `shard-${shard.id}`,
      renderShard(`shard ${shard.id}`, shard.rows, theme),
    ]),
  ];
  for (const [name, svg] of files) {
    writeFileSync(join(outDir, `${name}-${theme}.svg`), svg);
  }
}
