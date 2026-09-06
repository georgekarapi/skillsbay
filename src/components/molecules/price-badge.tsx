import { Badge } from "@/components/ui/badge";

export function PriceBadge({ price }: { price: string }) {
  const isFree = price === "0.00" || price === "0";
  return (
    <Badge
      className="font-mono font-medium"
      variant={isFree ? "outline" : "secondary"}
    >
      {isFree ? "Free" : `$${price} USDC`}
    </Badge>
  );
}
