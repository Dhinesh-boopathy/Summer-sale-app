import { Card, Text, BlockStack, InlineGrid, Box } from "@shopify/polaris";

export function SalesStats({ sales }) {
  const total = sales.length;
  const draft = sales.filter(s => s.status === "Draft").length;
  const scheduled = sales.filter(s => s.status === "Scheduled").length;
  const running = sales.filter(s => s.status === "Running").length;
  const completed = sales.filter(s => s.status === "Completed").length;

  const statCards = [
    { label: "Total Sales", value: total, desc: "All campaigns", tone: "base" },
    { label: "Running", value: running, desc: "Currently Active", tone: "success" },
    { label: "Scheduled", value: scheduled, desc: "Starting soon", tone: "info" },
    { label: "Draft", value: draft, desc: "Not scheduled", tone: "subdued" },
    { label: "Completed", value: completed, desc: "Finished", tone: "magic" },
  ];

  return (
    <div style={{ marginBottom: "20px" }}>
      <InlineGrid columns={{ xs: 2, sm: 3, md: 5 }} gap="400">
        {statCards.map((stat, i) => (
          <Card key={i} background="bg-surface-secondary">
            <BlockStack gap="200">
              <Text variant="headingMd" as="h6" tone="subdued">
                {stat.label}
              </Text>
              <Text variant="heading3xl" as="p">
                {stat.value}
              </Text>
              <Text variant="bodySm" tone={stat.tone}>
                {stat.desc}
              </Text>
            </BlockStack>
          </Card>
        ))}
      </InlineGrid>
    </div>
  );
}
