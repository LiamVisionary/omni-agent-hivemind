type DecisionReason = {
  isBot: () => boolean;
  isRateLimit: () => boolean;
};

type Decision = {
  reason: DecisionReason;
  isDenied: () => boolean;
};

const allowDecision: Decision = {
  reason: {
    isBot: () => false,
    isRateLimit: () => false,
  },
  isDenied: () => false,
};

export const chatRouteClient = {
  async protect(_request?: unknown): Promise<Decision> {
    return allowDecision;
  },
};
