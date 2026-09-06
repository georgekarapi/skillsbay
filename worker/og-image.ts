import { Resvg } from "@cf-wasm/resvg"

export type OgSkillData = {
  namespace: string
  slug: string
  title: string
  summary: string
  category: string
  priceUsdc: string
  paidInstalls: number
  version: string
}

export function escapeXml(unsafe: string): string {
  return String(unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function wrapText(text: string, maxCharsPerLine = 34, maxLines = 2): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let currentLine = ""

  for (const word of words) {
    if ((currentLine + " " + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + " " + word).trim()
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = word
      if (lines.length >= maxLines - 1) break
    }
  }
  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine)
  }
  return lines
}

export function generateSkillOgSvg(skill: OgSkillData): string {
  const titleLines = wrapText(skill.title, 32, 2)
  const descLines = wrapText(skill.summary, 60, 2)
  const categoryWidth = Math.max(100, skill.category.length * 9 + 32)
  const categoryX = 1128 - categoryWidth - 140
  const priceX = 1128 - 128

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="glowOrange" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFB62E" stop-opacity="0.30"/>
      <stop offset="60%" stop-color="#FF704C" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#FF4F70" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="glowAmber" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="#FFB62E" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#FF8C46" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Background Base -->
  <rect width="1200" height="630" fill="#070709"/>

  <!-- Ambient Glow Orbs -->
  <circle cx="1120" cy="50" r="380" fill="url(#glowOrange)"/>
  <circle cx="80" cy="580" r="320" fill="url(#glowAmber)"/>

  <!-- Subtle Header Divider -->
  <line x1="72" y1="130" x2="1128" y2="130" stroke="#ffffff" stroke-opacity="0.08" stroke-width="1"/>

  <!-- Brand Wordmark -->
  <text x="72" y="102" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="32" font-weight="800" letter-spacing="-0.04em">Skills<tspan fill="#FF8C46">Bay</tspan></text>
  <circle cx="230" cy="94" r="4.5" fill="#FFB62E"/>

  <!-- Header Badges -->
  <!-- Category Pill -->
  <rect x="${categoryX}" y="72" width="${categoryWidth}" height="36" rx="18" fill="#FFB62E" fill-opacity="0.12" stroke="#FFB62E" stroke-opacity="0.35" stroke-width="1"/>
  <text x="${categoryX + categoryWidth / 2}" y="95" fill="#FFB62E" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" text-anchor="middle">${escapeXml(skill.category)}</text>
  
  <!-- Price Pill -->
  <rect x="${priceX}" y="72" width="128" height="36" rx="18" fill="#ffffff" fill-opacity="0.08" stroke="#ffffff" stroke-opacity="0.16" stroke-width="1"/>
  <text x="${priceX + 64}" y="95" fill="#ffffff" font-family="ui-monospace, 'Geist Mono', monospace" font-size="14" font-weight="700" text-anchor="middle">$${escapeXml(skill.priceUsdc)} USDC</text>

  <!-- Namespace & Slug Line -->
  <text x="72" y="200" fill="#a1a1aa" font-family="ui-monospace, 'Geist Mono', monospace" font-size="19" font-weight="500">
    <tspan fill="#FFB62E" font-weight="700">@${escapeXml(skill.namespace)}</tspan> / ${escapeXml(skill.slug)}
  </text>

  <!-- Skill Title (Multiline) -->
  ${titleLines.map((line, idx) => `
    <text x="72" y="${268 + idx * 64}" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="54" font-weight="800" letter-spacing="-0.04em">
      ${escapeXml(line)}
    </text>
  `).join("")}

  <!-- Skill Summary (Multiline) -->
  ${descLines.map((line, idx) => `
    <text x="72" y="${380 + (titleLines.length > 1 ? 40 : 0) + idx * 34}" fill="#a1a1aa" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="400">
      ${escapeXml(line)}
    </text>
  `).join("")}

  <!-- Footer Divider -->
  <line x1="72" y1="516" x2="1128" y2="516" stroke="#ffffff" stroke-opacity="0.08" stroke-width="1"/>

  <!-- Footer Live Stats -->
  <text x="72" y="558" fill="#d4d4d8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="500">
    <tspan fill="#ffffff" font-weight="700">${escapeXml(skill.paidInstalls.toLocaleString())}</tspan> paid installs
    <tspan fill="#71717a">   •   </tspan>
    <tspan fill="#ffffff" font-weight="700">v${escapeXml(skill.version)}</tspan>
    <tspan fill="#71717a">   •   </tspan>
    <tspan fill="#22c55e">✓</tspan> Verified agent skill
  </text>

  <!-- CLI Pill in Footer -->
  <g transform="translate(710, 532)">
    <rect x="0" y="0" width="418" height="44" rx="10" fill="#000000" fill-opacity="0.65" stroke="#ffffff" stroke-opacity="0.14" stroke-width="1"/>
    <text x="20" y="27" fill="#e4e4e7" font-family="ui-monospace, 'Geist Mono', monospace" font-size="14" font-weight="500">
      <tspan fill="#FFB62E">$</tspan> npx skillsbay add ${escapeXml(skill.namespace)}/${escapeXml(skill.slug)}
    </text>
  </g>
</svg>`
}

export async function generateSkillOgPng(skill: OgSkillData): Promise<Uint8Array> {
  const svg = generateSkillOgSvg(skill)
  const resvg = await Resvg.async(svg, {
    fitTo: {
      mode: "width",
      value: 1200,
    },
  })
  const pngData = resvg.render()
  return pngData.asPng()
}
