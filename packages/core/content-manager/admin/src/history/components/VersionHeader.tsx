import { useQueryParams } from '@strapi/admin/strapi-admin';
import { BaseHeaderLayout, Button, Typography } from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2';
import { ArrowLeft } from '@strapi/icons';
import { stringify } from 'qs';
import { useIntl } from 'react-intl';
import { NavLink, useParams, type To } from 'react-router-dom';

import { COLLECTION_TYPES } from '../../constants/collections';
import { useHistoryContext } from '../pages/History';
import { useRestoreVersionMutation } from '../services/historyVersion';

interface VersionHeaderProps {
  headerId: string;
}

export const VersionHeader = ({ headerId }: VersionHeaderProps) => {
  const { formatMessage, formatDate } = useIntl();
  const { version, mainField, schema } = useHistoryContext('VersionHeader', (state) => ({
    version: state.selectedVersion,
    mainField: state.mainField,
    schema: state.schema,
  }));
  const [{ query }] = useQueryParams<{
    plugins?: Record<string, unknown>;
  }>();
  const { collectionType } = useParams<{ collectionType: string }>();
  const [restoreVersion] = useRestoreVersionMutation();

  const mainFieldValue = version.data[mainField];

  const getBackLink = (): To => {
    const pluginsQueryParams = stringify({ plugins: query.plugins }, { encode: false });

    if (collectionType === COLLECTION_TYPES) {
      return {
        pathname: `../${collectionType}/${version.contentType}/${version.relatedDocumentId}`,
        search: pluginsQueryParams,
      };
    }

    return {
      pathname: `../${collectionType}/${version.contentType}`,
      search: pluginsQueryParams,
    };
  };

  const handleRestore = async () => {
    await restoreVersion({
      params: { versionId: version.id },
      body: { contentType: version.contentType },
    });
  };

  return (
    <BaseHeaderLayout
      id={headerId}
      title={formatDate(new Date(version.createdAt), {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      })}
      subtitle={
        <Typography textColor="neutral600" variant="epsilon">
          {formatMessage(
            {
              id: 'content-manager.history.version.subtitle',
              defaultMessage:
                '{hasLocale, select, true {{subtitle}, in {locale}} other {{subtitle}}}',
            },
            {
              hasLocale: Boolean(version.locale),
              subtitle: `${mainFieldValue || ''} (${schema.info.singularName})`.trim(),
              locale: version.locale?.name,
            }
          )}
        </Typography>
      }
      navigationAction={
        <Link
          startIcon={<ArrowLeft />}
          as={NavLink}
          // @ts-expect-error - types are not inferred correctly through the as prop.
          to={getBackLink()}
        >
          {formatMessage({
            id: 'global.back',
            defaultMessage: 'Back',
          })}
        </Link>
      }
      sticky={false}
      primaryAction={<Button onClick={handleRestore}>Restore</Button>}
    />
  );
};