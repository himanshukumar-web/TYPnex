import { signJwt } from "../lib/auth/jwt";

async function runLiveSecurityTests() {
  console.log("\n=======================================================");
  console.log("   TYPnex Live Endpoint & Security Audit Suite");
  console.log("=======================================================\n");

  const baseUrl = process.env.TEST_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Security Headers Verification on pages
  console.log("1. SECURITY HEADERS");
  const homeRes = await fetch(`${baseUrl}/login`);
  assert(homeRes.status === 200, "login page responds 200 OK");
  assert(homeRes.headers.get("x-content-type-options") === "nosniff", "headers include X-Content-Type-Options: nosniff");
  assert(homeRes.headers.get("x-frame-options") === "SAMEORIGIN", "headers include X-Frame-Options: SAMEORIGIN");
  assert(Boolean(homeRes.headers.get("content-security-policy")), "headers include Content-Security-Policy");
  const permPolicy = homeRes.headers.get("permissions-policy") || "";
  assert(permPolicy.includes("camera=(self)") && permPolicy.includes("microphone=(self)"), "permissions policy grants camera and microphone");

  // 2. Unauthenticated API Endpoint Protection (Middleware & Route Guard)
  console.log("\n2. UNAUTHENTICATED API ACCESS REJECTION");
  const unauthAdmin = await fetch(`${baseUrl}/api/admin/users`);
  assert(unauthAdmin.status === 401, "unauthenticated request to /api/admin/users returns 401");

  const unauthEmployee = await fetch(`${baseUrl}/api/employee/users`);
  assert(unauthEmployee.status === 401, "unauthenticated request to /api/employee/users returns 401");

  const unauthFile = await fetch(`${baseUrl}/api/files/download/doc-123.pdf`);
  assert(unauthFile.status === 401, "unauthenticated request to /api/files/download returns 401");

  const unauthChat = await fetch(`${baseUrl}/api/chat/conversations`);
  assert(unauthChat.status === 401, "unauthenticated request to /api/chat/conversations returns 401");

  // 3. User Role Privilege Escalation Rejection (RBAC)
  console.log("\n3. RBAC PRIVILEGE ESCALATION REJECTION");
  const fakeUserToken = signJwt({
    userId: "attacker-user-id",
    email: "attacker@example.com",
    name: "Malicious User",
    role: "USER",
    isVerified: false,
  });

  const userHeaders = {
    Cookie: `typnex_auth_token=${fakeUserToken}`,
  };

  const userToAdmin = await fetch(`${baseUrl}/api/admin/users`, { headers: userHeaders });
  assert(userToAdmin.status === 403, "standard user calling /api/admin/users is rejected with 403 Forbidden");

  const userToEmployee = await fetch(`${baseUrl}/api/employee/users`, { headers: userHeaders });
  assert(userToEmployee.status === 403, "standard user calling /api/employee/users is rejected with 403 Forbidden");

  // 4. Employee Role Access Restrictions
  console.log("\n4. EMPLOYEE ROLE RBAC BOUNDARIES");
  const employeeToken = signJwt({
    userId: "staff-emp-id",
    email: "staff@typnex.com",
    name: "Staff Employee",
    role: "EMPLOYEE",
    isVerified: true,
  });

  const empHeaders = {
    Cookie: `typnex_auth_token=${employeeToken}`,
  };

  const empToAdmin = await fetch(`${baseUrl}/api/admin/users`, { headers: empHeaders });
  assert(empToAdmin.status === 403, "employee calling admin-only /api/admin/users is rejected with 403 Forbidden");

  // Authenticate to get real session cookie
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@typnex.com", password: "AdminPass@2026" }),
  });
  const cookieHeader = loginRes.headers.get("set-cookie") || "";
  const tokenMatch = cookieHeader.match(/typnex_auth_token=([^;]+)/);
  const realAuthToken = tokenMatch ? tokenMatch[1] : "";

  const authenticatedHeaders = {
    Cookie: `typnex_auth_token=${realAuthToken}`,
  };

  // 5. File Security Validation: Video & Executable Rejection
  console.log("\n5. FILE UPLOAD SECURITY (VIDEO & EXECUTABLE REJECTION)");
  // Video upload attempt
  const videoForm = new FormData();
  const videoBlob = new Blob(["fake video content"], { type: "video/mp4" });
  videoForm.append("file", videoBlob, "clip.mp4");
  videoForm.append("conversationId", "dummy-conv-id");

  const videoRes = await fetch(`${baseUrl}/api/chat/upload`, {
    method: "POST",
    headers: authenticatedHeaders,
    body: videoForm,
  });
  const videoData = await videoRes.json();
  assert(videoRes.status === 400 && videoData.error === "Video files are not supported.", "video upload rejected with 400 Bad Request");

  // Executable upload attempt
  const exeForm = new FormData();
  const exeBlob = new Blob(["fake payload"], { type: "application/x-msdownload" });
  exeForm.append("file", exeBlob, "trojan.exe");
  exeForm.append("conversationId", "dummy-conv-id");

  const exeRes = await fetch(`${baseUrl}/api/chat/upload`, {
    method: "POST",
    headers: authenticatedHeaders,
    body: exeForm,
  });
  const exeData = await exeRes.json();
  assert(exeRes.status === 400 && exeData.error?.includes("strictly prohibited"), "executable .exe upload rejected with 400 Bad Request");

  // 6. Rate Limiting Protection (Brute Force Protection)
  console.log("\n6. RATE LIMITING (BRUTE-FORCE MITIGATION)");
  let rateLimited = false;
  let retryAfterFound = false;
  for (let i = 0; i < 15; i++) {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "rate_test@example.com", password: "wrong" }),
    });
    if (res.status === 429) {
      rateLimited = true;
      if (res.headers.get("retry-after")) {
        retryAfterFound = true;
      }
      break;
    }
  }
  assert(rateLimited, "rapid repeated requests triggered 429 Too Many Requests");
  assert(retryAfterFound, "rate-limited response contains Retry-After header");

  console.log("\n=======================================================");
  console.log(`   Live Security Audit Results: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runLiveSecurityTests().catch((err) => {
  console.error("Live security testing failed:", err);
  process.exit(1);
});
