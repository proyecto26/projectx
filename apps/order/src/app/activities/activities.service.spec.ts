import { PRODUCT_UNAVAILABLE } from "@projectx/core";
import { ProductUnavailableError } from "@projectx/models";
import { ApplicationFailure } from "@temporalio/common";

import type { OrderService } from "../order/order.service";
import { ActivitiesService } from "./activities.service";

const activitiesWith = (createOrder: jest.Mock) =>
  new ActivitiesService({ createOrder } as unknown as OrderService);

describe("ActivitiesService.createOrder", () => {
  it("turns unavailable products into a failure that isn't retried", async () => {
    const activities = activitiesWith(
      jest.fn().mockRejectedValue(new ProductUnavailableError([8, 9])),
    );

    const error = await activities.createOrder({} as never).then(
      () => undefined,
      (reason: unknown) => reason,
    );

    expect(error).toBeInstanceOf(ApplicationFailure);
    expect(error).toMatchObject({
      type: PRODUCT_UNAVAILABLE,
      nonRetryable: true,
      details: [{ productIds: [8, 9] }],
    });
  });

  it("lets other errors be retried", async () => {
    const failure = new Error("Database busy");
    const activities = activitiesWith(jest.fn().mockRejectedValue(failure));

    await expect(activities.createOrder({} as never)).rejects.toBe(failure);
  });
});
