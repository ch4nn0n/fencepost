// Bun resolves `import x from "./f.wasm" with { type: "file" }` to a path string
// (the real path in dev, an embedded path in the compiled binary).
declare module "*.wasm" {
  const path: string;
  export default path;
}
