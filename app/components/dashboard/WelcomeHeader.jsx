import PropTypes from "prop-types";
import { Text, InlineStack, BlockStack, Box } from "@shopify/polaris";

export function WelcomeHeader({ shopName }) {
  const currentDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <Box paddingBlockEnd="400">
      <BlockStack gap="200">
        <InlineStack align="space-between" blockAlign="center">
          <Text variant="heading3xl" as="h1">
            Welcome back, {shopName ? shopName.split('.')[0] : "Admin"} 👋
          </Text>
          <Text variant="bodyMd" tone="subdued">
            {currentDate}
          </Text>
        </InlineStack>
        <Text variant="bodyLg" tone="subdued">
          Manage your scheduled sales and optimize your store&apos;s performance from one place.
        </Text>
      </BlockStack>
    </Box>
  );
}

WelcomeHeader.propTypes = {
  shopName: PropTypes.string,
};
