import { RenderAdminArgs, renderAdmin } from '@strapi/admin/strapi-admin';
// @ts-expect-error – No types, yet.
import contentTypeBuilder from '@strapi/plugin-content-type-builder/strapi-admin';
import email from '@strapi/plugin-email/strapi-admin';
// @ts-expect-error – No types, yet.
import upload from '@strapi/plugin-upload/strapi-admin';

const render = (mountNode: HTMLElement | null, { plugins }: RenderAdminArgs) => {
  return renderAdmin(mountNode, {
    plugins: {
      'content-type-builder': contentTypeBuilder,
      // @ts-expect-error – TODO: fix this
      email,
      upload,
      ...plugins,
    },
  });
};

export { render as renderAdmin };
export type { RenderAdminArgs };
