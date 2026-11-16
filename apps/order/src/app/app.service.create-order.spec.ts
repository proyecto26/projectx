import { BadRequestException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { type AuthUser, PRODUCT_UNAVAILABLE } from "@projectx/core";
import type { OrderRepositoryService } from "@projectx/db";
import type { CreateOrderDto } from "@projectx/models";
import type { StripeService } from "@projectx/payment";
import type { ClientService } from "@proyecto26/temporal-workflows";
import { WorkflowUpdateFailedError } from "@temporalio/client";
import {
  ActivityFailure,
  ApplicationFailure,
  RetryState,
} from "@temporalio/common";

import { AppService, unavailableProductIds } from "./app.service";

const user = { id: 1, email: "ada@example.com" } as AuthUser;
const order = {
  referenceId: "ref-1",
  items: [
    { productId: 7, quantity: 1 },
    { productId: 8, quantity: 2 },
  ],
} as CreateOrderDto;

function setup(unavailable: number[], update: jest.Mock) {
  const findUnavailableProductIds = jest.fn().mockResolvedValue(unavailable);
  const service = new AppService(
    { get: () => "orders" } as unknown as ConfigService,
    {
      client: { workflow: { executeUpdateWithStart: update } },
    } as unknown as ClientService,
    {} as unknown as StripeService,
    { findUnavailableProductIds } as unknown as OrderRepositoryService,
  );
  return { service, findUnavailableProductIds };
}

const rejectedUpdate = (productIds: number[]) =>
  new WorkflowUpdateFailedError(
    "Workflow Update failed",
    new ActivityFailure(
      "Activity task failed",
      "createOrder",
      "1",
      RetryState.NON_RETRYABLE_FAILURE,
      undefined,
      ApplicationFailure.nonRetryable(
        "These products aren't available: 8",
        PRODUCT_UNAVAILABLE,
        { productIds },
      ),
    ),
  );

async function badRequestBody(promise: Promise<unknown>) {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(BadRequestException);
  return (error as BadRequestException).getResponse();
}

describe("AppService.createOrder with products that can't be sold", () => {
  it("answers 400 before starting the workflow", async () => {
    const update = jest.fn();
    const { service, findUnavailableProductIds } = setup([8], update);

    const body = await badRequestBody(service.createOrder(user, order));

    expect(findUnavailableProductIds).toHaveBeenCalledWith([7, 8]);
    expect(update).not.toHaveBeenCalled();
    expect(body).toMatchObject({
      code: "PRODUCT_UNAVAILABLE",
      productIds: [8],
    });
  });

  it("answers the same 400 when the activity rejects the order", async () => {
    const update = jest.fn().mockRejectedValue(rejectedUpdate([8]));
    const { service } = setup([], update);

    const body = await badRequestBody(service.createOrder(user, order));

    expect(update).toHaveBeenCalledTimes(1);
    expect(body).toMatchObject({
      code: "PRODUCT_UNAVAILABLE",
      productIds: [8],
    });
  });

  it("keeps the generic answer for other failures", async () => {
    const update = jest.fn().mockRejectedValue(new Error("Temporal down"));
    const { service } = setup([], update);

    const body = await badRequestBody(service.createOrder(user, order));

    expect(body).toMatchObject({ message: "Error creating order" });
  });
});

describe("unavailableProductIds", () => {
  it("finds the failure through the update and activity wrappers", () => {
    expect(unavailableProductIds(rejectedUpdate([3, 4]))).toEqual([3, 4]);
  });

  it("ignores other application failures", () => {
    const other = ApplicationFailure.nonRetryable("Nope", "Other");
    expect(unavailableProductIds(other)).toBeUndefined();
  });
});
