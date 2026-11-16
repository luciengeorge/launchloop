import { formatPaidAmount } from "../lib/money";
import { PRODUCTS } from "../lib/products";
import { Cta, Divider, EmailLayout, FallbackLink, P } from "./layout";

export interface DirectoryPackReadyProps {
  packUrl: string;
  /** What the buyer was charged, formatted by formatPaidAmount. Omitted when unknown: the copy then names no price. */
  amountPaid?: string;
  receiptRef?: string;
}

/** Sent once after a Directory Launch Pack payment: the private link is the buyer's only way back to it. */
export function DirectoryPackReadyEmail({ packUrl, amountPaid, receiptRef }: DirectoryPackReadyProps) {
  return (
    <EmailLayout preview="Your Directory Launch Pack is ready. Keep this link, it's your way back in." heading="Your Directory Launch Pack is ready">
      <P>Thanks for your payment. Your pack is at the private link below: every directory with its submit link and rules, a CSV download, and listing copy written for each one once you add your product.</P>
      <P>Keep this email. Anyone with the link can open the pack, so don&apos;t share it.</P>
      <Cta href={packUrl}>Open my pack</Cta>
      <Divider />
      <P muted>
        Receipt: {PRODUCTS.directoryPack.name}
        {amountPaid ? `, ${amountPaid}` : ""}
        {receiptRef ? ` · Ref ${receiptRef.slice(-12)}` : ""}.
      </P>
      <FallbackLink href={packUrl} />
    </EmailLayout>
  );
}

DirectoryPackReadyEmail.PreviewProps = {
  packUrl: "https://launchloop.dev/directory-pack/access/example",
  amountPaid: formatPaidAmount({ amount: PRODUCTS.directoryPack.amountPence, currency: "gbp" }),
  receiptRef: "cs_test_a1b2c3d4e5f6",
} satisfies DirectoryPackReadyProps;

export default DirectoryPackReadyEmail;
