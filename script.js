const baseChars = ['A', 'U', 'G', 'C'];
let frame = 0;
let bases = [];
let redHighlighted = false;
let asoHighlighted = false;
let mrnaHighlighted = false;

// Track mouse position for highlight handling during animation re-renders
let lastMouseX = 0, lastMouseY = 0;

// Update highlight states based on current cursor position
function updateHighlightStates() {
  const el = document.elementFromPoint(lastMouseX, lastMouseY);

  const overAso = el && el.closest('.aso');
  const overMrna = el && el.closest('.mrna');
  const overRed = el && (el.closest('.red') || el.closest('.mutation'));

  if (overAso !== asoHighlighted) {
    asoHighlighted = !!overAso;
    document.querySelectorAll('.aso').forEach(e => e.classList.toggle('highlight', asoHighlighted));
  }
  if (overMrna !== mrnaHighlighted) {
    mrnaHighlighted = !!overMrna;
    document.querySelectorAll('.mrna').forEach(e => e.classList.toggle('highlight', mrnaHighlighted));
  }
  if (overRed !== redHighlighted) {
    redHighlighted = !!overRed;
    document.querySelectorAll('.red,.mutation').forEach(e => e.classList.toggle('highlight', redHighlighted));
  }
}

// HTML utilities for text with tags
const html = {
  // Strip HTML tags for length calculation
  plain: (s) => s.replace(/<[^>]*>/g, ''),

  // Clip HTML to N visible chars, closing open tags and padding if shorter
  clip: (s, n) => {
    let result = '', count = 0, inTag = false;
    for (const c of s) {
      if (c === '<') inTag = true;
      if (!inTag && count >= n) break;
      result += c;
      if (c === '>') inTag = false;
      else if (!inTag) count++;
    }
    // Close open span tags
    const open = (result.match(/<span[^>]*>/g) || []).length;
    const close = (result.match(/<\/span>/g) || []).length;
    result += '</span>'.repeat(open - close);
    // Pad if shorter
    if (count < n) result += ' '.repeat(n - count);
    return result;
  },

  // Skip first N visible chars of HTML
  skip: (s, n) => {
    if (n <= 0) return s;
    let result = '', count = 0, inTag = false;
    for (const c of s) {
      if (c === '<') inTag = true;
      if (!inTag) {
        count++;
        if (count <= n) { if (c === '>') inTag = false; continue; }
      }
      result += c;
      if (c === '>') inTag = false;
    }
    return result;
  }
};

// Span builder for RNA bases
const base = (char, cls) => `[<span class="${cls}">${char}</span>]-`;

// Complementary base pairs
const complement = (b) => ({ A: 'U', U: 'A', G: 'C', C: 'G' }[b]);

// Calculate phase progress (0-1 clamped)
const phaseProgress = (frame, phase) =>
  Math.max(0, Math.min(1, (frame - phase.start) / (phase.end - phase.start)));

function getCharWidth() {
  const span = document.createElement('span');
  span.style.cssText = 'font-family:monospace;font-size:14px;position:absolute;visibility:hidden';
  span.textContent = 'X';
  document.body.appendChild(span);
  const width = span.offsetWidth;
  document.body.removeChild(span);
  return width;
}

function calculateBases() {
  const charWidth = getCharWidth();
  const style = getComputedStyle(document.body);
  const availableWidth = document.body.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const maxBases = Math.floor((availableWidth / charWidth - 15) / 4); // 15 for prefix/suffix, 4 chars per base

  bases = [];
  const numBases = Math.max(4, Math.min(maxBases, 40));
  for (let i = 0; i < numBases; i++) {
    bases.push(baseChars[Math.floor(Math.random() * baseChars.length)]);
  }
}

function render() {
  if (bases.length === 0) return;

  const offsets = bases.map((_, i) => Math.round(Math.sin((frame + i * 3) * 0.15)));
  const centerIdx = Math.floor(bases.length / 2);
  const lines = [-1, 0, 1].map(row =>
    bases.map((b, i) => offsets[i] === row
      ? base(b, i === centerIdx ? (redHighlighted ? 'red highlight' : 'red') : (mrnaHighlighted ? 'mrna highlight' : 'mrna'))
      : '    '
    ).join('')
  );

  document.getElementById('rna').innerHTML = lines.map((line, r) =>
    (r === 1 ? " 5'---" : "      ") + line + (r === 1 ? "---3'" : "")
  ).join("\n");
  frame++;
  updateHighlightStates();
}

// ASO Animation
let asoFrame = 0;
const ASO_PHASES = {
  MRNA_ENTER: { start: 0, end: 20 },
  ASO_ENTER: { start: 21, end: 60 },      // ASO enters at upper level
  ASO_DOWN: { start: 61, end: 75 },       // ASO descends to bond
  BOND: { start: 76, end: 95 },           // Bonds form
  HOLD: { start: 96, end: 110 },          // Hold
  CLEAVE: { start: 111, end: 130 },       // X appears
  UNBOND: { start: 131, end: 145 },       // Bonds separate
  ASO_UP: { start: 146, end: 160 },       // ASO ascends
  SPLIT: { start: 161, end: 210 },        // ASO exits, mRNA splits
  TOTAL: 211
};

// Build mRNA content
// cleavageChar: null = normal, 'X' = cleaving, ' ' = cleaved (gap)
function buildMrna(bases, centerIdx, hlRed, hlMrna, cleavageChar) {
  let s = " 5'---";
  for (let i = 0; i < bases.length; i++) {
    s += base(bases[i], i === centerIdx ? hlRed : hlMrna);
  }
  s += "---3'";

  if (cleavageChar) {
    const plain = html.plain(s);
    const midPoint = Math.floor(plain.length / 2);
    let targetIdx = -1;
    for (let i = midPoint; i < plain.length && targetIdx < 0; i++) if (plain[i] === '-') targetIdx = i;
    for (let i = midPoint - 1; i >= 0 && targetIdx < 0; i--) if (plain[i] === '-') targetIdx = i;

    if (targetIdx >= 0) {
      let count = 0, inTag = false;
      for (let i = 0; i < s.length; i++) {
        if (s[i] === '<') inTag = true;
        else if (s[i] === '>') inTag = false;
        else if (!inTag) {
          if (count === targetIdx) { s = s.slice(0, i) + cleavageChar + s.slice(i + 1); break; }
          count++;
        }
      }
    }
  }
  return s;
}

// Build ASO content
function buildAso(bases, asoStart, asoEnd, hlAso) {
  let s = "   ";
  for (let i = 0; i < bases.length; i++) {
    if (i >= asoStart && i < asoEnd) {
      const b = complement(bases[i]);
      if (i === asoStart) s += `3'-${base(b, hlAso)}`;
      else if (i === asoEnd - 1) s += `[<span class="${hlAso}">${b}</span>]-5'`;
      else s += base(b, hlAso);
    } else {
      s += "    ";
    }
  }
  return s;
}

// Build connector line (bonds)
function buildConn(bases, asoStart, asoEnd, visibleBonds) {
  return "      " + bases.map((_, i) =>
    (i >= asoStart && i < asoEnd && visibleBonds > (i - asoStart)) ? " |  " : "    "
  ).join('');
}

function renderASO() {
  if (bases.length === 0) return;

  const asoLength = Math.max(4, Math.floor(bases.length / 2));
  const asoStart = Math.floor((bases.length - asoLength) / 2);
  const asoEnd = asoStart + asoLength;
  const centerIdx = Math.floor(bases.length / 2);
  const viewportWidth = bases.length * 4 + 12;
  const phase = asoFrame;

  const hlAso = asoHighlighted ? 'aso highlight' : 'aso';
  const hlRed = redHighlighted ? 'red highlight' : 'red';
  const hlMrna = mrnaHighlighted ? 'mrna highlight' : 'mrna';

  const empty = ' '.repeat(viewportWidth);
  const clip = (line) => html.clip(line, viewportWidth);
  const asoContent = () => clip(buildAso(bases, asoStart, asoEnd, hlAso));

  // Calculate visible bonds (during BOND through UNBOND phases)
  let visibleBonds = 0;
  if (phase >= ASO_PHASES.BOND.start && phase < ASO_PHASES.UNBOND.end) {
    if (phase < ASO_PHASES.BOND.end) {
      visibleBonds = Math.floor(phaseProgress(phase, ASO_PHASES.BOND) * asoLength);
    } else if (phase < ASO_PHASES.UNBOND.start) {
      visibleBonds = asoLength;
    } else {
      // Unbonding - bonds disappear from edges inward
      visibleBonds = Math.floor((1 - phaseProgress(phase, ASO_PHASES.UNBOND)) * asoLength);
    }
  }

  // Cleavage state: null before, 'X' during, ' ' after
  const cleavageChar = phase >= ASO_PHASES.CLEAVE.end ? ' ' :
                       phase >= ASO_PHASES.CLEAVE.start ? 'X' : null;

  // 4 lines: asoUpper, asoLower, connector, mRNA
  let asoUpper, asoLower, connLine, mrnaLine;

  if (phase < ASO_PHASES.MRNA_ENTER.end) {
    // mRNA entering from left
    const visible = Math.floor((phase / ASO_PHASES.MRNA_ENTER.end) * viewportWidth);
    asoUpper = asoLower = connLine = empty;
    mrnaLine = html.clip(buildMrna(bases, centerIdx, hlRed, hlMrna, null), visible);

  } else if (phase < ASO_PHASES.ASO_ENTER.start) {
    // mRNA in place, ASO not yet
    asoUpper = asoLower = connLine = empty;
    mrnaLine = clip(buildMrna(bases, centerIdx, hlRed, hlMrna, null));

  } else if (phase < ASO_PHASES.ASO_ENTER.end) {
    // ASO entering at upper level
    const progress = phaseProgress(phase, ASO_PHASES.ASO_ENTER);
    const fullAso = buildAso(bases, asoStart, asoEnd, hlAso);
    const charsToSkip = Math.floor((1 - progress) * html.plain(fullAso).length);
    asoUpper = clip(html.skip(fullAso, charsToSkip));
    asoLower = connLine = empty;
    mrnaLine = clip(buildMrna(bases, centerIdx, hlRed, hlMrna, null));

  } else if (phase < ASO_PHASES.ASO_DOWN.end) {
    // ASO descending (snap at midpoint)
    const progress = phaseProgress(phase, ASO_PHASES.ASO_DOWN);
    if (progress < 0.5) {
      asoUpper = asoContent();
      asoLower = empty;
    } else {
      asoUpper = empty;
      asoLower = asoContent();
    }
    connLine = empty;
    mrnaLine = clip(buildMrna(bases, centerIdx, hlRed, hlMrna, null));

  } else if (phase < ASO_PHASES.ASO_UP.start) {
    // ASO in lower position: bonding, holding, cleaving, unbonding
    asoUpper = empty;
    asoLower = asoContent();
    connLine = clip(buildConn(bases, asoStart, asoEnd, visibleBonds));
    mrnaLine = clip(buildMrna(bases, centerIdx, hlRed, hlMrna, cleavageChar));

  } else if (phase < ASO_PHASES.SPLIT.start) {
    // ASO ascending (snap at midpoint)
    const progress = phaseProgress(phase, ASO_PHASES.ASO_UP);
    if (progress < 0.5) {
      asoUpper = empty;
      asoLower = asoContent();
    } else {
      asoUpper = asoContent();
      asoLower = empty;
    }
    connLine = empty;
    mrnaLine = clip(buildMrna(bases, centerIdx, hlRed, hlMrna, cleavageChar));

  } else {
    // ASO exits right from upper level, mRNA splits
    const progress = phaseProgress(phase, { start: ASO_PHASES.SPLIT.start, end: ASO_PHASES.TOTAL });
    const offset = Math.floor(progress * viewportWidth / 2);

    asoUpper = clip(' '.repeat(offset) + buildAso(bases, asoStart, asoEnd, hlAso));
    asoLower = connLine = empty;

    // Build mRNA halves - left half includes the red (mutant) base
    let leftHalf = " 5'---" + bases.slice(0, centerIdx).map(b => base(b, hlMrna)).join('') + base(bases[centerIdx], hlRed);
    leftHalf = leftHalf.replace(/-$/, '');
    let rightHalf = bases.slice(centerIdx + 1).map(b => base(b, hlMrna)).join('') + "---3'";
    const gap = ' '.repeat(offset * 2 + 4);
    mrnaLine = clip(html.skip(leftHalf + gap + rightHalf, offset));
  }

  document.getElementById('aso').innerHTML = asoUpper + "\n" + asoLower + "\n" + connLine + "\n" + mrnaLine;
  asoFrame = (asoFrame + 1) % ASO_PHASES.TOTAL;
  updateHighlightStates();
}

// Initialize and start animations
calculateBases();
setInterval(render, 83);
setInterval(renderASO, 120);
render();
renderASO();

window.addEventListener('resize', () => {
  calculateBases();
  asoFrame = 0;
  render();
  renderASO();
});

document.addEventListener('mousemove', (e) => {
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  updateHighlightStates();
});
