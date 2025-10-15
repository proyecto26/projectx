import { Button } from "@projectx/ui";
import { MapPin, Phone, User } from "lucide-react";
import { type ChangeEvent, type FormEvent, useState } from "react";

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
  });
  const [avatarUrl, setAvatarUrl] = useState<string>(
    "/placeholder.svg?height=100&width=100",
  );

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    console.log("Profile updated:", profile);
    alert("Profile updated successfully!");
  };

  return (
    <div className="container mx-auto bg-gray-100 p-4 dark:bg-gray-900">
      <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-lg dark:bg-gray-800">
        {/* Card Header */}
        <div className="border-gray-200 border-b p-6 dark:border-gray-700">
          <h2 className="font-bold text-2xl text-gray-900 dark:text-gray-100">
            Your Profile
          </h2>
          <p className="mt-1 text-gray-600 text-sm dark:text-gray-400">
            View and update your account information
          </p>
        </div>

        {/* Card Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Avatar Section 
          src={avatarUrl}*/}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative h-32 w-32 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                {avatarUrl ? (
                  <img
                    src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <User className="h-16 w-16 text-gray-400 dark:text-gray-500" />
                  </div>
                )}
              </div>
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="avatar-upload"
                />
                <label
                  htmlFor="avatar-upload"
                  className="inline-flex cursor-pointer items-center rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 text-sm shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:focus:ring-indigo-500 dark:hover:bg-gray-600"
                >
                  Upload New Picture
                </label>
              </div>
            </div>

            {/* Personal Information */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="firstName"
                  className="block font-medium text-gray-700 text-sm dark:text-gray-300"
                >
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={profile.firstName}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="lastName"
                  className="block font-medium text-gray-700 text-sm dark:text-gray-300"
                >
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={profile.lastName}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block font-medium text-gray-700 text-sm dark:text-gray-300"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={profile.email}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="phone"
                  className="block font-medium text-gray-700 text-sm dark:text-gray-300"
                >
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="-translate-y-1/2 absolute top-1/2 left-3 h-5 w-5 transform text-gray-400 dark:text-gray-500" />
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={profile.phone}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 pr-3 pl-10 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 text-lg dark:text-gray-300">
                Address
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="street"
                    className="block font-medium text-gray-700 text-sm dark:text-gray-300"
                  >
                    Street Address
                  </label>
                  <div className="relative">
                    <MapPin className="-translate-y-1/2 absolute top-1/2 left-3 h-5 w-5 transform text-gray-400 dark:text-gray-500" />
                    <input
                      id="street"
                      name="street"
                      type="text"
                      value={profile.street}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 pr-3 pl-10 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="city"
                    className="block font-medium text-gray-700 text-sm dark:text-gray-300"
                  >
                    City
                  </label>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    value={profile.city}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="state"
                    className="block font-medium text-gray-700 text-sm dark:text-gray-300"
                  >
                    State
                  </label>
                  <input
                    id="state"
                    name="state"
                    type="text"
                    value={profile.state}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="zipCode"
                    className="block font-medium text-gray-700 text-sm dark:text-gray-300"
                  >
                    ZIP Code
                  </label>
                  <input
                    id="zipCode"
                    name="zipCode"
                    type="text"
                    value={profile.zipCode}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label
                    htmlFor="country"
                    className="block font-medium text-gray-700 text-sm dark:text-gray-300"
                  >
                    Country
                  </label>
                  <input
                    id="country"
                    name="country"
                    type="text"
                    value={profile.country}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Card Footer */}
        <div className="border-gray-200 border-t bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-700">
          <Button
            type="submit"
            onClick={handleSubmit}
            className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 font-medium text-sm text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-indigo-700 dark:focus:ring-offset-gray-800 dark:hover:bg-indigo-800"
          >
            Update Profile
          </Button>
        </div>
      </div>
    </div>
  );
}
