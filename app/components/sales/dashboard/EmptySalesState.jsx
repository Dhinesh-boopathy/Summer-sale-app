import { EmptyState } from "@shopify/polaris";
import { useNavigate } from "react-router";

export function EmptySalesState() {
  const navigate = useNavigate();

  return (
    <EmptyState
      heading="No Sales Yet"
      action={{
        content: "Create Sale",
        onAction: () => navigate("/app/sales/new"),
      }}
      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
    >
      <p>Create your first sale campaign and start scheduling discounts.</p>
    </EmptyState>
  );
}
