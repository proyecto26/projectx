import { getLoginEmailHtml, type LoginEmailData } from "./auth/login";
import {
  getOrderFailedEmailHtml,
  type OrderFailedEmailData,
} from "./order/orderFailed";
import {
  getOrderPendingEmailHtml,
  type OrderPendingEmailData,
} from "./order/orderPending";
import {
  getOrderSuccessEmailHtml,
  type OrderSuccessEmailData,
} from "./order/orderSuccess";
import { EmailTemplates } from "./template";

export type EmailTemplateDataMap = {
  [EmailTemplates.AuthLogin]: LoginEmailData;
  [EmailTemplates.OrderPending]: OrderPendingEmailData;
  [EmailTemplates.OrderSuccess]: OrderSuccessEmailData;
  [EmailTemplates.OrderFailed]: OrderFailedEmailData;
};

class EmailTemplateFactory {
  static createEmailTemplate<T extends EmailTemplates>(
    templateKey: EmailTemplates,
    data: EmailTemplateDataMap[T],
  ) {
    switch (templateKey) {
      case EmailTemplates.AuthLogin:
        return getLoginEmailHtml(data as LoginEmailData);
      case EmailTemplates.OrderPending:
        return getOrderPendingEmailHtml(data as OrderPendingEmailData);
      case EmailTemplates.OrderSuccess:
        return getOrderSuccessEmailHtml(data as OrderSuccessEmailData);
      case EmailTemplates.OrderFailed:
        return getOrderFailedEmailHtml(data as OrderFailedEmailData);
      default:
        return null;
    }
  }
}

export { EmailTemplateFactory };
