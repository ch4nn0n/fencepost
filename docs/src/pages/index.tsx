import type { ReactNode } from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './index.module.css';

function Fence({ className }: { className?: string }): ReactNode {
  // A row of fence posts — also the bash pipe operator.
  return (
    <div className={`${styles.fence} ${className ?? ''}`} aria-hidden="true">
      {Array.from({ length: 48 }).map((_, i) => (
        <span key={i} style={{ animationDelay: `${(i % 12) * 60}ms` }} />
      ))}
    </div>
  );
}

function Hero(): ReactNode {
  return (
    <header className={styles.hero}>
      <div className={styles.heroGrid} />
      <div className={styles.heroInner}>
        <div className={styles.heroCopy}>
          <div className={styles.kicker}>
            <span className={styles.kickerBar} />
            PreToolUse permission gate for Claude Code
          </div>
          <h1 className={styles.heroTitle}>
            Every tool call
            <br />
            stops at the <span className={styles.heroMark}>fence</span>.
          </h1>
          <p className={styles.heroLede}>
            fencepost intercepts each tool call Claude Code tries to make and
            checks it against a YAML rule set — then <em>allows</em> it,{' '}
            <em>asks</em> you, or <em>denies</em> it with an actionable
            alternative. Curated presets, AST-aware bash analysis, a scratch
            sandbox, and an audit trail. No runtime dependencies.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.btnPrimary} to="/docs/intro">
              Read the docs
            </Link>
            <Link
              className={styles.btnGhost}
              to="/docs/getting-started/quick-start"
            >
              Quick start ↗
            </Link>
          </div>
          <div className={styles.pillRow}>
            <span className={`${styles.pill} ${styles.pillAllow}`}>allow</span>
            <span className={styles.pillSep} />
            <span className={`${styles.pill} ${styles.pillAsk}`}>ask</span>
            <span className={styles.pillSep} />
            <span className={`${styles.pill} ${styles.pillDeny}`}>deny</span>
          </div>
        </div>

        <div className={styles.terminal}>
          <div className={styles.terminalBar}>
            <span />
            <span />
            <span />
            <em>claude-code · fencepost hook</em>
          </div>
          <pre className={styles.terminalBody}>
            <code>
              <span className={styles.tDim}># Claude tries to run:</span>
              {'\n'}
              <span className={styles.tCmd}>$ rm -rf /tmp/build</span>
              {'\n\n'}
              <span className={styles.tDeny}>● DENY</span>{' '}
              <span className={styles.tText}>
                Fencepost: blocked — Recursive delete is
              </span>
              {'\n      '}
              <span className={styles.tText}>
                dangerous. Use this instead: delete
              </span>
              {'\n      '}
              <span className={styles.tText}>specific files individually.</span>
              {'\n\n'}
              <span className={styles.tDim}># Next call:</span>
              {'\n'}
              <span className={styles.tCmd}>$ git push origin main</span>
              {'\n\n'}
              <span className={styles.tAsk}>● ASK</span>{' '}
              <span className={styles.tText}>
                'git push origin main' requires
              </span>
              {'\n      '}
              <span className={styles.tText}>approval.</span>{' '}
              <span className={styles.tDim}>[y/N]</span>
              {'\n\n'}
              <span className={styles.tCmd}>$ git status</span>
              {'\n\n'}
              <span className={styles.tAllow}>● ALLOW</span>{' '}
              <span className={styles.tDim}>(silent fast path)</span>
            </code>
          </pre>
        </div>
      </div>
      <Fence className={styles.heroFence} />
    </header>
  );
}

type Tier = { label: string; sym: string; desc: string; cls: string };
const tiers: Tier[] = [
  { label: 'deny', sym: '01', desc: 'Hard blocks & smart checks', cls: 'deny' },
  {
    label: 'checks',
    sym: '02',
    desc: 'Regex rules with alternatives',
    cls: 'deny',
  },
  {
    label: 'allow-checks',
    sym: '03',
    desc: 'Scoped exceptions win over ask',
    cls: 'allow',
  },
  { label: 'ask', sym: '04', desc: 'Prompt the human', cls: 'ask' },
  { label: 'allow', sym: '05', desc: 'Silent fast path', cls: 'allow' },
  { label: 'default', sym: '06', desc: 'Fallthrough posture', cls: 'ask' },
];

function Tiers(): ReactNode {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <span className={styles.sectionTag}>The decision model</span>
        <h2 className={styles.sectionTitle}>
          One command walks the fence, tier by tier.
        </h2>
        <p className={styles.sectionLede}>
          The most restrictive matching tier wins, so you can never{' '}
          <em>allow</em> your way past a <em>deny</em>. Bash is always parsed —
          never trusted as a raw string.
        </p>
      </div>
      <div className={styles.tierRow}>
        {tiers.map((t) => (
          <div key={t.label} className={`${styles.tierCard} ${styles[t.cls]}`}>
            <span className={styles.tierSym}>{t.sym}</span>
            <span className={styles.tierLabel}>{t.label}</span>
            <span className={styles.tierDesc}>{t.desc}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

type Feature = { title: string; body: string; to: string; meta: string };
const features: Feature[] = [
  {
    meta: 'presets',
    title: 'Composable presets',
    body: 'Import curated rule sets for git, kubernetes, helm, ansible, filesystem and more with one line. Layer your own rules on top.',
    to: '/docs/presets',
  },
  {
    meta: 'bash',
    title: 'AST-aware bash',
    body: 'Commands are parsed with tree-sitter, not pattern-matched. Reason about redirections, every argument, and even inline python or node.',
    to: '/docs/configuration/structured-bash-rules',
  },
  {
    meta: 'sandbox',
    title: 'Scratch sandbox',
    body: 'Funnel temp files into /tmp/claude and grant destructive permissions scoped to it — the rest of the filesystem stays gated.',
    to: '/docs/configuration/sandbox',
  },
  {
    meta: 'feedback',
    title: 'Actionable denials',
    body: 'A block is not a dead end. Denials steer Claude to the alternative instead of letting it retry the same wall.',
    to: '/docs/concepts/decision-model',
  },
  {
    meta: 'posture',
    title: 'Fail-closed config',
    body: 'A broken security config denies everything until a human fixes it. Un-checkable commands ask. Verify in CI with one command.',
    to: '/docs/concepts/failure-posture',
  },
  {
    meta: 'audit',
    title: 'Audit & tune',
    body: 'Every decision is logged. The /audit skill turns real usage into concrete config suggestions — promote, prune, tighten.',
    to: '/docs/reference/cli-and-audit',
  },
];

function Features(): ReactNode {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <span className={styles.sectionTag}>What you get</span>
        <h2 className={styles.sectionTitle}>A perimeter you can actually read.</h2>
      </div>
      <div className={styles.featureGrid}>
        {features.map((f) => (
          <Link key={f.title} to={f.to} className={styles.featureCard}>
            <span className={styles.featureMeta}>
              <span className={styles.featureBar} />
              {f.meta}
            </span>
            <h3 className={styles.featureTitle}>{f.title}</h3>
            <p className={styles.featureBody}>{f.body}</p>
            <span className={styles.featureArrow}>Learn more →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Config(): ReactNode {
  return (
    <section className={`${styles.section} ${styles.configSection}`}>
      <div className={styles.configGrid}>
        <div className={styles.configCopy}>
          <span className={styles.sectionTag}>Configuration</span>
          <h2 className={styles.sectionTitle}>Small file. Curated policy.</h2>
          <p className={styles.sectionLede}>
            Drop a single <code>.claude/fencepost.yaml</code>, or split rules
            across a <code>conf.d</code> directory by domain. Import presets as
            the base; your rules always layer on top.
          </p>
          <Link className={styles.btnPrimary} to="/docs/configuration/config-files">
            Configuration guide
          </Link>
        </div>
        <div className={styles.configCode}>
          <div className={styles.codeChrome}>
            <span>.claude/fencepost.yaml</span>
          </div>
          <pre className={styles.codeBlock}>
            <code>
              <span className={styles.cKey}>import</span>:{'\n'}
              {'  - '}
              <span className={styles.cStr}>claude</span>
              {'    '}
              <span className={styles.cCmt}># allow built-ins + sandbox</span>
              {'\n'}
              {'  - '}
              <span className={styles.cStr}>git</span>
              {'\n'}
              {'  - '}
              <span className={styles.cStr}>kubernetes</span>
              {'\n\n'}
              <span className={styles.cKey}>default</span>:{' '}
              <span className={styles.cVal}>ask</span>
              {'\n'}
              <span className={styles.cKey}>onError</span>:{' '}
              <span className={styles.cVal}>ask</span>
              {'\n\n'}
              <span className={styles.cKey}>tools</span>:{'\n'}
              {'  '}
              <span className={styles.cKey}>bash</span>:{'\n'}
              {'    '}
              <span className={styles.cKey}>deny</span>:{'\n'}
              {'      - '}
              <span className={styles.cStr}>git push --force</span>
              {'\n'}
              {'    '}
              <span className={styles.cKey}>allow</span>:{'\n'}
              {'      - '}
              <span className={styles.cStr}>bun test</span>
            </code>
          </pre>
        </div>
      </div>
    </section>
  );
}

function CTA(): ReactNode {
  return (
    <section className={styles.cta}>
      <Fence className={styles.ctaFence} />
      <h2 className={styles.ctaTitle}>Put up the fence.</h2>
      <p className={styles.ctaLede}>
        Install the plugin, import a preset or two, and Claude Code starts the
        next session inside a perimeter you control.
      </p>
      <div className={styles.heroActions}>
        <Link className={styles.btnPrimary} to="/docs/getting-started/installation">
          Install fencepost
        </Link>
        <Link
          className={styles.btnGhost}
          href="https://github.com/ch4nn0n/fencepost"
        >
          View on GitHub ↗
        </Link>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title="A permission gate for Claude Code"
      description={siteConfig.tagline}
    >
      <main className={styles.main}>
        <Hero />
        <Tiers />
        <Features />
        <Config />
        <CTA />
      </main>
    </Layout>
  );
}
