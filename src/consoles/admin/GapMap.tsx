import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { formatNumber, type BlockGap } from '../../data/jharkhandGaps'

/** Roughly the centre of Jharkhand, framed so the whole state is visible at this zoom. */
const JHARKHAND_CENTRE: [number, number] = [23.6102, 85.2799]
const INITIAL_ZOOM = 7

export interface FocusRequest {
  gapId: string
  /** Changes on every request, so clicking the same block twice re-focuses it. */
  nonce: number
}

export type GapAction = 'proposal' | 'officer'

/** Marker diameter in pixels; square-root scale so counts stay comparable by area. */
function markerPx(peopleAffected: number): number {
  return Math.round(Math.min(56, 24 + Math.sqrt(peopleAffected) * 3.2))
}

function gapIcon(gap: BlockGap): L.DivIcon {
  const size = markerPx(gap.peopleAffected)
  const shape = gap.gapType === 'no-centre' ? 'is-demand' : 'is-unplaced'
  return L.divIcon({
    className: 'gap-marker-icon',
    // Only a class name and a number are interpolated here.
    html: `<span class="gap-marker ${shape}" style="width:${size}px;height:${size}px">${gap.peopleAffected}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 2],
  })
}

/** Flies to a block when the priority list asks for it, then opens its popup. */
function FocusController({
  focus,
  gaps,
  markers,
}: {
  focus: FocusRequest | null
  gaps: BlockGap[]
  markers: React.RefObject<Record<string, L.Marker | null>>
}) {
  const map = useMap()

  useEffect(() => {
    if (!focus) return
    const gap = gaps.find((candidate) => candidate.gapId === focus.gapId)
    if (!gap) return

    map.flyTo([gap.latitude, gap.longitude], Math.max(map.getZoom(), 9), { duration: 0.8 })
    const marker = markers.current[gap.gapId]
    const timer = window.setTimeout(() => marker?.openPopup(), 850)
    return () => window.clearTimeout(timer)
  }, [focus, gaps, map, markers])

  return null
}

export function GapMap({
  gaps,
  focus,
  onAction,
}: {
  gaps: BlockGap[]
  focus: FocusRequest | null
  onAction: (gap: BlockGap, action: GapAction) => void
}) {
  const markers = useRef<Record<string, L.Marker | null>>({})

  return (
    <MapContainer center={JHARKHAND_CENTRE} zoom={INITIAL_ZOOM} scrollWheelZoom className="gap-map">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />

      {gaps.map((gap) => (
        <Marker
          key={gap.gapId}
          position={[gap.latitude, gap.longitude]}
          icon={gapIcon(gap)}
          ref={(marker) => {
            markers.current[gap.gapId] = marker
          }}
        >
          <Popup>
            <div className="gap-popup">
              <div className={`gap-popup-bar ${gap.gapType === 'no-centre' ? 'is-demand' : 'is-unplaced'}`}>
                <span className="gap-popup-block">{gap.block}</span>
                <span className="gap-popup-district">{gap.district} district</span>
              </div>

              <span className="gap-popup-tag">
                {gap.gapType === 'no-centre' ? 'Demand, no centre' : 'Trained, no local jobs'} · {gap.course}
              </span>

              <p className="gap-popup-detail">{gap.detail}</p>

              <dl className="gap-popup-stats">
                {gap.gapType === 'no-centre' ? (
                  <>
                    <div>
                      <dt>Want this course</dt>
                      <dd>{formatNumber(gap.demandCount)}</dd>
                    </div>
                    <div>
                      <dt>Centres in block</dt>
                      <dd>0</dd>
                    </div>
                    <div>
                      <dt>Nearest centre</dt>
                      <dd>{gap.nearestCentreKm} km</dd>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <dt>Trained</dt>
                      <dd>{formatNumber(gap.trainedCount)}</dd>
                    </div>
                    <div>
                      <dt>Placed</dt>
                      <dd>{formatNumber(gap.placedCount)}</dd>
                    </div>
                    <div>
                      <dt>Unplaced</dt>
                      <dd className="is-alert">{formatNumber(gap.unplacedCount)}</dd>
                    </div>
                  </>
                )}
              </dl>

              <div className="gap-popup-action">
                <span className="gap-popup-action-label">Recommended action</span>
                <p>{gap.recommendedAction}</p>
              </div>

              <div className="gap-popup-buttons">
                <button type="button" className="btn btn-primary btn-small" onClick={() => onAction(gap, 'proposal')}>
                  Raise proposal
                </button>
                <button type="button" className="btn btn-outline btn-small" onClick={() => onAction(gap, 'officer')}>
                  Assign officer
                </button>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      <FocusController focus={focus} gaps={gaps} markers={markers} />
    </MapContainer>
  )
}
