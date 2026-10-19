import { formatPaidAmount } from "../lib/money";
import { PRODUCTS } from "../lib/products";
import { Cta, Divider, EmailLayout, FallbackLink, P } from "./layout";

export interface KitFailedProps {
  productName: string;
  accountUrl: string;
  /** What the buyer was charged, formatted by formatPaidAmount. Omitted when unknown: the copy then names no price. */
  amountPaid?: string;
  receiptRef?: string;
}

/** Sent once when every automatic attempt to write a paid kit failed. Honest, no template copy attached. */
export function KitFailedEmail({ productName, accountUrl, amountPaid, receiptRef }: KitFailedProps) {
  return (
    <EmailLayout preview={`We hit a problem generating your ${productName} launch kit. We're on it.`} heading="We hit a problem generating your kit">
      <P>Thanks for your payment. Our AI writer failed several times in a row while writing your {productName} launch kit, so we stopped rather than send you anything half-finished.</P>
      <P>
        We&apos;re on it. You&apos;ll get your full kit, or a full refund{amountPaid ? ` of ${amountPaid}` : ""}. You don&apos;t need to do anything; we&apos;ll email you either way. Reply to this email if you&apos;d rather have the refund straight away.
      </P>
      <Cta href={accountUrl}>Check on my kit</Cta>
      <Divider />
      <P muted>
        Receipt: LaunchLoop Launch Kit{amountPaid ? `, ${amountPaid}` : ""}
        {receiptRef ? ` · Ref ${receiptRef.slice(-12)}` : ""}.
      </P>
      <FallbackLink href={accountUrl} />
    </EmailLayout>
  );
}

KitFailedEmail.PreviewProps = {
  productName: "Snapshelf",
  accountUrl: "https://launchloop.dev/account/kits/example",
  amountPaid: formatPaidAmount({ amount: PRODUCTS.kit.amountPence, currency: "gbp" }),
  receiptRef: "cs_test_a1b2c3d4e5f6",
} satisfies KitFailedProps;

export default KitFailedEmail;
