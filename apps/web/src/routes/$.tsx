import { motion } from "framer-motion";
import {
  AlertCircle,
  HelpCircle,
  Home,
  MessageCircle,
  Search,
} from "lucide-react";
import { data, Link, type LoaderFunction } from "react-router";

export const loader: LoaderFunction = () => {
  return data(null, { status: 404 });
};

export default function NotFoundPage() {
  return (
    <motion.div
      className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-16 text-center"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Large 404 */}
      <motion.p
        className="select-none font-[800] text-[8rem] text-indigo-500/[0.12] leading-none tracking-[-4px] sm:text-[10rem] dark:text-indigo-400/[0.12]"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        aria-hidden="true"
      >
        404
      </motion.p>

      {/* Heading */}
      <motion.h1
        className="mt-2 font-bold text-[2rem] text-base-content tracking-[-0.5px]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        Page not found
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        className="mt-4 max-w-md text-center text-base text-base-content/60 leading-[1.6] dark:text-base-content/50"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        Sorry, we couldn&apos;t find the page you&apos;re looking for.
        <br />
        The page may have been moved, deleted, or never existed.
      </motion.p>

      {/* Action Buttons */}
      <motion.div
        className="mt-10 flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <Link
          to="/"
          className="btn btn-primary w-full gap-2 bg-indigo-600 text-white hover:bg-indigo-700 sm:w-auto dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          <Home className="h-4 w-4" />
          Back to Home
        </Link>

        <Link
          to="/marketplace"
          className="btn btn-outline w-full gap-2 border-indigo-500 text-indigo-600 hover:bg-indigo-50 sm:w-auto dark:border-indigo-400 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
        >
          <Search className="h-4 w-4" />
          Browse Products
        </Link>
      </motion.div>

      {/* Text Links */}
      <motion.div
        className="mt-10 flex items-center gap-8 text-base-content/50 text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.55 }}
      >
        <Link
          to="/help"
          className="flex items-center gap-1.5 transition-colors hover:text-indigo-500 dark:hover:text-indigo-400"
        >
          <HelpCircle className="h-4 w-4" />
          Help Center
        </Link>

        <Link
          to="/contact"
          className="flex items-center gap-1.5 transition-colors hover:text-indigo-500 dark:hover:text-indigo-400"
        >
          <MessageCircle className="h-4 w-4" />
          Contact Support
        </Link>

        <Link
          to="/report"
          className="flex items-center gap-1.5 transition-colors hover:text-indigo-500 dark:hover:text-indigo-400"
        >
          <AlertCircle className="h-4 w-4" />
          Report an Issue
        </Link>
      </motion.div>
    </motion.div>
  );
}
