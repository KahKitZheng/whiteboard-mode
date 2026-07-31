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

  // Each lesson is its own surface. The extras declare further surfaces
  // alongside it — never inside it: a surface's layer covers its whole box, so
  // nesting one surface in another leaves the inner one unreachable.
  return (
    <>
      <AnnotationSurface id={`lesson-${lesson.slug}`} initialShapes={lesson.shapes}>
        <article className="lesson">
          <h1>{lesson.title}</h1>
          {lesson.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </article>
      </AnnotationSurface>

      <LessonExtras slug={lesson.slug} />
    </>
  )
}
