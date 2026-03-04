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

export function TermsContent() {
  return (
    <div className="prose prose-stone max-w-none text-[15px] leading-relaxed text-[#44403c]">
      <h1 className="text-[28px] font-semibold text-[#1c1c1c] tracking-tight mb-1">Aurelo Terms of Service</h1>
      <p className="text-[13px] text-[#a8a29e] mb-8">Last Updated: {lastUpdated}</p>

      <p>
        Welcome to Aurelo. These Terms of Service ("Terms") govern your access to and use of the Aurelo platform,
        websites, and services (collectively, the "Service").
      </p>
      <p>The Service is operated by Aurelo LLC, located at:</p>
      <address className="not-italic pl-4 border-l-2 border-[#5ea1bf]/20 text-[14px] mb-4">
        1120 E Twiggs St Unit 502<br />
        Tampa, Florida 33602<br />
        United States
      </address>
      <p>
        Support contact:{' '}
        <a href="mailto:support@getaurelo.com" className="text-[#5ea1bf] hover:underline">
          support@getaurelo.com
        </a>
      </p>
      <p>By creating an account or using the Service, you agree to these Terms.</p>

      <hr className="my-8 border-black/[0.06]" />

      <h2 className="text-[18px] font-semibold text-[#1c1c1c]">1. Description of the Service</h2>
      <p>
        Aurelo provides software tools designed to help freelancers, independent professionals, and small teams track
        project revenue, time utilization, and client performance metrics.
      </p>
      <p>
        The Service provides analytical insights derived from user-provided data and integrations with external services.
      </p>
      <p className="font-medium">
        Aurelo provides informational insights only and does not provide accounting, financial, tax, or legal advice.
      </p>

      <hr className="my-8 border-black/[0.06]" />

      <h2 className="text-[18px] font-semibold text-[#1c1c1c]">2. Account Registration</h2>
      <p>To use the Service, you must create an account.</p>
      <p>You agree to:</p>
      <ul>
        <li>provide accurate and complete information</li>
        <li>keep login credentials secure</li>
        <li>be responsible for all activity under your account</li>
      </ul>
      <p>
        Accounts may be associated with a workspace, which allows multiple members to collaborate within a shared
        environment.
      </p>
      <p>Workspace owners may invite additional users and assign roles such as:</p>
      <ul>
        <li>Owner</li>
        <li>Admin</li>
        <li>Member</li>
      </ul>
      <p>Workspace owners are responsible for managing access permissions.</p>

      <hr className="my-8 border-black/[0.06]" />

      <h2 className="text-[18px] font-semibold text-[#1c1c1c]">3. Workspace Responsibilities</h2>
      <p>Workspace owners are responsible for:</p>
      <ul>
        <li>managing invited users</li>
        <li>controlling access levels</li>
        <li>ensuring data uploaded by workspace members complies with applicable laws</li>
      </ul>
      <p>Aurelo is not responsible for actions taken by workspace members.</p>

      <hr className="my-8 border-black/[0.06]" />

      <h2 className="text-[18px] font-semibold text-[#1c1c1c]">4. Acceptable Use</h2>
      <p>You agree not to use the Service to:</p>
      <ul>
        <li>violate any laws or regulations</li>
        <li>upload harmful or malicious code</li>
        <li>attempt to reverse engineer the software</li>
        <li>scrape or extract platform data at scale</li>
        <li>interfere with platform infrastructure</li>
        <li>impersonate another individual or organization</li>
      </ul>
      <p>Aurelo reserves the right to suspend or terminate accounts that violate these rules.</p>

      <hr className="my-8 border-black/[0.06]" />

      <h2 className="text-[18px] font-semibold text-[#1c1c1c]">5. Integrations and Third-Party Services</h2>
      <p>The Service may integrate with third-party services, including but not limited to:</p>
      <ul>
        <li>Stripe</li>
        <li>Stripe Connect</li>
        <li>Supabase</li>
        <li>Lovable Cloud</li>
        <li>Resend</li>
      </ul>
      <p>Future integrations may include services such as QuickBooks, Slack, or Google Calendar.</p>
      <p>Use of third-party integrations is subject to the terms and privacy policies of those providers.</p>
      <p>Aurelo is not responsible for the performance or security of third-party services.</p>

      <hr className="my-8 border-black/[0.06]" />

      <h2 className="text-[18px] font-semibold text-[#1c1c1c]">6. Financial Data Disclaimer</h2>
      <p>
        Aurelo may display analytics related to project revenue, payments, or financial activity derived from user input
        or third-party integrations.
      </p>
      <p>These analytics are provided for informational purposes only.</p>
      <p>Aurelo does not guarantee accuracy and does not provide accounting, tax, or financial advice.</p>
      <p>Users are responsible for verifying financial information independently.</p>

      <hr className="my-8 border-black/[0.06]" />

      <h2 className="text-[18px] font-semibold text-[#1c1c1c]">7. Subscription Billing</h2>
      <p>Aurelo operates on a subscription model.</p>
      <p>Plans may include:</p>
      <ul>
        <li>monthly subscriptions</li>
        <li>annual subscriptions</li>
      </ul>
      <p>Subscriptions automatically renew unless canceled before the next billing cycle.</p>
      <p>Billing is processed through Stripe.</p>
      <p>
        Users authorize Aurelo and its payment processor to charge the payment method on file for subscription fees.
      </p>

      <hr className="my-8 border-black/[0.06]" />

      <h2 className="text-[18px] font-semibold text-[#1c1c1c]">8. Refund Policy</h2>
      <p>New subscriptions may be eligible for refunds within 7 days of the initial purchase.</p>
      <p>Refund requests may be reviewed on a case-by-case basis.</p>
      <p>Refund eligibility is determined at Aurelo's discretion.</p>
      <p>Recurring billing cycles after the initial purchase are generally non-refundable.</p>

      <hr className="my-8 border-black/[0.06]" />

      <h2 className="text-[18px] font-semibold text-[#1c1c1c]">9. Pricing Changes</h2>
      <p>Aurelo reserves the right to modify pricing for future subscriptions.</p>
      <p>Existing customers may be eligible for legacy pricing or grandfathered rates where applicable.</p>

      <hr className="my-8 border-black/[0.06]" />

      <h2 className="text-[18px] font-semibold text-[#1c1c1c]">10. Intellectual Property</h2>
      <p>
        All software, algorithms, designs, and content associated with the Service are the property of Aurelo LLC.
      </p>
      <p>Users are granted a limited, non-exclusive license to use the Service.</p>
      <p>Users may not:</p>
      <ul>
        <li>copy or reproduce the platform</li>
        <li>reverse engineer the software</li>
        <li>distribute or resell the Service without permission</li>
      </ul>

      <hr className="my-8 border-black/[0.06]" />

      <h2 className="text-[18px] font-semibold text-[#1c1c1c]">11. Service Availability</h2>
      <p>
        Aurelo strives to maintain reliable platform availability but does not guarantee uninterrupted service.
      </p>
      <p>The Service may be temporarily unavailable due to:</p>
      <ul>
        <li>maintenance</li>
        <li>technical issues</li>
        <li>infrastructure failures</li>
        <li>third-party service outages</li>
      </ul>

      <hr className="my-8 border-black/[0.06]" />

      <h2 className="text-[18px] font-semibold text-[#1c1c1c]">12. Limitation of Liability</h2>
      <p>To the maximum extent permitted by law, Aurelo LLC shall not be liable for:</p>
      <ul>
        <li>indirect damages</li>
        <li>lost profits</li>
        <li>lost data</li>
        <li>business interruption</li>
        <li>financial losses resulting from use of the Service</li>
      </ul>
      <p>
        Total liability shall not exceed the amount paid by the user to Aurelo in the preceding 12 months.
      </p>

      <hr className="my-8 border-black/[0.06]" />

      <h2 className="text-[18px] font-semibold text-[#1c1c1c]">13. Termination</h2>
      <p>Aurelo reserves the right to suspend or terminate accounts for violations of these Terms.</p>
      <p>Users may cancel their subscriptions at any time.</p>
      <p>Termination may result in loss of access to stored data.</p>

      <hr className="my-8 border-black/[0.06]" />

      <h2 className="text-[18px] font-semibold text-[#1c1c1c]">14. Governing Law</h2>
      <p>These Terms shall be governed by the laws of the State of Florida, United States.</p>

      <hr className="my-8 border-black/[0.06]" />

      <h2 className="text-[18px] font-semibold text-[#1c1c1c]">15. Changes to Terms</h2>
      <p>Aurelo may update these Terms periodically.</p>
      <p>Users will be notified of significant changes through the platform or via email.</p>

      <hr className="my-8 border-black/[0.06]" />

      <h2 className="text-[18px] font-semibold text-[#1c1c1c]">16. Contact</h2>
      <p>Questions about these Terms may be sent to:</p>
      <p>
        <a href="mailto:support@getaurelo.com" className="text-[#5ea1bf] hover:underline">
          support@getaurelo.com
        </a>
      </p>
    </div>
  );
}
