import { Filters, ChoiceList } from "@shopify/polaris";
import { useState, useCallback } from "react";
import { useSubmit } from "react-router";

export function SalesFilters({ initialQuery, onFilterChange }) {
  const submit = useSubmit();
  const [queryValue, setQueryValue] = useState(initialQuery || "");
  const [statusFilter, setStatusFilter] = useState(null);

  const handleQueryValueChange = useCallback(
    (value) => {
      setQueryValue(value);
      submit({ q: value });
    },
    [submit]
  );

  const handleQueryValueRemove = useCallback(() => {
    setQueryValue("");
    submit({ q: "" });
  }, [submit]);

  const handleStatusFilterChange = useCallback(
    (value) => {
      setStatusFilter(value);
      onFilterChange("status", value[0]);
    },
    [onFilterChange]
  );

  const handleStatusFilterRemove = useCallback(() => {
    setStatusFilter(null);
    onFilterChange("status", null);
  }, [onFilterChange]);

  const handleClearAll = useCallback(() => {
    handleQueryValueRemove();
    handleStatusFilterRemove();
  }, [handleQueryValueRemove, handleStatusFilterRemove]);

  const filters = [
    {
      key: "status",
      label: "Status",
      filter: (
        <ChoiceList
          title="Status"
          titleHidden
          choices={[
            { label: "All", value: "All" },
            { label: "Draft", value: "Draft" },
            { label: "Scheduled", value: "Scheduled" },
            { label: "Running", value: "Running" },
            { label: "Completed", value: "Completed" },
          ]}
          selected={statusFilter || []}
          onChange={handleStatusFilterChange}
        />
      ),
      shortcut: true,
    },
  ];

  const appliedFilters = [];
  if (statusFilter && statusFilter.length > 0 && statusFilter[0] !== "All") {
    appliedFilters.push({
      key: "status",
      label: `Status is ${statusFilter[0]}`,
      onRemove: handleStatusFilterRemove,
    });
  }

  return (
    <div style={{ marginBottom: "16px" }}>
      <Filters
        queryValue={queryValue}
        filters={filters}
        appliedFilters={appliedFilters}
        onQueryChange={handleQueryValueChange}
        onQueryClear={handleQueryValueRemove}
        onClearAll={handleClearAll}
      >
        <div style={{ paddingLeft: "8px" }}>
          {/* We can add Sort or Date Range here in the future as per SaaS requirements */}
        </div>
      </Filters>
    </div>
  );
}
