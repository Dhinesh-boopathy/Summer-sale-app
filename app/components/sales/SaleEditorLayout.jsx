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
  FormLayout,
  Select
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
  onPaginate,
  initialSaleType,
  initialCollections
}) {
  const shopify = useAppBridge();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSaving = navigation.state === "submitting" && navigation.formData?.get("intent") === "save";

  const [saleName, setSaleName] = useState(initialSaleName || "");
  const [startAt, setStartAt] = useState(initialStartAt || "");
  const [endAt, setEndAt] = useState(initialEndAt || "");
  const [saleType, setSaleType] = useState(initialSaleType || "PRODUCT");
  
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

  const [selectedCollections, setSelectedCollections] = useState(initialCollections || []);

  const [queryValue, setQueryValue] = useState(searchQuery || "");

  useEffect(() => { setQueryValue(searchQuery || ""); }, [searchQuery]);

  const handleSearchClick = () => onSearch(queryValue, saleType);
  const handleKeyDown = (e) => { if (e.key === "Enter") handleSearchClick(); };

  const handleSaleTypeChange = (newType) => {
    setSaleType(newType);
    setQueryValue("");
    onSearch("", newType);
  };

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

  const handleAddCollection = (collection) => {
    if (!isEditable) return;

    const exists = selectedCollections.find(c => c.collectionId === collection.id);
    if (exists) {
      shopify.toast.show("Collection is already in the sale", { isError: true });
      return;
    }

    const newItem = {
      id: collection.id,
      collectionId: collection.id,
      collectionTitle: collection.title,
      salePrice: 0,
      imageUrl: collection.image?.url
    };

    setSelectedCollections(prev => [...prev, newItem]);
    shopify.toast.show(`Added collection to sale`);
  };

  const handleUpdateSalePrice = (id, newPrice) => {
    if (!isEditable) return;
    if (saleType === "PRODUCT") {
      setSelectedProducts(prev => prev.map(p => p.id === id ? { ...p, salePrice: newPrice } : p));
    } else {
      setSelectedCollections(prev => prev.map(c => c.id === id ? { ...c, salePrice: newPrice } : c));
    }
  };

  const handleRemoveItem = (id) => {
    if (!isEditable) return;
    if (saleType === "PRODUCT") {
      setSelectedProducts(prev => prev.filter(p => p.id !== id));
    } else {
      setSelectedCollections(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleSaveSale = () => {
    if (!saleName.trim()) {
      shopify.toast.show("Sale name is required", { isError: true });
      return;
    }
    
    if (saleType === "PRODUCT" && selectedProducts.length === 0) {
      shopify.toast.show("At least one product is required", { isError: true });
      return;
    }

    if (saleType === "COLLECTION" && selectedCollections.length === 0) {
      shopify.toast.show("At least one collection is required", { isError: true });
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
    formData.append("saleType", saleType);
    if (startAt) formData.append("startAt", new Date(startAt).toISOString());
    if (endAt) formData.append("endAt", new Date(endAt).toISOString());
    
    if (saleType === "PRODUCT") {
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
    } else {
      const collectionsData = selectedCollections.map(c => ({
        collectionId: c.collectionId,
        collectionTitle: c.collectionTitle,
        salePrice: Number(c.salePrice) || 0
      }));
      formData.append("collections", JSON.stringify(collectionsData));
    }
    
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
          <div style={{ paddingBottom: '64px' }}>
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

                  {(!initialSaleName) && (
                    <Select
                      label="Sale Type"
                      options={[
                        {label: 'Product Sale', value: 'PRODUCT'},
                        {label: 'Collection Sale', value: 'COLLECTION'}
                      ]}
                      value={saleType}
                      onChange={handleSaleTypeChange}
                      disabled={!isEditable}
                    />
                  )}
                  {initialSaleName && (
                    <Text as="p">
                      <strong>Sale Type:</strong> {saleType === "PRODUCT" ? "Product Sale" : "Collection Sale"}
                    </Text>
                  )}
                  
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
              <Text variant="headingMd" as="h2">{saleType === "PRODUCT" ? "Sale Builder" : "Selected Collections"}</Text>
              
              {saleType === "PRODUCT" ? (
                <SaleBuilder 
                  products={selectedProducts} 
                  onUpdateProduct={handleUpdateSalePrice} 
                  onRemoveProduct={handleRemoveItem} 
                />
              ) : (
                <Card padding="0">
                  <IndexTable
                    resourceName={{ singular: 'collection', plural: 'collections' }}
                    itemCount={selectedCollections.length}
                    selectable={false}
                    headings={[
                      { title: 'Collection' },
                      { title: 'Sale Price ($)' },
                      { title: 'Action' }
                    ]}
                  >
                    {selectedCollections.map((col, index) => (
                      <IndexTable.Row id={col.id} key={col.id} position={index}>
                        <IndexTable.Cell>
                          <InlineStack gap="300" blockAlign="center">
                            <Thumbnail
                              source={col.imageUrl || ""}
                              alt={col.collectionTitle}
                              size="small"
                            />
                            <Text variant="bodyMd" fontWeight="bold" as="span">{col.collectionTitle}</Text>
                          </InlineStack>
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          <TextField
                            type="number"
                            value={col.salePrice.toString()}
                            onChange={(val) => handleUpdateSalePrice(col.id, val)}
                            disabled={!isEditable}
                            autoComplete="off"
                            prefix="$"
                          />
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          <Button tone="critical" onClick={() => handleRemoveItem(col.id)} disabled={!isEditable} size="micro">
                            Remove
                          </Button>
                        </IndexTable.Cell>
                      </IndexTable.Row>
                    ))}
                  </IndexTable>
                </Card>
              )}
            </BlockStack>

            {isEditable && (
              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">Search {saleType === "PRODUCT" ? "Products" : "Collections"} to Add</Text>
                <Card padding="0">
                  <div style={{ padding: '16px' }}>
                    <form onSubmit={(e) => { e.preventDefault(); handleSearchClick(); }}>
                      <InlineStack gap="300" blockAlign="center" wrap={false}>
                        <div style={{ flex: 1 }}>
                          <TextField 
                            value={queryValue}
                            onChange={setQueryValue}
                            placeholder={`Search ${saleType === "PRODUCT" ? "products by title or SKU" : "collections by title"}`}
                            autoComplete="off"
                            disabled={isSearching}
                            prefix={<SearchIcon />}
                          />
                        </div>
                        <Button submit disabled={isSearching} variant="secondary">
                          {isSearching ? "Searching..." : "Search"}
                        </Button>
                      </InlineStack>
                    </form>
                  </div>
                  
                  <IndexTable
                    resourceName={{ singular: saleType === "PRODUCT" ? 'product' : 'collection', plural: saleType === "PRODUCT" ? 'products' : 'collections' }}
                    itemCount={nodes.length}
                    selectable={false}
                    headings={saleType === "PRODUCT" ? [
                      { title: 'Image' },
                      { title: 'Product' },
                      { title: 'Status' },
                      { title: 'SKU' },
                      { title: 'Compare at Price' },
                      { title: 'Current Price' },
                      { title: 'Action' }
                    ] : [
                      { title: 'Image' },
                      { title: 'Collection' },
                      { title: 'Action' }
                    ]}
                  >
                    {isSearching && nodes.length === 0 ? (
                      <IndexTable.Row>
                        <IndexTable.Cell colSpan={saleType === "PRODUCT" ? 7 : 3}>
                          <div style={{ padding: '32px', textAlign: 'center' }}>
                            <Text>Loading...</Text>
                          </div>
                        </IndexTable.Cell>
                      </IndexTable.Row>
                    ) : !searchError && nodes.length === 0 ? (
                      <IndexTable.Row>
                        <IndexTable.Cell colSpan={saleType === "PRODUCT" ? 7 : 3}>
                          <div style={{ padding: '32px', textAlign: 'center' }}>
                            <Text tone="subdued">No {saleType === "PRODUCT" ? "products" : "collections"} found.</Text>
                          </div>
                        </IndexTable.Cell>
                      </IndexTable.Row>
                    ) : (
                      nodes.map((item, index) => {
                        if (saleType === "PRODUCT") {
                          const variant = item.variants?.nodes?.[0];
                          const imageUrl = item.featuredImage?.url;
                          
                          return (
                            <IndexTable.Row id={item.id} key={item.id} position={index}>
                              <IndexTable.Cell>
                                <Thumbnail
                                  source={imageUrl || ""}
                                  alt={item.title}
                                  size="small"
                                />
                              </IndexTable.Cell>
                              <IndexTable.Cell>
                                <Text variant="bodyMd" fontWeight="bold" as="span">{item.title}</Text>
                              </IndexTable.Cell>
                              <IndexTable.Cell>
                                <Badge tone={item.status === 'ACTIVE' ? "success" : undefined}>
                                  {item.status || '-'}
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
                                <Button onClick={() => handleAddProduct(item)} disabled={isSearching} size="micro">
                                  Add to Sale
                                </Button>
                              </IndexTable.Cell>
                            </IndexTable.Row>
                          );
                        } else {
                          const imageUrl = item.image?.url;
                          return (
                            <IndexTable.Row id={item.id} key={item.id} position={index}>
                              <IndexTable.Cell>
                                <Thumbnail
                                  source={imageUrl || ""}
                                  alt={item.title}
                                  size="small"
                                />
                              </IndexTable.Cell>
                              <IndexTable.Cell>
                                <Text variant="bodyMd" fontWeight="bold" as="span">{item.title}</Text>
                              </IndexTable.Cell>
                              <IndexTable.Cell>
                                <Button onClick={() => handleAddCollection(item)} disabled={isSearching} size="micro">
                                  Add to Sale
                                </Button>
                              </IndexTable.Cell>
                            </IndexTable.Row>
                          );
                        }
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
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
