const { Telegraf } = require("telegraf");
const axios = require("axios");
const { Markup } = require("telegraf/typings/markup");
require("dotenv").config();

/// https://telegrambots.github.io/book/1/quickstart.html
// https://github.com/RealPeha/telegram-keyboard
// https://github.com/telegraf/telegraf/blob/v4/docs/examples/keyboard-bot.js

const currency = {
  usd: "usd",
  rub: "rub",
  eur: "eur",
};

let machine = {};

const bot = new Telegraf(process.env.BOT_TOKEN);
// on "start"
bot.start((ctx) =>
  ctx.reply(
    "Welcome! It is a crypto-tracker bot. Please, select fiat currency in which you want to get current coin price."
  )
);

// on "help"
bot.help((ctx) => ctx.reply("Send me a sticker"));
bot.command("track", (ctx) => ctx.reply("Hello"));

bot.command("rate", (ctx) => {
  ctx.reply(
    "Please, select coin token or type it yourself",
    Markup.keyboard([
      ["🔍 Search", "😎 Popular"], // Row1 with 2 buttons
      ["☸ Setting", "📞 Feedback"], // Row2 with 2 buttons
      ["📢 Ads", "⭐️ Rate us", "👥 Share"], // Row3 with 3 buttons
    ])
      .oneTime()
      .resize()
  );
  machine[ctx.from.id] = [];
});
bot.on("message", async (ctx) => {
  try {
    const state = machine[ctx.from.id];

    if (!state) {
      // return prev. message?
      throw new Error("");
    }

    const text = ctx.message.text.toLowerCase();
    if (state.length === 0) {
      // crypto coin
      state.push(text);
      ctx.reply("please, select fiat currency or type it yourself", {
        reply_markup: {
          resize_keyboard: true,
          keyboard: [["EUR", "USD"]],
        },
      });
    } else if (state.length === 1) {
      // fiat
      state.push(text);
      ctx.reply("Checking cryptocurrency exchanges...", {
        reply_markup: {
          hide_keyboard: true,
        },
      });

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
    }
  } catch (error) {
    delete machine[ctx.from.id];
    ctx.reply("Ooops! Something went wrong.");
  }
});

// bot.on("sticker", (ctx) => ctx.reply("👍"))s;
// bot.hears("track");

// launch
bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
