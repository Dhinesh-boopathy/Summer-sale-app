import { useState, useEffect } from "react";

export function ProductsLayout({ data, error, isLoading, initialQuery, onSearch, onPaginate }) {
  const [queryValue, setQueryValue] = useState(initialQuery || "");

  useEffect(() => {
    setQueryValue(initialQuery || "");
  }, [initialQuery]);

  const handleSearchClick = () => {
    onSearch(queryValue);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearchClick();
  };

  const nodes = data?.nodes || [];
  const pageInfo = data?.pageInfo || {};

  return (
    <s-page heading="Products">
      <s-section>
        <s-stack direction="inline" gap="base">
          <input 
            type="text" 
            placeholder="Search products by title or SKU" 
            value={queryValue}
            onChange={(e) => setQueryValue(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '250px' }} 
            disabled={isLoading}
          />
          <s-button onClick={handleSearchClick} disabled={isLoading}>
            {isLoading ? "Searching..." : "Search"}
          </s-button>
        </s-stack>
      </s-section>

      <s-section>
        {error && (
          <s-box padding="base" background="bg-surface-critical" borderRadius="base" marginBottom="base">
            <s-text color="critical">Error: {error}</s-text>
          </s-box>
        )}
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '16px' }}>
            <thead>
              <tr style={{ background: '#f4f6f8' }}>
                <th style={{ padding: '12px 8px', borderBottom: '1px solid #ccc' }}>Image</th>
                <th style={{ padding: '12px 8px', borderBottom: '1px solid #ccc' }}>Product</th>
                <th style={{ padding: '12px 8px', borderBottom: '1px solid #ccc' }}>SKU</th>
                <th style={{ padding: '12px 8px', borderBottom: '1px solid #ccc' }}>Current Price</th>
                <th style={{ padding: '12px 8px', borderBottom: '1px solid #ccc' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && nodes.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '32px', textAlign: 'center' }}>
                    <s-text>Loading products...</s-text>
                  </td>
                </tr>
              ) : !error && nodes.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '32px', textAlign: 'center' }}>
                    <s-text>No products found.</s-text>
                  </td>
                </tr>
              ) : (
                nodes.map((product) => {
                  const variant = product.variants?.nodes?.[0];
                  const imageUrl = product.featuredImage?.url;
                  
                  return (
                    <tr key={product.id} style={{ borderBottom: '1px solid #ebebeb' }}>
                      <td style={{ padding: '12px 8px' }}>
                        {imageUrl ? (
                          <img src={imageUrl} alt={product.title} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                        ) : (
                          <div style={{ width: '40px', height: '40px', background: '#e1e3e5', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '10px', color: '#6d7175' }}>No img</span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 8px' }}><s-text>{product.title}</s-text></td>
                      <td style={{ padding: '12px 8px' }}><s-text>{variant?.sku || '-'}</s-text></td>
                      <td style={{ padding: '12px 8px' }}><s-text>{variant?.price ? `$${variant.price}` : '-'}</s-text></td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '12px', background: product.status === 'ACTIVE' ? '#aee9d1' : '#e3e5e7', color: product.status === 'ACTIVE' ? '#0b5c3e' : '#202223' }}>
                          {product.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {!isLoading && nodes.length > 0 && (pageInfo.hasPreviousPage || pageInfo.hasNextPage) && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
            <s-stack direction="inline" gap="base">
              <s-button disabled={!pageInfo.hasPreviousPage || isLoading} onClick={() => onPaginate(pageInfo.startCursor, 'prev')}>Previous</s-button>
              <s-button disabled={!pageInfo.hasNextPage || isLoading} onClick={() => onPaginate(pageInfo.endCursor, 'next')}>Next</s-button>
            </s-stack>
          </div>
        )}
      </s-section>
    </s-page>
  );
}
