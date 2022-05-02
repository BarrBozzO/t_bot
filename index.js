const { Telegraf, Markup } = require("telegraf");
const schedule = require("node-schedule");
const axios = require("axios");
require("dotenv").config();
// https://telegrafjs.org/#/?id=installation
// https://telegrambots.github.io/book/1/quickstart.html
// https://github.com/RealPeha/telegram-keyboard
// https://github.com/telegraf/telegraf/blob/v4/docs/examples/keyboard-bot.js

let machine = {}; // session ?? https://github.com/telegraf/telegraf/blob/v4/docs/examples/session-bot.ts
// https://www.digitalocean.com/community/tutorials/how-to-build-a-telegram-quotes-generator-bot-with-node-js-telegraf-jimp-and-pexels good tutorial

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.use((ctx, next) => {
  ctx.state.role = "wwww";
  return next();
});

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
  delete machine[ctx.from.id];
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
  machine[ctx.from.id] = []; // start sequence
});
bot.on("message", async (ctx) => {
  console.log(ctx.state.role);
  try {
    const state = machine[ctx.from.id];

    if (!state) {
      // if there is no started sequence, then do nothing
      return;
    }

    const text = ctx.message.text.toLowerCase(); // get message text
    if (state.length === 0) {
      // first step is to get crypto coin
      state.push(text);
      ctx.reply(
        "please, select fiat currency or type it yourself",
        Markup.keyboard([["EUR", "USD"]])
          .oneTime()
          .resize()
      );
    } else if (state.length === 1) {
      // step 2 - get fiat currency
      state.push(text);
      ctx.reply(
        "Checking cryptocurrency exchanges...",
        Markup.removeKeyboard()
      );

      const response = await axios.get(
        `https://rest.coinapi.io/v1/exchangerate/${state[0].toUpperCase()}/${state[1].toUpperCase()}`,
        {
          headers: {
            "X-CoinAPI-Key": process.env.API_KEY,
          },
        }
      );
      if (response.status === 200) {
        ctx.reply(
          `1 ${state[0]} ➡️ ${response.data.rate.toFixed(2)} ${state[1]}`
        );
      } else {
        throw new Error("wd");
      }
      delete machine[ctx.from.id];
    }
  } catch (error) {
    delete machine[ctx.from.id];
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
