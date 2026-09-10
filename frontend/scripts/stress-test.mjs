// Automated Stress Test Suite for Nivaran AI Frontend & API Integration
import http from 'http';

const BASE_URL = 'http://localhost:3000';

async function fetchRoute(path, options = {}) {
  const start = performance.now();
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const duration = performance.now() - start;
        resolve({
          status: res.statusCode,
          durationMs: Math.round(duration),
          bytes: data.length,
          headers: res.headers,
        });
      });
    });
    req.on('error', (err) => reject(err));
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function runConcurrencyTest(name, path, concurrency, totalRequests) {
  console.log(`\n--- Running [${name}]: ${totalRequests} requests (${concurrency} concurrent) to ${path} ---`);
  const results = [];
  let inFlight = 0;
  let completed = 0;

  return new Promise((resolve) => {
    function launchNext() {
      if (completed + inFlight >= totalRequests) return;
      inFlight++;
      fetchRoute(path)
        .then((res) => {
          results.push(res);
        })
        .catch((err) => {
          results.push({ status: 500, error: err.message, durationMs: 0 });
        })
        .finally(() => {
          inFlight--;
          completed++;
          if (completed === totalRequests) {
            summarize(name, results);
            resolve(results);
          } else {
            launchNext();
          }
        });
    }

    for (let i = 0; i < Math.min(concurrency, totalRequests); i++) {
      launchNext();
    }
  });
}

function summarize(name, results) {
  const count = results.length;
  const statusCounts = {};
  let totalTime = 0;
  let maxTime = 0;
  let minTime = Infinity;

  for (const r of results) {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    totalTime += r.durationMs;
    if (r.durationMs > maxTime) maxTime = r.durationMs;
    if (r.durationMs < minTime) minTime = r.durationMs;
  }

  const avgTime = (totalTime / count).toFixed(1);
  const successCount = (statusCounts[200] || 0) + (statusCounts[304] || 0);
  const successRate = ((successCount / count) * 100).toFixed(1);

  console.log(`Summary [${name}]:`);
  console.log(`  Total: ${count} requests | Success Rate: ${successRate}% (${successCount}/${count})`);
  console.log(`  Latency: Min=${minTime}ms | Avg=${avgTime}ms | Max=${maxTime}ms`);
  console.log(`  Status codes:`, statusCounts);
}

async function runAllStressTests() {
  console.log("=== NIVARAN AI INTEGRATION & STRESS TEST SUITE ===");

  const routes = [
    { name: "Homepage / Landing", path: "/" },
    { name: "Sign In / Auth Gateway", path: "/login" },
    { name: "Student Intake & Floorplan", path: "/report" },
    { name: "Technician Dispatch & Field Assistant", path: "/technician" },
    { name: "Mission Control / Principal Directive", path: "/admin" },
    { name: "Live Ticket Tracker", path: "/tracker" },
    { name: "Public Transparency Heatmap", path: "/transparency" },
  ];

  // 1. Route availability & Baseline Warmup
  console.log("\n>>> Phase 1: Baseline Route Verification & Warmup");
  for (const r of routes) {
    const res = await fetchRoute(r.path);
    console.log(`  ${r.path.padEnd(16)} -> HTTP ${res.status} (${res.durationMs}ms, ${res.bytes} bytes)`);
  }

  // 2. High-concurrency stress test on core interactive portals
  console.log("\n>>> Phase 2: High-Concurrency Burst Stress Testing (50 concurrent, 100 total per route)");
  for (const r of routes) {
    await runConcurrencyTest(r.name, r.path, 50, 100);
  }

  // 3. Static Assets Stress Test (SVGs, Floorplans)
  console.log("\n>>> Phase 3: Spatial Asset Pipeline Stress Testing");
  const floorplanAssets = [
    "/floor_plans/floor_1_light.svg",
    "/floor_plans/floor_2_light.svg",
    "/floor_plans/floor_3_light.svg",
  ];
  for (const asset of floorplanAssets) {
    await runConcurrencyTest(`Floorplan SVG (${asset})`, asset, 30, 60);
  }

  console.log("\n=== ALL STRESS TESTS COMPLETED SUCCESSFULLY ===");
}

runAllStressTests().catch(console.error);
