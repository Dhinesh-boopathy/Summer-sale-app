/* eslint-disable react/prop-types */
import PropTypes from "prop-types";
import { Box, Card, BlockStack, Text, Button, Icon, InlineGrid } from "@shopify/polaris";
import { PlusIcon, ProductIcon, ListBulletedIcon, RefreshIcon } from "@shopify/polaris-icons";
import { useNavigate } from "react-router";

export function QuickActions({ onRefresh, isRefreshing }) {
  const navigate = useNavigate();

  return (
    <Box paddingBlockEnd="400">
      <BlockStack gap="400">
        <Text variant="headingLg" as="h2">
          Quick Actions
        </Text>
        <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
          <Card>
            <BlockStack gap="400" align="space-between">
              <BlockStack gap="200">
                <Icon source={PlusIcon} tone="interactive" />
                <Text variant="headingMd" as="h3">
                  Create Sale
                </Text>
                <Text variant="bodyMd" tone="subdued">
                  Start a new discount campaign.
                </Text>
              </BlockStack>
              <Button onClick={() => navigate("/app/sales")} variant="primary" fullWidth>
                New Sale
              </Button>
            </BlockStack>
          </Card>
          
          <Card>
            <BlockStack gap="400" align="space-between">
              <BlockStack gap="200">
                <Icon source={ProductIcon} tone="interactive" />
                <Text variant="headingMd" as="h3">
                  View Products
                </Text>
                <Text variant="bodyMd" tone="subdued">
                  Browse and manage your inventory.
                </Text>
              </BlockStack>
              <Button onClick={() => navigate("/app/products")} fullWidth>
                Products
              </Button>
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="400" align="space-between">
              <BlockStack gap="200">
                <Icon source={ListBulletedIcon} tone="interactive" />
                <Text variant="headingMd" as="h3">
                  Manage Sales
                </Text>
                <Text variant="bodyMd" tone="subdued">
                  View and edit existing sales.
                </Text>
              </BlockStack>
              <Button onClick={() => navigate("/app/sales")} fullWidth>
                View Sales
              </Button>
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="400" align="space-between">
              <BlockStack gap="200">
                <Icon source={RefreshIcon} tone="interactive" />
                <Text variant="headingMd" as="h3">
                  Refresh Data
                </Text>
                <Text variant="bodyMd" tone="subdued">
                  Sync latest data from Shopify.
                </Text>
              </BlockStack>
              <Button onClick={onRefresh} loading={isRefreshing} fullWidth>
                Sync Data
              </Button>
            </BlockStack>
          </Card>
        </InlineGrid>
      </BlockStack>
    </Box>
  );
}

QuickActions.propTypes = {
  onRefresh: PropTypes.func.isRequired,
  isRefreshing: PropTypes.bool.isRequired,
};
