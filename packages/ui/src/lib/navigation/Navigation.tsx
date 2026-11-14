import type { HTMLAttributes } from "react";
import { Link, useLocation } from "react-router";

import { classnames } from "../../utils";

export type NavigationSection = {
  title: string;
  links: {
    title: string;
    href: string;
    icon?: React.FC<Partial<HTMLAttributes<HTMLDivElement>>>;
  }[];
};

export type NavigationProps = {
  className?: string;
  sections: NavigationSection[];
};

export const Navigation: React.FC<NavigationProps> = ({
  className,
  sections = [],
}) => {
  const location = useLocation();

  return (
    <nav className={classnames("text-base lg:text-sm", className)}>
      <ul className="space-y-9">
        {sections.map((section) => (
          <li key={section.title}>
            <h2 className="font-display font-medium text-(--foreground)">
              {section.title}
            </h2>
            <ul className="mt-2 space-y-2 border-(--border) border-l-2 lg:mt-4 lg:space-y-4">
              {section.links.map((link) => (
                <li key={link.href} className="relative">
                  <Link
                    to={link.href}
                    className={classnames(
                      "block w-full pl-3.5 before:pointer-events-none before:absolute before:top-1/2 before:-left-1 before:h-1.5 before:w-1.5 before:-translate-y-1/2 before:rounded-full",
                      link.href === location.pathname
                        ? "font-semibold text-(--primary) before:bg-(--primary)"
                        : "text-(--muted-foreground) before:hidden before:bg-(--muted-foreground) hover:text-(--foreground) hover:before:block",
                    )}
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
};
