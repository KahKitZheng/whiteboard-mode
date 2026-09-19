import OpenSeadragon from 'openseadragon'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnnotationSurface } from '../annotation/AnnotationSurface'
import { tapSlop } from '../annotation/interactive'
import { useWhiteboardMode } from '../annotation/WhiteboardMode'
import { ItemDialog, Marker } from './BoardBookItem'
import { fitWidth, percentToImage, zoomRatio, type Size } from './coords'
import { FocusArea, Walkthrough } from './FocusAreas'
import { TextLayer, type TextLine } from './TextLayer'
import type { AssignmentBoardBookEntity, BoardBookFocusAreaEntity, BoardBookItemEntity } from './types'
import { byOrder, neighbour } from './walkthrough'
import './boardbook.scss'

const ZOOM_STEP = 1.4
/** Zoom per pixel of pinch: a trackpad pinch arrives as ctrl+wheel, ~10px a tick. */
const PINCH_RATE = 0.01
/** A wheel in lines (Firefox) rather than pixels: about a line's worth each. */
const LINE_PIXELS = 16

/** What a press may land on that is not the image: a marker or a focus area. */
const CONTROLS = '.boardbook-marker, .boardbook-area'

/**
 * A page pre-tiled by `npm run tiles` is a `.dzi`, which OSD reads by URL;
 * anything else is one flat image, blown up from its own pixels at zoom.
 */
function tileSource(background: string): OpenSeadragon.Options['tileSources'] {
  return background.endsWith('.dzi') ? background : { type: 'image', url: background }
}

// Plain properties at runtime, read by OSD's constraints and drag handler; the
// typings only know them as options.
type Adjustable = {
  viewport: OpenSeadragon.Viewport & { minZoomLevel: number }
  panHorizontal: boolean
  panVertical: boolean
}

/**
 * Keeps the page in its box. Zooming out stops at the fit, and a drag is
 * allowed only along an axis the page overflows — fitted, it has nowhere to
 * go. Re-read after every zoom and resize, since both move the answer.
 */
function keepInBox(viewer: OpenSeadragon.Viewer) {
  const adjustable = viewer as OpenSeadragon.Viewer & Adjustable
  const view = viewer.viewport.getBounds()
  const page = viewer.world.getItemAt(0).getBounds()
  const slack = 1e-6
  adjustable.viewport.minZoomLevel = viewer.viewport.getHomeZoom()
  adjustable.panHorizontal = page.width > view.width + slack
  adjustable.panVertical = page.height > view.height + slack
}

function containerSize(viewer: OpenSeadragon.Viewer): Size {
  const size = viewer.viewport.getContainerSize()
  return { width: size.x, height: size.y }
}

type Props = {
  /** Stable id for the image's own surface; item dialogs derive theirs from it. */
  id: string
  boardbook: AssignmentBoardBookEntity
  /** The page's words, if the page came with any, for marks to snap to. */
  text?: TextLine[]
}

/**
 * The image in an OpenSeadragon viewer, with one overlay the size of the whole
 * image holding the annotation surface — and, as that surface's children, the
 * boardbook's markers and focus areas. See docs/adr/0005-osd-overlay-annotation-layer.md.
 */
export function BoardBook({ id, boardbook, text }: Props) {
  // What goes fullscreen: it has to hold the viewer and the chrome both.
  const stage = useRef<HTMLDivElement>(null)
  const host = useRef<HTMLDivElement>(null)
  const [viewer, setViewer] = useState<OpenSeadragon.Viewer | null>(null)
  const [image, setImage] = useState<Size | null>(null)
  // The one element OSD positions: the image's box, holding everything React.
  const [layer, setLayer] = useState<HTMLDivElement | null>(null)
  const [homeWidth, setHomeWidth] = useState(0)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [openItem, setOpenItem] = useState<BoardBookItemEntity | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const { active } = useWhiteboardMode()
  // For the native listener below, which outlives any one render.
  const armed = useRef(active)
  armed.current = active

  const ordered = byOrder(boardbook.focusAreas)
  const current = ordered.find((area) => area.id === currentId) ?? null

  useEffect(() => {
    const element = host.current
    if (!element) return

    const viewer = OpenSeadragon({
      element,
      tileSources: tileSource(boardbook.images.background),
      showNavigationControl: false,
      showNavigator: false,
      maxZoomPixelRatio: 2,
      // The page never leaves its box: it covers the view at every zoom and a
      // drag stops at its edge rather than bouncing back. `keepInBox` has the
      // rest.
      visibilityRatio: 1,
      constrainDuringPan: true,
      // A click means "this marker" or "this area", never "zoom here". The
      // wheel is handled below, not by OSD.
      gestureSettingsMouse: { clickToZoom: false, scrollToZoom: false },
      gestureSettingsTouch: { clickToZoom: false },
      gestureSettingsPen: { clickToZoom: false },
      // What still counts as a tap on a control: a finger on a board is slower
      // and less steady than OSD's defaults assume (the surface's TAP_SLOP).
      clickTimeThreshold: 500,
      clickDistThreshold: 12,
    })

    let opened: Size | null = null

    /*
      Two fingers on a trackpad pan, a pinch — which arrives as ctrl+wheel —
      zooms about the fingers; a mouse wheel pans too. Straight on the DOM
      rather than OSD's scroll event, which is throttled to one per 50ms and
      would make a pan of dropped deltas stutter. Works armed as well, when
      OSD's own tracker is off.
    */
    function onWheel(event: WheelEvent) {
      if (!opened) return
      event.preventDefault()
      const { viewport } = viewer
      const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? LINE_PIXELS : 1
      if (event.ctrlKey || event.metaKey) {
        const rect = viewer.canvas.getBoundingClientRect()
        const at = viewport.pointFromPixel(new OpenSeadragon.Point(event.clientX - rect.left, event.clientY - rect.top))
        viewport.zoomBy(Math.exp(-event.deltaY * unit * PINCH_RATE), at)
      } else {
        const adjustable = viewer as OpenSeadragon.Viewer & Adjustable
        const delta = viewport.deltaPointsFromPixels(new OpenSeadragon.Point(event.deltaX * unit, event.deltaY * unit))
        if (!adjustable.panHorizontal) delta.x = 0
        if (!adjustable.panVertical) delta.y = 0
        viewport.panBy(delta)
      }
      viewport.applyConstraints()
    }
    viewer.canvas.addEventListener('wheel', onWheel, { passive: false })

    viewer.addOnceHandler('open', () => {
      const size = viewer.world.getItemAt(0).getContentSize()
      opened = { width: size.x, height: size.y }

      const layer = document.createElement('div')
      /*
        Off, a press on a marker or an area has to reach OSD's tracker — or
        there is no dragging the page from an area, and areas cover most of
        it — and the control still has to get its tap. The tracker usually
        captures the pointer, and the browser then delivers the click to the
        canvas rather than the control; sometimes it does not (a press it did
        not take), and the click arrives at the control after a drag. So the
        press is judged here, whichever way the browser goes: one that moved
        past the tap slop is a drag, and its click is swallowed; one that did
        not is a tap, and the control is clicked when the browser will not do
        it. Armed, the tracker is off and the press is the surface's, which
        listens at React's root above us (ADR 0006).
      */
      type Press = { control: HTMLElement; x: number; y: number; slop: number; moved: boolean }
      let press: Press | null = null
      layer.addEventListener('pointerdown', (event) => {
        const control = !armed.current && event.target instanceof Element ? event.target.closest<HTMLElement>(CONTROLS) : null
        press = control && { control, x: event.clientX, y: event.clientY, slop: tapSlop(event.pointerType), moved: false }
      })
      // Captured, the moves go to the canvas and OSD reports the drag; uncaptured, they come through here.
      layer.addEventListener('pointermove', (event) => {
        if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > press.slop) press.moved = true
      })
      viewer.addHandler('canvas-drag', () => {
        if (press) press.moved = true
      })
      viewer.addHandler('canvas-click', (event) => {
        const target = event.originalEvent?.target
        // The browser clicks the control itself when the release landed on it.
        const owed = press && !press.moved && event.quick && !(target instanceof Node && press.control.contains(target))
        if (owed) press!.control.click()
      })
      layer.addEventListener(
        'click',
        (event) => {
          if (press?.moved && event.target instanceof Node && press.control.contains(event.target)) {
            event.stopPropagation()
            event.preventDefault()
          }
          press = null
        },
        true,
      )
      viewer.addOverlay({
        element: layer,
        location: viewer.viewport.imageToViewportRectangle(0, 0, opened.width, opened.height),
      })

      setImage(opened)
      setLayer(layer)
      setHomeWidth(fitWidth(containerSize(viewer), opened))
      keepInBox(viewer)
    })

    // Home zoom moves with the container, so a marker's at-rest size does too.
    viewer.addHandler('resize', () => {
      if (!opened) return
      setHomeWidth(fitWidth(containerSize(viewer), opened))
      keepInBox(viewer)
    })
    viewer.addHandler('zoom', () => {
      if (opened) keepInBox(viewer)
    })

    setViewer(viewer)

    return () => {
      viewer.canvas.removeEventListener('wheel', onWheel)
      viewer.destroy()
      setViewer(null)
      setLayer(null)
      setImage(null)
    }
  }, [boardbook])

  // Armed, every press is the surface's; OSD's own pan and zoom would fight
  // the pen for it. Navigation goes through the chrome meanwhile.
  useEffect(() => {
    viewer?.setMouseNavEnabled(!active)
  }, [viewer, active])

  useEffect(() => {
    function onChange() {
      setFullscreen(document.fullscreenElement === stage.current)
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  function focus(area: BoardBookFocusAreaEntity) {
    if (!viewer || !image) return
    const box = percentToImage(area, image)
    viewer.viewport.fitBounds(viewer.viewport.imageToViewportRectangle(box.x, box.y, box.width, box.height))
    setCurrentId(area.id)
  }

  function step(direction: 'previous' | 'next') {
    const next = neighbour(ordered, currentId, direction)
    if (next) focus(next)
  }

  function overview() {
    viewer?.viewport.goHome()
    setCurrentId(null)
  }

  function zoom(direction: 'in' | 'out') {
    if (!viewer) return
    viewer.viewport.zoomBy(direction === 'in' ? ZOOM_STEP : 1 / ZOOM_STEP)
    viewer.viewport.applyConstraints()
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen()
    else stage.current?.requestFullscreen()
  }

  /** Read as a shape is created, so a zoom animation mid-stroke is not a problem. */
  function inkScale() {
    if (!viewer) return 1
    return zoomRatio(viewer.viewport.getZoom(true), viewer.viewport.getHomeZoom())
  }

  return (
    <div className="boardbook" ref={stage} data-armed={active ? '' : undefined}>
      {/* Above the image, clear of the whiteboard toolbar along the bottom. */}
      <Walkthrough
        ordered={ordered}
        current={current}
        canStep={{
          previous: neighbour(ordered, currentId, 'previous') !== null,
          next: neighbour(ordered, currentId, 'next') !== null,
        }}
        fullscreen={fullscreen}
        onStep={step}
        onOverview={overview}
        onZoom={zoom}
        onFullscreen={toggleFullscreen}
      />
      <div className="boardbook-viewer">
        {/* OSD sizes itself at 100% of its element, which is indefinite on a
            flex-sized box; an absolutely positioned one is not. */}
        <div className="boardbook-osd" ref={host} />
      </div>
      {layer &&
        image &&
        createPortal(
          /*
            Markers and areas are the surface's children, not overlays of their
            own: the surface has to see what a press landed on to leave a tap to
            it (ADR 0006). The surface is the image's box, so the authored
            percentages position them directly — as app-react does.
          */
          <AnnotationSurface id={id} className="boardbook-layer" viewBox={image} inkScale={inkScale}>
            {text && <TextLayer lines={text} />}
            {ordered.map((area) => (
              <FocusArea
                key={area.id}
                area={area}
                current={area.id === currentId}
                onToggle={() => (area.id === currentId ? overview() : focus(area))}
              />
            ))}
            {boardbook.items.map((item) => (
              <Marker key={item.id} item={item} image={image} homeWidth={homeWidth} onOpen={() => setOpenItem(item)} />
            ))}
          </AnnotationSurface>,
          layer,
        )}
      <ItemDialog pageId={id} item={openItem} onClose={() => setOpenItem(null)} />
    </div>
  )
}
