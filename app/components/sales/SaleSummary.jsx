export function SaleSummary({ products }) {
  const productsSelected = products.length;
  
  const originalTotal = products.reduce((sum, p) => sum + p.originalPrice, 0);
  const saleTotal = products.reduce((sum, p) => sum + p.salePrice, 0);
  const totalDiscountAmount = originalTotal - saleTotal;
  
  const averageDiscountPercent = originalTotal > 0 
    ? Math.round((totalDiscountAmount / originalTotal) * 100) 
    : 0;

  return (
    <s-box padding="base" background="subdued" borderRadius="base" borderWidth="base">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <s-text tone="subdued">Products Selected</s-text>
          <s-text variant="headingLg">{productsSelected}</s-text>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <s-text tone="subdued">Original Total</s-text>
          <s-text variant="headingLg">${originalTotal.toFixed(2)}</s-text>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <s-text tone="subdued">Sale Total</s-text>
          <s-text variant="headingLg">${saleTotal.toFixed(2)}</s-text>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <s-text tone="subdued">Total Discount</s-text>
          <s-text variant="headingLg" color="success">${totalDiscountAmount.toFixed(2)}</s-text>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <s-text tone="subdued">Average Discount</s-text>
          <s-text variant="headingLg" color="success">{averageDiscountPercent}%</s-text>
        </div>
      </div>
    </s-box>
  );
}
