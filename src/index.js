import { readFile } from 'node:fs/promises';

const XML_ESCAPE = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;'
};

export function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (char) => XML_ESCAPE[char]);
}

function attrs(input = {}) {
  return Object.entries(input)
    .filter(([, value]) => value !== undefined && value !== null && value !== false)
    .map(([key, value]) => {
      if (value === true) {
        return escapeXml(key);
      }

      return `${escapeXml(key)}="${escapeXml(value)}"`;
    })
    .join(' ');
}

function tag(name, attributes = {}, children = []) {
  const attrText = attrs(attributes);
  const open = attrText ? `<${name} ${attrText}` : `<${name}`;
  const list = Array.isArray(children) ? children : [children];
  const body = list.filter(Boolean).join('\n');

  if (!body) {
    return `${open}/>`;
  }

  return `${open}>\n${body}\n</${name}>`;
}

function scopedTheme(theme, fallback = {}) {
  return {
    accent: '#8B5CF6',
    accent2: '#46E3FF',
    background: '#100719',
    border: '#8A8A94',
    muted: '#D9C8FF',
    panel: '#0B0711',
    panelText: '#FFFFFF',
    text: '#FFFFFF',
    ...fallback,
    ...theme
  };
}

function normalizeChildren(children) {
  return children.flat(Infinity).filter(Boolean);
}

function formatSeconds(value) {
  return `${Number(value.toFixed(2))}s`;
}

function formatNumber(value) {
  return String(Number(value.toFixed(2)));
}

function translatedGroupAttrs(groupAttrs, x, y) {
  const existing = groupAttrs.transform ? `${groupAttrs.transform} ` : '';
  return {
    ...groupAttrs,
    transform: `${existing}translate(${x} ${y})`.trim()
  };
}

export function defineScene(scene) {
  return scene;
}

export function keyframes(name, frames) {
  return `@keyframes ${name} {\n${frames}\n}`;
}

export const motion = {
  fadeIn(name = 'fadeIn') {
    return keyframes(name, '  from { opacity: 0; }\n  to { opacity: 1; }');
  },
  drift(name = 'bgDrift') {
    return keyframes(name, [
      '  0%, 100% { transform: translate(0, 0) scale(1); }',
      '  50% { transform: translate(-10px, 6px) scale(1.015); }'
    ].join('\n'));
  },
  typeIn(name = 'typeIn') {
    return keyframes(name, [
      '  from { opacity: 0; clip-path: inset(0 100% 0 0); }',
      '  5% { opacity: 1; }',
      '  to { opacity: 1; clip-path: inset(0 0 0 0); }'
    ].join('\n'));
  },
  blink(name = 'blink') {
    return keyframes(name, '  0%, 45% { opacity: 1; }\n  46%, 100% { opacity: 0; }');
  },
  cursorStep(name = 'cursorStep') {
    return keyframes(name, '  from, to { opacity: 1; }');
  },
  pulse(name = 'softPulse') {
    return keyframes(name, '  0%, 100% { opacity: 0.78; }\n  50% { opacity: 1; }');
  }
};

export const css = {
  font(display = false) {
    if (display) {
      return 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    }

    return '"JetBrains Mono", "SFMono-Regular", Consolas, monospace';
  },
  classRule(selector, declarations) {
    const body = Object.entries(declarations)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n');

    return `${selector} {\n${body}\n}`;
  }
};

export function rect(options = {}) {
  return tag('rect', options);
}

export function group(children = [], options = {}) {
  return tag('g', options, normalizeChildren(children));
}

export function text(value, options = {}) {
  return tag('text', options, escapeXml(value));
}

export function path(d, options = {}) {
  return tag('path', { d, ...options });
}

export function raw(svg) {
  return svg;
}

export function pill(options = {}) {
  const {
    x = 0,
    y = 0,
    label,
    value,
    width,
    height = 40,
    radius = 6,
    labelWidth,
    fill = '#111111',
    accent = '#8B5CF6',
    textColor = '#FFFFFF',
    className = 'pill',
    valueClass = 'pill-value',
    labelClass = 'pill-label',
    groupAttrs = {}
  } = options;
  const safeLabel = String(label ?? '');
  const safeValue = String(value ?? '');
  const boxWidth = width ?? Math.max(164, (safeLabel.length + safeValue.length) * 12 + 56);
  const leftWidth = labelWidth ?? Math.max(78, safeLabel.length * 11 + 28);

  return group([
    rect({ x: 0, y: 0, width: boxWidth, height, rx: radius, fill, 'fill-opacity': 0.92 }),
    rect({ x: leftWidth, y: 0, width: boxWidth - leftWidth, height, rx: radius, fill: accent }),
    rect({ x: leftWidth, y: 0, width: 7, height, fill: accent }),
    text(safeLabel, { x: leftWidth / 2, y: height / 2 + 7, 'text-anchor': 'middle', class: labelClass }),
    text(safeValue, { x: leftWidth + (boxWidth - leftWidth) / 2, y: height / 2 + 7, 'text-anchor': 'middle', fill: textColor, class: valueClass })
  ], { ...translatedGroupAttrs(groupAttrs, x, y), class: className });
}

export function chip(options = {}) {
  const {
    x = 0,
    y = 0,
    label,
    width,
    height = 32,
    radius = 5,
    fill = '#111111',
    stroke = '#FFFFFF',
    textColor,
    className = 'chip',
    groupAttrs = {}
  } = options;
  const safeLabel = String(label ?? '');
  const boxWidth = width ?? Math.max(96, safeLabel.length * 10 + 34);

  return group([
    rect({ x: 0, y: 0, width: boxWidth, height, rx: radius, fill, stroke, 'stroke-opacity': 0.14, 'fill-opacity': 0.9 }),
    text(safeLabel, { x: boxWidth / 2, y: height / 2 + 5, 'text-anchor': 'middle', fill: textColor, class: `${className}-label` })
  ], { ...translatedGroupAttrs(groupAttrs, x, y), class: className });
}

export function panel(options = {}, children = []) {
  const {
    x = 0,
    y = 0,
    width = 300,
    height = 120,
    radius = 8,
    fill = '#050508',
    stroke = '#8B5CF6',
    opacity = 0.52,
    strokeOpacity = 0.28,
    className = 'panel',
    groupAttrs = {}
  } = options;

  return group([
    rect({ x: 0, y: 0, width, height, rx: radius, fill, 'fill-opacity': opacity, stroke, 'stroke-opacity': strokeOpacity }),
    ...normalizeChildren(children)
  ], { ...translatedGroupAttrs(groupAttrs, x, y), class: className });
}

export function row(items, options = {}) {
  const { x = 0, y = 0, gap = 12, render } = options;
  let cursor = x;

  return items.map((item, index) => {
    const output = render(item, cursor, y, index);
    cursor += output.width + gap;
    return output.svg;
  });
}

export function centerRow(items, options = {}) {
  const { centerX, y, gap = 12, measure, render } = options;
  const widths = items.map(measure);
  const total = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, items.length - 1) * gap;
  let cursor = centerX - total / 2;

  return items.map((item, index) => {
    const width = widths[index];
    const svg = render(item, cursor, y, width, index);
    cursor += width + gap;
    return svg;
  });
}

export function terminal(options = {}) {
  const {
    x = 0,
    y = 0,
    width = 672,
    lineHeight = 28,
    lines = [],
    opacity = 0.52,
    radius = 8,
    strokeOpacity = 0.28,
    theme,
    maxLines = 4,
    startY = 40,
    className = 'terminal',
    groupAttrs = {}
  } = options;
  const visibleLines = lines.slice(0, maxLines);
  const height = Math.max(80, startY + visibleLines.length * lineHeight + 12);
  const t = scopedTheme(theme);
  const typeStartDelay = 0.55;
  const typeLineStagger = 1;
  const typeDuration = 0.95;
  const charWidth = 13.2;
  const doneDelay = visibleLines.length > 0
    ? typeStartDelay + (visibleLines.length - 1) * typeLineStagger + typeDuration
    : typeStartDelay;

  const lineNodes = visibleLines.map((line, index) => {
    const prefix = index === 0 ? '$' : '>';
    const content = `${prefix} ${line}`;
    const delaySeconds = typeStartDelay + index * typeLineStagger;
    const delay = formatSeconds(delaySeconds);
    const cursorDistance = Math.min(width - 40, content.length * charWidth);
    const cursorStart = width / 2 - cursorDistance / 2;
    const stepDuration = typeDuration / content.length;
    const isLastLine = index === visibleLines.length - 1;
    const cursorStepDuration = stepDuration * 0.9;
    const cursorY = startY + index * lineHeight - 21;
    const stepCount = isLastLine ? content.length : content.length + 1;
    const cursorSteps = Array.from({ length: stepCount }, (_, stepIndex) => {
      return rect({
        x: formatNumber(cursorStart + stepIndex * charWidth),
        y: cursorY,
        width: 3.5,
        height: 24,
        rx: 1.75,
        class: 'cursor-step',
        style: `--cursor-step-delay: ${formatSeconds(delaySeconds + stepIndex * stepDuration)}; --cursor-step-duration: ${formatSeconds(cursorStepDuration)};`
      });
    });
    const finalCursor = isLastLine
      ? rect({
        x: formatNumber(cursorStart + cursorDistance),
        y: cursorY,
        width: 3.5,
        height: 24,
        rx: 1.75,
        class: 'cursor-blink',
        style: `--blink-delay: ${formatSeconds(doneDelay)};`
      })
      : null;

    return [
      text(content, {
        x: width / 2,
        y: startY + index * lineHeight,
        'text-anchor': 'middle',
        class: index === 0 ? 'typing-line active-line typed' : 'typing-line typed',
        style: `--type-delay: ${delay}; --type-duration: ${formatSeconds(typeDuration)}; --chars: ${content.length};`
      }),
      ...cursorSteps,
      finalCursor
    ];
  });

  return panel({
    x,
    y,
    width,
    height,
    radius,
    fill: t.panel,
    opacity,
    stroke: t.accent,
    strokeOpacity,
    className,
    groupAttrs
  }, [
    ...lineNodes
  ]);
}

export function embeddedSvg(svg, options = {}) {
  const clean = stripSvgDocument(svg);
  const viewBox = clean.viewBox ?? `0 0 ${options.width ?? 1200} ${options.height ?? 630}`;

  return tag('svg', {
    x: options.x ?? 0,
    y: options.y ?? 0,
    width: options.width,
    height: options.height,
    viewBox,
    preserveAspectRatio: options.preserveAspectRatio ?? 'xMidYMid slice',
    class: options.className,
    'aria-hidden': 'true'
  }, clean.inner);
}

export async function svgFile(filePath, options = {}) {
  const svg = await readFile(filePath, 'utf8');
  return embeddedSvg(svg, options);
}

function stripSvgDocument(svg) {
  const clean = String(svg)
    .replace(/<\?xml[\s\S]*?\?>/i, '')
    .replace(/<!doctype[\s\S]*?>/i, '')
    .trim();
  const openMatch = clean.match(/<svg\b([^>]*)>/i);
  const closeIndex = clean.toLowerCase().lastIndexOf('</svg>');

  if (!openMatch || closeIndex === -1) {
    throw new Error('Expected a valid SVG document.');
  }

  const attrsText = openMatch[1] ?? '';
  const inner = clean.slice(openMatch.index + openMatch[0].length, closeIndex);
  const viewBox = attrsText.match(/\bviewBox=["']([^"']+)["']/i)?.[1];

  return { inner, viewBox };
}

export function createSvg(scene, variant, body) {
  const width = Number(scene.width ?? 1200);
  const height = Number(scene.height ?? 630);
  const radius = Number(scene.radius ?? 10);
  const theme = scopedTheme(scene.themes?.[variant], scene.theme);
  const title = scene.title ?? 'profile scene';
  const description = scene.description ?? '';
  const extraDefs = normalizeChildren(scene.defs?.({ theme, variant }) ?? []);
  const styles = [
    motion.fadeIn(),
    motion.drift(),
    motion.typeIn(),
    motion.blink(),
    motion.cursorStep(),
    motion.pulse(),
    defaultStyles(theme),
    scene.styles?.({ theme, variant }) ?? ''
  ].filter(Boolean).join('\n\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <metadata>${escapeXml(scene.generator ?? 'Generated with prplx Banner Framework')}</metadata>
  <!-- generated-with: prplx-banner-framework -->
  <title id="title">${escapeXml(title)}</title>
  <desc id="desc">${escapeXml(description)}</desc>
  <defs>
    <clipPath id="sceneClip">
      <rect x="0" y="0" width="${width}" height="${height}" rx="${radius}"/>
    </clipPath>
    <filter id="fxSoftShadow" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000000" flood-opacity="0.34"/>
    </filter>
    <filter id="fxGlow" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="fxGlassBlur" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="8"/>
    </filter>
    <linearGradient id="sceneFade" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="${escapeXml(theme.fadeTop ?? '#000000')}" stop-opacity="${theme.fadeTopOpacity ?? 0.12}"/>
      <stop offset="0.55" stop-color="${escapeXml(theme.fadeMid ?? '#000000')}" stop-opacity="${theme.fadeMidOpacity ?? 0.24}"/>
      <stop offset="1" stop-color="${escapeXml(theme.fadeBottom ?? '#000000')}" stop-opacity="${theme.fadeBottomOpacity ?? 0.64}"/>
    </linearGradient>
    ${extraDefs.join('\n    ')}
    <style>
${styles}
    </style>
  </defs>
  <g clip-path="url(#sceneClip)">
${body}
  </g>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="${radius}" fill="none" stroke="${escapeXml(theme.border)}" stroke-opacity="${theme.borderOpacity ?? 0.72}" stroke-width="${theme.borderWidth ?? 1}"/>
</svg>
`;
}

function defaultStyles(theme) {
  return [
    css.classRule('.scene-bg', {
      animation: 'bgDrift 16s ease-in-out infinite',
      'transform-origin': '50% 50%'
    }),
    css.classRule('.fx-shadow', {
      filter: 'url(#fxSoftShadow)'
    }),
    css.classRule('.fx-glow', {
      filter: 'url(#fxGlow)'
    }),
    css.classRule('.fx-glass', {
      filter: 'url(#fxGlassBlur)'
    }),
    css.classRule('.fade-in', {
      animation: 'fadeIn 0.8s ease-out both'
    }),
    css.classRule('.anim-drift', {
      animation: 'bgDrift var(--duration, 16s) ease-in-out var(--delay, 0s) infinite',
      'transform-origin': 'var(--origin, 50% 50%)'
    }),
    css.classRule('.anim-pulse', {
      animation: 'softPulse var(--duration, 5.2s) ease-in-out var(--delay, 0s) infinite'
    }),
    css.classRule('.anim-fade', {
      animation: 'fadeIn var(--duration, 0.8s) ease-out var(--delay, 0s) both'
    }),
    css.classRule('.typed', {
      animation: 'typeIn var(--type-duration, 1.2s) steps(var(--chars), end) both',
      'animation-delay': 'var(--type-delay, 0s)'
    }),
    css.classRule('.cursor-step', {
      fill: theme.accent2,
      opacity: 0,
      animation: 'cursorStep var(--cursor-step-duration, 0.16s) linear var(--cursor-step-delay, 0s) 1'
    }),
    css.classRule('.cursor-blink', {
      fill: theme.accent2,
      opacity: 0,
      animation: 'blink 0.85s steps(1, end) var(--blink-delay, 4s) infinite'
    }),
    css.classRule('.title', {
      font: `800 74px ${css.font(true)}`,
      fill: theme.text,
      'letter-spacing': 0
    }),
    css.classRule('.subtitle', {
      font: `500 22px ${css.font(true)}`,
      fill: theme.muted,
      'letter-spacing': 0
    }),
    css.classRule('.typing-line', {
      font: `500 22px ${css.font(false)}`,
      fill: theme.panelText,
      'letter-spacing': 0
    }),
    css.classRule('.active-line', {
      fill: theme.accent
    }),
    css.classRule('.tagline', {
      font: `600 22px ${css.font(true)}`,
      fill: theme.text,
      'letter-spacing': 0
    }),
    css.classRule('.pill-label', {
      font: `700 16px ${css.font(true)}`,
      fill: '#ffffff',
      'letter-spacing': 0
    }),
    css.classRule('.pill-value', {
      font: `800 16px ${css.font(true)}`,
      'letter-spacing': 0
    }),
    css.classRule('.chip-label', {
      font: `700 14px ${css.font(true)}`,
      fill: theme.text,
      'letter-spacing': 0
    })
  ].join('\n\n');
}

export async function renderScene(scene, variant) {
  const width = Number(scene.width ?? 1200);
  const height = Number(scene.height ?? 630);
  const theme = scopedTheme(scene.themes?.[variant], scene.theme);
  const ctx = {
    components: { centerRow, chip, embeddedSvg, group, panel, path, pill, raw, rect, row, svgFile, terminal, text },
    height,
    theme,
    variant,
    width
  };
  const body = normalizeChildren(await scene.render(ctx)).join('\n');

  return createSvg(scene, variant, body);
}

export function pictureSnippet(options = {}) {
  const {
    alt = 'profile scene',
    dark = './assets/scene-dark.svg',
    light = './assets/scene-light.svg',
    width = '100%'
  } = options;

  return `<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="${escapeXml(dark)}">
    <source media="(prefers-color-scheme: light)" srcset="${escapeXml(light)}">
    <img src="${escapeXml(dark)}" width="${escapeXml(width)}" alt="${escapeXml(alt)}">
  </picture>
</p>
`;
}
