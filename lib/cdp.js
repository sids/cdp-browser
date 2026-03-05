/**
 * Minimal CDP client - no puppeteer, no hangs
 */

const MESSAGE_DECODER = new TextDecoder();

function getNativeWebSocket() {
  const ws = globalThis.WebSocket;
  if (typeof ws !== "function") {
    throw new Error("Native WebSocket client is unavailable. Use Bun or Node 22+.");
  }
  return ws;
}

async function decodeMessageData(data) {
  if (typeof data === "string") {
    return data;
  }

  if (typeof Blob !== "undefined" && data instanceof Blob) {
    return await data.text();
  }

  if (data instanceof ArrayBuffer) {
    return MESSAGE_DECODER.decode(new Uint8Array(data));
  }

  if (ArrayBuffer.isView(data)) {
    return MESSAGE_DECODER.decode(
      new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
    );
  }

  return String(data);
}

function isDevToolsPageTarget(targetInfo) {
  if (!targetInfo || targetInfo.type !== "page") return false;

  const url = String(targetInfo.url || "").toLowerCase();

  return (
    url.startsWith("devtools://") ||
    url.startsWith("chrome-devtools://")  );
}

export async function connect(timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const resp = await fetch("http://localhost:9222/json/version", {
      signal: controller.signal,
    });
    const { webSocketDebuggerUrl } = await resp.json();
    clearTimeout(timeoutId);

    const NativeWebSocket = getNativeWebSocket();

    return new Promise((resolve, reject) => {
      const ws = new NativeWebSocket(webSocketDebuggerUrl);
      const connectTimeout = setTimeout(() => {
        ws.close();
        reject(new Error("WebSocket connect timeout"));
      }, timeout);

      const cleanup = () => {
        clearTimeout(connectTimeout);
        ws.removeEventListener("open", onOpen);
        ws.removeEventListener("error", onError);
      };

      const onOpen = () => {
        cleanup();
        resolve(new CDP(ws));
      };

      const onError = (event) => {
        cleanup();
        if (event?.error instanceof Error) {
          reject(event.error);
        } else {
          reject(new Error("WebSocket connection failed"));
        }
      };

      ws.addEventListener("open", onOpen);
      ws.addEventListener("error", onError);
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === "AbortError") {
      throw new Error("Connection timeout - is Chrome running with --remote-debugging-port=9222?");
    }
    throw e;
  }
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.callbacks = new Map();
    this.sessions = new Map();
    this.eventHandlers = new Map();

    ws.addEventListener("message", (event) => {
      this.handleMessage(event.data);
    });
  }

  async handleMessage(data) {
    let msg;

    try {
      const json = await decodeMessageData(data);
      msg = JSON.parse(json);
    } catch {
      return;
    }

    if (msg.id && this.callbacks.has(msg.id)) {
      const { resolve, reject } = this.callbacks.get(msg.id);
      this.callbacks.delete(msg.id);
      if (msg.error) {
        reject(new Error(msg.error.message));
      } else {
        resolve(msg.result);
      }
      return;
    }

    if (msg.method) {
      this.emit(msg.method, msg.params || {}, msg.sessionId || null);
    }
  }

  on(method, handler) {
    if (!this.eventHandlers.has(method)) {
      this.eventHandlers.set(method, new Set());
    }
    this.eventHandlers.get(method).add(handler);
    return () => this.off(method, handler);
  }

  off(method, handler) {
    const handlers = this.eventHandlers.get(method);
    if (!handlers) return;
    handlers.delete(handler);
    if (handlers.size === 0) {
      this.eventHandlers.delete(method);
    }
  }

  emit(method, params, sessionId) {
    const handlers = this.eventHandlers.get(method);
    if (!handlers || handlers.size === 0) return;
    for (const handler of handlers) {
      try {
        handler(params, sessionId);
      } catch {
        // Ignore handler errors to keep CDP session alive.
      }
    }
  }

  send(method, params = {}, sessionId = null, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const msgId = ++this.id;
      const msg = { id: msgId, method, params };
      if (sessionId) msg.sessionId = sessionId;

      const timeoutId = setTimeout(() => {
        this.callbacks.delete(msgId);
        reject(new Error(`CDP timeout: ${method}`));
      }, timeout);

      this.callbacks.set(msgId, {
        resolve: (result) => {
          clearTimeout(timeoutId);
          resolve(result);
        },
        reject: (err) => {
          clearTimeout(timeoutId);
          reject(err);
        },
      });

      try {
        this.ws.send(JSON.stringify(msg));
      } catch (err) {
        clearTimeout(timeoutId);
        this.callbacks.delete(msgId);
        reject(err instanceof Error ? err : new Error("Failed to send WebSocket message"));
      }
    });
  }

  async getPages() {
    const { targetInfos } = await this.send("Target.getTargets");
    return targetInfos.filter((targetInfo) => {
      if (targetInfo.type !== "page") return false;
      return !isDevToolsPageTarget(targetInfo);
    });
  }

  async attachToPage(targetId) {
    const { sessionId } = await this.send("Target.attachToTarget", {
      targetId,
      flatten: true,
    });
    return sessionId;
  }

  async evaluate(sessionId, expression, timeout = 30000) {
    const result = await this.send(
      "Runtime.evaluate",
      {
        expression,
        returnByValue: true,
        awaitPromise: true,
      },
      sessionId,
      timeout
    );

    if (result.exceptionDetails) {
      throw new Error(
        result.exceptionDetails.exception?.description ||
          result.exceptionDetails.text
      );
    }
    return result.result?.value;
  }

  async screenshot(sessionId, timeout = 10000) {
    const { data } = await this.send(
      "Page.captureScreenshot",
      { format: "png" },
      sessionId,
      timeout
    );
    return Buffer.from(data, "base64");
  }

  async navigate(sessionId, url, timeout = 30000) {
    await this.send("Page.navigate", { url }, sessionId, timeout);
  }

  async getFrameTree(sessionId) {
    const { frameTree } = await this.send("Page.getFrameTree", {}, sessionId);
    return frameTree;
  }

  async evaluateInFrame(sessionId, frameId, expression, timeout = 30000) {
    // Create isolated world for the frame
    const { executionContextId } = await this.send(
      "Page.createIsolatedWorld",
      { frameId, worldName: "cdp-eval" },
      sessionId
    );

    const result = await this.send(
      "Runtime.evaluate",
      {
        expression,
        contextId: executionContextId,
        returnByValue: true,
        awaitPromise: true,
      },
      sessionId,
      timeout
    );

    if (result.exceptionDetails) {
      throw new Error(
        result.exceptionDetails.exception?.description ||
          result.exceptionDetails.text
      );
    }
    return result.result?.value;
  }

  close() {
    this.ws.close();
  }
}
