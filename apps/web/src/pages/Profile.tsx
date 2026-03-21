import { Button } from "@projectx/ui";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  CheckCircle,
  MapPin,
  Pencil,
  Plus,
  Shield,
  Trash2,
  User,
} from "lucide-react";
import { type ChangeEvent, type FormEvent, useState } from "react";

import { useAuth } from "@/providers";

type Tab = "profile" | "addresses" | "notifications" | "security";

interface Address {
  id: string;
  label: string;
  line1: string;
  line2: string;
  isDefault: boolean;
}

interface ProfileFormData {
  firstName: string;
  lastName: string;
  phone: string;
}

const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "profile", label: "Profile", icon: <User className="h-4 w-4" /> },
  {
    id: "addresses",
    label: "Addresses",
    icon: <MapPin className="h-4 w-4" />,
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: <Bell className="h-4 w-4" />,
  },
  { id: "security", label: "Security", icon: <Shield className="h-4 w-4" /> },
];

const SAMPLE_ADDRESSES: Address[] = [
  {
    id: "1",
    label: "Home",
    line1: "123 Main Street",
    line2: "San Francisco, CA 94102, US",
    isDefault: true,
  },
  {
    id: "2",
    label: "Work",
    line1: "456 Market Street, Suite 200",
    line2: "San Francisco, CA 94105, US",
    isDefault: false,
  },
];

const inputClass =
  "mt-1 block w-full rounded-md border border-(--input-border) bg-(--input) px-3 py-2 text-(--foreground) shadow-sm focus:border-(--primary) focus:outline-none focus:ring-2 focus:ring-(--primary) sm:text-sm";

const readonlyInputClass =
  "mt-1 block w-full rounded-md border border-(--border) bg-(--muted) px-3 py-2 text-(--muted-foreground) shadow-sm sm:text-sm";

const labelClass = "block text-sm font-medium text-(--foreground)";

function SavedAddressesCard() {
  const [addresses, setAddresses] = useState<Address[]>(SAMPLE_ADDRESSES);

  const handleRemove = (id: string) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="rounded-xl border border-(--border) bg-(--card)">
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <div>
          <h2 className="font-semibold text-(--foreground) text-lg">
            Saved Addresses
          </h2>
          <p className="mt-0.5 text-(--muted-foreground) text-sm">
            Manage your shipping and billing addresses
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-(--border) bg-(--card) px-3 py-1.5 font-medium text-(--foreground) text-sm shadow-sm hover:bg-(--muted)"
        >
          <Plus className="h-4 w-4" />
          Add address
        </button>
      </div>
      <hr className="border-(--border)" />
      <div className="divide-y divide-(--border) px-6">
        {addresses.length === 0 && (
          <p className="py-6 text-center text-(--muted-foreground) text-sm">
            No saved addresses yet.
          </p>
        )}
        {addresses.map((address) => (
          <div
            key={address.id}
            className="flex items-start justify-between py-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-(--foreground) text-sm">
                  {address.label}
                </span>
                {address.isDefault && (
                  <span className="inline-flex items-center rounded-full bg-(--success-muted) px-2 py-0.5 font-medium text-(--success) text-xs">
                    Default
                  </span>
                )}
              </div>
              <p className="text-(--muted-foreground) text-sm">
                {address.line1}
              </p>
              <p className="text-(--muted-foreground) text-sm">
                {address.line2}
              </p>
            </div>
            <div className="ml-4 flex shrink-0 items-center gap-3">
              <button
                type="button"
                className="font-medium text-(--primary) text-sm hover:text-(--primary)"
              >
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </button>
              <button
                type="button"
                onClick={() => handleRemove(address.id)}
                className="font-medium text-(--destructive) text-sm hover:text-(--destructive)"
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Remove</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileTab({ email }: { email: string }) {
  const [form, setForm] = useState<ProfileFormData>({
    firstName: "",
    lastName: "",
    phone: "",
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    console.log("Profile saved:", { ...form, email });
  };

  return (
    <div className="space-y-6">
      {/* Personal Information Card */}
      <div className="rounded-xl border border-(--border) bg-(--card)">
        <div className="px-6 pt-6 pb-4">
          <h2 className="font-semibold text-(--foreground) text-lg">
            Personal Information
          </h2>
          <p className="mt-0.5 text-(--muted-foreground) text-sm">
            Update your name and contact details
          </p>
        </div>
        <hr className="border-(--border)" />
        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          {/* Name row */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="firstName" className={labelClass}>
                First Name
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={form.firstName}
                onChange={handleChange}
                placeholder="Enter first name"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="lastName" className={labelClass}>
                Last Name
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={form.lastName}
                onChange={handleChange}
                placeholder="Enter last name"
                className={inputClass}
              />
            </div>
          </div>

          {/* Email (read-only) */}
          <div>
            <label htmlFor="email" className={labelClass}>
              Email Address
            </label>
            <div className="relative">
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                readOnly
                className={readonlyInputClass}
              />
              <span className="absolute top-1/2 right-3 inline-flex -translate-y-1/2 items-center gap-1 rounded-full bg-(--success-muted) px-2 py-0.5 font-medium text-(--success) text-xs">
                <CheckCircle className="h-3 w-3" />
                Verified
              </span>
            </div>
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className={labelClass}>
              Phone Number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              placeholder="+1 (555) 000-0000"
              className={inputClass}
            />
          </div>

          {/* Save button */}
          <div className="pt-2">
            <Button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-(--primary) px-4 py-2 font-medium text-sm text-white shadow-sm hover:bg-(--primary) hover:opacity-90 focus:outline-none focus:ring-(--primary) focus:ring-2 focus:ring-offset-2"
            >
              Save changes
            </Button>
          </div>
        </form>
      </div>

      {/* Saved Addresses Card */}
      <SavedAddressesCard />
    </div>
  );
}

function AddressesTab() {
  return <SavedAddressesCard />;
}

function NotificationsTab() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-(--border) bg-(--card) px-6 py-16 text-center">
      <Bell className="h-10 w-10 text-(--muted-foreground)" />
      <p className="mt-4 font-medium text-(--foreground) text-base">
        Notification preferences coming soon
      </p>
      <p className="mt-1 text-(--muted-foreground) text-sm">
        You'll be able to manage your email and push notification settings here.
      </p>
    </div>
  );
}

function SecurityTab() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-(--border) bg-(--card) px-6 py-16 text-center">
      <Shield className="h-10 w-10 text-(--muted-foreground)" />
      <p className="mt-4 font-medium text-(--foreground) text-base">
        Security settings coming soon
      </p>
      <p className="mt-1 text-(--muted-foreground) text-sm">
        Password changes, two-factor authentication, and active sessions will
        appear here.
      </p>
    </div>
  );
}

export function ProfilePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  const email = user?.email ?? "";

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return <ProfileTab email={email} />;
      case "addresses":
        return <AddressesTab />;
      case "notifications":
        return <NotificationsTab />;
      case "security":
        return <SecurityTab />;
    }
  };

  return (
    <div className="min-h-screen bg-(--surface)">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="font-bold text-(--foreground) text-[28px]">
            Account Settings
          </h1>
          <p className="mt-1 text-(--muted-foreground) text-[15px]">
            Manage your profile, addresses, and preferences
          </p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar - hidden on mobile */}
          <aside className="hidden w-[220px] shrink-0 md:block">
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 font-medium text-sm transition-colors ${
                      isActive
                        ? "bg-(--accent) text-(--accent-foreground)"
                        : "text-(--muted-foreground) hover:bg-(--muted) hover:text-(--foreground)"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Mobile tab bar */}
          <div className="w-full md:hidden">
            <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg border border-(--border) bg-(--card) p-1">
              {NAV_ITEMS.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 font-medium text-sm transition-colors ${
                      isActive
                        ? "bg-(--accent) text-(--accent-foreground)"
                        : "text-(--muted-foreground) hover:text-(--foreground)"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Mobile content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Desktop main content */}
          <div className="hidden min-w-0 flex-1 md:block">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
