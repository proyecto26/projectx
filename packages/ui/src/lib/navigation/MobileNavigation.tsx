/** biome-ignore-all lint/correctness/useExhaustiveDependencies: Close dialog when location changes */
import { Dialog, DialogPanel } from "@headlessui/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link, useNavigation } from "react-router-dom";

import CloseIcon from "../icons/Close";
import MenuIcon from "../icons/Menu";
import { Navigation, type NavigationSection } from "./Navigation";

export type MobileNavigationProps = {
  sections: NavigationSection[];
  logoImgSrc: string;
};

export function MobileNavigation({
  sections,
  logoImgSrc,
}: MobileNavigationProps) {
  const { location } = useNavigation();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setIsOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="relative"
        aria-label="Open navigation"
      >
        <MenuIcon className="h-6 w-6 stroke-slate-500" />
      </button>
      <AnimatePresence>
        {isOpen && (
          <Dialog
            static
            as={motion.div}
            open={isOpen}
            initial={false}
            onClose={setIsOpen}
            className="fixed inset-0 z-50 flex items-start overflow-y-auto bg-slate-900/50 pr-10 backdrop-blur lg:hidden"
            aria-label="Navigation"
          >
            <DialogPanel
              as={motion.div}
              variants={{
                open: (height = 1000) => ({
                  clipPath: `circle(${height * 2 + 200}px at 40px 40px)`,
                  transition: {
                    type: "spring",
                    stiffness: 20,
                    restDelta: 2,
                  },
                }),
                closed: {
                  clipPath: "circle(30px at 40px 40px)",
                  transition: {
                    delay: 0.5,
                    type: "spring",
                    stiffness: 400,
                    damping: 40,
                  },
                },
              }}
              initial="closed"
              animate="open"
              exit="closed"
              className="min-h-full w-full max-w-xs bg-white px-4 pt-[0.6rem] pb-12 sm:px-6 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close navigation"
                >
                  <CloseIcon className="h-6 w-6 stroke-slate-500" />
                </button>
                <Link to="/" aria-label="Home page">
                  <img
                    alt="Logo"
                    src={logoImgSrc}
                    className="h-9 w-9 rounded-full fill-slate-700 dark:fill-sky-100"
                  />
                </Link>
              </div>
              <Navigation className="mt-5 px-1" sections={sections} />
            </DialogPanel>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
}
