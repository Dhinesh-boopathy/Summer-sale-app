import { useNavigate } from "react-router";

export function DashboardLayout() {
  const navigate = useNavigate();

  return (
    <s-page heading="Summer Sale Manager">
      <s-button slot="primary-action" onClick={() => navigate('/app/sales')}>
        Create New Sale
      </s-button>
      
      <s-stack direction="block" gap="base">
        <s-section heading="Products">
          <s-paragraph>Manage your products</s-paragraph>
          <s-button onClick={() => navigate('/app/products')}>View Products</s-button>
        </s-section>
        
        <s-section heading="Sales">
          <s-paragraph>Manage your sales</s-paragraph>
          <s-button onClick={() => navigate('/app/sales')}>View Sales</s-button>
        </s-section>
        
        <s-section heading="Scheduled Jobs">
          <s-paragraph>Manage scheduled jobs</s-paragraph>
          <s-button onClick={() => navigate('/app/settings')}>View Jobs</s-button>
        </s-section>
        
        <s-section heading="Settings">
          <s-paragraph>Configure your app</s-paragraph>
          <s-button onClick={() => navigate('/app/settings')}>View Settings</s-button>
        </s-section>
      </s-stack>

      <s-section heading="Recent Activity">
        <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
          <s-text>No recent activity.</s-text>
        </s-box>
      </s-section>
    </s-page>
  );
}
