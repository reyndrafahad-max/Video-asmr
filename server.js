import express from "express";
import multer from "multer";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

dotenv.config();
const app = express();
const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 150 * 1024 * 1024 } });
const execFileAsync = promisify(execFile);
app.use(express.json({ limit: "2mb" }));
app.use(express.static("public"));

const API = "https://generativelanguage.googleapis.com/v1beta/interactions";
function apiKey(req) {
  return process.env.GEMINI_API_KEY || req.headers["x-gemini-key"];
}
function requireKey(req, res) {
  if (!apiKey(req)) {
    res.status(400).json({ error: "API Key belum diatur. Isi GEMINI_API_KEY di file .env lalu restart aplikasi." });
    return false;
  }
  return true;
}
async function gemini(req, body) {
  const response = await fetch(`${API}?key=${encodeURIComponent(apiKey(req))}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `Gemini API error (${response.status})`);
  return data;
}
function findContent(data, type) {
  for (const step of (data.steps || [])) {
    for (const part of (step.content || [])) {
      if (part.type === type && part.data) return part;
    }
  }
  return null;
}
app.get("/api/status", (req,res) => res.json({ keyConfigured: !!process.env.GEMINI_API_KEY, ffmpeg: null }));

app.post("/api/image", async (req,res) => {
  if (!requireKey(req,res)) return;
  try {
    const prompt = String(req.body.prompt || "").slice(0,6000);
    const data = await gemini(req, {
      model: "gemini-3.1-flash-image",
      input: `Photorealistic cinematic ASMR rain scene, 16:9 landscape composition. ${prompt}. No text, no logos, natural realistic details.`,
      response_format: { type: "image", mime_type: "image/png", aspect_ratio: "16:9", image_size: "2K" }
    });
    const image = data.output_image || findContent(data, "image");
    if (!image?.data) throw new Error("Gemini tidak mengembalikan gambar. Periksa akses model dan kuota API.");
    res.json({ image: `data:${image.mime_type || "image/png"};base64,${image.data}` });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/video", async (req,res) => {
  if (!requireKey(req,res)) return;
  try {
    const prompt = String(req.body.prompt || "").slice(0,6000);
    const data = await gemini(req, {
      model: "gemini-omni-1.2-flash",
      input: `Create a photorealistic, calm ASMR rain video. 16:9 landscape. A single continuous locked camera shot, subtle natural rain motion, no cuts, no people, no text. ${prompt}`,
      response_format: { type: "video", aspect_ratio: "16:9", duration: "15s", resolution: "720p" }
    });
    const video = data.output_video || findContent(data, "video");
    if (!video?.data) throw new Error("Gemini tidak mengembalikan video. Periksa akses model, kuota, dan dukungan akun.");
    res.json({ video: `data:${video.mime_type || "video/mp4"};base64,${video.data}`, durationSeconds: 15 });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/assemble", upload.fields([{name:"video",maxCount:1},{name:"audio",maxCount:1}]), async (req,res) => {
  const v = req.files?.video?.[0], a = req.files?.audio?.[0];
  if (!v || !a) return res.status(400).json({error:"File video dan audio diperlukan."});
  const out = path.join(os.tmpdir(), `asmr-${randomUUID()}.mp4`);
  try {
    // Requires FFmpeg installed on the hosting server.
    await execFileAsync("ffmpeg", [
      "-y","-stream_loop","-1","-i",v.path,"-stream_loop","-1","-i",a.path,
      "-t","600","-map","0:v:0","-map","1:a:0",
      "-vf","scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1",
      "-r","30","-c:v","libx264","-preset","veryfast","-crf","23",
      "-c:a","aac","-b:a","192k","-shortest","-movflags","+faststart",out
    ], { timeout: 30 * 60 * 1000, maxBuffer: 10 * 1024 * 1024 });
    res.download(out, "asmr-rain-10-minutes.mp4", () => {
      for (const f of [v.path,a.path,out]) try { fs.unlinkSync(f); } catch {}
    });
  } catch(e) {
    for (const f of [v.path,a.path,out]) try { fs.unlinkSync(f); } catch {}
    res.status(500).json({error: "Perakitan MP4 gagal. Pastikan FFmpeg tersedia di server. " + e.message});
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`ASMR Rain Studio running on http://localhost:${port}`));
