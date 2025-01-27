import type { Response } from 'express';
import { HTTP_STATUS_CODE } from '../../types';

interface IEmbracedResponse {
  // TODO: [REFACTOR] 'authToken' could be always paired with 'payload' prop or be contained by it
  authToken: string | null;
  payload: Record<string, unknown> | unknown[];
  message: string;
  error: string;
  exception: Error | { message: string; stack?: string };
}

const GROUPED_HTTP_STATUS_CODES = Object.freeze({
  SUCCESSFUL: {
    200: 200,
    201: 201,
    204: 204,
  },
  CLIENT_ERROR: {
    400: 400,
    401: 401,
    403: 403,
    404: 404,
    409: 409,
  },
  SERVER_ERROR: {
    500: 500,
    511: 511,
  },
} as const);

export type TypeOfHTTPStatusCodes = typeof GROUPED_HTTP_STATUS_CODES;

const mappedHTTPStatusCode = Object.freeze({
  200: 'SUCCESSFUL',
  201: 'SUCCESSFUL',
  204: 'SUCCESSFUL',
  400: 'CLIENT_ERROR',
  401: 'CLIENT_ERROR',
  403: 'CLIENT_ERROR',
  404: 'CLIENT_ERROR',
  409: 'CLIENT_ERROR',
  500: 'SERVER_ERROR',
  511: 'SERVER_ERROR',
} as const);

type TSuccessfulHTTPStatusCodesToData = {
  [SuccessfulStatus in keyof TypeOfHTTPStatusCodes['SUCCESSFUL']]: Extract<
    keyof IEmbracedResponse,
    'payload' | 'message' | 'authToken'
  >;
};
type TClientErrorHTTPStatusCodesToData = {
  [ClientErrorStatus in keyof TypeOfHTTPStatusCodes['CLIENT_ERROR']]: Extract<keyof IEmbracedResponse, 'error'>;
};
type TServerErrorHTTPStatusCodesToData = {
  [ServerErrorStatus in keyof TypeOfHTTPStatusCodes['SERVER_ERROR']]: Extract<keyof IEmbracedResponse, 'exception'>;
};

type THTTPStatusCodeToData = TSuccessfulHTTPStatusCodesToData &
  TClientErrorHTTPStatusCodesToData &
  TServerErrorHTTPStatusCodesToData;

type TKeyofMappedStatusCode = keyof typeof mappedHTTPStatusCode;
// Discord's TypeScript Community: https://discord.com/channels/508357248330760243/753055735423827998/909189680388534312
type TDataKeyExt<Status extends TKeyofMappedStatusCode> = keyof IEmbracedResponse extends infer K
  ? K extends keyof IEmbracedResponse
    ? K extends THTTPStatusCodeToData[Status]
      ? K
      : never
    : never
  : never;

function wrapRes(
  res: Response,
  status: typeof HTTP_STATUS_CODE.NO_CONTENT | typeof HTTP_STATUS_CODE.NOT_FOUND
): Response;
function wrapRes<
  Status extends Exclude<TKeyofMappedStatusCode, typeof GROUPED_HTTP_STATUS_CODES.SUCCESSFUL[204]>,
  DataKey extends TDataKeyExt<Status>
>(res: Response, status: Status, data: Record<DataKey, IEmbracedResponse[DataKey]>): Response;
function wrapRes<Status extends TKeyofMappedStatusCode, DataKey extends TDataKeyExt<Status>>(
  res: Response,
  status: Status,
  data?: Record<DataKey, IEmbracedResponse[DataKey]>
): Response {
  if (data === undefined) {
    if (status === HTTP_STATUS_CODE.NOT_FOUND) {
      return res.status(status);
    }

    return res.sendStatus(status);
  }

  return res.status(status).json(data);
}

export { wrapRes };
