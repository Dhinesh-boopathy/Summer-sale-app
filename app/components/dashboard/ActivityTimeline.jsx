/* eslint-disable react/prop-types */
import PropTypes from "prop-types";
import { Box, Card, Text, BlockStack, InlineStack, Icon } from "@shopify/polaris";
import { 
  PlayIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  PlusIcon 
} from "@shopify/polaris-icons";

export function ActivityTimeline({ sales }) {
  // Generate a mock timeline based on sales data since there isn't a dedicated events table
  const generateActivities = () => {
    if (!sales || sales.length === 0) return [];
    
    let activities = [];
    sales.slice(0, 3).forEach((sale) => {
      activities.push({
        id: `created-${sale.id}`,
        title: `Sale "${sale.name}" created`,
        time: sale.createdAt,
        icon: PlusIcon,
        tone: "base"
      });

      if (sale.status === "Running" && sale.startAt) {
        activities.push({
          id: `started-${sale.id}`,
          title: `Sale "${sale.name}" started running`,
          time: sale.startAt,
          icon: PlayIcon,
          tone: "info"
        });
      }

      if (sale.status === "Completed" && sale.endAt) {
        activities.push({
          id: `completed-${sale.id}`,
          title: `Sale "${sale.name}" completed, prices restored`,
          time: sale.endAt,
          icon: CheckCircleIcon,
          tone: "success"
        });
      }
    });

    return activities
      .filter(a => a.time)
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 5);
  };

  const activities = generateActivities();

  const formatDate = (dateString) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).format(new Date(dateString));
  };

  return (
    <Box paddingBlockEnd="400">
      <BlockStack gap="400">
        <Text variant="headingLg" as="h2">
          Recent Activity
        </Text>
        <Card>
          {activities.length === 0 ? (
            <Box padding="400">
              <Text tone="subdued" alignment="center">No recent activity found.</Text>
            </Box>
          ) : (
            <BlockStack gap="400">
              {activities.map((activity) => (
                <InlineStack key={activity.id} gap="300" wrap={false} blockAlign="start">
                  <Box>
                    <Icon source={activity.icon} tone={activity.tone} />
                  </Box>
                  <BlockStack gap="100">
                    <Text variant="bodyMd" fontWeight="medium">
                      {activity.title}
                    </Text>
                    <InlineStack gap="100" blockAlign="center">
                      <Icon source={ClockIcon} tone="subdued" />
                      <Text variant="bodySm" tone="subdued">
                        {formatDate(activity.time)}
                      </Text>
                    </InlineStack>
                  </BlockStack>
                </InlineStack>
              ))}
            </BlockStack>
          )}
        </Card>
      </BlockStack>
    </Box>
  );
}

ActivityTimeline.propTypes = {
  sales: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    status: PropTypes.string,
    createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    startAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    endAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)])
  })),
};
