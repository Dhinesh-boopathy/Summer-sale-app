import { Page, Layout } from "@shopify/polaris";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { SalesHeader } from "./SalesHeader";
import { SalesStats } from "./SalesStats";
import { ActiveCampaignHighlight } from "./ActiveCampaignHighlight";
import { SalesFilters } from "./SalesFilters";
import { SalesTable } from "./SalesTable";
import { AnalyticsPanel } from "./AnalyticsPanel";

export function SalesDashboardLayout({ sales, initialQuery }) {
  const navigate = useNavigate();
  
  // Client-side filtering state (on top of existing search query)
  const [activeStatus, setActiveStatus] = useState(null);

  const handleFilterChange = (key, value) => {
    if (key === "status") setActiveStatus(value);
  };

  const handleRefresh = () => {
    navigate(".", { replace: true });
  };

  const filteredSales = useMemo(() => {
    if (!activeStatus || activeStatus === "All") return sales;
    return sales.filter((s) => s.status === activeStatus);
  }, [sales, activeStatus]);

  // Calculate total products roughly across all sales for analytics
  const totalProducts = useMemo(() => {
    return sales.reduce((acc, sale) => acc + (sale._count?.items || 0), 0);
  }, [sales]);

  return (
    <Page fullWidth>
      <SalesHeader onRefresh={handleRefresh} />
      
      <SalesStats sales={sales} />
      <ActiveCampaignHighlight sales={sales} />

      <Layout>
        <Layout.Section>
          <SalesFilters 
            initialQuery={initialQuery} 
            onFilterChange={handleFilterChange} 
          />
          <SalesTable sales={filteredSales} />
        </Layout.Section>
        
        <Layout.Section variant="oneThird">
          <AnalyticsPanel totalProducts={totalProducts} />
        </Layout.Section>
      </Layout>
    </Page>
  );
}
