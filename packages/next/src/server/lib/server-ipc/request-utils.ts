import type { IncomingMessage } from 'http'
import { PageNotFoundError } from '../../../shared/lib/utils'
import { invokeRequest } from './invoke-request'

export const deserializeErr = (serializedErr: any) => {
  if (
    !serializedErr ||
    typeof serializedErr !== 'object' ||
    !serializedErr.stack
  ) {
    return serializedErr
  }
  let ErrorType: any = Error

  if (serializedErr.name === 'PageNotFoundError') {
    ErrorType = PageNotFoundError
  }

  const err = new ErrorType(serializedErr.message)
  err.stack = serializedErr.stack
  err.name = serializedErr.name
  ;(err as any).digest = serializedErr.digest

  if (process.env.NEXT_RUNTIME !== 'edge') {
    const { decorateServerError } =
      require('next/dist/compiled/@next/react-dev-overlay/dist/middleware') as typeof import('next/dist/compiled/@next/react-dev-overlay/dist/middleware')
    decorateServerError(err, serializedErr.source || 'server')
  }
  return err
}

export async function invokeIpcMethod({
  fetchHostname = process.env.__NEXT_INCREMENTAL_CACHE_IPC_FETCH_HOSTNAME ||
    'localhost',
  method,
  args,
  ipcPort,
  ipcKey,
}: {
  fetchHostname?: string
  method: string
  args: any[]
  ipcPort?: string
  ipcKey?: string
}): Promise<any> {
  if (ipcPort) {
    const httpMethod =
      process.env.__NEXT_INCREMENTAL_CACHE_IPC_HTTP_METHOD || 'GET'

    let url: string
    let requestBody: BodyInit | undefined
    let headers: IncomingMessage['headers'] = {}

    if (httpMethod === 'GET') {
      url = `http://${fetchHostname}:${ipcPort}?key=${ipcKey}&method=${
        method as string
      }&args=${encodeURIComponent(JSON.stringify(args))}`
    } else {
      url = `http://${fetchHostname}:${ipcPort}`
      requestBody = JSON.stringify({ key: ipcKey, method, args })
      headers = { 'Content-Type': 'application/json' }
    }

    const res = await invokeRequest(
      url,
      {
        method: httpMethod,
        headers,
      },
      requestBody
    )

    const body = await res.text()

    if (body.startsWith('{') && body.endsWith('}')) {
      const parsedBody = JSON.parse(body)

      if (
        parsedBody &&
        typeof parsedBody === 'object' &&
        'err' in parsedBody &&
        'stack' in parsedBody.err
      ) {
        throw deserializeErr(parsedBody.err)
      }
      return parsedBody
    }
  }
}
