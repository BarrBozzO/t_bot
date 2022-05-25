import { Telegraf, Markup, session, Context } from "telegraf";
const schedule = require("node-schedule");
import axios from "axios";
require("dotenv").config();
// https://telegrafjs.org/#/?id=installation
// https://telegrambots.github.io/book/1/quickstart.html
// https://github.com/RealPeha/telegram-keyboard
// https://github.com/telegraf/telegraf/blob/v4/docs/examples/keyboard-bot.js

// session ?? https://github.com/telegraf/telegraf/blob/v4/docs/examples/session-bot.ts
// https://www.digitalocean.com/community/tutorials/how-to-build-a-telegram-quotes-generator-bot-with-node-js-telegraf-jimp-and-pexels good tutorial

interface SessionData {
  from: string | null;
  to: string | null;
}

// Define your own context type
interface MyContext extends Context {
  session?: SessionData | null;
}

const bot = new Telegraf<MyContext>(process.env.BOT_TOKEN);
bot.use(session());

// on "start"
bot.start((ctx) => {
  ctx.telegram.setMyCommands([
    {
      command: "rate",
      description: "Get exchange rate",
    },
    {
      command: "help",
      description: "Get help from finance bot!",
    },
    {
      command: "help",
      description: "Get help from finance bot!",
    },
  ]);
  ctx.reply(
    "Welcome! It is a crypto-tracker bot. Please, select fiat currency in which you want to get current coin price."
  );
});

// on "help"
bot.help((ctx) => {
  ctx.session = null;
  ctx.reply("Finance bot is intent to help you with ");
});
bot.command("track", (ctx) => ctx.reply("Hello"));

bot.command("rate", (ctx) => {
  ctx.reply(
    "Please, select coin or send it's token",
    Markup.keyboard([["BTC", "ETH"]])
      .oneTime()
      .resize()
  );
  ctx.session = {
    from: null,
    to: null,
  }; // start sequence
});
bot.on("message", async (ctx) => {
  try {
    if (!ctx.session || !("text" in ctx.message)) {
      // if there is no started sequence, then do nothing
      return;
    }

    const text = ctx.message.text.toLowerCase(); // get message text
    if (!ctx.session.from) {
      ctx.reply(
        "please, select fiat currency or type it yourself",
        Markup.keyboard([["EUR", "USD"]])
          .oneTime()
          .resize()
      );
      ctx.session.from = text;
    } else if (!ctx.session.to) {
      // step 2 - get fiat currency
      ctx.session.to = text;
      ctx.reply(
        "Checking cryptocurrency exchanges...",
        Markup.removeKeyboard()
      );

      const response = await axios.get(
        `https://rest.coinapi.io/v1/exchangerate/${ctx.session.from.toUpperCase()}/${ctx.session.to.toUpperCase()}`,
        {
          headers: {
            "X-CoinAPI-Key": process.env.API_KEY,
          },
        }
      );
      if (response.status === 200) {
        ctx.reply(
          `1 ${ctx.session.from} ➡️ ${response.data.rate.toFixed(2)} ${
            ctx.session.to
          }`
        );
      } else {
        throw new Error("wd");
      }
      ctx.session = null;
    }
  } catch (error) {
    ctx.session = null;
    ctx.reply("Ooops! Something went wrong.");
  }
});

// launch
bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

// set schedule job
const job = schedule.scheduleJob("1 * * * *", function () {
  Telegraf.reply("tracked");
});
