import { Button } from "@projectx/ui";
import { motion } from "framer-motion";
import type React from "react";

export const HomePage: React.FC = () => {
  return (
    <motion.div
      className="hero min-h-screen bg-base-200"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="hero-content text-center">
        <div className="max-w-md">
          <h1 className="font-bold text-5xl">Welcome to Our Website</h1>
          <p className="py-6">
            This is a sample home page using our new UI structure with DaisyUI
            and Framer Motion.
          </p>
          <div className="space-x-4">
            <Button>Get Started</Button>
            <Button variant="secondary">Learn More</Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default HomePage;
