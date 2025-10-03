import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router";

const Li = ({
  children,
  selected,
}: {
  children: ReactNode;
  selected: boolean;
}) => (
  <li
    className={`box-border flex h-7 text-xs rounded-md px-2.5 flex-1 items-center py-1 font-medium transition-colors duration-300 md:flex-auto [&>a]:w-full ${
      selected
        ? "bg-white text-neutral-950 shadow-sm"
        : "cursor-pointer bg-neutral-100 text-neutral-700 hover:text-neutral-950"
    }`}
  >
    {children}
  </li>
);

export const Header = function () {
  const { pathname } = useLocation();
  return (
    <header className="w-full flex justify-center p-4">
      <ul className="flex items-center justify-center gap-x-4 gap-y-1 w-fit">
        <Li selected={pathname === "/bridge"}>
          <NavLink to="/bridge">Bridge</NavLink>
        </Li>
        <Li selected={pathname === "/pools"}>
          <NavLink to="/pools">Pools</NavLink>
        </Li>
      </ul>
    </header>
  );
};
