import { Card, Text, BlockStack, InlineStack, ProgressBar, Badge, Box } from "@shopify/polaris";

export function ActiveCampaignHighlight({ sales }) {
  const activeSales = sales.filter(s => s.status === "Running");
  if (activeSales.length === 0) return null;

  const featured = activeSales[0]; // Just highlight the first active one
  const now = new Date();
  
  let progress = 0;
  let remainingText = "Finishing soon";
  
  if (featured.startAt && featured.endAt) {
    const start = new Date(featured.startAt).getTime();
    const end = new Date(featured.endAt).getTime();
    const current = now.getTime();
    
    if (current > start && current < end) {
      progress = ((current - start) / (end - start)) * 100;
      const hoursLeft = Math.ceil((end - current) / (1000 * 60 * 60));
      remainingText = `${hoursLeft} hours remaining`;
    }
  }

  return (
    <div style={{ marginBottom: "20px" }}>
      <Card background="bg-surface-magic">
        <BlockStack gap="400">
          <InlineStack align="space-between">
            <BlockStack gap="100">
              <InlineStack gap="200" align="start" blockAlign="center">
                <Text variant="headingLg" as="h5">
                  🔥 {featured.name}
                </Text>
                <Badge tone="success">Active Campaign</Badge>
              </InlineStack>
              <Text tone="subdued">
                {featured._count?.items || 0} products on sale
              </Text>
            </BlockStack>
            <BlockStack gap="100" align="end">
              <Text variant="headingMd" as="p">
                {remainingText}
              </Text>
            </BlockStack>
          </InlineStack>

          <BlockStack gap="200">
            <ProgressBar progress={progress} tone="success" size="small" />
            <InlineStack align="space-between">
              <Text tone="subdued" variant="bodySm">Progress</Text>
              <Text tone="subdued" variant="bodySm">{Math.round(progress)}%</Text>
            </InlineStack>
          </BlockStack>
        </BlockStack>
      </Card>
    </div>
  );
}
