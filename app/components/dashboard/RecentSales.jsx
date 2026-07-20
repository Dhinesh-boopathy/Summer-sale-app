/* eslint-disable react/prop-types */
import PropTypes from "prop-types";
import { Box, Card, Text, BlockStack, Badge, IndexTable, EmptyState } from "@shopify/polaris";
import { useNavigate } from "react-router";

export function RecentSales({ sales }) {
  const navigate = useNavigate();

  const getStatusBadge = (status) => {
    switch (status) {
      case "Scheduled":
        return <Badge tone="info">Scheduled</Badge>;
      case "Running":
        return <Badge tone="warning">Running</Badge>;
      case "Completed":
        return <Badge tone="success">Completed</Badge>;
      default:
        return <Badge>{status || "Draft"}</Badge>;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).format(new Date(dateString));
  };

  const emptyStateMarkup = (
    <EmptyState
      heading="Create your first sale"
      action={{
        content: "Create Sale",
        onAction: () => navigate("/app/sales"),
      }}
      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
    >
      <p>You don&apos;t have any sales yet. Create one to start offering discounts to your customers.</p>
    </EmptyState>
  );

  const rowMarkup = sales?.slice(0, 5).map(
    ({ id, name, status, startAt, endAt, _count }, index) => (
      <IndexTable.Row
        id={id}
        key={id}
        position={index}
        onClick={() => navigate(`/app/sales/${id}`)}
      >
        <IndexTable.Cell>
          <Text variant="bodyMd" fontWeight="bold" as="span">
            {name}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>{getStatusBadge(status)}</IndexTable.Cell>
        <IndexTable.Cell>{formatDate(startAt)}</IndexTable.Cell>
        <IndexTable.Cell>{formatDate(endAt)}</IndexTable.Cell>
        <IndexTable.Cell>{_count?.items || 0} items</IndexTable.Cell>
      </IndexTable.Row>
    )
  );

  return (
    <Box paddingBlockEnd="400">
      <BlockStack gap="400">
        <Text variant="headingLg" as="h2">
          Recent Sales
        </Text>
        <Card padding="0">
          {!sales || sales.length === 0 ? (
            emptyStateMarkup
          ) : (
            <IndexTable
              resourceName={{ singular: "sale", plural: "sales" }}
              itemCount={sales.length}
              headings={[
                { title: "Sale Name" },
                { title: "Status" },
                { title: "Start Time" },
                { title: "End Time" },
                { title: "Products" },
              ]}
              selectable={false}
            >
              {rowMarkup}
            </IndexTable>
          )}
        </Card>
      </BlockStack>
    </Box>
  );
}

RecentSales.propTypes = {
  sales: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    status: PropTypes.string,
    startAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    endAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    _count: PropTypes.shape({
      items: PropTypes.number
    })
  })),
};
