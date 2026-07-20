import PropTypes from "prop-types";
import { Page, Layout, BlockStack, SkeletonPage, SkeletonBodyText, SkeletonDisplayText } from "@shopify/polaris";
import { useNavigation } from "react-router";
import { WelcomeHeader } from "./WelcomeHeader";
import { StatisticsCards } from "./StatisticsCards";
import { QuickActions } from "./QuickActions";
import { RecentSales } from "./RecentSales";
import { ActivityTimeline } from "./ActivityTimeline";

export function DashboardLayout({ sales, totalProducts, shopName }) {
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading" || navigation.state === "submitting";

  if (isLoading) {
    return (
      <SkeletonPage primaryAction>
        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              <SkeletonDisplayText size="large" />
              <SkeletonBodyText lines={2} />
              
              {/* Skeleton cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                 <SkeletonBodyText lines={4} />
                 <SkeletonBodyText lines={4} />
                 <SkeletonBodyText lines={4} />
                 <SkeletonBodyText lines={4} />
              </div>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </SkeletonPage>
    );
  }

  const scheduledSales = sales?.filter(s => s.status === "Scheduled").length || 0;
  const runningSales = sales?.filter(s => s.status === "Running").length || 0;
  const completedSales = sales?.filter(s => s.status === "Completed").length || 0;

  const handleRefresh = () => {
    // Basic refresh could just use window.location.reload() or re-fetch via useRevalidator()
    window.location.reload();
  };

  return (
    <Page fullWidth>
      <BlockStack gap="500">
        <WelcomeHeader shopName={shopName} />
        
        <StatisticsCards 
          totalProducts={totalProducts}
          scheduledSales={scheduledSales}
          runningSales={runningSales}
          completedSales={completedSales}
        />
        
        <QuickActions onRefresh={handleRefresh} isRefreshing={isLoading} />
        
        <Layout>
          <Layout.Section>
            <RecentSales sales={sales} />
          </Layout.Section>
          
          <Layout.Section variant="oneThird">
            <ActivityTimeline sales={sales} />
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

DashboardLayout.propTypes = {
  sales: PropTypes.array,
  totalProducts: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  shopName: PropTypes.string,
};
