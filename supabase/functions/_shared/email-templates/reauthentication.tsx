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

interface ReauthenticationEmailProps {
  token: string
  workspaceLogoUrl?: string
  siteName?: string
}

const WORDMARK_URL = 'https://oqrqypuulgeqzjcgqruw.supabase.co/storage/v1/object/public/email-assets/aurelo-wordmark.png'

export const ReauthenticationEmail = ({ token, workspaceLogoUrl, siteName }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
    </Head>
    <Preview>Your verification code: {token}</Preview>
    <Body style={main}>
      <Container style={card}>
        <Section style={headerBar}>
          <Row>
            <Column style={logoLeftCol}>
              {workspaceLogoUrl ? (
                <Img src={workspaceLogoUrl} alt={siteName || 'Workspace'} height="28" style={wLogo} />
              ) : null}
            </Column>
            <Column style={logoRightCol}>
              <Img src={WORDMARK_URL} alt="aurelo" height="18" style={wMark} />
            </Column>
          </Row>
        </Section>

        <Section style={accentStrip} />

        <Section style={content}>
          <Text style={eyebrow}>VERIFICATION</Text>
          <Heading style={h1}>Here's your code</Heading>
          <Text style={text}>
            Enter this code to confirm your identity. It'll expire shortly.
          </Text>

          <Section style={codeContainer}>
            <Text style={codeStyle}>{token}</Text>
          </Section>
        </Section>

        <Hr style={divider} />

        <Section style={footerSection}>
          <Text style={footer}>
            Didn't request this code? You can safely ignore this email.
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

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }
const card = { maxWidth: '480px', margin: '40px auto', padding: '0', border: '1px solid #e8e8e6', borderRadius: '12px', overflow: 'hidden' as const }
const headerBar = { backgroundColor: '#1a1a19', padding: '24px 32px' }
const logoLeftCol = { verticalAlign: 'middle' as const }
const logoRightCol = { verticalAlign: 'middle' as const, textAlign: 'right' as const }
const wLogo = { display: 'inline-block', verticalAlign: 'middle' }
const wMark = { display: 'inline-block', verticalAlign: 'middle', opacity: '0.9' }
const accentStrip = { height: '3px', background: 'linear-gradient(90deg, #5ea1bf 0%, #bfa044 100%)' }
const content = { padding: '32px 32px 24px' }
const eyebrow = { fontSize: '11px', fontWeight: '600' as const, color: '#bfa044', letterSpacing: '0.1em', margin: '0 0 8px' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#1a1a19', letterSpacing: '-0.02em', margin: '0 0 16px', lineHeight: '1.2' }
const text = { fontSize: '14px', color: '#52524e', lineHeight: '1.7', margin: '0 0 28px' }
const codeContainer = {
  textAlign: 'center' as const,
  margin: '0 0 24px',
  padding: '24px',
  backgroundColor: '#1a1a19',
  borderRadius: '10px',
}
const codeStyle = {
  fontFamily: "'Inter', monospace",
  fontSize: '36px',
  fontWeight: '700' as const,
  color: '#bfa044',
  letterSpacing: '0.2em',
  margin: '0',
}
const divider = { borderColor: '#e8e8e6', margin: '0 32px' }
const footerSection = { padding: '16px 32px 24px' }
const footer = { fontSize: '12px', color: '#a8a29e', margin: '0 0 8px', lineHeight: '1.5' }
const footerBrand = { fontSize: '11px', color: '#c4c4c0', margin: '0' }
const footerLink = { color: '#bfa044', textDecoration: 'none' }
