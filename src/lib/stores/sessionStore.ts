type ActiveToolCall = {
  phase: string;
  toolName: string;
  args?: Record<string, unknown>;
} | null;

type SessionState = {
  activeToolCall: ActiveToolCall;
  addSystemMessage: (_message: string) => void;
};

const state: SessionState = {
  activeToolCall: null,
  addSystemMessage: () => undefined,
};

export function useSessionStore<T>(selector: (state: SessionState) => T): T {
  return selector(state);
}

useSessionStore.getState = () => state;
