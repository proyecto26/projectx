import { defineQuery, defineSignal, setHandler } from "@temporalio/workflow";

/**
 * `useState` is a utility function designed to manage state within Temporal workflows.
 * It provides a mechanism similar to React's `useState`, allowing workflows to handle
 * state updates and retrievals through Temporal's Signals and Queries.
 *
 * **Temporal Concepts Utilized:**
 * - **Signals:** Allows external entities to send asynchronous events to workflows to
 *   modify their state.
 * - **Queries:** Enables external entities to retrieve the current state of workflows
 *   without altering them.
 *
 * **Function Overview:**
 * - **Parameters:**
 *   - `name` (string): A unique identifier for the state, used to define corresponding
 *     Signal and Query handlers.
 *   - `initialValue` (T, optional): The initial value of the state upon workflow start.
 *
 * - **Returns:**
 *   An object containing:
 *   - `signal`: The Signal handler to update the state externally.
 *   - `query`: The Query handler to retrieve the current state.
 *   - `value`: A getter and setter for the state value within the workflow.
 *   - `getValue`: A method to retrieve the current state value.
 *   - `setValue`: A method to update the state value.
 *
 * @template T The type of the state value.
 *
 * @param {string} name - The unique name identifier for the state, used to register Signal and Query handlers.
 * @param {T} [initialValue] - The initial value of the state when the workflow starts (optional).
 *
 * @returns {{
 *   signal: SignalHandler<T>;
 *   query: QueryHandler<T>;
 *   value: T;
 *   getValue: () => T;
 *   setValue: (newValue: T) => void;
 * }} An object containing Signal and Query handlers, along with state accessors.
 *
 * @example
 * ```typescript
 * // Import the useState function
 * import { useState } from './state';
 *
 * // Define a counter state with an initial value of 0
 * const counter = useState<number>('counter', 0);
 *
 * // Updating the counter from outside the workflow using a Signal
 * await workflowClient.signal(workflowId, 'counter', 5);
 *
 * // Querying the current counter value from outside the workflow
 * const currentValue = await workflowClient.query(workflowId, 'counter');
 * console.log(currentValue); // Outputs: 5
 * ```
 */
export function useState<T>(name: string, initialValue?: T) {
  // Define a Temporal Signal handler for updating the state externally
  const signal = defineSignal<[T]>(name);

  // Define a Temporal Query handler for retrieving the current state
  const query = defineQuery<T>(name);

  // Initialize the state with the provided initial value
  let value = initialValue as T;

  // Set up the Signal handler to update the state when a Signal is received
  setHandler(signal, (newValue: T) => {
    value = newValue;
  });

  // Set up the Query handler to return the current state when a Query is made
  setHandler(query, () => value);

  return {
    signal,
    query,
    /**
     * Getter for the current value of the state.
     */
    get value() {
      return value;
    },
    /**
     * Setter for updating the state value.
     * @param newValue - The new value to set.
     */
    set value(newValue: T) {
      value = newValue;
    },
    /**
     * Retrieves the current value of the state.
     * @returns The current state value.
     */
    getValue: () => value,
    /**
     * Updates the state with a new value.
     * @param newValue - The new value to set.
     */
    setValue: (newValue: T) => {
      value = newValue;
    },
  };
}
