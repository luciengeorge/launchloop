import { Section, Text } from "@react-email/components";
import { EmailLayout, Cta, Divider, FallbackLink, P, brand } from "./layout";

export function MagicLinkEmail({ url, code }: { url: string; code: string }) {
  return (
    <EmailLayout preview={`Your login code is ${code}. Or click to log in (expires in 15 minutes).`} heading="Log in to LaunchLoop">
      <P>Click the button to log in and pick up where you left off. No password needed.</P>
      <Cta href={url}>Log in to LaunchLoop</Cta>
      <P>Or type this code in the tab you started from:</P>
      <Section style={{ margin: "4px 0 18px" }}>
        <Text
          className="ll-code"
          style={{
            display: "inline-block",
            margin: 0,
            padding: "10px 16px",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            fontSize: 28,
            lineHeight: "34px",
            fontWeight: 700,
            letterSpacing: "6px",
            color: brand.ink,
            backgroundColor: brand.page,
            border: `1px solid ${brand.border}`,
            borderRadius: 10,
          }}
        >
          {code}
        </Text>
      </Section>
      <P muted>The link and code work once and expire in 15 minutes. If you didn&apos;t ask for them, you can ignore this email; nobody can log in without it.</P>
      <Divider />
      <FallbackLink href={url} />
    </EmailLayout>
  );
}

MagicLinkEmail.PreviewProps = { url: "https://launchloop.dev/login/verify?token=example", code: "482913" };
export default MagicLinkEmail;
