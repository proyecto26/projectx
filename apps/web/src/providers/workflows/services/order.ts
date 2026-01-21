import type {
  CreateOrderDto,
  OrderCreateResponseDto,
  OrderStatusResponseDto,
} from "@projectx/models";
import axios from "axios";

export async function createOrder(
  accessToken: string,
  orderDto: CreateOrderDto,
): Promise<OrderCreateResponseDto> {
  const response = await axios.post<OrderCreateResponseDto>(
    `${window.ENV.ORDER_API_URL}/order`,
    orderDto,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  return response.data;
}

export async function getOrderStatus(
  accessToken: string,
  referenceId: string,
): Promise<OrderStatusResponseDto> {
  const response = await axios.get<OrderStatusResponseDto>(
    `${window.ENV.ORDER_API_URL}/order/status/${referenceId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  return response.data;
}

export async function cancelOrder(
  accessToken: string,
  referenceId: string,
): Promise<void> {
  await axios.delete(`${window.ENV.ORDER_API_URL}/order/${referenceId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
