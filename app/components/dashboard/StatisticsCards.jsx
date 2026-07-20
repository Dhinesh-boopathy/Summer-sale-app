import PropTypes from "prop-types";
import { Box, Card, Text, InlineStack, BlockStack, Icon, InlineGrid } from "@shopify/polaris";
import {
  ProductIcon,
  CalendarTimeIcon,
  PlayIcon,
  CheckCircleIcon,
} from "@shopify/polaris-icons";

export function StatisticsCards({
  totalProducts,
  scheduledSales,
  runningSales,
  completedSales,
}) {
  const cards = [
    {
      title: "Total Products",
      value: totalProducts,
      subtitle: "Available in store",
      icon: ProductIcon,
      color: "textSuccess",
    },
    {
      title: "Scheduled Sales",
      value: scheduledSales,
      subtitle: "Waiting to start",
      icon: CalendarTimeIcon,
      color: "textInfo",
    },
    {
      title: "Running Sales",
      value: runningSales,
      subtitle: "Currently active",
      icon: PlayIcon,
      color: "textWarning",
    },
    {
      title: "Completed Sales",
      value: completedSales,
      subtitle: "Finished successfully",
      icon: CheckCircleIcon,
      color: "textMagic",
    },
  ];

  return (
    <Box paddingBlockEnd="400">
      <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
        {cards.map((card, index) => (
          <Card key={index} roundedAbove="sm">
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h3" variant="headingSm" tone="subdued">
                  {card.title}
                </Text>
                <Icon source={card.icon} tone="base" />
              </InlineStack>
              <BlockStack gap="100">
                <Text as="p" variant="heading3xl">
                  {card.value}
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  {card.subtitle}
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
        ))}
      </InlineGrid>
    </Box>
  );
}

StatisticsCards.propTypes = {
  totalProducts: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  scheduledSales: PropTypes.number,
  runningSales: PropTypes.number,
  completedSales: PropTypes.number,
};
