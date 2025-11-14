#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("fs/promises");
const path = require("path");
const process = require("process");

// Paste a Base64-encoded PDF into this string if you want to run the script
// without passing it via command-line. Leave it empty when not used.
const INLINE_BASE64 = "";

let PDFParse;
try {
  const pdfParseModule = require("pdf-parse");
  PDFParse =
    pdfParseModule.PDFParse ||
    (typeof pdfParseModule === "function" ? pdfParseModule : undefined);
  if (!PDFParse) {
    throw new TypeError("Invalid pdf-parse export shape.");
  }
} catch (err) {
  if (err && typeof err === "object" && "code" in err && err.code === "MODULE_NOT_FOUND") {
    console.error("Missing dependency: pdf-parse");
    console.error("Install it with `npm install pdf-parse` and rerun the script.");
  } else {
    console.error("Failed to load pdf-parse:", err && err.message ? err.message : err);
  }
  process.exitCode = 1;
  return;
}

async function parseArgs(argv) {
  const parsed = {
    pdfPath: null,
    inputB64: null,
    inputB64File: null,
    useInlineB64: false,
    outputPath: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--output" || arg === "-o") {
      const next = argv[i + 1];
      if (!next || next.startsWith("-")) {
        throw new Error("Missing value for --output option.");
      }
      parsed.outputPath = next;
      i += 1;
    } else if (arg === "--input-b64") {
      const next = argv[i + 1];
      if (!next || next.startsWith("-")) {
        throw new Error("Missing value for --input-b64 option.");
      }
      parsed.inputB64 = next;
      i += 1;
    } else if (arg === "--input-b64-file") {
      const next = argv[i + 1];
      if (!next || next.startsWith("-")) {
        throw new Error("Missing value for --input-b64-file option.");
      }
      parsed.inputB64File = next;
      i += 1;
    } else if (arg === "--use-inline-b64") {
      parsed.useInlineB64 = true;
    } else if (!parsed.pdfPath && !arg.startsWith("-")) {
      parsed.pdfPath = arg;
    } else {
      throw new Error(`Unrecognized argument: ${arg}`);
    }
  }

  const hasDirectFile = Boolean(parsed.pdfPath);
  const hasInline = parsed.useInlineB64 && INLINE_BASE64.trim().length > 0;
  const hasInlineButEmpty = parsed.useInlineB64 && INLINE_BASE64.trim().length === 0;
  const hasB64 = Boolean(parsed.inputB64);
  const hasB64File = Boolean(parsed.inputB64File);

  if (hasInlineButEmpty) {
    throw new Error(
      "INLINE_BASE64 is empty. Paste your Base64 PDF string into the file or omit --use-inline-b64."
    );
  }

  if (
    [hasDirectFile, hasInline, hasB64, hasB64File].filter(Boolean).length === 0
  ) {
    throw new Error(
      "Provide a PDF file path, --input-b64 <BASE64>, --input-b64-file <path>, or --use-inline-b64."
    );
  }

  return parsed;
}

async function ensureFileExists(filePath) {
  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      throw new Error("The provided path is not a file.");
    }
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new Error(`PDF file not found at ${filePath}`);
    }
    throw err;
  }
}

function normalizeBase64(b64) {
  return b64.replace(/\s+/g, "");
}

async function resolvePdfData({ pdfPath, inputB64, inputB64File, useInlineB64 }) {
  if (pdfPath) {
    await ensureFileExists(pdfPath);
    return fs.readFile(pdfPath);
  }

  if (inputB64File) {
    const raw = await fs.readFile(inputB64File, { encoding: "utf8" });
    return Buffer.from(normalizeBase64(raw), "base64");
  }

  if (inputB64) {
    return Buffer.from(normalizeBase64(inputB64), "base64");
  }

  if (useInlineB64) {
    return Buffer.from(normalizeBase64(INLINE_BASE64), "base64");
  }

  throw new Error("Unable to resolve PDF input.");
}

async function extractText(pdfInput) {
  const data = Buffer.isBuffer(pdfInput) ? pdfInput : await fs.readFile(pdfInput);
  const parser = new PDFParse({ data });

  try {
    const result = await parser.getText();
    return (result.text || "").trim();
  } finally {
    await parser.destroy();
  }
}

async function saveOutput(text, outputPath) {
  const directory = path.dirname(outputPath);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(outputPath, text, { encoding: "utf8" });
}

async function main(argv) {
  const parsed = await parseArgs(argv);
  const data = await resolvePdfData(parsed);
  const text = await extractText(data);

  if (parsed.outputPath) {
    await saveOutput(text, parsed.outputPath);
  } else {
    process.stdout.write(text);
    if (!text.endsWith("\n")) {
      process.stdout.write("\n");
    }
  }
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(`Failed to extract text: ${err.message}`);
    process.exit(1);
  });
}

module.exports = {
  extractText,
};

