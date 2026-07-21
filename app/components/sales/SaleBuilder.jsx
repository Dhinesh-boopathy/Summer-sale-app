import { Card, IndexTable, useIndexResourceState, BlockStack } from "@shopify/polaris";
import { SaleItem } from "./SaleItem";
import { SaleSummary } from "./SaleSummary";
import { EmptySale } from "./EmptySale";

export function SaleBuilder({ products, onUpdateProduct, onRemoveProduct }) {
  const { selectedResources, allResourcesSelected, handleSelectionChange } = useIndexResourceState(products);

  if (products.length === 0) {
    return <EmptySale />;
  }

  return (
    <BlockStack gap="400">
      <Card padding="0">
        <IndexTable
          resourceName={{ singular: "product", plural: "products" }}
          itemCount={products.length}
          selectedItemsCount={allResourcesSelected ? "All" : selectedResources.length}
          onSelectionChange={handleSelectionChange}
          selectable={false}
          headings={[
            { title: "Image" },
            { title: "Product" },
            { title: "SKU" },
            { title: "Original Price" },
            { title: "Sale Price" },
            { title: "Discount %" },
            { title: "Action" },
          ]}
        >
          {products.map((product, index) => (
            <SaleItem 
              key={product.id} 
              index={index}
              product={product} 
              onUpdate={onUpdateProduct} 
              onRemove={onRemoveProduct} 
            />
          ))}
        </IndexTable>
      </Card>

      <SaleSummary products={products} />
    </BlockStack>
  );
}
