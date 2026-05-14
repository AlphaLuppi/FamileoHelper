# Famileo Web API — discovery notes

Captured 2026-05-14 by sniffing `www.famileo.com` in Chrome DevTools.

## Vocabulary mapping

| Famileo internal | Our code |
|---|---|
| `family` (numeric id, ex: `178493`) | `Pad` (our internal name) |
| `wall_post_id` | `postId` |

## Base URL

`https://www.famileo.com/api/...` — auth via session cookie (no API key).

## Discovered endpoints

### Pre-existing (from Cozy konnector)
- `POST /login` — form login (`_username`, `_password`), Symfony security-bundle convention. Returns session cookies.
- `GET /api/user/pad` — list families/pads of current user.
- `GET /api/gazettes/{pad_id}` — list gazettes per pad.
- `GET /api/galleries/{pad_id}?timestamp=...&type=all` — list photos.

### Newly discovered (from this Toam capture)

#### 1. Get presigned S3 upload URL
- `GET /api/families/{family_id}/presigned_urls`
- Returns presigned PUT URLs + the S3 keys that will be used in the post body.

#### 2. Upload photo directly to S3
- `PUT https://production-famileo-upload.s3.<region>.amazonaws.com/<key>?<signed-params>`
- Body : raw image bytes (JPEG/PNG)
- The key looks like `posts/images/f5cb55a1eec65c95c04b5fef1702ed1b` (no extension)

#### 3. Create the post
- `POST https://www.famileo.com/api/families/{family_id}/posts?return_validation_errors=1`
- Content-Type: `multipart/form-data` (form fields, no file content)
- Form fields :
  | Field | Type | Example | Notes |
  |---|---|---|---|
  | `text` | string | `Petite fleur récoltée par Mamie` | Caption |
  | `is_private` | `0` or `1` | `0` | Private post toggle |
  | `is_full_page` | `0` or `1` | `0` | "Pleine page" toggle (star button in UI) |
  | `published_at` | ISO datetime UTC | `2026-05-10T13:43:11.000Z` | Post date (can be backdated) |
  | `image` | S3 key string | `posts/images/f5cb55a1eec65c95c04b5fef1702ed1b` | **Only one observed** — multi-photo behaviour TBD |

- Response (HTTP 200, `application/json`) :
  ```json
  {
    "code": 100,
    "familyPost": {
      "wall_post_id": 351431756,
      "author_id": 720015,
      "author_name": "Thomas Satory",
      "image": "https://d2xuopoke36cx4.cloudfront.net/.../image_xxx.jpeg",
      "text": "Petite fleur récoltée par Mamie",
      "date": "2026-05-10 15:43:00",
      "date_tz": "2026-05-10T15:43:00+02:00",
      ...
    },
    "errorPosts": []
  }
  ```

## Open questions (need a second capture)

1. **Multi-photo post body shape** : does the `image` field become `image[]`, `image[0]/image[1]`, or are multiple posts sent ? → repeat the capture with a 3-photo post.
2. **Presigned URL response shape** : how many URLs returned per call ? One per photo, or a single batch ?
3. **CSRF / X-XSRF-TOKEN header** : the requests likely carry it as a cookie ; verify whether the POST also reads it from a header.
4. **reCAPTCHA on web** : not observed in this trace. Login path may differ.

## Implementation impact

- `Pad` in our code = `family` in Famileo. Keep our `Pad` naming for the public API, map internally.
- `FamileoClient.createPost(input)` becomes a **3-step** operation :
  1. `GET /api/families/{family_id}/presigned_urls`
  2. `PUT` each photo to S3
  3. `POST /api/families/{family_id}/posts` with the S3 keys in the body
- Each photo is referenced by its S3 key in the final POST.
- The `published_at` field gives us a backdating capability that's actually useful : we can post a moment with its original photo timestamp rather than "now".
- `is_private` and `is_full_page` should be surfaced in the iOS app's `SendSheet` as toggles.
