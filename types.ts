export interface Trend {
  name: string;
  volume: string;
}

export interface StoryPrompts {
  ki: string; // 起
  sho:string; // 承
  ten: string; // 転
  ketsu: string; // 結
}


// Fix: The original anonymous type for `window.aistudio` was conflicting with
// another declaration expecting a named type `AIStudio`. This change defines
// the `AIStudio` interface and uses it for `window.aistudio` to resolve the
// TypeScript error.
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    // FIX: Add readonly modifier to resolve declaration conflict with a potentially pre-existing definition.
    readonly aistudio: AIStudio;
  }
}
