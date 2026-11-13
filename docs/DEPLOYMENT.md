# Cloudflare deployment

The repository is ready for Cloudflare Pages, but connecting accounts and
changing access policies are owner-only operations. Do not add credentials to
the repository.

## 1. Create the Pages project

1. Sign in to Cloudflare and open **Workers & Pages**.
2. Create a Pages application by connecting GitHub.
3. Choose the `Renso0905/gym-app` repository.
4. Set the production branch to `main`.
5. Set the build command to `npm run build`.
6. Set the output directory to `dist`.
7. Add the build environment variable `NODE_VERSION=24`.
8. Keep automatic production deployments disabled until the deployment PR is
   reviewed and merged. Trigger the first production deployment deliberately.

The root `functions/api/food-search.ts` file is deployed automatically as
`/api/food-search`. No API key is required.

## 2. Restrict access to the owner

After the first deployment:

1. Open the Pages project and go to **Settings → Enable access policy**.
2. Manage the created Access application.
3. For the production `*.pages.dev` hostname, remove the wildcard from the
   subdomain as described by Cloudflare's Pages Access instructions.
4. Create an Allow policy containing only the owner's email address and use the
   one-time PIN identity provider.
5. Set a comfortable session duration so the installed iPhone app does not ask
   for a PIN every day.
6. Protect preview deployments too, or disable preview branch deployments.

If a custom domain is added later, create a separate hostname Access
application for that domain before relying on it.

## 3. Move existing phone data

Browser storage belongs to one website origin, so the local Wi-Fi preview
cannot automatically share data with the new `pages.dev` address.

1. On the current local preview, open Home and select **Download backup**.
2. Save the JSON file in Files or another private location.
3. Open the deployed HTTPS address and authenticate.
4. On Home, choose the backup file.
5. Select **Restore backup**, then **Replace device data?**.
6. Confirm routines, history, nutrition and sleep are present before deleting
   the backup or removing the local preview.

## 4. Install on iPhone

1. Open the deployed HTTPS address in Safari and sign in through Access.
2. Use **Share → Add to Home Screen**.
3. Turn on **Open as Web App**, then tap **Add**.
4. Launch the new Home Screen icon once while online so the offline app shell
   is installed and the latest assets are cached.

Food search always requires a connection. All existing tracking and backup
features continue using on-device storage.
