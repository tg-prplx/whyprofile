import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { defineScene } from './index.js';

const THEME_KEYS = new Set([
  'accent',
  'accent2',
  'background',
  'border',
  'borderOpacity',
  'borderWidth',
  'chipFill',
  'chipText',
  'fadeBottom',
  'fadeBottomOpacity',
  'fadeMid',
  'fadeMidOpacity',
  'fadeTop',
  'fadeTopOpacity',
  'muted',
  'panel',
  'panelText',
  'text'
]);

const NUMERIC_THEME_KEYS = new Set([
  'borderOpacity',
  'borderWidth',
  'fadeBottomOpacity',
  'fadeMidOpacity',
  'fadeTopOpacity'
]);

export async function htmlScene(filePath) {
  const source = await readFile(filePath, 'utf8');
  const baseDir = path.dirname(filePath);
  const { css, html } = extractStyles(source);
  const root = parseHtml(html).find((node) => node.type === 'element' && node.name === 'bf-scene');

  if (!root) {
    throw new Error('HTML scene must contain a <bf-scene> root element.');
  }

  const { cleanCss, themes } = parseThemeCss(css);
  const sceneWidth = numberAttr(root, 'width', 1200);
  const sceneHeight = numberAttr(root, 'height', 630);
  const background = root.attrs.background ? path.resolve(baseDir, root.attrs.background) : null;
  const sceneRadius = numberAttr(root, 'radius', 10);

  return defineScene({
    alt: root.attrs.alt ?? root.attrs.title ?? 'profile scene',
    description: root.attrs.description ?? '',
    generator: root.attrs.generator ?? 'Generated with prplx Banner Framework',
    height: sceneHeight,
    radius: sceneRadius,
    title: root.attrs.title ?? 'profile scene',
    width: sceneWidth,
    themes,
    styles() {
      return cleanCss;
    },
    async render(ctx) {
      const { components, height, theme, variant, width } = ctx;
      const children = [];

      children.push(components.rect({ width, height, fill: theme.background }));

      if (background && root.attrs['auto-background'] !== 'false') {
        children.push(await components.svgFile(background, {
          className: root.attrs['background-class'] ?? 'scene-bg',
          height: numberAttr(root, 'background-height', height + 36),
          width: numberAttr(root, 'background-width', width + 48),
          x: numberAttr(root, 'background-x', -24),
          y: numberAttr(root, 'background-y', -18)
        }));
      }

      if (root.attrs.fade !== 'false') {
        children.push(components.rect({ width, height, fill: 'url(#sceneFade)' }));
      }

      for (const child of root.children) {
        const rendered = await renderNode(child, ctx, { baseDir, variant });
        if (rendered) {
          children.push(rendered);
        }
      }

      return children;
    }
  });
}

function extractStyles(source) {
  let css = '';
  const html = source.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_, body) => {
    css += `${body}\n`;
    return '';
  });

  return { css, html };
}

function parseThemeCss(css) {
  const themes = { dark: {}, light: {} };
  const cleanCss = css.replace(/:theme\((dark|light)\)\s*\{([\s\S]*?)\}/gi, (_, variant, body) => {
    const key = variant.toLowerCase();
    themes[key] = { ...themes[key], ...parseThemeDeclarations(body) };
    return '';
  }).trim();

  return { cleanCss, themes };
}

function parseThemeDeclarations(body) {
  const output = {};

  for (const declaration of body.split(';')) {
    const [rawName, ...rawValue] = declaration.split(':');
    const value = rawValue.join(':').trim();
    const prop = rawName?.trim();

    if (!prop || !value || !prop.startsWith('--')) {
      continue;
    }

    const key = cssVarToThemeKey(prop);

    if (!THEME_KEYS.has(key)) {
      continue;
    }

    output[key] = NUMERIC_THEME_KEYS.has(key) ? Number(value) : value;
  }

  return output;
}

function cssVarToThemeKey(prop) {
  const name = prop.slice(2);

  if (name === 'accent-2') {
    return 'accent2';
  }

  return name.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function parseHtml(input) {
  const root = { children: [], name: '#root', attrs: {}, type: 'element' };
  const stack = [root];
  const tokens = input.replace(/<!--[\s\S]*?-->/g, '').match(/<\/?[^>]+>|[^<]+/g) ?? [];

  for (const token of tokens) {
    if (token.startsWith('</')) {
      const name = token.slice(2, -1).trim().toLowerCase();
      while (stack.length > 1) {
        const current = stack.pop();
        if (current.name === name) {
          break;
        }
      }
      continue;
    }

    if (token.startsWith('<')) {
      const selfClosing = token.endsWith('/>');
      const parsed = parseTag(token);
      const parent = stack.at(-1);
      parent.children.push(parsed);

      if (!selfClosing && !isVoidTag(parsed.name)) {
        stack.push(parsed);
      }
      continue;
    }

    const text = token.replace(/\s+/g, ' ').trim();
    if (text) {
      stack.at(-1).children.push({ type: 'text', value: decodeEntities(text) });
    }
  }

  return root.children;
}

function parseTag(token) {
  const clean = token.slice(1, token.endsWith('/>') ? -2 : -1).trim();
  const nameMatch = clean.match(/^([^\s/>]+)/);
  const name = nameMatch?.[1]?.toLowerCase();

  if (!name) {
    throw new Error(`Invalid HTML tag: ${token}`);
  }

  const attrText = clean.slice(nameMatch[0].length);
  return {
    attrs: parseAttrs(attrText),
    children: [],
    name,
    type: 'element'
  };
}

function parseAttrs(input) {
  const attrs = {};
  const attrPattern = /([:@A-Za-z0-9_.-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>/]+)))?/g;
  let match;

  while ((match = attrPattern.exec(input))) {
    const [, name, doubleValue, singleValue, bareValue] = match;
    attrs[name.toLowerCase()] = decodeEntities(doubleValue ?? singleValue ?? bareValue ?? 'true');
  }

  return attrs;
}

function isVoidTag(name) {
  return ['br', 'hr', 'img', 'input', 'meta', 'link'].includes(name);
}

function decodeEntities(value) {
  return String(value)
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&');
}

async function renderNode(node, ctx, options) {
  if (node.type === 'text') {
    return null;
  }

  const { components, theme } = ctx;
  const common = decoratedAttrs(node);

  switch (node.name) {
    case 'bf-bg':
    case 'bf-background': {
      const src = node.attrs.src ?? node.attrs.background;
      if (!src) {
        return null;
      }

      return components.svgFile(path.resolve(options.baseDir, src), {
        className: node.attrs.class ?? 'scene-bg',
        height: numberAttr(node, 'height', ctx.height + 36),
        width: numberAttr(node, 'width', ctx.width + 48),
        x: numberAttr(node, 'x', -24),
        y: numberAttr(node, 'y', -18)
      });
    }

    case 'bf-text':
      return components.text(node.attrs.value ?? textContent(node), {
        ...common,
        fill: node.attrs.fill,
        opacity: numberAttr(node, 'opacity', undefined),
        rotate: undefined,
        x: numberAttr(node, 'x', 0),
        y: numberAttr(node, 'y', 0),
        'text-anchor': node.attrs.anchor ?? node.attrs['text-anchor'] ?? common['text-anchor']
      });

    case 'bf-rect':
      return components.rect({
        ...common,
        fill: node.attrs.fill,
        'fill-opacity': numberAttr(node, 'fill-opacity', undefined),
        filter: filterAttr(node),
        height: numberAttr(node, 'height', undefined),
        rx: numberAttr(node, 'rx', numberAttr(node, 'radius', undefined)),
        stroke: node.attrs.stroke,
        'stroke-opacity': numberAttr(node, 'stroke-opacity', undefined),
        'stroke-width': numberAttr(node, 'stroke-width', undefined),
        width: numberAttr(node, 'width', undefined),
        x: numberAttr(node, 'x', 0),
        y: numberAttr(node, 'y', 0)
      });

    case 'bf-group':
      return components.group(await renderChildren(node, ctx, options), common);

    case 'bf-panel':
      return components.panel({
        className: classList(node.attrs.class ?? 'panel', effectClass(node), animationClass(node)),
        fill: node.attrs.fill ?? theme.panel,
        groupAttrs: groupAttrs(node),
        height: numberAttr(node, 'height', 120),
        opacity: numberAttr(node, 'opacity', 0.52),
        radius: numberAttr(node, 'rx', numberAttr(node, 'radius', 8)),
        stroke: node.attrs.stroke ?? theme.accent,
        strokeOpacity: numberAttr(node, 'stroke-opacity', 0.28),
        width: numberAttr(node, 'width', 300),
        x: numberAttr(node, 'x', 0),
        y: numberAttr(node, 'y', 0)
      }, await renderChildren(node, ctx, options));

    case 'bf-pill':
      return components.pill({
        accent: node.attrs.accent ?? theme.accent,
        className: classList(node.attrs.class ?? 'pill', effectClass(node), animationClass(node)),
        fill: node.attrs.fill ?? '#111111',
        groupAttrs: groupAttrs(node),
        label: node.attrs.label ?? textContent(node),
        radius: numberAttr(node, 'rx', numberAttr(node, 'radius', 6)),
        textColor: node.attrs['text-color'] ?? '#FFFFFF',
        value: node.attrs.value ?? '',
        width: numberAttr(node, 'width', undefined),
        x: numberAttr(node, 'x', 0),
        y: numberAttr(node, 'y', 0)
      });

    case 'bf-chip':
      return components.chip({
        className: classList(node.attrs.class ?? 'chip', effectClass(node), animationClass(node)),
        fill: node.attrs.fill ?? theme.chipFill ?? '#111111',
        groupAttrs: groupAttrs(node),
        label: node.attrs.label ?? textContent(node),
        radius: numberAttr(node, 'rx', numberAttr(node, 'radius', 5)),
        stroke: node.attrs.stroke ?? '#FFFFFF',
        textColor: node.attrs['text-color'] ?? theme.chipText ?? '#FFFFFF',
        width: numberAttr(node, 'width', undefined),
        x: numberAttr(node, 'x', 0),
        y: numberAttr(node, 'y', 0)
      });

    case 'bf-terminal':
      return components.terminal({
        className: classList(node.attrs.class ?? 'terminal', effectClass(node), animationClass(node)),
        groupAttrs: groupAttrs(node),
        lines: terminalLines(node),
        lineHeight: numberAttr(node, 'line-height', 28),
        maxLines: numberAttr(node, 'max-lines', 4),
        opacity: numberAttr(node, 'opacity', 0.52),
        radius: numberAttr(node, 'rx', numberAttr(node, 'radius', 8)),
        startY: numberAttr(node, 'start-y', 40),
        strokeOpacity: numberAttr(node, 'stroke-opacity', 0.28),
        theme,
        width: numberAttr(node, 'width', 672),
        x: numberAttr(node, 'x', 0),
        y: numberAttr(node, 'y', 0)
      });

    case 'bf-row':
      return components.group(await renderRow(node, ctx, options), common);

    case 'bf-path':
      return components.path(node.attrs.d ?? textContent(node), {
        ...common,
        fill: node.attrs.fill,
        filter: filterAttr(node),
        stroke: node.attrs.stroke,
        'stroke-width': numberAttr(node, 'stroke-width', undefined)
      });

    case 'bf-raw':
      return node.children.map((child) => child.type === 'text' ? child.value : '').join('');

    default:
      return components.group(await renderChildren(node, ctx, options), common);
  }
}

async function renderChildren(node, ctx, options) {
  const children = [];

  for (const child of node.children) {
    const rendered = await renderNode(child, ctx, options);
    if (rendered) {
      children.push(rendered);
    }
  }

  return children;
}

async function renderRow(node, ctx, options) {
  const items = node.children.filter((child) => child.type === 'element');
  const gap = numberAttr(node, 'gap', 12);
  const y = numberAttr(node, 'y', 0);
  const widths = items.map(measureNode);
  const total = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, widths.length - 1) * gap;
  let cursor = node.attrs['center-x'] ? numberAttr(node, 'center-x', 0) - total / 2 : numberAttr(node, 'x', 0);
  const rendered = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = cloneNode(items[index]);
    item.attrs.x = String(cursor);
    item.attrs.y = String(numberAttr(item, 'y', y));
    item.attrs.width ??= String(widths[index]);
    const output = await renderNode(item, ctx, options);
    if (output) {
      rendered.push(output);
    }
    cursor += widths[index] + gap;
  }

  return rendered;
}

function cloneNode(node) {
  return {
    ...node,
    attrs: { ...node.attrs },
    children: node.children.map((child) => child.type === 'element' ? cloneNode(child) : { ...child })
  };
}

function measureNode(node) {
  if (node.attrs.width) {
    return Number(node.attrs.width);
  }

  if (node.name === 'bf-pill') {
    const label = String(node.attrs.label ?? textContent(node));
    const value = String(node.attrs.value ?? '');
    return Math.max(164, (label.length + value.length) * 12 + 56);
  }

  if (node.name === 'bf-chip') {
    const label = String(node.attrs.label ?? textContent(node));
    return Math.max(96, label.length * 10 + 34);
  }

  return 0;
}

function terminalLines(node) {
  if (node.attrs.lines) {
    return node.attrs.lines.split('|').map((line) => line.trim()).filter(Boolean);
  }

  const lines = node.children
    .filter((child) => child.type === 'element' && child.name === 'bf-line')
    .map(textContent)
    .filter(Boolean);

  if (lines.length > 0) {
    return lines;
  }

  return textContent(node).split(/\n|;/).map((line) => line.trim()).filter(Boolean);
}

function textContent(node) {
  return node.children.map((child) => {
    if (child.type === 'text') {
      return child.value;
    }

    return textContent(child);
  }).join(' ').replace(/\s+/g, ' ').trim();
}

function decoratedAttrs(node) {
  const output = {};
  const passthrough = [
    'clip-path',
    'fill-opacity',
    'filter',
    'opacity',
    'stroke-linecap',
    'stroke-linejoin',
    'stroke-opacity',
    'stroke-width',
    'style',
    'text-anchor',
    'transform'
  ];

  for (const key of passthrough) {
    if (node.attrs[key] !== undefined) {
      output[key] = node.attrs[key];
    }
  }

  output.class = classList(
    node.attrs.class,
    effectClass(node),
    animationClass(node)
  );

  output.style = styleList(
    node.attrs.style,
    node.attrs.delay ? `--delay: ${timeValue(node.attrs.delay)}` : null,
    node.attrs.duration ? `--duration: ${timeValue(node.attrs.duration)}` : null,
    node.attrs.origin ? `--origin: ${node.attrs.origin}` : null
  );

  if (node.attrs.translate || node.attrs.scale || node.attrs.rotate) {
    output.transform = transformAttr(node, output.transform);
  }

  const filter = filterAttr(node);
  if (filter) {
    output.filter = filter;
  }

  return output;
}

function groupAttrs(node) {
  const output = decoratedAttrs(node);
  delete output.class;
  return output;
}

function effectClass(node) {
  const effect = node.attrs.effect;

  if (!effect) {
    return null;
  }

  const effects = effect.split(/\s+/).map((item) => item.trim()).filter(Boolean);
  return effects.map((item) => {
    if (item === 'shadow') return 'fx-shadow';
    if (item === 'glow') return 'fx-glow';
    if (item === 'glass' || item === 'blur') return 'fx-glass';
    return `fx-${item}`;
  }).join(' ');
}

function animationClass(node) {
  const animation = node.attrs.animate ?? node.attrs.animation;

  if (!animation) {
    return null;
  }

  if (animation === 'fade') return 'anim-fade';
  if (animation === 'pulse') return 'anim-pulse';
  if (animation === 'drift') return 'anim-drift';
  return `anim-${animation}`;
}

function filterAttr(node) {
  if (node.attrs.filter) {
    return node.attrs.filter;
  }

  if (node.attrs.effect === 'shadow') {
    return 'url(#fxSoftShadow)';
  }

  if (node.attrs.effect === 'glow') {
    return 'url(#fxGlow)';
  }

  if (node.attrs.effect === 'glass' || node.attrs.effect === 'blur') {
    return 'url(#fxGlassBlur)';
  }

  return undefined;
}

function transformAttr(node, existing) {
  const parts = [];

  if (existing) {
    parts.push(existing);
  }

  if (node.attrs.translate) {
    const [x = '0', y = '0'] = node.attrs.translate.split(/[,\s]+/).filter(Boolean);
    parts.push(`translate(${x} ${y})`);
  }

  if (node.attrs.rotate) {
    parts.push(`rotate(${node.attrs.rotate})`);
  }

  if (node.attrs.scale) {
    parts.push(`scale(${node.attrs.scale})`);
  }

  return parts.join(' ');
}

function classList(...items) {
  return items.flatMap((item) => String(item ?? '').split(/\s+/)).filter(Boolean).join(' ') || undefined;
}

function styleList(...items) {
  return items.map((item) => String(item ?? '').trim()).filter(Boolean).join('; ') || undefined;
}

function timeValue(value) {
  return /ms$|s$/.test(String(value)) ? value : `${value}s`;
}


function numberAttr(node, name, fallback) {
  if (node.attrs[name] === undefined || node.attrs[name] === '') {
    return fallback;
  }

  const value = Number(node.attrs[name]);
  return Number.isFinite(value) ? value : fallback;
}
