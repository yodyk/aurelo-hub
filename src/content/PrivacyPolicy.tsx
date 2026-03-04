/**
 * Privacy Policy content for Aurelo.
 * 
 * ─── HOW TO EDIT ───
 * Simply update the JSX below. Each section is a standalone block.
 * The `lastUpdated` export is displayed at the top of the page.
 * When you make changes, bump the VERSION export so consent tracking stays accurate.
 */

export const VERSION = '1.0';
export const lastUpdated = 'March 4, 2026';

export const tocItems = [
  { id: 'info-collect', label: 'Information We Collect' },
  { id: 'third-party', label: 'Third-Party Services' },
  { id: 'cookies', label: 'Cookies & Analytics' },
  { id: 'how-we-use', label: 'How We Use Information' },
  { id: 'data-retention', label: 'Data Retention' },
  { id: 'security', label: 'Security' },
  { id: 'international', label: 'International Users' },
  { id: 'user-rights', label: 'User Rights' },
  { id: 'policy-updates', label: 'Policy Updates' },
  { id: 'contact', label: 'Contact' },
];

export function PrivacyContent() {
  return (
    <div>
      <h1>Privacy Policy</h1>
      <p className="legal-meta">Last updated: {lastUpdated}</p>
      <p className="legal-intro">
        Aurelo LLC respects your privacy and is committed to protecting your personal information.
        This policy explains what data we collect, how we use it, and your rights regarding that data.
      </p>

      <section className="legal-section" id="info-collect">
        <h2>Information We Collect</h2>
        <p>We may collect the following categories of information when you use the Service:</p>

        <h3>Account Information</h3>
        <ul>
          <li>Name and email address</li>
          <li>Login credentials</li>
          <li>Workspace membership details</li>
        </ul>

        <h3>Usage Data</h3>
        <ul>
          <li>Interactions with the platform</li>
          <li>Session activity</li>
          <li>Feature usage analytics</li>
        </ul>

        <h3>Financial Data</h3>
        <p>
          When users connect external payment services, Aurelo may process information related to
          project revenue or payment activity. Payment processing itself is handled by Stripe.
        </p>
        <div className="legal-callout">
          <strong>Aurelo does not store full payment card details.</strong>
        </div>

        <h3>Integration Data</h3>
        <p>
          If users connect third-party services, we may access information provided by those integrations
          in order to deliver platform features.
        </p>
      </section>

      <section className="legal-section" id="third-party">
        <h2>Third-Party Services</h2>
        <p>Aurelo uses the following service providers to operate the platform:</p>
        <div className="legal-callout">
          <p style={{ marginBottom: 6 }}><strong>Payment Processing:</strong> Stripe</p>
          <p style={{ marginBottom: 6 }}><strong>Infrastructure &amp; Database:</strong> Supabase</p>
          <p style={{ marginBottom: 6 }}><strong>Hosting &amp; Application Services:</strong> Lovable Cloud</p>
          <p style={{ marginBottom: 0 }}><strong>Email Delivery:</strong> Resend</p>
        </div>
        <p>Future integrations may include QuickBooks, Slack, or Google Calendar.</p>
        <p>These providers process data in accordance with their own privacy policies.</p>
      </section>

      <section className="legal-section" id="cookies">
        <h2>Cookies &amp; Analytics</h2>
        <p>Aurelo uses cookies and analytics tools to improve the platform experience. Cookies may be used for:</p>
        <ul>
          <li>Authentication and session management</li>
          <li>Product analytics</li>
          <li>Performance monitoring</li>
        </ul>
        <p>
          Users may disable cookies in their browser settings, though some features may not function properly.
        </p>
      </section>

      <section className="legal-section" id="how-we-use">
        <h2>How We Use Information</h2>
        <p>We use collected data to:</p>
        <ul>
          <li>Operate and maintain the platform</li>
          <li>Provide user analytics and insights</li>
          <li>Process subscriptions and payments</li>
          <li>Communicate service updates</li>
          <li>Improve product functionality</li>
        </ul>
      </section>

      <section className="legal-section" id="data-retention">
        <h2>Data Retention</h2>
        <p>User data is retained for as long as the account remains active.</p>
        <p>Users may request deletion of their data by contacting support.</p>
      </section>

      <section className="legal-section" id="security">
        <h2>Security</h2>
        <p>
          Aurelo takes reasonable measures to protect user data through modern security practices.
          However, no online system can guarantee absolute security.
        </p>
      </section>

      <section className="legal-section" id="international">
        <h2>International Users</h2>
        <p>
          While Aurelo currently targets users in the United States, international users may access
          the platform. Data may be stored and processed in the United States.
        </p>
      </section>

      <section className="legal-section" id="user-rights">
        <h2>User Rights</h2>
        <p>Users may request to:</p>
        <ul>
          <li>Access their personal data</li>
          <li>Correct inaccurate data</li>
          <li>Request deletion of data</li>
        </ul>
        <p>
          Requests can be sent to{' '}
          <a href="mailto:support@getaurelo.com">support@getaurelo.com</a>.
        </p>
      </section>

      <section className="legal-section" id="policy-updates">
        <h2>Policy Updates</h2>
        <p>We may update this Privacy Policy from time to time. Users will be notified of significant changes.</p>
      </section>

      <section className="legal-section" id="contact">
        <h2>Contact</h2>
        <p>For privacy-related inquiries, contact:</p>
        <p>
          <a href="mailto:support@getaurelo.com">support@getaurelo.com</a>
        </p>
      </section>
    </div>
  );
}
