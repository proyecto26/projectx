interface UniversalMock {
  (...args: unknown[]): UniversalMock;
  // biome-ignore lint/suspicious/noMisleadingInstantiator: This is a recursive mock that must be constructable
  new (...args: unknown[]): UniversalMock;
  [key: string]: UniversalMock;
}

function noop(..._args: unknown[]): unknown {
  // If called with 'new', it works as a constructor.
  // If called as a function (decorator factory or utility), return itself
  // to support chaining or being used as a base class.
  return noop;
}

// Ensure noop can be used as a constructor
Object.setPrototypeOf(noop, Function.prototype);
(noop as unknown as { prototype: unknown }).prototype = {};

const proxy = new Proxy(noop, {
  get: (_target, prop) => {
    if (prop === "__esModule") return true;
    if (prop === "default") return proxy;
    if (prop === "prototype")
      return (noop as unknown as { prototype: unknown }).prototype;
    return noop;
  },
  // In case the bundler or reflect-metadata checks for property presence
  has: () => true,
});

export = proxy as unknown as UniversalMock;
