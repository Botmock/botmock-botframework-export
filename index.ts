import { BotFrameworkAdapter, WebRequest, WebResponse } from "botbuilder";
import { createServer } from "restify";
import { config } from "dotenv";
import Bot from "./Bot";

// bring the env variables into scope
config();

const PORT = process.env.PORT || 8080;
const server = createServer();

interface Err extends Error {}

try {
  const bot = new Bot({
    token: process.env.BOTMOCK_TOKEN,
    teamId: process.env.BOTMOCK_TEAM_ID,
    projectId: process.env.BOTMOCK_PROJECT_ID,
    boardId: process.env.BOTMOCK_BOARD_ID,
  });
  // TODO: support optional appId and appPassword config fields
  const adapter = new BotFrameworkAdapter({});
  adapter.onTurnError = async (ctx, err: Err) => {
    await ctx.sendActivity(err.message);
  };
  server.listen(
    PORT,
    (): void => {
      console.log(`Send POST requests to http://localhost:${PORT}/messages`);
    }
  );
  server.post(
    "/messages",
    (req: WebRequest, res: WebResponse): void => {
      // console.log(req);
      adapter.processActivity(req, res, async ctx => {
        await bot.run(ctx);
      });
    }
  );
} catch (err) {
  console.error(err);
  process.exit(1);
}
