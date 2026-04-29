# NZBarr Finetuning Notes

Small polish items to revisit later after the current refresh/upload flow has proven stable.

## Refresh / Delete Pending

- Consider disabling `Download` for releases with `refresh_status = delete_pending`
- Consider disabling `Send to downloader` for releases with `refresh_status = delete_pending`
- Decide later whether `delete_pending` should become immediate deletion once the flow is fully trusted

## UX / Visual Feedback

- Review whether `delete_pending` should also get an icon or extra label in more places
- Decide whether failed refresh notifications should be softer/cleaner once testing is complete

## Process

- Keep using this file as the running backlog for non-urgent polish and cleanup items
