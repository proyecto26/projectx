import { motion } from "framer-motion";
import type React from "react";
import type { PropsWithChildren } from "react";
import { classnames } from "../../utils";
import Footer from "../footer/Footer";
import Header from "../header/Header";
import FacebookIcon from "../icons/Facebook";
import GitHubIcon from "../icons/GitHub";
import InstagramIcon from "../icons/Instagram";
import type { NavigationSection } from "../navigation";

const sections: NavigationSection[] = [
  {
    title: "Home",
    links: [
      {
        title: "Home",
        href: "/",
      },
    ],
  },
  {
    title: "About",
    links: [
      {
        title: "About",
        href: "/about",
      },
    ],
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
      <Footer socialLinks={socialLinks} />
    </motion.section>
  );
};

export default Layout;
