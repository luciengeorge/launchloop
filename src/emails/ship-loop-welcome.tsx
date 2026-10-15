import { Cta, Divider, EmailLayout, P } from "./layout";

export function ShipLoopWelcomeEmail({ planLabel, shipLoopUrl, accountUrl }: { planLabel: string; shipLoopUrl: string; accountUrl: string }) {
  return (
    <EmailLayout preview="You're in: Ship Loop pre-order confirmed" heading="Welcome to Ship Loop">
      <P>{`Thanks for pre-ordering Ship Loop (${planLabel}). You're on the founding list.`}</P>
      <P>Ship Loop watches your repo and drafts new posts and an on-brand image every time you release, so every update gets its own little launch.</P>
      <P>We&apos;ll email you as soon as it&apos;s ready to connect. Until then you can manage billing from your account at any time.</P>
      <Cta href={accountUrl}>Go to my account</Cta>
      <Divider />
      <P muted>
        Your pre-order is fully refundable until launch: just reply to this email. See what&apos;s coming at {shipLoopUrl}.
      </P>
    </EmailLayout>
  );
}

ShipLoopWelcomeEmail.PreviewProps = { planLabel: "£12/month", shipLoopUrl: "https://launchloop.dev/ship-loop", accountUrl: "https://launchloop.dev/account" };
export default ShipLoopWelcomeEmail;
