// @vitest-environment node
import { createServer, get, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createHaProxy } from '../haProxy.ts'

const CAMERA = 'camera.front_door'
const servers: Server[] = []

function listen(server: Server) {
  servers.push(server)
  return new Promise<number>((resolve) =>
    server.listen(0, () => resolve((server.address() as AddressInfo).port)),
  )
}

afterEach(() => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections()
    server.close()
  }
})

describe('camera stream', () => {
  it('survives the kiosk disconnecting mid-stream', async () => {
    // Fake HA: an MJPEG stream that never ends.
    const haPort = await listen(
      createServer((_, res) => {
        res.writeHead(200, { 'content-type': 'multipart/x-mixed-replace' })
        const timer = setInterval(() => res.write('--frame\r\n'), 10)
        res.on('close', () => clearInterval(timer))
      }),
    )
    const proxy = createHaProxy({
      haUrl: `http://127.0.0.1:${haPort}`,
      token: 'token',
      configPath: new URL('../../kiosk.example.yaml', import.meta.url).pathname,
    })
    const proxyPort = await listen(createServer((req, res) => void proxy.handleRequest(req, res)))

    const crashed = vi.fn<(error: Error) => void>()
    process.on('uncaughtException', crashed)
    await new Promise<void>((resolve) => {
      const req = get(`http://127.0.0.1:${proxyPort}/api/camera_proxy_stream/${CAMERA}`, (res) => {
        res.once('data', () => {
          req.destroy()
          resolve()
        })
      })
    })
    await new Promise((resolve) => setTimeout(resolve, 100))
    process.off('uncaughtException', crashed)

    expect(crashed).not.toHaveBeenCalled()
  })
})
