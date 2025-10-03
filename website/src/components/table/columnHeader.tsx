import type { ComponentProps } from "react";

export const ColumnHeader = ({ children }: ComponentProps<"th">) => (
  <th
    className={`border-color-neutral/55 h-8 border-b
    border-t border-solid bg-neutral-50 font-medium first:rounded-l-lg first:border-l last:rounded-r-lg
    last:border-r first:[&>span]:pl-4 last:[&>span]:pl-5`}
  >
    {children}
  </th>
);
