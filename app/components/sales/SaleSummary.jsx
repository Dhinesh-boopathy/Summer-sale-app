import { Card, Text, BlockStack, InlineGrid } from "@shopify/polaris";

export function SaleSummary({ products }) {
  const productsSelected = products.length;
  
  const originalTotal = products.reduce((sum, p) => sum + p.originalPrice, 0);
  const saleTotal = products.reduce((sum, p) => sum + p.salePrice, 0);
  const totalDiscountAmount = originalTotal - saleTotal;
  
  const averageDiscountPercent = originalTotal > 0 
    ? Math.round((totalDiscountAmount / originalTotal) * 100) 
    : 0;

  return (
    <Card background="bg-surface-secondary">
      <InlineGrid columns={{ xs: 2, sm: 3, md: 5 }} gap="400">
        <BlockStack gap="100">
          <Text tone="subdued">Products Selected</Text>
          <Text variant="headingLg" as="p">{productsSelected}</Text>
        </BlockStack>
        <BlockStack gap="100">
          <Text tone="subdued">Original Total</Text>
          <Text variant="headingLg" as="p">${originalTotal.toFixed(2)}</Text>
        </BlockStack>
        <BlockStack gap="100">
          <Text tone="subdued">Sale Total</Text>
          <Text variant="headingLg" as="p">${saleTotal.toFixed(2)}</Text>
        </BlockStack>
        <BlockStack gap="100">
          <Text tone="subdued">Total Discount</Text>
          <Text variant="headingLg" as="p" tone="success">${totalDiscountAmount.toFixed(2)}</Text>
        </BlockStack>
        <BlockStack gap="100">
          <Text tone="subdued">Average Discount</Text>
          <Text variant="headingLg" as="p" tone="success">{averageDiscountPercent}%</Text>
        </BlockStack>
      </InlineGrid>
    </Card>
  );
}
