import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import sharp from 'sharp'

// Simulate a serverless host without system fonts (Vercel): fontconfig finds no fonts here.
const emptyConfigDir = mkdtempSync(path.join(tmpdir(), 'nft-no-fonts-'))
writeFileSync(path.join(emptyConfigDir, 'fonts.conf'), '<?xml version="1.0"?><fontconfig></fontconfig>')
process.env.FONTCONFIG_FILE = path.join(emptyConfigDir, 'fonts.conf')

const { buildNftImage } = await import(
  new URL('../lib/server/buildNftImage.ts', import.meta.url).href
) as typeof import('../lib/server/buildNftImage')

// Nickname detail row on the 1190x1684 minted canvas.
const ROW = { left: 340, top: 1284 - 50, width: 850, height: 100 }

async function nicknameRowInk(nickname: string) {
  const png = await buildNftImage({
    nickname, batch: '2024', degreeAtUni: 'M.Sc. Informatics', programs: 'Member Flex', department: 'IT & Dev',
  })
  const { data, info } = await sharp(png).extract(ROW).greyscale().raw().toBuffer({ resolveWithObject: true })
  let ink = 0
  let top = info.height
  let bottom = -1
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[y * info.width + x] > 128) {
        ink++
        top = Math.min(top, y)
        bottom = Math.max(bottom, y)
      }
    }
  }
  return { ink, height: bottom - top + 1 }
}

test('NFT artwork draws real glyphs from the bundled font on a host without system fonts', async () => {
  const narrow = await nicknameRowInk('IIIIIIII')
  const wide = await nicknameRowInk('WWWWWWWW')
  // Missing-glyph boxes (tofu) look identical for every character; real glyphs do not.
  assert.ok(wide.ink > narrow.ink * 2, `expected distinct glyphs, got ink ${narrow.ink} vs ${wide.ink}`)
  // 58px Raleway capitals are ~40px tall at the minted size; tofu boxes are far smaller.
  assert.ok(wide.height >= 35, `expected legible capitals, got ${wide.height}px`)
})
