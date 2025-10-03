import type { ComponentProps } from "react";

export const Column = (props: ComponentProps<"td">) => (
  <td
    className={`h-13 border-b border-solid border-neutral-300/55 py-2.5 last:pr-2.5 first:[&>*]:pl-4 last:[&>*]:pl-5`}
    {...props}
  />
);
