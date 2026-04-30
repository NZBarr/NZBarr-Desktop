# Downloader Setup

NZBarr can send NZB files to SABnzbd or NZBGet. A downloader is optional for importing and browsing, but needed if you want to start downloads from NZBarr.

## Screenshot Placeholder

Add screenshots of `Settings > Download Clients`, SABnzbd settings, NZBGet settings, and the connection test result here.

## Choose A Preferred Downloader

Open `Settings > Download Clients` and choose:

- `SABnzbd`
- `NZBGet`

This is the downloader NZBarr uses by default.

## SABnzbd Setup

Common SABnzbd values:

```text
Host: localhost
Port: 8080
Base Path: empty unless SABnzbd uses a path such as /sabnzbd
Use SSL: off unless the SABnzbd web interface uses HTTPS
```

API keys:

- `SABnzbd NZB Key`: usually enough for sending NZBs.
- `SABnzbd Full API Key`: useful for queue/status checks and refresh workflows.

Optional fields:

- `SABnzbd Username`: only if SABnzbd requires login.
- `SABnzbd Password`: only if SABnzbd requires login.
- `SABnzbd Category`: category for normal downloads.
- `SABnzbd Priority`: priority sent with NZBs.

After entering settings, click `Save Downloader Settings`, then `Test SABnzbd Connection`.

## NZBGet Setup

Common NZBGet values:

```text
Host: localhost
Port: 6789
Use SSL: off unless NZBGet uses HTTPS
```

Fields:

- `NZBGet Username`: NZBGet web/API username.
- `NZBGet Password`: NZBGet web/API password.
- `NZBGet Category`: optional category for downloads.
- `NZBGet Priority`: priority sent with NZBs.

After entering settings, click `Save Downloader Settings`, then `Test NZBGet Connection`.

## Completed Downloads Path

For SABnzbd, NZBarr may need the completed downloads path for workflows that inspect downloaded files.

Examples:

```text
macOS local:   /Users/username/Downloads/complete
Windows local: C:\Users\username\Downloads\complete
Linux local:   /home/username/Downloads/complete
```

If SABnzbd runs on another computer, mount or map the remote folder first:

```text
macOS mounted share:   /Volumes/SABnzbd/Downloads/complete
Windows mapped drive:  Z:\SABnzbd\Downloads\complete
Linux mounted share:   /mnt/sabnzbd/downloads/complete
```

Use the path as seen by the computer running NZBarr.

## Sending A Release To A Downloader

1. Open a movie or release detail page.
2. Choose the release you want.
3. Click the downloader action.
4. Check SABnzbd or NZBGet to confirm the job arrived.

## Troubleshooting

If the connection test fails:

- Check the host and port.
- Open SABnzbd or NZBGet in a browser on the same computer.
- Check the API key or username/password.
- Disable SSL unless your downloader web UI really uses HTTPS.
- If using a remote machine, check firewall and network access.
- Save settings before testing again.
