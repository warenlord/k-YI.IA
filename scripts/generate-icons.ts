/**
 * Génère les icônes de l'app (écran d'accueil Android / iOS) sans dépendance
 * graphique : PNG écrit à la main, encodeur minimal.
 *
 *   npm run icons
 *
 * Le mark : la ligature Æ de kÆYI, sur une tuile sombre.
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const BACKGROUND: [number, number, number] = [0x1c, 0x1a, 0x17];
const MARK: [number, number, number] = [0xf5, 0xf2, 0xed];

/** Suréchantillonnage : on dessine en dur puis on moyenne, ça lisse les bords. */
const SUPERSAMPLE = 4;

// --- CRC32 (implémenté ici : zlib.crc32 n'est pas typé dans @types/node 20) ---

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crc]);
}

/** RGBA 8 bits, non entrelacé. */
function encodePng(size: number, pixels: Uint8Array): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // profondeur
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Chaque scanline est préfixée de son octet de filtre (0 = aucun).
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(pixels.buffer, y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1,
    );
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- La ligature Æ, tracée à la main ---
//
// Le glyphe est dessiné en coordonnées normalisées puis réduit vers le centre :
// Android recadre l'icône selon la forme du lanceur, et tout doit tenir dans la
// zone sûre (un disque de rayon 0,4 autour du centre).

const TOP = 0.26; // hauteur de capitale
const BOTTOM = 0.74;
const STROKE = 0.085; // épaisseur des traits
const STEM = 0.5; // fût vertical, partagé par le A et le E
const APEX_LEFT = 0.16; // pied de la diagonale du A
const ARM_END = 0.8; // extrémité droite des bras du E
const MID_START = 0.32; // la barre médiane naît sur la diagonale
const MID_END = ARM_END - 0.06; // et s'arrête avant les deux autres bras

/**
 * La diagonale est remplie horizontalement : sa demi-largeur doit être corrigée
 * de son inclinaison, sinon le trait paraît plus fin que les autres.
 */
const DIAGONAL_HALF =
  STROKE / 2 / Math.cos(Math.atan((STEM - APEX_LEFT) / (BOTTOM - TOP)));

/**
 * Le Æ n'est pas symétrique : son centre optique est décalé à gauche de la
 * tuile. On centre sur l'emprise réelle du glyphe, pas sur 0,5.
 */
const DESIGN_CENTER_X = (APEX_LEFT - DIAGONAL_HALF + ARM_END) / 2;

/**
 * Android recadre l'icône selon la forme du lanceur : tout doit tenir dans la
 * zone sûre, un disque de rayon 0,4 autour du centre de la tuile.
 */
const SAFE_ZONE_SCALE = 0.88;

function insideMark(nx: number, ny: number): boolean {
  const x = DESIGN_CENTER_X + (nx - 0.5) / SAFE_ZONE_SCALE;
  const y = 0.5 + (ny - 0.5) / SAFE_ZONE_SCALE;

  if (y < TOP || y > BOTTOM) return false;

  // Fût vertical.
  if (Math.abs(x - STEM) <= STROKE / 2) return true;

  // Diagonale du A : elle rejoint le sommet du fût.
  const climb = (BOTTOM - y) / (BOTTOM - TOP);
  const diagonalCenter = APEX_LEFT + (STEM - APEX_LEFT) * climb;
  if (Math.abs(x - diagonalCenter) <= DIAGONAL_HALF) return true;

  // Bras haut et bas du E.
  const rightOfStem = x >= STEM + STROKE / 2 && x <= ARM_END;
  if (rightOfStem && (y <= TOP + STROKE || y >= BOTTOM - STROKE)) return true;

  // Barre médiane : la traverse du A et le bras central du E n'en font qu'une.
  if (Math.abs(y - 0.5) <= STROKE / 2 && x >= MID_START && x <= MID_END) {
    return true;
  }

  return false;
}

function renderIcon(size: number): Buffer {
  const hi = size * SUPERSAMPLE;
  const pixels = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let hits = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          const nx = (x * SUPERSAMPLE + sx + 0.5) / hi;
          const ny = (y * SUPERSAMPLE + sy + 0.5) / hi;
          if (insideMark(nx, ny)) hits += 1;
        }
      }

      const coverage = hits / (SUPERSAMPLE * SUPERSAMPLE);
      const offset = (y * size + x) * 4;
      for (let c = 0; c < 3; c += 1) {
        pixels[offset + c] = Math.round(
          BACKGROUND[c]! + (MARK[c]! - BACKGROUND[c]!) * coverage,
        );
      }
      pixels[offset + 3] = 255;
    }
  }

  return encodePng(size, pixels);
}

const TARGETS: Array<{ size: number; path: string }> = [
  { size: 192, path: "public/icon-192.png" },
  { size: 512, path: "public/icon-512.png" },
  // iOS n'applique pas de masque : l'icône est affichée telle quelle.
  { size: 180, path: "public/apple-touch-icon.png" },
  { size: 32, path: "public/favicon-32.png" },
];

for (const { size, path } of TARGETS) {
  writeFileSync(path, renderIcon(size));
  console.log(`${path} (${size}×${size})`);
}
