export const deploymentHost: string;
export const allowedRedirectLine: string;

export function textHasDeploymentHost(text: string): boolean;

export function isAllowedSourceLine(file: string, content: string): boolean;

export function listSourceHits(root: string): { file: string; line: number; content: string }[];

export function sourceAllowlistViolations(root: string): {
  hits: { file: string; line: number; content: string }[];
  allowed: { file: string; line: number; content: string }[];
  denied: { file: string; line: number; content: string }[];
};

export function collectPublishableGroups(root: string): {
  documents: string[];
  staticScripts: string[];
  serverChunks: string[];
  serverAppJs: string[];
};

export function collectPublishableOutputs(root: string): string[];

export function emptyPublishableScriptGroups(root: string): string[];

export function hostHitsInFiles(files: string[]): string[];

export function publishableHostHits(root: string): string[];
