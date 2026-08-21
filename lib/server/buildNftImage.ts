import sharp from 'sharp';
import type { OverlayOptions } from 'sharp';
import path from 'path';
import fs from 'fs';

const ASSETS_DIR = path.join(process.cwd(), 'public', 'assets');

// ─── SINGLE SOURCE OF TRUTH FOR CANVAS LAYOUT ───────────────────────────────
// All coordinates are relative to this fixed canvas.
export const CANVAS_W = 1190;
export const CANVAS_H = 1684;

// Avatar window: top-left corner where the photo sits
const AVATAR_TOP  = 0;   
const AVATAR_LEFT = 0;  
const AVATAR_W    = 1190;
const AVATAR_H    = 1118;

// Text row Y positions 
const NICK_Y  = 1284;  
const UNI_Y   = 1414;    
const PROG_Y  = 1558;  

export const DEPT_MAP: Record<string, string> = {
  "Marketing":         "overlay_marketing.png",
  "IT":                "overlay_it&dev.png",
  "IT & Dev":          "overlay_it&dev.png",
  "IT & Development":  "overlay_it&dev.png",
  "Legal":             "overlay_legal&finance.png",
  "Education":         "overlay_education.png",
  "Industry":          "overlay_industry.png",
  "Board":             "overlay_board.png",
  "Web3 Talents":      "overlay_web3_talents.png",
  "External Relations":"overlay_external_relations.png",
};

// ─── SHARED IMAGE BUILDER ────────────────────────────────────────────────────
export async function buildNftImage(params: {
  nickname: string;
  batch: string;
  degreeAtUni: string;
  programs: string;
  department: string;
  imageUrl?: string | null;
}): Promise<Buffer> {
  const { nickname, batch, degreeAtUni, programs, department, imageUrl } = params;

  const deptOverlay = DEPT_MAP[department] || "overlay_board.png";

  // ── 1. Base canvas: ALWAYS resize to exact fixed dimensions ──────────────
  const baseCanvasBuffer = await sharp(path.join(ASSETS_DIR, 'base1.png'))
    .resize(CANVAS_W, CANVAS_H, { fit: 'fill' })   
    .toBuffer();

  // ── 2. Avatar ─────────────────────────────────────────────────────────────
  let avatarBuffer: Buffer | null = null;
  if (imageUrl) {
    try {
      const res = await fetch(imageUrl);
      if (res.ok) {
        avatarBuffer = await sharp(Buffer.from(await res.arrayBuffer()))
          .resize(AVATAR_W, AVATAR_H, { fit: 'cover', position: 'center' })
          .toBuffer() as Buffer;
      }
    } catch {  }
  }

  // ── 3. Department overlay ─────────────────────────────────────────────────
  let deptBuffer: Buffer | null = null;
  const overlayPath = path.join(ASSETS_DIR, deptOverlay);
  if (fs.existsSync(overlayPath)) {
    deptBuffer = await sharp(overlayPath)
      .resize(CANVAS_W, CANVAS_H, { fit: 'fill' })
      .toBuffer() as Buffer;
  }

  // ── 4. Icons ──────────────────────────────────────────────────────────────
  const resizeIcon = async (filename: string, customSize: number): Promise<Buffer | null> => {
    const p = path.join(ASSETS_DIR, filename);
    if (!fs.existsSync(p)) return null;
    
    return sharp(p)
      .resize(customSize, customSize, { 
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } 
      })
      .toBuffer() as Promise<Buffer>;
  };

  // Define individual sizes
  const HEX_SIZE = 130; 
  const UNI_SIZE = 100;
  const CUBE_SIZE = 100;

  const [hexIcon, uniIcon, cubeIcon] = await Promise.all([
    resizeIcon('icon_hexagon.png', HEX_SIZE),
    resizeIcon('icon_uni.png', UNI_SIZE),
    resizeIcon('icon_cube.png', CUBE_SIZE),
  ]);

  // ── 5. SVG text layer ─────────────────────────────────────────────────────
  const TEXT_X = 350;
  // 1. Read your existing Raleway font file and convert it to Base64
  // (Make sure ASSETS_DIR is defined at the top of your file!)
  const fontPath = path.join(ASSETS_DIR, 'Raleway-Regular.ttf'); 
  const fontBase64 = fs.readFileSync(fontPath).toString('base64');

  const programLines = programs; 
  
  // 2. Inject the Base64 font directly into the SVG
  const svgText = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="${CANVAS_H}">
      <style>
        @font-face {
          font-family: 'Raleway';
          /* Removed charset=utf-8, changed to font/ttf, and added format */
          src: url('data:font/ttf;base64,${fontBase64}') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
        .batch { 
          font-family: 'Raleway', sans-serif; 
          font-weight: normal; 
          font-size: 105px; 
          fill: #5EA5F6; 
          text-anchor: middle; 
          dominant-baseline: central; 
        }
        .line { 
          font-family: 'Raleway', sans-serif; 
          font-weight: normal; 
          font-size: 58px; 
          fill: rgba(255, 255, 255, 0.9);
          dominant-baseline: middle; 
          letter-spacing: 1px; 
        }
      </style>
      
      <text x="210" y="1125" class="batch">${escapeXml(batch)}</text>
      
      <text x="${TEXT_X}" y="${NICK_Y}"   class="line">${escapeXml(nickname)}</text>
      <text x="${TEXT_X}" y="${UNI_Y}"    class="line">${escapeXml(degreeAtUni)}</text>
      ${programLines.split('\n').map((ln, i) =>
        `<text x="${TEXT_X}" y="${PROG_Y + i * 70}" class="line">${escapeXml(ln)}</text>`
      ).join('\n')}
    </svg>`;

  // Create a separate SVG just for the background box so we can layer it independently
  const grayBoxSvg = `
    <svg width="${CANVAS_W}" height="${CANVAS_H}">
      <rect x="0" y="1118" width="${CANVAS_W}" height="704" fill="#181818" />
    </svg>`;

  // ── 6. Composite (order = bottom → top) ──────────────────────────────────
  const layers: OverlayOptions[] = [];

  // LAYER 1: The Avatar Photo (Bottom)
  if (avatarBuffer) {
    layers.push({ input: avatarBuffer, top: AVATAR_TOP, left: AVATAR_LEFT });
  }

  // LAYER 2: The Gray Box (Covers the bottom of the photo, sits UNDER the blue line)
  layers.push({ input: Buffer.from(grayBoxSvg), top: 0, left: 0 });

  // LAYER 3: The Department Overlay (Blue line, blue hexagon, "IT & DEV")
  if (deptBuffer) {
    layers.push({ input: deptBuffer, top: 0, left: 0 });
  }

  // LAYER 4: The White Icons (Perfectly center-aligned!)
  const ICON_CENTER_X = 205; 
  if (hexIcon) {
    layers.push({ 
      input: hexIcon,  
      top: NICK_Y - Math.floor(HEX_SIZE / 2),  
      left: ICON_CENTER_X - Math.floor(HEX_SIZE / 2) 
    });
  }
  if (uniIcon) {
    layers.push({ 
      input: uniIcon,  
      top: UNI_Y - Math.floor(UNI_SIZE / 2),  
      left: ICON_CENTER_X - Math.floor(UNI_SIZE / 2) 
    });
  }
  if (cubeIcon) {
    layers.push({ 
      input: cubeIcon, 
      top: PROG_Y - Math.floor(CUBE_SIZE / 2), 
      left: ICON_CENTER_X - Math.floor(CUBE_SIZE / 2) 
    });
  }

  // LAYER 5: The Text (Top)
  layers.push({ input: Buffer.from(svgText), top: 0, left: 0 });

  return sharp(baseCanvasBuffer)
    .composite(layers)
    .png()
    .toBuffer() as Promise<Buffer>;

function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
}
