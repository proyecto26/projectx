export interface GreetingActivities {
  greet(name: string): Promise<string>;
}

export class GreetingActivitiesService implements GreetingActivities {
  readonly prefix = "Hello";

  async greet(name: string) {
    // Uses `this`, so it fails unless the worker binds it to the instance.
    return `${this.prefix}, ${name}!`;
  }
}
