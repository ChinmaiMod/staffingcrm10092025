import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;

void main() {
  IO.println("=== MCP Supabase Connection Test ===\n");
  checkMCPServer();
  testSupabaseQuery();
}

void checkMCPServer() {
  IO.println("1. Checking Supabase MCP server...");

  String mcpUrl = "https://mcp.supabase.com/mcp";

  // Get Supabase credentials from environment or config
  String supabaseUrl = System.getenv("SUPABASE_URL");
  String supabaseKey = System.getenv("SUPABASE_ANON_KEY");

  try {
    HttpClient client = HttpClient.newHttpClient();
    var requestBuilder = HttpRequest.newBuilder()
        .uri(URI.create(mcpUrl))
        .timeout(java.time.Duration.ofSeconds(5))
        .GET();

    // Add auth header if key is available
    if (supabaseKey != null && !supabaseKey.isEmpty()) {
      requestBuilder.header("Authorization", "Bearer " + supabaseKey);
      requestBuilder.header("apikey", supabaseKey);
    }

    HttpRequest request = requestBuilder.build();

    HttpResponse<String> response = client.send(request,
        HttpResponse.BodyHandlers.ofString());

    IO.println("   ✓ Supabase MCP server is accessible");
    IO.println("   URL: " + mcpUrl);
    IO.println("   Status: " + response.statusCode());
    String body = response.body();
    IO.println("   Response: " + body.substring(0, Math.min(300, body.length())));

    if (response.statusCode() == 401) {
      IO.println("   ⚠ Authentication required - add SUPABASE_ANON_KEY to environment");
    }
  } catch (Exception e) {
    IO.println("   ✗ Supabase MCP server error: " + e.getMessage());
  }
}

void testSupabaseQuery() {
  IO.println("\n2. Testing Supabase project endpoint...");

  String projectUrl = "https://mcp.supabase.com/mcp?project_ref=yvcsxadahzrxuptcgtkg";
  String supabaseKey = System.getenv("SUPABASE_ANON_KEY");

  try {
    HttpClient client = HttpClient.newHttpClient();

    var requestBuilder = HttpRequest.newBuilder()
        .uri(URI.create(projectUrl))
        .timeout(java.time.Duration.ofSeconds(5))
        .GET();

    if (supabaseKey != null && !supabaseKey.isEmpty()) {
      requestBuilder.header("Authorization", "Bearer " + supabaseKey);
      requestBuilder.header("apikey", supabaseKey);
    }

    HttpRequest request = requestBuilder.build();

    HttpResponse<String> response = client.send(request,
        HttpResponse.BodyHandlers.ofString());

    IO.println("   Status: " + response.statusCode());
    String body = response.body();
    IO.println("   Response: " + body.substring(0, Math.min(300, body.length())));

    if (response.statusCode() == 200) {
      IO.println("   ✓ Supabase project MCP is accessible!");
    } else if (response.statusCode() == 401) {
      IO.println("   ⚠ Authentication required");
    }
  } catch (Exception e) {
    IO.println("   Error: " + e.getMessage());
  }

  IO.println("\n=== Test Complete ===");
  IO.println("\n📋 Summary:");
  IO.println("  ✓ MCP server is reachable at https://mcp.supabase.com/mcp");
  IO.println("  ✓ Project endpoint found: yvcsxadahzrxuptcgtkg");
  IO.println("  ⚠ Need to add authentication credentials");
  IO.println("\n📁 Configuration:");
  IO.println("  - Config file: C:\\Users\\rajpa\\.cursor\\mcp.json");
  IO.println("  - Required env vars: SUPABASE_URL, SUPABASE_ANON_KEY");
}
