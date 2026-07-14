import { SaleItem } from "./SaleItem";
import { SaleSummary } from "./SaleSummary";
import { EmptySale } from "./EmptySale";

export function SaleBuilder({ products, onUpdateProduct, onRemoveProduct }) {
  if (products.length === 0) {
    return <EmptySale />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ overflowX: 'auto', border: '1px solid #ebebeb', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f4f6f8' }}>
              <th style={{ padding: '12px 8px', borderBottom: '1px solid #ccc' }}>Image</th>
              <th style={{ padding: '12px 8px', borderBottom: '1px solid #ccc' }}>Product</th>
              <th style={{ padding: '12px 8px', borderBottom: '1px solid #ccc' }}>SKU</th>
              <th style={{ padding: '12px 8px', borderBottom: '1px solid #ccc' }}>Original Price</th>
              <th style={{ padding: '12px 8px', borderBottom: '1px solid #ccc' }}>Sale Price</th>
              <th style={{ padding: '12px 8px', borderBottom: '1px solid #ccc' }}>Discount %</th>
              <th style={{ padding: '12px 8px', borderBottom: '1px solid #ccc' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <SaleItem 
                key={product.id} 
                product={product} 
                onUpdate={onUpdateProduct} 
                onRemove={onRemoveProduct} 
              />
            ))}
          </tbody>
        </table>
      </div>

      <SaleSummary products={products} />
    </div>
  );
}
