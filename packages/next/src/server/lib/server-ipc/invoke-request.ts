import type { IncomingMessage } from 'http'
import { Readable } from 'stream'
import { filterReqHeaders, ipcForbiddenHeaders } from './utils'

export const invokeRequest = async (
  targetUrl: string,
  requestInit: {
    headers: IncomingMessage['headers']
    method: IncomingMessage['method']
    signal?: AbortSignal
  },
  readableBody?: Readable | ReadableStream | BodyInit
) => {
  const invokeHeaders = filterReqHeaders(
    {
      'cache-control': '',
      ...requestInit.headers,
    },
    ipcForbiddenHeaders
  ) as IncomingMessage['headers']

  return await fetch(targetUrl, {
    headers: invokeHeaders as any as Headers,
    method: requestInit.method,
    redirect: 'manual',
    signal: requestInit.signal,

    ...(requestInit.method !== 'GET' &&
    requestInit.method !== 'HEAD' &&
    readableBody
      ? {
          body: readableBody as BodyInit,
          get duplex() {
            if (
              readableBody instanceof Readable ||
              readableBody instanceof ReadableStream
            ) {
              return 'half'
            }
          },
        }
      : {}),

    next: {
      // @ts-ignore
      internal: true,
    },
  })
}
