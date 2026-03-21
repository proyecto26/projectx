import { motion } from "framer-motion";
import type React from "react";
import type { PropsWithChildren } from "react";
import { classnames } from "../../utils";
import Footer, { type FooterSection } from "../footer/Footer";
import Header from "../header/Header";
import FacebookIcon from "../icons/Facebook";
import GitHubIcon from "../icons/GitHub";
import InstagramIcon from "../icons/Instagram";
import type { NavigationSection } from "../navigation";

const sections: NavigationSection[] = [
  {
    title: "Shop",
    links: [
      {
        title: "Home",
        href: "/",
      },
      {
        title: "Marketplace",
        href: "/marketplace",
      },
      {
        title: "Categories",
        href: "/marketplace?tab=categories",
      },
      {
        title: "Deals",
        href: "/marketplace?tab=deals",
      },
      {
        title: "New Arrivals",
        href: "/marketplace?tab=new",
      },
    ],
  },
  {
    title: "Account",
    links: [
      {
        title: "Profile",
        href: "/profile",
      },
      {
        title: "Admin Dashboard",
        href: "/admin",
      },
      {
        title: "Admin Orders",
        href: "/admin/orders",
      },
    ],
  },
  {
    title: "Legal",
    links: [
      {
        title: "Terms of Use",
        href: "/terms",
      },
      {
        title: "Privacy Policy",
        href: "/privacy",
      },
    ],
  },
];

const desktopLinks: NavigationSection["links"] = [
  {
    title: "Marketplace",
    href: "/marketplace",
  },
  {
    title: "Categories",
    href: "/marketplace?tab=categories",
  },
  {
    title: "Deals",
    href: "/marketplace?tab=deals",
  },
  {
    title: "New Arrivals",
    href: "/marketplace?tab=new",
  },
];

const socialLinks: NavigationSection["links"] = [
  {
    title: "ProjectX on Facebook",
    href: "https://www.facebook.com/proyecto26",
    icon: FacebookIcon,
  },
  {
    title: "ProjectX on Instagram",
    href: "https://www.instagram.com/proyecto26",
    icon: InstagramIcon,
  },
  {
    title: "ConcertX on GitHub",
    href: "https://www.github.com/proyecto26",
    icon: GitHubIcon,
  },
];

const footerSections: FooterSection[] = [
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
      { title: "Admin Dashboard", href: "/admin" },
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

export type LayoutProps = PropsWithChildren<{
  title?: string;
  className?: string;
  containerClassName?: string;
  isAuthenticated?: boolean;
  email?: string;
}>;

export const Layout: React.FC<LayoutProps> = ({
  children,
  title,
  className,
  containerClassName,
  isAuthenticated,
  email,
}) => {
  return (
    <motion.section
      className={classnames(
        "flex min-h-screen flex-col bg-base-100 text-base-content",
        className,
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Header
        title={title}
        sections={sections}
        desktopLinks={desktopLinks}
        logoImgSrc="/logo.svg"
        isAuthenticated={isAuthenticated}
        email={email}
      />
      <main
        className={classnames(
          "container mx-auto flex-grow px-4 py-8",
          containerClassName,
        )}
      >
        {children}
      </main>
      <Footer socialLinks={socialLinks} footerSections={footerSections} />
    </motion.section>
  );
};

export default Layout;
