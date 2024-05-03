import * as React from 'react';

import {
  useAPIErrorHandler,
  useNotification,
  useQueryParams,
  useRBAC,
} from '@strapi/admin/strapi-admin';
import { unstable_useDocumentLayout as useDocumentLayout } from '@strapi/content-manager/strapi-admin';
import {
  Box,
  Button,
  FieldLabel,
  Flex,
  SingleSelect,
  SingleSelectOption,
  EmptyStateLayout,
  LinkButton,
} from '@strapi/design-system';
import { Cursor } from '@strapi/icons';
import { EmptyDocuments } from '@strapi/icons/symbols';
import { isAxiosError } from 'axios';
import { useFormik } from 'formik';
import { useIntl } from 'react-intl';
import { Link as ReactRouterLink } from 'react-router-dom';
import * as yup from 'yup';

import { CreateReleaseAction } from '../../../shared/contracts/release-actions';
import { PERMISSIONS } from '../constants';
import { useCreateReleaseActionMutation, useGetReleasesForEntryQuery } from '../services/release';

import { ReleaseActionOptions } from './ReleaseActionOptions';

import type { DocumentActionComponent } from '@strapi/content-manager/strapi-admin';

/* -------------------------------------------------------------------------------------------------
 * AddActionToReleaseModal
 * -----------------------------------------------------------------------------------------------*/
export const RELEASE_ACTION_FORM_SCHEMA = yup.object().shape({
  type: yup.string().oneOf(['publish', 'unpublish']).required(),
  releaseId: yup.string().required(),
});

export interface FormValues {
  type: CreateReleaseAction.Request['body']['type'];
  releaseId: CreateReleaseAction.Request['params']['releaseId'];
}

export const INITIAL_VALUES = {
  type: 'publish',
  releaseId: '',
} satisfies FormValues;

interface AddActionToReleaseModalProps {
  contentTypeUid: string;
  documentId: string;
  onInputChange: (field: keyof FormValues, value: string | number) => void;
  values: FormValues;
}

export const NoReleases = () => {
  const { formatMessage } = useIntl();
  return (
    <EmptyStateLayout
      icon={<EmptyDocuments width="16rem" />}
      content={formatMessage({
        id: 'content-releases.content-manager-edit-view.add-to-release.no-releases-message',
        defaultMessage:
          'No available releases. Open the list of releases and create a new one from there.',
      })}
      action={
        <LinkButton
          // @ts-expect-error - types are not inferred correctly through the as prop.
          to={{
            pathname: '/plugins/content-releases',
          }}
          as={ReactRouterLink}
          variant="secondary"
        >
          {formatMessage({
            id: 'content-releases.content-manager-edit-view.add-to-release.redirect-button',
            defaultMessage: 'Open the list of releases',
          })}
        </LinkButton>
      }
      shadow="none"
    />
  );
};

const AddActionToReleaseModal = ({
  contentTypeUid,
  documentId,
  onInputChange,
  values,
}: AddActionToReleaseModalProps) => {
  const { formatMessage } = useIntl();

  // Get all 'pending' releases that do not have the entry attached
  const response = useGetReleasesForEntryQuery({
    contentTypeUid,
    documentId,
    hasEntryAttached: false,
  });

  const releases = response.data?.data;

  if (releases?.length === 0) {
    <NoReleases />;
  }

  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      <Box paddingBottom={6}>
        <SingleSelect
          required
          label={formatMessage({
            id: 'content-releases.content-manager-edit-view.add-to-release.select-label',
            defaultMessage: 'Select a release',
          })}
          placeholder={formatMessage({
            id: 'content-releases.content-manager-edit-view.add-to-release.select-placeholder',
            defaultMessage: 'Select',
          })}
          name="releaseId"
          onChange={(value) => onInputChange('releaseId', value)}
          value={values.releaseId}
        >
          {releases?.map((release: any) => (
            <SingleSelectOption key={release.id} value={release.id}>
              {release.name}
            </SingleSelectOption>
          ))}
        </SingleSelect>
      </Box>
      <FieldLabel>
        {formatMessage({
          id: 'content-releases.content-manager-edit-view.add-to-release.action-type-label',
          defaultMessage: 'What do you want to do with this entry?',
        })}
      </FieldLabel>
      <ReleaseActionOptions
        selected={values.type}
        handleChange={(e) => onInputChange('type', e.target.value)}
        name="type"
      />
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * AddToReleaseAction
 * -----------------------------------------------------------------------------------------------*/

const AddToReleaseAction: DocumentActionComponent = ({ documentId, model }) => {
  const { formatMessage } = useIntl();
  const { allowedActions } = useRBAC(PERMISSIONS);
  const { canCreateAction } = allowedActions;
  const [createReleaseAction, { isLoading }] = useCreateReleaseActionMutation();
  const { toggleNotification } = useNotification();
  const { formatAPIError } = useAPIErrorHandler();
  const [{ query }] = useQueryParams<{ plugins?: { i18n?: { locale?: string } } }>();
  const locale = query.plugins?.i18n?.locale;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>, onClose: () => void) => {
    try {
      await formik.handleSubmit(e);
      onClose();
    } catch (error) {
      if (isAxiosError(error)) {
        // Handle axios error
        toggleNotification({
          type: 'danger',
          message: formatAPIError(error),
        });
      } else {
        // Handle generic error
        toggleNotification({
          type: 'danger',
          message: formatMessage({
            id: 'notification.error',
            defaultMessage: 'An error occurred',
          }),
        });
      }
    }
  };

  const formik = useFormik({
    initialValues: INITIAL_VALUES,
    validationSchema: RELEASE_ACTION_FORM_SCHEMA,
    onSubmit: async (values: FormValues) => {
      if (!documentId) {
        throw new Error('Document id is required');
      }

      const releaseActionEntry = {
        contentType: model,
        documentId,
        locale,
      };
      const response = await createReleaseAction({
        body: { type: values.type, entry: releaseActionEntry },
        params: { releaseId: values.releaseId },
      });

      if ('data' in response) {
        // Handle success
        toggleNotification({
          type: 'success',
          message: formatMessage({
            id: 'content-releases.content-manager-edit-view.add-to-release.notification.success',
            defaultMessage: 'Entry added to release',
          }),
        });

        return;
      }

      if ('error' in response) {
        throw response.error;
      }
    },
  });

  const {
    edit: { options },
  } = useDocumentLayout(model);

  if (
    !window.strapi.isEE ||
    !options?.draftAndPublish ||
    !documentId ||
    documentId === 'create' ||
    !canCreateAction
  ) {
    return null;
  }

  return {
    label: formatMessage({
      id: 'content-releases.content-manager-edit-view.add-to-release',
      defaultMessage: 'Add to release',
    }),
    icon: <Cursor />,
    position: ['panel', 'table-row'],
    dialog: {
      type: 'modal',
      title: formatMessage({
        id: 'content-releases.content-manager-edit-view.add-to-release',
        defaultMessage: 'Add to release',
      }),
      content: (
        <AddActionToReleaseModal
          contentTypeUid={model}
          documentId={documentId}
          onInputChange={formik.setFieldValue}
          values={formik.values}
        />
      ),
      footer: ({ onClose }) => (
        <Flex justifyContent="space-between">
          <Button onClick={onClose} variant="tertiary" name="cancel">
            {formatMessage({
              id: 'content-releases.content-manager-edit-view.add-to-release.cancel-button',
              defaultMessage: 'Cancel',
            })}
          </Button>
          <Button
            type="submit"
            // @ts-expect-error - formik ReactEvent types don't match button onClick types as they expect a MouseEvent
            onClick={(e) => handleSubmit(e, onClose)}
            disabled={!formik.values.releaseId}
            loading={isLoading}
          >
            {formatMessage({
              id: 'content-releases.content-manager-edit-view.add-to-release.continue-button',
              defaultMessage: 'Continue',
            })}
          </Button>
        </Flex>
      ),
    },
  };
};

export { AddToReleaseAction };