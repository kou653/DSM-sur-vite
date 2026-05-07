import { ChevronDown } from "lucide-react";

function TableFilterDropdown({
  filterKey,
  label,
  selectedValue,
  values,
  openDropdown,
  setOpenDropdown,
  onChange,
  renderValue,
  minWidth = 200,
}) {
  const isOpen = openDropdown === filterKey;

  return (
    <th style={{ position: "relative" }}>
      <div className="table-filter-trigger">
        <span>{label}</span>
        <button
          type="button"
          className="table-filter-button"
          onClick={(event) => {
            event.stopPropagation();
            setOpenDropdown((current) => (current === filterKey ? null : filterKey));
          }}
        >
          <ChevronDown size={13} strokeWidth={2} />
          {selectedValue ? <span className="table-filter-dot" /> : null}
        </button>
      </div>

      {isOpen ? (
        <div className="table-filter-menu" style={{ minWidth }}>
          <button
            type="button"
            className="table-filter-option table-filter-option-reset"
            onClick={() => {
              onChange("");
              setOpenDropdown(null);
            }}
          >
            Tous
          </button>

          {values.map((value) => (
            <button
              key={value}
              type="button"
              className="table-filter-option"
              data-active={selectedValue === value}
              onClick={() => {
                onChange(value);
                setOpenDropdown(null);
              }}
            >
              {renderValue ? renderValue(value) : value}
            </button>
          ))}
        </div>
      ) : null}
    </th>
  );
}

export default TableFilterDropdown;
