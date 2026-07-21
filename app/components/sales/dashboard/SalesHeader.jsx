import { Page, Button, InlineStack, BlockStack, Text } from "@shopify/polaris";
import { PlusIcon, RefreshIcon } from "@shopify/polaris-icons";
import { useNavigate } from "react-router";

export function SalesHeader({ onRefresh }) {
  const navigate = useNavigate();

  return (
    <div style={{ marginBottom: "24px" }}>
      <InlineStack align="space-between" blockAlign="center">
        <BlockStack gap="100">
          <Text variant="heading2xl" as="h1">
            Sales Manager
          </Text>
          <Text tone="subdued" as="p">
            Create, monitor and manage every sale campaign from one place.
          </Text>
        </BlockStack>
        <InlineStack gap="300">
          <Button icon={RefreshIcon} onClick={onRefresh}>
            Refresh
          </Button>
          <Button variant="primary" icon={PlusIcon} onClick={() => navigate("/app/sales/new")}>
            Create Sale
          </Button>
        </InlineStack>
      </InlineStack>
    </div>
  );
}
