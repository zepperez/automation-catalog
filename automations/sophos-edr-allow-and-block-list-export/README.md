# Export Partner Tenants Allow / Block lists from Sophos

## **Overview**
Clients are being migrated off the Sophos platform onto Sentinel One. The purpose of this automation is to export the allow and block lists for each client in Sophos to files for backup purposes and also to create a single exclusions CSV that combines all clients for easy import into Sentinel One.

### **Requirements**
* Parner ClientId / ClientSecret from Sophos
* PowerShell 7+
* ImportExcel Powershell Module

### **Automation flow**

1. **Parameters & Setup**
   * Accepts an optional `ExportPath` (default `/Users/david.just/Downloads/SophosExport`).
   * Declares helper functions for token retrieval, tenant listing, and API paging.

2. **Get a Partner Token**
   * `Get-SophosPartnerToken`  
     * Builds a client‑credentials request body.  
     * Calls `https://id.sophos.com/api/v2/oauth2/token`.  
     * Returns a PSObject containing `access_token`, `refresh_token`, etc.

3. **Retrieve the list of tenants**
   * `Get-SophosPartnerTenants`  
     * If no `PartnerId` supplied, calls `/whoami/v1` to discover it.  
     * Adds `X-Partner-ID` header.  
     * Loops through paginated `/partner/v1/tenants` endpoint until no items remain.  
     * Returns an array of tenant objects (each has `id`, `name`, `apiHost`, etc.).

4. **Define API paths to pull**
   * Variables for each endpoint:
     * `allowed-items`, `intrusion-prevention`, `isolation`,
       `exclusions/scanning`, `blocked-items`, `blocked-addresses`.

5. **Iterate over each tenant**
   ```powershell
   foreach ($PartnerTenant in $Tenants) {
       ...
   }
   ```

   For each tenant:

   a. **Set tenant‑specific variables**  
      * `$BaseUri` ← `$PartnerTenant.apiHost`  
      * `$TenantId` ← `$PartnerTenant.id`

   b. **Pull data from each endpoint**  
      * Call `Get-SophosTenantEndpointApi` for every path.  
        - Builds a bearer‑auth header plus `X-Tenant-ID`.  
        - Handles 404, 403, and 429 (rate‑limit) errors with retries/backoff.  
        - Gathers all pages of results.

   c. **Transform Allowed‑Items into a friendly object**  
      * Uses `.foreach` to map each item’s properties (`id`, `path`, `type`, etc.) into a custom object.

   d. **Build the tenant data structure**  
      ```powershell
      $Data = [PSCustomObject]@{
          TenantName   = $PartnerTenant.name
          TenantId     = $PartnerTenant.id
          Exclusions   = @{ AllowedItems=...; IntrusionPrevention=...; Isolation=...; Scanning=... }
          Blocked      = @{ BlockedItems=...; BlockedAddresses=... }
      }
      ```

   e. **Export to Excel**  
      * For each section in `$Data.Exclusions` and `$Data.Blocked`:  
        - Call `Export-Excel` (from the `ImportExcel` module).  
        - Worksheet name = key + “ Exclusions” (for exclusions) or just the key (for blocked).  
        - File path = `"$ExportPath/$TenantName.xlsx"`.

6. **Result**
   * For every tenant, an Excel workbook is created in the export folder containing:
     * Separate worksheets for each exclusions category (Allowed Items, Intrusion Prevention, Isolation, Scanning).
     * Separate worksheets for blocked items and addresses.
    * For all tenants Craft a Sentinel One (S1) formatted CSV for scanning exclusions and allowed items of all tenants. Automatically map expected fields [OS, Path, Type, PathType, SubFolders]

---

### **Step‑by‑step Script Breakdown**

| # | Action | What the script does (including the new Sentinel 1 transformation) |
|---|--------|-------------------------------------------------------------------|
| 1 | **Set the export path** | Default `/Users/david.just/Downloads/SophosExport`. |
| 2 | **Define helper functions** | `Get‑SophosPartnerToken`, `Get‑SophosPartnerTenants`, `Get‑SophosTenantEndpointApi`. |
| 3 | **Acquire credentials** | `$ClientId` hard‑coded; `$ClientSecret` pulled from KeyVault via `Get‑Secret`. |
| 4 | **Obtain an OAuth token** | `$Token = Get‑SophosPartnerToken …` |
| 5 | **Retrieve the tenant list** | `$Tenants = Get‑SophosPartnerTenants -Token $Token.access_token` |
| 6 | **Define API paths** | Strings for each endpoint (`allowed-items`, `intrusion‑prevention`, …). |
| 7 | **Loop over every tenant** (`foreach ($PartnerTenant in $Tenants)`) | Each iteration handles one partner‑tenant. |
| 8 | **Tenant context** | `$BaseUri = $PartnerTenant.apiHost`, `$TenantId = $PartnerTenant.id`. |
| 9 | **Pull each API endpoint** | Call `Get‑SophosTenantEndpointApi` for all six endpoints; handle paging, 404/403/429. |
|10 | **Transform “Allowed Items”** | Map raw items to a custom object with fields `id, path, type…`. |
|11 | **Create Sentinel One Compatible List** |  
&nbsp;&nbsp;• `ClientName = $PartnerTenant.name` – the tenant’s friendly name.  
&nbsp;&nbsp;• **Scanning exclusions** – loop over `$Scanning`:  
&nbsp;&nbsp;&nbsp;&nbsp;- Clear temp vars (`$Os,$PathType,$Sha256`).  
&nbsp;&nbsp;&nbsp;&nbsp;- `switch` on `$Exclusion.Type` to re‑classify the type (`amsi`, `detectedExploit`, `path`, `process`); ignore `pua`/`web`.  
&nbsp;&nbsp;&nbsp;&nbsp;- Determine OS (`windows` or `MacOs`) by regex on the value.  
&nbsp;&nbsp;&nbsp;&nbsp;- Set `$PathType` (`file`/`folder`) based on file‑extension pattern.  
&nbsp;&nbsp;&nbsp;&nbsp;- Build a `[pscustomobject]` with fields `Type, OS, Value, SHA256, Path Type, Subfolders…`, plus a `Client` field set to `$ClientName`.  
&nbsp;&nbsp;• **Allowed‑items** – loop over `$AllowedItems`:  
&nbsp;&nbsp;&nbsp;&nbsp;- Detect OS and path type same way.  
&nbsp;&nbsp;&nbsp;&nbsp;- Build a `[pscustomobject]` identical to the scanning one but with `Type = 'path'`, `Description = $Item.comment`, `Value = $Item.path`. |
|12 | **Build the tenant data object** | `$Data` contains `TenantName`, `TenantId`, two sub‑hashtables:  
&nbsp;&nbsp;– `Exclusions` (AllowedItems, IntrusionPrevention, Isolation, Scanning)  
&nbsp;&nbsp;– `Blocked` (BlockedItems, BlockedAddresses). |
|13 | **Export to Excel** |  
&nbsp;&nbsp;• For each key in `$Data.Exclusions`: `Export‑Excel` → worksheet “\<Key> Exclusions”.  
&nbsp;&nbsp;• For each key in `$Data.Blocked`: `Export‑Excel` → worksheet “\<Key>”.  
&nbsp;&nbsp;The workbook is named after the tenant (`"$ExportPath/$($Data.TenantName).xlsx"`). |
|14 | **Continue loop** | Repeat steps 8‑13 for the next tenant until all tenants are processed. |
| 15 | **End** | Export Sentinel One formatted CSV |

```