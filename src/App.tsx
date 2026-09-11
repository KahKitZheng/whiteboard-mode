import { BrowserRouter, NavLink, Redirect, Route, Switch, useParams } from 'react-router-dom'
import { AnnotationSurface } from './annotation/AnnotationSurface'
import { WhiteboardModeProvider } from './annotation/WhiteboardMode'
import { WhiteboardToolbar } from './annotation/WhiteboardToolbar'
import { BoardBook } from './boardbook/BoardBook'
import { BOARDBOOKS } from './boardbook/fixtures'
import { LESSONS } from './Lesson'
import { LessonExtras } from './LessonExtras'
import './App.scss'

export default function App() {
  return (
    <WhiteboardModeProvider>
      <BrowserRouter>
        <nav className="lesson-nav">
          {LESSONS.map((lesson) => (
            <NavLink key={lesson.slug} to={`/lesson/${lesson.slug}`} activeClassName="is-active">
              {lesson.title}
            </NavLink>
          ))}
          {BOARDBOOKS.map((page) => (
            <NavLink key={page.slug} to={`/boardbook/${page.slug}`} activeClassName="is-active">
              {page.title}
            </NavLink>
          ))}
        </nav>

        <Switch>
          <Route path="/lesson/:slug" component={LessonRoute} />
          <Route path="/boardbook/:slug" component={BoardBookRoute} />
          <Redirect to={`/lesson/${LESSONS[0].slug}`} />
        </Switch>

        <WhiteboardToolbar />
      </BrowserRouter>
    </WhiteboardModeProvider>
  )
}

function LessonRoute() {
  const { slug } = useParams<{ slug: string }>()
  const lesson = LESSONS.find((candidate) => candidate.slug === slug)

  if (!lesson) return <Redirect to={`/lesson/${LESSONS[0].slug}`} />

  // The lesson's surface covers the whole page, so anything on it can be
  // annotated — not just the article's box. The stage inside it declares its
  // own surface and paints above this one's layer.
  return (
    <AnnotationSurface
      id={`lesson-${lesson.slug}`}
      className="page-surface"
      initialShapes={lesson.shapes}
    >
      <div className="lesson-columns">
        <article className="lesson">
          <h1>{lesson.title}</h1>
          {lesson.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </article>
        <aside className="lesson-aside">
          {/* A picture: a shape over it follows its box, and scales with it. */}
          <svg className="lesson-figure" viewBox="0 0 320 180" aria-hidden="true">
            <circle cx="110" cy="90" r="58" />
            <circle cx="210" cy="90" r="58" />
            <path d="M40 150 Q 160 120 280 150" />
          </svg>
          <h2>{lesson.aside.title}</h2>
          {lesson.aside.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </aside>
      </div>

      <LessonExtras slug={lesson.slug} />
    </AnnotationSurface>
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

  return <BoardBook id={`boardbook-${page.slug}`} boardbook={page.boardbook} />
}
