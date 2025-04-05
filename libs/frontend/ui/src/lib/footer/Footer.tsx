import { NavLink } from 'react-router';
import React, { type PropsWithChildren, useState } from 'react';

import { NavigationSection } from '../navigation';

type FooterProps = PropsWithChildren<{
  title?: string;
  socialLinks: NavigationSection['links'];
}>;

export const Footer: React.FC<FooterProps> = ({
  title = 'ProjectX',
  socialLinks,
}) => {
  const [currentYear] = useState(() => new Date().getFullYear());
  return (
    <footer className="bg-dark-gray py-6">
      <div className="mx-auto container py-2 px-6 md:flex md:items-center md:justify-between lg:px-8">
        <div className="space-6 md:order-2 flex flex-col md:flex-row items-center justify-between">
          <div className="text-gray-300 text-sm lg:text-base flex gap-4">
            <NavLink to="/privacy" className="navlink">
              Privacy Policy
            </NavLink>
            <NavLink to="/terms" className="navlink">
              Terms of Use
            </NavLink>
          </div>
          <div className="mt-8 md:mt-0 md:ml-4 flex flex-row gap-4">
            {socialLinks.map((item) => (
              <a
                key={item.title}
                href={item.href}
                className="text-gray-300 hover:text-white transition duration-200 ease-in-out transform hover:-translate-y-1 hover:scale-105 motion-reduce:transition-none motion-reduce:hover:transform-none"
                aria-label={item.title}
              >
                {item.icon && <item.icon className="h-6 w-6" aria-hidden="true" />}
              </a>
            ))}
          </div>
        </div>
        <div className="mt-8 md:order-1 md:mt-0">
          <div className="text-center text-medium font-medium text-sm lg:text-base">
            Copyright &copy; {currentYear} ${title}, All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;