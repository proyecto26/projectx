import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import SendGrid from "@sendgrid/mail";
import type { LoginEmailData } from "./auth/login";
import { PROJECT_NAME } from "./common";
import { EmailTemplates, getEmailTemplate } from "./template";

@Injectable()
export class EmailService {
  logger = new Logger(EmailService.name);
  readonly fromEmail: string;
  readonly fromName: string;
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>("email.apiKey");
    const fromEmail = this.configService.get<string>("email.fromEmail");
    const fromName = this.configService.get<string>("email.fromName");

    if (!apiKey || !fromEmail || !fromName) {
      throw new InternalServerErrorException("Email configuration is missing");
    }
    this.fromEmail = fromEmail;
    this.fromName = fromName;
    try {
      SendGrid.setApiKey(apiKey);
    } catch {
      throw new InternalServerErrorException("SendGrid API key is invalid");
    }
    this.logger.log("Email configuration is loaded");
  }

  async sendEmail(mail: SendGrid.MailDataRequired, template: EmailTemplates) {
    try {
      const transport = await SendGrid.send(mail);
      this.logger.log(`sendEmail(${template}) - Mail sent to ${mail.to}`);
      return transport;
    } catch (error) {
      this.logger.error(`send(${template}) - ${error}`);
      throw new InternalServerErrorException(error);
    }
  }

  async sendLoginEmail(data: LoginEmailData, email: string) {
    const html = getEmailTemplate(EmailTemplates.AuthLogin, data);
    if (!html) {
      throw new InternalServerErrorException("Email template not found");
    }
    return this.sendEmail(
      {
        to: email,
        subject: `${PROJECT_NAME} - Let's sign you up!`,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        html,
      },
      EmailTemplates.AuthLogin,
    );
  }
}
