"use client";

import { useState } from "react";
import { ScrollTable } from "@/components/scroll-table";

export type SortableCell = {
  text: string;
  /** What the column sorts by. null (no value, such as "None") always sorts last. */
  sort: number | string | null;
  href?: string;
};

export type SortableColumn = { label: string };

type Sort = { column: number; direction: "ascending" | "descending" };

function compare(a: SortableCell, b: SortableCell, direction: Sort["direction"]): number {
  if (a.sort === null || b.sort === null) return a.sort === b.sort ? 0 : a.sort === null ? 1 : -1;
  const order = typeof a.sort === "number" && typeof b.sort === "number" ? a.sort - b.sort : String(a.sort).localeCompare(String(b.sort));
  return direction === "ascending" ? order : -order;
}

/**
 * A ScrollTable whose column headings are buttons: the first click sorts ascending, the next descending.
 * The first cell of each row is its row header. Rows keep their given order until a heading is clicked.
 */
export function SortableTable({
  label,
  caption,
  hintTestId,
  columns,
  rows,
}: {
  label: string;
  caption: string;
  hintTestId: string;
  columns: readonly SortableColumn[];
  rows: readonly (readonly SortableCell[])[];
}) {
  const [sort, setSort] = useState<Sort | null>(null);
  const sorted = sort ? [...rows].sort((a, b) => compare(a[sort.column], b[sort.column], sort.direction)) : rows;

  const toggle = (column: number) =>
    setSort((current) => ({ column, direction: current?.column === column && current.direction === "ascending" ? "descending" : "ascending" }));

  return (
    <ScrollTable label={label} caption={caption} hintTestId={hintTestId} width="wide">
      <thead>
        <tr className="border-b border-border text-foreground">
          {columns.map((c, i) => {
            const active = sort?.column === i;
            return (
              <th key={c.label} scope="col" aria-sort={active ? sort.direction : undefined} className="py-2 pr-4 align-bottom font-medium">
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  className="inline-flex items-end gap-1 rounded-sm text-left font-medium outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {c.label}
                  <span aria-hidden="true" className="text-xs text-muted-foreground">
                    {active ? (sort.direction === "ascending" ? "▲" : "▼") : "↕"}
                  </span>
                </button>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {sorted.map((row, r) => (
          <tr key={row[0].text} className={r < sorted.length - 1 ? "border-b border-border" : undefined}>
            {row.map((cell, i) => {
              const content = cell.href ? <a href={cell.href}>{cell.text}</a> : cell.text;
              return i === 0 ? (
                <th key={i} scope="row" className="py-2 pr-4 align-top font-normal">
                  {content}
                </th>
              ) : (
                <td key={i} className="py-2 pr-4 align-top">
                  {content}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </ScrollTable>
  );
}
