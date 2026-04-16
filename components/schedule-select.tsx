"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Select, {
  type ClassNamesConfig,
  type GroupBase,
  type MultiValue,
  type SingleValue,
  type StylesConfig
} from "react-select";

import { cn } from "@/lib/utils";

export type ScheduleSelectOption = { value: string; label: string };

type CommonScheduleSelectProps = {
  options: ScheduleSelectOption[];
  placeholder?: string;
  isClearable?: boolean;
  "aria-label"?: string;
  className?: string;
};

export type ScheduleSelectProps =
  | (CommonScheduleSelectProps & {
      isMulti?: false;
      value: string;
      onChange: (value: string) => void;
    })
  | (CommonScheduleSelectProps & {
      isMulti: true;
      value: string[];
      onChange: (value: string[]) => void;
    });

const selectClassNames: ClassNamesConfig<
  ScheduleSelectOption,
  boolean,
  GroupBase<ScheduleSelectOption>
> = {
  container: () => "w-full min-w-0",
  control: (props) =>
    cn(
      "flex min-h-10 w-full cursor-default rounded-md border bg-white text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-colors duration-150",
      props.isFocused
        ? "border-indigo-400/95 ring-2 ring-indigo-600/18"
        : "border-slate-200 hover:border-indigo-300/85",
      props.isDisabled && "cursor-not-allowed opacity-50"
    ),
  valueContainer: () => "flex min-w-0 flex-1 flex-wrap items-center gap-1 overflow-hidden py-1 pl-3 pr-1",
  indicatorsContainer: () => "flex shrink-0 items-center",
  dropdownIndicator: () => "p-1.5 text-slate-400 hover:text-slate-600 transition-colors",
  clearIndicator: () => "p-1.5 text-slate-400 hover:text-slate-600 transition-colors",
  indicatorSeparator: () => "hidden",
  menu: () =>
    "mt-1.5 overflow-hidden rounded-lg border border-slate-200/90 bg-white py-1 shadow-premium-lg",
  menuList: () => "max-h-60 overflow-y-auto p-1",
  option: (props) =>
    cn(
      "cursor-pointer rounded-md px-2.5 py-2 text-sm transition-colors duration-150",
      props.isSelected && "bg-indigo-700 text-white",
      props.isFocused && !props.isSelected && "bg-indigo-50 text-indigo-950",
      !props.isFocused && !props.isSelected && "text-slate-700"
    ),
  placeholder: () => "text-slate-400",
  singleValue: () => "truncate text-slate-800",
  multiValue: () =>
    "inline-flex max-w-full items-center rounded-md border border-slate-200/90 bg-slate-100/95 text-xs text-slate-800",
  multiValueLabel: () => "max-w-[12rem] truncate px-2 py-0.5",
  multiValueRemove: () =>
    "rounded-r-md px-1.5 py-0.5 text-slate-400 transition-colors hover:bg-slate-200/80 hover:text-slate-700",
  input: () => "m-0 p-0 text-slate-800 [&_input]:outline-none",
  noOptionsMessage: () => "cursor-default rounded-lg px-2.5 py-2 text-sm text-slate-500",
  loadingMessage: () => "cursor-default rounded-lg px-2.5 py-2 text-sm text-slate-500"
};

const selectStyles: StylesConfig<
  ScheduleSelectOption,
  boolean,
  GroupBase<ScheduleSelectOption>
> = {
  menuPortal: (base) => ({ ...base, zIndex: 100 }),
  menu: (base) => ({ ...base, zIndex: 100 })
};

type InnerCommon = {
  instanceId: string;
  menuPortalTarget: HTMLElement | null;
  options: ScheduleSelectOption[];
  placeholder: string;
  isClearable: boolean;
  ariaLabel?: string;
  className?: string;
};

function ScheduleSelectSingle({
  instanceId,
  menuPortalTarget,
  options,
  value,
  onChange,
  placeholder,
  isClearable,
  ariaLabel,
  className
}: InnerCommon & {
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value]);

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
      styles={selectStyles}
      classNames={selectClassNames}
      classNamePrefix="aspexy-select"
      menuPosition="fixed"
      menuPortalTarget={menuPortalTarget}
      noOptionsMessage={() => "Nenhuma opção encontrada"}
      loadingMessage={() => "Carregando..."}
    />
  );
}

function ScheduleSelectMulti({
  instanceId,
  menuPortalTarget,
  options,
  value,
  onChange,
  placeholder,
  isClearable,
  ariaLabel,
  className
}: InnerCommon & {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const selected = useMemo(
    () => value.map((v) => options.find((o) => o.value === v)).filter((o): o is ScheduleSelectOption => Boolean(o)),
    [options, value]
  );

  return (
    <Select<ScheduleSelectOption, true>
      unstyled
      className={cn("w-full min-w-0", className)}
      instanceId={instanceId}
      inputId={`${instanceId}-input`}
      aria-label={ariaLabel}
      options={options}
      isMulti
      value={selected}
      onChange={(opts: MultiValue<ScheduleSelectOption>) => onChange(opts.map((o) => o.value))}
      placeholder={placeholder}
      isClearable={isClearable}
      isSearchable
      closeMenuOnSelect={false}
      styles={selectStyles}
      classNames={selectClassNames}
      classNamePrefix="aspexy-select"
      menuPosition="fixed"
      menuPortalTarget={menuPortalTarget}
      noOptionsMessage={() => "Nenhuma opção encontrada"}
      loadingMessage={() => "Carregando..."}
    />
  );
}

export default function ScheduleSelect(props: ScheduleSelectProps) {
  const reactId = useId();
  const instanceId = useMemo(() => `aspexy-select-${reactId.replace(/:/g, "")}`, [reactId]);

  const [menuPortalTarget, setMenuPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setMenuPortalTarget(document.body);
  }, []);

  const {
    options,
    placeholder = "Selecione...",
    isClearable = true,
    "aria-label": ariaLabel,
    className
  } = props;

  const innerCommon: InnerCommon = {
    instanceId,
    menuPortalTarget,
    options,
    placeholder,
    isClearable,
    ariaLabel,
    className
  };

  if ("isMulti" in props && props.isMulti) {
    return <ScheduleSelectMulti {...innerCommon} value={props.value} onChange={props.onChange} />;
  }

  return <ScheduleSelectSingle {...innerCommon} value={props.value} onChange={props.onChange} />;
}
