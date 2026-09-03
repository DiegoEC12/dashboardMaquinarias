import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Option = { value: string; label: string };

type Props = {
  label: string;
  values: string[] | null;
  options: Option[];
  allLabel?: string;
  singleOrAll?: boolean;
  onChange: (values: string[] | null) => void;
};

export function MultiFilterSelect({
  label,
  values,
  options,
  allLabel = "Todas",
  singleOrAll = false,
  onChange,
}: Props) {
  const allSelected = singleOrAll
    ? values === null
    : values === null ||
      (options.length > 0 && values.length > 0 && options.every((option) => values.includes(option.value)));
  const selectedLabel = allSelected
    ? allLabel
    : values.length === 0
      ? "Ninguna"
    : values.length === 1
      ? (options.find((option) => option.value === values[0])?.label ?? values[0])
      : `${values.length} seleccionadas`;

  const toggleAll = (checked: boolean) => {
    if (singleOrAll) {
      onChange(checked ? null : []);
      return;
    }
    onChange(checked ? null : []);
  };

  const toggleOption = (value: string, checked: boolean) => {
    if (singleOrAll) {
      onChange(checked ? [value] : []);
      return;
    }

    const current = allSelected ? options.map((option) => option.value) : (values ?? []);
    const next = checked
      ? [...current.filter((item) => item !== value), value]
      : current.filter((item) => item !== value);
    onChange(next.length === options.length ? null : next);
  };

  const lockedBySingleMode =
    singleOrAll && values !== null && values.length === 1 ? values[0] : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-10 min-w-0 justify-between rounded-full border-border bg-card px-4 text-sm font-medium shadow-none"
          aria-label={label}
        >
          <span className="mr-2 min-w-0 truncate">
            <span className="mr-1 hidden text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:inline">
              {label}
            </span>
            {selectedLabel}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold hover:bg-muted">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) => toggleAll(checked === true)}
          />
          <span>{allLabel}</span>
          {allSelected && <Check className="ml-auto h-4 w-4 text-primary" />}
        </label>
        <div className="my-1 border-t border-border" />
        <div className="max-h-64 overflow-y-auto">
          {options.map((option) => {
            const checked = singleOrAll ? (values ?? []).includes(option.value) : allSelected || values.includes(option.value);
            const disabled = lockedBySingleMode !== null && !checked;
            return (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-60"
                data-disabled={disabled}
              >
                <Checkbox
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={(nextChecked) =>
                    toggleOption(option.value, nextChecked === true)
                  }
                />
                <span className="min-w-0 truncate">{option.label}</span>
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default MultiFilterSelect;
