import { Column, Row, Section, Text } from "@react-email/components";
import { Cta, Divider, EmailLayout, FallbackLink, P, brand } from "./layout";

export interface KitReadyProps {
  productName: string;
  accountUrl: string;
  priceLabel: string;
  receiptRef?: string;
  zipFilename?: string;
  summary: { label: string; detail: string }[];
}

export function KitReadyEmail({ productName, accountUrl, priceLabel, receiptRef, zipFilename, summary }: KitReadyProps) {
  return (
    <EmailLayout preview={`Payment received. Your ${productName} launch kit is ready.`} heading={`Your ${productName} launch kit is ready`}>
      <P>Thanks for your payment. Every asset is written and waiting in your account, laid out as a launch checklist you can copy from and tick off.</P>
      <Cta href={accountUrl}>Open my launch kit</Cta>
      <Section className="ll-panel" style={{ backgroundColor: brand.page, borderRadius: 10, padding: "14px 18px" }}>
        <Text className="ll-heading" style={{ fontSize: 13, fontWeight: 700, color: brand.ink, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          What&apos;s inside
        </Text>
        {summary.map((item) => (
          <Row key={item.label}>
            <Column style={{ width: 18, verticalAlign: "top" }}>
              <Text style={{ margin: "0 0 6px", color: brand.orange, fontSize: 14, lineHeight: "20px" }}>✓</Text>
            </Column>
            <Column>
              <Text className="ll-text" style={{ margin: "0 0 6px", fontSize: 14, lineHeight: "20px", color: brand.ink }}>
                <strong>{item.label}</strong> <span className="ll-muted" style={{ color: brand.muted }}>· {item.detail}</span>
              </Text>
            </Column>
          </Row>
        ))}
      </Section>
      {zipFilename ? (
        <Text className="ll-muted" style={{ fontSize: 13, lineHeight: "20px", color: brand.muted, margin: "14px 0 0" }}>{`Everything is also attached as ${zipFilename}.`}</Text>
      ) : null}
      <Divider />
      <P muted>
        Receipt: LaunchLoop Launch Kit, {priceLabel}
        {receiptRef ? ` · Ref ${receiptRef.slice(-12)}` : ""}. Not happy? Reply within 14 days for a full refund.
      </P>
      <FallbackLink href={accountUrl} />
    </EmailLayout>
  );
}

KitReadyEmail.PreviewProps = {
  productName: "Snapshelf",
  accountUrl: "https://launchloop.dev/account/kits/example",
  priceLabel: "£19",
  receiptRef: "cs_test_a1b2c3d4e5f6",
  zipFilename: "snapshelf-launch-kit.zip",
  summary: [
    { label: "Landing page copy", detail: "headline, subheadline, CTA, 4 feature blocks" },
    { label: "Meta tags", detail: "title and description" },
    { label: "Product Hunt post", detail: "tagline, description, topics, maker comment" },
    { label: "X launch thread", detail: "6 posts" },
    { label: "LinkedIn post", detail: "ready to paste" },
    { label: "3 on-brand images", detail: "OG, X and Product Hunt sizes" },
    { label: "Launch-day checklist", detail: "10 steps" },
  ],
} satisfies KitReadyProps;
export default KitReadyEmail;
