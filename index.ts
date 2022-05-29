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

const track: Record<string, string[]> = {};

interface SessionData {
  state: "trackRequested" | "rateRequested" | null;
  data: {
    from: string | null;
    to: string | null;
    track: string[];
  };
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
      command: "track",
      description: "Get currency updates every day/hour/minute",
    },
    {
      command: "help",
      description: "Get help from finance bot",
    },
  ]);
  ctx.reply(
    'Welcome! It is a "Crypto Exchange" bot. Please, select fiat currency in which you want to get current coin price.'
  );
});

// on "help"
bot.help((ctx) => {
  ctx.session = null;
  ctx.reply("Finance bot is intent to help you with ");
});
bot.command("track", (ctx) => {
  ctx.reply("Please, send coin token which you want to track");

  // install session if there is none
  if (!ctx.session) {
    ctx.session = {
      state: "trackRequested",
      data: {
        from: null,
        to: null,
        track: [],
      },
    };
  } else if (ctx.session.state === null) {
    ctx.session.state = "trackRequested";
  }
});

bot.command("rate", (ctx) => {
  ctx.reply(
    "Please, select coin or send it's token",
    Markup.keyboard([["BTC", "ETH"]])
      .oneTime()
      .resize()
  );
  ctx.session = {
    state: "rateRequested",
    data: {
      from: null,
      to: null,
      track: [],
    },
  }; // start sequence
});
bot.on("message", async (ctx) => {
  try {
    if (!ctx.session || !("text" in ctx.message) || !ctx.session.state) {
      // if there is no started sequence, then do nothing
      return;
    }

    // get message text
    const text = ctx.message.text.toLowerCase();

    switch (ctx.session.state) {
      case "trackRequested": {
        if (ctx.session.data.track.includes(text)) {
          ctx.reply(`${text.toLocaleUpperCase()} is already in track list...`);
          return;
        } else {
          ctx.session.data.track = [...ctx.session.data.track, text];
          track[ctx.chat.id] ??= [];
          track[ctx.chat.id].push(text);

          ctx.reply(`${text.toLocaleUpperCase()} is added to track list...`);
          ctx.session.state = null;
        }
        return;
      }
      case "rateRequested": {
        if (!ctx.session.data.from) {
          ctx.reply(
            "please, select fiat currency or type it yourself",
            Markup.keyboard([["EUR", "USD"]])
              .oneTime()
              .resize()
          );
          ctx.session.data.from = text;
        } else if (!ctx.session.data.to) {
          // step 2 - get fiat currency
          ctx.session.data.to = text;
          ctx.reply(
            "Checking cryptocurrency exchanges...",
            Markup.removeKeyboard()
          );

          const response = await axios.get(
            `https://rest.coinapi.io/v1/exchangerate/${ctx.session.data.from.toUpperCase()}/${ctx.session.data.to.toUpperCase()}`,
            {
              headers: {
                "X-CoinAPI-Key": process.env.API_KEY,
              },
            }
          );
          if (response.status === 200) {
            ctx.reply(
              `1 ${ctx.session.data.from} ➡️ ${response.data.rate.toFixed(2)} ${
                ctx.session.data.to
              }`
            );
          } else {
            throw new Error("wd");
          }
          ctx.session = null;
        }
        return;
      }
      default:
        return;
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
const job = schedule.scheduleJob("0-59 * * * *", async function () {
  for (const chatId in track) {
    try {
      const response = await axios.get(
        `https://rest.coinapi.io/v1/exchangerate/${track[
          chatId
        ][0].toUpperCase()}/USD`,
        {
          headers: {
            "X-CoinAPI-Key": process.env.API_KEY,
          },
        }
      );
      if (response.status === 200) {
        bot.telegram.sendMessage(
          chatId,
          `${track[chatId][0].toUpperCase()} - ${response.data.rate.toFixed(2)}`
        );
      }
    } catch (error) {
      throw new Error(`Failed to track ${track[chatId][0]}`);
    }
  }
});
