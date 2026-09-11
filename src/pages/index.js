import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import styles from './index.module.css';

const DOCS_INTRO = '/docs/raast-p2m-acquiring-suite';
const REQUEST_ACCESS_MAILTO =
  'mailto:hammad.ali@paysyslabs.com?subject=Partner%20access%20request&body=Hi%2C%20we%27d%20like%20to%20get%20partner%20access%20to%20the%20RAAST%20P2M%20Acquiring%20sandbox.';

const STATS = [
  {
    title: 'No VPN',
    description: 'Reachable over the public internet — no VPN or firewall change.',
  },
  {
    title: 'Same day',
    description: 'From sales contact to a real, self-serve API call.',
  },
  {
    title: 'Per-domain',
    description: 'Mock/live routing flips independently, per domain, no restart.',
  },
];

function RequestCard() {
  return (
    <div className={styles.codePanel}>
      <div className={styles.codePanelHeader}>
        <span>sandbox · mock provider</span>
        <span className={styles.codePanelStatus}>
          <span className={styles.statusDot} />
          200 OK · 41 ms
        </span>
      </div>
      <div className={styles.codePanelBody}>
        <div className={styles.codeLine}>
          <span className={styles.codeMethod}>POST</span> /api/v2/qr/sqrc HTTP/1.1
        </div>
        <div className={styles.codeMuted}>Host: localhost:4000</div>
        <div className={styles.codeMuted}>Content-Type: application/json</div>
        <div className={styles.codeMuted}>Authorization: Bearer eyJhbGciOiJIUzUxMiJ9...</div>
        <div className={styles.codeGap} />
        <pre className={styles.codeJson}>
{`{
  "merchantDetails": { "merchantId": "070425271300379", "tillCode": "03791001" },
  "paymentDetails": { "amount": "300.0", "currency": "PKR" }
}`}
        </pre>
        <div className={styles.codeGap} />
        <pre className={styles.codeJson}>
{`{
  "response_code": "00",
  "response_desc": "SUCCESS",
  "info": { "stan": "123123", "rrn": "456456123123",
             "qrString": "000201011128480014PK.RAAST.P2M...6304A1B2" }
}`}
        </pre>
      </div>
      <div className={styles.codePanelFooter}>
        Same request/response contract as TSD-Acq-API-GW v1.17 — swap the base
        URL when a real bank connection exists.
      </div>
    </div>
  );
}

function HomepageHero() {
  return (
    <header className={styles.heroBanner}>
      <div className={styles.heroGrid}>
        <div className={styles.heroCopy}>
          <p className={styles.heroEyebrow}>
            Part of the Open Digital Acquiring suite
          </p>
          <h1 className={styles.heroTitle}>
            A sandbox that behaves like the gateway — so none of the
            integration work is wasted.
          </h1>
          <p className={styles.heroSubtitle}>
            Partner banks and corporates integrate against the RAAST P2M
            Acquiring Gateway sandbox over the public internet — no VPN, no
            firewall change. Every endpoint, state machine, and response code
            matches TSD-Acq-API-GW v1.17, so nothing built against it is
            wasted once a real bank connection exists.
          </p>
          <div className={styles.buttons}>
            <Link className={styles.primaryButton} to={REQUEST_ACCESS_MAILTO}>
              Request partner access <span aria-hidden="true">→</span>
            </Link>
            <Link className={styles.secondaryButton} to={DOCS_INTRO}>
              See the API surface
            </Link>
          </div>
          <div className={styles.statsRow}>
            {STATS.map((stat) => (
              <div key={stat.title} className={styles.statCard}>
                <div className={styles.statTitle}>{stat.title}</div>
                <div className={styles.statDescription}>{stat.description}</div>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.heroPanel}>
          <RequestCard />
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  return (
    <Layout
      title="Open Digital Acquiring"
      description="Partner integration and technical reference for the RAAST P2M Acquiring Sandbox">
      <HomepageHero />
    </Layout>
  );
}
