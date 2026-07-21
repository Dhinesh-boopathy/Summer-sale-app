import { useState, useEffect } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useSubmit, useNavigation } from "react-router";
import { 
  Page, 
  Layout, 
  Card, 
  BlockStack, 
  InlineStack, 
  TextField, 
  Text, 
  Banner, 
  Button, 
  IndexTable, 
  Thumbnail, 
  Badge,
  FormLayout
} from "@shopify/polaris";
import { SearchIcon } from "@shopify/polaris-icons";
import { SaleBuilder } from "./SaleBuilder";

export function SaleEditorLayout({ 
  initialSaleName, 
  initialProducts, 
  initialStartAt,
  initialEndAt,
  isEditable,
  searchResults, 
  searchError, 
  isSearching, 
  searchQuery, 
  onSearch, 
  onPaginate 
}) {
  const shopify = useAppBridge();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSaving = navigation.state === "submitting" && navigation.formData?.get("intent") === "save";

  const [saleName, setSaleName] = useState(initialSaleName || "");
  const [startAt, setStartAt] = useState(initialStartAt || "");
  const [endAt, setEndAt] = useState(initialEndAt || "");
  const [selectedProducts, setSelectedProducts] = useState(() => {
    const grouped = {};
    for (const p of initialProducts || []) {
      if (!grouped[p.productId]) {
        grouped[p.productId] = {
          id: p.productId,
          productId: p.productId,
          title: p.title.includes(' - ') ? p.title.split(' - ').slice(0, -1).join(' - ') : p.title,
          sku: p.sku,
          originalPrice: p.originalPrice,
          salePrice: p.salePrice,
          imageUrl: p.imageUrl,
          imageAlt: p.imageAlt,
          variants: []
        };
      } else {
        grouped[p.productId].sku = 'Multiple SKUs';
      }
      grouped[p.productId].variants.push(p);
    }
    return Object.values(grouped);
  });
  const [queryValue, setQueryValue] = useState(searchQuery || "");

  useEffect(() => { setQueryValue(searchQuery || ""); }, [searchQuery]);

  const handleSearchClick = () => onSearch(queryValue);
  const handleKeyDown = (e) => { if (e.key === "Enter") handleSearchClick(); };

  const handleAddProduct = (product) => {
    if (!isEditable) return;
    
    const variants = product.variants?.nodes || [];
    if (variants.length === 0) return;

    const exists = selectedProducts.find(p => p.productId === product.id);
    if (exists) {
      shopify.toast.show("Product is already in the sale", { isError: true });
      return;
    }

    const price = parseFloat(variants[0].price || 0);

    const newItem = {
      id: product.id, 
      productId: product.id,
      title: product.title,
      sku: variants.length > 1 ? 'Multiple SKUs' : (variants[0].sku || '-'),
      originalPrice: price,
      salePrice: price,
      imageUrl: product.featuredImage?.url,
      imageAlt: product.featuredImage?.altText || product.title,
      variants: variants.map(v => ({
        id: v.id,
        productId: product.id,
        variantId: v.id,
        title: variants.length > 1 && v.title && v.title !== 'Default Title' 
          ? `${product.title} - ${v.title}` 
          : product.title,
        sku: v.sku || '-',
        originalPrice: parseFloat(v.price || 0),
        salePrice: price,
        imageUrl: product.featuredImage?.url
      }))
    };

    setSelectedProducts(prev => [...prev, newItem]);
    shopify.toast.show(`Added product with ${variants.length} variant(s) to sale`);
  };

  const handleUpdateSalePrice = (id, newPrice) => {
    if (!isEditable) return;
    setSelectedProducts(prev => prev.map(p => p.id === id ? { ...p, salePrice: newPrice } : p));
  };

  const handleRemoveProduct = (id) => {
    if (!isEditable) return;
    setSelectedProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleSaveSale = () => {
    if (!saleName.trim()) {
      shopify.toast.show("Sale name is required", { isError: true });
      return;
    }
    
    if (selectedProducts.length === 0) {
      shopify.toast.show("At least one product is required", { isError: true });
      return;
    }

    if ((startAt && !endAt) || (!startAt && endAt)) {
      shopify.toast.show("Both start and end dates are required if scheduling", { isError: true });
      return;
    }

    if (startAt && endAt) {
      const sDate = new Date(startAt);
      const eDate = new Date(endAt);
      if (eDate <= sDate) {
        shopify.toast.show("End date must be after start date", { isError: true });
        return;
      }
    }
    
    const formData = new FormData();
    formData.append("intent", "save");
    formData.append("saleName", saleName);
    if (startAt) formData.append("startAt", new Date(startAt).toISOString());
    if (endAt) formData.append("endAt", new Date(endAt).toISOString());
    
    const flatProducts = [];
    for (const p of selectedProducts) {
      for (const v of p.variants) {
        flatProducts.push({
          ...v,
          salePrice: p.salePrice
        });
      }
    }
    formData.append("products", JSON.stringify(flatProducts));
    
    submit(formData, { method: "POST" });
  };

  const nodes = searchResults?.nodes || [];
  const pageInfo = searchResults?.pageInfo || {};
  const saveButtonLabel = (startAt && endAt) ? "Save & Schedule" : "Save Draft";

  return (
    <Page 
      title={initialSaleName ? "Edit Sale" : "Create New Sale"}
      backAction={{ content: 'Sales', url: '/app/sales' }}
      primaryAction={
        isEditable ? {
          content: isSaving ? "Saving..." : saveButtonLabel,
          disabled: isSaving,
          onAction: handleSaveSale
        } : undefined
      }
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {!isEditable && (
              <Banner tone="warning">
                <p>This sale is currently running or completed. Editing is disabled.</p>
              </Banner>
            )}

            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Sale Details</Text>
                
                <FormLayout>
                  <TextField 
                    label="Sale Name"
                    value={saleName}
                    onChange={setSaleName}
                    placeholder="e.g. Summer Blowout 2026"
                    disabled={!isEditable}
                    autoComplete="off"
                  />
                  
                  <FormLayout.Group>
                    <TextField 
                      label="Start Date & Time (Optional)"
                      type="datetime-local"
                      value={startAt}
                      onChange={setStartAt}
                      disabled={!isEditable}
                      autoComplete="off"
                    />
                    <TextField 
                      label="End Date & Time (Optional)"
                      type="datetime-local"
                      value={endAt}
                      onChange={setEndAt}
                      disabled={!isEditable}
                      autoComplete="off"
                    />
                  </FormLayout.Group>
                </FormLayout>
                
                {(startAt || endAt) && (
                  <Text tone="subdued">Note: This sale will automatically start and end at the selected times.</Text>
                )}
              </BlockStack>
            </Card>

            <BlockStack gap="200">
              <Text variant="headingMd" as="h2">Sale Builder</Text>
              <SaleBuilder 
                products={selectedProducts} 
                onUpdateProduct={handleUpdateSalePrice} 
                onRemoveProduct={handleRemoveProduct} 
              />
            </BlockStack>

            {isEditable && (
              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">Search Products to Add</Text>
                <Card padding="0">
                  <div style={{ padding: '16px' }}>
                    <InlineStack gap="300" blockAlign="center" wrap={false}>
                      <div style={{ flex: 1 }}>
                        <TextField 
                          value={queryValue}
                          onChange={setQueryValue}
                          placeholder="Search products by title or SKU"
                          autoComplete="off"
                          disabled={isSearching}
                          prefix={<SearchIcon />}
                          onFocus={() => {}} // A small hack to allow onKeyDown if needed, but handled mostly by onChange or dedicated button
                        />
                      </div>
                      <Button onClick={handleSearchClick} disabled={isSearching} variant="secondary">
                        {isSearching ? "Searching..." : "Search"}
                      </Button>
                    </InlineStack>
                  </div>
                  
                  <IndexTable
                    resourceName={{ singular: 'product', plural: 'products' }}
                    itemCount={nodes.length}
                    selectable={false}
                    headings={[
                      { title: 'Image' },
                      { title: 'Product' },
                      { title: 'Status' },
                      { title: 'SKU' },
                      { title: 'Compare at Price' },
                      { title: 'Current Price' },
                      { title: 'Action' }
                    ]}
                  >
                    {isSearching && nodes.length === 0 ? (
                      <IndexTable.Row>
                        <IndexTable.Cell colSpan={7}>
                          <div style={{ padding: '32px', textAlign: 'center' }}>
                            <Text>Loading...</Text>
                          </div>
                        </IndexTable.Cell>
                      </IndexTable.Row>
                    ) : !searchError && nodes.length === 0 ? (
                      <IndexTable.Row>
                        <IndexTable.Cell colSpan={7}>
                          <div style={{ padding: '32px', textAlign: 'center' }}>
                            <Text tone="subdued">No products found.</Text>
                          </div>
                        </IndexTable.Cell>
                      </IndexTable.Row>
                    ) : (
                      nodes.map((product, index) => {
                        const variant = product.variants?.nodes?.[0];
                        const imageUrl = product.featuredImage?.url;
                        
                        return (
                          <IndexTable.Row id={product.id} key={product.id} position={index}>
                            <IndexTable.Cell>
                              <Thumbnail
                                source={imageUrl || ""}
                                alt={product.title}
                                size="small"
                              />
                            </IndexTable.Cell>
                            <IndexTable.Cell>
                              <Text variant="bodyMd" fontWeight="bold" as="span">{product.title}</Text>
                            </IndexTable.Cell>
                            <IndexTable.Cell>
                              <Badge tone={product.status === 'ACTIVE' ? "success" : undefined}>
                                {product.status || '-'}
                              </Badge>
                            </IndexTable.Cell>
                            <IndexTable.Cell>
                              <Text as="span">{variant?.sku || '-'}</Text>
                            </IndexTable.Cell>
                            <IndexTable.Cell>
                              <Text tone={variant?.compareAtPrice ? "subdued" : "base"} textDecorationLine={variant?.compareAtPrice ? "line-through" : "none"}>
                                {variant?.compareAtPrice ? `$${variant.compareAtPrice}` : '-'}
                              </Text>
                            </IndexTable.Cell>
                            <IndexTable.Cell>
                              <Text as="span">{variant?.price ? `$${variant.price}` : '-'}</Text>
                            </IndexTable.Cell>
                            <IndexTable.Cell>
                              <Button onClick={() => handleAddProduct(product)} disabled={isSearching} size="micro">
                                Add to Sale
                              </Button>
                            </IndexTable.Cell>
                          </IndexTable.Row>
                        );
                      })
                    )}
                  </IndexTable>
                  
                  {!isSearching && nodes.length > 0 && (pageInfo.hasPreviousPage || pageInfo.hasNextPage) && (
                    <div style={{ padding: '16px', display: 'flex', justifyContent: 'center' }}>
                      <InlineStack gap="300">
                        <Button disabled={!pageInfo.hasPreviousPage} onClick={() => onPaginate(pageInfo.startCursor, 'prev')}>Previous</Button>
                        <Button disabled={!pageInfo.hasNextPage} onClick={() => onPaginate(pageInfo.endCursor, 'next')}>Next</Button>
                      </InlineStack>
                    </div>
                  )}
                </Card>
              </BlockStack>
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
