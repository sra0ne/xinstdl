import dotenv from "dotenv";
import { Telegraf } from "telegraf";
import { YtDlp } from "ytdlp-nodejs";
import fs from "fs/promises";
import path from "path";

dotenv.config();

const ytdlp = new YtDlp();
const BOT_TOKEN = process.env.BOT_TOKEN || "YOUR_TELEGRAM_BOT_TOKEN";
const bot = new Telegraf(BOT_TOKEN);

function detectPlatform(url) {
  if (/instagram\.com/.test(url)) return "Instagram";
  if (/x\.com|twitter\.com/.test(url)) return "Twitter";
  return "Unknown";
}

async function downloadVideo(url) {
  console.log(`Starting download for: ${url}`);
  const metadata = await ytdlp.getInfoAsync(url);
  const tempFileName = `${Date.now()}.mp4`;
  const outputPath = path.join(process.cwd(), tempFileName);
  await ytdlp.downloadAsync(url, {
    output: outputPath,
  });

  console.log(`Download completed: ${outputPath}`);
  return { filePath: outputPath, title: metadata.title };
}

bot.on("text", async (ctx) => {
  const url = ctx.message.text.trim();
  const platform = detectPlatform(url);

  if (platform === "Unknown") {
    return ctx.reply("❌ Please send a valid Instagram or X/Twitter link.");
  }

  const waitingMessage = await ctx.reply(
    `🔍 Fetching from ${platform}... Please wait.`
  );

  let downloadedVideoPath = null;

  try {
    const { filePath, title } = await downloadVideo(url);
    downloadedVideoPath = filePath;

    await ctx.reply(`✅ Download complete! Now uploading to Telegram...`);

    await fs.access(filePath);
    await ctx.replyWithVideo({ source: filePath }, { caption: title });
    console.log("Upload completed");

    await bot.telegram.deleteMessage(ctx.chat.id, waitingMessage.message_id);
  } catch (err) {
    console.error("⚠️ Error:", err);
    await ctx.reply(
      "❌ Failed to process the video. The link might be invalid, private, or unsupported."
    );
    await bot.telegram
      .deleteMessage(ctx.chat.id, waitingMessage.message_id)
      .catch(() => {});
  } finally {
    if (downloadedVideoPath) {
      try {
        await fs.unlink(downloadedVideoPath);
        console.log(`🧹 Cleaned up file: ${downloadedVideoPath}`);
      } catch (cleanupErr) {
        console.error(
          "⚠️ Error cleaning up file:",
          cleanupErr.code === "ENOENT"
            ? "File not found during cleanup (likely download failed to complete)."
            : cleanupErr
        );
      }
    }
  }
});

bot.launch();
console.log("🚀 Telegram Bot running...");
