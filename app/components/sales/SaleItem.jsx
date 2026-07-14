import { useState } from "react";

export function SaleItem({ product, onUpdate, onRemove }) {
  const [salePriceStr, setSalePriceStr] = useState(product.salePrice.toString());
  const [error, setError] = useState(null);

  const handlePriceChange = (e) => {
    const val = e.target.value;
    setSalePriceStr(val);

    const numericVal = parseFloat(val);
    
    if (val.trim() === "") {
      setError("Required");
      onUpdate(product.id, product.originalPrice);
      return;
    }
    
    if (isNaN(numericVal)) {
      setError("Numeric");
      onUpdate(product.id, product.originalPrice);
      return;
    }

    if (numericVal < 0) {
      setError("No negatives");
      onUpdate(product.id, product.originalPrice);
      return;
    }

    if (numericVal > product.originalPrice) {
      setError("Cannot exceed original");
      onUpdate(product.id, product.originalPrice);
      return;
    }

    setError(null);
    onUpdate(product.id, numericVal);
  };

  const discountAmount = product.originalPrice - product.salePrice;
  const discountPercent = product.originalPrice > 0 
    ? Math.round((discountAmount / product.originalPrice) * 100) 
    : 0;

  return (
    <tr style={{ borderBottom: '1px solid #ebebeb' }}>
      <td style={{ padding: '12px 8px' }}>
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.imageAlt} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
        ) : (
          <div style={{ width: '40px', height: '40px', background: '#e1e3e5', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '10px', color: '#6d7175' }}>No img</span>
          </div>
        )}
      </td>
      <td style={{ padding: '12px 8px' }}>
        <s-text>{product.title}</s-text>
      </td>
      <td style={{ padding: '12px 8px' }}>
        <s-text>{product.sku}</s-text>
      </td>
      <td style={{ padding: '12px 8px' }}>
        <s-text>${product.originalPrice.toFixed(2)}</s-text>
      </td>
      <td style={{ padding: '12px 8px', minWidth: '130px' }}>
        <input 
          type="number"
          value={salePriceStr}
          onChange={handlePriceChange}
          style={{ 
            padding: '8px', 
            borderRadius: '4px', 
            border: `1px solid ${error ? '#d82c0d' : '#ccc'}`,
            width: '100px'
          }}
          step="0.01"
          min="0"
          max={product.originalPrice}
        />
        {error && (
          <div style={{ color: '#d82c0d', fontSize: '12px', marginTop: '4px' }}>
            {error}
          </div>
        )}
      </td>
      <td style={{ padding: '12px 8px' }}>
        <span style={{ 
          padding: '2px 8px', 
          borderRadius: '12px', 
          fontSize: '12px',
          background: discountPercent > 0 ? '#aee9d1' : '#e3e5e7',
          color: discountPercent > 0 ? '#0b5c3e' : '#202223'
        }}>
          {discountPercent}%
        </span>
      </td>
      <td style={{ padding: '12px 8px' }}>
        {/* We use a simple link-styled button or a regular button to remove */}
        <button 
          onClick={() => onRemove(product.id)}
          style={{
            background: 'none',
            border: 'none',
            color: '#d82c0d',
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          Remove
        </button>
      </td>
    </tr>
  );
}
