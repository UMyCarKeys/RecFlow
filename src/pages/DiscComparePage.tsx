import { Link } from 'react-router-dom'
import { DiscScene } from '@/components/disc/DiscScene'
import { DEMO_RECORD_TRACKS } from '@/lib/demoData'

/**
 * TEMPORARY comparison page. Renders the old VinylDisc / DiscScene 3D mesh in
 * isolation (dark studio, no VinylScene overlay) so it can be judged against the
 * current frosted VinylScene on /demo. Delete this file + its route when done.
 */
export function DiscComparePage() {
  return (
    <div className="fixed inset-0 bg-[#0a0a0f]">
      <DiscScene tracks={DEMO_RECORD_TRACKS} latestVersions={{}} onDiscClick={() => {}} />
      <Link
        to="/demo"
        className="fixed top-4 left-4 z-10 px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20"
      >
        ← compare vs /demo (VinylScene)
      </Link>
    </div>
  )
}
