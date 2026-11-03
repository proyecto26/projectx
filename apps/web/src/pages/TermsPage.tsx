import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { NavLink } from "react-router";

interface Section {
  number: number;
  title: string;
  content: string;
}

const sections: Section[] = [
  {
    number: 1,
    title: "Acceptance of Terms",
    content:
      "By creating an account or using ProjectX, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree, you must not use our platform. We reserve the right to modify these Terms at any time, and your continued use constitutes acceptance of any changes.",
  },
  {
    number: 2,
    title: "Account Registration",
    content:
      "To access certain features, you must register for an account. You agree to provide accurate, current, and complete information during registration and keep your account information updated. You are responsible for safeguarding your password and for all activities that occur under your account.",
  },
  {
    number: 3,
    title: "Marketplace Conduct",
    content:
      "Users agree not to engage in fraudulent activities, sell prohibited items, manipulate reviews or ratings, harass other users, or violate any applicable laws. ProjectX reserves the right to suspend or terminate accounts that violate these guidelines.",
  },
  {
    number: 4,
    title: "Payments & Transactions",
    content:
      "All payments are processed securely through Stripe. Buyers agree to pay the listed price plus applicable taxes and shipping. Sellers receive payment after order confirmation and delivery, subject to our payment schedule. Refunds are handled according to our Refund Policy.",
  },
  {
    number: 5,
    title: "Intellectual Property",
    content:
      "All content on ProjectX, including logos, designs, text, and software, is the property of ProjectX or its licensors. Sellers retain ownership of their product listings but grant ProjectX a license to display and promote their content on the platform.",
  },
  {
    number: 6,
    title: "Limitation of Liability",
    content:
      "ProjectX provides the platform 'as is' and makes no warranties regarding the quality of products sold by third-party sellers. To the maximum extent permitted by law, ProjectX shall not be liable for indirect, incidental, or consequential damages arising from the use of our services.",
  },
  {
    number: 7,
    title: "Contact Information",
    content:
      "If you have questions about these Terms, please contact us at legal@projectx.com or through our Help Center.",
  },
];

export function TermsPage() {
  return (
    <motion.div
      className="min-h-screen bg-white dark:bg-gray-950"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-8 lg:px-[120px]">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-1.5 text-slate-500 text-sm dark:text-slate-400">
          <NavLink
            to="/"
            className="transition-colors hover:text-slate-900 dark:hover:text-white"
          >
            Home
          </NavLink>
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
          <span className="text-slate-900 dark:text-white">Terms of Use</span>
        </nav>

        {/* Page Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          <h1
            className="font-bold text-slate-900 dark:text-white"
            style={{ fontSize: "36px", letterSpacing: "-1px" }}
          >
            Terms of Use
          </h1>
          <p
            className="mt-2 text-slate-500 dark:text-slate-400"
            style={{ fontSize: "14px" }}
          >
            Last updated: February 25, 2026
          </p>
        </motion.div>

        {/* Intro paragraph */}
        <motion.p
          className="mb-10 text-slate-900 dark:text-slate-100"
          style={{ fontSize: "15px", lineHeight: "1.7" }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          Welcome to ProjectX. By accessing or using our marketplace platform,
          you agree to be bound by these Terms of Use. Please read them
          carefully before using our services.
        </motion.p>

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((section, index) => (
            <motion.section
              key={section.number}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 + index * 0.05 }}
            >
              <h2
                className="mb-3 font-semibold text-slate-900 dark:text-white"
                style={{ fontSize: "20px" }}
              >
                {section.number}. {section.title}
              </h2>
              <p
                className="text-slate-500 dark:text-slate-400"
                style={{ fontSize: "15px", lineHeight: "1.7" }}
              >
                {section.content}
              </p>
            </motion.section>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12">
          <hr className="border-slate-200 dark:border-slate-800" />
          <p
            className="mt-6 text-slate-500 dark:text-slate-400"
            style={{ fontSize: "14px" }}
          >
            &copy; {new Date().getFullYear()} ProjectX. All rights reserved.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default TermsPage;
