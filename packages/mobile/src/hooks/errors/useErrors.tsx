import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import { t } from 'photo-app-common';
import {
  OdinErrorDetails,
  getKnownOdinErrorMessages,
  getOdinErrorDetails,
} from '@homebase-id/js-lib/core';

export interface Error {
  type: 'warning' | 'critical';
  title?: string;
  message: string;
  details?: OdinErrorDetails;
}

export const generateClientError = (error: unknown, title?: string, message?: string): Error => {
  const knownErrorMessage = getKnownOdinErrorMessages(error);
  const details = getOdinErrorDetails(error);

  return {
    type: knownErrorMessage ? 'warning' : 'critical',
    title,
    message:
      message ||
      knownErrorMessage ||
      (error instanceof Error
        ? error.toString()
        : t('Something went wrong, please try again later')),
    details,
  };
};

export const addError = (
  queryClient: QueryClient,
  error: unknown,
  title?: string,
  message?: string
) => {
  const currentErrors = queryClient.getQueryData<Error[]>(['errors']);
  const newError = generateClientError(error, title, message);

  const updatedErrors = [...(currentErrors || []), newError];
  queryClient.setQueryData(['errors'], updatedErrors);
};

export const useErrors = () => {
  const queryClient = useQueryClient();

  return {
    fetch: useQuery({
      queryKey: ['errors'],
      queryFn: () => [] as Error[],
      gcTime: Infinity,
      staleTime: Infinity,
    }),
    add: (error: unknown, title?: string, message?: string) =>
      addError(queryClient, error, title, message),
    dismiss: (error: Error) => {
      const currentErrors = queryClient.getQueryData<Error[]>(['errors']);
      const updatedErrors = currentErrors?.filter((e) => e !== error);
      queryClient.setQueryData(['errors'], updatedErrors);
    },
  };
};
