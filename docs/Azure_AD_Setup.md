# Azure AD / Entra ID Setup for SSO

This guide walks you through the complete process of setting up Azure Active Directory (Azure AD), also known as Microsoft Entra ID, to enable Single Sign-On (SSO) authentication for your Automation Catalog.

---

## Overview

By enabling Azure AD SSO, you can:
- Restrict access to your Automation Catalog to members of your organization
- Require users to authenticate before viewing the site
- Optionally restrict access to specific Azure AD groups
- Leverage existing enterprise identity management

---

## Prerequisites

Before you begin, ensure you have:
- An Azure account with permissions to register applications in Azure AD
- Access to Azure Portal ([portal.azure.com](https://portal.azure.com))
- Global Administrator or Application Administrator role in Azure AD (for some steps)
- Your Azure Static Web App URL (e.g., `https://your-site.azurestaticapps.net`)

---

## Part 1: Register an Application in Azure AD

### Step 1: Navigate to Azure AD App Registrations

1. Sign in to the [Azure Portal](https://portal.azure.com)
2. In the search bar at the top, type **Microsoft Entra ID** or **Azure Active Directory**
3. Select **Microsoft Entra ID** (or **Azure Active Directory**) from the results
4. In the left sidebar, click **App registrations** under the "Manage" section
5. Click **+ New registration** at the top

### Step 2: Configure Basic Application Settings

Fill in the registration form:

1. **Name**: Enter a descriptive name
   - Example: `Automation Catalog - Production`
   - This name will be visible to users during authentication

2. **Supported account types**: Choose based on your needs
   - **Single tenant** (Recommended): Only users in your organization can sign in
   - **Multi-tenant**: Users from any Azure AD organization can sign in
   - **Personal Microsoft accounts**: Generally not recommended for enterprise apps

3. **Redirect URI**:
   - Select **Web** from the dropdown
   - Enter: `https://YOUR-SITE-NAME.azurestaticapps.net/.auth/login/aad/callback`
   - Replace `YOUR-SITE-NAME` with your actual Static Web App name
   - Example: `https://automation-catalog.azurestaticapps.net/.auth/login/aad/callback`

4. Click **Register**

### Step 3: Note Your Application IDs

After registration, you'll see the application overview page. **Copy and save** these values:

1. **Application (client) ID**: A GUID that identifies your application
   - Example: `12345678-1234-1234-1234-123456789abc`
   - You'll need this for Azure Static Web Apps configuration

2. **Directory (tenant) ID**: A GUID that identifies your Azure AD tenant
   - Example: `87654321-4321-4321-4321-cba987654321`
   - You'll need this for Azure Static Web Apps configuration

Keep these IDs handy - you'll need them later.

---

## Part 2: Configure Authentication Settings

### Step 4: Configure Token Settings

1. In your app registration, go to **Token configuration** in the left sidebar
2. Click **+ Add optional claim**
3. Select **ID** token type
4. Check the following claims (if available):
   - `email`
   - `preferred_username`
   - `name`
   - `groups` (Important: needed for group-based access control)
5. Click **Add**

6. If prompted about Microsoft Graph permissions, check the box to consent and click **Add**

### Step 5: Enable ID Tokens

1. In the left sidebar, click **Authentication**
2. Under **Implicit grant and hybrid flows**, check:
   - ✅ **ID tokens (used for implicit and hybrid flows)**
3. Click **Save** at the top

### Step 6: Configure API Permissions (Optional but Recommended)

1. In the left sidebar, click **API permissions**
2. You should see **Microsoft Graph** > **User.Read** already present (delegated)
3. If you plan to use group-based authorization, click **+ Add a permission**:
   - Select **Microsoft Graph**
   - Select **Delegated permissions**
   - Expand **GroupMember** and check:
     - `GroupMember.Read.All`
   - Click **Add permissions**

4. If you have admin permissions, click **Grant admin consent for [Your Organization]**
   - This prevents users from seeing a consent prompt
   - If you don't have admin rights, contact your Azure AD administrator

---

## Part 3: Create a Client Secret (Required)

Azure Static Web Apps requires a client secret to communicate with Azure AD.

### Step 7: Generate Client Secret

1. In the left sidebar, click **Certificates & secrets**
2. Click the **Client secrets** tab
3. Click **+ New client secret**
4. Fill in the details:
   - **Description**: Enter a meaningful name (e.g., `Static Web App Secret`)
   - **Expires**: Choose an expiration period
     - Recommended: **730 days (24 months)** for production
     - Set a calendar reminder to rotate the secret before expiration
5. Click **Add**

### Step 8: Copy the Client Secret

**⚠️ CRITICAL: Do this immediately!**

1. After creating the secret, a **Value** will appear in the table
2. Click the **Copy** icon next to the value
3. **SAVE THIS VALUE IMMEDIATELY** - you cannot retrieve it later!
4. Store it securely (password manager, Azure Key Vault, etc.)
5. You'll need this value for Azure Static Web Apps configuration

**Important Notes:**
- If you lose this secret, you cannot retrieve it - you'll need to create a new one
- Treat this like a password - never commit it to source control
- Set a reminder to rotate the secret before expiration

---

## Part 4: Group-Based Access Control (Optional)

If you want to restrict access to specific Azure AD groups, follow these steps.

### Step 9: Find Your Azure AD Group

1. In Azure Portal, navigate to **Microsoft Entra ID** (Azure Active Directory)
2. Click **Groups** in the left sidebar
3. Find or create the group you want to use for access control
4. Click on the group name
5. Copy the **Object ID** (this is a GUID)
   - Example: `abcd1234-5678-90ef-ghij-klmnopqrstuv`

### Step 10: Configure Group Claims

1. Return to your app registration
2. In the left sidebar, click **Token configuration**
3. Click **+ Add groups claim**
4. Select **Security groups** (or **All groups** if needed)
5. Under **Customize token properties by type**, for **ID**, select:
   - **Group ID** (recommended - returns group Object ID)
6. Click **Add**

**Note**: If your users are members of more than 200 groups, Azure AD will send a groups overage claim instead. For most organizations, this is not an issue.

---

## Part 5: Configure Azure Static Web Apps

Now you'll connect your Static Web App to Azure AD.

### Step 11: Add Azure AD Identity Provider

1. In Azure Portal, navigate to your **Static Web App** resource
2. In the left sidebar, find **Settings** and click **Authentication**
3. Click **+ Add identity provider**
4. Select **Microsoft** (Azure AD)
5. Fill in the configuration:

   **Provider Configuration:**
   - **Application (client) ID**: Paste the Application ID from Step 3
   - **Client secret**: Paste the client secret from Step 8
   - **OpenID issuer URL**: Enter the URL in this format:
     ```
     https://login.microsoftonline.com/{TENANT_ID}/v2.0
     ```
     Replace `{TENANT_ID}` with your Directory (tenant) ID from Step 3

     Example:
     ```
     https://login.microsoftonline.com/87654321-4321-4321-4321-cba987654321/v2.0
     ```

6. Click **Add**

### Step 12: Configure Role Assignments (Optional - For Group-Based Access)

If you want to restrict to specific groups:

1. Still in your Static Web App, go to **Settings** > **Authentication**
2. Click **Role management**
3. Click **+ Add role assignment**
4. Fill in:
   - **Role name**: Enter `authorized` (or any custom role name)
   - **Principal type**: Select **Group**
   - **Principal**: Enter the Group Object ID from Step 9
5. Click **Add**

Now, only members of this group will be able to access your site (when you enable SSO in the next guide).

---

## Part 6: Verification

### Step 13: Verify App Registration Settings

Go back to your App Registration and verify:

✅ **Overview**
- Application (client) ID is noted
- Directory (tenant) ID is noted

✅ **Authentication**
- Redirect URI includes your Static Web App callback URL
- ID tokens are enabled

✅ **Certificates & secrets**
- A valid client secret exists and is not expired

✅ **Token configuration**
- Optional claims are added (email, name, groups)

✅ **API permissions**
- User.Read permission is present
- GroupMember.Read.All is present (if using group-based access)
- Admin consent is granted (green checkmarks)

### Step 14: Verify Static Web Apps Configuration

In your Azure Static Web App:

✅ **Authentication**
- Microsoft identity provider is configured
- Client ID, secret, and issuer URL are correct

✅ **Role management** (if using groups)
- Group Object ID is mapped to a role

---

## Troubleshooting

### Common Issues

#### "AADSTS50011: The redirect URI specified in the request does not match"
**Solution**:
- Verify your redirect URI in Azure AD matches exactly: `https://YOUR-SITE.azurestaticapps.net/.auth/login/aad/callback`
- Make sure there are no trailing slashes
- Check for typos in your site name

#### "AADSTS700016: Application not found in directory"
**Solution**:
- Verify you're using the correct Application (client) ID
- Make sure the app registration is in the same Azure AD tenant as your users

#### "Invalid client secret provided"
**Solution**:
- Check if your client secret has expired
- Generate a new client secret and update Azure Static Web Apps configuration
- Ensure there are no extra spaces when copying the secret

#### "User is authenticated but cannot access the site"
**Solution**:
- Check if you configured group-based access control
- Verify the user is a member of the authorized group
- Check the group Object ID is correct in Role management
- Ensure the `groups` claim is included in token configuration

#### "Groups not appearing in token"
**Solution**:
- Verify "groups" optional claim is configured in Token configuration
- Ensure GroupMember.Read.All permission has admin consent
- Check that the user is actually a member of security groups (not just Azure AD roles)

---

## Security Best Practices

1. **Client Secret Rotation**: Set calendar reminders to rotate secrets before expiration
2. **Least Privilege**: Only grant necessary API permissions
3. **Group-Based Access**: Use Azure AD groups rather than individual user assignments for easier management
4. **Audit Logs**: Regularly review sign-in logs in Azure AD
5. **Conditional Access**: Consider implementing Conditional Access policies for additional security (requires Azure AD P1/P2)
6. **Emergency Access**: Maintain at least one emergency access (break-glass) account

---

## Next Steps

Once you've completed this Azure AD setup, proceed to the **[Enabling_SSO.md](./Enabling_SSO.md)** guide to enable SSO in your Automation Catalog project.

---

## Additional Resources

- [Azure Static Web Apps Authentication Documentation](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-authorization)
- [Microsoft Entra ID (Azure AD) Documentation](https://learn.microsoft.com/en-us/entra/identity/)
- [Register an application with Azure AD](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app)
- [Configure group claims](https://learn.microsoft.com/en-us/entra/identity-platform/optional-claims#configure-groups-optional-claims)

---

## Support

If you encounter issues:
1. Check Azure AD sign-in logs: **Azure AD** > **Monitoring** > **Sign-in logs**
2. Check Azure Static Web Apps logs in Azure Portal
3. Review the Troubleshooting section above
4. Create an issue in the GitHub repository with detailed error messages
