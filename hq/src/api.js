async function req(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let msg = `${res.status}`
    try {
      msg = (await res.json()).error || msg
    } catch {}
    throw new Error(`${method} ${url}: ${msg}`)
  }
  return res.json()
}

export const api = {
  get: (url) => req('GET', url),
  post: (url, body) => req('POST', url, body),
  patch: (url, body) => req('PATCH', url, body),
  put: (url, body) => req('PUT', url, body),
  del: (url) => req('DELETE', url),
}
