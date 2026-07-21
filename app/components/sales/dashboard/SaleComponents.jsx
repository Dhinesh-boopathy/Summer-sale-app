import { Badge, ProgressBar, Text, BlockStack, Popover, ActionList, Button } from "@shopify/polaris";
import { MenuHorizontalIcon } from "@shopify/polaris-icons";
import { useState, useCallback } from "react";
import { useNavigate, useFetcher } from "react-router";

export function SaleStatusBadge({ status }) {
  let tone;
  let progress = "incomplete";
  
  switch (status) {
    case "Running":
      tone = "success";
      progress = "complete";
      break;
    case "Scheduled":
      tone = "info";
      progress = "partiallyComplete";
      break;
    case "Draft":
      tone = undefined;
      break;
    case "Completed":
      tone = "magic";
      progress = "complete";
      break;
    case "Failed":
    case "Cancelled":
      tone = "critical";
      break;
    default:
      tone = undefined;
  }

  return <Badge tone={tone} progress={progress}>{status}</Badge>;
}

export function SaleProgress({ sale }) {
  const { status, startAt, endAt } = sale;
  const now = new Date();
  
  if (status === "Draft") {
    return <Text as="span" tone="subdued">Not scheduled</Text>;
  }

  if (status === "Completed") {
    return (
      <BlockStack gap="100">
        <ProgressBar progress={100} tone="success" size="small" />
        <Text as="span" variant="bodySm" tone="subdued">Finished</Text>
      </BlockStack>
    );
  }
  
  if (status === "Scheduled" && startAt) {
    const startDate = new Date(startAt);
    const diffTime = startDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return (
      <BlockStack gap="100">
        <ProgressBar progress={0} size="small" />
        <Text as="span" variant="bodySm" tone="subdued">
          {diffDays > 0 ? `Starts in ${diffDays} day${diffDays !== 1 ? 's' : ''}` : 'Starts soon'}
        </Text>
      </BlockStack>
    );
  }

  if (status === "Running" && startAt && endAt) {
    const start = new Date(startAt).getTime();
    const end = new Date(endAt).getTime();
    const current = now.getTime();
    
    let progress = 0;
    if (current > start && current < end) {
      progress = ((current - start) / (end - start)) * 100;
    } else if (current >= end) {
      progress = 100;
    }

    return (
      <BlockStack gap="100">
        <ProgressBar progress={progress} tone="success" size="small" />
        <Text as="span" variant="bodySm" tone="subdued">{Math.round(progress)}% Complete</Text>
      </BlockStack>
    );
  }

  return <Text as="span" tone="subdued">-</Text>;
}

export function ActionMenu({ sale }) {
  const [popoverActive, setPopoverActive] = useState(false);
  const navigate = useNavigate();
  const fetcher = useFetcher();

  const togglePopoverActive = useCallback(
    () => setPopoverActive((popoverActive) => !popoverActive),
    [],
  );

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this sale?")) {
      fetcher.submit({ intent: "delete", id: sale.id }, { method: "POST", action: "/app/sales" });
    }
  };

  const activator = (
    <Button onClick={togglePopoverActive} icon={MenuHorizontalIcon} variant="plain" />
  );

  return (
    <Popover
      active={popoverActive}
      activator={activator}
      autofocusTarget="first-node"
      onClose={togglePopoverActive}
      preferredAlignment="right"
    >
      <ActionList
        actionRole="menuitem"
        items={[
          {
            content: 'Edit Details',
            onAction: () => navigate(`/app/sales/${sale.id}`),
          },
          {
            content: 'Duplicate',
            onAction: () => shopify.toast.show("Coming soon"),
          },
          {
            content: sale.status === 'Running' ? 'Pause' : 'Resume',
            onAction: () => shopify.toast.show("Coming soon"),
            disabled: sale.status !== 'Running' && sale.status !== 'Paused',
          },
          {
            content: 'Delete',
            destructive: true,
            onAction: handleDelete,
          },
        ]}
      />
    </Popover>
  );
}
