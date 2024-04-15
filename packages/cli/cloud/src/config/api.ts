import { env } from '@strapi/utils';

export const apiConfig = {
  apiBaseUrl: env('STRAPI_CLI_CLOUD_API', 'https://cli.cloud.strapi.io'),
  dashboardBaseUrl: env('STRAPI_CLI_CLOUD_DASHBOARD', 'https://cloud.strapi.io'),
};
