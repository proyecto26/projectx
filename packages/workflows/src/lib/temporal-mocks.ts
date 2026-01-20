/**
 * This is a universal mock for backend-specific packages that are accidentally
 * pulled into Temporal Workflows. It uses a Proxy to return a no-op constructor/function
 * for any property access, preventing 'is not a function' or 'is not a constructor'
 * errors when decorators, utility functions, or base classes are evaluated.
 */
const noop: any = (..._args: any[]) => {
  // If called with 'new', it works as a constructor.
  // If called as a function (decorator factory or utility), return itself
  // to support chaining or being used as a base class.
  return noop;
};

// Ensure noop can be used as a constructor
Object.setPrototypeOf(noop, Function.prototype);
noop.prototype = {};

const proxy: any = new Proxy(noop, {
  get: (_target, prop) => {
    if (prop === "__esModule") return true;
    if (prop === "default") return proxy;
    if (prop === "prototype") return noop.prototype;
    return noop;
  },
  // In case the bundler or reflect-metadata checks for property presence
  has: () => true,
});

export = proxy;
