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
    title: "Information We Collect",
    content:
      "We collect information you provide directly, including name, email address, shipping address, payment information, and phone number. We also automatically collect device information, IP address, browser type, pages visited, and interaction data through cookies and similar technologies.",
  },
  {
    number: 2,
    title: "How We Use Your Information",
    content:
      "We use your information to process transactions, manage your account, send order updates, improve our services, personalize your experience, detect and prevent fraud, and comply with legal obligations. We may also use your data for marketing communications, which you can opt out of at any time.",
  },
  {
    number: 3,
    title: "Information Sharing",
    content:
      "We do not sell your personal information. We may share data with payment processors (Stripe), shipping carriers, analytics providers, and law enforcement when required. Sellers receive only the information necessary to fulfill orders.",
  },
  {
    number: 4,
    title: "Data Security",
    content:
      "We implement industry-standard security measures including encryption, secure servers, and regular security audits. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security of your data.",
  },
  {
    number: 5,
    title: "Cookies & Tracking",
    content:
      "We use cookies and similar tracking technologies to enhance your browsing experience, analyze site traffic, and personalize content. You can control cookie preferences through your browser settings. Disabling cookies may limit some platform features.",
  },
  {
    number: 6,
    title: "Your Rights",
    content:
      "You have the right to access, correct, or delete your personal data. You may also request data portability or restrict processing. To exercise these rights, contact us at privacy@projectx.com. We will respond to your request within 30 days.",
  },
  {
    number: 7,
    title: "Contact Us",
    content:
      "For privacy-related questions or concerns, contact our Data Protection Officer at privacy@projectx.com or through the Help Center in your account settings.",
  },
];

export function PrivacyPage() {
  return (
    <motion.div
      className="min-h-screen bg-gray-50 dark:bg-gray-900"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8 lg:px-[120px]">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-gray-500 text-sm dark:text-gray-400">
          <NavLink
            to="/"
            className="transition-colors hover:text-gray-900 dark:hover:text-gray-100"
          >
            Home
          </NavLink>
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
          <span className="font-medium text-gray-900 dark:text-gray-100">
            Privacy Policy
          </span>
        </nav>

        {/* Page Header */}
        <div className="mb-10">
          <h1
            className="font-bold text-slate-900 dark:text-white"
            style={{ fontSize: "36px", letterSpacing: "-1px" }}
          >
            Privacy Policy
          </h1>
          <p
            className="mt-2 text-slate-500 dark:text-slate-400"
            style={{ fontSize: "14px" }}
          >
            Last updated: February 25, 2026
          </p>
        </div>

        {/* Intro paragraph */}
        <p
          className="mb-10 text-slate-900 leading-[1.7] dark:text-slate-100"
          style={{ fontSize: "15px" }}
        >
          At ProjectX, we take your privacy seriously. This Privacy Policy
          explains how we collect, use, disclose, and safeguard your information
          when you use our marketplace platform.
        </p>

        {/* Sections */}
        <div className="space-y-10">
          {sections.map((section, index) => (
            <motion.section
              key={section.number}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <h2
                className="mb-3 font-semibold text-slate-900 dark:text-white"
                style={{ fontSize: "20px" }}
              >
                {section.number}. {section.title}
              </h2>
              <p
                className="text-slate-500 leading-[1.7] dark:text-slate-400"
                style={{ fontSize: "15px" }}
              >
                {section.content}
              </p>
            </motion.section>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-16">
          <hr className="border-gray-200 dark:border-gray-700" />
          <p
            className="mt-6 text-center text-slate-500 dark:text-slate-400"
            style={{ fontSize: "14px" }}
          >
            &copy; {new Date().getFullYear()} ProjectX. All rights reserved.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default PrivacyPage;
