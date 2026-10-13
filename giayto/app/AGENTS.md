<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Heavy post-capture work (full-res render, thumb, OCR) goes through the persistent BgQueue in src/lib/bg-queue.ts (IndexedDB "ghi-nhanh-jobs"), not the in-memory FinishQueue — jobs must survive reload and resume via bgQueue.resume().

- All picker, shared-file and clipboard image intake uses image-input.ts before normalization; HEIC decoding is lazy browser-only, CSP-compatible and serialized to keep phone memory bounded.
- Image paste listeners are scoped to home, scan and unlocked document intake, ignore text fields and are suspended during edits/imports to preserve normal text paste.
