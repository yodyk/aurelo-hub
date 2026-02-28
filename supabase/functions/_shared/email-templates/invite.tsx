/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
  workspaceLogoUrl?: string
}

const WORDMARK_URL = 'https://oqrqypuulgeqzjcgqruw.supabase.co/storage/v1/object/public/email-assets/aurelo-wordmark.png'

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
  workspaceLogoUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
    </Head>
    <Preview>You've been invited to join {siteName}</Preview>
    <Body style={main}>
      <Container style={card}>
        <Section style={header}>
          <Row>
            <Column style={logoLeftCol}>
              {workspaceLogoUrl ? (
                <Img src={workspaceLogoUrl} alt={siteName} height="32" style={wLogo} />
              ) : null}
            </Column>
            <Column style={logoRightCol}>
              <Img src={WORDMARK_URL} alt="aurelo" height="20" style={wMark} />
            </Column>
          </Row>
        </Section>
        <Hr style={headerDivider} />
        <Section style={content}>
          <Heading style={h1}>You've been invited</Heading>
          <Text style={text}>
            You've been invited to join the{' '}
            <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>{' '}
            workspace. Click below to accept and create your account.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={confirmationUrl}>
              Accept invitation
            </Button>
          </Section>
          <Text style={subtext}>
            If the button doesn't work, paste this URL into your browser:
          </Text>
          <Text style={urlText}>{confirmationUrl}</Text>
        </Section>
        <Hr style={divider} />
        <Text style={footer}>
          If you weren't expecting this invitation, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

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
const link = { color: '#5ea1bf', textDecoration: 'none', fontWeight: '500' as const }
const buttonContainer = { textAlign: 'center' as const, margin: '0 0 24px' }
const button = { backgroundColor: '#5ea1bf', color: '#ffffff', fontSize: '14px', fontWeight: '500' as const, borderRadius: '8px', padding: '12px 28px', textDecoration: 'none', display: 'inline-block' }
const subtext = { fontSize: '12px', color: '#a8a29e', lineHeight: '1.5', margin: '0 0 8px' }
const urlText = { fontSize: '12px', color: '#5ea1bf', lineHeight: '1.5', wordBreak: 'break-all' as const, margin: '0 0 16px' }
const divider = { borderColor: 'rgba(0,0,0,0.06)', margin: '0 40px' }
const footer = { fontSize: '12px', color: '#a8a29e', padding: '16px 40px 32px', margin: '0' }
