import { Card, Text, BlockStack, InlineStack, Box, Divider } from "@shopify/polaris";

export function AnalyticsPanel({ totalProducts }) {
  // Placeholder data as requested for "future ready" sections
  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h6">
          Overview
        </Text>
        
        <InlineStack align="space-between">
          <Text tone="subdued">Total Products</Text>
          <Text fontWeight="bold">{totalProducts}</Text>
        </InlineStack>
        <Divider />
        <InlineStack align="space-between">
          <Text tone="subdued">Avg. Discount</Text>
          <Text fontWeight="bold">15%</Text>
        </InlineStack>
        <Divider />
        <InlineStack align="space-between">
          <Text tone="subdued">Est. Revenue</Text>
          <Text fontWeight="bold">$0.00</Text>
        </InlineStack>
        <Divider />
        <Box paddingBlockStart="200">
          <Text tone="subdued" variant="bodySm">
            Analytics will populate as campaigns run.
          </Text>
        </Box>
      </BlockStack>
    </Card>
  );
}
