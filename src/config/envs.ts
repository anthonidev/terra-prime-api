import * as dotenv from 'dotenv';
import * as joi from 'joi';
dotenv.config();
interface Envvars {
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  PORT: number;

  AWS_REGION: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_S3_BUCKET_NAME: string;

  AWS_SES_SMTP_USERNAME: string;
  AWS_SES_SMTP_PASSWORD: string;
  EMAIL_FROM: string;

  FRONTEND_URL: string;
  CLAUDE_API_KEY: string;

  PASSWORD_MASTER: string;
}
const envVarsSchema = joi
  .object({
    PORT: joi.number().default(3000),
    DB_HOST: joi.string().required(),
    DB_PORT: joi.number().required(),
    DB_NAME: joi.string().required(),
    DB_USERNAME: joi.string().required(),
    DB_PASSWORD: joi.string().required(),
    JWT_SECRET: joi.string().required(),
    JWT_REFRESH_SECRET: joi.string().required(),

    AWS_REGION: joi.string().required(),
    AWS_ACCESS_KEY_ID: joi.string().required(),
    AWS_SECRET_ACCESS_KEY: joi.string().required(),
    AWS_S3_BUCKET_NAME: joi.string().required(),

    AWS_SES_SMTP_USERNAME: joi.string().required(),
    AWS_SES_SMTP_PASSWORD: joi.string().required(),
    EMAIL_FROM: joi.string().email().required(),

    FRONTEND_URL: joi.string().uri().required(),
    CLAUDE_API_KEY: joi.string().required(),
    PASSWORD_MASTER: joi.string().required(),
  })
  .unknown(true);
const { error, value } = envVarsSchema.validate({
  ...process.env,
});
if (error) {
  console.log(error);
  throw new Error(`Config validation error: ${error.message}`);
}
const envVars: Envvars = value;
export const envs = {
  dbHost: envVars.DB_HOST,
  dbPort: envVars.DB_PORT,
  dbName: envVars.DB_NAME,
  dbUsername: envVars.DB_USERNAME,
  dbPassword: envVars.DB_PASSWORD,
  port: envVars.PORT,
  jwtSecret: envVars.JWT_SECRET,
  jwtRefreshSecret: envVars.JWT_REFRESH_SECRET,

  awsRegion: envVars.AWS_REGION,
  awsAccessKeyId: envVars.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
  awsS3BucketName: envVars.AWS_S3_BUCKET_NAME,

  awsSesSmtpUsername: envVars.AWS_SES_SMTP_USERNAME,
  awsSesSmtpPassword: envVars.AWS_SES_SMTP_PASSWORD,
  emailFrom: envVars.EMAIL_FROM,

  frontendUrl: envVars.FRONTEND_URL,
  claudeApiKey: envVars.CLAUDE_API_KEY,
  passwordMaster: envVars.PASSWORD_MASTER,
};
