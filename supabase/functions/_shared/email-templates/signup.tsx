/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  workspaceLogoUrl?: string
}

const WORDMARK_URL = 'https://oqrqypuulgeqzjcgqruw.supabase.co/storage/v1/object/public/email-assets/aurelo-wordmark.png'

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
  workspaceLogoUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
    </Head>
    <Preview>Welcome aboard — verify your email to get started</Preview>
    <Body style={main}>
      <Container style={card}>
        {/* Branded header bar */}
        <Section style={headerBar}>
          <Row>
            <Column style={logoLeftCol}>
              {workspaceLogoUrl ? (
                <Img src={workspaceLogoUrl} alt={siteName} height="28" style={wLogo} />
              ) : null}
            </Column>
            <Column style={logoRightCol}>
              <Img src={WORDMARK_URL} alt="aurelo" height="18" style={wMark} />
            </Column>
          </Row>
        </Section>

        {/* Gold accent strip */}
        <Section style={accentStrip} />

        <Section style={content}>
          <Text style={eyebrow}>WELCOME TO {siteName.toUpperCase()}</Text>
          <Heading style={h1}>Let's get you started</Heading>
          <Text style={text}>
            Great to have you here, {recipient}. Confirm your email address below and you'll be managing your workspace in no time.
          </Text>

          <Section style={buttonContainer}>
            <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto' }}>
              <tr>
                <td style={button}>
                  <a href={confirmationUrl} style={buttonLink}>
                    Verify email address →
                  </a>
                </td>
              </tr>
            </table>
          </Section>

          <Text style={subtext}>
            If the button doesn't work, paste this URL into your browser:
          </Text>
          <Text style={urlText}>{confirmationUrl}</Text>
        </Section>

        <Hr style={divider} />

        <Section style={footerSection}>
          <Text style={footer}>
            If you didn't create this account, you can safely ignore this email.
          </Text>
          <Text style={footerBrand}>
            Sent with{' '}
            <Link href="https://getaurelo.com" style={footerLink}>Aurelo</Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

/* ── Styles ── */
const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
}
const card = { maxWidth: '480px', margin: '40px auto', padding: '0', border: '1px solid #e8e8e6', borderRadius: '12px', overflow: 'hidden' as const }
const headerBar = { backgroundColor: '#1a1a19', padding: '24px 32px' }
const logoLeftCol = { verticalAlign: 'middle' as const }
const logoRightCol = { verticalAlign: 'middle' as const, textAlign: 'right' as const }
const wLogo = { display: 'inline-block', verticalAlign: 'middle' }
const wMark = { display: 'inline-block', verticalAlign: 'middle', opacity: '0.9' }
const accentStrip = { height: '3px', background: 'linear-gradient(90deg, #5ea1bf 0%, #3b7a99 100%)' }
const content = { padding: '32px 32px 24px' }
const eyebrow = { fontSize: '11px', fontWeight: '600' as const, color: '#5ea1bf', letterSpacing: '0.1em', margin: '0 0 8px' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#1a1a19', letterSpacing: '-0.02em', margin: '0 0 16px', lineHeight: '1.2' }
const text = { fontSize: '14px', color: '#52524e', lineHeight: '1.7', margin: '0 0 28px' }
const buttonContainer = { textAlign: 'center' as const, margin: '0 0 28px' }
const button = {
  backgroundColor: '#5ea1bf',
  borderRadius: '8px',
  padding: '0',
}
const buttonLink = {
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
  padding: '14px 32px',
}
const subtext = { fontSize: '12px', color: '#a8a29e', lineHeight: '1.5', margin: '0 0 6px' }
const urlText = { fontSize: '12px', color: '#5ea1bf', lineHeight: '1.5', wordBreak: 'break-all' as const, margin: '0 0 8px' }
const divider = { borderColor: '#e8e8e6', margin: '0 32px' }
const footerSection = { padding: '16px 32px 24px' }
const footer = { fontSize: '12px', color: '#a8a29e', margin: '0 0 8px', lineHeight: '1.5' }
const footerBrand = { fontSize: '11px', color: '#c4c4c0', margin: '0' }
const footerLink = { color: '#5ea1bf', textDecoration: 'none' }
