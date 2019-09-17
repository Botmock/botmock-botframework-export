import { remove, mkdirp, writeFile } from "fs-extra";
import { EventEmitter } from "events";
import { join } from "path";
import { EOL } from "os";
import * as Assets from "./types";

/**
 * Recreates given path
 * @param outputDir the location of the directory that contains generated output files
 * @returns Promise<void>
 */
export async function restoreOutput(outputDir: string): Promise<void> {
  await remove(outputDir);
  await mkdirp(outputDir);
}

interface Config {
  outputDir: string;
  projectData: Assets.CollectedResponses
}

export default class FileWriter extends EventEmitter {
  private init: Date;
  private outputDir: string;
  private projectData: Assets.CollectedResponses;
  /**
   * Creates instance of FileWriter
   * @param config configuration object containing an outputDir to hold generated
   * files, and projectData for the original botmock flow project
   */
  constructor(config: Config) {
    super();
    this.init = new Date();
    this.outputDir = config.outputDir;
    this.projectData = config.projectData;
  }
  /**
   * Writes Language Generation file within outputDir
   * @returns Promise<void>
   */
  public async writeLG(): Promise<void> {
    const LG_FILE_COMMENT = `> generated ${this.init}`;
    const outputFilePath = join(this.outputDir, `${this.projectData.project.name}.lg`);
    await writeFile(
      outputFilePath,
      this.projectData.intents.reduce((acc, intent: Assets.Intent) => {
        const intentLine = `# ${intent.name}${EOL}`;
        const utterancesLines = intent.utterances.reduce((accu, utterance) => {
          return `${accu}- ${utterance.text}${EOL}`;
        }, "");
        return `${acc}${EOL}${intentLine}${utterancesLines}`;
      }, LG_FILE_COMMENT)
    );
  }
}