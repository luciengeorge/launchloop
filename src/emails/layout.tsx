import { Body, Button, Container, Head, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";
import { LOGO_CID } from "./logo-data";

export const brand = {
  orange: "#f2541b",
  ink: "#111111",
  muted: "#5f6368",
  border: "#e8e8ea",
  page: "#f6f6f7",
  card: "#ffffff",
};

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

/**
 * Light card on a light page, with a dark-mode block that flips colours in
 * clients that honour prefers-color-scheme (Apple Mail, iOS, Outlook.com).
 * The logo has its own dark tile so it reads on either background.
 */
const darkCss = `
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  @media (prefers-color-scheme: dark) {
    body.ll-page, .ll-page > table, .ll-page > table > tbody > tr > td { background-color: #0d0d0e !important; }
    .ll-card { background-color: #18181b !important; border-left-color: #2a2a2e !important; border-right-color: #2a2a2e !important; border-bottom-color: #2a2a2e !important; }
    .ll-text, .ll-heading { color: #f4f4f5 !important; }
    .ll-muted { color: #a1a1aa !important; }
    .ll-hr { border-color: #2a2a2e !important; }
    .ll-panel { background-color: #222226 !important; }
  }
`;

export function EmailLayout({ preview, heading, children, logoSrc = `cid:${LOGO_CID}` }: { preview: string; heading: string; children: ReactNode; logoSrc?: string }) {
  return (
    <Html lang="en-GB">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style>{darkCss}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Body className="ll-page" style={{ backgroundColor: brand.page, fontFamily: font, margin: 0, padding: "32px 12px" }}>
        <Container style={{ maxWidth: 560, margin: "0 auto" }}>
          <Section style={{ padding: "0 4px 20px" }}>
            <Img src={logoSrc} width="32" height="32" alt="LaunchLoop" style={{ display: "inline-block", verticalAlign: "middle", borderRadius: 9 }} />
            <span className="ll-heading" style={{ display: "inline-block", verticalAlign: "middle", marginLeft: 10, fontSize: 18, fontWeight: 700, color: brand.ink, letterSpacing: "-0.01em" }}>
              LaunchLoop
            </span>
          </Section>
          <Section className="ll-card" style={{ backgroundColor: brand.card, border: `1px solid ${brand.border}`, borderRadius: 14, padding: "32px 32px 28px", borderTop: `4px solid ${brand.orange}` }}>
            <Text className="ll-heading" style={{ fontSize: 22, lineHeight: "30px", fontWeight: 700, color: brand.ink, margin: "0 0 16px", letterSpacing: "-0.01em" }}>
              {heading}
            </Text>
            {children}
          </Section>
          <Text className="ll-muted" style={{ fontSize: 12, lineHeight: "18px", color: brand.muted, textAlign: "center", margin: "20px 0 0" }}>
            LaunchLoop · Paste your repo. Get your whole launch.
            <br />
            <Link href="https://launchloop.dev" style={{ color: brand.muted, textDecoration: "underline" }}>
              launchloop.dev
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function P({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return (
    <Text className={muted ? "ll-muted" : "ll-text"} style={{ fontSize: muted ? 13 : 15, lineHeight: muted ? "20px" : "24px", color: muted ? brand.muted : brand.ink, margin: "0 0 14px" }}>
      {children}
    </Text>
  );
}

export function Cta({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Section style={{ margin: "22px 0 22px" }}>
      <Button href={href} style={{ backgroundColor: brand.orange, color: "#ffffff", fontSize: 15, fontWeight: 600, borderRadius: 10, padding: "13px 22px", textDecoration: "none" }}>
        {children}
      </Button>
    </Section>
  );
}

export function Divider() {
  return <Hr className="ll-hr" style={{ borderColor: brand.border, margin: "22px 0" }} />;
}

export function FallbackLink({ href }: { href: string }) {
  return (
    <P muted>
      Button not working? Paste this into your browser:
      <br />
      <Link href={href} style={{ color: brand.orange, wordBreak: "break-all" }}>
        {href}
      </Link>
    </P>
  );
}
