import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const expectedApiPort = "54321";
const expectedDatabasePort = "54322";

function fail(message) {
  throw new Error(`Local integration guard: ${message}`);
}

function assertLocalUrl(name, value, expectedPort) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail(`${name} is not a valid URL`);
  }
  if (!["localhost", "127.0.0.1"].includes(parsed.hostname)) {
    fail(`${name} must point to localhost or 127.0.0.1`);
  }
  if (parsed.port !== expectedPort) {
    fail(`${name} must use the configured local port ${expectedPort}`);
  }
  return parsed;
}

function parseEnvironment(output) {
  return Object.fromEntries(
    output
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Z0-9_]+)="?(.*?)"?$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2].replace(/"$/, "")]),
  );
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    ...options,
  });
  if (result.status !== 0) {
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    throw new Error(`${command} ${args.join(" ")} failed\n${output}`);
  }
  return result.stdout ?? "";
}

async function waitForServer(url, processHandle) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (processHandle.exitCode !== null) {
      fail("the production server exited before becoming healthy");
    }
    try {
      const response = await fetch(`${url}/admin/login`, {
        redirect: "manual",
      });
      if (response.status === 200) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  fail("the production server did not become healthy in time");
}

async function stopProcess(processHandle) {
  const hasExited = () =>
    processHandle.exitCode !== null || processHandle.signalCode !== null;
  if (hasExited()) return;
  let exited = new Promise((resolve) => processHandle.once("exit", resolve));
  processHandle.kill();
  await Promise.race([
    exited,
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  if (hasExited()) return;
  exited = new Promise((resolve) => processHandle.once("exit", resolve));
  processHandle.kill("SIGKILL");
  await Promise.race([
    exited,
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
  if (!hasExited()) {
    fail("the production server did not stop cleanly");
  }
}

function cleanChildEnvironment() {
  const environment = { ...process.env };
  for (const name of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_URL",
    "TEST_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY",
    "TEST_SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_ACCESS_TOKEN",
    "SUPABASE_DB_PASSWORD",
    "LEAD_IP_HASH_SECRET",
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_CHAT_ID",
    "AI_PROVIDER",
    "AI_PROVIDER_API_KEY",
    "AI_MODEL",
    "AI_PROVIDER_BASE_URL",
    "AI_RATE_LIMIT_SECRET",
    "AI_TIMEOUT_MS",
  ]) {
    delete environment[name];
  }
  return environment;
}

if (!process.argv.includes("--local-only")) {
  fail("the explicit --local-only flag is required");
}

run("docker", ["version"]);

for (const fileName of [
  ".env",
  ".env.local",
  ".env.development",
  ".env.development.local",
  ".env.test",
  ".env.test.local",
  ".env.production",
  ".env.production.local",
]) {
  const filePath = path.join(root, fileName);
  if (!existsSync(filePath)) continue;
  const contents = readFileSync(filePath, "utf8");
  for (const match of contents.matchAll(
    /^\s*((?:NEXT_PUBLIC_|TEST_)?SUPABASE_URL)\s*=\s*["']?([^\s"']+)/gm,
  )) {
    assertLocalUrl(`${fileName} ${match[1]}`, match[2], expectedApiPort);
  }
}

for (const name of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_URL",
  "TEST_SUPABASE_URL",
]) {
  if (process.env[name])
    assertLocalUrl(name, process.env[name], expectedApiPort);
}

const projectRefPath = path.join(root, "supabase", ".temp", "project-ref");
if (existsSync(projectRefPath) && readFileSync(projectRefPath, "utf8").trim()) {
  fail("a linked remote Supabase project was detected");
}

const config = readFileSync(path.join(root, "supabase", "config.toml"), "utf8");
if (!/^project_id\s*=\s*"sklad"$/m.test(config))
  fail("unexpected local project_id");
if (!new RegExp(`^port\\s*=\\s*${expectedApiPort}$`, "m").test(config)) {
  fail("unexpected local API port");
}
if (
  !new RegExp(`^port\\s*=\\s*${expectedDatabasePort}$`, "m").test(
    config.match(/\[db\][\s\S]*?(?=\n\[|$)/)?.[0] ?? "",
  )
) {
  fail("unexpected local database port");
}

const supabaseCli = path.join(
  root,
  "node_modules",
  "supabase",
  "dist",
  "supabase.js",
);
const local = parseEnvironment(
  run(process.execPath, [supabaseCli, "status", "-o", "env"]),
);
const apiUrl = local.API_URL;
const databaseUrl = local.DB_URL;
const publishableKey = local.PUBLISHABLE_KEY ?? local.ANON_KEY;
const serviceRoleKey = local.SECRET_KEY ?? local.SERVICE_ROLE_KEY;
if (!apiUrl || !databaseUrl || !publishableKey || !serviceRoleKey) {
  fail(
    "the local Supabase stack is not running or status output is incomplete",
  );
}
assertLocalUrl("local API URL", apiUrl, expectedApiPort);
const database = assertLocalUrl(
  "local database URL",
  databaseUrl,
  expectedDatabasePort,
);
if (database.pathname !== "/postgres") fail("unexpected local database name");

for (const sqlFile of ["rls.sql", "integrity.sql"]) {
  const sql = readFileSync(
    path.join(root, "supabase", "verification", sqlFile),
    "utf8",
  );
  run(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_sklad",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-f",
      "-",
    ],
    { input: sql },
  );
}

const siteUrl = "http://127.0.0.1:3100";
const nextEnvironment = {
  ...cleanChildEnvironment(),
  NODE_ENV: "production",
  NEXT_PUBLIC_SITE_URL: siteUrl,
  NEXT_PUBLIC_SUPABASE_URL: apiUrl,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  LEAD_IP_HASH_SECRET: "local-integration-lead-secret-32-characters-minimum",
  CATALOG_DATA_SOURCE: "supabase",
  AI_PROVIDER: "fallback",
  AI_RATE_LIMIT_SECRET: "local-integration-ai-secret-32-characters-minimum",
};

run(
  process.execPath,
  [
    path.join(root, "node_modules", "next", "dist", "bin", "next"),
    "build",
    "--webpack",
  ],
  { env: nextEnvironment, stdio: "inherit" },
);

if (!existsSync(path.join(root, ".next", "BUILD_ID"))) {
  fail("the fresh production build did not produce .next/BUILD_ID");
}

const nextProcess = spawn(
  process.execPath,
  [
    path.join(root, "node_modules", "next", "dist", "bin", "next"),
    "start",
    "-H",
    "127.0.0.1",
    "-p",
    "3100",
  ],
  { cwd: root, env: nextEnvironment, stdio: ["ignore", "inherit", "inherit"] },
);

try {
  await waitForServer(siteUrl, nextProcess);
  run(
    process.execPath,
    [
      path.join(root, "node_modules", "vitest", "vitest.mjs"),
      "run",
      "--config",
      "vitest.integration.config.mts",
    ],
    {
      env: {
        ...cleanChildEnvironment(),
        TEHNOSKLAD_LOCAL_TEST: "1",
        TEST_SUPABASE_URL: apiUrl,
        TEST_SUPABASE_PUBLISHABLE_KEY: publishableKey,
        TEST_SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
        TEST_SITE_URL: siteUrl,
      },
      stdio: "inherit",
    },
  );
} finally {
  try {
    assertLocalUrl("cleanup API URL", apiUrl, expectedApiPort);
  } finally {
    await stopProcess(nextProcess);
  }
}
