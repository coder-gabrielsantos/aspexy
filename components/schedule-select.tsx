"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Select, {
  type ClassNamesConfig,
  type SelectComponentsConfig,
  type GroupBase,
  type MultiValue,
  type MultiValueProps,
  type SingleValue,
  type StylesConfig
} from "react-select";

import { cn } from "@/lib/utils";

export type ScheduleSelectOption = { value: string; label: string };

type CommonScheduleSelectProps = {
  options: ScheduleSelectOption[];
  placeholder?: string;
  isClearable?: boolean;
  /** Quando false, não abre campo de busca / edição (só escolha no menu). */
  isSearchable?: boolean;
  "aria-label"?: string;
  className?: string;
  /** Aproximação de quantas linhas do menu ficam visíveis antes do scroll (padrão: ~10). */
  maxVisibleMenuItems?: number;
  /**
   * Quantos valores selecionados renderizar no controle antes de mostrar um "+N".
   * - Quando omitido, usa um padrão responsivo (mobile: 1; sm+: 2).
   * - Quando definido, aplica o mesmo valor em todos os tamanhos de tela.
   */
  maxVisibleSelectedValues?: number;
  /**
   * Quando definido junto com `maxVisibleSelectedValues`, usa:
   * - mobile: `maxVisibleSelectedValues`
   * - sm+: `maxVisibleSelectedValuesSm`
   */
  maxVisibleSelectedValuesSm?: number;
  /** Separa os valores renderizados por vírgula (útil quando parecem “texto corrido”). */
  multiValueSeparator?: "none" | "comma";
  /** Como mostrar os valores selecionados no multi-select. */
  multiValueDisplay?: "chips" | "text";
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
      "flex h-11 min-h-11 w-full cursor-default rounded-md border bg-white text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-colors duration-150",
      props.isFocused
        ? "border-indigo-400/95 ring-2 ring-indigo-600/18"
        : "border-slate-200 hover:border-indigo-300/85",
      props.isDisabled && "cursor-not-allowed opacity-50"
    ),
  valueContainer: () =>
    "flex h-11 min-w-0 flex-1 flex-wrap items-center gap-1.5 overflow-hidden py-0 pl-3 pr-1",
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

/** Mesma altura visual do controle com uma linha de tags (evita “encolher” quando vazio). */
const multiSelectClassNames: ClassNamesConfig<
  ScheduleSelectOption,
  true,
  GroupBase<ScheduleSelectOption>
> = {
  ...selectClassNames,
  control: (props) =>
    cn(
      "flex min-h-11 w-full cursor-default items-stretch rounded-md border bg-white text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-colors duration-150",
      props.isFocused
        ? "border-indigo-400/95 ring-2 ring-indigo-600/18"
        : "border-slate-200 hover:border-indigo-300/85",
      props.isDisabled && "cursor-not-allowed opacity-50"
    ),
  valueContainer: () =>
    "flex min-h-8 min-w-0 flex-1 flex-wrap items-center gap-1.5 overflow-hidden py-1.5 pl-3 pr-1"
};

function mergeSelectStyles(maxVisibleMenuItems?: number): StylesConfig<
  ScheduleSelectOption,
  boolean,
  GroupBase<ScheduleSelectOption>
> {
  return {
    menuPortal: (base) => ({ ...base, zIndex: 100 }),
    menu: (base) => ({ ...base, zIndex: 100 }),
    control: (base) => ({
      ...base,
      minHeight: 44,
      height: 44,
      alignItems: "stretch"
    }),
    valueContainer: (base) => ({
      ...base,
      paddingTop: 0,
      paddingBottom: 0,
      alignItems: "center"
    }),
    menuList: (base) => {
      if (maxVisibleMenuItems == null) return base;
      const n = Math.max(1, Math.min(20, maxVisibleMenuItems));
      // Cada opção: ~2.25rem (py-2 + text-sm) + 0,5rem do `p-1` do menuList (não entra no scroll).
      const perItemRem = 2.25;
      const menuListVerticalPadRem = 0.5;
      return { ...base, maxHeight: `${n * perItemRem + menuListVerticalPadRem}rem` };
    }
  };
}

/** Altura mínima alinhada a uma linha de tags (react-select ignora parte do Tailwind no controle). */
function mergeMultiSelectStyles(
  maxVisibleMenuItems?: number
): StylesConfig<ScheduleSelectOption, true, GroupBase<ScheduleSelectOption>> {
  return {
    ...mergeSelectStyles(maxVisibleMenuItems),
    control: (base) => ({
      ...base,
      minHeight: 44,
      alignItems: "stretch"
    }),
    valueContainer: (base) => ({
      ...base,
      minHeight: 32,
      alignItems: "center"
    }),
    indicatorsContainer: (base) => ({
      ...base,
      alignSelf: "stretch",
      display: "flex",
      alignItems: "center"
    })
  };
}

type InnerCommon = {
  instanceId: string;
  menuPortalTarget: HTMLElement | null;
  options: ScheduleSelectOption[];
  placeholder: string;
  isClearable: boolean;
  isSearchable: boolean;
  ariaLabel?: string;
  className?: string;
  maxVisibleMenuItems?: number;
  maxVisibleSelectedValues?: number;
  maxVisibleSelectedValuesSm?: number;
  multiValueSeparator?: "none" | "comma";
  multiValueDisplay?: "chips" | "text";
};

function ScheduleSelectSingle({
  instanceId,
  menuPortalTarget,
  options,
  value,
  onChange,
  placeholder,
  isClearable,
  isSearchable,
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
      isSearchable={isSearchable}
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
  isSearchable,
  ariaLabel,
  className,
  maxVisibleMenuItems,
  maxVisibleSelectedValues,
  maxVisibleSelectedValuesSm,
  multiValueSeparator,
  multiValueDisplay
}: InnerCommon & {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const selected = useMemo(
    () => value.map((v) => options.find((o) => o.value === v)).filter((o): o is ScheduleSelectOption => Boolean(o)),
    [options, value]
  );
  const styles = useMemo(() => mergeMultiSelectStyles(maxVisibleMenuItems), [maxVisibleMenuItems]);

  const components = useMemo<Partial<SelectComponentsConfig<ScheduleSelectOption, true, GroupBase<ScheduleSelectOption>>>>(() => {
    const MultiValue = (props: MultiValueProps<ScheduleSelectOption, true, GroupBase<ScheduleSelectOption>>) => {
      const idx = props.index;
      const total = Array.isArray(props.selectProps.value) ? props.selectProps.value.length : selected.length;
      const usesDefault = maxVisibleSelectedValues == null && maxVisibleSelectedValuesSm == null;
      const responsiveCustom = maxVisibleSelectedValues != null && maxVisibleSelectedValuesSm != null;

      const mobileLimit = usesDefault
        ? 1
        : Math.max(0, maxVisibleSelectedValues ?? 1);
      const smLimit = usesDefault
        ? 2
        : responsiveCustom
          ? Math.max(0, maxVisibleSelectedValuesSm ?? mobileLimit)
          : mobileLimit;

      // Sem limite (0) => sempre só "+N".
      if (mobileLimit === 0 && smLimit === 0) {
        if (idx !== 0 || total === 0) return null;
        return (
          <div
            className={cn(
              props.className,
              "pointer-events-none select-none border-slate-200/70 bg-slate-100/80 text-slate-600"
            )}
            title={`${total} selecionado(s)`}
          >
            <span className="py-1 pl-3 pr-3">+{total}</span>
          </div>
        );
      }

      const isPlusMobile = idx === mobileLimit;
      const isPlusDesktop = idx === smLimit;
      const isVisibleMobile = idx < mobileLimit;
      const isVisibleDesktop = idx < smLimit;

      const sepComma = multiValueSeparator === "comma";
      const mobileShownCount = Math.min(total, mobileLimit);
      const desktopShownCount = Math.min(total, smLimit);
      const commaMobile = sepComma && isVisibleMobile && idx + 1 < mobileShownCount;
      const commaDesktop = sepComma && isVisibleDesktop && idx + 1 < desktopShownCount;

      const asText = multiValueDisplay === "text";

      const renderFull = (hideOnMobile: boolean) => (
        <div
          {...props.innerProps}
          className={cn(
            props.className,
            hideOnMobile && "hidden sm:inline-flex",
            asText && "border-0 bg-transparent text-sm text-slate-800"
          )}
          title={props.data.label}
        >
          <span className={cn("max-w-[14rem] truncate", asText ? "py-0 pl-0 pr-0" : "py-1 pl-3 pr-1")}>
            {props.data.label}
            {commaMobile ? <span className="mx-1 text-slate-400 sm:hidden">,</span> : null}
            {commaDesktop ? <span className="mx-1 hidden text-slate-400 sm:inline">,</span> : null}
          </span>
          {asText ? null : (
            (() => {
              // `removeProps` inclui `ref` tipado para <div>; removemos para usar em <button>.
              const { ref: _ref, ...safeRemoveProps } = props.removeProps;
              void _ref;
              return (
                <div
                  aria-label={`Remover ${props.data.label}`}
                  role="button"
                  tabIndex={0}
                  {...safeRemoveProps}
                  className="rounded-r-md p-1.5 text-slate-400 transition-colors hover:bg-rose-100 hover:text-rose-600"
                >
                  ×
                </div>
              );
            })()
          )}
        </div>
      );

      // Caso comum no app: mobile mostra menos que desktop.
      // O item no índice `mobileLimit` vira "+N" no mobile, mas continua sendo um nome visível no desktop.
      if (mobileLimit < smLimit && idx === mobileLimit) {
        const nMobile = Math.max(0, total - mobileLimit);
        return (
          <>
            {nMobile > 0 ? (
              <div
                className={cn(
                  props.className,
                  asText
                    ? "pointer-events-none select-none border-0 bg-transparent text-sm text-slate-500 sm:hidden"
                    : "pointer-events-none select-none border-slate-200/70 bg-slate-100/80 text-slate-600 sm:hidden"
                )}
                title={`${nMobile} selecionado(s)`}
              >
                <span className={cn(asText ? "py-0 pl-0 pr-0" : "py-1 pl-3 pr-3")}>+{nMobile}</span>
              </div>
            ) : null}
            {renderFull(true)}
          </>
        );
      }

      if (isVisibleMobile || isVisibleDesktop) {
        // Se o item entra só no desktop (idx >= mobileLimit), esconder no mobile.
        const hideOnMobile = !isVisibleMobile && isVisibleDesktop;
        return renderFull(hideOnMobile);
      }

      // +N (mobile)
      if (isPlusMobile && mobileLimit !== smLimit) {
        const n = Math.max(0, total - mobileLimit);
        if (n <= 0) return null;
        return (
          <div
            className={cn(
              props.className,
              multiValueDisplay === "text"
                ? "pointer-events-none select-none border-0 bg-transparent text-sm text-slate-500 sm:hidden"
                : "pointer-events-none select-none border-slate-200/70 bg-slate-100/80 text-slate-600 sm:hidden"
            )}
            title={`${n} selecionado(s)`}
          >
            <span className={cn(multiValueDisplay === "text" ? "py-0 pl-0 pr-0" : "py-1 pl-3 pr-3")}>+{n}</span>
          </div>
        );
      }

      // +N (desktop)
      if (isPlusDesktop) {
        const n = Math.max(0, total - smLimit);
        if (n <= 0) return null;
        return (
          <div
            className={cn(
              props.className,
              multiValueDisplay === "text"
                ? "pointer-events-none select-none border-0 bg-transparent text-sm text-slate-500"
                : "pointer-events-none select-none border-slate-200/70 bg-slate-100/80 text-slate-600",
              mobileLimit !== smLimit && "hidden sm:inline-flex"
            )}
            title={`${n} selecionado(s)`}
          >
            <span className={cn(multiValueDisplay === "text" ? "py-0 pl-0 pr-0" : "py-1 pl-3 pr-3")}>+{n}</span>
          </div>
        );
      }

      return null;
    };

    return { MultiValue };
  }, [
    maxVisibleSelectedValues,
    maxVisibleSelectedValuesSm,
    multiValueSeparator,
    multiValueDisplay,
    selected.length
  ]);

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
      isSearchable={isSearchable}
      closeMenuOnSelect={false}
      blurInputOnSelect={false}
      styles={styles}
      classNames={multiSelectClassNames}
      components={components}
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
    isSearchable = true,
    "aria-label": ariaLabel,
    className,
    maxVisibleMenuItems,
    maxVisibleSelectedValues,
    maxVisibleSelectedValuesSm,
    multiValueSeparator = "none"
  } = props;

  const innerCommon: InnerCommon = {
    instanceId,
    menuPortalTarget,
    options,
    placeholder,
    isClearable,
    isSearchable,
    ariaLabel,
    className,
    maxVisibleMenuItems,
    maxVisibleSelectedValues,
    maxVisibleSelectedValuesSm,
    multiValueSeparator,
    multiValueDisplay: "multiValueDisplay" in props ? props.multiValueDisplay : "chips"
  };

  if ("isMulti" in props && props.isMulti) {
    return <ScheduleSelectMulti {...innerCommon} value={props.value} onChange={props.onChange} />;
  }

  return <ScheduleSelectSingle {...innerCommon} value={props.value} onChange={props.onChange} />;
}
