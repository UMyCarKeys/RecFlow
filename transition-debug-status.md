# RecFlow Transition Debug Status

## Current state

- `VinylScene` is throwing a runtime React error:
  - `ReferenceError: Cannot access 'showDisc' before initialization`
- This occurs during the transition handshake when the transition overlay mounts and `VinylScene` renders on the project page.
- The console logs show the expected timeline of events around sleeve transition start, text deferral, and acknowledgement.
- `SleeveTransition` overlay is mounting multiple times for the same project ID, indicating duplicate overlay lifecycle activity.
- The `THREE.WebGLRenderer: Context Lost.` warning appears after the failure, likely due to the component crash or a render restart during the transition.

## What is working so far

- `useSleeveTransition` lifecycle functions are firing:
  - `start()` is called when a project card is clicked
  - `VinylScene` now defers heavy text rendering during transition
  - the acknowledgement handshake executes once the disc becomes visible
  - `SleeveTransition` clears after the overlay timeline completes
- `npx tsc -p tsconfig.json --noEmit` had previously reported no TypeScript errors after the hook reorder fix.

## What is still broken

- `VinylScene` still crashes at render time due to React accessing `showDisc` before initialization.
- Duplicate `SleeveTransition` mount logs are still appearing.
- The actual target problem remains to harden the album-to-project transition timing and avoid `WebGLRenderer` context loss during the entrance.

## Immediate next debugging steps

1. Locate the exact `VinylScene` render block where `showDisc` is referenced before it is initialized.
   - Confirm hook and variable declaration order in `src/components/disc/VinylScene.tsx`.
   - Ensure all React hook calls are ordered consistently and no local variables are referenced before declaration.

2. Track duplicate `SleeveTransition` mounts.
   - Inspect `src/components/disc/SleeveTransition.tsx` for lifecycle double-renders.
   - Verify the `mountedProjectId` guard and make it stricter if repeated mounts are from a single active transition.

3. Confirm the transition handshake invariant.
   - `VinylScene` should only call `acknowledge()` once, after the disc is visible.
   - `SleeveTransition` should only clear after it is acknowledged and the overlay animation timeline completes.

4. Reduce runtime pressure on the canvas during the active transition.
   - Keep canvas `dpr` bounded and use low-power defaults while the transition is active.
   - Defer text rendering in the 3D scene until after the transition has completed.

5. Reproduce with a clean refresh.
   - Reload the app after fixing the hook order.
   - Observe the console log sequence to confirm the transition pipeline no longer crashes.

## Relevant files

- `src/components/disc/VinylScene.tsx`
- `src/components/disc/SleeveTransition.tsx`
- `src/store/sleeveTransition.ts`
- `src/pages/ProjectPage.tsx`
- `src/components/project/ProjectCard.tsx`

## Summary

The code is currently in a transition handshake state, but the runtime crash still blocks the project entry animation. Fixing the hook initialization order in `VinylScene` and eliminating the duplicate `SleeveTransition` mounts are the top priorities.
