import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'fencepost',
  tagline: 'A configurable permission gate for every Claude Code tool call',
  favicon: 'img/favicon.svg',

  url: 'https://ch4nn0n.github.io',
  baseUrl: '/fencepost/',

  organizationName: 'ch4nn0n',
  projectName: 'fencepost',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  markdown: {
    mermaid: false,
  },

  headTags: [
    {
      tagName: 'link',
      attributes: { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossorigin: 'anonymous',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Hanken+Grotesk:ital,wght@0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500;700&family=Martian+Mono:wght@400;500;600;700;800&display=swap',
      },
    },
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: 'docs',
          editUrl: 'https://github.com/ch4nn0n/fencepost/tree/main/docs/',
          showLastUpdateTime: true,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    docs: {
      sidebar: {
        hideable: true,
      },
    },
    navbar: {
      title: 'fencepost',
      hideOnScroll: true,
      logo: {
        alt: 'fencepost',
        src: 'img/logo.svg',
        srcDark: 'img/logo-dark.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/docs/configuration/config-files',
          label: 'Configuration',
          position: 'left',
        },
        {
          to: '/docs/presets',
          label: 'Presets',
          position: 'left',
        },
        {
          href: 'https://github.com/ch4nn0n/fencepost',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            { label: 'Introduction', to: '/docs/intro' },
            { label: 'Installation', to: '/docs/getting-started/installation' },
            { label: 'Quick start', to: '/docs/getting-started/quick-start' },
          ],
        },
        {
          title: 'Reference',
          items: [
            { label: 'Decision model', to: '/docs/concepts/decision-model' },
            { label: 'Bash rules', to: '/docs/configuration/bash-rules' },
            { label: 'Presets', to: '/docs/presets' },
            { label: 'CLI & audit', to: '/docs/reference/cli-and-audit' },
          ],
        },
        {
          title: 'More',
          items: [
            { label: 'GitHub', href: 'https://github.com/ch4nn0n/fencepost' },
            {
              label: 'Claude Code',
              href: 'https://docs.claude.com/en/docs/claude-code',
            },
          ],
        },
      ],
      copyright: `Built with Docusaurus. fencepost is free software under the GNU GPL v3.`,
    },
    prism: {
      theme: prismThemes.oneLight,
      darkTheme: prismThemes.oneDark,
      additionalLanguages: ['bash', 'json', 'yaml', 'typescript'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
