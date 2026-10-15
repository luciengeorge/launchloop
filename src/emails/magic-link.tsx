import { EmailLayout, Cta, Divider, FallbackLink, P } from "./layout";

export function MagicLinkEmail({ url }: { url: string }) {
  return (
    <EmailLayout preview="Your one-time LaunchLoop login link (expires in 15 minutes)" heading="Log in to LaunchLoop">
      <P>Click the button to log in and get back to your launch kits. No password needed.</P>
      <Cta href={url}>Log in to LaunchLoop</Cta>
      <P muted>This link works once and expires in 15 minutes. If you didn&apos;t ask for it, you can ignore this email; nobody can log in without it.</P>
      <Divider />
      <FallbackLink href={url} />
    </EmailLayout>
  );
}

MagicLinkEmail.PreviewProps = { url: "https://launchloop.dev/login/verify?token=example" };
export default MagicLinkEmail;
