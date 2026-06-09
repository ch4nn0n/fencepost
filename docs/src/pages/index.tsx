import type { ReactNode } from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import styles from './index.module.css';

/* A row of fence posts — also the bash pipe operator. */
function Fence({ className }: { className?: string }): ReactNode {
  return (
    <div className={`${styles.fence} ${className ?? ''}`} aria-hidden="true">
      {Array.from({ length: 48 }).map((_, i) => (
        <span key={i} style={{ animationDelay: `${(i % 12) * 55}ms` }} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Hero — say plainly what fencepost is, and show it intercepting.
 * ------------------------------------------------------------------ */

type Verdict = 'allow' | 'ask' | 'deny';

type Intercept = {
  cmd: string;
  verdict: Verdict;
  note: string;
  steer?: string;
};

const session: Intercept[] = [
  {
    cmd: 'rm -rf $BUILD_DIR',
    verdict: 'deny',
    note: 'recursive force-delete on an unbounded path',
    steer: 'rm -rf ./dist  — scoped to the project',
  },
  {
    cmd: 'git push origin main',
    verdict: 'ask',
    note: 'push to a shared branch — needs a human',
  },
  {
    cmd: 'bun test --coverage',
    verdict: 'allow',
    note: 'matched allow rule · runs silently',
  },
];

const verdictLabel: Record<Verdict, string> = {
  allow: 'allow',
  ask: 'ask',
  deny: 'deny',
};

function Terminal(): ReactNode {
  return (
    <div className={styles.term}>
      <div className={styles.termBar}>
        <span />
        <span />
        <span />
        <em>claude code · PreToolUse</em>
      </div>
      <div className={styles.termBody}>
        {session.map((it, i) => (
          <div
            key={it.cmd}
            className={styles.intercept}
            style={{ animationDelay: `${0.35 + i * 0.22}s` }}
          >
            <div className={styles.proposed}>
              <span className={styles.proposedLabel}>
                Claude wants to run
              </span>
              <code>{it.cmd}</code>
            </div>
            <div className={`${styles.verdict} ${styles[it.verdict]}`}>
              <span className={styles.verdictBar} aria-hidden="true" />
              <span className={styles.verdictPill}>{verdictLabel[it.verdict]}</span>
              <span className={styles.verdictNote}>{it.note}</span>
            </div>
            {it.steer && (
              <div className={styles.steer}>
                <span className={styles.steerArrow}>→</span>
                <code>{it.steer}</code>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className={styles.termFoot}>
        <span className={styles.termDot} />
        every tool call, checked before it runs
      </div>
    </div>
  );
}

function Hero(): ReactNode {
  return (
    <header className={styles.hero}>
      <div className={styles.heroGrid} aria-hidden="true" />
      <div className={styles.heroInner}>
        <div className={styles.heroCopy}>
          <div className={styles.kicker}>
            <span className={styles.kickerBar} />
            Permission gate · Claude Code plugin
          </div>
          <h1 className={styles.heroTitle}>
            You decide what Claude&nbsp;Code is{' '}
            <span className={styles.heroMark}>allowed to run</span>.
          </h1>
          <p className={styles.heroLede}>
            fencepost inspects <em>every</em> command, file edit, and tool call
            Claude Code makes, <em>before</em> it happens, and resolves each one
            to <em>allow</em>, <em>ask</em>, or <em>deny</em> from a YAML policy
            you control. Bash is parsed with tree-sitter, not pattern-matched,
            so the same command always lands the same way.
          </p>
          <div className={styles.heroActions}>
            <Link
              className={styles.btnPrimary}
              to="/docs/getting-started/quick-start"
            >
              Quick start
            </Link>
            <Link className={styles.btnGhost} to="/docs/intro">
              How it works ↗
            </Link>
          </div>
          <div className={styles.heroFacts}>
            <span>Tiny ~280&nbsp;KB bundle</span>
            <span className={styles.factSep} />
            <span>Runs on Node or Bun</span>
            <span className={styles.factSep} />
            <span>Fail-closed by default</span>
          </div>
        </div>

        <Terminal />
      </div>
      <Fence className={styles.heroFence} />
    </header>
  );
}

/* ------------------------------------------------------------------ *
 *  How it works — three plain steps.
 * ------------------------------------------------------------------ */

type Step = { n: string; title: string; body: ReactNode };
const steps: Step[] = [
  {
    n: '01',
    title: 'It sees the call',
    body: (
      <>
        fencepost runs on Claude Code&apos;s <code>PreToolUse</code> hook, so it
        intercepts every tool call — Bash, edits, MCP tools — the instant before
        it would execute.
      </>
    ),
  },
  {
    n: '02',
    title: 'It checks your policy',
    body: (
      <>
        The call is matched against a YAML rule set you own. Import curated
        presets for <code>git</code>, <code>kubernetes</code>, <code>helm</code>{' '}
        and more, then layer your own rules on top.
      </>
    ),
  },
  {
    n: '03',
    title: 'It returns a verdict',
    body: (
      <>
        <em>allow</em> runs silently, <em>ask</em> prompts you, and <em>deny</em>{' '}
        blocks the call — handing Claude a concrete alternative instead of a dead
        end.
      </>
    ),
  },
];

function HowItWorks(): ReactNode {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <span className={styles.sectionTag}>How it works</span>
        <h2 className={styles.sectionTitle}>
          One gate between Claude and your machine.
        </h2>
      </div>
      <div className={styles.steps}>
        {steps.map((s) => (
          <div key={s.n} className={styles.step}>
            <span className={styles.stepNum}>{s.n}</span>
            <h3 className={styles.stepTitle}>{s.title}</h3>
            <p className={styles.stepBody}>{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 *  The three decisions.
 * ------------------------------------------------------------------ */

type Decision = {
  label: Verdict;
  who: string;
  body: string;
};
const decisions: Decision[] = [
  {
    label: 'allow',
    who: 'nobody is interrupted',
    body: 'The tool runs immediately and silently. Your fast path for the commands you trust.',
  },
  {
    label: 'ask',
    who: 'you approve',
    body: 'Claude Code pauses and prompts you. The right call for anything reversible-but-risky.',
  },
  {
    label: 'deny',
    who: 'Claude is redirected',
    body: 'The call is blocked and Claude is steered toward the safe alternative, not left to retry the wall.',
  },
];

function Decisions(): ReactNode {
  return (
    <section className={`${styles.section} ${styles.decisionsSection}`}>
      <div className={styles.sectionHead}>
        <span className={styles.sectionTag}>The decision model</span>
        <h2 className={styles.sectionTitle}>Three outcomes. Nothing fuzzy.</h2>
        <p className={styles.sectionLede}>
          Rules resolve in a fixed precedence, the same way every time. The most
          restrictive matching tier wins, so you can never <em>allow</em> your
          way past a <em>deny</em>.
        </p>
      </div>
      <div className={styles.decisionRow}>
        {decisions.map((d) => (
          <div key={d.label} className={`${styles.decisionCard} ${styles[d.label]}`}>
            <div className={styles.decisionTop}>
              <span className={`${styles.dPill} ${styles[`d_${d.label}`]}`}>
                {d.label}
              </span>
              <span className={styles.decisionWho}>{d.who}</span>
            </div>
            <p className={styles.decisionBody}>{d.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 *  Features.
 * ------------------------------------------------------------------ */

type Feature = { meta: string; title: string; body: string; to: string };
const features: Feature[] = [
  {
    meta: 'presets',
    title: 'Composable presets',
    body: 'Import battle-tested rule sets for git, kubernetes, helm, ansible and the filesystem with one line. Your own rules always layer on top.',
    to: '/docs/presets',
  },
  {
    meta: 'bash',
    title: 'Real bash understanding',
    body: 'Commands are parsed with tree-sitter, not matched as strings. fencepost reasons about redirections, every argument, and inline python -c or node -e.',
    to: '/docs/configuration/structured-bash-rules',
  },
  {
    meta: 'sandbox',
    title: 'A scratch sandbox',
    body: 'Funnel temp files into /tmp/claude and grant destructive permissions scoped to it. The rest of the filesystem stays gated.',
    to: '/docs/configuration/sandbox',
  },
  {
    meta: 'feedback',
    title: 'Denials that redirect',
    body: 'A block is not a dead end. Every deny carries an alternative, steering Claude to the right command instead of letting it thrash.',
    to: '/docs/concepts/decision-model',
  },
  {
    meta: 'posture',
    title: 'Fail-closed safety',
    body: 'A broken security config denies everything until a human fixes it. Un-checkable commands ask. Verify the whole policy in CI with one command.',
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

/* ------------------------------------------------------------------ *
 *  Config — small file, curated policy.
 * ------------------------------------------------------------------ */

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
            the base; your rules always win.
          </p>
          <Link
            className={styles.btnPrimary}
            to="/docs/configuration/config-files"
          >
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
              <span className={styles.cCmt}># built-ins + sandbox</span>
              {'\n'}
              {'  - '}
              <span className={styles.cStr}>git</span>
              {'\n'}
              {'  - '}
              <span className={styles.cStr}>kubernetes</span>
              {'\n\n'}
              <span className={styles.cKey}>default</span>:{' '}
              <span className={styles.cVal}>ask</span>
              {'    '}
              <span className={styles.cCmt}># nothing matched</span>
              {'\n'}
              <span className={styles.cKey}>onError</span>:{' '}
              <span className={styles.cVal}>ask</span>
              {'  '}
              <span className={styles.cCmt}># can&apos;t decide</span>
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

/* ------------------------------------------------------------------ *
 *  CTA.
 * ------------------------------------------------------------------ */

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
        <Link
          className={styles.btnPrimary}
          to="/docs/getting-started/installation"
        >
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
  return (
    <Layout
      title="A permission gate for Claude Code"
      description="fencepost inspects every command, edit, and tool call Claude Code makes and resolves each one to allow, ask, or deny from a YAML policy you control — with real tree-sitter bash parsing."
    >
      <main className={styles.main}>
        <Hero />
        <HowItWorks />
        <Decisions />
        <Features />
        <Config />
        <CTA />
      </main>
    </Layout>
  );
}
