# Roadmap

## Open
- Await security approval to record complaint reads and photo downloads as intended public-demo access (critical findings require an approval card).

## Done (2026-10-18)
- [x] Restricted photo deletion to an ID-only server complaint-deletion flow; denied direct client complaint deletion and photo deletion/overwrite.
- [x] Live browser verified creating a fictional complaint with a photo, viewing, byte-identical download, blocked direct deletion/overwrite, and deletion of both complaint and photo (fresh browser plus stored-object check).
- [x] Five coupled-deletion regression tests and the routing test passed; live Telugu test skipped. Build OK. Newly created test complaint/photo cleaned up.
- [x] Selected photo-deletion finding resolved; selected insert-only upload finding recorded as intentional. No other findings changed.
- [x] Ready-block message (form + list) lists each leftover bracketed item (deduped) + "Replace each one, including the [ ] brackets."
- [x] Ready to Submit rows show "You've reviewed this complaint. Copy it and send it to the right authority yourself." + Copy complaint button
- [x] Ready rows with a photo show Download photo button + "Attach this photo when you submit." (adds "The complaint text refers to it." only when the text actually mentions the photo)
- [x] Verified in browser: no-photo form shows no photo warning; DD/MM/YYYY date line; list flow block → edit → review dialog → Ready; clipboard copy; photo download.
- Test data cleaned up (test complaint row deleted; unused test photo left in private storage bucket under test/).
