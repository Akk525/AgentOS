// Type stubs for Tauri packages.
// These are replaced by the real declarations once `npm install` is run
// and @tauri-apps/api + @tauri-apps/plugin-dialog are present in node_modules.

declare module '@tauri-apps/api/core' {
  export function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T>
}

declare module '@tauri-apps/plugin-dialog' {
  export interface OpenDialogOptions {
    directory?: boolean
    multiple?: boolean
    title?: string
    defaultPath?: string
    filters?: { name: string; extensions: string[] }[]
  }
  export function open(options?: OpenDialogOptions): Promise<string | string[] | null>
}
