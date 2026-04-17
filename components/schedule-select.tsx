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
  /** Aproximação de quantas linhas do menu ficam visíveis antes do scroll (padrão: ~10). */
  maxVisibleMenuItems?: number;
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
  valueContainer: () =>
    "flex min-w-0 flex-1 flex-wrap items-center gap-1.5 overflow-hidden py-1.5 pl-3 pr-1",
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
    "inline-flex max-w-full items-center gap-1 rounded-md border border-slate-200/90 bg-slate-100/95 text-xs text-slate-800",
  multiValueLabel: () => "max-w-[14rem] truncate py-1 pl-3 pr-1 text-slate-800",
  multiValueRemove: () =>
    "rounded-r-md p-1.5 text-slate-400 transition-colors hover:bg-rose-100 hover:text-rose-600",
  input: () => "m-0 p-0 text-slate-800 [&_input]:outline-none",
  noOptionsMessage: () => "cursor-default rounded-lg px-2.5 py-2 text-sm text-slate-500",
  loadingMessage: () => "cursor-default rounded-lg px-2.5 py-2 text-sm text-slate-500"
};

function mergeSelectStyles(maxVisibleMenuItems?: number): StylesConfig<
  ScheduleSelectOption,
  boolean,
  GroupBase<ScheduleSelectOption>
> {
  return {
    menuPortal: (base) => ({ ...base, zIndex: 100 }),
    menu: (base) => ({ ...base, zIndex: 100 }),
    menuList: (base) => {
      if (maxVisibleMenuItems == null) return base;
      const n = Math.max(1, Math.min(20, maxVisibleMenuItems));
      return { ...base, maxHeight: `${n * 2.25}rem` };
    }
  };
}

type InnerCommon = {
  instanceId: string;
  menuPortalTarget: HTMLElement | null;
  options: ScheduleSelectOption[];
  placeholder: string;
  isClearable: boolean;
  ariaLabel?: string;
  className?: string;
  maxVisibleMenuItems?: number;
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
  className,
  maxVisibleMenuItems
}: InnerCommon & {
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value]);
  const styles = useMemo(() => mergeSelectStyles(maxVisibleMenuItems), [maxVisibleMenuItems]);

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
      styles={styles}
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
  className,
  maxVisibleMenuItems
}: InnerCommon & {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const selected = useMemo(
    () => value.map((v) => options.find((o) => o.value === v)).filter((o): o is ScheduleSelectOption => Boolean(o)),
    [options, value]
  );
  const styles = useMemo(() => mergeSelectStyles(maxVisibleMenuItems), [maxVisibleMenuItems]);

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
      styles={styles}
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
    className,
    maxVisibleMenuItems
  } = props;

  const innerCommon: InnerCommon = {
    instanceId,
    menuPortalTarget,
    options,
    placeholder,
    isClearable,
    ariaLabel,
    className,
    maxVisibleMenuItems
  };

  if ("isMulti" in props && props.isMulti) {
    return <ScheduleSelectMulti {...innerCommon} value={props.value} onChange={props.onChange} />;
  }

  return <ScheduleSelectSingle {...innerCommon} value={props.value} onChange={props.onChange} />;
}
