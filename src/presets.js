import { defineScene } from './index.js';

const TELEGRAM_PATH = 'M22 12.8 35.7 7.5c1.2-.45 2.2.3 1.8 1.9l-2.3 16.8c-.18 1.27-1.1 1.58-2.2.98l-5.1-3.77-2.45 2.36c-.27.27-.5.5-1.04.5l.37-5.2 9.47-8.56c.42-.37-.09-.58-.64-.21l-11.7 7.36-5.03-1.57c-1.1-.34-1.12-1.1.23-1.62Z';

const DEFAULT_THEMES = {
  dark: {
    accent: '#A855F7',
    accent2: '#46E3FF',
    background: '#100719',
    border: '#8A8A94',
    borderOpacity: 0.72,
    chipFill: '#111111',
    chipText: '#FFFFFF',
    fadeBottomOpacity: 0.64,
    fadeMidOpacity: 0.24,
    fadeTopOpacity: 0.12,
    muted: '#D9C8FF',
    panel: '#050508',
    panelText: '#EFE7FF',
    text: '#FFFFFF'
  },
  light: {
    accent: '#7C3AED',
    accent2: '#008DB7',
    background: '#F7F1FF',
    border: '#9A8EA8',
    borderOpacity: 0.8,
    chipFill: '#111111',
    chipText: '#FFFFFF',
    fadeBottom: '#FFFFFF',
    fadeBottomOpacity: 0.62,
    fadeMid: '#FFFFFF',
    fadeMidOpacity: 0.2,
    fadeTop: '#FFFFFF',
    fadeTopOpacity: 0.08,
    muted: '#5E4C76',
    panel: '#FFFFFF',
    panelText: '#2B2038',
    text: '#1C1427'
  }
};

export function createProfileScene(options = {}) {
  const profile = {
    contacts: [],
    description: '',
    name: 'profile',
    projects: [],
    skills: [],
    tagline: '',
    typingLines: [],
    ...options.profile
  };
  const layout = {
    centerX: 600,
    contactsY: 516,
    descriptionY: 178,
    projectsY: 364,
    skillsY: 460,
    taglineY: 438,
    terminalWidth: 672,
    terminalX: 264,
    terminalY: 188,
    titleY: 142,
    ...options.layout
  };
  const themes = {
    dark: { ...DEFAULT_THEMES.dark, ...options.themes?.dark },
    light: { ...DEFAULT_THEMES.light, ...options.themes?.light }
  };

  return defineScene({
    alt: options.alt ?? `${profile.name} profile scene`,
    description: options.description ?? profile.tagline,
    height: options.height ?? 630,
    radius: options.radius ?? 10,
    title: options.title ?? `${profile.name} profile scene`,
    width: options.width ?? 1200,
    themes,
    styles({ theme, variant }) {
      const backgroundOpacity = options.backgroundOpacity?.[variant] ?? (variant === 'light' ? 0.5 : 1);
      return `
.profile-panel rect:first-child {
  stroke: ${theme.accent};
}

.telegram-bg {
  animation: softPulse 5.2s ease-in-out 4.65s infinite;
}

.scene-bg {
  opacity: ${backgroundOpacity};
}

${options.styles?.({ theme, variant }) ?? ''}
`;
    },
    async render({ components, height, theme, width }) {
      const {
        centerRow,
        chip,
        group,
        path: svgPath,
        pill,
        rect,
        svgFile,
        terminal,
        text
      } = components;

      const projectWidths = profile.projects.map((project) => project.width ?? Math.max(190, (String(project.label).length + String(project.value).length) * 11 + 64));
      const skillWidths = profile.skills.map((label) => Math.max(96, String(label).length * 10 + 34));
      const contactWidths = profile.contacts.map((label) => Math.max(132, String(label).length * 11 + 52));

      const children = [
        rect({ width, height, fill: theme.background })
      ];

      if (options.background) {
        children.push(await svgFile(options.background, {
          className: 'scene-bg',
          height: height + 36,
          width: width + 48,
          x: -24,
          y: -18,
          ...options.backgroundBox
        }));
      }

      children.push(
        rect({ width, height, fill: 'url(#sceneFade)' }),
        group([
          text(profile.name, { x: layout.centerX, y: layout.titleY, class: 'title', 'text-anchor': 'middle' }),
          text(profile.description, { x: layout.centerX, y: layout.descriptionY, class: 'subtitle', 'text-anchor': 'middle' })
        ], { class: 'fade-in', style: 'animation-delay: 0.1s;' }),
        terminal({
          className: 'profile-panel',
          lines: profile.typingLines,
          theme,
          width: layout.terminalWidth,
          x: layout.terminalX,
          y: layout.terminalY
        }),
        centerRow(profile.projects, {
          centerX: layout.centerX,
          gap: 16,
          measure: (_, index) => projectWidths[index],
          render: (project, x, y, widthValue) => pill({
            accent: project.accent ?? theme.accent,
            fill: project.fill ?? '#111111',
            label: project.label,
            textColor: project.textColor ?? '#FFFFFF',
            value: project.value,
            width: widthValue,
            x,
            y
          }),
          y: layout.projectsY
        }),
        text(profile.tagline, { x: layout.centerX, y: layout.taglineY, class: 'tagline fade-in', 'text-anchor': 'middle', style: 'animation-delay: 2.9s;' }),
        group(centerRow(profile.skills, {
          centerX: layout.centerX,
          gap: 12,
          measure: (_, index) => skillWidths[index],
          render: (label, x, y, widthValue) => chip({
            fill: theme.chipFill,
            label,
            stroke: '#FFFFFF',
            textColor: theme.chipText,
            width: widthValue,
            x,
            y
          }),
          y: layout.skillsY
        }), { class: 'fade-in', style: 'animation-delay: 3.05s;' }),
        group(centerRow(profile.contacts, {
          centerX: layout.centerX,
          gap: 16,
          measure: (_, index) => contactWidths[index],
          render: (label, x, y, widthValue) => group([
            rect({ class: 'telegram-bg', x: 0, y: 0, width: widthValue, height: 40, rx: 6, fill: '#229ED9', 'fill-opacity': 0.94 }),
            svgPath(TELEGRAM_PATH, { fill: '#ffffff' }),
            text(label, { x: widthValue / 2 + 12, y: 27, 'text-anchor': 'middle', class: 'pill-label' })
          ], { transform: `translate(${x} ${y})` }),
          y: layout.contactsY
        }), { class: 'fade-in', style: 'animation-delay: 3.2s;' })
      );

      return children;
    }
  });
}
