import React, { type PropsWithChildren, useState } from "react";
import { NavLink } from "react-router";

import type { NavigationSection } from "../navigation";

export type FooterSection = {
  title: string;
  links: {
    title: string;
    href: string;
    external?: boolean;
  }[];
};

const defaultFooterSections: FooterSection[] = [
  {
    title: "Shop",
    links: [
      { title: "Marketplace", href: "/marketplace" },
      { title: "Categories", href: "/marketplace?tab=categories" },
      { title: "Today's Deals", href: "/marketplace?tab=deals" },
      { title: "New Arrivals", href: "/marketplace?tab=new" },
    ],
  },
  {
    title: "Account",
    links: [
      { title: "Your Profile", href: "/profile" },
      { title: "Login", href: "/login" },
    ],
  },
  {
    title: "Legal",
    links: [
      { title: "Privacy Policy", href: "/privacy" },
      { title: "Terms of Service", href: "/terms" },
    ],
  },
];

// Inline SVG icons for social platforms (no extra deps required)
const TwitterIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const YoutubeIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const defaultSocialLinks = [
  {
    title: "ProjectX on Twitter",
    href: "https://twitter.com/proyecto26",
    Icon: TwitterIcon,
  },
  {
    title: "ProjectX on Instagram",
    href: "https://www.instagram.com/proyecto26",
    Icon: InstagramIcon,
  },
  {
    title: "ProjectX on Facebook",
    href: "https://www.facebook.com/proyecto26",
    Icon: FacebookIcon,
  },
  {
    title: "ProjectX on YouTube",
    href: "https://www.youtube.com/@proyecto26",
    Icon: YoutubeIcon,
  },
];

type FooterProps = PropsWithChildren<{
  title?: string;
  socialLinks?: NavigationSection["links"];
  footerSections?: FooterSection[];
}>;

export const Footer: React.FC<FooterProps> = ({
  title = "ProjectX",
  socialLinks,
  footerSections = defaultFooterSections,
}) => {
  const [currentYear] = useState(() => new Date().getFullYear());

  return (
    <footer className="bg-(--surface)">
      {/* Top section — 4-column link grid */}
      <div className="container mx-auto px-6 pt-12 pb-8 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold text-(--foreground) text-sm uppercase tracking-wider">
                {section.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {section.links.map((link) => (
                  <li key={link.title}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-(--muted-foreground) text-sm transition-colors duration-150 hover:text-(--foreground)"
                      >
                        {link.title}
                      </a>
                    ) : (
                      <NavLink
                        to={link.href}
                        className="text-(--muted-foreground) text-sm transition-colors duration-150 hover:text-(--foreground)"
                      >
                        {link.title}
                      </NavLink>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="my-8 border-(--border) border-t" />

        {/* Bottom section — copyright left, social icons right */}
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-(--muted-foreground) text-sm">
            &copy; {currentYear} {title}. All rights reserved.
          </p>

          <div className="flex items-center gap-5">
            {socialLinks && socialLinks.length > 0
              ? socialLinks.map((item) => (
                  <a
                    key={item.title}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.title}
                    className="text-(--muted-foreground) transition-colors duration-150 hover:text-(--foreground)"
                  >
                    {item.icon && (
                      <item.icon className="h-5 w-5" aria-hidden="true" />
                    )}
                  </a>
                ))
              : defaultSocialLinks.map(({ title: label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="text-(--muted-foreground) transition-colors duration-150 hover:text-(--foreground)"
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
