# Enabling Single Sign-On (SSO) for Automation Catalog

This guide shows you how to enable optional Azure AD Single Sign-On (SSO) authentication for your Automation Catalog. With SSO enabled, users must authenticate with their Microsoft organizational account before accessing the site.

---

## Overview

The Automation Catalog supports optional SSO authentication using Azure Static Web Apps' built-in authentication features.

**By default, SSO is DISABLED** - the site is publicly accessible. When you enable SSO:

- Users must sign in with Azure AD (Microsoft Entra ID) to access the site
- You can optionally restrict access to specific Azure AD groups
- Authentication is handled entirely by Azure - no custom code required
- The feature is completely optional and easy to enable/disable

---

## Prerequisites

Before enabling SSO, you must complete the Azure AD setup:

1. **Complete Azure AD Configuration**: Follow the **[Azure_AD_Setup.md](./Azure_AD_Setup.md)** guide first
2. **Have your Azure Static Web App deployed**: The site must be running on Azure Static Web Apps
3. **Have the following information ready**:
   - Application (client) ID
   - Directory (tenant) ID
   - Client secret
   - (Optional) Azure AD Group Object ID for access restriction

If you haven't completed these prerequisites, stop here and complete the Azure AD setup first.

---

## How It Works

Azure Static Web Apps uses a configuration file (`staticwebapp.config.json`) to define:
- **Route rules**: Which routes require authentication
- **Authentication providers**: Connection to Azure AD
- **Role requirements**: Optional group-based access control

The repository includes `staticwebapp.config.json.example` as a template. When you copy it to `staticwebapp.config.json`, Azure Static Web Apps automatically enforces the authentication rules.

---

## Quick Start: Enable SSO

### Step 1: Copy the Configuration File

The repository includes `staticwebapp.config.json.example` as a template. To enable SSO:

```bash
cp staticwebapp.config.json.example staticwebapp.config.json
```

This creates the active configuration file that Azure Static Web Apps will use.

### Step 2: Configure Azure AD

Follow the **[Azure_AD_Setup.md](./Azure_AD_Setup.md)** guide to:
1. Register an application in Azure AD / Entra ID
2. Configure authentication settings
3. Connect Azure Static Web Apps to Azure AD
4. (Optional) Set up group-based access control

### Step 3: Deploy

**Option A: Commit the SSO configuration (recommended for production)**

```bash
git add -f staticwebapp.config.json
git commit -m "Enable Azure AD SSO authentication"
git push origin main
```

Note: We use `git add -f` because the file is in `.gitignore` by default. This commits the SSO config to your repo.

**Option B: Keep it local (for testing)**

If you want to test SSO without committing the config:

```bash
# The file exists locally but won't be committed
git push origin main
```

Then manually upload or configure in Azure Portal.

### Step 4: Test Authentication

1. Wait for deployment (2-5 minutes)
2. Visit your site URL
3. You should be redirected to Microsoft login
4. After signing in, you'll have access to the site

That's it! SSO is now enabled.

---

## Quick Start: Disable SSO (Default)

By default, the site is **publicly accessible** without authentication. No action needed!

If you previously enabled SSO and want to disable it:

```bash
rm staticwebapp.config.json
git commit -m "Disable SSO - restore public access"
git push origin main
```

The site will be publicly accessible after deployment.

---

## Configuration Details

### Understanding staticwebapp.config.json

Here's what the default configuration does:

```json
{
  "routes": [
    {
      "route": "/*",
      "allowedRoles": ["authenticated"]
    }
  ],
  "responseOverrides": {
    "401": {
      "redirect": "/.auth/login/aad",
      "statusCode": 302
    }
  },
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/favicon.svg", "/*.{css,scss,js,json,png,jpg,jpeg,gif,svg,ico,xml,txt}"]
  }
}
```

**Key components:**

1. **Routes**:
   - `"route": "/*"` - Applies to all routes
   - `"allowedRoles": ["authenticated"]` - Only authenticated users can access

2. **Response Overrides**:
   - `401` errors (unauthorized) redirect to Azure AD login
   - Users are automatically prompted to sign in

3. **Navigation Fallback**:
   - Ensures SPA routing works correctly with authentication
   - Excludes static assets from authentication requirements

---

## Advanced: Group-Based Access Control

If you completed the optional group configuration in Azure AD, you can restrict access to specific groups.

### Step 1: Verify Group Role Assignment

In Azure Portal:
1. Go to your Static Web App → **Settings** → **Authentication** → **Role management**
2. Verify your group is assigned to a role (e.g., `authorized`)

### Step 2: Update Configuration (Optional)

If you created a custom role in Azure, update `staticwebapp.config.json`:

```json
{
  "routes": [
    {
      "route": "/*",
      "allowedRoles": ["authorized"]
    }
  ],
  "responseOverrides": {
    "401": {
      "redirect": "/.auth/login/aad",
      "statusCode": 302
    }
  }
}
```

Replace `"authenticated"` with your custom role name (e.g., `"authorized"`).

**Note**: The default configuration using `"authenticated"` allows any user in your Azure AD tenant to access the site. Using a specific role restricts access to group members only.

### Step 3: Deploy Changes

```bash
git add staticwebapp.config.json
git commit -m "Add group-based access control"
git push origin main
```

### Step 4: Test Group Access

1. Sign in with a user who is **in** the authorized group - should work
2. Sign in with a user who is **not** in the group - should see access denied

---

## Customizing Authentication

### Allow Public Access to Specific Routes

If you want some routes to be public while protecting others:

```json
{
  "routes": [
    {
      "route": "/",
      "allowedRoles": ["anonymous", "authenticated"]
    },
    {
      "route": "/public/*",
      "allowedRoles": ["anonymous", "authenticated"]
    },
    {
      "route": "/*",
      "allowedRoles": ["authenticated"]
    }
  ]
}
```

This configuration:
- Makes the homepage (`/`) public
- Makes `/public/*` routes public
- Requires authentication for all other routes

**Note**: Order matters! More specific routes should come before general ones.

### Custom Login/Logout Routes

You can customize the authentication experience:

```json
{
  "routes": [
    {
      "route": "/login",
      "rewrite": "/.auth/login/aad"
    },
    {
      "route": "/logout",
      "rewrite": "/.auth/logout"
    },
    {
      "route": "/*",
      "allowedRoles": ["authenticated"]
    }
  ]
}
```

This creates `/login` and `/logout` routes for better UX.

### Add a Login Button (Optional)

If you want to add a login/logout button to your site, you can create a component that uses the built-in auth endpoints:

**Example location: `src/components/AuthButton.tsx`**

```tsx
import { useEffect, useState } from 'react';

export default function AuthButton() {
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    fetch('/.auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.clientPrincipal) {
          setUserInfo(data.clientPrincipal);
        }
      });
  }, []);

  if (!userInfo) {
    return (
      <a href="/.auth/login/aad" className="btn btn-primary">
        Sign In
      </a>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <span>Hello, {userInfo.userDetails}</span>
      <a href="/.auth/logout" className="btn btn-secondary">
        Sign Out
      </a>
    </div>
  );
}
```

**Add to BaseLayout.astro:**

```astro
import AuthButton from '../components/AuthButton';

<!-- In the header section -->
<div class="flex items-center gap-4">
  <AuthButton client:load />
  <CustomerFilter client:load customers={customers} />
  <DarkModeToggle client:load />
</div>
```

---

## Toggling SSO On and Off

### Method 1: Copy/Delete the Config File (Recommended)

**To enable SSO:**
```bash
cp staticwebapp.config.json.example staticwebapp.config.json
git add -f staticwebapp.config.json
git commit -m "Enable SSO"
git push
```

**To disable SSO:**
```bash
git rm staticwebapp.config.json
git commit -m "Disable SSO"
git push
```

The `.example` file always remains as a template.

### Method 2: Use Git Branches

- **Main branch**: Keep SSO disabled (public access)
- **Production branch**: Enable SSO (protected access)

This allows different authentication settings for different environments:

```bash
# On main branch
# No staticwebapp.config.json = public access

# On production branch
cp staticwebapp.config.json.example staticwebapp.config.json
git add -f staticwebapp.config.json
git commit -m "Enable SSO for production"
```

### Method 3: Local vs Production Configuration

The `staticwebapp.config.json` file is in `.gitignore` by default, so:

- **Production**: Explicitly commit the config with `git add -f` when you want SSO
- **Local dev**: Keep the file local for testing without committing
- **Template users**: Clone the repo and get public access by default

---

## Testing SSO

### Test Checklist

After enabling SSO, verify the following:

✅ **Basic Authentication**
- [ ] Visit the site - redirected to Microsoft login
- [ ] Sign in with organizational account - access granted
- [ ] Can navigate between pages without re-authentication
- [ ] Sign out works correctly

✅ **Group-Based Access (if configured)**
- [ ] User in authorized group can access the site
- [ ] User not in authorized group sees access denied
- [ ] Group membership changes reflect after new login

✅ **Static Assets**
- [ ] Images load correctly
- [ ] CSS styles apply
- [ ] JavaScript functionality works
- [ ] Favicon appears in browser tab

✅ **Navigation**
- [ ] All navigation links work
- [ ] Direct URL access works (after authentication)
- [ ] Browser back/forward buttons work
- [ ] Page refresh maintains authentication

---

## Troubleshooting

### Issue: "Configuration file not found" error

**Solution:**
- Ensure `staticwebapp.config.json` exists in the repository root
- Verify the file is committed to Git
- Check the file is deployed (check Azure Portal → Static Web App → Configuration)

### Issue: Site doesn't redirect to login

**Solution:**
1. Verify `staticwebapp.config.json` is deployed
2. Check Azure Static Web Apps Authentication is configured
3. Wait 2-5 minutes after deployment for changes to propagate
4. Clear browser cache and try again

### Issue: "Invalid redirect URI" error during login

**Solution:**
1. Go to Azure AD App Registration → **Authentication**
2. Verify redirect URI matches exactly: `https://YOUR-SITE.azurestaticapps.net/.auth/login/aad/callback`
3. Check for typos in your site URL
4. Ensure there's no trailing slash

### Issue: User authenticates but still sees 401/403

**Solution:**
1. If using group-based access:
   - Verify user is a member of the authorized group
   - Check the group Object ID is correct in Role management
   - Ensure `groups` claim is configured in Azure AD token settings
2. Check the role name in `staticwebapp.config.json` matches Role management
3. Try signing out and signing in again to refresh the token

### Issue: Config changes not taking effect

**Solution:**
1. Verify the file is committed and pushed to the correct branch
2. Check GitHub Actions deployment completed successfully
3. Wait 2-5 minutes for CDN cache to clear
4. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
5. Try incognito/private browsing mode

### Issue: Local development doesn't work with SSO

**Solution:**
- Azure Static Web Apps authentication only works in production
- For local development, either:
  - Use the [Azure Static Web Apps CLI](https://azure.github.io/static-web-apps-cli/)
  - Or disable SSO locally by renaming the config file
  - Or use the `swa` CLI emulator which supports auth emulation

---

## Security Considerations

### Best Practices

1. **Client Secret Management**:
   - Never commit client secrets to source control
   - Rotate secrets regularly (set reminders)
   - Store in Azure Key Vault for production

2. **Group-Based Access**:
   - Use dedicated Azure AD groups for access control
   - Regularly audit group membership
   - Use dynamic groups based on user attributes when possible

3. **Token Expiration**:
   - Default session timeout is based on Azure AD settings
   - Users need to re-authenticate when tokens expire
   - Consider implementing refresh token rotation

4. **Monitoring**:
   - Review Azure AD sign-in logs regularly
   - Monitor Static Web Apps logs for authentication errors
   - Set up alerts for failed authentication attempts

5. **Emergency Access**:
   - Maintain a backup admin access method
   - Document the disable-SSO procedure for emergencies
   - Keep the config example file for quick rollback

---

## Configuration Reference

### Complete Configuration Schema

```json
{
  "$schema": "https://json.schemastore.org/staticwebapp.config.json",
  "routes": [
    {
      "route": "/*",
      "allowedRoles": ["authenticated"]
    }
  ],
  "responseOverrides": {
    "401": {
      "redirect": "/.auth/login/aad",
      "statusCode": 302
    }
  },
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/favicon.svg", "/*.{css,scss,js,json,png,jpg,jpeg,gif,svg,ico,xml,txt}"]
  },
  "platform": {
    "apiRuntime": "node:18"
  },
  "globalHeaders": {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block"
  }
}
```

### Available Roles

- `anonymous`: Any unauthenticated user
- `authenticated`: Any authenticated user (signed in with Azure AD)
- Custom roles: Any role assigned in Role management (e.g., `authorized`, `admin`)

### Authentication Endpoints

- `/.auth/login/aad` - Initiate Azure AD login
- `/.auth/logout` - Sign out
- `/.auth/me` - Get current user information (JSON)
- `/.auth/refresh` - Refresh authentication token

---

## Additional Resources

- [Azure Static Web Apps Configuration Reference](https://learn.microsoft.com/en-us/azure/static-web-apps/configuration)
- [Authentication and Authorization](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-authorization)
- [Custom Authentication](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-custom)
- [Azure Static Web Apps CLI](https://azure.github.io/static-web-apps-cli/)

---

## Summary

**To enable SSO:**
1. ✅ Complete [Azure_AD_Setup.md](./Azure_AD_Setup.md)
2. ✅ Verify `staticwebapp.config.json` exists
3. ✅ Commit and push to deploy
4. ✅ Test authentication

**To disable SSO:**
1. Rename `staticwebapp.config.json` to `staticwebapp.config.json.disabled`
2. Commit and push

**To use group-based access:**
1. Complete group setup in Azure AD
2. Assign group to role in Static Web Apps
3. Update `allowedRoles` in config if needed

The SSO feature is completely optional and can be toggled on/off with a simple file rename and deployment!
