import Link from '@docusaurus/Link';
import styles from './styles.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <span className={styles.logoMark} />
          <span className={styles.brandName}>Open Digital Acquiring</span>
          <span className={styles.brandMeta}>
            <Link
              className={styles.brandLink}
              to="https://github.com/paysyslab/OpenDigitalAcquiring-Sandbox">
              github.com/paysyslab/OpenDigitalAcquiring-Sandbox
            </Link>
          </span>
        </div>
        <div className={styles.copyright}>
          © {new Date().getFullYear()} Paysys Labs. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
