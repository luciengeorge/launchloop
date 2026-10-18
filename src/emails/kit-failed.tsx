import { Cta, Divider, EmailLayout, FallbackLink, P } from "./layout";

export interface KitFailedProps {
  productName: string;
  accountUrl: string;
  priceLabel: string;
  receiptRef?: string;
}

/** Sent once when every automatic attempt to write a paid kit failed. Honest, no template copy attached. */
export function KitFailedEmail({ productName, accountUrl, priceLabel, receiptRef }: KitFailedProps) {
  return (
    <EmailLayout preview={`We hit a problem generating your ${productName} launch kit. We're on it.`} heading="We hit a problem generating your kit">
      <P>Thanks for your payment. Our AI writer failed several times in a row while writing your {productName} launch kit, so we stopped rather than send you anything half-finished.</P>
      <P>We&apos;re on it. You&apos;ll get your full kit, or a full refund of {priceLabel}. You don&apos;t need to do anything; we&apos;ll email you either way. Reply to this email if you&apos;d rather have the refund straight away.</P>
      <Cta href={accountUrl}>Check on my kit</Cta>
      <Divider />
      <P muted>
        Receipt: LaunchLoop Launch Kit, {priceLabel}
        {receiptRef ? ` · Ref ${receiptRef.slice(-12)}` : ""}.
      </P>
      <FallbackLink href={accountUrl} />
    </EmailLayout>
  );
}

KitFailedEmail.PreviewProps = {
  productName: "Snapshelf",
  accountUrl: "https://launchloop.dev/account/kits/example",
  priceLabel: "£19",
  receiptRef: "cs_test_a1b2c3d4e5f6",
} satisfies KitFailedProps;

export default KitFailedEmail;
