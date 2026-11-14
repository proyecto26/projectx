import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/20/solid";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useOnClickOutside } from "usehooks-ts";
import { useAvatarUrl } from "../../hooks/useAvatarUrl";
import { useScroll } from "../../hooks/useScroll";
import { classnames, getCookie, saveCookie } from "../../utils";
import { Button } from "../buttons/button/Button";
import { ThemeButton } from "../buttons/theme/ThemeButton";
import { ShoppingCartDrawer } from "../drawers";
import { Search } from "../inputs/search/Search";
import { MobileNavigation } from "../navigation/MobileNavigation";
import type { NavigationSection } from "../navigation/Navigation";

export interface HeaderProps {
  logoImgSrc: string;
  sections: NavigationSection[];
  desktopLinks?: NavigationSection["links"];
  title?: string;
  className?: string;
  searchPlaceholder?: string;
  isAuthenticated?: boolean;
  email?: string;
}

const COOKIE_NAME = "theme";

export function Header({
  title,
  sections = [],
  logoImgSrc = "/logo.svg",
  searchPlaceholder = "Search",
  desktopLinks,
  className,
  isAuthenticated,
  email,
}: HeaderProps) {
  const { isScrolled } = useScroll();
  const [isSearchFocused, setSearchFocused] = useState(false);
  const [isMobileSearchFocused, setMobileSearchFocused] = useState(false);
  const [theme, setTheme] = useState("light");
  const avatarUrl = useAvatarUrl(email);

  useEffect(() => {
    const theme = getCookie(COOKIE_NAME) ?? "light";
    setTheme(theme);
  }, []);

  const onThemeChange = (newTheme: string) => {
    saveCookie(COOKIE_NAME, newTheme);
    setTheme(newTheme);
  };

  const onCloseSearch = () => {
    setSearchFocused(false);
    setMobileSearchFocused(false);
  };
  const headerRef = useRef<HTMLElement>(null);
  useOnClickOutside(headerRef, onCloseSearch);
  const openSearch = () => {
    setSearchFocused(true);
  };
  const openMobileSearch = () => {
    setMobileSearchFocused(true);
  };

  return (
    <AnimatePresence initial={false}>
      <header
        ref={headerRef}
        className={classnames(
          "sticky top-0 z-50 w-full transition-all duration-300",
          "border-transparent border-b",
          isScrolled
            ? "border-(--border)/50 bg-(--background)/80 shadow-sm backdrop-blur-md"
            : "bg-(--background)/60 backdrop-blur-sm",
          className,
        )}
      >
        <div className="mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Mobile Menu Trigger & Logo Area */}
          <div className="flex items-center gap-4 lg:hidden">
            <MobileNavigation sections={sections} logoImgSrc={logoImgSrc} />
            <Link
              to="/"
              aria-label="Home page"
              className="flex items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <img alt="Logo" src={logoImgSrc} className="h-8 w-auto" />
            </Link>
          </div>

          {/* Desktop Logo + Nav Links (grouped left) */}
          <div className="hidden lg:flex lg:flex-none lg:items-center lg:gap-6">
            <Link
              to="/"
              aria-label="Home page"
              className="flex items-center gap-3 rounded-lg p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <img
                alt="Project Logo"
                src={logoImgSrc}
                className="h-9 w-auto object-contain"
              />
              {title && (
                <span className="font-bold text-(--foreground) text-xl tracking-tight">
                  {title}
                </span>
              )}
            </Link>
            {/* Desktop Links next to logo */}
            {desktopLinks && desktopLinks.length > 0 && (
              <nav>
                <ul className="flex items-center gap-5">
                  {desktopLinks.map((link, i) => (
                    <li key={link.href}>
                      <Link
                        className={classnames(
                          "text-sm transition-colors hover:text-(--foreground)",
                          i === 0
                            ? "font-medium text-(--foreground)"
                            : "text-(--muted-foreground)",
                        )}
                        to={link.href}
                      >
                        {link.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>

          {/* Desktop Search Center */}
          <div className="hidden flex-1 items-center justify-center px-8 md:flex lg:px-12">
            <div className="w-full max-w-[480px]">
              <Search
                placeholder={searchPlaceholder}
                onFocus={openSearch}
                onBlur={onCloseSearch}
                className="w-full rounded-br-3xl"
              />
            </div>
          </div>

          {/* Desktop Navigation & Actions */}
          <div className="flex items-center justify-end gap-3 sm:gap-4 lg:flex-none">
            {/* Mobile Search Toggle */}
            {!isMobileSearchFocused && (
              <Button
                onClick={openMobileSearch}
                type="button"
                className="p-2 text-(--muted-foreground) hover:text-(--foreground) md:hidden"
                variant="ghost"
              >
                <MagnifyingGlassIcon className="h-6 w-6" aria-hidden="true" />
                <span className="sr-only">Open Search</span>
              </Button>
            )}

            {/* Actions: Cart, Theme, User */}
            <div className="flex items-center gap-4">
              <div className="text-(--muted-foreground) hover:text-(--foreground)">
                <ShoppingCartDrawer />
              </div>

              <ThemeButton
                theme={theme}
                onChange={onThemeChange}
                className="h-9 w-9 text-(--muted-foreground) hover:text-(--foreground)"
              />

              {isAuthenticated ? (
                <Menu as="div" className="relative ml-2">
                  <MenuButton className="relative flex h-9 w-9 items-center justify-center rounded-full bg-(--muted) text-sm ring-2 ring-white focus:outline-none focus:ring-2 focus:ring-primary">
                    <span className="absolute -inset-1.5" />
                    <span className="sr-only">Open user menu</span>
                    <img
                      alt="Avatar"
                      src={avatarUrl}
                      className="h-full w-full rounded-full object-cover"
                    />
                  </MenuButton>
                  <MenuItems
                    transition
                    className="absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-xl bg-(--card) py-1 shadow-xl ring-1 ring-black/5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
                  >
                    {[
                      { to: "/profile", label: "Your Profile" },
                      { to: "/admin", label: "Admin Dashboard" },
                      { to: "/logout", label: "Sign out" },
                    ].map((item) => (
                      <MenuItem key={item.to}>
                        <Link
                          to={item.to}
                          className="block px-4 py-2 text-(--foreground) text-sm data-[focus]:bg-(--muted)"
                        >
                          {item.label}
                        </Link>
                      </MenuItem>
                    ))}
                  </MenuItems>
                </Menu>
              ) : (
                <Link
                  to="/login"
                  className="ml-2 inline-flex items-center justify-center rounded-lg bg-(--foreground) px-4 py-1.5 font-semibold text-(--background) text-sm transition-all hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  Log in
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Search Expanded View */}
        {isMobileSearchFocused && (
          <motion.div
            key="search"
            initial="collapsed"
            animate="open"
            className="border-(--border) border-t bg-(--background) md:hidden"
            variants={{
              open: { opacity: 1, height: "auto" },
              collapsed: { opacity: 0, height: 0 },
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="flex items-center gap-4 p-4">
              <Search
                placeholder={searchPlaceholder}
                autoFocus
                className="flex-1"
                onFocus={openMobileSearch}
                onBlur={onCloseSearch}
              />
              <Button
                onClick={onCloseSearch}
                type="button"
                className="rounded-full p-2 text-(--muted-foreground) hover:bg-(--muted)"
                variant="ghost"
              >
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                <span className="sr-only">Close Search</span>
              </Button>
            </div>
          </motion.div>
        )}
      </header>

      {/* Backdrop for focused states */}
      {(isSearchFocused || isMobileSearchFocused) && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm dark:bg-black/50"
        />
      )}
    </AnimatePresence>
  );
}

export default Header;
