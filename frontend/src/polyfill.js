import { Buffer } from "buffer";

if (typeof globalThis !== "undefined") {
  globalThis.Buffer = Buffer;
  globalThis.global = globalThis;
}
if (typeof self !== "undefined") {
  self.Buffer = Buffer;
  self.global = self;
}
if (typeof window !== "undefined") {
  window.Buffer = Buffer;
  window.global = window;
}
