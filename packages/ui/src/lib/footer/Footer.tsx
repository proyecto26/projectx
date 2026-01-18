import React, { type PropsWithChildren, useState } from "react";
import { NavLink } from "react-router";

import type { NavigationSection } from "../navigation";

type FooterProps = PropsWithChildren<{
  title?: string;
  socialLinks: NavigationSection["links"];
}>;

export const Footer: React.FC<FooterProps> = ({
  title = "ProjectX",
  socialLinks,
}) => {
  const [currentYear] = useState(() => new Date().getFullYear());
  return (
    <footer className="bg-dark-gray py-6">
      <div className="container mx-auto px-6 py-2 md:flex md:items-center md:justify-between lg:px-8">
        <div className="space-6 flex flex-col items-center justify-between md:order-2 md:flex-row">
          <div className="flex gap-4 text-gray-300 text-sm lg:text-base">
            <NavLink to="/privacy" className="navlink">
              Privacy Policy
            </NavLink>
            <NavLink to="/terms" className="navlink">
              Terms of Use
            </NavLink>
          </div>
          <div className="mt-8 flex flex-row gap-4 md:mt-0 md:ml-4">
            {socialLinks.map((item) => (
              <a
                key={item.title}
                href={item.href}
                className="transform text-gray-300 transition duration-200 ease-in-out hover:-translate-y-1 hover:scale-105 hover:text-white motion-reduce:transition-none motion-reduce:hover:transform-none"
                aria-label={item.title}
              >
                {item.icon && (
                  <item.icon className="h-6 w-6" aria-hidden="true" />
                )}
              </a>
            ))}
          </div>
        </div>
        <div className="mt-8 md:order-1 md:mt-0">
          <div className="text-center font-medium text-medium text-sm lg:text-base">
            Copyright &copy; {currentYear} {title}, All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
