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

export function PrivacyContent() {
  return (
    <div className="prose prose-stone max-w-none text-[15px] leading-relaxed text-[#44403c]">
      <h1 className="text-[28px] font-semibold text-[#1c1c1c] tracking-tight mb-1">Aurelo Privacy Policy</h1>
      <p className="text-[13px] text-[#a8a29e] mb-8">Last Updated: {lastUpdated}</p>

      <p>Aurelo LLC respects your privacy and is committed to protecting your personal information.</p>

      <hr className="my-8 border-black/[0.06]" />

      <h2 className="text-[18px] font-semibold text-[#1c1c1c]">Information We Collect</h2>
      <p>We may collect the following information:</p>

      <h3 className="text-[16px] font-semibold text-[#1c1c1c]">Account Information</h3>
      <ul>
        <li>name</li>
        <li>email address</li>
        <li>login credentials</li>
        <li>workspace membership details</li>
      </ul>

      <h3 className="text-[16px] font-semibold text-[#1c1c1c]">Usage Data</h3>
      <ul>
        <li>interactions with the platform</li>
        <li>session activity</li>
        <li>feature usage analytics</li>
      </ul>

      <h3 className="text-[16px] font-semibold text-[#1c1c1c]">Financial Data</h3>
      <p>
        When users connect external payment services, Aurelo may process information related to project revenue or
        payment activity.
      </p>
      <p>Payment processing itself is handled by Stripe.</p>
      <p className="font-medium">Aurelo does not store full payment card details.</p>

      <h3 className="text-[16px] font-semibold text-[#1c1c1c]">Integration Data</h3>
      <p>
        If users connect third-party services, we may access information provided by those integrations.
      </p>

      <hr className="my-8 border-black/[0.06]" />

      <h2 className="text-[18px] font-semibold text-[#1c1c1c]">Third-Party Services</h2>
      <p>Aurelo uses the following service providers:</p>

      <div className="pl-4 border-l-2 border-[#5ea1bf]/20 space-y-2 text-[14px] mb-4">
        <p><strong>Payment Processing:</strong> Stripe</p>
        <p><strong>Infrastructure and Database:</strong> Supabase</p>
        <p><strong>Hosting and Application Services:</strong> Lovable Cloud</p>
        <p><strong>Email Delivery:</strong> Resend</p>
      </div>

      <p>Future integrations may include QuickBooks, Slack, or Google Calendar.</p>
      <p>These providers process data in accordance with their own privacy policies.</p>

      <hr className="my-8 border-black/[0.06]" />

      <h2 className="text-[18px] font-semibold text-[#1c1c1c]">Cookies and Analytics</h2>
      <p>Aurelo uses cookies and analytics tools to improve the platform experience.</p>
      <p>Cookies may be used for:</p>
      <ul>
        <li>authentication</li>
        <li>session management</li>
        <li>product analytics</li>
        <li>performance monitoring</li>
      </ul>
      <p>
        Users may disable cookies in their browser settings, though some features may not function properly.
      </p>

      <hr className="my-8 border-black/[0.06]" />

      <h2 className="text-[18px] font-semibold text-[#1c1c1c]">How We Use Information</h2>
      <p>We use collected data to:</p>
      <ul>
        <li>operate and maintain the platform</li>
        <li>provide user analytics and insights</li>
        <li>process subscriptions and payments</li>
        <li>communicate service updates</li>
        <li>improve product functionality</li>
      </ul>

      <hr className="my-8 border-black/[0.06]" />

      <h2 className="text-[18px] font-semibold text-[#1c1c1c]">Data Retention</h2>
      <p>User data is retained for as long as the account remains active.</p>
      <p>Users may request deletion of their data by contacting support.</p>

      <hr className="my-8 border-black/[0.06]" />

      <h2 className="text-[18px] font-semibold text-[#1c1c1c]">Security</h2>
      <p>Aurelo takes reasonable measures to protect user data through modern security practices.</p>
      <p>However, no online system can guarantee absolute security.</p>

      <hr className="my-8 border-black/[0.06]" />

      <h2 className="text-[18px] font-semibold text-[#1c1c1c]">International Users</h2>
      <p>
        While Aurelo currently targets users in the United States, international users may access the platform.
      </p>
      <p>Data may be stored and processed in the United States.</p>

      <hr className="my-8 border-black/[0.06]" />

      <h2 className="text-[18px] font-semibold text-[#1c1c1c]">User Rights</h2>
      <p>Users may request to:</p>
      <ul>
        <li>access their personal data</li>
        <li>correct inaccurate data</li>
        <li>request deletion of data</li>
      </ul>
      <p>
        Requests can be sent to{' '}
        <a href="mailto:support@getaurelo.com" className="text-[#5ea1bf] hover:underline">
          support@getaurelo.com
        </a>
        .
      </p>

      <hr className="my-8 border-black/[0.06]" />

      <h2 className="text-[18px] font-semibold text-[#1c1c1c]">Policy Updates</h2>
      <p>We may update this Privacy Policy from time to time.</p>
      <p>Users will be notified of significant changes.</p>

      <hr className="my-8 border-black/[0.06]" />

      <h2 className="text-[18px] font-semibold text-[#1c1c1c]">Contact</h2>
      <p>For privacy-related inquiries, contact:</p>
      <p>
        <a href="mailto:support@getaurelo.com" className="text-[#5ea1bf] hover:underline">
          support@getaurelo.com
        </a>
      </p>
    </div>
  );
}
