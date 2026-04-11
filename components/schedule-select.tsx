"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Select, {
  type ClassNamesConfig,
  type GroupBase,
  type SingleValue
} from "react-select";

import { cn } from "@/lib/utils";

export type ScheduleSelectOption = { value: string; label: string };

type ScheduleSelectProps = {
  options: ScheduleSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isClearable?: boolean;
  "aria-label"?: string;
  className?: string;
};

const selectClassNames: ClassNamesConfig<
  ScheduleSelectOption,
  false,
  GroupBase<ScheduleSelectOption>
> = {
  container: () => "w-full min-w-0",
  control: (props) =>
    cn(
      "flex min-h-10 w-full cursor-default rounded-lg border bg-white text-sm text-slate-700 shadow-sm transition-all duration-200",
      props.isFocused
        ? "border-violet-300/80 ring-2 ring-violet-100"
        : "border-slate-200/80 hover:border-slate-300",
      props.isDisabled && "cursor-not-allowed opacity-50"
    ),
  valueContainer: () => "flex min-w-0 flex-1 flex-wrap items-center gap-1 overflow-hidden py-1 pl-3 pr-1",
  indicatorsContainer: () => "flex shrink-0 items-center",
  dropdownIndicator: () => "p-1.5 text-slate-400 hover:text-slate-600 transition-colors",
  clearIndicator: () => "p-1.5 text-slate-400 hover:text-slate-600 transition-colors",
  indicatorSeparator: () => "hidden",
  menu: () =>
    "mt-1.5 overflow-hidden rounded-xl border border-slate-200/60 bg-white py-1 shadow-premium-lg",
  menuList: () => "max-h-60 overflow-y-auto p-1",
  menuPortal: () => "z-[100]",
  option: (props) =>
    cn(
      "cursor-pointer rounded-lg px-2.5 py-2 text-sm transition-colors duration-150",
      props.isSelected && "gradient-primary text-white",
      props.isFocused && !props.isSelected && "bg-slate-50 text-slate-900",
      !props.isFocused && !props.isSelected && "text-slate-700"
    ),
  placeholder: () => "text-slate-400",
  singleValue: () => "truncate text-slate-800",
  input: () => "m-0 p-0 text-slate-800 [&_input]:outline-none",
  noOptionsMessage: () => "cursor-default rounded-lg px-2.5 py-2 text-sm text-slate-500",
  loadingMessage: () => "cursor-default rounded-lg px-2.5 py-2 text-sm text-slate-500"
};

export default function ScheduleSelect({
  options,
  value,
  onChange,
  placeholder = "Selecione...",
  isClearable = true,
  "aria-label": ariaLabel,
  className
}: ScheduleSelectProps) {
  const reactId = useId();
  const instanceId = useMemo(() => `aspexy-select-${reactId.replace(/:/g, "")}`, [reactId]);

  const [menuPortalTarget, setMenuPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setMenuPortalTarget(document.body);
  }, []);

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value]
  );

  return (
    <Select<ScheduleSelectOption, false>
      unstyled
      className={cn("w-full min-w-0", className)}
      instanceId={instanceId}
      inputId={`${instanceId}-input`}
      aria-label={ariaLabel}
      options={options}
      value={selected}
      onChange={(opt: SingleValue<ScheduleSelectOption>) => onChange(opt?.value ?? "")}
      placeholder={placeholder}
      isClearable={isClearable}
      isSearchable
      classNames={selectClassNames}
      classNamePrefix="aspexy-select"
      menuPosition="fixed"
      menuPortalTarget={menuPortalTarget}
      noOptionsMessage={() => "Nenhuma opcao encontrada"}
      loadingMessage={() => "Carregando..."}
    />
  );
}
