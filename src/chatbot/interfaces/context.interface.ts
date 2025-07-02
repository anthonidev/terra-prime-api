export interface BaseContext {
  system: {
    name: string;
    description: string;
    version: string;
  };
  assistant: {
    name: string;
    personality: string;
    tone: string;
    language: string;
  };
  baseInstructions: string[];
  limitations: string[];
}

export interface RoleContext {
  name: string;
  description: string;
  capabilities: string[];
  commonQueries: string[];
  workflows: string[];
}

export interface SystemHelp {
  quickHelp: Record<string, string[]>;
  stepByStepGuides: Record<
    string,
    {
      title: string;
      applicableRoles: string[];
      steps: string[];
    }
  >;
  troubleshooting: {
    commonIssues: Array<{
      issue: string;
      solutions: string[];
    }>;
  };
}
