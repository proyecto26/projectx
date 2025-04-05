import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/20/solid';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useOnClickOutside } from 'usehooks-ts';

import { useScroll } from '../../hooks/useScroll';
import { classnames, getCookie, saveCookie } from '../../utils';
import { Search } from '../inputs/search/Search';
import { ShoppingCartDrawer } from '../drawers';
import { MobileNavigation } from '../navigation/MobileNavigation';
import { NavigationSection } from '../navigation/Navigation';
import { Button } from '../buttons/button/Button';
import { ThemeButton } from '../buttons/theme/ThemeButton';
import { useAvatarUrl } from '../../hooks/useAvatarUrl';

export interface HeaderProps {
  logoImgSrc: string;
  sections: NavigationSection[];
  desktopLinks?: NavigationSection['links'];
  title?: string;
  className?: string;
  searchPlaceholder?: string;
  isAuthenticated?: boolean;
  email?: string;
}

const COOKIE_NAME = 'theme';

export function Header({
  title,
  sections,
  logoImgSrc = '/logo.svg',
  searchPlaceholder = 'Search',
  desktopLinks,
  className,
  isAuthenticated,
  email,
}: HeaderProps) {
  const { isScrolled } = useScroll();
  const [isSearchFocused, setSearchFocused] = useState(false);
  const [isMobileSearchFocused, setMobileSearchFocused] = useState(false);
  const [theme, setTheme] = useState('light');
  const avatarUrl = useAvatarUrl(email);

  useEffect(() => {
    const theme = getCookie(COOKIE_NAME) ?? 'light';
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
  // Use type assertion to fix typing issue
  const headerRef = useRef<HTMLElement>(null);
  // @ts-expect-error - Type compatibility issue with the usehooks-ts library
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
          'sticky top-0 z-50 flex flex-wrap items-center justify-between bg-white px-4 py-1 shadow-md shadow-slate-900/5 transition duration-500 sm:px-6 lg:px-8 dark:shadow-2xl',
          className,
          isScrolled
            ? 'dark:bg-slate-900/95 dark:backdrop-blur dark:[@supports(backdrop-filter:blur(0))]:bg-slate-900/75'
            : 'dark:bg-slate-900/95'
        )}
      >
        <div className="flex w-full flex-wrap items-center justify-between">
          <div className="mr-6 flex lg:hidden">
            <MobileNavigation sections={sections} logoImgSrc={logoImgSrc} />
          </div>
          <div className="relative flex flex-grow items-center md:flex-[0.2_0_auto]">
            <Link
              to="/"
              aria-label="Home page"
              className="flex flex-row items-center justify-center gap-x-3 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
            >
              <img
                alt="Logo"
                src={logoImgSrc}
                className="h-10 w-auto rounded-full fill-slate-700 dark:fill-sky-100"
              />
              <h1 className="text-dark-gray dark:text-dark my-4 hidden text-center text-3xl font-bold lg:block">
                {title}
              </h1>
            </Link>
          </div>
          <div className="hidden flex-1 md:block">
            <Search
              placeholder={searchPlaceholder}
              onFocus={openSearch}
              onBlur={onCloseSearch}
            />
          </div>
          <div className="relative flex justify-end sm:gap-0 md:flex-[0.2_0_auto] md:gap-0">
            <ul className="list-reset hidden flex-1 items-center justify-end xl:flex">
              {desktopLinks?.map((link) => (
                <li className="mr-3" key={link.href}>
                  <Link
                    className="dark:text-dark inline-block px-4 py-2 text-gray-800 no-underline"
                    to={link.href}
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
            {!isMobileSearchFocused && (
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring' }}
                onClick={openMobileSearch}
                type="button"
                className="inline-flex flex-shrink-0 items-center p-2.5 focus:outline-none md:hidden"
              >
                <MagnifyingGlassIcon
                  className="dark:text-dark h-5 w-5 text-black"
                  aria-hidden="true"
                />
                <span className="sr-only">Open Search</span>
              </motion.button>
            )}
            <ShoppingCartDrawer />
            <ThemeButton theme={theme} onChange={onThemeChange} className="h-8 w-8" />
            {isAuthenticated ? (
              <Menu as="div" className="relative ml-3 mt-2">
                <div>
                  <MenuButton className="relative flex rounded-full bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800">
                    <span className="absolute -inset-1.5" />
                    <span className="sr-only">Open user menu</span>
                    <img
                      alt="Avatar"
                      src={avatarUrl}
                      className="h-8 w-8 rounded-full"
                    />
                  </MenuButton>
                </div>
                <MenuItems
                  transition
                  className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
                >
                  <MenuItem>
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100"
                    >
                      Your Profile
                    </Link>
                  </MenuItem>
                  <MenuItem>
                    <Link
                      to="/admin"
                      className="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100"
                    >
                      Admin
                    </Link>
                  </MenuItem>
                  <MenuItem>
                    <Link
                      to="/logout"
                      className="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100"
                    >
                      Sign out
                    </Link>
                  </MenuItem>
                </MenuItems>
              </Menu>
            ) : (
              <Link
                to="/login"
                className="ml-6 btn btn-secondary dark:text-white dark:btn-accent dark:bg-purple-600 dark:hover:bg-indigo-700"
              >
                Log in
              </Link>
            )}
          </div>
        </div>
        {isMobileSearchFocused && (
          <motion.div
            key="search"
            initial="collapsed"
            animate="open"
            className="flex flex-1 flex-row md:hidden"
            variants={{
              open: { opacity: 1, height: 'auto' },
              collapsed: { opacity: 0, height: 0 },
            }}
            transition={{ duration: 0.8, ease: [0.04, 0.62, 0.23, 0.98] }}
          >
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
              className="inline-flex flex-none flex-shrink-0 items-center p-2 focus:outline-none"
            >
              <XMarkIcon
                className="text-dark-gray dark:text-dark h-7 w-7"
                aria-hidden="true"
              />
              <span className="sr-only">Close Search</span>
            </Button>
          </motion.div>
        )}
      </header>
      {(isSearchFocused || isMobileSearchFocused) && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black bg-opacity-75 transition-opacity dark:bg-slate-900/95 dark:bg-opacity-40 dark:backdrop-blur dark:[@supports(backdrop-filter:blur(0))]:bg-slate-900/75"
        />
      )}
    </AnimatePresence>
  );
}

export default Header;
