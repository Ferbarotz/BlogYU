# CHANGELOG - Security and Quality Audit

Project: BlogYU (Flask + React)
Repo: https://github.com/Ferbarotz/BlogYU
Production: https://blockyu.onrender.com
Audit closeout date: 2026-10-29

Scope: audit items 5-10, quality fixes, repository cleanup and infrastructure.
Everything patched, deployed on Render and verified in production.

Note: history was rewritten with git filter-repo (tar.gz cleanup), so some
changes are referenced by commit message instead of hash.

## Item 5 - Notifications (500 / 404)
- Issue: notification endpoints failed due to a missing import and an invalid
  new_comment.id reference when creating the notification.
- Fix: added the required model import and corrected the field used when
  creating the notification.
- Verified: GET /api/notifications 200, GET /api/notifications/read 200,
  DELETE /api/notifications/clear-read 200.

## Test-mail endpoint without protection
- Issue: the email test endpoint was exposed without authentication.
- Fix: @jwt_required() + @admin_required.
- Commit: "Seguridad: re-aplicar proteccion a /test-mail".
- Verified: 401 without token in production.

## Item 6 - Admin deletion failing with 500 (FK violation)
- Issue: admin_delete_post and admin_delete_user did not clean up comments and
  likes before deleting, causing ForeignKeyViolation when comments existed.
- Fix: manual cleanup (Comment, PostImage, Like) in both admin endpoints,
  reusing the delete_post logic.
- Verified: test post with comments from two users -> admin_delete_post 200
  and admin_delete_user 200.

## Item 7 - Images never deleted from Cloudinary
- Issue: public_id was computed incorrectly and destroy() failed silently.
- Fix: robust public_id extraction and cloudinary.uploader.destroy with
  invalidate=True in the delete and edit flows.

## Item 8 - View counter always at 0
- Issue: post_stats read post.views but nothing ever incremented it.
- Fix: get_post increments views +1 with an anti-F5 guard (viewed_<id> cookie,
  one view per visitor per hour).

## Item 9 - Duplicate upload routes (/api/api/uploads)
- Issue: with url_prefix="/api", the /api/uploads/... route produced
  /api/api/uploads/... and collided with the /uploads/<path> file server.
- Fix: removed the duplicate uploaded_file route; listing moved to
  /uploads-list protected with jwt+admin; returns {"files": []} when
  instance/uploads does not exist (previously a 500 on Render).
- Commits: "Fix: unificar rutas de uploads..." and "Fix: manejar carpeta
  uploads inexistente".
- Verified: /api/api/uploads/x 404, /api/uploads/list 404,
  /api/uploads/home-background 200, /uploads-list 401 without token and 200
  with {"files":[]} using an admin token.

## Item 10 - Password reset without validation or token blocking
- Issue: reset_password accepted any valid access token (including a regular
  session token), did not enforce a minimum password length, and the token was
  reusable for 30 minutes after being used.
- Fix: forgot_password creates the token with additional_claims={"purpose":
  "reset"}; reset_password checks the claim, blocks the jti in TokenBlocklist
  after use (single use) and validates length 8-128.
- Commit: "Seguridad: reset con claim purpose, token de un solo uso y
  validacion de longitud".
- Verified: session token used as reset token -> 400 "Token invalido o
  expirado".

## Minor / quality
- update_post (JSON): removed the duplicated image cleanup block (only the one
  that purges Cloudinary and the local file remains).
- login: the token-generation 500 no longer returns "detail": str(e) (no
  internals leaked).
- like_post: 404 when the post does not exist (previously 500).
- Dead imports removed: import re inside register and import bcrypt in
  models.py (hashing is werkzeug).
- Commit: "Calidad: dedup update_post, sin detail en login 500, 404 en likes,
  imports limpios" (6b604d5).
- Verified: JSON update 200, like on nonexistent post 404, delete 200.

## Repository and infrastructure
- Untracked copia-proyecto.tar.gz (51 MB) and dist/; .gitignore now ignores
  *.tar.gz, dist/ and *.bak.
- History rewritten with git filter-repo and force-pushed (fafe870).
- Database credentials rotated in Render (DATABASE_URL updated in
  Environment), verified with a real login.

## Notes for the future
- The JWT is stored in localStorage: acceptable for this project, but it is
  the classic XSS vector. Never render user-supplied HTML with
  dangerouslySetInnerHTML.
- /uploads-list lists local files; Cloudinary images do not appear there.
- Reset links issued before the hardening are invalidated.
