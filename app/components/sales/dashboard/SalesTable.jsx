import { Card, IndexTable, useIndexResourceState } from "@shopify/polaris";
import { SalesRow } from "./SalesRow";
import { EmptySalesState } from "./EmptySalesState";

export function SalesTable({ sales }) {
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(sales);

  if (!sales || sales.length === 0) {
    return <EmptySalesState />;
  }

  return (
    <Card padding="0">
      <IndexTable
        resourceName={{ singular: "sale", plural: "sales" }}
        itemCount={sales.length}
        selectedItemsCount={
          allResourcesSelected ? "All" : selectedResources.length
        }
        onSelectionChange={handleSelectionChange}
        selectable={false}
        headings={[
          { title: "Sale Name" },
          { title: "Status" },
          { title: "Products" },
          { title: "Start Date" },
          { title: "End Date" },
          { title: "Progress" },
          { title: "", hidden: true },
        ]}
      >
        {sales.map((sale, index) => (
          <SalesRow key={sale.id} sale={sale} index={index} />
        ))}
      </IndexTable>
    </Card>
  );
}
