import { useState, useCallback } from "react";
import { IndexTable, Text, TextField, Button, Thumbnail, Badge } from "@shopify/polaris";
import { DeleteIcon } from "@shopify/polaris-icons";

export function SaleItem({ product, onUpdate, onRemove, index }) {
  const [salePriceStr, setSalePriceStr] = useState(product.salePrice.toString());
  const [error, setError] = useState(null);

  const handlePriceChange = useCallback((val) => {
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
  }, [product.id, product.originalPrice, onUpdate]);

  const discountAmount = product.originalPrice - product.salePrice;
  const discountPercent = product.originalPrice > 0 
    ? Math.round((discountAmount / product.originalPrice) * 100) 
    : 0;

  return (
    <IndexTable.Row id={product.id} position={index}>
      <IndexTable.Cell>
        <Thumbnail
          source={product.imageUrl || ""}
          alt={product.imageAlt || product.title}
          size="small"
        />
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">{product.title}</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span">{product.sku}</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span">${product.originalPrice.toFixed(2)}</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <div style={{ width: '120px' }}>
          <TextField
            type="number"
            value={salePriceStr}
            onChange={handlePriceChange}
            error={error}
            autoComplete="off"
            min={0}
            max={product.originalPrice}
            step={0.01}
            prefix="$"
          />
        </div>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone={discountPercent > 0 ? "success" : undefined}>
          {discountPercent}%
        </Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Button 
          icon={DeleteIcon} 
          variant="tertiary" 
          tone="critical"
          onClick={() => onRemove(product.id)}
          accessibilityLabel="Remove product"
        />
      </IndexTable.Cell>
    </IndexTable.Row>
  );
}
