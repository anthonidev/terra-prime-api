import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { envs } from '../config/envs';
import { EmailOptions, EmailResponse } from './interfaces/email-options.interface';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly defaultFrom: string;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'email-smtp.us-east-2.amazonaws.com',
      port: 587,
      secure: false,
      auth: {
        user: envs.awsSesSmtpUsername,
        pass: envs.awsSesSmtpPassword,
      },
    });

    this.defaultFrom = envs.emailFrom;
  }

  async sendEmail(options: EmailOptions): Promise<EmailResponse> {
    try {
      const {
        to,
        subject,
        text,
        html,
        cc,
        bcc,
        replyTo,
        from = this.defaultFrom,
      } = options;

      if (!to || (Array.isArray(to) && to.length === 0)) {
        throw new Error('El campo "to" es requerido');
      }

      if (!subject) {
        throw new Error('El campo "subject" es requerido');
      }

      if (!text && !html) {
        throw new Error('Debe proporcionar al menos "text" o "html"');
      }

      const toAddresses = Array.isArray(to) ? to.join(', ') : to;
      const ccAddresses = cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined;
      const bccAddresses = bcc ? (Array.isArray(bcc) ? bcc.join(', ') : bcc) : undefined;

      const mailOptions: nodemailer.SendMailOptions = {
        from: from,
        to: toAddresses,
        cc: ccAddresses,
        bcc: bccAddresses,
        subject: subject,
        text: text,
        html: html,
        replyTo: replyTo,
      };

      const result = await this.transporter.sendMail(mailOptions);

      this.logger.log(
        `Email sent successfully to ${toAddresses} with MessageId: ${result.messageId}`,
      );

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send email: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }

  async verifyConfiguration(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP configuration is valid');
      return true;
    } catch (error) {
      this.logger.error('SMTP configuration error:', error.message);
      return false;
    }
  }
}