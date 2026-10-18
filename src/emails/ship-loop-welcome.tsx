import { Cta, Divider, EmailLayout, P } from "./layout";

export function ShipLoopWelcomeEmail({ planLabel, shipLoopUrl, accountUrl }: { planLabel: string; shipLoopUrl: string; accountUrl: string }) {
  return (
    <EmailLayout preview="You're in: Ship Loop pre-order confirmed" heading="Welcome to Ship Loop">
      <P>{`Thanks for pre-ordering Ship Loop (${planLabel}). You're on the founding list.`}</P>
      <P>Every time you ship a release, Ship Loop will draft an X post, a LinkedIn post, a changelog blurb and an image in your colours, and email them to you. You approve or edit, then you post. It never posts for you.</P>
      <P>We&apos;ll email you as soon as it&apos;s ready to connect, and before regular billing starts. Until then you can manage billing from your account at any time.</P>
      <Cta href={accountUrl}>Go to my account</Cta>
      <Divider />
      <P muted>
        Your pre-order is fully refundable until launch: just reply to this email. See what&apos;s coming at {shipLoopUrl}.
      </P>
    </EmailLayout>
  );
}

ShipLoopWelcomeEmail.PreviewProps = { planLabel: "£99 one-time", shipLoopUrl: "https://launchloop.dev/ship-loop", accountUrl: "https://launchloop.dev/account" };
export default ShipLoopWelcomeEmail;
