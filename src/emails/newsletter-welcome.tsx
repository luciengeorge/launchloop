import { Link } from "@react-email/components";
import { brand, Cta, Divider, EmailLayout, FallbackLink, P } from "./layout";

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

/** The welcome email while newsletter-calendar-reward is on: the calendar is the one button, the checklist a quiet text link. */
export function NewsletterCalendarWelcomeEmail({ calendarUrl, checklistUrl }: { calendarUrl: string; checklistUrl: string }) {
  return (
    <EmailLayout preview="Here's the 7-day launch calendar I promised." heading="Your 7-day launch calendar">
      <P>Thanks for subscribing to Weekly launch teardowns. Here&apos;s the 7-day launch calendar I promised.</P>
      <P>
        It&apos;s a day-by-day plan for the week before a launch: Product Hunt, your share card, BetaList, Indie Hackers and a couple of free directories. Each task points
        back to a guide on the site.
      </P>
      <Cta href={calendarUrl}>Open the 7-day launch calendar</Cta>
      <P>Once a week I&apos;ll send you one launch teardown. A real launch, what worked, what didn&apos;t, and what you can copy. Short and practical.</P>
      <P>
        Also useful if you&apos;re aiming at Product Hunt:{" "}
        <Link href={checklistUrl} style={{ color: brand.orange, textDecoration: "underline" }}>
          the launch-day checklist
        </Link>
        .
      </P>
      <Divider />
      <P muted>Every issue has an unsubscribe link. If you didn&apos;t sign up, ignore this email or reply and I&apos;ll take you off the list.</P>
      <FallbackLink href={calendarUrl} />
    </EmailLayout>
  );
}

NewsletterCalendarWelcomeEmail.PreviewProps = {
  calendarUrl: "https://launchloop.dev/7-day-launch-calendar?utm_source=newsletter&utm_medium=email&utm_campaign=welcome",
  checklistUrl: "https://launchloop.dev/product-hunt-launch-checklist?utm_source=newsletter&utm_medium=email&utm_campaign=welcome&utm_content=ph-checklist",
};
