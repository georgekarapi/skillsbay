import { Badge } from "@/components/ui/badge"

export function PriceBadge({ price }: { price: string }) {
  return <Badge className="font-mono font-medium" variant="secondary">${price} USDC</Badge>
}
