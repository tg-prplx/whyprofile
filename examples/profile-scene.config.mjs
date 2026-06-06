import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProfileScene } from '../src/presets.js';

const here = path.dirname(fileURLToPath(import.meta.url));

export default createProfileScene({
  background: path.resolve(here, '../assets/demo-background.svg'),
  profile: {
    contacts: ['@prplx', '@whydevel'],
    description: 'WW macwinlin',
    name: 'prplx',
    projects: [
      { label: 'Vellium', value: '87★', accent: '#8B5CF6' },
      { label: 'TNF', value: 'Framework', accent: '#46E3FF' }
    ],
    skills: ['Python', 'JavaScript', 'Linux', 'LLM API'],
    tagline: 'creator of TNF · maintainer of Vellium · AI tooling',
    typingLines: [
      'building desktop llm clients',
      'maintaining 70k lines of questionable code',
      'python / javascript / linux',
      'terminal software and experiments'
    ]
  },
  themes: {
    dark: {
      accent: '#A855F7',
      accent2: '#46E3FF'
    },
    light: {
      accent: '#7C3AED',
      accent2: '#008DB7'
    }
  }
});
