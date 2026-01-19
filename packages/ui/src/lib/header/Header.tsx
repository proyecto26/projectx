import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/20/solid";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
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
          "border-b border-transparent",
          isScrolled
            ? "bg-white/80 backdrop-blur-md shadow-sm border-slate-200/50 dark:bg-slate-950/80 dark:border-slate-800/50"
            : "bg-white/60 backdrop-blur-sm dark:bg-slate-950/60",
          className
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Mobile Menu Trigger & Logo Area */}
          <div className="flex items-center gap-4 lg:hidden">
            <MobileNavigation sections={sections} logoImgSrc={logoImgSrc} />
            <Link to="/" aria-label="Home page" className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg">
              <img
                alt="Logo"
                src={logoImgSrc}
                className="h-8 w-auto"
              />
            </Link>
          </div>

          {/* Desktop Logo & Title */}
          <div className="hidden lg:flex lg:items-center lg:gap-4 lg:flex-none">
            <Link
              to="/"
              aria-label="Home page"
              className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1"
            >
              <img
                alt="Project Logo"
                src={logoImgSrc}
                className="h-9 w-auto object-contain"
              />
              {title && (
                <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {title}
                </span>
              )}
            </Link>
          </div>

          {/* Desktop Search Center */}
          <div className="hidden flex-1 items-center justify-center px-8 md:flex lg:px-12">
            <div className="w-full max-w-lg">
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
            {/* Desktop Links */}
            <nav className="hidden xl:block">
              <ul className="flex items-center gap-6">
                {desktopLinks?.map((link) => (
                  <li key={link.href}>
                    <Link
                      className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                      to={link.href}
                    >
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Mobile Search Toggle */}
            {!isMobileSearchFocused && (
              <Button
                onClick={openMobileSearch}
                type="button"
                className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 md:hidden"
                variant="ghost"
              >
                <MagnifyingGlassIcon className="h-6 w-6" aria-hidden="true" />
                <span className="sr-only">Open Search</span>
              </Button>
            )}

            {/* Actions: Cart, Theme, User */}
            <div className="flex items-center gap-4">
              <div className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                <ShoppingCartDrawer />
              </div>

              <ThemeButton
                theme={theme}
                onChange={onThemeChange}
                className="h-9 w-9 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              />

              {isAuthenticated ? (
                <Menu as="div" className="relative ml-2">
                  <MenuButton className="relative flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 ring-2 ring-white text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:ring-slate-700">
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
                    className="absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-xl bg-white py-1 shadow-xl ring-1 ring-black/5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in dark:bg-slate-900 dark:ring-white/10"
                  >
                    {[
                      { to: "/profile", label: "Your Profile" },
                      { to: "/admin", label: "Admin" },
                      { to: "/logout", label: "Sign out" }
                    ].map((item) => (
                      <MenuItem key={item.to}>
                        <Link
                          to={item.to}
                          className="block px-4 py-2 text-sm text-slate-700 data-[focus]:bg-slate-50 dark:text-slate-200 dark:data-[focus]:bg-slate-800"
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
                  className="ml-2 inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white transition-all hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
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
            className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 md:hidden"
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
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-full dark:text-slate-400 dark:hover:bg-slate-800"
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
