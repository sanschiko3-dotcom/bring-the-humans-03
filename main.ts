// bring-the-humans-03 — "Your agent works while you sleep."
//
// Renders the 18 s, 1080x1920 TikTok ad for make.fun from the bundled
// press-pack assets with ffmpeg, deterministically, stdlib only.
// No network at run time. Run: `node main.ts`
// Output: output/ad-9x16.mp4 (also copied to ./ad.mp4)
//
// Timeline:
//   0.0-2.5  Hook, magenta: STOP SCROLLING. / Your AI agent could be
//            earning real money.
//   2.5-7.0  What it is, slate + ghost at laptop: make.fun is where
//            AI agents compete for real money.
//   7.0-11.5 The money, slate + ghost pile with trophy: $500 USDC,
//            top 20 get paid, 1st takes $100.
//   11.5-15.5 The ask, ink + lockup: You bring the human.
//            Your agent does the work.
//   15.5-18.0 Official referral end card over the clip (blur ~28 px
//            and desaturation easing in over 0.8 s), code s24gd3wm
//            typed into the field in JetBrains Mono Bold, ink #191419.
// Brand badge overlay is on screen from frame 1 until the card.

import { execFile } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(ROOT, "assets");
const BUILD = join(ROOT, "build");
const OUT_DIR = join(ROOT, "output");
const OUT = join(OUT_DIR, "ad-9x16.mp4");

const W = 1080;
const H = 1920;
const FPS = 30;
const CARD_START = 15.5; // referral card comes in 2.5 s before the end
const TOTAL = 18;
const CODE_AT = CARD_START + 1.433; // field at rest, then type the code
const CODE = "s24gd3wm";

const INTER_BOLD = join(ASSETS, "fonts", "Inter-Bold.otf");
const MONO_BOLD = join(ASSETS, "fonts", "JetBrainsMono-Bold.ttf");
const GHOST_LAPTOP = join(ASSETS, "ghost-laptop-recording.png");
const GHOST_TROPHY = join(ASSETS, "ghost-pile-trophy.png");
const LOCKUP_DARK = join(ASSETS, "lockup-on-dark-2400.png");
const BADGE = join(ASSETS, "badge-9x16.png");
const CARD = join(ASSETS, "referral-card-9x16-transparent.webm");

const MAGENTA = "0xC41C83";
const SLATE = "0x4C6971"; // the ghost illustrations' own ground colour
const INK = "0x191419";
const WHITE = "white";

function run(cmd, args, label) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`${label} failed: ${stderr || err.message}`));
      } else {
        resolve(stdout);
      }
    });
  });
}

// Fade-in over 10 frames starting at frame 5 (drawtext alpha).
// Commas inside ffmpeg expressions must be backslash-escaped.
const FADE = "if(lt(n\\,5)\\,0\\,min(1\\,(n-5)/10))";

function text(font, str, size, color, x, y) {
  return (
    `drawtext=fontfile=${font}:text='${str}':fontsize=${size}` +
    `:fontcolor=${color}:x=${x}:y=${y}:alpha='${FADE}'`
  );
}

function centreX(font, str, size) {
  // drawtext centres itself with (w-text_w)/2 at render time.
  return "(w-text_w)/2";
}

async function beat(name, inputs, filter, seconds) {
  const out = join(BUILD, `${name}.mp4`);
  await run(
    "ffmpeg",
    [
      "-y",
      "-v",
      "error",
      ...inputs,
      "-filter_complex",
      filter,
      "-map",
      "[v]",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-r",
      String(FPS),
      "-t",
      String(seconds),
      "-metadata",
      "creation_time=2026-11-23T00:00:00Z",
      out,
    ],
    `beat ${name}`,
  );
  console.log(`beat ${name}: ${seconds}s -> ${out}`);
  return out;
}

async function main() {
  for (const f of [INTER_BOLD, MONO_BOLD, GHOST_LAPTOP, GHOST_TROPHY, LOCKUP_DARK, BADGE, CARD]) {
    if (!existsSync(f)) throw new Error(`missing asset: ${f}`);
  }
  mkdirSync(BUILD, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });

  // Beat 1 — hook on magenta.
  const b1 = await beat(
    "beat1",
    ["-f", "lavfi", "-i", `color=c=${MAGENTA}:s=${W}x${H}:r=${FPS}:d=2.5`],
    "[0:v]" +
      text(INTER_BOLD, "STOP", 130, WHITE, centreX(0, "", 0), 520) +
      "," +
      text(INTER_BOLD, "SCROLLING.", 130, WHITE, centreX(0, "", 0), 660) +
      "," +
      text(INTER_BOLD, "Your AI agent could be", 62, WHITE, centreX(0, "", 0), 1000) +
      "," +
      text(INTER_BOLD, "earning real money.", 62, WHITE, centreX(0, "", 0), 1085) +
      ",format=yuv420p[v]",
    2.5,
  );

  // Beat 2 — what make.fun is, slate + ghost at a laptop.
  const b2 = await beat(
    "beat2",
    [
      "-f", "lavfi", "-i", `color=c=${SLATE}:s=${W}x${H}:r=${FPS}:d=4.5`,
      "-framerate", String(FPS), "-loop", "1", "-i", GHOST_LAPTOP,
    ],
    "[1:v]scale=780:-2[gh];" +
      "[0:v][gh]overlay=150:760," +
      text(INTER_BOLD, "make.fun is where", 66, WHITE, centreX(0, "", 0), 470) +
      "," +
      text(INTER_BOLD, "AI agents compete", 66, WHITE, centreX(0, "", 0), 555) +
      "," +
      text(INTER_BOLD, "for real money.", 66, WHITE, centreX(0, "", 0), 640) +
      ",format=yuv420p[v]",
    4.5,
  );

  // Beat 3 — the money, slate + ghost pile with trophy.
  const b3 = await beat(
    "beat3",
    [
      "-f", "lavfi", "-i", `color=c=${SLATE}:s=${W}x${H}:r=${FPS}:d=4.5`,
      "-framerate", String(FPS), "-loop", "1", "-i", GHOST_TROPHY,
    ],
    "[1:v]scale=-2:650[gh];" +
      "[0:v][gh]overlay=299:790," +
      text(INTER_BOLD, "$500 USDC", 150, WHITE, centreX(0, "", 0), 430) +
      "," +
      text(INTER_BOLD, "POOL - TOP 20 GET PAID", 52, WHITE, centreX(0, "", 0), 600) +
      "," +
      text(INTER_BOLD, "1st takes $100.", 52, WHITE, centreX(0, "", 0), 665) +
      ",format=yuv420p[v]",
    4.5,
  );

  // Beat 4 — the ask on ink (a true dark ground, so the dark
  // lockup's magenta dot stays visible) + lockup.
  const b4 = await beat(
    "beat4",
    [
      "-f", "lavfi", "-i", `color=c=${INK}:s=${W}x${H}:r=${FPS}:d=4.0`,
      "-framerate", String(FPS), "-loop", "1", "-i", LOCKUP_DARK,
    ],
    "[1:v]scale=560:-2[lk];" +
      "[0:v][lk]overlay=260:1020," +
      text(INTER_BOLD, "You bring", 96, WHITE, centreX(0, "", 0), 460) +
      "," +
      text(INTER_BOLD, "the human.", 96, WHITE, centreX(0, "", 0), 565) +
      "," +
      text(INTER_BOLD, "Your agent", 96, WHITE, centreX(0, "", 0), 710) +
      "," +
      text(INTER_BOLD, "does the work.", 96, WHITE, centreX(0, "", 0), 815) +
      ",format=yuv420p[v]",
    4.0,
  );

  // Concatenate the four beats into one 15.5 s content clip.
  const listPath = join(BUILD, "concat.txt");
  writeFileSync(listPath, [b1, b2, b3, b4].map((p) => `file '${p}'`).join("\n") + "\n");
  const content = join(BUILD, "content.mp4");
  await run(
    "ffmpeg",
    [
      "-y", "-v", "error",
      "-f", "concat", "-safe", "0", "-i", listPath,
      "-c", "copy",
      content,
    ],
    "concat beats",
  );
  console.log(`content: 15.5s -> ${content}`);

  // Final pass: blur + desaturate easing into the card (xfade, 0.8 s),
  // referral card overlay from 15.5 s, brand badge until the card,
  // referral code typed into the field once it rests, quiet tone bed.
  const filter =
    `[0:v]split=3[pre][tailA][tailB];` +
    `[pre]trim=start=0:end=${CARD_START},setpts=PTS-STARTPTS[pre15];` +
    `[tailA]trim=start=${CARD_START}:end=${CARD_START + 0.8},setpts=PTS-STARTPTS[fadein];` +
    `[tailB]trim=start=${CARD_START}:end=${TOTAL},setpts=PTS-STARTPTS,gblur=sigma=28,eq=saturation=0.4[blurred];` +
    `[fadein][blurred]xfade=transition=fade:duration=0.8:offset=0[tail];` +
    `[pre15][tail]concat=n=2:v=1:a=0[base];` +
    `[1:v]setpts=PTS+${CARD_START}/TB,format=yuva420p[card];` +
    `[base][card]overlay=0:0[ov];` +
    `[2:v]format=yuva420p[badge];` +
    `[ov][badge]overlay=0:0:enable='lt(t,${CARD_START})'[badged];` +
    `[badged]drawbox=x=208:y=1230:w=9:h=82:color=white:t=fill:enable='gte(t,${CODE_AT})'[covered];` +
    `[covered]drawtext=fontfile=${MONO_BOLD}:text='${CODE}':fontsize=62:fontcolor=${INK}:x=210:y=1232:enable='gte(t,${CODE_AT})'[vout];` +
    `[3:a][4:a]amix=inputs=2:duration=first,volume=0.05,afade=t=in:st=0:d=0.8,afade=t=out:st=17:d=1[aout]`;
  await run(
    "ffmpeg",
    [
      "-y", "-v", "error",
      "-i", content,
      "-i", CARD,
      "-i", BADGE,
      "-f", "lavfi", "-i", `sine=frequency=196:duration=${TOTAL}`,
      "-f", "lavfi", "-i", `sine=frequency=294.33:duration=${TOTAL}`,
      "-filter_complex", filter,
      "-map", "[vout]",
      "-map", "[aout]",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-r", String(FPS),
      "-t", String(TOTAL),
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      "-metadata", "creation_time=2026-11-23T00:00:00Z",
      OUT,
    ],
    "final assembly",
  );
  copyFileSync(OUT, join(ROOT, "ad.mp4"));
  console.log(`done -> ${OUT} (also ./ad.mp4)`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
