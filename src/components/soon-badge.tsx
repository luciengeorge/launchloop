import { Badge } from "@/components/ui/badge";

export const SHIP_LOOP_LINK_LABEL = "Ship Loop (coming soon)";

export function SoonBadge() {
  return (
    <Badge variant="outline" className="h-4 bg-background px-1.5 py-0 text-[10px] leading-none">
      Soon
    </Badge>
  );
}
