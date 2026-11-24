import { Card, Text, BlockStack, InlineGrid } from "@shopify/polaris";

export function SaleSummary({ products, currencyCode = "USD" }) {
  const productsSelected = products.length;
  const variants = products.flatMap((product) => product.variants?.length ? product.variants : [product]);
  const originalTotal = variants.reduce((sum, variant) => sum + Number(variant.originalPrice || 0), 0);
  const saleTotal = variants.reduce((sum, variant) => sum + Number(variant.salePrice || 0), 0);
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
          <Text variant="headingLg" as="p">{new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode }).format(originalTotal)}</Text>
        </BlockStack>
        <BlockStack gap="100">
          <Text tone="subdued">Sale Total</Text>
          <Text variant="headingLg" as="p">{new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode }).format(saleTotal)}</Text>
        </BlockStack>
        <BlockStack gap="100">
          <Text tone="subdued">Total Discount</Text>
          <Text variant="headingLg" as="p" tone="success">{new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode }).format(totalDiscountAmount)}</Text>
        </BlockStack>
        <BlockStack gap="100">
          <Text tone="subdued">Average Discount</Text>
          <Text variant="headingLg" as="p" tone="success">{averageDiscountPercent}%</Text>
        </BlockStack>
      </InlineGrid>
    </Card>
  );
}
