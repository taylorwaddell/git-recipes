/**
 * Quick test script to verify Opik SDK is working.
 * Run with: node test-opik.mjs
 */

import * as dotenv from "dotenv";

import { dirname, join } from "path";

import { Opik } from "opik";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, ".env") });

console.log("🧪 Testing Opik SDK connection...\n");

// Check environment variables
const apiKey = process.env.OPIK_API_KEY;
const workspace = process.env.OPIK_WORKSPACE;

if (!apiKey || !workspace) {
  console.error("❌ Missing Opik credentials in .env file");
  console.error(`   OPIK_API_KEY: ${apiKey ? "✓ Set" : "✗ Missing"}`);
  console.error(`   OPIK_WORKSPACE: ${workspace ? "✓ Set" : "✗ Missing"}`);
  process.exit(1);
}

console.log(`✓ OPIK_API_KEY: ${apiKey.substring(0, 10)}...`);
console.log(`✓ OPIK_WORKSPACE: ${workspace}`);
console.log();

// Create Opik client
const client = new Opik({
  apiKey,
  workspaceName: workspace,
  projectName: "git-recipes-test",
});

console.log("📤 Creating a test trace...");

// Create a simple test trace
const trace = client.trace({
  name: "test.connection",
  input: { message: "Testing Opik connection" },
  tags: ["test", "connection-check"],
});

trace.update({
  output: { success: true, timestamp: new Date().toISOString() },
});

trace.end();

console.log("✓ Trace created");
console.log();
console.log("📤 Flushing to Opik...");

// Flush to send immediately
await client.flush();

console.log("✓ Flush complete!");
console.log();
console.log("🎉 Test successful! Check Opik UI:");
console.log(
  `   https://www.comet.com/opik/workspace/${workspace}/projects/git-recipes-test/traces`
);
console.log();
console.log("⏱️  Note: Traces typically appear within 5-30 seconds in the UI");
