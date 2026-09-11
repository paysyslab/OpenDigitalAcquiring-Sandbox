import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'No VPN Required',
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        A fully working, self-serve simulation of the RAAST P2M Acquiring
        Gateway, reachable over the public internet with no VPN or firewall
        change required.
      </>
    ),
  },
  {
    title: 'Every Endpoint, Fully Specified',
    Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
    description: (
      <>
        Every field and response code from TSD-Acq-API-GW v1.17 is documented
        with real request/response examples across all six API domains.
      </>
    ),
  },
  {
    title: 'Sandbox to Production',
    Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
        Every domain is built with a mock/live routing seam, so swapping
        simulated behavior for a real upstream connection is a configuration
        change, not a rewrite.
      </>
    ),
  },
];

function Feature({Svg, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
