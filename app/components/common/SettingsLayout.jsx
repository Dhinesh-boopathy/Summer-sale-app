export function SettingsLayout({ store }) {
  return (
    <s-page heading="Settings">
      <s-stack direction="block" gap="base">
        <s-section heading="Shop Information">
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-stack direction="block" gap="small">
              <s-text>{store.name}</s-text>
              <s-text>Store time zone: {store.ianaTimezone || "Not available"}</s-text>
              <s-text>Store currency: {store.currencyCode || "Not available"}</s-text>
            </s-stack>
          </s-box>
        </s-section>
        
        <s-section heading="How scheduled sales work">
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-stack direction="block" gap="small">
              <s-text>Scheduled times use the store time zone shown above. Daylight-saving gaps are rejected. If a clock time repeats when daylight saving ends, the first occurrence is used for new schedules.</s-text>
              <s-text>At the start, the app updates the selected Shopify variant prices and compare-at prices.</s-text>
              <s-text>At the end, it restores the saved prices when the variants still match the sale values. If a price was changed during the sale, the app leaves it untouched and marks the sale for review.</s-text>
              <s-text>Sale scheduling runs in the background. A start or end may take up to about one minute to begin, plus processing time for large collections.</s-text>
            </s-stack>
          </s-box>
        </s-section>
      </s-stack>
    </s-page>
  );
}
