import { IndexTable, Text } from "@shopify/polaris";
import { SaleStatusBadge, SaleProgress, ActionMenu } from "./SaleComponents";

export function SalesRow({ sale, index }) {
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(new Date(dateString));
  };

  return (
    <IndexTable.Row id={sale.id} position={index}>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          {sale.name}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <SaleStatusBadge status={sale.status} />
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" tone="subdued">{sale._count?.items || 0} items</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {formatDate(sale.startAt)}
      </IndexTable.Cell>
      <IndexTable.Cell>
        {formatDate(sale.endAt)}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <SaleProgress sale={sale} />
      </IndexTable.Cell>
      <IndexTable.Cell>
        <div style={{ textAlign: "right" }}>
          <ActionMenu sale={sale} />
        </div>
      </IndexTable.Cell>
    </IndexTable.Row>
  );
}
