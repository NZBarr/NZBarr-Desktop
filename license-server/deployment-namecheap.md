# NZBarr License Server Deployment on Namecheap

This guide assumes:

- your subdomain is `license.nzbarr.com`
- your database already exists
- you are deploying the PHP license server from this repo

## 1. Upload the files

Upload the entire `license-server/` folder contents to the document root for the subdomain.

Recommended file layout on the host:

- `index.php`
- `api/licenses/validate.php`
- `lib/*.php`
- `database/*.sql`
- `.htaccess`
- `config.php` for live settings

## 2. Create `config.php`

Copy `config.sample.php` to `config.php` and update:

- database host
- database name
- database username
- database password
- signing key path

Example production values:

```php
return [
    'db' => [
        'host' => 'localhost',
        'port' => 3306,
        'database' => 'YOUR_NAMECHEAP_DB_NAME',
        'username' => 'YOUR_NAMECHEAP_DB_USER',
        'password' => 'YOUR_NAMECHEAP_DB_PASSWORD',
        'charset' => 'utf8mb4',
    ],
    'signing' => [
        'enabled' => true,
        'algorithm' => 'ed25519',
        'key_id' => 'prod-2026-01',
        'private_key_path' => '/home/YOUR_ACCOUNT/private/license-private-key.pem',
    ],
];
```

## 3. Import the database

Import [`database/production-schema.sql`](./database/production-schema.sql) into your live MySQL database.

If you want test rows during setup, you can also import [`database/seed.sql`](./database/seed.sql), but remove or replace them before going live.

## 4. Verify the endpoint

After deployment, this should respond in a browser or with `curl`:

- `https://license.nzbarr.com/`

The validation endpoint should respond to POST requests at:

- `https://license.nzbarr.com/api/licenses/validate`

## 5. Recommended security steps

- keep the private key outside the web root
- do not expose `config.php` publicly
- use HTTPS only
- rotate the signing key if the private key is ever compromised

## 6. Recommended launch order

1. Deploy the files.
2. Test the root page.
3. Test the validation endpoint with a known license key.
4. Point the desktop app’s license server URL at `https://license.nzbarr.com`.
