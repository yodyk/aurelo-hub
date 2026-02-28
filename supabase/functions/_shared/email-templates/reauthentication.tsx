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
    <Preview>Your verification code</Preview>
    <Body style={main}>
      <Container style={card}>
        <Section style={header}>
          <Row>
            <Column style={logoLeftCol}>
              {workspaceLogoUrl ? (
                <Img src={workspaceLogoUrl} alt={siteName || 'Workspace'} height="32" style={wLogo} />
              ) : null}
            </Column>
            <Column style={logoRightCol}>
              <Img src={WORDMARK_URL} alt="aurelo" height="20" style={wMark} />
            </Column>
          </Row>
        </Section>
        <Hr style={headerDivider} />
        <Section style={content}>
          <Heading style={h1}>Verification code</Heading>
          <Text style={text}>
            Use this code to confirm your identity. It will expire shortly.
          </Text>
          <Section style={codeContainer}>
            <Text style={codeStyle}>{token}</Text>
          </Section>
        </Section>
        <Hr style={divider} />
        <Text style={footer}>
          If you didn't request this code, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }
const card = { maxWidth: '480px', margin: '40px auto', padding: '0' }
const header = { padding: '32px 40px 0' }
const logoLeftCol = { verticalAlign: 'middle' as const }
const logoRightCol = { verticalAlign: 'middle' as const, textAlign: 'right' as const }
const wLogo = { display: 'inline-block', verticalAlign: 'middle' }
const wMark = { display: 'inline-block', verticalAlign: 'middle' }
const headerDivider = { borderColor: 'rgba(0,0,0,0.06)', margin: '20px 40px 0' }
const content = { padding: '24px 40px' }
const h1 = { fontSize: '22px', fontWeight: '600' as const, color: '#1c1c1c', letterSpacing: '-0.01em', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#717182', lineHeight: '1.6', margin: '0 0 24px' }
const codeContainer = {
  textAlign: 'center' as const,
  margin: '0 0 24px',
  padding: '20px',
  backgroundColor: '#fafaf9',
  borderRadius: '8px',
  border: '1px solid rgba(0,0,0,0.06)',
}
const codeStyle = {
  fontFamily: "'Inter', monospace",
  fontSize: '32px',
  fontWeight: '700' as const,
  color: '#1c1c1c',
  letterSpacing: '0.15em',
  margin: '0',
}
const divider = { borderColor: 'rgba(0,0,0,0.06)', margin: '0 40px' }
const footer = { fontSize: '12px', color: '#a8a29e', padding: '16px 40px 32px', margin: '0' }
