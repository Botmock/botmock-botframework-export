import "dotenv/config";
// @ts-ignore
import pkg from "./package.json";
import path from "path";
import chalk from "chalk";
import * as Sentry from "@sentry/node";
import { remove, mkdirp, writeJSON } from "fs-extra";
import { default as APIWrapper } from "./lib/project";
import { SENTRY_DSN } from "./lib/constants";
import * as Assets from "./lib/types";

Sentry.init({
  dsn: SENTRY_DSN,
  release: `botmock-cli@${pkg.version}`,
});

interface LogConfig {
  hasError: boolean;
}

function log(str: string | number, config: LogConfig = { hasError: false }): void {
  const method = !config.hasError ? "dim" : "bold";
  console.info(chalk[method](`> ${str}`))
}

async function main(args: string[]): Promise<void> {
  let [, , appId, output] = args;
  if (typeof appId === "undefined") {
    appId = process.env.LUIS_APP_ID;
  }
  const DEFAULT_OUTPUT = "output";
  const outputDir = path.join(__dirname, output || DEFAULT_OUTPUT);
  log("recreating output directory")
  await remove(outputDir);
  await mkdirp(outputDir);
  log("fetching botmock assets");
  const apiWrapper = new APIWrapper({
    token: process.env.BOTMOCK_TOKEN,
    teamId: process.env.BOTMOCK_TEAM_ID,
    projectId: process.env.BOTMOCK_PROJECT_ID,
    boardId: process.env.BOTMOCK_BOARD_ID,
  });
  apiWrapper.on("asset-fetched", (assetName: string) => {
    log(`fetched ${assetName}`);
  });
  apiWrapper.on("error", err => {
    throw err;
  });
  try {
    const projectData = await apiWrapper.fetch();
    await writeToOutput(projectData, outputDir);
  } catch (err) {
    throw err;
  }
  log("done");
}

export async function writeToOutput(projectData: Partial<Assets.Project>, outputDir: string): Promise<void> {
  const LUIS_SCHEMA_VERSION = "3.2.0";
  const VERSION_ID = "0.1";
  const writeDir = path.join(outputDir, `${projectData.project.name}.json`)
  log(`generating json for project in ${writeDir}`);
  return await writeJSON(
    writeDir,
    {
      luis_schema_version: LUIS_SCHEMA_VERSION,
      versionId: VERSION_ID,
      name: projectData.project.name,
      desc: projectData.project.platform,
      culture: "en-us",
      tokenizerVersion: "1.0.0",
      intents: projectData.intents.map(intent => ({ name: intent.name })),
      entities: projectData.entities.map(entity => ({ name: entity.name, roles: [] })),
      composites: [],
      closedLists: [],
      patternAnyEntities: [],
      regex_entities: [],
      prebuiltEntities: [],
      model_features: [],
      regex_features: [],
      patterns: [],
      utterances: [],
    }
  );
}

process.on("unhandledRejection", () => {});
process.on("uncaughtException", () => {});

main(process.argv).catch((err: Error) => {
  log(err.message, { hasError: true });
  Sentry.captureException(err);
});
