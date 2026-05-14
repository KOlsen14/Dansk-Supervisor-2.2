import { Buffer } from "node:buffer";

import { Octokit } from "@octokit/rest";
import { z } from "zod";

const githubEnvSchema = z.object({
  GITHUB_TOKEN: z.string().min(1),
  GITHUB_OWNER: z.string().min(1),
  GITHUB_REPO: z.string().min(1),
  GITHUB_BRANCH: z.string().min(1)
});

export class FileNotFoundError extends Error {
  path: string;

  constructor(path: string) {
    super(`File not found: ${path}`);
    this.name = "FileNotFoundError";
    this.path = path;
  }
}

function getGithubConfig() {
  const parsedEnv = githubEnvSchema.safeParse(process.env);

  if (!parsedEnv.success) {
    throw new Error(
      `Missing GitHub environment variables: ${parsedEnv.error.issues
        .map((issue) => issue.path.join("."))
        .join(", ")}`
    );
  }

  return parsedEnv.data;
}

export function assertGithubConfig(): void {
  getGithubConfig();
}

const initialGithubConfig = getGithubConfig();

const octokit = new Octokit({
  auth: initialGithubConfig.GITHUB_TOKEN
});

function decodeBase64Content(content: string): string {
  return Buffer.from(content.replace(/\n/g, ""), "base64").toString("utf8");
}

function isGithubNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "status" in error && error.status === 404;
}

export async function getFile(filePath: string): Promise<{ content: string; sha: string }> {
  const { GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH } = getGithubConfig();

  try {
    const response = await octokit.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: filePath,
      ref: GITHUB_BRANCH
    });

    const file = response.data;

    if (Array.isArray(file) || !("content" in file) || !file.content) {
      throw new Error(`Expected a file at path: ${filePath}`);
    }

    return {
      content: decodeBase64Content(file.content),
      sha: file.sha
    };
  } catch (error) {
    if (isGithubNotFound(error)) {
      throw new FileNotFoundError(filePath);
    }

    throw error;
  }
}

export async function putFile(
  filePath: string,
  content: string,
  message: string,
  sha?: string
): Promise<void> {
  const { GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH } = getGithubConfig();

  await octokit.repos.createOrUpdateFileContents({
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    path: filePath,
    message,
    content: Buffer.from(content, "utf8").toString("base64"),
    branch: GITHUB_BRANCH,
    sha
  });
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await getFile(filePath);
    return true;
  } catch (error) {
    if (error instanceof FileNotFoundError) {
      return false;
    }

    throw error;
  }
}

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const file = await getFile(filePath);
    return JSON.parse(file.content) as T;
  } catch (error) {
    if (error instanceof FileNotFoundError) {
      return fallback;
    }

    throw error;
  }
}

export async function writeJsonFile<T>(filePath: string, data: T, message: string): Promise<void> {
  let sha: string | undefined;

  try {
    const existingFile = await getFile(filePath);
    sha = existingFile.sha;
  } catch (error) {
    if (!(error instanceof FileNotFoundError)) {
      throw error;
    }
  }

  await putFile(filePath, JSON.stringify(data, null, 2), message, sha);
}
