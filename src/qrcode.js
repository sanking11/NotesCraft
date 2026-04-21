// Local QR Code encoder — zero network, byte-mode, auto-sized.
// Adapted from Project Nayuki's QR Code generator (MIT, https://www.nayuki.io/page/qr-code-generator-library)

const ECC_CODEWORDS_PER_BLOCK = {
  L:[-1,7,10,15,20,26,18,20,24,30,18,20,24,26,30,22,24,28,30,28,28,28,28,30,30,26,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
  M:[-1,10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26,26,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28],
  Q:[-1,13,22,18,26,18,24,18,22,20,24,28,26,24,20,30,24,28,28,26,30,28,30,30,30,30,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
  H:[-1,17,28,22,16,22,28,26,26,24,28,24,28,22,24,24,30,28,28,26,28,30,24,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30]
};

const NUM_ECC_BLOCKS = {
  L:[-1,1,1,1,1,1,2,2,2,2,4,4,4,4,4,6,6,6,6,7,8,8,9,9,10,12,12,12,13,14,15,16,17,18,19,19,20,21,22,24,25],
  M:[-1,1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49],
  Q:[-1,1,1,2,2,4,4,6,6,8,8,8,10,12,16,12,17,16,18,21,20,23,23,25,27,29,34,34,35,38,40,43,45,48,51,53,56,59,62,65,68],
  H:[-1,1,1,2,4,4,4,5,6,8,8,11,11,16,16,18,16,19,21,25,25,25,34,30,32,35,37,40,42,45,48,51,54,57,60,63,66,70,74,77,81]
};

const ECC_ORDINAL = { L:0, M:1, Q:2, H:3 };
const ECC_FORMAT_BITS = { L:1, M:0, Q:3, H:2 };

function getNumRawDataModules(ver){
  let result = (16*ver + 128)*ver + 64;
  if(ver >= 2){
    const numAlign = Math.floor(ver/7) + 2;
    result -= (25*numAlign - 10)*numAlign - 55;
    if(ver >= 7) result -= 36;
  }
  return result;
}

function getNumDataCodewords(ver, ecl){
  return Math.floor(getNumRawDataModules(ver)/8)
    - ECC_CODEWORDS_PER_BLOCK[ecl][ver] * NUM_ECC_BLOCKS[ecl][ver];
}

// Reed-Solomon over GF(256) with primitive polynomial 0x11D
function rsMultiply(x, y){
  let z = 0;
  for(let i = 7; i >= 0; i--){
    z = (z << 1) ^ ((z >>> 7) * 0x11D);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xFF;
}

function rsComputeDivisor(degree){
  const result = new Uint8Array(degree);
  result[degree - 1] = 1;
  let root = 1;
  for(let i = 0; i < degree; i++){
    for(let j = 0; j < result.length; j++){
      result[j] = rsMultiply(result[j], root);
      if(j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = rsMultiply(root, 2);
  }
  return result;
}

function rsComputeRemainder(data, divisor){
  const result = new Uint8Array(divisor.length);
  for(const b of data){
    const factor = b ^ result[0];
    result.copyWithin(0, 1);
    result[result.length - 1] = 0;
    for(let i = 0; i < result.length; i++){
      result[i] ^= rsMultiply(divisor[i], factor);
    }
  }
  return result;
}

// Encode byte-mode string to codewords for the smallest fitting version
function encodeBytes(text, ecl){
  const bytes = new TextEncoder().encode(text);
  let version = 1;
  for(; version <= 40; version++){
    const capBits = getNumDataCodewords(version, ecl) * 8;
    const ccBits = version < 10 ? 8 : 16;
    const needed = 4 + ccBits + bytes.length * 8;
    if(needed <= capBits) break;
  }
  if(version > 40) throw new Error("Data too long for QR code");

  const ccBits = version < 10 ? 8 : 16;
  const totalDataBits = getNumDataCodewords(version, ecl) * 8;
  const bits = [];
  const append = (val, n) => { for(let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };

  append(0b0100, 4);             // byte mode indicator
  append(bytes.length, ccBits);  // character count
  for(const b of bytes) append(b, 8);

  // terminator (up to 4 zero bits)
  const term = Math.min(4, totalDataBits - bits.length);
  for(let i = 0; i < term; i++) bits.push(0);
  // pad to byte boundary
  while(bits.length % 8) bits.push(0);
  // pad bytes
  const padBytes = [0xEC, 0x11];
  for(let i = 0; bits.length < totalDataBits; i++){
    append(padBytes[i % 2], 8);
  }

  // pack bits to bytes
  const dataCodewords = new Uint8Array(bits.length / 8);
  for(let i = 0; i < bits.length; i++){
    dataCodewords[i >> 3] |= bits[i] << (7 - (i & 7));
  }

  return { version, dataCodewords };
}

// Interleave data + ECC blocks per QR spec
function addEccAndInterleave(version, ecl, data){
  const numBlocks = NUM_ECC_BLOCKS[ecl][version];
  const blockEccLen = ECC_CODEWORDS_PER_BLOCK[ecl][version];
  const rawCodewords = Math.floor(getNumRawDataModules(version) / 8);
  const numShortBlocks = numBlocks - rawCodewords % numBlocks;
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);

  const blocks = [];
  const divisor = rsComputeDivisor(blockEccLen);
  let k = 0;
  for(let i = 0; i < numBlocks; i++){
    const dataLen = shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1);
    const dat = data.slice(k, k + dataLen);
    k += dataLen;
    const ecc = rsComputeRemainder(dat, divisor);
    const block = new Uint8Array(dat.length + ecc.length);
    block.set(dat);
    block.set(ecc, dat.length);
    blocks.push(block);
  }

  // interleave
  const result = new Uint8Array(rawCodewords);
  let idx = 0;
  const maxBlockLen = shortBlockLen + 1;
  for(let i = 0; i < maxBlockLen; i++){
    for(let j = 0; j < blocks.length; j++){
      // skip the data-only padding position in short blocks
      if(i !== shortBlockLen - blockEccLen || j >= numShortBlocks){
        result[idx++] = blocks[j][i];
      }
    }
  }
  return result;
}

// Build the module matrix
function buildMatrix(version, ecl, codewords){
  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => new Uint8Array(size));   // 0/1
  const reserved = Array.from({ length: size }, () => new Uint8Array(size));  // 1 = reserved function pattern

  const setFn = (x, y, v) => { modules[y][x] = v; reserved[y][x] = 1; };

  // finder patterns + separators
  const drawFinder = (cx, cy) => {
    for(let dy = -4; dy <= 4; dy++){
      for(let dx = -4; dx <= 4; dx++){
        const x = cx + dx, y = cy + dy;
        if(x < 0 || x >= size || y < 0 || y >= size) continue;
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        setFn(x, y, (d !== 2 && d !== 4) ? 1 : 0);
      }
    }
  };
  drawFinder(3, 3);
  drawFinder(size - 4, 3);
  drawFinder(3, size - 4);

  // timing patterns
  for(let i = 0; i < size; i++){
    if(!reserved[6][i]) setFn(i, 6, i % 2 === 0 ? 1 : 0);
    if(!reserved[i][6]) setFn(6, i, i % 2 === 0 ? 1 : 0);
  }

  // alignment patterns
  const alignPositions = (() => {
    if(version === 1) return [];
    const n = Math.floor(version / 7) + 2;
    const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (n * 2 - 2)) * 2;
    const positions = [6];
    for(let pos = size - 7; positions.length < n; pos -= step) positions.unshift(pos);
    return positions;
  })();
  for(const ax of alignPositions){
    for(const ay of alignPositions){
      // skip overlap with finder patterns
      if((ax === 6 && ay === 6) ||
         (ax === 6 && ay === size - 7) ||
         (ax === size - 7 && ay === 6)) continue;
      for(let dy = -2; dy <= 2; dy++){
        for(let dx = -2; dx <= 2; dx++){
          const d = Math.max(Math.abs(dx), Math.abs(dy));
          setFn(ax + dx, ay + dy, d !== 1 ? 1 : 0);
        }
      }
    }
  }

  // reserve format info
  for(let i = 0; i < 9; i++) setFn(8, i, 0);
  for(let i = 0; i < 8; i++) setFn(i, 8, 0);
  for(let i = 0; i < 8; i++) setFn(size - 1 - i, 8, 0);
  for(let i = 0; i < 7; i++) setFn(8, size - 1 - i, 0);
  setFn(8, size - 8, 1); // dark module

  // reserve version info (v7+)
  if(version >= 7){
    let rem = version;
    for(let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
    const bits = (version << 12) | rem;
    for(let i = 0; i < 18; i++){
      const b = (bits >>> i) & 1;
      const a = size - 11 + i % 3;
      const bb = Math.floor(i / 3);
      setFn(a, bb, b);
      setFn(bb, a, b);
    }
  }

  // place data bits in zig-zag pattern from bottom-right
  let bitIdx = 0;
  const totalBits = codewords.length * 8;
  for(let right = size - 1; right >= 1; right -= 2){
    if(right === 6) right = 5; // skip vertical timing column
    for(let vert = 0; vert < size; vert++){
      for(let j = 0; j < 2; j++){
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if(!reserved[y][x] && bitIdx < totalBits){
          modules[y][x] = (codewords[bitIdx >>> 3] >>> (7 - (bitIdx & 7))) & 1;
          bitIdx++;
        }
      }
    }
  }

  return { modules, reserved, size };
}

function applyMask(modules, reserved, mask){
  const size = modules.length;
  for(let y = 0; y < size; y++){
    for(let x = 0; x < size; x++){
      if(reserved[y][x]) continue;
      let invert;
      switch(mask){
        case 0: invert = (x + y) % 2 === 0; break;
        case 1: invert = y % 2 === 0; break;
        case 2: invert = x % 3 === 0; break;
        case 3: invert = (x + y) % 3 === 0; break;
        case 4: invert = (Math.floor(x/3) + Math.floor(y/2)) % 2 === 0; break;
        case 5: invert = (x*y) % 2 + (x*y) % 3 === 0; break;
        case 6: invert = ((x*y) % 2 + (x*y) % 3) % 2 === 0; break;
        case 7: invert = ((x+y) % 2 + (x*y) % 3) % 2 === 0; break;
      }
      if(invert) modules[y][x] ^= 1;
    }
  }
}

function drawFormatBits(modules, ecl, mask){
  const data = (ECC_FORMAT_BITS[ecl] << 3) | mask;
  let rem = data;
  for(let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const bits = ((data << 10) | rem) ^ 0x5412;
  const size = modules.length;
  // copy 1: around top-left finder (col 8 vertical, then row 8 horizontal)
  for(let i = 0; i <= 5; i++) modules[i][8] = (bits >>> i) & 1;
  modules[7][8] = (bits >>> 6) & 1;
  modules[8][8] = (bits >>> 7) & 1;
  modules[8][7] = (bits >>> 8) & 1;
  for(let i = 9; i < 15; i++) modules[8][14 - i] = (bits >>> i) & 1;
  // copy 2: bottom-left vertical + top-right horizontal
  for(let i = 0; i < 8; i++) modules[size - 1 - i][8] = (bits >>> i) & 1;
  for(let i = 8; i < 15; i++) modules[8][size - 15 + i] = (bits >>> i) & 1;
  modules[size - 8][8] = 1; // dark module
}

// Penalty calculation for mask selection
function getPenaltyScore(modules){
  const size = modules.length;
  let total = 0;

  // rule 1: runs of 5+ same color (rows and cols)
  for(let y = 0; y < size; y++){
    let run = 1;
    for(let x = 1; x < size; x++){
      if(modules[y][x] === modules[y][x-1]){
        run++;
        if(run === 5) total += 3;
        else if(run > 5) total++;
      } else run = 1;
    }
  }
  for(let x = 0; x < size; x++){
    let run = 1;
    for(let y = 1; y < size; y++){
      if(modules[y][x] === modules[y-1][x]){
        run++;
        if(run === 5) total += 3;
        else if(run > 5) total++;
      } else run = 1;
    }
  }

  // rule 2: 2x2 blocks
  for(let y = 0; y < size - 1; y++){
    for(let x = 0; x < size - 1; x++){
      const c = modules[y][x];
      if(c === modules[y][x+1] && c === modules[y+1][x] && c === modules[y+1][x+1]) total += 3;
    }
  }

  // rule 3: finder-like patterns (1:1:3:1:1 with 4-module light buffer)
  const finderPat = [1,0,1,1,1,0,1];
  const checkFinder = (line) => {
    let count = 0;
    for(let i = 0; i <= line.length - 11; i++){
      // pattern followed by 4 light or preceded by 4 light
      let matchA = true, matchB = true;
      for(let j = 0; j < 7; j++){
        if(line[i+j] !== finderPat[j]){ matchA = false; break; }
      }
      if(matchA){
        let buffer = true;
        for(let j = 7; j < 11; j++) if(line[i+j] !== 0){ buffer = false; break; }
        if(buffer) count++;
      }
      for(let j = 0; j < 7; j++){
        if(line[i+4+j] !== finderPat[j]){ matchB = false; break; }
      }
      if(matchB){
        let buffer = true;
        for(let j = 0; j < 4; j++) if(line[i+j] !== 0){ buffer = false; break; }
        if(buffer) count++;
      }
    }
    return count;
  };
  for(let y = 0; y < size; y++) total += 40 * checkFinder(modules[y]);
  for(let x = 0; x < size; x++){
    const col = new Uint8Array(size);
    for(let y = 0; y < size; y++) col[y] = modules[y][x];
    total += 40 * checkFinder(col);
  }

  // rule 4: dark/light balance
  let dark = 0;
  for(let y = 0; y < size; y++) for(let x = 0; x < size; x++) if(modules[y][x]) dark++;
  const percent = dark * 100 / (size * size);
  total += Math.floor(Math.abs(percent - 50) / 5) * 10;

  return total;
}

function cloneMatrix(m){ return m.map(row => new Uint8Array(row)); }

export function qrEncode(text, ecl = "M"){
  if(!(ecl in ECC_ORDINAL)) throw new Error("Invalid ECC level");
  const { version, dataCodewords } = encodeBytes(text, ecl);
  const codewords = addEccAndInterleave(version, ecl, dataCodewords);

  // try each mask, pick lowest penalty
  const base = buildMatrix(version, ecl, codewords);
  let bestMask = 0, bestScore = Infinity, bestModules = null;
  for(let mask = 0; mask < 8; mask++){
    const trial = cloneMatrix(base.modules);
    applyMask(trial, base.reserved, mask);
    drawFormatBits(trial, ecl, mask);
    const score = getPenaltyScore(trial);
    if(score < bestScore){
      bestScore = score;
      bestMask = mask;
      bestModules = trial;
    }
  }

  // convert to boolean matrix
  const size = bestModules.length;
  const out = Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => bestModules[y][x] === 1)
  );
  return { size, modules: out, version, mask: bestMask };
}
