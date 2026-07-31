import { BrowserRouter, NavLink, Redirect, Route, Switch, useParams } from 'react-router-dom'
import { AnnotationSurface } from './annotation/AnnotationSurface'
import { WhiteboardModeProvider } from './annotation/WhiteboardMode'
import { WhiteboardToolbar } from './annotation/WhiteboardToolbar'
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
        </nav>

        <Switch>
          <Route path="/lesson/:slug" component={LessonRoute} />
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
      <article className="lesson">
        <h1>{lesson.title}</h1>
        {lesson.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </article>

      <LessonExtras slug={lesson.slug} />
    </AnnotationSurface>
  )
}
