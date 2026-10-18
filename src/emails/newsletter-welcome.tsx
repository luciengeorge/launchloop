import { Cta, Divider, EmailLayout, FallbackLink, P } from "./layout";

export function NewsletterWelcomeEmail({ checklistUrl }: { checklistUrl: string }) {
  return (
    <EmailLayout preview="Here's the launch-day checklist I promised." heading="Your launch-day checklist">
      <P>Thanks for subscribing to Weekly launch teardowns. Here&apos;s the checklist I promised.</P>
      <P>It&apos;s what I work through before every launch: what to fix a week out, the Product Hunt listing limits, image sizes, and what to do on the day, in order.</P>
      <Cta href={checklistUrl}>Open the checklist</Cta>
      <P>Once a week I&apos;ll send you one launch teardown. A real launch, what worked, what didn&apos;t, and what you can copy. Short and practical.</P>
      <Divider />
      <P muted>Every issue has an unsubscribe link. If you didn&apos;t sign up, ignore this email or reply and I&apos;ll take you off the list.</P>
      <FallbackLink href={checklistUrl} />
    </EmailLayout>
  );
}

NewsletterWelcomeEmail.PreviewProps = { checklistUrl: "https://launchloop.dev/product-hunt-launch-checklist?utm_source=newsletter&utm_medium=email&utm_campaign=welcome" };
export default NewsletterWelcomeEmail;
