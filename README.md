# Tauri XHR

This package allow you to override the default XHR implementation to use `http` feature provided by Tauri.

It helps you bypass CORS restrictions when you want to use XHR in the WebView.

It can be helpful if you are using a SDK/library which uses XHR/axios to make CORS HTTP requests.

## Usage

```ts
import { overrideGlobalXHR } from 'tauri-xhr'
overrideGlobalXHR()

// Then you can use XHR/axios as usual, but with CORS restrictions bypassed
import axios from 'axios'
axios.get('https://api.github.com/repos/tauri-apps/tauri')
```

Because it's using tauri's [`http` feature](https://tauri.app/v1/api/js/http/) under the hood, you need to allowlist the domains you want to make requests to.

```json
{
  "tauri": {
    "allowlist": {
      "http": {
        "all": true, // enable all http APIs
        "scope": ["https://api.github.com/repos/tauri-apps/*"]
      }
    }
  }
}
```

## Note

The custom XHR implementation does not implement all the features of the browser's XHR. There are some limitations:

- Only support sending/receiving `string`
- `progress` event is fired only when the request is fully completed
- `timeout` is not implemented yet
- `overrideMimeType()` is not implemented yet

### Debugging

The package logges full request and response to the console with `debug` level.
