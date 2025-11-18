// Minimal supabase client shim for builds when Supabase isn't configured.
// This provides the small subset of API the app uses so TypeScript and
// Next.js build don't fail when a real Supabase client is not available.

export const supabase: any = {
  channel: (name: string) => {
    const ch: any = {
      on: (_: any, __: any, cb?: any) => ch,
      subscribe: () => ch,
      send: async () => Promise.resolve(),
    };
    return ch;
  },
  removeChannel: (_: any) => {},
};

export default supabase;
