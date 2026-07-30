"use client";

import { Check, Search, X } from "lucide-react";
import {
  DynamicIcon,
  iconNames,
  type IconName,
} from "lucide-react/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ICON_BATCH_SIZE = 60;

function iconLabel(name: string) {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function IconFallback() {
  return <span className="size-5 animate-pulse rounded bg-slate-100" />;
}

export function LucideCatalogIcon({
  name,
  className,
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <DynamicIcon
      name={name}
      className={className}
      fallback={IconFallback}
      aria-hidden="true"
    />
  );
}

export function LucideIconPicker({
  open,
  value,
  onClose,
  onSelect,
}: {
  open: boolean;
  value: IconName;
  onClose: () => void;
  onSelect: (name: IconName) => void;
}) {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(ICON_BATCH_SIZE);

  const filteredIcons = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, "-");
    if (!normalizedQuery) return iconNames;
    return iconNames.filter((name) => name.includes(normalizedQuery));
  }, [query]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose, open]);

  if (!open) return null;

  const visibleIcons = filteredIcons.slice(0, visibleCount);

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="lucide-icon-picker-title"
        className="flex max-h-[min(760px,calc(100svh-32px))] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2
              id="lucide-icon-picker-title"
              className="text-base font-semibold text-slate-950"
            >
              Escolher ícone
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Pesquise e selecione um ícone do catálogo Lucide.
            </p>
          </div>
          <button
            type="button"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Fechar seletor de ícones"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="border-b border-slate-200 px-5 py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setVisibleCount(ICON_BATCH_SIZE);
              }}
              placeholder="Buscar por nome, por exemplo: message, bot, phone..."
              className="pl-9"
              autoFocus
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {filteredIcons.length} ícone(s) encontrado(s)
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {visibleIcons.length ? (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
              {visibleIcons.map((name) => {
                const selected = value === name;
                const label = iconLabel(name);
                return (
                  <button
                    key={name}
                    type="button"
                    className={cn(
                      "relative grid aspect-square min-h-16 place-items-center rounded-xl border bg-white text-slate-600 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700",
                      selected &&
                        "border-violet-500 bg-violet-50 text-violet-700 ring-2 ring-violet-100",
                    )}
                    aria-label={label}
                    title={label}
                    aria-pressed={selected}
                    onClick={() => {
                      onSelect(name);
                      onClose();
                    }}
                  >
                    <LucideCatalogIcon name={name} className="size-5" />
                    {selected ? (
                      <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-violet-600 text-white">
                        <Check className="size-2.5" strokeWidth={3} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid min-h-56 place-items-center text-center">
              <div>
                <Search className="mx-auto size-7 text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-700">
                  Nenhum ícone encontrado
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Tente buscar por outro nome em inglês.
                </p>
              </div>
            </div>
          )}

          {visibleCount < filteredIcons.length ? (
            <button
              type="button"
              className="mt-5 h-10 w-full rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() =>
                setVisibleCount((current) => current + ICON_BATCH_SIZE)
              }
            >
              Carregar mais
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
