import { BrowserRouter, Redirect, Route, Switch, useParams } from 'react-router-dom'
import { AnnotationSurface } from './annotation/AnnotationSurface'
import { WhiteboardModeProvider } from './annotation/WhiteboardMode'
import { WhiteboardToolbar } from './annotation/WhiteboardToolbar'
import { BoardBook } from './boardbook/BoardBook'
import { BOARDBOOKS } from './boardbook/fixtures'
import { LESSONS } from './Lesson'
import { LessonExtras } from './LessonExtras'
import { SlideNav } from './SlideNav'
import { SlideOverview } from './SlideOverview'
import './App.scss'

export default function App() {
  return (
    <WhiteboardModeProvider>
      <BrowserRouter>
        <Switch>
          <Route path="/lesson/:slug" component={LessonRoute} />
          <Route path="/boardbook/:slug" component={BoardBookRoute} />
          <Redirect to={`/lesson/${LESSONS[0].slug}`} />
        </Switch>

        <SlideNav />
        <WhiteboardToolbar trailing={<SlideOverview />} />
      </BrowserRouter>
    </WhiteboardModeProvider>
  )
}

function LessonRoute() {
  const { slug } = useParams<{ slug: string }>()
  const lesson = LESSONS.find((candidate) => candidate.slug === slug)

  if (!lesson) return <Redirect to={`/lesson/${LESSONS[0].slug}`} />

  // The lesson's surface is the whole card, so anything on it can be
  // annotated — not just the article's box. The stage inside it declares its
  // own surface and paints above this one's layer.
  return (
    <section className="slide">
      <AnnotationSurface
        id={`lesson-${lesson.slug}`}
        className="page-surface slide-card"
        initialShapes={lesson.shapes}
      >
      <div className="lesson-columns">
        <article className="lesson">
          <h1>{lesson.title}</h1>
          {lesson.body.map((paragraph) =>
            typeof paragraph === 'string' ? (
              <p key={paragraph}>{paragraph}</p>
            ) : (
              <p key={paragraph.lead}>
                <strong>{paragraph.lead}</strong> {paragraph.text}
              </p>
            ),
          )}
        </article>
        <aside className="lesson-aside">
          {/* A picture: a shape over it follows its box, and scales with it. */}
          {lesson.aside.figure && (
            <svg className="lesson-figure" viewBox="0 0 320 180" aria-hidden="true">
              <circle cx="110" cy="90" r="58" />
              <circle cx="210" cy="90" r="58" />
              <path d="M40 150 Q 160 120 280 150" />
            </svg>
          )}
          <h2>{lesson.aside.title}</h2>
          {lesson.aside.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </aside>
      </div>

      {lesson.extras && <LessonExtras slug={lesson.slug} />}
      </AnnotationSurface>
    </section>
  )
}

/**
 * A second host context over the same annotation module: the surface here is
 * an image being zoomed rather than a page being scrolled.
 */
function BoardBookRoute() {
  const { slug } = useParams<{ slug: string }>()
  const page = BOARDBOOKS.find((candidate) => candidate.slug === slug)

  if (!page) return <Redirect to={`/lesson/${LESSONS[0].slug}`} />

  return (
    <section className="slide">
      <div className="slide-card">
        <BoardBook id={`boardbook-${page.slug}`} boardbook={page.boardbook} text={page.text} />
      </div>
    </section>
  )
}
