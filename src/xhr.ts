import { getClient, Body, ResponseType, HttpVerb } from '@tauri-apps/api/http'

enum ReadyState {
  Unsent,
  Opened,
  HeadersReceived,
  Loading,
  Done,
}

type OnEvent = ((this: XMLHttpRequest, ev: ProgressEvent) => any) | null

export class TauriXMLHttpRequest extends EventTarget implements XMLHttpRequest {
  private method?: HttpVerb
  private url = ''
  private headers: Record<string, string> = {}
  private responseHeaders: Record<string, string> = {}

  private _readyState: ReadyState = ReadyState.Unsent
  private _response?: string
  private _status = 0

  responseType: XMLHttpRequestResponseType = ''
  timeout = 0
  withCredentials = false

  onabort: OnEvent = null
  onerror: OnEvent = null
  onload: OnEvent = null
  onloadend: OnEvent = null
  onloadstart: OnEvent = null
  onprogress: OnEvent = null
  ontimeout: OnEvent = null

  onreadystatechange: ((this: XMLHttpRequest, ev: Event) => any) | null = null

  readonly UNSENT: 0 = ReadyState.Unsent
  readonly OPENED: 1 = ReadyState.Opened
  readonly HEADERS_RECEIVED: 2 = ReadyState.HeadersReceived
  readonly LOADING: 3 = ReadyState.Loading
  readonly DONE: 4 = ReadyState.Done

  constructor() {
    super()

    this.addEventListener('abort', (ev) => {
      this.onabort?.(ev as ProgressEvent)
    })
    this.addEventListener('error', (ev) => {
      this.onerror?.(ev as ProgressEvent)
    })
    this.addEventListener('load', (ev) => {
      this.onload?.(ev as ProgressEvent)
    })
    this.addEventListener('loadend', (ev) => {
      this.onloadend?.(ev as ProgressEvent)
    })
    this.addEventListener('loadstart', (ev) => {
      this.onloadstart?.(ev as ProgressEvent)
    })
    this.addEventListener('progress', (ev) => {
      this.onprogress?.(ev as ProgressEvent)
    })
    this.addEventListener('timeout', (ev) => {
      this.ontimeout?.(ev as ProgressEvent)
    })

    this.addEventListener('readystatechange', (ev) => {
      this.onreadystatechange?.(ev as ProgressEvent)
    })
  }

  private set readyState(state: ReadyState) {
    this._readyState = state
    this.dispatchEvent(new Event('readystatechange'))
  }
  get readyState() {
    return this._readyState
  }

  get response() {
    return this._response
  }

  get responseText() {
    if (typeof this._response !== 'string') {
      throw new DOMException('response is not a string')
    }
    return this._response
  }

  get responseURL() {
    return this.url
  }

  get responseXML(): never {
    throw new DOMException('git responseXML not implemented')
  }

  get status() {
    return this._status
  }

  get statusText() {
    return String(this._status)
  }

  get upload(): never {
    throw new DOMException('upload is not implemented')
  }

  abort(): never {
    throw new DOMException('abort is not implemented')
  }

  getAllResponseHeaders(): string {
    return Object.entries(this.responseHeaders)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n')
  }

  getResponseHeader(name: string): string | null {
    return this.responseHeaders[name] ?? null
  }

  open(method: HttpVerb, url: string) {
    console.debug('open', method, url)
    this.method = method
    this.url = url
    this.readyState = ReadyState.Opened
  }

  overrideMimeType(mime: string): never {
    throw new DOMException('overrideMimeType is not implemented')
  }

  send(body?: Document | XMLHttpRequestBodyInit | null | undefined): void {
    console.debug('send', body)
    const { method, url, readyState } = this
    if (!method || !url) {
      throw new Error('method or url is not set')
    }
    if (readyState !== ReadyState.Opened) {
      throw new DOMException('readyState is not opened')
    }
    if (body === null) {
      body = ''
    }
    if (typeof body !== 'string') {
      throw new DOMException('using non-string body is not implemented')
    }

    ;(async () => {
      try {
        const client = await getClient()
        this.readyState = ReadyState.HeadersReceived
        this.readyState = ReadyState.Loading

        this.dispatchEvent(
          new ProgressEvent('loadstart', {
            lengthComputable: true,
            loaded: 0,
            total: 0,
          })
        )

        const resp = await client.request<string>({
          method,
          url,
          headers: this.headers,
          body: Body.text(body),
          responseType: ResponseType.Text,
        })

        console.debug(`response of ${this.url}`, resp)

        this._response = resp.data
        this._status = resp.status
        this.responseHeaders = resp.headers

        const eventData: ProgressEventInit = {
          lengthComputable: true,
          loaded: resp.data.length,
          total: resp.data.length,
        }
        this.dispatchEvent(new ProgressEvent('progress', eventData))
        this.dispatchEvent(new ProgressEvent('load', eventData))
        this.dispatchEvent(new ProgressEvent('loadend', eventData))
      } catch (e) {
        console.error(e)
        this.dispatchEvent(new ErrorEvent('error', { error: e }))
      } finally {
        this.readyState = ReadyState.Done
      }
    })()
  }

  setRequestHeader(name: string, value: string) {
    this.headers[name] = value
  }
}

export const registerGlobal = () =>
  (window.XMLHttpRequest = TauriXMLHttpRequest as any)
