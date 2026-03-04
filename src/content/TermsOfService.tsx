/**
 * Terms of Service content for Aurelo.
 * 
 * ─── HOW TO EDIT ───
 * Simply update the JSX below. Each section is a standalone block.
 * The `lastUpdated` export is displayed at the top of the page.
 * When you make changes, bump the VERSION export so consent tracking stays accurate.
 */

export const VERSION = '1.0';
export const lastUpdated = 'March 4, 2026';

export const tocItems = [
  { id: 'description', label: 'Description of the Service' },
  { id: 'registration', label: 'Account Registration' },
  { id: 'workspace', label: 'Workspace Responsibilities' },
  { id: 'acceptable-use', label: 'Acceptable Use' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'financial', label: 'Financial Data Disclaimer' },
  { id: 'billing', label: 'Subscription Billing' },
  { id: 'refunds', label: 'Refund Policy' },
  { id: 'pricing', label: 'Pricing Changes' },
  { id: 'ip', label: 'Intellectual Property' },
  { id: 'availability', label: 'Service Availability' },
  { id: 'liability', label: 'Limitation of Liability' },
  { id: 'termination', label: 'Termination' },
  { id: 'governing-law', label: 'Governing Law' },
  { id: 'changes', label: 'Changes to Terms' },
  { id: 'contact', label: 'Contact' },
];

export function TermsContent() {
  return (
    <div>
      <h1>Terms of Service</h1>
      <p className="legal-meta">Last updated: {lastUpdated}</p>
      <p className="legal-intro">
        Welcome to Aurelo. These Terms of Service ("Terms") govern your access to and use of the
        Aurelo platform, websites, and services (collectively, the "Service"), operated by Aurelo LLC.
      </p>

      <div className="legal-callout" style={{ marginBottom: 40 }}>
        <address>
          Aurelo LLC<br />
          1120 E Twiggs St Unit 502<br />
          Tampa, Florida 33602, United States
        </address>
        <p style={{ marginTop: 12, marginBottom: 0 }}>
          Support: <a href="mailto:support@getaurelo.com">support@getaurelo.com</a>
        </p>
      </div>

      <p>By creating an account or using the Service, you agree to these Terms.</p>

      <section className="legal-section" id="description">
        <h2>1. Description of the Service</h2>
        <p>
          Aurelo provides software tools designed to help freelancers, independent professionals, and
          small teams track project revenue, time utilization, and client performance metrics.
        </p>
        <p>
          The Service provides analytical insights derived from user-provided data and integrations
          with external services.
        </p>
        <div className="legal-callout">
          Aurelo provides informational insights only and does not provide accounting, financial, tax, or legal advice.
        </div>
      </section>

      <section className="legal-section" id="registration">
        <h2>2. Account Registration</h2>
        <p>To use the Service, you must create an account. You agree to:</p>
        <ul>
          <li>Provide accurate and complete information</li>
          <li>Keep login credentials secure</li>
          <li>Be responsible for all activity under your account</li>
        </ul>
        <p>
          Accounts may be associated with a workspace, which allows multiple members to collaborate
          within a shared environment. Workspace owners may invite additional users and assign roles:
        </p>
        <ul>
          <li>Owner</li>
          <li>Admin</li>
          <li>Member</li>
        </ul>
        <p>Workspace owners are responsible for managing access permissions.</p>
      </section>

      <section className="legal-section" id="workspace">
        <h2>3. Workspace Responsibilities</h2>
        <p>Workspace owners are responsible for:</p>
        <ul>
          <li>Managing invited users</li>
          <li>Controlling access levels</li>
          <li>Ensuring data uploaded by workspace members complies with applicable laws</li>
        </ul>
        <p>Aurelo is not responsible for actions taken by workspace members.</p>
      </section>

      <section className="legal-section" id="acceptable-use">
        <h2>4. Acceptable Use</h2>
        <p>You agree not to use the Service to:</p>
        <ul>
          <li>Violate any laws or regulations</li>
          <li>Upload harmful or malicious code</li>
          <li>Attempt to reverse engineer the software</li>
          <li>Scrape or extract platform data at scale</li>
          <li>Interfere with platform infrastructure</li>
          <li>Impersonate another individual or organization</li>
        </ul>
        <p>Aurelo reserves the right to suspend or terminate accounts that violate these rules.</p>
      </section>

      <section className="legal-section" id="integrations">
        <h2>5. Integrations &amp; Third-Party Services</h2>
        <p>The Service may integrate with third-party services, including but not limited to:</p>
        <ul>
          <li>Stripe &amp; Stripe Connect</li>
          <li>Supabase</li>
          <li>Lovable Cloud</li>
          <li>Resend</li>
        </ul>
        <p>Future integrations may include services such as QuickBooks, Slack, or Google Calendar.</p>
        <p>
          Use of third-party integrations is subject to the terms and privacy policies of those
          providers. Aurelo is not responsible for the performance or security of third-party services.
        </p>
      </section>

      <section className="legal-section" id="financial">
        <h2>6. Financial Data Disclaimer</h2>
        <p>
          Aurelo may display analytics related to project revenue, payments, or financial activity
          derived from user input or third-party integrations.
        </p>
        <p>These analytics are provided for informational purposes only.</p>
        <div className="legal-callout">
          Aurelo does not guarantee accuracy and does not provide accounting, tax, or financial advice.
          Users are responsible for verifying financial information independently.
        </div>
      </section>

      <section className="legal-section" id="billing">
        <h2>7. Subscription Billing</h2>
        <p>Aurelo operates on a subscription model. Plans may include:</p>
        <ul>
          <li>Monthly subscriptions</li>
          <li>Annual subscriptions</li>
        </ul>
        <p>Subscriptions automatically renew unless canceled before the next billing cycle.</p>
        <p>
          Billing is processed through Stripe. Users authorize Aurelo and its payment processor to
          charge the payment method on file for subscription fees.
        </p>
      </section>

      <section className="legal-section" id="refunds">
        <h2>8. Refund Policy</h2>
        <p>
          New subscriptions may be eligible for refunds within 7 days of the initial purchase.
          Refund requests may be reviewed on a case-by-case basis and eligibility is determined at
          Aurelo's discretion.
        </p>
        <p>Recurring billing cycles after the initial purchase are generally non-refundable.</p>
      </section>

      <section className="legal-section" id="pricing">
        <h2>9. Pricing Changes</h2>
        <p>Aurelo reserves the right to modify pricing for future subscriptions.</p>
        <p>
          Existing customers may be eligible for legacy pricing or grandfathered rates where applicable.
        </p>
      </section>

      <section className="legal-section" id="ip">
        <h2>10. Intellectual Property</h2>
        <p>
          All software, algorithms, designs, and content associated with the Service are the property
          of Aurelo LLC. Users are granted a limited, non-exclusive license to use the Service.
        </p>
        <p>Users may not:</p>
        <ul>
          <li>Copy or reproduce the platform</li>
          <li>Reverse engineer the software</li>
          <li>Distribute or resell the Service without permission</li>
        </ul>
      </section>

      <section className="legal-section" id="availability">
        <h2>11. Service Availability</h2>
        <p>
          Aurelo strives to maintain reliable platform availability but does not guarantee
          uninterrupted service. The Service may be temporarily unavailable due to:
        </p>
        <ul>
          <li>Maintenance</li>
          <li>Technical issues</li>
          <li>Infrastructure failures</li>
          <li>Third-party service outages</li>
        </ul>
      </section>

      <section className="legal-section" id="liability">
        <h2>12. Limitation of Liability</h2>
        <p>To the maximum extent permitted by law, Aurelo LLC shall not be liable for:</p>
        <ul>
          <li>Indirect damages</li>
          <li>Lost profits or lost data</li>
          <li>Business interruption</li>
          <li>Financial losses resulting from use of the Service</li>
        </ul>
        <p>
          Total liability shall not exceed the amount paid by the user to Aurelo in the preceding 12 months.
        </p>
      </section>

      <section className="legal-section" id="termination">
        <h2>13. Termination</h2>
        <p>
          Aurelo reserves the right to suspend or terminate accounts for violations of these Terms.
          Users may cancel their subscriptions at any time. Termination may result in loss of access
          to stored data.
        </p>
      </section>

      <section className="legal-section" id="governing-law">
        <h2>14. Governing Law</h2>
        <p>These Terms shall be governed by the laws of the State of Florida, United States.</p>
      </section>

      <section className="legal-section" id="changes">
        <h2>15. Changes to Terms</h2>
        <p>
          Aurelo may update these Terms periodically. Users will be notified of significant changes
          through the platform or via email.
        </p>
      </section>

      <section className="legal-section" id="contact">
        <h2>16. Contact</h2>
        <p>Questions about these Terms may be sent to:</p>
        <p>
          <a href="mailto:support@getaurelo.com">support@getaurelo.com</a>
        </p>
      </section>
    </div>
  );
}
